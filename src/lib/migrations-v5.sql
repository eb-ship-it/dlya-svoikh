-- ============================================================
-- V5: Feedback / suggestions
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists suggestions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table suggestions enable row level security;
create policy "suggestions: insert own" on suggestions for insert with check (auth.uid() = user_id);
create policy "suggestions: read own" on suggestions for select using (auth.uid() = user_id);
