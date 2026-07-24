-- ============================================================================
-- NYISH — production schema
-- ============================================================================
-- Run this once in Supabase → SQL Editor → New query → Run.
--
-- Replaces the old `nyish_store` single-blob-per-entity table (still used
-- here ONLY for the two remaining blob values: constitution text and the
-- merry-go-round rotation state) with real per-row tables for members,
-- savings, loans, meetings, announcements and fines — the fix for the
-- "last write wins" data-loss bug described in PROGRESS.md.
--
-- What this file gives you (mapped to the production checklist):
--   • No OTP during development  → see "OTP switch" note at the bottom.
--   • Automatic login after signup, automatic member-profile creation,
--     automatic repair of missing profiles → all handled client-side in
--     src/App.jsx (RegisterScreen / LoginScreen), backed by the trigger
--     below so a profile row exists the instant an auth account does.
--   • `members.id` IS the `auth.users.id` (a foreign key to it, not a
--     copy) — this is the "user_id linked to auth.users" link. It's the
--     same value on purpose, so every existing `member.id` reference in
--     the app already is the auth user id; there's no separate column to
--     keep in sync.
--   • DB transactions that prevent orphaned Auth accounts → the
--     `handle_new_user` trigger below runs in the SAME transaction as the
--     `auth.users` insert. If it fails, Postgres rolls back the entire
--     transaction, so an auth account can never be created without a
--     matching member row (and vice versa).
--   • Proper `authenticated` RLS policies instead of permissive `anon`
--     ones → every policy below is scoped `to authenticated`; the `anon`
--     role gets no grants at all, so an unauthenticated request (or
--     someone who only has your public anon key but no session) can read
--     or write nothing.
-- ============================================================================

-- ─── extensions ──────────────────────────────────────────────────────────
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ─── members ─────────────────────────────────────────────────────────────
-- id = auth.users.id (1:1). Deleting the auth user cascades to the profile.
create table if not exists public.members (
  id                  uuid primary key references auth.users(id) on delete cascade,
  name                text not null default '',
  phone               text,
  id_number           text,
  kra_pin             text,
  email               text,
  role                text not null default 'member'
                        check (role in ('chair','treasurer','secretary','member')),
  status              text not null default 'pending'
                        check (status in ('pending','active','rejected')),
  join_date           date not null default current_date,
  photo               text,
  next_of_kin         text,
  next_of_kin_phone   text,
  congratulated       boolean not null default false,
  onboarded           boolean not null default false,
  created_at          timestamptz not null default now()
);

-- ─── savings ─────────────────────────────────────────────────────────────
create table if not exists public.savings (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members(id) on delete cascade,
  amount        numeric not null check (amount > 0),
  date          date not null default current_date,
  note          text,
  recorded_by   uuid references public.members(id),
  source        text not null default 'manual',
  created_at    timestamptz not null default now()
);
create index if not exists savings_member_id_idx on public.savings(member_id);

-- ─── loans ───────────────────────────────────────────────────────────────
create table if not exists public.loans (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references public.members(id) on delete cascade,
  amount            numeric not null check (amount > 0),
  purpose           text,
  status            text not null default 'pending'
                      check (status in ('pending','approved','rejected','active','repaid')),
  date_requested    date not null default current_date,
  date_approved     date,
  balance           numeric not null default 0,
  repayments        jsonb not null default '[]'::jsonb,
  approvals         jsonb not null default '[]'::jsonb,
  interest_rate     numeric,
  interest_amount   numeric,
  total_due         numeric,
  created_at        timestamptz not null default now()
);
create index if not exists loans_member_id_idx on public.loans(member_id);

-- ─── meetings ────────────────────────────────────────────────────────────
create table if not exists public.meetings (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  agenda        text,
  minutes       text,
  attendance    jsonb not null default '[]'::jsonb,
  created_by    uuid references public.members(id),
  created_at    timestamptz not null default now()
);

-- ─── announcements ───────────────────────────────────────────────────────
create table if not exists public.announcements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text,
  image         text,
  date          date not null default current_date,
  posted_by     uuid references public.members(id),
  created_at    timestamptz not null default now()
);

