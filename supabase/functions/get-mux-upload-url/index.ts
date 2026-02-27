import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const { filename, videoId, filePath } = await req.json()

        const muxTokenId = Deno.env.get("MUX_TOKEN_ID")
        const muxTokenSecret = Deno.env.get("MUX_TOKEN_SECRET")

        if (!muxTokenId || !muxTokenSecret) {
            throw new Error("Mux API keys NOT configured in environment.")
        }

        // Create a Direct Upload with Mux
        // We pass the passthrough data so the webhook can link back to our Supabase video record
        const muxResponse = await fetch("https://api.mux.com/video/v1/uploads", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
            },
            body: JSON.stringify({
                cors_origin: "*", // Or specific dashboard URL for security
                new_asset_settings: {
                    playback_policy: ["public"],
                    passthrough: JSON.stringify({ videoId, filePath: filePath || "" }),
                    mp4_support: "standard",
                },
            }),
        })

        if (!muxResponse.ok) {
            const errorText = await muxResponse.text()
            console.error("Mux API Error:", errorText)
            throw new Error(`Mux Error: ${muxResponse.statusText}`)
        }

        const { data } = await muxResponse.json()

        return new Response(
            JSON.stringify({
                url: data.url,
                uploadId: data.id,
                assetId: data.asset_id
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    } catch (err: any) {
        console.error("Get Mux Upload URL Error:", err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }
})
