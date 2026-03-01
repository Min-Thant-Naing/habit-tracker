import { createClient } from '@supabase/supabase-js';

// Use environment variables or fallback to hardcoded keys if provided
const rawUrl = import.meta.env.VITE_SUPABASE_URL || "https://lrpcrhhlfjkepnsfdamy.supabase.co";
const supabaseUrl = rawUrl.trim().replace(/\/$/, "");
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_kz6i62zm_68PD714_sMlsg_5n2QFZgs").trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Please check your environment variables.");
}

if (supabaseAnonKey && !supabaseAnonKey.includes('.')) {
  console.warn("The Supabase Anon Key provided does not look like a standard JWT. This may cause 'Failed to fetch' or authentication errors.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
