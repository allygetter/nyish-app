# NYISH App — Progress & Reference

> **Purpose of this file:** a single source of truth for what is *actually*
> implemented on disk, checked by grep/build — not what a chat summary
> claims. If this file and the running app disagree, trust the app; if this
> file and a past chat message disagree, trust this file.
> Update this file at the end of every session that changes code.

Last verified: by direct file inspection (grep + line count), same session
this file was created.

---

## ⚠️ Known gap — read this first

An earlier chat turn summarized a large batch of work (Supabase Auth email
OTP, admin auto-seed, M-PESA edge functions, per-row DB tables) as
"done and build-verified." **That summary did not match the code on disk.**
`src/App.jsx` still imports `./lib/storage.js` and uses the original
phone + PIN scheme against one JSON blob (`window.storage` key `"members"`).
The newer files `src/lib/auth.js`, `src/lib/db.js`, `src/lib/supabaseClient.js`
exist and are written, but **`App.jsx` is not wired to them yet.**

Net effect: the live app today authenticates the old way (phone + PIN,
one shared JSON blob for each entity), not via Supabase Auth / real tables.
Treat any past claim of "OTP is live" or "M-PESA edge functions are
deployed" as **not true** until this file says otherwise.

---

## What is actually working today (current architecture)

- **Storage:** `src/lib/storage.js` → generic key/value table `nyish_store`
  in Supabase, one row per entity (`members`, `savings`, `loans`,
  `meetings`, `announcements`, `constitution`), each holding a JSON array
  (or text) as a single blob string.
- **Known bug in this scheme:** concurrent writes can silently overwrite
  each other ("last write wins") — e.g. two people registering around the
  same time can cause one registration to vanish. This is *why* `db.js`
  (real per-row tables) was started, to fix it properly. Not finished.
- **Auth:** custom, in `App.jsx` (`LoginScreen` / `RegisterScreen`).
  Members are matched by exact `phone` + `pin` string comparison against
  the in-memory `members` array. Passwords/PINs are stored in plain text
  inside the JSON blob (not hashed) — acceptable only as a stopgap.
- **Roles:** `chair`, `treasurer`, `secretary`, `member`. First-ever
  registrant auto-becomes `chair` + `active`; everyone else starts
  `pending` until an official approves them.
- **Features implemented and working:** registration + approval queue,
  savings logging, loan request/approve/reject/repay, meeting logging +
  attendance, announcements, constitution view/edit/download, certificate
  generation (canvas → PNG download).

## Files that exist but are NOT yet wired in

- `src/lib/supabaseClient.js` — plain Supabase client singleton. Fine, keep.
- `src/lib/auth.js` — Supabase Auth helpers (signUp/verifyOtp/signIn/
  signOut), designed for email-OTP verification. **Not imported by
  App.jsx.**
- `src/lib/db.js` — real per-row CRUD for members/savings/loans/meetings/
  announcements + blob-based constitution. **Not imported by App.jsx.**
  Requires the `create table` SQL in README.md Stage 1 to actually exist
  in your Supabase project (check before assuming these tables exist).

## Color / branding

Rebranded from green to a warm terracotta palette:
`#6B3A28` (ink/header/buttons), `#7C4630` / `#8B5540` / `#3A1F16`
(gradient stops), gold accent `#C99A2E` kept. Applied via sed across
`App.jsx`, `index.html`, `public/manifest.json`. Verified present in file.

## Things this session is fixing (see task list below)

- [x] Removed the exposed admin-credential text from the Login screen, and
      deleted the unused `BOOTSTRAP_PHONE`/`BOOTSTRAP_PIN` constants.
      Verified: `grep -n "BOOTSTRAP" src/App.jsx` returns nothing.
- [x] Password rule added (`PASSWORD_RULE` in `App.jsx`, 8+ chars, upper,
      lower, symbol), enforced on registration and the new change-password
      form. Field renamed from "PIN" to "password" everywhere.
- [x] Profile section (More → My profile): edit name/email/ID/KRA PIN/
      next-of-kin, upload or replace a passport photo, change password.
- [x] Shared `Avatar` component — shows the uploaded photo if present,
      else initials. Used in the home-screen top-right and the members list.
- [x] Certificate now draws the passport photo (circular, top-right of the
      certificate) and shows the KRA PIN if the member has one. Certificate
      drawing logic extracted into `drawCertificateOnCanvas()` /
      `renderCertificateBase64()` so it can be reused off-screen (see below).
- [x] Loans: grant/reject restricted to `me.role === "chair"` only (was any
      official). Members (incl. treasurer/secretary) can request.
- [x] Meetings: logging restricted to `me.role === "secretary"` only (was
      any official). Everyone else is view-only.
- [x] Home screen shows **both** group savings and personal savings to
      everyone (was one or the other depending on role).
- [x] Join confirmation: an in-app "Karibu!" modal appears the moment a
      member's status flips to active (tracked via a `congratulated` flag
      on the member record), linking straight to their certificate. This
      works today with zero extra setup.
- [x] `api/send-welcome.js` (Vercel serverless function) scaffolded —
      emails the new member via Resend with the certificate PNG attached,
      wired into `MembersPage`'s `approve()`. **Requires `RESEND_API_KEY`
      (and optionally `RESEND_FROM`) set in Vercel's environment variables
      to actually send** — silently no-ops without it, does not block
      approval. Verified: `npm run build` passes with this wired in.

Build verified clean after all of the above: `npm run build` → success,
bundle ~196KB gzip ~60KB, no errors.

## Not started / explicitly deferred (do not assume these exist)

- Supabase Auth + email OTP wiring into `App.jsx` (helpers exist in
  `auth.js`, UI not converted).
- Migration of members/savings/loans/meetings/announcements from the
  blob-storage scheme to the real tables in `db.js`.
- M-PESA STK Push (no code for this exists anywhere in the repo yet —
  despite an earlier claim otherwise. Would need a Vercel/Supabase
  serverless function with real Safaricom Daraja credentials).
- Custom domain + Resend SMTP for Supabase (user is mid-setup, domain not
  yet purchased as of last check).

## How to verify any of the above yourself

```bash
grep -n "BOOTSTRAP_PHONE\|window.storage\|from \"./lib/auth\|from \"./lib/db" src/App.jsx
grep -n "isChair\|isSecretary\|congratulated\|renderCertificateBase64" src/App.jsx
grep -rn "stk-push\|daraja\|mpesa" src/ api/ supabase/ 2>/dev/null
npm run build
```
If a claim in chat doesn't match what these commands show, the file is
right and the chat claim is wrong.

## Enabling the welcome email (optional)

`api/send-welcome.js` is written and wired into the approve button, but
does nothing until you set these in Vercel → Project → Settings →
Environment Variables:

- `RESEND_API_KEY` — from resend.com (see the earlier Resend setup steps).
- `RESEND_FROM` (optional) — e.g. `NYISH <noreply@yourdomain>`. Falls back
  to Resend's shared test sender if unset, which only delivers to your own
  Resend account email — fine for testing, not for real members.

Until this is set, members still get the in-app "Karibu!" welcome +
certificate the next time they log in — nothing is lost, email is a bonus
channel on top of that.

