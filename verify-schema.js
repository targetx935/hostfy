
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Função simples para ler o .env sem depender de pacotes extras se possível
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: Credenciais não encontradas no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Verificando...');
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error('Erro:', error.message);
    } else {
        const cols = data.length > 0 ? Object.keys(data[0]) : ['tabela vazia - mas select ok'];
        console.log('Colunas:', cols.join(', '));

        const required = ['email', 'browser_fingerprint', 'subscription_status'];
        const missing = required.filter(c => !cols.includes(c));

        if (missing.length === 0) console.log('✅ TUDO OK');
        else console.log('❌ FALTANDO:', missing.join(', '));
    }
}

check();
