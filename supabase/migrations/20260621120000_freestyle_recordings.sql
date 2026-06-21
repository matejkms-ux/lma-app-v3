-- Feature 1 (Freestyle, 6th step): self-rating + duration on the existing
-- learner_recordings table, plus a dedicated private storage bucket for
-- freestyle takes. The existing learner_recordings table is reused — freestyle
-- rows carry step = 'FREESTYLE'.

ALTER TABLE public.learner_recordings
  ADD COLUMN IF NOT EXISTS stars            integer,
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- Private bucket for freestyle takes (compressed MP3).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'freestyle-recordings',
  'freestyle-recordings',
  false,
  52428800,
  ARRAY['audio/mpeg','audio/mp3','audio/x-mpeg','audio/x-mp3']
)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'freestyle_rec_select') THEN
    CREATE POLICY "freestyle_rec_select" ON storage.objects FOR SELECT USING (bucket_id = 'freestyle-recordings');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'freestyle_rec_insert') THEN
    CREATE POLICY "freestyle_rec_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'freestyle-recordings');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'freestyle_rec_update') THEN
    CREATE POLICY "freestyle_rec_update" ON storage.objects FOR UPDATE USING (bucket_id = 'freestyle-recordings');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'freestyle_rec_delete') THEN
    CREATE POLICY "freestyle_rec_delete" ON storage.objects FOR DELETE USING (bucket_id = 'freestyle-recordings');
  END IF;
END $$;
