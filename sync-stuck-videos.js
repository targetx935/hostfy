
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
const env = {};
envLines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const MUX_TOKEN_ID = env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = env.MUX_TOKEN_SECRET;

async function syncVideos() {
    console.log('🔍 Iniciando sincronização de vídeos travados...');

    // 1. Buscar vídeos no Supabase que estão sem URL
    const { data: videos, error } = await supabase
        .from('videos')
        .select('id, title, status')
        .filter('url', 'is', null);

    if (error) {
        console.error('Erro ao buscar vídeos:', error.message);
        return;
    }

    console.log(`Encontrados ${videos.length} vídeos para verificar.`);

    // 2. Buscar assets no Mux para ver se algum corresponde ao passthrough
    const muxResponse = await fetch('https://api.mux.com/video/v1/assets', {
        headers: {
            'Authorization': `Basic ${btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)}`
        }
    });

    const { data: muxAssets } = await muxResponse.json();

    for (const video of videos) {
        const matchingAsset = muxAssets.find(a => {
            try {
                const metadata = JSON.parse(a.passthrough || '{}');
                return metadata.videoId === video.id;
            } catch (e) {
                return false;
            }
        });

        if (matchingAsset && matchingAsset.status === 'ready') {
            const playbackId = matchingAsset.playback_ids?.[0]?.id;
            if (playbackId) {
                console.log(`✅ Sincronizando vídeo: ${video.title}`);
                await supabase.from('videos').update({
                    status: 'ready',
                    url: `https://stream.mux.com/${playbackId}.m3u8`,
                    thumbnail_url: `https://image.mux.com/${playbackId}/thumbnail.png`,
                    mux_asset_id: matchingAsset.id,
                    mux_playback_id: playbackId
                }).eq('id', video.id);
            }
        } else {
            console.log(`⏳ Vídeo "${video.title}" ainda em processamento ou não encontrado no Mux.`);
        }
    }

    console.log('\n✨ Sincronização concluída!');
}

syncVideos();
