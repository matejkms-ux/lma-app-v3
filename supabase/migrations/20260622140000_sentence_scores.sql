-- Per-sentence × judged-step scoring (spec §3). Manual and auto are independent
-- columns and never overwrite each other. Keyed by the adventurer (user_id; this
-- no-login player has no separate session table) + sentence + step.
CREATE TABLE IF NOT EXISTS public.sentence_scores (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             text        NOT NULL,
  sentence_id         uuid        NOT NULL REFERENCES public.sentences(id) ON DELETE CASCADE,
  step                text        NOT NULL CHECK (step IN ('GRASP', 'SHADOW', 'RECALL')),
  auto_word_accuracy  numeric,
  auto_pronunciation  numeric,
  auto_combined       numeric,
  auto_stars          integer,
  manual_stars        integer,
  needs_redo          boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sentence_id, step)
);

ALTER TABLE public.sentence_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sentence_scores' AND policyname='ss_select') THEN
    CREATE POLICY "ss_select" ON public.sentence_scores FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sentence_scores' AND policyname='ss_insert') THEN
    CREATE POLICY "ss_insert" ON public.sentence_scores FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sentence_scores' AND policyname='ss_update') THEN
    CREATE POLICY "ss_update" ON public.sentence_scores FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sentence_scores' AND policyname='ss_delete') THEN
    CREATE POLICY "ss_delete" ON public.sentence_scores FOR DELETE USING (true);
  END IF;
END $$;
