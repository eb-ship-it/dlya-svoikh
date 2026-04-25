-- ============================================================
-- V13: Ритуалы — «Вопрос дня для пар»
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Pool of questions (one global pool — deck filtering deferred)
CREATE TABLE IF NOT EXISTS ritual_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  deck text, -- 'partners' | 'parents' | 'friends' | 'family' | 'light' | NULL = generic
  created_at timestamptz DEFAULT now()
);

-- 2. Daily pick — one question per calendar date for everyone
CREATE TABLE IF NOT EXISTS ritual_daily_picks (
  pick_date date PRIMARY KEY,
  question_id uuid NOT NULL REFERENCES ritual_questions(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now()
);

-- 3. Pairs — two users opted into the daily question.
--    Symmetric pair: enforce user_a_id < user_b_id so (A,B) and (B,A) collapse.
--    `created_by_id` tracks who initiated (independent of ordering).
CREATE TABLE IF NOT EXISTS ritual_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck text NOT NULL DEFAULT 'light',
  depth text NOT NULL DEFAULT 'medium', -- 'light' | 'medium' | 'deep' | 'mix'
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','declined')),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  CHECK (user_a_id < user_b_id),
  UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_ritual_pairs_user_a ON ritual_pairs(user_a_id);
CREATE INDEX IF NOT EXISTS idx_ritual_pairs_user_b ON ritual_pairs(user_b_id);

-- 4. Pair answers
CREATE TABLE IF NOT EXISTS ritual_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES ritual_pairs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES ritual_questions(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (pair_id, user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_ritual_answers_pair_question ON ritual_answers(pair_id, question_id);
CREATE INDEX IF NOT EXISTS idx_ritual_answers_user ON ritual_answers(user_id);

-- 5. Solo journal
CREATE TABLE IF NOT EXISTS ritual_solo_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES ritual_questions(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_ritual_solo_user ON ritual_solo_answers(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE ritual_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ritual_daily_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ritual_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ritual_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ritual_solo_answers ENABLE ROW LEVEL SECURITY;

-- Questions — read-only for all authenticated
DROP POLICY IF EXISTS "ritual_questions: read all" ON ritual_questions;
CREATE POLICY "ritual_questions: read all" ON ritual_questions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Daily picks — read-only; INSERT only via SECURITY DEFINER pick_daily_question()
DROP POLICY IF EXISTS "ritual_daily_picks: read all" ON ritual_daily_picks;
CREATE POLICY "ritual_daily_picks: read all" ON ritual_daily_picks FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Pairs
DROP POLICY IF EXISTS "ritual_pairs: read participant" ON ritual_pairs;
CREATE POLICY "ritual_pairs: read participant" ON ritual_pairs FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

DROP POLICY IF EXISTS "ritual_pairs: insert as creator" ON ritual_pairs;
CREATE POLICY "ritual_pairs: insert as creator" ON ritual_pairs FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_id
    AND (auth.uid() = user_a_id OR auth.uid() = user_b_id)
  );

DROP POLICY IF EXISTS "ritual_pairs: update participant" ON ritual_pairs;
CREATE POLICY "ritual_pairs: update participant" ON ritual_pairs FOR UPDATE
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

DROP POLICY IF EXISTS "ritual_pairs: delete participant" ON ritual_pairs;
CREATE POLICY "ritual_pairs: delete participant" ON ritual_pairs FOR DELETE
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Answers — read own freely; read partner's only if you also answered
-- the same question in the same pair
DROP POLICY IF EXISTS "ritual_answers: read participant" ON ritual_answers;
CREATE POLICY "ritual_answers: read participant" ON ritual_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ritual_pairs p
      WHERE p.id = ritual_answers.pair_id
        AND (p.user_a_id = auth.uid() OR p.user_b_id = auth.uid())
    )
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM ritual_answers my
        WHERE my.pair_id = ritual_answers.pair_id
          AND my.user_id = auth.uid()
          AND my.question_id = ritual_answers.question_id
      )
    )
  );

