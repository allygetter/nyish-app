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

## Session: "do all five" pass — what's actually real

Attempting all five improvement categories with full depth in one pass
would have repeated the earlier honesty problem (claiming completion that
isn't real). Instead, one concrete, build-verified piece was implemented
per category, and everything else is listed as explicitly deferred below
— not silently skipped, not silently claimed.

**1. Foundation (data-loss bug mitigation)**
- Added `appendToList()` / `updateInList()` / `removeFromList()` in
  `App.jsx` — each re-fetches the latest blob from storage immediately
  before merging, instead of writing a possibly-stale in-memory copy.
  This narrows (does **not** eliminate — a full migration to `db.js`'s
  real per-row tables is still the actual fix) the race window where two
  people saving around the same moment could overwrite each other.
- Migrated the highest-traffic write paths to these helpers: savings
  entries, loan requests/approvals/repayments, meeting logs, announcements,
  member approve/reject/role-change, fines, rotation state. Verify:
  `grep -c "persist\.\(append\|update\|remove\)" src/App.jsx` → 17 call sites.
- `saveList()` now returns a real success boolean instead of swallowing
  failures silently.

**2. Financial features**
- **Fines**: new `FinesPage` (More → Fines). Officials issue a fine
  (amount + reason) against a member; members see their own and an
  "unpaid total" banner; officials mark paid. Stored in a new `fines`
  list.
- **Merry-go-round rotation**: new `RotationPage` (More → Merry-go-round).
  Officials set the rotation order from active members and advance to the
  next recipient; tracks completed cycles. Stored as `rotation` (single
  JSON blob: `{ order, currentIndex, cyclesCompleted }`).
- Interest calculation and a formal financial-statement/PDF export were
  **not** attempted this pass — deferred, see below.

**3. Communication**
- **Not implemented this pass.** SMS (Africa's Talking or similar) and
  WhatsApp broadcast both need a real account + API credentials this
  environment doesn't have — same category as the M-PESA/Resend items,
  i.e. buildable once you have those credentials, not before. Swahili/
  English toggle is a real i18n effort (every string, not just a few) and
  was deliberately not half-done.

**4. Trust & accountability**
- **Audit log**: `logActivity()` helper + new `activityLog` list, called
  from every mutation (saving recorded, loan requested/approved/rejected/
  signed/repaid, meeting logged, announcement posted, member approved/
  rejected/role-changed, fine issued/paid, rotation set/advanced). New
  `ActivityLogPage` (More → Activity log, officials only) lists them
  newest-first with who + when.
- **Two-signature approval for large loans**: `LARGE_LOAN_THRESHOLD =
  50000` (KES). Loans at/above this need both Chair and Treasurer to sign
  before status flips to `approved`; below it, Chair alone is enough
  (unchanged from before). Partial signatures are shown on the loan card.
- **Transparency view**: home screen now shows group savings, personal
  savings, loans out, active member count, and total fines collected to
  *every* member, not just officials — extends the "group savings visible
  to everyone" fix from a previous session.

**5. Polish**
- **CSV export**: new `ExportPage` (More → Export data, officials only).
  Downloads members/savings/loans/fines each as a CSV — client-side,
  no backend needed.
- **Onboarding tip**: a dismissible one-line card shown once to a newly
  active official (Chair/Treasurer/Secretary), summarizing what their role
  can do. Dismissal is persisted (`onboarded` flag on the member record) so
  it won't reappear.
- **Full offline caching** was **not** attempted — the existing
  `public/sw.js` is still a no-op-fetch stub from an earlier session (see
  "Not started" below). The app is installable, but not offline-usable
  yet.

Build verified after all of the above:
```
npm run build   →  ✓ built, no errors (bundle ~212KB, gzip ~64KB)
```

## Session: "do all five" (2nd request) — dashboard, M-PESA, interest, SMS, and why security isn't in this batch

The user asked for five things again: dashboard visibility for fines/
rotation, M-PESA STK Push restored, loan interest, SMS, and (from the
prior turn's own suggestion list) real security. Four were built and
build-verified. Security was **not** attempted as a same-pass item —
here's the actual reasoning, not just a deferral note:

**Why security couldn't be "done" alongside the other four:** the app's
login is custom (phone+password checked in the browser against a JSON
blob) — Supabase itself has no idea who's "logged in." Row Level Security
policies can only ever say "allow everyone" or "block everyone" against
the shared anon key; they cannot distinguish *which* member is asking,
because there's no real session for RLS to check. Meaningfully fixing this
requires either (a) finishing the Supabase Auth migration (`auth.js`/
`db.js`, still unwired — see "Not started" below), or (b) routing every
write through server-side functions that check credentials before using
the service-role key (a similar-sized undertaking, demonstrated by how
much code the M-PESA functions below needed just for one feature). Neither
fits safely alongside four other simultaneous changes without real risk of
breaking live financial data. This is a deliberate scope decision, not a
missed item.

**1. Dashboard visibility (quick, low-risk, done in full)**
- `HomePage` now shows a Merry-go-round card (current recipient, position
  in rotation) and a Fines card (unpaid count for officials, personal
  unpaid total for members) — both tappable, jumping straight into the
  respective More-menu page via a new `openMore(key)` prop threaded from
  `NyishApp`. Verify: `grep -c "openMore" src/App.jsx` → 5.

**2. M-PESA STK Push (restored — for real this time)**
- `api/mpesa-stkpush.js` — initiates a Daraja STK push, stores a
  short-lived `mpesa_pending:<CheckoutRequestID>` record in Supabase so
  the callback knows which member/amount to credit.
- `api/mpesa-callback.js` — the endpoint Safaricom calls back; on success,
  appends a real `savings` entry server-side (source: `"mpesa"`); always
  returns 200 to Safaricom to avoid duplicate-entry retries.
- `api/mpesa-status.js` — polling endpoint the client uses to detect
  completion (Daraja's own result is async, not part of the initiate call).
- `api/_supabaseAdmin.js` — shared server-side Supabase client using the
  **service role key** (never sent to the browser), with the same
  load/save/append helpers as the client blob scheme.
- `SavingsPage` now has a "Pay via M-PESA" box (members only) that
  triggers the push, polls every 3s for up to ~60s, and calls the new
  `persist.reloadSavings()` to refresh the UI once the server-side
  callback has written the entry.
- **This needs real Safaricom Daraja credentials to actually fire** —
  `MPESA_ENV`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`,
  `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL` (must be a
  public HTTPS URL — cannot be tested from localhost). Without them, the
  button shows a clear "M-PESA is not configured" error instead of failing
  silently. Verify: `grep -c "mpesa-stkpush\|mpesa-status\|mpesa-callback" src/App.jsx` → 2 (both usages in SavingsPage).

**3. Loan interest**
- `LOAN_INTEREST_RATE_PCT = 10` (flat, not compounding — standard chama
  convention). Applied once at approval time: `interestAmount`,
  `totalDue`, and `balance` are all set from `principal + interest`. Shown
  live in the request form (interest preview as you type an amount) and
  on approved loan cards (`+KES X interest (10% flat) · total due KES Y`).
  Change the single constant if your AGM sets a different rate — no other
  code changes needed. Verify: `grep -c "LOAN_INTEREST_RATE_PCT" src/App.jsx` → 5.

**4. SMS (Africa's Talking scaffold, wired into a real trigger)**
- `api/send-sms.js` — bulk SMS via Africa's Talking's HTTP API (sandbox
  username works for free testing before paying for production credits).
- Wired into `AnnouncementsPage`: a checkbox "Also send as SMS to all
  active members" next to the normal post-to-group action. Uses each
  member's phone (normalized via the same `toMsisdn()` used for M-PESA).
- **Needs `AT_USERNAME` and `AT_API_KEY`** (Vercel env vars) to actually
  send — same no-op-with-clear-error pattern as the other integrations.
  Not yet wired into fine reminders or loan due-dates specifically — only
  the announcement broadcast path exists so far.

Full build verified after all four:
```
npm run build          →  ✓ built, no errors (bundle ~218KB, gzip ~66KB)
node --check api/*.js   →  all pass
```

## Session: Chair-only permission lockdown

User flagged (via a real activity-log excerpt) that any official could
appoint roles, approve members, issue fines, and post announcements —
tightened per explicit instructions plus three clarifying answers.

**Now Chair-only** (`isChair` gate; Treasurer/Secretary see view-only,
regular members don't see the edit controls at all):
- Posting announcements (`AnnouncementsPage`) — was any official.
- Approving/rejecting members and changing roles (`MembersPage`) — was
  any official. Non-chair officials now see a "View only" banner and a
  read-only role badge instead of the role `<select>`.
- Issuing fines / marking fines paid (`FinesPage`) — was any official.
  Viewing all fines (not just your own) is still open to any official.
- Setting/advancing the merry-go-round rotation (`RotationPage`) — was
  any official (clarified: yes, Chair-only).
- Editing the constitution text (`ConstitutionPage`) — was any official
  (clarified: yes, Chair-only). Downloading stays open to everyone.

**Now Chair + Treasurer only** (`canManageFinance = isChair || isTreasurer`,
clarified answer):
- Recording a savings contribution on behalf of another member, and
  viewing the full savings history (not just your own) — was any
  official, including Secretary. Secretary now behaves like a regular
  member on the Savings page (own entries and own M-PESA payments only).

**Unchanged (already correctly scoped from earlier sessions):**
- Loan grant/reject — Chair only (Treasurer co-signs loans ≥ KES 50,000).
- Logging meetings — Secretary only.

Verify:
```bash
grep -n "isChair" src/App.jsx | wc -l
grep -n "canManageFinance" src/App.jsx | wc -l
npm run build
```

## Not started / explicitly deferred (do not assume these exist)

- **Real security / RLS lockdown** — blocked on the Auth migration below;
  see the reasoning in this session's section above. Not partially done,
  not faked.
- Supabase Auth + email OTP wiring into `App.jsx` (helpers exist in
  `auth.js`, UI not converted). **Still the single biggest open item.**
- Migration of members/savings/loans/meetings/announcements/fines from the
  blob-storage scheme to the real tables in `db.js` (would fully close the
  race-condition gap the append/update helpers only narrow).
- SMS is wired for announcements only — not yet for fine reminders, loan
  due-dates, or meeting reminders specifically.
- Swahili/English language toggle — not started, would need every UI
  string covered, not a partial pass.
- A formal financial-statement/PDF export for AGMs (CSV export exists;
  a formatted statement does not).
- True offline support (service worker still doesn't cache anything).
- Custom domain + Resend SMTP for Supabase (status unknown as of this
  session — last known state was mid-setup).

## How to verify any of the above yourself

```bash
grep -n "BOOTSTRAP_PHONE\|window.storage\|from \"./lib/auth\|from \"./lib/db" src/App.jsx
grep -n "isChair\|isSecretary\|isTreasurer\|congratulated\|renderCertificateBase64" src/App.jsx
grep -c "persist\.log(" src/App.jsx
grep -c "persist\.\(append\|update\|remove\)" src/App.jsx
grep -c "openMore" src/App.jsx
grep -c "LOAN_INTEREST_RATE_PCT" src/App.jsx
ls api/                      # should list mpesa-*.js, send-welcome.js, send-sms.js, _supabaseAdmin.js
npm run build
node --check api/*.js
```
If a claim in chat doesn't match what these commands show, the file is
right and the chat claim is wrong.

## Enabling M-PESA STK Push (optional)

Set these in Vercel → Project → Settings → Environment Variables:

- `MPESA_ENV` — `sandbox` while testing, `production` when live.
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET` — from your Daraja app at
  developer.safaricom.co.ke.
- `MPESA_SHORTCODE` — your Paybill/Till (sandbox default: `174379`).
- `MPESA_PASSKEY` — from the Daraja app (sandbox has a published test key).
- `MPESA_CALLBACK_URL` — `https://your-app.vercel.app/api/mpesa-callback`.
  Must be a real public HTTPS URL; Safaricom cannot call `localhost`.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Project Settings → API →
  `service_role` (secret, server-only, never the `VITE_` anon key).

Until these are set, the "Pay via M-PESA" button shows a clear
"M-PESA is not configured" message instead of silently failing.

## Enabling SMS (optional)

- `AT_USERNAME`, `AT_API_KEY` — from africastalking.com (use `sandbox` as
  the username to test for free before buying production SMS credits).
- `AT_SENDER_ID` (optional) — your registered short code, once you have one.

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

