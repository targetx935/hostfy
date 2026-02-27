
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

serve(async (req) => {
    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Mux Credentials
        const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
        const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');
        const auth = btoa(`${muxTokenId}:${muxTokenSecret}`);
        const headers = {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        };

        console.log('Starting Mux Usage Sync...');

        // 1. Fetch View Counts (Plays) from Mux Data
        // We use the last 30 days as a standard sync window, but overall would be better if available
        const viewsRes = await fetch('https://api.mux.com/data/v1/metrics/video_views/breakdown?group_by=asset_id&timeframe[]=30:days', { headers });
        const viewsData = await viewsRes.json();
        const viewsMap: Record<string, number> = {};

        if (viewsData.data) {
            viewsData.data.forEach((item: any) => {
                if (item.field) viewsMap[item.field] = item.value;
            });
        }

        // 2. Fetch Delivery Usage (Bandwidth) from Mux Video
        const usageRes = await fetch('https://api.mux.com/video/v1/usage/delivery?timeframe[]=current_month', { headers });
        const usageData = await usageRes.json();
        const usageMap: Record<string, number> = {};

        if (usageData.data) {
            usageData.data.forEach((item: any) => {
                if (item.asset_id) usageMap[item.asset_id] = (usageMap[item.asset_id] || 0) + (item.delivered_seconds || 0);
            });
        }

        // 3. Fetch all profiles to update
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, plan');

        if (profileError) throw profileError;

        // Plan limits for notification logic
        const PLAN_MAX_GB: Record<string, number> = {
            'trial': 5,
            'basic': 100,
            'pro': 500,
            'ultra': 2000
        };

        for (const profile of profiles) {
            const { data: userVideos } = await supabaseAdmin
                .from('videos')
                .select('id, mux_asset_id, plays')
                .eq('user_id', profile.id);

            if (!userVideos || userVideos.length === 0) continue;

            let userTotalSeconds = 0;

            for (const video of userVideos) {
                if (!video.mux_asset_id) continue;

                const newPlays = viewsMap[video.mux_asset_id] || 0;
                const deliveredSeconds = usageMap[video.mux_asset_id] || 0;
                userTotalSeconds += deliveredSeconds;

                // Only update if plays increased (Mux Data 30d might be less than total in DB)
                // In a perfect world, we'd sync total plays since inception
                if (newPlays > video.plays) {
                    await supabaseAdmin
                        .from('videos')
                        .update({ plays: newPlays })
                        .eq('id', video.id);
                }
            }

            // Convert seconds to "GB" (using 1h = 1GB abstraction for business rules)
            const userTotalBandwidthGB = Number((userTotalSeconds / 3600).toFixed(2));
            const userPlan = (profile.plan || 'trial').toLowerCase();
            const maxGB = PLAN_MAX_GB[userPlan] || 5;
            const usagePercent = (userTotalBandwidthGB / maxGB) * 100;

            await supabaseAdmin
                .from('profiles')
                .update({
                    current_bandwidth_gb: userTotalBandwidthGB
                })
                .eq('id', profile.id);

            // Notification Logic for Limits
            if (usagePercent >= 80) {
                const threshold = usagePercent >= 100 ? 100 : 80;
                const title = threshold === 100
                    ? '🔴 Limite de Banda Atingido!'
                    : '⚠️ Alerta de Consumo (80%)';

                // Check if already notified recently (last 24h) to avoid spam
                const { data: existingNotif } = await supabaseAdmin
                    .from('notifications')
                    .select('id')
                    .eq('user_id', profile.id)
                    .eq('title', title)
                    .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                    .limit(1);

                if (!existingNotif || existingNotif.length === 0) {
                    await supabaseAdmin.from('notifications').insert({
                        user_id: profile.id,
                        title: title,
                        message: threshold === 100
                            ? `Você atingiu 100% do limite de banda do seu plano ${userPlan.toUpperCase()}. Seus vídeos podem ser limitados.`
                            : `Você já consumiu ${usagePercent.toFixed(1)}% da banda do seu plano ${userPlan.toUpperCase()}. Considere fazer um upgrade em breve.`,
                        type: threshold === 100 ? 'error' : 'warning',
                        link: '/settings'
                    });
                }
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Sync completed',
            syncedProfiles: profiles.length
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Sync Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
