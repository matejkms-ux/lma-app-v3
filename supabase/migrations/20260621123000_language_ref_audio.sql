-- Feature 3: reference audio per LANGUAGE (not tied to a lesson-step). Audio
-- files live in the existing public lesson-audio bucket under _lang/<language>/;
-- this table records the URL per (language, slot). Per-lesson ref_l2/ref_l1 in
-- lesson_audio are unaffected.
CREATE TABLE IF NOT EXISTS public.language_ref_audio (
  language   text        NOT NULL,
  slot       text        NOT NULL CHECK (slot IN ('ref_l2', 'ref_l1')),
  audio_url  text        NOT NULL,
  file_name  text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (language, slot)
);

ALTER TABLE public.language_ref_audio ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='language_ref_audio' AND policyname='lang_ref_select') THEN
    CREATE POLICY "lang_ref_select" ON public.language_ref_audio FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='language_ref_audio' AND policyname='lang_ref_insert') THEN
    CREATE POLICY "lang_ref_insert" ON public.language_ref_audio FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='language_ref_audio' AND policyname='lang_ref_update') THEN
    CREATE POLICY "lang_ref_update" ON public.language_ref_audio FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='language_ref_audio' AND policyname='lang_ref_delete') THEN
    CREATE POLICY "lang_ref_delete" ON public.language_ref_audio FOR DELETE USING (true);
  END IF;
END $$;
