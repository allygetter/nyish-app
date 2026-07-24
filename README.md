# Deploying NYISH — step by step

This folder is a standalone version of the NYISH app (outside Claude.ai),
using a real database (Supabase) instead of the artifact's built-in storage.
Follow the steps in order. No coding experience required — just copy/paste.

Total time: ~30–45 minutes for the web app. App-store publishing is a
separate stage at the end (Stage 4) and takes longer, mostly waiting on
Apple/Google review.

---

## Stage 1 — Create the database (Supabase, free)

1. Go to https://supabase.com → **Start your project** → sign in with GitHub or email.
2. Click **New project**. Pick any name (e.g. `nyish`), set a database password
   (save it somewhere safe), choose the region closest to Kenya (e.g. `eu-central` or
   the nearest available), and click **Create new project**. Wait ~2 minutes.
3. Once it's ready, open the **SQL Editor** (left sidebar) → **New query**, paste this,
   and click **Run**:

   ```sql
   create table nyish_store (
     key   text primary key,
     value text
   );

   alter table nyish_store enable row level security;

   create policy "Allow all reads" on nyish_store
     for select using (true);

   create policy "Allow all writes" on nyish_store
     for insert with check (true);

   create policy "Allow all updates" on nyish_store
     for update using (true);

   create policy "Allow all deletes" on nyish_store
     for delete using (true);
   ```

   This creates one table the app uses to store members, savings, loans,
   meetings, announcements and the constitution text.

   > **Note on security:** the policies above allow anyone with your public
   > API key to read/write this table — that's fine for a small group app
   > (access is still gated by phone+PIN inside the app), but it means
   > someone who inspects your website's network traffic could in theory
   > read the raw data table directly. If that matters to you later, this
   > is the place to tighten the policies (e.g. only allow access via a
   > server function) — ask me and I can help set that up.

4. Go to **Project Settings → API**. Copy two values, you'll need them in Stage 3:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (a long string starting with `eyJ...`)

---

## Stage 2 — Put the code on GitHub

1. Go to https://github.com → **New repository** → name it `nyish-app` → **Create repository**.
2. On your computer, unzip the project files I gave you into a folder, open a terminal in
   that folder, and run:

   ```bash
   git init
   git add .
   git commit -m "Initial NYISH app"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/nyish-app.git
   git push -u origin main
   ```

   (No terminal experience? GitHub Desktop — https://desktop.github.com — does the
   same thing with buttons instead of commands.)

---

## Stage 3 — Deploy the website (Vercel, free)

1. Go to https://vercel.com → sign up with your GitHub account.
2. Click **Add New → Project**, select your `nyish-app` repo → **Import**.
3. Before clicking Deploy, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → paste your Project URL from Stage 1
   - `VITE_SUPABASE_ANON_KEY` → paste your anon public key from Stage 1
4. Click **Deploy**. In about a minute you'll get a live link like
   `https://nyish-app.vercel.app` — this is the real, working web app.
5. Open it on your phone and choose **"Add to Home Screen"** (Safari: Share → Add
   to Home Screen; Chrome/Android: ⋮ menu → Install app). It now behaves like an
   installed app with its own icon — no app store needed for this.
6. Optional: **Project Settings → Domains** to attach a custom domain
   (e.g. `nyish.co.ke`) if you own one.

Every time you push new code to GitHub's `main` branch, Vercel redeploys
automatically.

---

## Stage 4 — Publish to Google Play / Apple App Store (optional, later)

Once Stage 3 is live at a real URL, wrapping it as a store-listed app is
mostly configuration, not new code. The straightforward path is **Capacitor**:

1. In the project folder:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init "NYISH" "ke.co.nyish.app" --web-dir=dist
   npm run build
   ```
2. For Android:
   ```bash
   npm install @capacitor/android
   npx cap add android
   npx cap open android
   ```
   This opens Android Studio, where you build a signed `.aab` file to upload to the
   [Google Play Console](https://play.google.com/console) (one-time $25 registration fee).
3. For iOS:
   ```bash
   npm install @capacitor/ios
   npx cap add ios
   npx cap open ios
   ```
   This opens Xcode (requires a Mac) to build and submit via
   [App Store Connect](https://appstoreconnect.apple.com) (Apple Developer Program,
   $99/year).
4. Both stores will ask for a privacy policy URL, app screenshots, and an app icon
   (icons are already in `public/icon-192.png` and `public/icon-512.png` — swap
   them for your own artwork if you like) — I can help draft the privacy
   policy and store listing copy when you're ready for this stage.

Review typically takes a few days on Google Play and up to a couple of weeks
on the App Store.

---

## Running it locally (optional, for testing before you deploy)

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

Opens at `http://localhost:5173`.

---

## What changed from the Claude.ai version

The app itself (`src/App.jsx`) is unchanged — same registration, savings,
loans, meetings, announcements, constitution and certificate features. The
only difference is `src/lib/storage.js`, which replaces Claude's built-in
`window.storage` with the same-shaped calls to your own Supabase database,
so the app works as a normal, independent website.
