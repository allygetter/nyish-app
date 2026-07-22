import { createClient } from "@supabase/supabase-js";

// SUPABASE_SERVICE_ROLE_KEY must be set as a Vercel *server* environment
// variable (Project → Settings → Environment Variables) — NOT the
// VITE_ prefixed one the browser uses. The service role key bypasses RLS,
// so it must never be shipped to client code. Get it from Supabase →
// Project Settings → API → service_role (secret).
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getAdminClient() {
  if (!url || !serviceKey) {
    throw new Error("Server is missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceKey);
}

// Mirrors the client-side appendToList()/loadList() logic in App.jsx, but
// server-side against the same `nyish_store` blob table.
export async function loadListServer(admin, key) {
  const { data, error } = await admin.from("nyish_store").select("value").eq("key", key).maybeSingle();
  if (error || !data) return [];
  try {
    return JSON.parse(data.value);
  } catch {
    return [];
  }
}
export async function saveListServer(admin, key, list) {
  const { error } = await admin.from("nyish_store").upsert({ key, value: JSON.stringify(list) });
  if (error) throw error;
}
// Alias — saveListServer works for any JSON-serializable value, not just
// arrays (used e.g. to store single pending-payment objects).
export const saveValueServer = saveListServer;
export async function loadValueServer(admin, key) {
  const { data, error } = await admin.from("nyish_store").select("value").eq("key", key).maybeSingle();
  if (error || !data) return null;
  try {
    return JSON.parse(data.value);
  } catch {
    return null;
  }
}
export async function deleteKeyServer(admin, key) {
  await admin.from("nyish_store").delete().eq("key", key);
}
export async function appendToListServer(admin, key, item) {
  const latest = await loadListServer(admin, key);
  const next = [...latest, item];
  await saveListServer(admin, key, next);
  return next;
}
