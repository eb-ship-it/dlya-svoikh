-- ============================================================
-- V14: Fix ritual_answers SELECT RLS
-- Run this in Supabase SQL Editor
--
-- The v13 SELECT policy referenced ritual_answers from inside its
-- own USING clause (to enforce blind reveal at the DB level). This
-- caused 0-row reads even for the user's own answer — likely
-- because the recursive RLS evaluation on the same table either
-- self-blocks or short-circuits to false in Postgres.
--
-- New policy: simply allow reading any answer inside a pair you
-- participate in. The "blind reveal" guarantee moves to the UI
-- (load() only displays the partner's answer when both are set).
-- For a private app this is acceptable; harden later via a
-- SECURITY DEFINER helper if we need DB-level enforcement.
-- ============================================================

DROP POLICY IF EXISTS "ritual_answers: read participant" ON ritual_answers;
CREATE POLICY "ritual_answers: read participant" ON ritual_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ritual_pairs p
      WHERE p.id = ritual_answers.pair_id
        AND (p.user_a_id = auth.uid() OR p.user_b_id = auth.uid())
    )
  );