DROP POLICY IF EXISTS "ritual_answers: insert own" ON ritual_answers;
CREATE POLICY "ritual_answers: insert own" ON ritual_answers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM ritual_pairs p
      WHERE p.id = ritual_answers.pair_id
        AND p.status = 'active'
        AND (p.user_a_id = auth.uid() OR p.user_b_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "ritual_answers: update own" ON ritual_answers;
CREATE POLICY "ritual_answers: update own" ON ritual_answers FOR UPDATE
  USING (auth.uid() = user_id);

-- Solo — own only
DROP POLICY IF EXISTS "ritual_solo: read own" ON ritual_solo_answers;
CREATE POLICY "ritual_solo: read own" ON ritual_solo_answers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ritual_solo: insert own" ON ritual_solo_answers;
CREATE POLICY "ritual_solo: insert own" ON ritual_solo_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ritual_solo: update own" ON ritual_solo_answers;
CREATE POLICY "ritual_solo: update own" ON ritual_solo_answers FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- pick_daily_question() — returns today's question_id, lazy-creates if missing.
-- SECURITY DEFINER allows callers to insert into ritual_daily_picks indirectly.
-- ============================================================

CREATE OR REPLACE FUNCTION pick_daily_question() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  picked_id uuid;
BEGIN
  SELECT question_id INTO picked_id
  FROM ritual_daily_picks
  WHERE pick_date = current_date;

  IF picked_id IS NOT NULL THEN
    RETURN picked_id;
  END IF;

  -- Pick a question not used in the last 60 days
  SELECT id INTO picked_id
  FROM ritual_questions
  WHERE id NOT IN (
    SELECT question_id FROM ritual_daily_picks
    WHERE pick_date >= current_date - INTERVAL '60 days'
  )
  ORDER BY random()
  LIMIT 1;

  -- Fallback: if everything was used recently, pick any
  IF picked_id IS NULL THEN
    SELECT id INTO picked_id FROM ritual_questions ORDER BY random() LIMIT 1;
  END IF;

  -- Save (race-safe via ON CONFLICT)
  INSERT INTO ritual_daily_picks(pick_date, question_id)
  VALUES (current_date, picked_id)
  ON CONFLICT (pick_date) DO NOTHING;

  -- Re-read in case another caller won the race
  SELECT question_id INTO picked_id FROM ritual_daily_picks WHERE pick_date = current_date;
  RETURN picked_id;
END;
$$;

GRANT EXECUTE ON FUNCTION pick_daily_question() TO authenticated;

-- ============================================================
-- REALTIME publication
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE ritual_pairs;
ALTER PUBLICATION supabase_realtime ADD TABLE ritual_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE ritual_daily_picks;

-- ============================================================
-- SEED 70 questions
-- ============================================================

INSERT INTO ritual_questions(text) VALUES
  -- Воспоминания
  ('Какое самое яркое воспоминание из детства всплыло у тебя сегодня?'),
  ('О чём ты мечтал, когда тебе было 20?'),
  ('Какая мелочь из прошлого согревает тебя сейчас?'),
  ('Какая песня сразу возвращает тебя в школьные годы?'),
  ('Какой запах напоминает тебе о доме?'),
  ('Какой подарок ты помнишь до сих пор и почему?'),
  ('Какое блюдо из детства ты бы съел прямо сейчас?'),
  ('Какой человек из прошлого вспоминается тебе чаще всего?'),
  ('Какое решение в жизни ты до сих пор считаешь правильным?'),
  ('Какой летний день своей жизни ты помнишь лучше всего?'),

  -- Благодарность
  ('За что ты сегодня благодарен?'),
  ('Кому хотелось бы сказать «спасибо», но руки не доходят?'),
  ('Какая мелочь сегодня была хорошей?'),
  ('Что тебя удивило за последнюю неделю?'),
  ('Какой человек в твоей жизни даёт тебе сил?'),
  ('За какое своё качество ты сейчас благодарен себе?'),
  ('Какое место в городе всегда поднимает тебе настроение?'),
  ('Какая привычка делает твой день лучше?'),
  ('Что в этом году ты бы оставил с собой навсегда?'),
  ('Кто из близких сделал что-то приятное за последнюю неделю?'),

  -- Мечты и желания
  ('О чём ты сейчас мечтаешь?'),
  ('Какую новую штуку ты бы хотел попробовать в этом году?'),
  ('Куда бы ты поехал, если бы билет был бесплатным?'),
  ('Какое умение ты бы хотел освоить за месяц?'),
  ('Кем ты хотел стать в детстве — и что от этого осталось сейчас?'),
  ('Какую большую цель ты бы поставил себе на ближайшие 5 лет?'),
  ('Что бы ты сделал, если бы выходной свалился внезапно?'),
  ('Какой день в этом году ты ждёшь больше всего?'),
  ('Если бы у тебя был лишний час каждый день — на что бы ты его тратил?'),
  ('Какое маленькое желание ты бы исполнил себе прямо сегодня?'),

  -- Чувства и состояние
  ('Как ты сейчас на самом деле?'),
  ('Что тебя в последнее время радует — а что нет?'),
  ('Чего ты сейчас опасаешься больше всего?'),
  ('Что в последнее время выводит тебя из себя?'),
  ('О чём ты думаешь чаще всего перед сном?'),
  ('Что в последнее время удивляет тебя в людях?'),
  ('Чего сейчас «слишком много», а чего — не хватает?'),
  ('В каком настроении ты обычно просыпаешься в последние недели?'),
  ('Когда ты в последний раз чувствовал, что всё на своих местах?'),
  ('Что в последнее время отнимает у тебя силы?'),

  -- Лёгкое
  ('Какой твой любимый перекус сейчас?'),
  ('Какой сериал или книгу ты бы рекомендовал прямо сейчас?'),
  ('Где в твоём доме самое уютное место?'),
  ('Какую погоду ты любишь больше всего?'),
  ('Что лучше — кофе или чай (и при каких обстоятельствах)?'),
  ('Какое слово в русском языке тебя радует?'),
  ('Какой твой любимый праздник и почему?'),
  ('Какое блюдо ты готовишь, когда хочешь себя порадовать?'),
  ('Какой твой любимый предмет одежды сейчас?'),
  ('Где бы ты хотел провести следующее воскресенье?'),

  -- Близкие и связи
  ('Кому ты давно не звонил, а стоило бы?'),
  ('Кого из друзей ты бы хотел увидеть в ближайший месяц?'),
  ('Какую черту ты ценишь в близких больше всего?'),
  ('Какой совет ты бы дал себе пять лет назад?'),
  ('За что ты благодарен своим родителям прямо сейчас?'),
  ('Что в твоих отношениях с близкими делает тебя счастливее?'),
  ('Какое сходство ты замечаешь между собой и своими родителями?'),
  ('Какому человеку ты доверяешь полностью?'),
  ('О ком ты сегодня думал в течение дня?'),
  ('Какой добрый поступок другого человека вспоминается тебе чаще всего?'),

  -- Размышления
  ('Что ты сегодня сделал впервые?'),
  ('Какой урок ты получил за последний месяц?'),
  ('Что в этом году ты понял о себе?'),
  ('Какую вещь, казавшуюся важной год назад, ты сейчас отпустил?'),
  ('Чему ты учишься прямо сейчас?'),
  ('Какой совет ты сам бы хотел услышать сейчас?'),
  ('Что в твоей жизни осталось неизменным с детства?'),
  ('О чём ты молчишь, хотя стоило бы сказать?'),
  ('Что бы ты изменил в своей жизни, если бы было не страшно?'),
  ('Какой твой любимый вопрос — тот, который ты любишь задавать сам?')
;
