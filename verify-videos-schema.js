import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function getEnv() {
    try {
        const content = fs.readFileSync('.env', 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) env[key.trim()] = value.trim();
        });
        return env;
    } catch (e) {
        return process.env;
    }
}

const env = getEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Verificando tabela videos...');
    const { data, error } = await supabase.from('videos').select('*').limit(1);
    if (error) {
        console.error('Erro:', error.message);
    } else {
        const cols = data.length > 0 ? Object.keys(data[0]) : ['tabela vazia - mas select ok'];
        console.log('Colunas de videos:', cols.join(', '));

        const required = ['file_size', 'status', 'url'];
        const missing = required.filter(c => !cols.includes(c));

        if (missing.length === 0) console.log('✅ SCHEMA VIDEOS OK');
        else console.log('❌ FALTANDO EM VIDEOS:', missing.join(', '));
    }
}

check();
