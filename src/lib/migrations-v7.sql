-- ============================================================
-- V7: Маячок — персональный AI-советник
-- Run this in Supabase SQL Editor
-- ============================================================

-- Настройки Маячка для каждого пользователя
create table if not exists mayachok_settings (
  user_id uuid references profiles(id) on delete cascade primary key,
  enabled boolean default false,
  goals text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Посты Маячка
create table if not exists mayachok_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  post_type text not null default 'tip',
  rating smallint,
  created_at timestamptz default now()
);

-- RLS
alter table mayachok_settings enable row level security;
create policy "mayachok_settings: read own" on mayachok_settings for select using (auth.uid() = user_id);
create policy "mayachok_settings: insert own" on mayachok_settings for insert with check (auth.uid() = user_id);
create policy "mayachok_settings: update own" on mayachok_settings for update using (auth.uid() = user_id);

alter table mayachok_posts enable row level security;
create policy "mayachok_posts: read own" on mayachok_posts for select using (auth.uid() = user_id);
create policy "mayachok_posts: update own" on mayachok_posts for update using (auth.uid() = user_id);
-- n8n writes via service_role key, so no insert policy needed for regular users
