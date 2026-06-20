-- ─────────────────────────────────────────────────────────────────────────────
-- LESSON_STEP_PROGRESS — one row per (learner × lesson × step).
-- user_id is the mock string id (e.g. 'u1') — not a UUID FK — because the
-- app uses hard-coded learner profiles that are not provisioned in Supabase Auth.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_step_progress (
  user_id     text NOT NULL,
  lesson_code text NOT NULL,
  step        text NOT NULL CHECK (step = ANY (ARRAY['GRASP','HUM','SHADOW','READ','RECALL'])),
  reps        int  NOT NULL DEFAULT 0,
  stars       int  NOT NULL DEFAULT 0,
  pass_count  int  NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_code, step)
);

CREATE INDEX IF NOT EXISTS lsp_user_idx ON public.lesson_step_progress (user_id);

ALTER TABLE public.lesson_step_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lesson_step_progress' AND policyname = 'lsp_select') THEN
    CREATE POLICY lsp_select ON public.lesson_step_progress FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lesson_step_progress' AND policyname = 'lsp_insert') THEN
    CREATE POLICY lsp_insert ON public.lesson_step_progress FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lesson_step_progress' AND policyname = 'lsp_update') THEN
    CREATE POLICY lsp_update ON public.lesson_step_progress FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lesson_step_progress' AND policyname = 'lsp_delete') THEN
    CREATE POLICY lsp_delete ON public.lesson_step_progress FOR DELETE USING (true);
  END IF;
END $$;
