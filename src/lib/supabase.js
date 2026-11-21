import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
// Proyectos nuevos usan "publishable key"; los antiguos, la legacy "anon key".
const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && apiKey);
export const supabase = isSupabaseConfigured
  ? createClient(url, apiKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { 'X-Client-Info': 'tienda-nys-web' } },
    })
  : null;
