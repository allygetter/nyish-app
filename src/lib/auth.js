import { supabase } from "./supabaseClient.js";

/*
  Authentication helpers for NYISH.

  THE OTP SWITCH — no code changes needed to flip it:
  Registration always does signUp() then immediately tries signIn().
    - If Supabase's "Enable email confirmations" is OFF (development
      default), that signIn() succeeds right away and the user is logged
      in with zero OTP friction.
    - If it's ON (production), signIn() fails with an "Email not
      confirmed" error. App.jsx's RegisterScreen catches exactly that
      error and falls into the OTP verification screen below instead —
      automatically, based on how your Supabase project is configured,
      not based on which lines of code are commented out.

  To require OTP in production: Supabase dashboard → Authentication →
  Settings → turn "Enable email confirmations" ON, and in Authentication →
  Email Templates → "Confirm signup", change {{ .ConfirmationURL }} to
  {{ .Token }} so Supabase emails a 6-digit code instead of a link.
  See supabase/schema.sql for the full note.
*/

export async function signUp(email, password) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

// ── OTP verification ─────────────────────────────────────────────────────────
// Always available — only reached by App.jsx when Supabase actually requires
// email confirmation (see the switch explanation above).
export async function verifySignupCode(email, token) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
  if (error) throw error;
  return data;
}

export async function resendSignupCode(email) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw error;
}
// ─────────────────────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

// Password rule: 8+ chars, upper, lower, symbol.
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*._-])[A-Za-z\d!@#$%^&*._-]{8,}$/;
export const PASSWORD_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter, and a symbol (e.g. @ . _ #).";

