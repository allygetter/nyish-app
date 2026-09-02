-- ============================================================
-- NYISH (Nguumo Young Investors Self-Help Group) — Database Schema
-- Run this whole file once in the Supabase SQL Editor
-- (Project → SQL Editor → New query → paste → Run)
-- ============================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. MEMBERS
-- ------------------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  phone_number text not null,
  id_number text not null unique,
  email text unique,
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  date_joined date not null default current_date,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. CONTRIBUTIONS
-- ------------------------------------------------------------
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  date_paid date not null default current_date,
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'M-Pesa', 'Bank Transfer', 'Other')),
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. ANNOUNCEMENTS
-- ------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. MEETINGS
-- ------------------------------------------------------------
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date date not null,
  meeting_time time,
  location text,
  description text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. ACTIVITIES
-- ------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  activity_date date not null default current_date,
  status text not null default 'Planned' check (status in ('Planned', 'Ongoing', 'Completed', 'Cancelled')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Helper: is the currently-authenticated user an active admin?
-- SECURITY DEFINER lets this bypass RLS internally, avoiding
-- infinite-recursion issues in the members policies below.
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

-- ------------------------------------------------------------
-- Helper: the members.id row belonging to the current user
-- ------------------------------------------------------------
create or replace function public.current_member_id()
returns uuid
language sql
security definer
stable
as $$
  select id from public.members where user_id = auth.uid();
$$;

-- ------------------------------------------------------------
-- Auto-link a member row to their new auth account on signup,
-- matched by email (case-insensitive). Admin must have already
-- created the member record with a matching email.
-- ------------------------------------------------------------
create or replace function public.link_member_on_signup()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.members
  set user_id = new.id
  where lower(email) = lower(new.email)
    and user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.link_member_on_signup();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.members enable row level security;
alter table public.contributions enable row level security;
alter table public.announcements enable row level security;
alter table public.meetings enable row level security;
alter table public.activities enable row level security;

-- MEMBERS: a member can read their own row; admins read/write all
create policy "members_select_self_or_admin" on public.members
  for select using (user_id = auth.uid() or public.is_admin());

create policy "members_insert_admin" on public.members
  for insert with check (public.is_admin());

create policy "members_update_admin" on public.members
  for update using (public.is_admin());

create policy "members_delete_admin" on public.members
  for delete using (public.is_admin());

-- CONTRIBUTIONS: a member can read their own payments; admins read/write all
create policy "contributions_select_self_or_admin" on public.contributions
  for select using (member_id = public.current_member_id() or public.is_admin());

create policy "contributions_write_admin" on public.contributions
  for insert with check (public.is_admin());

create policy "contributions_update_admin" on public.contributions
  for update using (public.is_admin());

create policy "contributions_delete_admin" on public.contributions
  for delete using (public.is_admin());

-- ANNOUNCEMENTS: public read (even logged-out visitors), admin write
create policy "announcements_select_public" on public.announcements
  for select using (true);

create policy "announcements_write_admin" on public.announcements
  for insert with check (public.is_admin());

create policy "announcements_delete_admin" on public.announcements
  for delete using (public.is_admin());

-- MEETINGS: public read, admin write
create policy "meetings_select_public" on public.meetings
  for select using (true);

create policy "meetings_write_admin" on public.meetings
  for insert with check (public.is_admin());

create policy "meetings_update_admin" on public.meetings
  for update using (public.is_admin());

create policy "meetings_delete_admin" on public.meetings
  for delete using (public.is_admin());

-- ACTIVITIES: public read, admin write
create policy "activities_select_public" on public.activities
  for select using (true);

create policy "activities_write_admin" on public.activities
  for insert with check (public.is_admin());

create policy "activities_update_admin" on public.activities
  for update using (public.is_admin());

create policy "activities_delete_admin" on public.activities
  for delete using (public.is_admin());

-- ------------------------------------------------------------
-- Seed: sample placeholder members so the group can see the
-- system in action immediately. Replace/delete these from the
-- Admin → Members screen once real members are added.
-- (No real personal data is used here — replace with real
-- members via the Admin dashboard.)
-- ------------------------------------------------------------
insert into public.members (full_name, phone_number, id_number, email, role, status, date_joined)
values
  ('Group Administrator', '0700000000', '00000001', 'admin@nyish.local', 'admin', 'active', current_date),
  ('Sample Member One', '0711111111', '00000002', 'member1@nyish.local', 'member', 'active', current_date),
  ('Sample Member Two', '0722222222', '00000003', 'member2@nyish.local', 'member', 'active', current_date)
on conflict (id_number) do nothing;
