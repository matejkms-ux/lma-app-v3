
-- Storage bucket for learner recordings (private).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'learner-recordings',
  'learner-recordings',
  false,
  52428800,
  ARRAY['audio/mpeg','audio/mp3','audio/x-mpeg','audio/x-mp3']
)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'learner_rec_select') THEN
    CREATE POLICY "learner_rec_select" ON storage.objects FOR SELECT USING (bucket_id = 'learner-recordings');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'learner_rec_insert') THEN
    CREATE POLICY "learner_rec_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'learner-recordings');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'learner_rec_update') THEN
    CREATE POLICY "learner_rec_update" ON storage.objects FOR UPDATE USING (bucket_id = 'learner-recordings');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'learner_rec_delete') THEN
    CREATE POLICY "learner_rec_delete" ON storage.objects FOR DELETE USING (bucket_id = 'learner-recordings');
  END IF;
END $$;

-- Metadata table: one row per take (every take is kept).
CREATE TABLE IF NOT EXISTS public.learner_recordings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text        NOT NULL,
  lesson_code  text        NOT NULL,
  step         text        NOT NULL,
  storage_path text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learner_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lr_select" ON public.learner_recordings FOR SELECT USING (true);
CREATE POLICY "lr_insert" ON public.learner_recordings FOR INSERT WITH CHECK (true);
CREATE POLICY "lr_update" ON public.learner_recordings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "lr_delete" ON public.learner_recordings FOR DELETE USING (true);
