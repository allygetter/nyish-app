-- Enable RLS
alter table if exists profiles enable row level security;
alter table if exists contributions enable row level security;
alter table if exists loans enable row level security;
alter table if exists repayments enable row level security;
alter table if exists meetings enable row level security;
alter table if exists attendance enable row level security;
alter table if exists announcements enable row level security;

-- Profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text unique not null,
  phone text,
  photo_url text,
  role text default 'member' check (role in ('chairperson', 'secretary', 'treasurer', 'member')),
  is_admin boolean default false,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- Contributions table
create table if not exists contributions (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references profiles(id) on delete cascade not null,
  amount numeric not null,
  date date not null,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Loans table
create table if not exists loans (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references profiles(id) on delete cascade not null,
  amount numeric not null,
  interest numeric default 0,
  due_date date,
  status text default 'active' check (status in ('active', 'paid', 'defaulted')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Repayments table
create table if not exists repayments (
  id uuid default gen_random_uuid() primary key,
  loan_id uuid references loans(id) on delete cascade not null,
  amount numeric not null,
  payment_date date default current_date
);

-- Meetings table
create table if not exists meetings (
  id uuid default gen_random_uuid() primary key,
  date timestamptz not null,
  venue text not null,
  agenda text not null,
  notes text,
  created_at timestamptz default now()
);

-- Attendance table
create table if not exists attendance (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references meetings(id) on delete cascade not null,
  member_id uuid references profiles(id) on delete cascade not null,
  present boolean default false,
  unique(meeting_id, member_id)
);

-- Announcements table
create table if not exists announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- RLS Policies

-- Profiles: users can read approved profiles
create policy "Profiles are viewable by everyone" 
  on profiles for select using (status = 'approved');

-- Profiles: users can update own profile
create policy "Users can update own profile" 
  on profiles for update using (auth.uid() = id);

-- Profiles: admin can do everything
create policy "Admin full access" 
  on profiles for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Contributions: viewable by all approved members
create policy "Contributions viewable by approved" 
  on contributions for select using (
    exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  );

-- Contributions: insert by admin/treasurer
create policy "Contributions insert by admin or treasurer" 
  on contributions for insert with check (
    exists (select 1 from profiles where id = auth.uid() and (is_admin = true or role = 'treasurer'))
  );

-- Loans: viewable by all approved
create policy "Loans viewable by approved" 
  on loans for select using (
    exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  );

-- Loans: insert by treasurer
create policy "Loans insert by treasurer" 
  on loans for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'treasurer')
  );

-- Repayments: viewable by all approved
create policy "Repayments viewable by approved" 
  on repayments for select using (
    exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  );

-- Meetings: viewable by all approved
create policy "Meetings viewable by approved" 
  on meetings for select using (
    exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  );

-- Meetings: insert by secretary/admin
create policy "Meetings insert by secretary or admin" 
  on meetings for insert with check (
    exists (select 1 from profiles where id = auth.uid() and (is_admin = true or role = 'secretary'))
  );

-- Attendance: viewable by all approved
create policy "Attendance viewable by approved" 
  on attendance for select using (
    exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  );

-- Attendance: update by secretary/admin
create policy "Attendance update by secretary or admin" 
  on attendance for update using (
    exists (select 1 from profiles where id = auth.uid() and (is_admin = true or role = 'secretary'))
  );

-- Announcements: viewable by all approved
create policy "Announcements viewable by approved" 
  on announcements for select using (
    exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  );

-- Announcements: insert by secretary/admin
create policy "Announcements insert by secretary or admin" 
  on announcements for insert with check (
    exists (select 1 from profiles where id = auth.uid() and (is_admin = true or role = 'secretary'))
  );

-- Storage bucket for avatars
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true) 
on conflict do nothing;

-- Storage policy for avatars
create policy "Avatar images are publicly accessible"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Users can upload own avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
