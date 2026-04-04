-- ============================================================
-- V4: Group chats
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add group chat fields
alter table chats add column if not exists name text;
alter table chats add column if not exists created_by uuid references profiles(id);
alter table chats add column if not exists invite_code text unique;
