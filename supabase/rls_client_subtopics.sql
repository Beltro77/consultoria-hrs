-- RLS policies for client_subtopics
-- Run this in the Supabase SQL Editor

alter table client_subtopics enable row level security;

create policy "select own subtopics"
  on client_subtopics for select
  using (auth.uid() = owner_id);

create policy "insert own subtopics"
  on client_subtopics for insert
  with check (auth.uid() = owner_id);

create policy "update own subtopics"
  on client_subtopics for update
  using (auth.uid() = owner_id);

create policy "delete own subtopics"
  on client_subtopics for delete
  using (auth.uid() = owner_id);
