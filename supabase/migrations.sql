-- Migration: add missing columns
-- Run in Supabase SQL Editor

-- 1. subtopic_id en hour_entries (faltaba en el schema original)
alter table hour_entries
  add column if not exists subtopic_id text references client_subtopics(id) on delete set null;

-- 2. owner_id en client_subtopics (por si faltaba)
alter table client_subtopics
  add column if not exists owner_id uuid references auth.users(id);

-- 3. RLS client_subtopics (drop + recreate para asegurar que sean correctas)
alter table client_subtopics enable row level security;

drop policy if exists "select own subtopics" on client_subtopics;
drop policy if exists "insert own subtopics" on client_subtopics;
drop policy if exists "update own subtopics" on client_subtopics;
drop policy if exists "delete own subtopics" on client_subtopics;

create policy "select own subtopics"
  on client_subtopics for select
  using (owner_id in (select id from profiles where user_id = auth.uid()));

create policy "insert own subtopics"
  on client_subtopics for insert
  with check (owner_id in (select id from profiles where user_id = auth.uid()));

create policy "update own subtopics"
  on client_subtopics for update
  using (owner_id in (select id from profiles where user_id = auth.uid()));

create policy "delete own subtopics"
  on client_subtopics for delete
  using (owner_id in (select id from profiles where user_id = auth.uid()));
