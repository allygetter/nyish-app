-- ============================================================
-- NYISH — Chama / Savings Group Management
-- Supabase PostgreSQL Schema + RLS + Triggers
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_number TEXT NOT NULL,
  kra_pin TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('chair','treasurer','secretary','member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','rejected')),
  join_date TIMESTAMPTZ DEFAULT NOW(),
  photo TEXT,
  next_of_kin TEXT,
  next_of_kin_phone TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  congratulated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS savings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  recorded_by UUID REFERENCES members(id),
  source TEXT DEFAULT 'cash' CHECK (source IN ('cash','mpesa','bank')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','repaid')),
  date_requested TIMESTAMPTZ DEFAULT NOW(),
  date_approved TIMESTAMPTZ,
  balance NUMERIC(12,2),
  repayments JSONB DEFAULT '[]'::jsonb,
  approvals JSONB DEFAULT '[]'::jsonb,
  interest_rate NUMERIC(5,2) DEFAULT 10.00,
  interest_amount NUMERIC(12,2) DEFAULT 0,
  total_due NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  agenda TEXT NOT NULL,
  minutes TEXT,
  attendance JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  posted_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid')),
  paid_date TIMESTAMPTZ,
  recorded_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nyish_store (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES members(id)
);

-- Seed constitution and rotation
INSERT INTO nyish_store (key, value) VALUES
  ('constitution', '{"text": "1. Name: This group shall be known as NYISH Chama.\n2. Objective: To promote savings, mutual assistance, and financial growth among members.\n3. Membership: Open to adults of good standing.\n4. Contributions: Each member shall contribute as agreed in meetings.\n5. Loans: Subject to approval by Chair and Treasurer. Interest rate as set by the group.\n6. Meetings: Held monthly or as called by the Chair.\n7. Fines: For lateness, absence without apology, or misconduct.\n8. Amendments: By majority vote at a quorate meeting."}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO nyish_store (key, value) VALUES
  ('rotation', '{"order": [], "current_index": 0}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE nyish_store ENABLE ROW LEVEL SECURITY;

-- Members: everyone can read active members; own row always; chair can all
CREATE POLICY "members_select" ON members
  FOR SELECT TO authenticated
  USING (status = 'active' OR id = auth.uid() OR EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role = 'chair'
  ));

CREATE POLICY "members_insert" ON members
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "members_update" ON members
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role = 'chair'
  ));

CREATE POLICY "members_delete" ON members
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role = 'chair'
  ));

-- Savings: read own or all if chair/treasurer; insert own or chair/treasurer on behalf
CREATE POLICY "savings_select" ON savings
  FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role IN ('chair','treasurer')
  ));

CREATE POLICY "savings_insert" ON savings
  FOR INSERT TO authenticated
  WITH CHECK (member_id = auth.uid() OR EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role IN ('chair','treasurer')
  ));

-- Loans: read own or all officials; insert own; update chair/treasurer
CREATE POLICY "loans_select" ON loans
  FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role IN ('chair','treasurer','secretary')
  ));

CREATE POLICY "loans_insert" ON loans
  FOR INSERT TO authenticated
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "loans_update" ON loans
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role IN ('chair','treasurer')
  ));

-- Meetings: everyone read; insert chair/secretary
CREATE POLICY "meetings_select" ON meetings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "meetings_insert" ON meetings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role IN ('chair','secretary')
  ));

-- Announcements: everyone read; insert chair only
CREATE POLICY "announcements_select" ON announcements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "announcements_insert" ON announcements
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role = 'chair'
  ));

-- Fines: read own or officials; insert chair only; update chair/treasurer (mark paid)
CREATE POLICY "fines_select" ON fines
  FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role IN ('chair','treasurer','secretary')
  ));

CREATE POLICY "fines_insert" ON fines
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role = 'chair'
  ));

CREATE POLICY "fines_update" ON fines
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role IN ('chair','treasurer')
  ));

-- nyish_store: everyone read; update chair only
CREATE POLICY "store_select" ON nyish_store
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "store_update" ON nyish_store
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND role = 'chair'
  ));

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- 1. Auto-create member row on auth.user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INT;
  assigned_role TEXT;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM members WHERE status = 'active';

  IF existing_count = 0 THEN
    assigned_role := 'chair';
  ELSE
    assigned_role := 'member';
  END IF;

  INSERT INTO public.members (id, name, phone, id_number, kra_pin, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'id_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'kra_pin', ''),
    NEW.email,
    assigned_role,
    CASE WHEN assigned_role = 'chair' THEN 'active' ELSE 'pending' END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Guard: prevent self-role-escalation or self-status-change
CREATE OR REPLACE FUNCTION public.guard_member_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id = auth.uid() AND (NEW.role != OLD.role OR NEW.status != OLD.status) THEN
    RAISE EXCEPTION 'Members cannot change their own role or status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS guard_member_update ON members;
CREATE TRIGGER guard_member_update
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION public.guard_member_updates();

-- 3. Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS members_updated_at ON members;
CREATE TRIGGER members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS loans_updated_at ON loans;
CREATE TRIGGER loans_updated_at BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Loan approval: compute interest & total_due
CREATE OR REPLACE FUNCTION public.compute_loan_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    NEW.interest_amount := ROUND(NEW.amount * (NEW.interest_rate / 100), 2);
    NEW.total_due := NEW.amount + NEW.interest_amount;
    NEW.balance := NEW.total_due;
    NEW.date_approved := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS loan_approval_compute ON loans;
CREATE TRIGGER loan_approval_compute
  BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION public.compute_loan_totals();

-- 5. Fine paid: set paid_date
CREATE OR REPLACE FUNCTION public.fine_paid_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status = 'unpaid' THEN
    NEW.paid_date := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fine_paid_trigger ON fines;
CREATE TRIGGER fine_paid_trigger
  BEFORE UPDATE ON fines
  FOR EACH ROW EXECUTE FUNCTION public.fine_paid_date();

-- 6. Welcome notification on approval
CREATE OR REPLACE FUNCTION public.notify_member_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status = 'pending' AND NEW.congratulated = FALSE THEN
    -- In production, call edge function or webhook here
    NEW.congratulated := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS member_approved_notify ON members;
CREATE TRIGGER member_approved_notify
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION public.notify_member_approved();

-- 7. Ensure rotation order stays synced with active members
CREATE OR REPLACE FUNCTION public.sync_rotation_members()
RETURNS TRIGGER AS $$
DECLARE
  rot JSONB;
  new_order JSONB;
BEGIN
  IF NEW.status = 'active' AND OLD.status = 'pending' THEN
    SELECT value INTO rot FROM nyish_store WHERE key = 'rotation';
    new_order := COALESCE(rot->'order', '[]'::jsonb) || to_jsonb(NEW.id);
    UPDATE nyish_store SET value = jsonb_set(rot, '{order}', new_order) WHERE key = 'rotation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_rotation_on_approval ON members;
CREATE TRIGGER sync_rotation_on_approval
  AFTER UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION public.sync_rotation_members();
