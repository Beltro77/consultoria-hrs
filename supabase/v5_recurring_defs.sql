-- Migration: create recurring_defs table
-- Run in Supabase SQL Editor

create table if not exists recurring_defs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  title       text not null,
  desc        text,
  type        text not null,
  day         integer,
  weekday     integer,
  start_date  date not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table recurring_defs enable row level security;

create policy "select own recurring_defs"
  on recurring_defs for select
  using (owner_id in (select id from profiles where user_id = auth.uid()));

create policy "insert own recurring_defs"
  on recurring_defs for insert
  with check (owner_id in (select id from profiles where user_id = auth.uid()));

create policy "update own recurring_defs"
  on recurring_defs for update
  using (owner_id in (select id from profiles where user_id = auth.uid()));

create policy "delete own recurring_defs"
  on recurring_defs for delete
  using (owner_id in (select id from profiles where user_id = auth.uid()));

-- Also ensure tasks table has recur_def_id column
alter table tasks
  add column if not exists recur_def_id uuid references recurring_defs(id) on delete set null;
