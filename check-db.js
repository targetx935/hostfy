import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'ey...'; // Need robust way to auth

// Actually, I can use a simpler approach. I will parse the .env file and run a query.
import fs from 'fs';
import dotenv from 'dotenv';
const envConfig = dotenv.parse(fs.readFileSync('./.env'));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('videos').select('id, title, thumbnail_url');
    console.log("DB Result:");
    console.dir(data, { depth: null });
}

check();
