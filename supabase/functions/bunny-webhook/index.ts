import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

serve(async (req) => {
    try {
        const payload = await req.json();
        console.log('Bunny Webhook Received:', payload);

        // Bunny webhooks are simple: Triggered on Status update
        // VideoStatus enum: 0 - Queued, 1 - Processing, 2 - Encoding, 3 - Finished, 4 - ResolutionFinished, 5 - Failed...
        if (payload.Status === 3) {
            const bunnyVideoId = payload.VideoGuid;
            const libraryId = payload.VideoLibraryId;

            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );

            const playbackUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${bunnyVideoId}`;
            const thumbnailUrl = `https://vz-db553844-7d5.b-cdn.net/${bunnyVideoId}/thumbnail.jpg`;
            // Note: The thumbnail host depends on your Bunny library's pull zone.
            // A more robust way is to use the library's hostname if known.

            const { data: videoData, error: fetchError } = await supabaseAdmin
                .from('videos')
                .select('id, title, user_id')
                .eq('bunny_id', bunnyVideoId)
                .single();

            if (fetchError || !videoData) {
                console.error('Video not found for bunny_id:', bunnyVideoId);
                return new Response("Not found", { status: 404 });
            }

            const { error: updateError } = await supabaseAdmin
                .from('videos')
                .update({
                    status: 'ready',
                    url: playbackUrl,
                    thumbnail_url: thumbnailUrl
                })
                .eq('id', videoData.id);

            if (updateError) throw updateError;

            // Notification
            await supabaseAdmin.from('notifications').insert({
                user_id: videoData.user_id,
                title: 'Vídeo Pronto! 🚀',
                message: `Seu vídeo "${videoData.title}" no Bunny Stream já está pronto.`,
                type: 'success',
                link: `/?video=${videoData.id}`
            });

            console.log(`Video ${videoData.id} updated successfully via Bunny Webhook.`);
        }

        return new Response(JSON.stringify({ message: "Processed" }), { status: 200 });
    } catch (error) {
        console.error('Webhook error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
