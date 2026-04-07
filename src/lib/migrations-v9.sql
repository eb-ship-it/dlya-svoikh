-- ============================================================
-- V9: Fix group management — allow creator to update/delete
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Allow group creator to update chat name
CREATE POLICY "chats: update creator" ON chats FOR UPDATE
  USING (created_by = auth.uid());

-- 2. Allow group creator to delete chat
CREATE POLICY "chats: delete creator" ON chats FOR DELETE
  USING (created_by = auth.uid());

-- 3. Allow group creator to remove members, or user to leave
CREATE POLICY "chat_participants: delete" ON chat_participants FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chats
      WHERE id = chat_participants.chat_id
      AND created_by = auth.uid()
    )
  );
