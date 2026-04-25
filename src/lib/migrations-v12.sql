-- ============================================================
-- V12: TEMPORARILY disable web push triggers for diagnostics
-- Run this in Supabase SQL Editor.
--
-- Hypothesis: pg_net + send-push Edge Function is saturating
-- background workers / connection pool, causing intermittent
-- timeouts on REST API for some users.
--
-- To restore push notifications, re-run migrations-v11.sql
-- (the CREATE TRIGGER blocks at the bottom).
-- ============================================================

DROP TRIGGER IF EXISTS push_on_message_insert ON messages;
DROP TRIGGER IF EXISTS push_on_friendship ON friendships;
