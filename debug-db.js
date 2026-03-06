
import { createClient } from '@supabase/supabase-js';

// No ESM env parsing needed as we can just hardcode or use process.env if available
// In this case, I'll use the values from the provided .env file information in the workspace
// VITE_SUPABASE_URL=...
// VITE_SUPABASE_ANON_KEY=...

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

async function checkVideos() {
    console.log('--- Verificando últimos 5 vídeos no Banco de Dados ---\n');

    const { data, error } = await supabase
        .from('videos')
        .select('id, title, status, url, thumbnail_url, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Erro ao buscar vídeos:', error.message);
        return;
    }

    if (data.length === 0) {
        console.log('Nenhum vídeo encontrado.');
        return;
    }

    data.forEach((v, i) => {
        console.log(`Vídeo ${i + 1}:`);
        console.log(`  ID: ${v.id}`);
        console.log(`  Título: ${v.title}`);
        console.log(`  Status: ${v.status}`);
        console.log(`  URL: ${v.url || '[NULL - Webhook não funcionou]'}`);
        console.log(`  Thumbnail: ${v.thumbnail_url || '[NULL]'}`);
        console.log(`  Criado em: ${v.created_at}`);
        console.log('-----------------------------------');
    });

    const hasNull = data.some(v => !v.url);
    if (hasNull) {
        console.log('\n⚠️ ALERTA: Existem vídeos com URL NULL. Isso significa que o Webhook do Mux NÃO atualizou o banco de dados.');
        console.log('Possíveis causas:');
        console.log('1. Você não configurou a URL do Webhook no painel do Mux.');
        console.log('2. A URL do Webhook está desativada ou com erro no Mux.');
    } else {
        console.log('\n✅ Tudo parece OK no banco de dados. Se o vídeo continua preto, pode ser um problema de carregamento no Player.');
    }
}

checkVideos();
