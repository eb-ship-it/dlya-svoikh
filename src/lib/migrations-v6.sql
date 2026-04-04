-- ============================================================
-- V6: Missing RLS policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Messages: only sender can delete own messages
create policy "messages: delete own" on messages for delete
  using (auth.uid() = sender_id);

-- 2. Feed last seen: only owner can delete own record
create policy "feed_last_seen: delete own" on feed_last_seen for delete
  using (auth.uid() = user_id);
