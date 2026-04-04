-- ============================================================
-- V2: Reactions, Comments, Read tracking
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Post reactions
create table if not exists post_reactions (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(post_id, user_id, emoji)
);

alter table post_reactions enable row level security;
create policy "post_reactions: read all" on post_reactions for select using (auth.uid() is not null);
create policy "post_reactions: insert own" on post_reactions for insert with check (auth.uid() = user_id);
create policy "post_reactions: delete own" on post_reactions for delete using (auth.uid() = user_id);

-- 2. Post comments
create table if not exists post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table post_comments enable row level security;
create policy "post_comments: read all" on post_comments for select using (auth.uid() is not null);
create policy "post_comments: insert own" on post_comments for insert with check (auth.uid() = user_id);
create policy "post_comments: delete own" on post_comments for delete using (auth.uid() = user_id);

-- 3. Feed last-seen tracking (for new-post badge)
create table if not exists feed_last_seen (
  user_id uuid references profiles(id) on delete cascade primary key,
  seen_at timestamptz default now()
);

alter table feed_last_seen enable row level security;
create policy "feed_last_seen: read own" on feed_last_seen for select using (auth.uid() = user_id);
create policy "feed_last_seen: insert own" on feed_last_seen for insert with check (auth.uid() = user_id);
create policy "feed_last_seen: update own" on feed_last_seen for update using (auth.uid() = user_id);

-- 4. Allow marking messages as read
create policy "messages: update read" on messages for update
  using (exists (
    select 1 from chat_participants
    where chat_id = messages.chat_id and user_id = auth.uid()
  ));

-- 5. Enable realtime for new tables
alter publication supabase_realtime add table post_reactions;
alter publication supabase_realtime add table post_comments;
