-- ============================================================
-- V11: Web Push subscriptions
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  ua text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users insert own subs" ON push_subscriptions;
CREATE POLICY "users insert own subs" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users select own subs" ON push_subscriptions;
CREATE POLICY "users select own subs" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own subs" ON push_subscriptions;
CREATE POLICY "users delete own subs" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Triggers: notify Edge Function `send-push` on new messages and
-- friendship changes. Uses pg_net (enabled by default in Supabase).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION call_push_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://owmhksmhqvgpfanftane.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ca8b0e232ce3fa71b0ec17b0e90b2561b1f92ccd92649f1efb9db9aec35fc22f'
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', 'messages',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_message_insert ON messages;
CREATE TRIGGER push_on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION call_push_message();

CREATE OR REPLACE FUNCTION call_push_friendship() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://owmhksmhqvgpfanftane.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ca8b0e232ce3fa71b0ec17b0e90b2561b1f92ccd92649f1efb9db9aec35fc22f'
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', 'friendships',
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_friendship ON friendships;
CREATE TRIGGER push_on_friendship
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION call_push_friendship();
