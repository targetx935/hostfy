
import fs from 'fs';
import path from 'path';

// Load .env
const envPath = path.resolve('.env');
const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
const env = {};
envLines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const MUX_TOKEN_ID = env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = env.MUX_TOKEN_SECRET;
const SUPABASE_URL = env.VITE_SUPABASE_URL;

if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET || !SUPABASE_URL) {
    console.error('Erro: Credenciais MUX ou URL Supabase não encontradas no .env');
    process.exit(1);
}

const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mux-webhook`;

async function setupWebhook() {
    console.log(`Iniciando configuração do Webhook Mux...`);
    console.log(`URL do Webhook: ${WEBHOOK_URL}`);

    try {
        const response = await fetch('https://api.mux.com/video/v1/webhooks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)}`
            },
            body: JSON.stringify({
                url: WEBHOOK_URL,
                events: ['video.asset.ready']
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Webhook configurado com SUCESSO via API!');
            console.log('ID do Webhook:', data.data.id);
        } else {
            console.error('❌ Erro ao configurar Webhook:', data.errors?.map(e => e.message).join(', ') || response.statusText);
            if (response.status === 400 && data.errors?.[0]?.message?.includes('already registered')) {
                console.log('ℹ️ Nota: O Webhook já parece estar registrado.');
            }
        }
    } catch (err) {
        console.error('❌ Erro de conexão ao Mux:', err.message);
    }
}

setupWebhook();
