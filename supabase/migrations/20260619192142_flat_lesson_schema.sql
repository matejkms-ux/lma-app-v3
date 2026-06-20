-- ─────────────────────────────────────────────────────────────────────────────
-- USERS — provisioned by LMA; name-select at entry.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  language   text        NOT NULL,
  role       text        NOT NULL DEFAULT 'adventurer',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LESSONS — flat model; keyed by lesson_code (e.g. ANAMARIJAC2604-de-001).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lessons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_code text NOT NULL UNIQUE,
  language    text NOT NULL,
  title       text NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SENTENCES — text + transliteration + reference audio. Fed by import script.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sentences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_code  text NOT NULL REFERENCES public.lessons(lesson_code) ON DELETE CASCADE,
  sentence_nr  int  NOT NULL,
  l1           text NOT NULL,
  l2           text NOT NULL,
  l2_translit  text,
  l2_audio_url text,
  UNIQUE (lesson_code, sentence_nr)
);

CREATE INDEX IF NOT EXISTS sentences_lesson_idx ON public.sentences (lesson_code, sentence_nr);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP PROGRESS — per user, per sentence, per step. Stars = 0–5 accuracy.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.step_progress (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sentence_id    uuid    NOT NULL REFERENCES public.sentences(id) ON DELETE CASCADE,
  step           text    NOT NULL,
  stars          int     NOT NULL DEFAULT 0,
  attempts       int     NOT NULL DEFAULT 0,
  passed_by_auto boolean NOT NULL DEFAULT false,
  cleared        boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, sentence_id, step)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- REPS — every take is +1. Drives daily + lifetime counters and streak.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reps (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sentence_id uuid        NOT NULL REFERENCES public.sentences(id) ON DELETE CASCADE,
  step        text        NOT NULL,
  ts          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reps_user_ts_idx ON public.reps (user_id, ts);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reps          ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'read_roster') THEN
    CREATE POLICY read_roster ON public.users FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'insert_user') THEN
    CREATE POLICY insert_user ON public.users FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lessons' AND policyname = 'read_lessons') THEN
    CREATE POLICY read_lessons ON public.lessons FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lessons' AND policyname = 'insert_lesson') THEN
    CREATE POLICY insert_lesson ON public.lessons FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sentences' AND policyname = 'read_sentences') THEN
    CREATE POLICY read_sentences ON public.sentences FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sentences' AND policyname = 'insert_sentence') THEN
    CREATE POLICY insert_sentence ON public.sentences FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'step_progress' AND policyname = 'read_step_progress') THEN
    CREATE POLICY read_step_progress ON public.step_progress FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'step_progress' AND policyname = 'insert_step_progress') THEN
    CREATE POLICY insert_step_progress ON public.step_progress FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'step_progress' AND policyname = 'update_step_progress') THEN
    CREATE POLICY update_step_progress ON public.step_progress FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reps' AND policyname = 'read_reps') THEN
    CREATE POLICY read_reps ON public.reps FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reps' AND policyname = 'insert_rep') THEN
    CREATE POLICY insert_rep ON public.reps FOR INSERT WITH CHECK (true);
  END IF;
END $$;
