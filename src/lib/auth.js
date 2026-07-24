import { supabase } from "./supabaseClient.js";

/*
  Real authentication, replacing the old plaintext-PIN scheme.

  Flow:
    1. signUp(email, password)         -> creates the auth user, Supabase emails a 6-digit code
    2. verifySignupCode(email, token)  -> confirms the email using that code
    3. signIn(email, password)         -> normal login once verified
    4. getSession() / onAuthChange()   -> restore/track the logged-in user

  IMPORTANT one-time setup in the Supabase dashboard (see README "Email OTP"
  section): by default Supabase emails a confirmation LINK, not a numeric
  code. Switch the "Confirm signup" email template to use {{ .Token }}
  (a 6-digit code) instead of {{ .ConfirmationURL }} so verifySignupCode()
  below has something to check against.
*/

/*
  TEMP NOTE: as of now, App.jsx's RegisterScreen bypasses the OTP step —
  it calls signUp() and immediately creates the member profile from
  `user.id`, instead of routing through verifySignupCode(). That function
  (and resendSignupCode) are still exported and fully working below; they
  just aren't called right now. See the TODO comment in App.jsx's
  submitForm for how to flip it back on.

  If "Confirm email" is still ON in the Supabase dashboard, signIn() will
  reject unconfirmed users with "Email not confirmed" even though signUp()
  succeeded — turn that setting off too if you want the bypass to be a
  true end-to-end skip during dev.
*/
export async function signUp(email, password) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

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

// Password rule: 8+ chars, at least one lowercase, one uppercase, one
// symbol from @ . - _ # etc.
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*._-])[A-Za-z\d!@#$%^&*._-]{8,}$/;
export const PASSWORD_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter, and a symbol (e.g. @ . _ #).";
