# NYISH — Chama Management PWA

A mobile-first Progressive Web App for managing a chama (savings group): members, savings, loans, meetings, and announcements — built with React, Vite, Tailwind CSS, and Supabase.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a Supabase project at https://supabase.com and run `supabase/schema.sql` in the SQL editor to set up tables, RLS policies, and the avatars storage bucket.

3. Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key:
   ```bash
   cp .env.example .env
   ```

4. Run the dev server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Notes

- The first user to register automatically becomes the approved chairperson/admin. All subsequent registrations are pending until approved by an admin from the Admin page.
- App icons (`icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, `favicon.ico`) are included in `public/` with a placeholder "N" mark in the app's brand colors — swap them out for your own artwork any time.
