import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

interface WebhookPayload {
  type: string;
  data: {
    status: string;
    playback_ids?: { id: string; policy: string }[];
    id: string; // Mux Asset ID
    passthrough?: string; // This will hold our raw Supabase storage path or Video ID to link back
  };
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    console.log(`Received Webhook: ${payload.type}`);

    // We only care when an asset is fully ready to be streamed
    if (payload.type === 'video.asset.ready') {
      const { id: muxAssetId, playback_ids, passthrough } = payload.data;

      const playbackId = playback_ids?.find(p => p.policy === 'public')?.id;

      if (!playbackId || !passthrough) {
        console.log("Skipping: Missing playback ID or passthrough identifier.");
        return new Response(JSON.stringify({ message: "Skipped" }), { status: 200 });
      }

      // 1. Initialize Supabase Admin Client to bypass RLS policies for background jobs
      // Because this runs securely server-side
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Expect passthrough to be JSON like '{"videoId": "uuid", "filePath": "raw/123.mp4"}'
      // If in the frontend upload we sent it as JSON, let's parse it
      let metadata = { videoId: '', filePath: '' };
      try {
        metadata = JSON.parse(passthrough);
      } catch (e) {
        console.log("Could not parse passthrough:", passthrough);
        return new Response("Invalid passthrough format", { status: 400 });
      }

      const { videoId, filePath } = metadata;

      if (!videoId) {
        console.log("Missing videoId in passthrough");
        return new Response("Missing videoId", { status: 400 });
      }

      const muxUrl = `https://stream.mux.com/${playbackId}.m3u8`;
      const muxThumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.png?time=0`;

      // 2. Fetch current record to check if it already has a custom thumbnail
      const { data: currentVideo } = await supabaseAdmin
        .from('videos')
        .select('thumbnail_url')
        .eq('id', videoId)
        .single();

      const { error: dbError } = await supabaseAdmin
        .from('videos')
        .update({
          status: 'ready',
          url: muxUrl,
          // Only use Mux thumbnail if we don't already have a custom one
          thumbnail_url: currentVideo?.thumbnail_url || muxThumbnailUrl,
          mux_asset_id: muxAssetId,
          mux_playback_id: playbackId
        })
        .eq('id', videoId);

      if (dbError) {
        console.error("Failed to update database record:", dbError);
        throw dbError;
      }

      console.log(`Successfully updated DB for Video ID: ${videoId} with Mux URL: ${muxUrl}`);

      // 3. Create a notification for the user
      // First, get the video title to make a nice message
      const { data: videoInfo } = await supabaseAdmin
        .from('videos')
        .select('title, user_id')
        .eq('id', videoId)
        .single();

      if (videoInfo) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: videoInfo.user_id,
            title: 'Vídeo Pronto! 🚀',
            message: `O vídeo "${videoInfo.title}" terminou de processar e já pode ser usado.`,
            type: 'success',
            link: `/?video=${videoId}`
          });
      }

      // 4. THE GOLDEN EGG: Delete the raw, heavy MP4 from Supabase Storage (if applicable)
      // This saves massive storage costs. If using direct upload, there is no file to delete.
      if (filePath) {
        const { error: storageError } = await supabaseAdmin
          .storage
          .from('videos')
          .remove([filePath]);

        if (storageError) {
          console.error(`Failed to delete raw MP4 temp file at ${filePath}:`, storageError);
        } else {
          console.log(`Successfully deleted heavy temporary MP4 at ${filePath}. Storage Saved!`);
        }
      }

    }

    // Always tell Mux we received it to stop retries
    return new Response(JSON.stringify({ message: "Webhook processed" }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
