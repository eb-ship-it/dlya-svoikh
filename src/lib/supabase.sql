-- ============================================================
-- SCHEMA for dlya-svoikh messenger
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- 1. Profiles (one per auth user)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 2. Friend requests / friendships
create table if not exists friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references profiles(id) on delete cascade not null,
  addressee_id uuid references profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz default now(),
  unique(requester_id, addressee_id)
);

-- 3. Direct message chats
create table if not exists chats (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now()
);

create table if not exists chat_participants (
  chat_id uuid references chats(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (chat_id, user_id)
);

-- 4. Messages
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

-- 5. News feed posts
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table friendships enable row level security;
alter table chats enable row level security;
alter table chat_participants enable row level security;
alter table messages enable row level security;
alter table posts enable row level security;

-- Profiles: anyone logged in can read, only owner can update
create policy "profiles: read all" on profiles for select using (auth.uid() is not null);
create policy "profiles: insert own" on profiles for insert with check (auth.uid() = id);
create policy "profiles: update own" on profiles for update using (auth.uid() = id);

-- Friendships: see your own
create policy "friendships: read own" on friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendships: insert" on friendships for insert
  with check (auth.uid() = requester_id);
create policy "friendships: update addressee" on friendships for update
  using (auth.uid() = addressee_id);
create policy "friendships: delete own" on friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Chats: only participants
create policy "chats: read participant" on chats for select
  using (exists (
    select 1 from chat_participants
    where chat_id = chats.id and user_id = auth.uid()
  ));
create policy "chats: insert" on chats for insert with check (true);

-- Chat participants
create policy "chat_participants: read" on chat_participants for select
  using (exists (
    select 1 from chat_participants cp2
    where cp2.chat_id = chat_participants.chat_id and cp2.user_id = auth.uid()
  ));
create policy "chat_participants: insert" on chat_participants for insert with check (true);

-- Messages: only chat participants
create policy "messages: read" on messages for select
  using (exists (
    select 1 from chat_participants
    where chat_id = messages.chat_id and user_id = auth.uid()
  ));
create policy "messages: insert" on messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from chat_participants
      where chat_id = messages.chat_id and user_id = auth.uid()
    )
  );

-- Posts: all logged-in users see all posts; only owner deletes
create policy "posts: read all" on posts for select using (auth.uid() is not null);
create policy "posts: insert own" on posts for insert with check (auth.uid() = user_id);
create policy "posts: delete own" on posts for delete using (auth.uid() = user_id);

-- ============================================================
-- REALTIME: enable for messages and posts
-- ============================================================
-- Run in SQL Editor:
-- alter publication supabase_realtime add table messages;
-- alter publication supabase_realtime add table posts;
