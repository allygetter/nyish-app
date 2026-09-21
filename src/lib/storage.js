import { createClient } from "@supabase/supabase-js";

/*
  Drop-in replacement for the Claude-artifact `window.storage` API,
  backed by a single Supabase table:

    create table nyish_store (
      key   text primary key,
      value text
    );

  Every key is effectively "shared" (all members read/write the same
  table) because NYISH's own phone+PIN login already decides who can
  see/do what inside the app — see src/App.jsx.
*/

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[NYISH] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — " +
      "copy .env.example to .env.local and fill in your Supabase project's values."
  );
}

const supabase = url && anonKey ? createClient(url, anonKey) : null;

async function get(key) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("nyish_store").select("value").eq("key", key).maybeSingle();
  if (error || !data) return null;
  return { key, value: data.value, shared: true };
}

async function set(key, value) {
  if (!supabase) return null;
  const { error } = await supabase.from("nyish_store").upsert({ key, value });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("storage.set failed", error);
    return null;
  }
  return { key, value, shared: true };
}

async function del(key) {
  if (!supabase) return null;
  const { error } = await supabase.from("nyish_store").delete().eq("key", key);
  if (error) return null;
  return { key, deleted: true, shared: true };
}

async function list(prefix = "") {
  if (!supabase) return null;
  let query = supabase.from("nyish_store").select("key");
  if (prefix) query = query.like("key", `${prefix}%`);
  const { data, error } = await query;
  if (error) return null;
  return { keys: (data || []).map((r) => r.key), prefix, shared: true };
}

// Expose the same shape the artifact code expects: window.storage.get(key, shared)
window.storage = {
  get: (key, _shared) => get(key),
  set: (key, value, _shared) => set(key, value),
  delete: (key, _shared) => del(key),
  list: (prefix, _shared) => list(prefix),
};
