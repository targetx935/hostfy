import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Supabase config loading...');
console.log('URL:', supabaseUrl);
console.log('Key starts with:', supabaseAnonKey?.substring(0, 10));

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
