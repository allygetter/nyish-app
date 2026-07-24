import { supabase } from "./supabaseClient.js";

/*
  Authentication helpers for NYISH.

  CURRENT MODE: OTP verification is BYPASSED.
  Registration calls signUp() then immediately signs in with signInWithPassword()
  so the user gets a live session without needing to verify their email first.

  TO RESTORE OTP VERIFICATION LATER:
    1. In Supabase dashboard → Authentication → Email Templates →
       "Confirm signup": change {{ .ConfirmationURL }} to {{ .Token }}
       so Supabase sends a 6-digit code instead of a link.
    2. In auth.js: uncomment verifySignupCode() and resendSignupCode() below.
    3. In App.jsx RegisterScreen: uncomment the "verify" step block
       (search for "OTP_STEP_START" and "OTP_STEP_END").
    4. Remove the bypass block in submitForm() (search for "OTP_BYPASS").
*/

export async function signUp(email, password) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

// ── OTP verification functions ───────────────────────────────────────────────
// Uncomment these when you are ready to enable email verification (see above).
//
// export async function verifySignupCode(email, token) {
//   if (!supabase) throw new Error("Supabase is not configured.");
//   const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
//   if (error) throw error;
//   return data;
// }
//
// export async function resendSignupCode(email) {
//   if (!supabase) throw new Error("Supabase is not configured.");
//   const { error } = await supabase.auth.resend({ type: "signup", email });
//   if (error) throw error;
// }
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

