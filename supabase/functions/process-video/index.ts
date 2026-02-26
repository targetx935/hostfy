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
    const { videoId, videoUrl, filePath } = await req.json()

    if (!videoId || !videoUrl || !filePath) {
      return new Response(JSON.stringify({ error: "videoId, videoUrl e filePath são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const muxTokenId = Deno.env.get("MUX_TOKEN_ID")
    const muxTokenSecret = Deno.env.get("MUX_TOKEN_SECRET")

    if (!muxTokenId || !muxTokenSecret) {
      throw new Error("Chaves da API do Mux não configuradas no ambiente.")
    }

    // Call Mux API to create an asset
    const muxResponse = await fetch("https://api.mux.com/video/v1/assets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
      },
      body: JSON.stringify({
        input: [{ url: videoUrl }],
        playback_policy: ["public"],
        passthrough: JSON.stringify({ videoId, filePath }), // Pass both ID and raw file path to our Webhook
        mp4_support: "standard", // Útil pra permitir download do source no futuro se precisar
      }),
    })

    if (!muxResponse.ok) {
      const errorText = await muxResponse.text()
      console.error("Erro na API do Mux:", errorText)
      throw new Error(`Erro do Mux: ${muxResponse.statusText}`)
    }

    const muxData = await muxResponse.json()

    return new Response(
      JSON.stringify({ success: true, assetId: muxData.data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    console.error("Process Video Error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
