import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const { videoId } = await req.json()

        if (!videoId) {
            return new Response(JSON.stringify({ error: "videoId é obrigatório" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
        }

        // Initialize Supabase Client using the user's Auth Header to respect RLS
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error("Missing Authorization header")

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        // Client for DB operations (ensures user owns the video)
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })

        // Admin client for Storage deletion if needed (sometimes RLS on storage is tricky from Edge Functions)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Fetch the video details to coordinate deletion
        const { data: video, error: fetchErr } = await supabaseClient
            .from('videos')
            .select('*')
            .eq('id', videoId)
            .single()

        if (fetchErr || !video) {
            throw new Error("Vídeo não encontrado ou acesso negado.")
        }

        // 2. Delete the Asset from Mux (if it reached Mux)
        if (video.mux_asset_id) {
            const muxTokenId = Deno.env.get("MUX_TOKEN_ID")
            const muxTokenSecret = Deno.env.get("MUX_TOKEN_SECRET")
            if (muxTokenId && muxTokenSecret) {
                const muxRes = await fetch(`https://api.mux.com/video/v1/assets/${video.mux_asset_id}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
                    }
                })
                if (!muxRes.ok) {
                    console.error("Failed to delete Mux asset", await muxRes.text())
                    // We keep going even if Mux fails, to at least clean our DB
                } else {
                    console.log(`Successfully deleted Mux Asset ${video.mux_asset_id}`)
                }
            }
        }

        // 3. Delete raw MP4 from Supabase Storage (if it's still there or webhook failed)
        // The url looks like: https://[project].supabase.co/storage/v1/object/public/videos/[userId]/[filename.mp4]
        // Or we scan the bucket using supabaseAdmin.storage.from('videos').list(userId) and find the file matching the ID.
        // Let's extract the file path from the raw URL if possible.
        if (video.url && video.url.includes('/storage/v1/object/public/videos/')) {
            const urlObj = new URL(video.url)
            const pathParts = urlObj.pathname.split('/videos/')
            if (pathParts.length > 1) {
                const filePath = decodeURIComponent(pathParts[1])
                const { error: storageErr } = await supabaseAdmin.storage.from('videos').remove([filePath])
                if (storageErr) console.error("Failed to delete from storage:", storageErr)
                else console.log(`Deleted raw file: ${filePath}`)
            }
        }

        // 4. Delete the video record from the Database
        // (Settings, Retention Points, and Sessions will cascade delete due to ON DELETE CASCADE)
        const { error: deleteErr } = await supabaseClient
            .from('videos')
            .delete()
            .eq('id', videoId)

        if (deleteErr) throw deleteErr

        return new Response(
            JSON.stringify({ success: true, message: "Vídeo apagado de todas as plataformas." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    } catch (err: any) {
        console.error("Delete Video Error:", err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }
})