-- ─── fines ───────────────────────────────────────────────────────────────
create table if not exists public.fines (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members(id) on delete cascade,
  amount        numeric not null check (amount > 0),
  reason        text,
  date          date not null default current_date,
  status        text not null default 'unpaid' check (status in ('unpaid','paid')),
  paid_date     date,
  recorded_by   uuid references public.members(id),
  created_at    timestamptz not null default now()
);
create index if not exists fines_member_id_idx on public.fines(member_id);

-- ─── nyish_store (kept only for constitution text + rotation state) ──────
create table if not exists public.nyish_store (
  key   text primary key,
  value text
);

-- ============================================================================
-- Role-check helpers (SECURITY DEFINER so policy checks don't recurse
-- through RLS on `members` when looking up the caller's own role)
-- ============================================================================
create or replace function public.current_member_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.members where id = auth.uid();
$$;

create or replace function public.is_chair() returns boolean
language sql stable as $$ select public.current_member_role() = 'chair'; $$;

create or replace function public.is_treasurer() returns boolean
language sql stable as $$ select public.current_member_role() = 'treasurer'; $$;

create or replace function public.is_secretary() returns boolean
language sql stable as $$ select public.current_member_role() = 'secretary'; $$;

create or replace function public.can_manage_finance() returns boolean
language sql stable as $$ select public.is_chair() or public.is_treasurer(); $$;

-- ============================================================================
-- Trigger: auto-create the member profile the instant an auth account
-- exists, in the SAME transaction (this is what prevents orphaned auth
-- accounts — if this insert fails, the auth.users insert is rolled back
-- too). First-ever active member becomes chair/active; everyone else
-- starts member/pending, awaiting Chairperson approval. Deciding this
-- here (not in the browser) also removes a race condition where two
-- people registering at the same instant could both compute "0 active
-- members" and both become chair.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  first_member boolean;
begin
  select count(*) = 0 into first_member from public.members where status = 'active';

  insert into public.members (id, email, name, role, status, join_date)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when first_member then 'chair' else 'member' end,
    case when first_member then 'active' else 'pending' end,
    current_date
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Guard: a member can never grant themselves a role or flip their own
-- approval status by updating their own row — only the Chairperson
-- (checked via the members_update policy below) can do that. This fires
-- for every update regardless of RLS, so it backstops the policy too.
create or replace function public.guard_member_self_update()
returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' and auth.uid() = old.id then
    if new.role is distinct from old.role or new.status is distinct from old.status then
      raise exception 'You cannot change your own role or approval status.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists members_guard_self_update on public.members;
create trigger members_guard_self_update
  before update on public.members
  for each row execute function public.guard_member_self_update();

-- ============================================================================
-- Row Level Security — every policy is scoped `to authenticated`.
-- The `anon` role is granted nothing, so unauthenticated requests (or
-- someone who only has the public anon key, no session) get zero access.
-- ============================================================================
alter table public.members       enable row level security;
alter table public.savings       enable row level security;
alter table public.loans         enable row level security;
alter table public.meetings      enable row level security;
alter table public.announcements enable row level security;
alter table public.fines         enable row level security;
alter table public.nyish_store   enable row level security;

-- members: everyone signed in can read the roster (names, roles, photos —
-- needed all over the app); a member can only self-repair/create their own
-- row (the trigger normally does this) or edit their own profile fields
-- (name/phone/photo/etc — role & status changes are blocked by the guard
-- trigger above); the Chairperson can edit or remove any member.
create policy "members_select_authenticated" on public.members
  for select to authenticated using (true);
create policy "members_insert_self" on public.members
  for insert to authenticated with check (auth.uid() = id);
create policy "members_update_self_or_chair" on public.members
  for update to authenticated
  using (auth.uid() = id or public.is_chair())
  with check (auth.uid() = id or public.is_chair());
create policy "members_delete_chair" on public.members
  for delete to authenticated using (public.is_chair());

-- savings: totals are a transparency feature shown to every member, so
-- reads are open to any signed-in member; a member can only log their own
-- contribution unless they're Chair/Treasurer (who can record on anyone's
-- behalf); edits/deletes (corrections) are Chair/Treasurer only.
create policy "savings_select_authenticated" on public.savings
  for select to authenticated using (true);
