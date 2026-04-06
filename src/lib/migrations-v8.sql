-- ============================================================
-- V8: Security fix — close RLS vulnerabilities
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Fix chat_participants INSERT — only chat creator can add members
DROP POLICY "chat_participants: insert" ON chat_participants;
CREATE POLICY "chat_participants: insert" ON chat_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE id = chat_participants.chat_id
      AND created_by = auth.uid()
    )
  );

-- 2. Fix chats INSERT — created_by must be current user
DROP POLICY "chats: insert" ON chats;
CREATE POLICY "chats: insert" ON chats FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- 3. Fix friendships INSERT — only pending status allowed
DROP POLICY "friendships: insert" ON friendships;
CREATE POLICY "friendships: insert" ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');

-- 4. RPC: join group by invite code (bypasses RLS safely)
CREATE OR REPLACE FUNCTION join_group_by_invite(invite_code_param text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  chat_id_val uuid;
BEGIN
  SELECT id INTO chat_id_val FROM chats WHERE invite_code = invite_code_param;
  IF chat_id_val IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  INSERT INTO chat_participants (chat_id, user_id)
    VALUES (chat_id_val, auth.uid())
    ON CONFLICT DO NOTHING;
  RETURN chat_id_val;
END;
$$;

-- 5. RPC: accept friend invite (bypasses RLS safely)
CREATE OR REPLACE FUNCTION accept_friend_invite(inviter_username_param text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  inviter_id_val uuid;
BEGIN
  SELECT id INTO inviter_id_val FROM profiles WHERE username = inviter_username_param;
  IF inviter_id_val IS NULL OR inviter_id_val = auth.uid() THEN RETURN; END IF;
  INSERT INTO friendships (requester_id, addressee_id, status)
    VALUES (auth.uid(), inviter_id_val, 'accepted')
    ON CONFLICT DO NOTHING;
END;
$$;
