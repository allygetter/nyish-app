# NYISH — Nguumo Young Investors Self-Help Group

A simple, mobile-friendly member management web app built with **React + Vite + Tailwind CSS + Supabase**.

## Features

- Public home page with group intro, login, announcements, and group info
- Member login (email + password via Supabase Auth)
- Member dashboard: profile, contributions, announcements, meetings, activities
- Admin dashboard: manage members, contributions, announcements, meetings, activities
- Role-based access (member / admin) enforced with Supabase Row Level Security

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In your project, open **SQL Editor → New query**, paste the entire contents of
   `supabase/schema.sql`, and click **Run**. This creates all 5 tables
   (`members`, `contributions`, `announcements`, `meetings`, `activities`),
   security policies, and 3 sample placeholder members.
3. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**.

## 2. Configure the app

```bash
cp .env.example .env
```

Edit `.env` and paste in your values:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

## 3. Install and run

```bash
npm install
npm run dev
```

Open the printed local URL (e.g. `http://localhost:5173`).

## 4. Set up your first admin login

The schema seeds a placeholder member row with email `admin@nyish.local` and role `admin`.
To log in as that admin:

1. In the app, go to **Sign Up** and create an account using the email `admin@nyish.local`
   (or first edit that member's email in the database to your real email address).
2. A database trigger automatically links your new login to that member record.
3. Sign in — you'll land on the Member Dashboard with a **"Go to Admin Dashboard"** button.

> Tip: If your Supabase project has "Confirm email" enabled (default), you'll need to confirm
> the sign-up email before logging in, or disable email confirmation for this small-group use
> case under **Authentication → Providers → Email**.

## 5. Add your real ~30 members

From **Admin → Members**, delete the sample placeholder rows and add your real members
(full name, phone, ID number, email, role, date joined). Each member then visits **Sign Up**
using the exact email you registered them with to activate their own login. Members without
an email can still be tracked in the system by an admin, but won't be able to log in themselves
until an email is added.

## 6. Deploy

Build a production bundle:

```bash
npm run build
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, etc.), and set
the same `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as environment variables on that host.

## Project structure

```
src/
  context/AuthContext.jsx    Supabase session + member profile + role
  components/                Shared UI (shell, modal, cards, states)
  pages/                     Home, About, Login, SignUp, public announcements
  pages/member/              Member dashboard and sub-pages
  pages/admin/                Admin dashboard and management screens
supabase/schema.sql          Full database schema + RLS policies
```

## Notes on roles

- **Member**: can view their own profile, contribution history, announcements, meetings, and
  group activities. Read-only.
- **Admin**: everything a member can do, plus full management rights (add/edit/remove members,
  record contributions, post/delete announcements, manage meetings and activities).

Access is enforced at the database level via Supabase Row Level Security — not just hidden in
the UI — so the rules hold even if someone calls the API directly.
