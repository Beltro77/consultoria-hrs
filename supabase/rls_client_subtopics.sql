-- RLS policies for client_subtopics
-- Run this in the Supabase SQL Editor
-- Safe to run multiple times (drops before creating)

alter table client_subtopics enable row level security;

drop policy if exists "select own subtopics" on client_subtopics;
drop policy if exists "insert own subtopics" on client_subtopics;
drop policy if exists "update own subtopics" on client_subtopics;
drop policy if exists "delete own subtopics" on client_subtopics;

create policy "select own subtopics"
  on client_subtopics for select
  using (
    owner_id in (select id from profiles where user_id = auth.uid())
  );

create policy "insert own subtopics"
  on client_subtopics for insert
  with check (
    owner_id in (select id from profiles where user_id = auth.uid())
  );

create policy "update own subtopics"
  on client_subtopics for update
  using (
    owner_id in (select id from profiles where user_id = auth.uid())
  );

create policy "delete own subtopics"
  on client_subtopics for delete
  using (
    owner_id in (select id from profiles where user_id = auth.uid())
  );
