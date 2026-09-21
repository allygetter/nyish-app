-- ============================================================
-- NYISH App — Complete database schema
-- Run this in Supabase → SQL Editor → New query
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS
-- ============================================================

-- ─── Core tables ─────────────────────────────────────────────

create table if not exists nyish_store (
  key   text primary key,
  value text
);

create table if not exists members (
  id                uuid primary key references auth.users(id) on delete cascade,
  name              text not null,
  phone             text,
  email             text not null,
  id_number         text,
  kra_pin           text,
  role              text not null default 'member'
                    check (role in ('member','chair','treasurer','secretary')),
  status            text not null default 'pending'
                    check (status in ('pending','active')),
  join_date         date not null default current_date,
  photo             text,
  next_of_kin       text,
  next_of_kin_phone text,
  congratulated     boolean not null default false,
  onboarded         boolean not null default false,
  created_at        timestamptz not null default now()
);

create table if not exists savings (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  date        date not null default current_date,
  note        text,
  recorded_by uuid references members(id),
  source      text not null default 'manual' check (source in ('manual','mpesa')),
  created_at  timestamptz not null default now()
);

create table if not exists loans (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references members(id) on delete cascade,
  amount          numeric(12,2) not null check (amount > 0),
  purpose         text not null,
  status          text not null default 'pending'
                  check (status in ('pending','approved','active','rejected','repaid')),
  date_requested  date not null default current_date,
  date_approved   date,
  balance         numeric(12,2),
  repayments      jsonb not null default '[]',
  approvals       jsonb not null default '[]',
  interest_rate   numeric(5,2),
  interest_amount numeric(12,2),
  total_due       numeric(12,2),
  created_at      timestamptz not null default now()
);

create table if not exists meetings (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  agenda     text not null,
  minutes    text,
  attendance jsonb not null default '[]',
  created_by uuid references members(id),
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  image      text,
  date       date not null default current_date,
  posted_by  uuid references members(id),
  created_at timestamptz not null default now()
);

create table if not exists fines (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  reason      text,
  date        date not null default current_date,
  status      text not null default 'unpaid' check (status in ('unpaid','paid')),
  paid_date   date,
  recorded_by uuid references members(id),
  created_at  timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────
create index if not exists savings_member_idx  on savings(member_id);
create index if not exists savings_date_idx    on savings(date desc);
create index if not exists loans_member_idx    on loans(member_id);
create index if not exists loans_status_idx    on loans(status);
create index if not exists fines_member_idx    on fines(member_id);
create index if not exists members_status_idx  on members(status);
create index if not exists meetings_date_idx   on meetings(date desc);

-- ─── Enable RLS on every table ────────────────────────────────
alter table members       enable row level security;
alter table savings       enable row level security;
alter table loans         enable row level security;
alter table meetings      enable row level security;
alter table announcements enable row level security;
alter table fines         enable row level security;
alter table nyish_store   enable row level security;

-- ─── Drop all old policies (safe re-run) ──────────────────────
do $$ declare r record; begin
  for r in (select policyname, tablename from pg_policies
            where schemaname = 'public'
            and tablename in ('members','savings','loans','meetings',
                              'announcements','fines','nyish_store'))
  loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- ─── Helper: check if the calling user is an active official ──
-- Used inside RLS policies so the logic lives in one place.
create or replace function nyish_is_official()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from members
    where id = auth.uid()
    and   status = 'active'
    and   role in ('chair','treasurer','secretary')
  );
$$;

create or replace function nyish_is_chair()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from members
    where id = auth.uid()
    and   status = 'active'
    and   role = 'chair'
  );
$$;

-- ─── RLS policies: authenticated users only ───────────────────
-- The anon role (unauthenticated) has NO access to any table.
-- Every request must come from a signed-in Supabase Auth session.

-- members
-- Any authenticated user can read all active members (for member lists,
-- savings display, etc.). Only the member themselves can update their own
-- row (profile changes). Insert is allowed so signup can create the row;
-- delete is chair-only via the app (not enforced at DB level here since
-- "soft delete" via status change is preferred).
create policy "members_select" on members
  for select to authenticated using (true);

create policy "members_insert_own" on members
  for insert to authenticated
  with check (id = auth.uid());

create policy "members_update_own" on members
  for update to authenticated
  using (id = auth.uid() or nyish_is_chair())
  with check (id = auth.uid() or nyish_is_chair());

create policy "members_delete_chair" on members
  for delete to authenticated using (nyish_is_chair());

-- savings
-- Any active member can read all savings (transparency).
-- Chair or Treasurer can insert (record contributions).
-- Members can insert their own M-PESA-triggered entries (source = 'mpesa').
create policy "savings_select" on savings
  for select to authenticated
  using (exists (select 1 from members where id = auth.uid() and status = 'active'));

create policy "savings_insert" on savings
  for insert to authenticated
  with check (
    nyish_is_official()
    or (member_id = auth.uid() and source = 'mpesa')
  );

-- loans
-- Active members can read all loans (transparency).
-- Any active member can insert their own loan request.
-- Only officials can update (approve/reject/repay).
create policy "loans_select" on loans
  for select to authenticated
  using (exists (select 1 from members where id = auth.uid() and status = 'active'));

create policy "loans_insert" on loans
  for insert to authenticated
  with check (
    member_id = auth.uid()
    and exists (select 1 from members where id = auth.uid() and status = 'active')
  );

create policy "loans_update" on loans
  for update to authenticated using (nyish_is_official());

-- meetings
-- All active members can read meetings.
-- Only secretary (or chair if no secretary) can insert.
create policy "meetings_select" on meetings
  for select to authenticated
  using (exists (select 1 from members where id = auth.uid() and status = 'active'));

create policy "meetings_insert" on meetings
  for insert to authenticated
  with check (nyish_is_official());

-- announcements
-- All active members can read.
-- Only chair can insert.
create policy "announcements_select" on announcements
  for select to authenticated
  using (exists (select 1 from members where id = auth.uid() and status = 'active'));

create policy "announcements_insert" on announcements
  for insert to authenticated
  with check (nyish_is_chair());

-- fines
-- All active members can read their own fines; officials see all.
create policy "fines_select" on fines
  for select to authenticated
  using (
    member_id = auth.uid()
    or nyish_is_official()
  );

create policy "fines_insert" on fines
  for insert to authenticated
  with check (nyish_is_chair());

create policy "fines_update" on fines
  for update to authenticated using (nyish_is_chair());

-- nyish_store (constitution, rotation config)
-- All active members can read.
-- Only officials can write.
create policy "store_select" on nyish_store
  for select to authenticated
  using (exists (select 1 from members where id = auth.uid() and status = 'active'));

create policy "store_upsert" on nyish_store
  for insert to authenticated
  with check (nyish_is_official());

create policy "store_update" on nyish_store
  for update to authenticated using (nyish_is_official());

-- ─── Supabase Auth settings reminder ─────────────────────────
-- Run this separately ONLY if you want to confirm email is off in SQL:
--   update auth.config set value = 'false'
--   where parameter = 'MAILER_AUTOCONFIRM';
-- Easier: Supabase dashboard → Authentication → Settings →
--   "Enable email confirmations" toggle → OFF (for development).
--   Turn it ON again when you restore OTP.
