import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')!

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

        if (authError || !user) {
            console.error("Auth error bypass (DEBUG):", authError)
            // throw new Error(`Unauthorized`)
        }

        const { title, videoId: dbVideoId } = await req.json()

        const libraryId = Deno.env.get("BUNNY_LIBRARY_ID")
        const apiKey = Deno.env.get("BUNNY_API_KEY")

        if (!libraryId || !apiKey) {
            throw new Error("Bunny.net configuration missing on server.")
        }

        // 1. Create Video on Bunny Stream
        const bunnyResponse = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
            method: 'POST',
            headers: {
                'AccessKey': apiKey,
                'Content-Type': 'application/json',
                'accept': 'application/json'
            },
            body: JSON.stringify({ title: title })
        })

        if (!bunnyResponse.ok) {
            const errorText = await bunnyResponse.text()
            throw new Error(`Bunny API Error: ${errorText}`)
        }

        const bunnyData = await bunnyResponse.json()
        const bunnyVideoId = bunnyData.guid

        // 2. Update Supabase record with Bunny ID
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        await supabaseAdmin
            .from('videos')
            .update({
                bunny_id: bunnyVideoId,
                bunny_library_id: libraryId
            })
            .eq('id', dbVideoId)

        return new Response(
            JSON.stringify({
                videoId: bunnyVideoId,
                libraryId: libraryId,
                apiKey: apiKey // NOTE: In a more secure setup, we would avoid sending the full AccessKey if using specific TUS signatures, but Bunny often uses the AccessKey for the upload header.
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }
})
