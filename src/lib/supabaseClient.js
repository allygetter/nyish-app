import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[NYISH] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — " +
      "copy .env.example to .env.local (or set them in Vercel) and fill in your Supabase project's values."
  );
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
