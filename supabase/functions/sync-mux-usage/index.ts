
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

        console.log('Starting Mux Usage Sync...');

        // 1. Fetch all active users with their Mux Asset IDs
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email');

        if (profileError) throw profileError;

        for (const profile of profiles) {
            // 2. Fetch usage for this specific month
            // Note: In a production App, you'd filter Mux stats by labels or metadata 
            // linked to the user's Mux assets. 
            // For now, we will query Mux for the total usage and distribute or 
            // use the available 'stats' endpoints.

            // Mux usage stats (example endpoint - actual may vary based on Mux API version)
            const response = await fetch('https://api.mux.com/data/v1/usage', {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });

            const usageData = await response.json();

            // LOGIC: Map Mux data to our user
            // Since Mux usage is global for the account, we need to filter by assets 
            // belonging to this user.

            const { data: userVideos } = await supabaseAdmin
                .from('videos')
                .select('mux_asset_id')
                .eq('user_id', profile.id);

            const assetIds = userVideos?.map(v => v.mux_asset_id).filter(Boolean) || [];

            if (assetIds.length === 0) continue;

            // Fetch views/bandwidth per asset from Mux Data API
            // This is a simplified version. One would normally iterate asset IDs 
            // or use a 'passthrough' label in Mux.

            let userTotalBandwidthGB = 0;
            let userTotalStorageGB = 0;

            // In a real scenario, we'd query Mux Data specifically for these assets
            // For this implementation, we simulate fetching these metrics
            // (Actual Mux Data API calls would happen here)

            await supabaseAdmin
                .from('profiles')
                .update({
                    current_bandwidth_gb: userTotalBandwidthGB,
                    current_storage_gb: userTotalStorageGB
                })
                .eq('id', profile.id);
        }

        return new Response(JSON.stringify({ message: 'Sync completed' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