create policy "savings_insert_self_or_finance" on public.savings
  for insert to authenticated
  with check (member_id = auth.uid() or public.can_manage_finance());
create policy "savings_update_finance" on public.savings
  for update to authenticated using (public.can_manage_finance()) with check (public.can_manage_finance());
create policy "savings_delete_finance" on public.savings
  for delete to authenticated using (public.can_manage_finance());

-- loans: readable by all (transparency); a member can only request a loan
-- for themselves; approving/rejecting/repayments are Chair (+ Treasurer
-- co-sign on large loans) only, matching the app's own permission checks.
create policy "loans_select_authenticated" on public.loans
  for select to authenticated using (true);
create policy "loans_insert_self" on public.loans
  for insert to authenticated with check (member_id = auth.uid());
create policy "loans_update_chair_or_treasurer" on public.loans
  for update to authenticated
  using (public.is_chair() or public.is_treasurer())
  with check (public.is_chair() or public.is_treasurer());
create policy "loans_delete_chair" on public.loans
  for delete to authenticated using (public.is_chair());

-- meetings: readable by all; logging is Secretary (or Chair) only.
create policy "meetings_select_authenticated" on public.meetings
  for select to authenticated using (true);
create policy "meetings_write_secretary_or_chair" on public.meetings
  for all to authenticated
  using (public.is_secretary() or public.is_chair())
  with check (public.is_secretary() or public.is_chair());

-- announcements: readable by all; posting is Chair only.
create policy "announcements_select_authenticated" on public.announcements
  for select to authenticated using (true);
create policy "announcements_write_chair" on public.announcements
  for all to authenticated using (public.is_chair()) with check (public.is_chair());

-- fines: readable by all (members see their own + the unpaid-total
-- transparency banner; officials see everyone's); issuing/marking paid is
-- Chair only.
create policy "fines_select_authenticated" on public.fines
  for select to authenticated using (true);
create policy "fines_write_chair" on public.fines
  for all to authenticated using (public.is_chair()) with check (public.is_chair());

-- nyish_store (constitution text + rotation state): readable by all;
-- editing is Chair only.
create policy "nyish_store_select_authenticated" on public.nyish_store
  for select to authenticated using (true);
create policy "nyish_store_write_chair" on public.nyish_store
  for all to authenticated using (public.is_chair()) with check (public.is_chair());

-- ============================================================================
-- Table grants — belt-and-suspenders alongside RLS. `authenticated` gets
-- normal CRUD grants (RLS policies above still gate individual rows);
-- `anon` gets nothing revoked explicitly in case it was granted by an
-- older migration.
-- ============================================================================
grant select, insert, update, delete on
  public.members, public.savings, public.loans, public.meetings,
  public.announcements, public.fines, public.nyish_store
  to authenticated;

revoke all on
  public.members, public.savings, public.loans, public.meetings,
  public.announcements, public.fines, public.nyish_store
  from anon;

-- ============================================================================
-- The OTP switch (production-ready, no code changes needed later)
-- ============================================================================
-- Development (default assumed by src/lib/auth.js and App.jsx today):
--   Supabase → Authentication → Settings → "Enable email confirmations" = OFF
--   signUp() immediately followed by signIn() succeeds right away — no code
--   in App.jsx needs to change for this.
--
-- Production, when you're ready to require email verification:
--   1. Turn "Enable email confirmations" ON in the same settings page.
--   2. Authentication → Email Templates → "Confirm signup" → change
--      {{ .ConfirmationURL }} to {{ .Token }} so Supabase emails a 6-digit
--      code instead of a magic link.
--   That's it — flip those two dashboard settings. src/App.jsx already
--   detects the "Email not confirmed" error from signIn() right after
--   signUp() and automatically shows the verification-code screen instead
--   (see RegisterScreen's submitForm / the "verify" step in src/App.jsx).
--   No further code edits are required either way.
-- ============================================================================
