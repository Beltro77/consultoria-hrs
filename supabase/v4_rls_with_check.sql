-- ============================================================
-- V4 — Add WITH CHECK to all UPDATE RLS policies
-- Prevents owner_id field tampering after update
-- Run in Supabase SQL Editor
-- ============================================================

-- profiles
DROP POLICY IF EXISTS "update own profile" ON profiles;
CREATE POLICY "update own profile" ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- clients
DROP POLICY IF EXISTS "update own clients" ON clients;
CREATE POLICY "update own clients" ON clients FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- hour_entries
DROP POLICY IF EXISTS "update own hour_entries" ON hour_entries;
CREATE POLICY "update own hour_entries" ON hour_entries FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- tasks
DROP POLICY IF EXISTS "update own tasks" ON tasks;
CREATE POLICY "update own tasks" ON tasks FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- recur_defs
DROP POLICY IF EXISTS "update own recur_defs" ON recur_defs;
CREATE POLICY "update own recur_defs" ON recur_defs FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- client_subtopics
DROP POLICY IF EXISTS "update own subtopics" ON client_subtopics;
CREATE POLICY "update own subtopics" ON client_subtopics FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- client_interactions
DROP POLICY IF EXISTS "update own interactions" ON client_interactions;
CREATE POLICY "update own interactions" ON client_interactions FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ideas
DROP POLICY IF EXISTS "update own ideas" ON ideas;
CREATE POLICY "update own ideas" ON ideas FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
