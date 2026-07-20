import { createClient } from "@supabase/supabase-js";

/*
  Drop-in replacement for the Claude-artifact `window.storage` API,
  backed by a single Supabase table:

    create table nyish_store (
      key   text primary key,
      value text
    );

  See supabase/schema.sql for the full table + Row Level Security setup.

  Every key is effectively "shared" (all members read/write the same
  table) because NYISH's own phone+password login already decides who
  can see/do what inside the app — see src/App.jsx.

  ---------------------------------------------------------------------
  FIX (was causing "app not storing user info after registration"):
  VITE_SUPABASE_URL must be the bare project URL, e.g.

      https://xxxxxxxx.supabase.co

  NOT the REST endpoint (…/rest/v1/). supabase-js appends /rest/v1
  itself — passing a URL that already ends in /rest/v1/ made every
  request fail against the client's own SDK, and that failure was
  being swallowed (caught below) so the UI looked like it worked
  until the page refreshed and the data was gone.

  The sanitizer below strips a trailing /rest/v1 (with or without a
  slash) defensively, so this keeps working even if the .env value is
  wrong again in future — but please also fix .env.local to use the
  bare URL.
  ---------------------------------------------------------------------
*/

function sanitizeSupabaseUrl(raw) {
  if (!raw) return raw;
  return raw.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}

const url = sanitizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[NYISH] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — " +
      "copy .env.example to .env.local and fill in your Supabase project's values."
  );
}

// Exported so App.jsx can use supabase.auth for email verification codes.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

// Builds a URL to a Supabase Edge Function (e.g. functionsUrl("stk-push")),
// used by the Safaricom M-PESA STK Push integration in SavingsPage.
export function functionsUrl(fn) {
  if (!url) return null;
  return `${url}/functions/v1/${fn}`;
}
export const supabaseAnonKey = anonKey;

async function get(key) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("nyish_store").select("value").eq("key", key).maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error("storage.get failed", key, error);
    return null;
  }
  if (!data) return null;
  return { key, value: data.value, shared: true };
}

async function set(key, value) {
  if (!supabase) return null;
  const { error } = await supabase.from("nyish_store").upsert({ key, value });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("storage.set failed", key, error);
    return null;
  }
  return { key, value, shared: true };
}

async function del(key) {
  if (!supabase) return null;
  const { error } = await supabase.from("nyish_store").delete().eq("key", key);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("storage.delete failed", key, error);
    return null;
  }
  return { key, deleted: true, shared: true };
}

async function list(prefix = "") {
  if (!supabase) return null;
  let query = supabase.from("nyish_store").select("key");
  if (prefix) query = query.like("key", `${prefix}%`);
  const { data, error } = await query;
  if (error) {
    // eslint-disable-next-line no-console
    console.error("storage.list failed", prefix, error);
    return null;
  }
  return { keys: (data || []).map((r) => r.key), prefix, shared: true };
}

// Expose the same shape the artifact code expects: window.storage.get(key, shared)
window.storage = {
  get: (key, _shared) => get(key),
  set: (key, value, _shared) => set(key, value),
  delete: (key, _shared) => del(key),
  list: (prefix, _shared) => list(prefix),
};
