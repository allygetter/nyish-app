-- NYISH app data store
-- Run this in the Supabase SQL editor for your project.

create table if not exists nyish_store (
  key   text primary key,
  value text
);

-- Row Level Security ---------------------------------------------------
-- This app is a small closed self-help group tool: every screen already
-- gates who can see/do what by phone+password login inside the React app
-- (see src/App.jsx). Because the anon key is used from the browser, we
-- allow the anon role to read/write this one table, but do NOT expose any
-- other table this way. If you add more tables later, give them their own
-- narrower policies — don't just copy this one.

alter table nyish_store enable row level security;

drop policy if exists "anon can read nyish_store" on nyish_store;
create policy "anon can read nyish_store"
  on nyish_store for select
  to anon
  using (true);

drop policy if exists "anon can write nyish_store" on nyish_store;
create policy "anon can write nyish_store"
  on nyish_store for insert
  to anon
  with check (true);

drop policy if exists "anon can update nyish_store" on nyish_store;
create policy "anon can update nyish_store"
  on nyish_store for update
  to anon
  using (true)
  with check (true);

drop policy if exists "anon can delete nyish_store" on nyish_store;
create policy "anon can delete nyish_store"
  on nyish_store for delete
  to anon
  using (true);

-- Sanity check: after running this, and after fixing VITE_SUPABASE_URL in
-- your .env (see .env.example), registering a member in the app should
-- produce a row here:
--   select * from nyish_store where key = 'members';
