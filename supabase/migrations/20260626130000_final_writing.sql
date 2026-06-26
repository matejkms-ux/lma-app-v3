-- LMA Final App · Writing submissions for human review by the Language Guide.
-- The Final Writing module is NEVER auto-scored (writing quality is human-judged,
-- consistent with the GRASP-against-L1 caution). One row per (learner, scope,
-- prompt); re-submitting upserts. The guide reviews these rows out-of-band.

CREATE TABLE IF NOT EXISTS public.final_writing_submissions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text        NOT NULL,
  scope         text        NOT NULL,   -- = FinalProgram.scope (= username)
  language      text,
  locale        text,
  prompt_index  int         NOT NULL,
  prompt        text        NOT NULL,
  answer        text        NOT NULL,
  word_count    int,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope, prompt_index)
);

ALTER TABLE public.final_writing_submissions ENABLE ROW LEVEL SECURITY;

-- Permissive RLS, matching the app's pre-auth local-first pattern (see
-- learner_recordings). Tighten when real auth lands.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'final_writing_submissions' AND policyname = 'fws_select') THEN
    CREATE POLICY "fws_select" ON public.final_writing_submissions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'final_writing_submissions' AND policyname = 'fws_insert') THEN
    CREATE POLICY "fws_insert" ON public.final_writing_submissions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'final_writing_submissions' AND policyname = 'fws_update') THEN
    CREATE POLICY "fws_update" ON public.final_writing_submissions FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;
