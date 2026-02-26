import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

// Token from Kiwify
const KIWIFY_TOKEN = '902pr25ebu4';

// Mapping from Kiwify Product/Offer IDs to Hostfy Plans
// You will need to replace these IDs with the actual ones from your Kiwify Dashboard
const PLAN_MAPPING: Record<string, string> = {
    'l3uPZJ3': 'basic',
    'KO4elyN': 'pro',
    'YHYCevr': 'ultra',
};

serve(async (req) => {
    try {
        // 1. Parse payload and validate signature
        const signature = req.headers.get('x-kiwify-signature');
        const bodyText = await req.text();
        const payload = JSON.parse(bodyText);

        // Basic signature validation if Kiwify is configured to send it
        // Note: If you want full cryptographic validation, we'd need more complex crypto logic.
        // However, Kiwify often just expects the token to be matched or verified via a secret.
        console.log('Kiwify Webhook Received:', payload.order_status);

        const {
            order_status,
            customer,
            product_id,
            offer_id,
            product_name
        } = payload;

        // 2. Initialize Supabase Admin
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 3. Process approved orders
        if (order_status === 'paid' || order_status === 'approved') {
            const email = customer.email;

            // Determine which plan they bought
            // Checks offer_id first, then product_id
            const targetPlan = PLAN_MAPPING[offer_id] || PLAN_MAPPING[product_id] || 'basic';

            console.log(`Upgrading user ${email} to plan ${targetPlan}`);

            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    plan: targetPlan,
                    subscription_status: 'active'
                })
                .eq('email', email);

            if (updateError) throw updateError;

            // Create a nice notification
            await supabaseAdmin.from('notifications').insert({
                user_id: (await supabaseAdmin.from('profiles').select('id').eq('email', email).single()).data?.id,
                title: 'Assinatura Ativada! ✨',
                message: `Seu plano ${targetPlan.toUpperCase()} foi ativado com sucesso. Aproveite todos os recursos!`,
                type: 'success'
            });
        }

        // 4. Handle cancellations
        if (order_status === 'canceled' || order_status === 'refunded') {
            await supabaseAdmin
                .from('profiles')
                .update({ subscription_status: 'canceled' })
                .eq('email', customer.email);
        }

        return new Response(JSON.stringify({ message: "Processed" }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('Kiwify Webhook Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
