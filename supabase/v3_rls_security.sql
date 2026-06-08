-- ============================================================
-- V3 SECURITY — Enable RLS on all public tables
-- Run in Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles
--    Users can only read/update their own profile.
-- ------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own profile"  ON profiles;
DROP POLICY IF EXISTS "insert own profile"  ON profiles;
DROP POLICY IF EXISTS "update own profile"  ON profiles;

CREATE POLICY "select own profile" ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "insert own profile" ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "update own profile" ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- 2. clients
-- ------------------------------------------------------------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own clients"  ON clients;
DROP POLICY IF EXISTS "insert own clients"  ON clients;
DROP POLICY IF EXISTS "update own clients"  ON clients;
DROP POLICY IF EXISTS "delete own clients"  ON clients;

CREATE POLICY "select own clients" ON clients FOR SELECT
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "insert own clients" ON clients FOR INSERT
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "update own clients" ON clients FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "delete own clients" ON clients FOR DELETE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ------------------------------------------------------------
-- 3. hour_entries
-- ------------------------------------------------------------
ALTER TABLE hour_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own hour_entries"  ON hour_entries;
DROP POLICY IF EXISTS "insert own hour_entries"  ON hour_entries;
DROP POLICY IF EXISTS "update own hour_entries"  ON hour_entries;
DROP POLICY IF EXISTS "delete own hour_entries"  ON hour_entries;

CREATE POLICY "select own hour_entries" ON hour_entries FOR SELECT
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "insert own hour_entries" ON hour_entries FOR INSERT
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "update own hour_entries" ON hour_entries FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "delete own hour_entries" ON hour_entries FOR DELETE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ------------------------------------------------------------
-- 4. tasks
-- ------------------------------------------------------------
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own tasks"  ON tasks;
DROP POLICY IF EXISTS "insert own tasks"  ON tasks;
DROP POLICY IF EXISTS "update own tasks"  ON tasks;
DROP POLICY IF EXISTS "delete own tasks"  ON tasks;

CREATE POLICY "select own tasks" ON tasks FOR SELECT
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "insert own tasks" ON tasks FOR INSERT
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "update own tasks" ON tasks FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "delete own tasks" ON tasks FOR DELETE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ------------------------------------------------------------
-- 5. recur_defs (recurring task definitions)
-- ------------------------------------------------------------
ALTER TABLE recur_defs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own recur_defs"  ON recur_defs;
DROP POLICY IF EXISTS "insert own recur_defs"  ON recur_defs;
DROP POLICY IF EXISTS "update own recur_defs"  ON recur_defs;
DROP POLICY IF EXISTS "delete own recur_defs"  ON recur_defs;

CREATE POLICY "select own recur_defs" ON recur_defs FOR SELECT
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "insert own recur_defs" ON recur_defs FOR INSERT
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "update own recur_defs" ON recur_defs FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "delete own recur_defs" ON recur_defs FOR DELETE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ------------------------------------------------------------
-- 6. client_topics (legacy table, lock it down)
-- ------------------------------------------------------------
ALTER TABLE client_topics ENABLE ROW LEVEL SECURITY;

-- No policies = nobody can access (table is unused by the app)

-- ------------------------------------------------------------
-- Verify: run this query after applying to confirm all tables
-- have RLS enabled:
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- ------------------------------------------------------------
