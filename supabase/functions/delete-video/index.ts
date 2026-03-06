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

        // 2. Delete the Video from Bunny CDN
        if (video.bunny_id && video.bunny_library_id) {
            const bunnyApiKey = Deno.env.get("BUNNY_API_KEY")
            if (bunnyApiKey) {
                const bunnyRes = await fetch(`https://video.bunnycdn.com/library/${video.bunny_library_id}/videos/${video.bunny_id}`, {
                    method: "DELETE",
                    headers: {
                        AccessKey: bunnyApiKey,
                    }
                })
                if (!bunnyRes.ok) {
                    console.error("Failed to delete Bunny video", await bunnyRes.text())
                    // We keep going even if Bunny fails, to at least clean our DB
                } else {
                    console.log(`Successfully deleted Bunny Video ${video.bunny_id}`)
                }
            }
        }

        // 3. Delete custom thumbnail from Supabase Storage (if any)
        if (video.thumbnail_url && video.thumbnail_url.includes('/storage/v1/object/public/thumbnails/')) {
            const urlObj = new URL(video.thumbnail_url)
            const pathParts = urlObj.pathname.split('/thumbnails/')
            if (pathParts.length > 1) {
                const filePath = decodeURIComponent(pathParts[1])
                const { error: storageErr } = await supabaseAdmin.storage.from('thumbnails').remove([filePath])
                if (storageErr) console.error("Failed to delete thumbnail from storage:", storageErr)
                else console.log(`Deleted custom thumbnail: ${filePath}`)
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
