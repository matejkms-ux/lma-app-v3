
-- lesson_audio: one row per (lesson_code, step), storing the public MP3 URL.
CREATE TABLE IF NOT EXISTS public.lesson_audio (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_code  text        NOT NULL,
  step         text        NOT NULL CHECK (step IN ('GRASP','HUM','SHADOW','READ','RECALL')),
  audio_url    text        NOT NULL,
  file_name    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_code, step)
);

ALTER TABLE public.lesson_audio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_lesson_audio"   ON public.lesson_audio FOR SELECT USING (true);
CREATE POLICY "insert_lesson_audio" ON public.lesson_audio FOR INSERT WITH CHECK (true);
CREATE POLICY "update_lesson_audio" ON public.lesson_audio FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "delete_lesson_audio" ON public.lesson_audio FOR DELETE USING (true);

-- Storage bucket for lesson audio (public read).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-audio',
  'lesson-audio',
  true,
  52428800,
  ARRAY['audio/mpeg','audio/mp3','audio/x-mpeg','audio/x-mp3']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'audio_public_read') THEN
    CREATE POLICY "audio_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'lesson-audio');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'audio_anon_insert') THEN
    CREATE POLICY "audio_anon_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lesson-audio');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'audio_anon_update') THEN
    CREATE POLICY "audio_anon_update" ON storage.objects FOR UPDATE USING (bucket_id = 'lesson-audio');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'audio_anon_delete') THEN
    CREATE POLICY "audio_anon_delete" ON storage.objects FOR DELETE USING (bucket_id = 'lesson-audio');
  END IF;
END $$;
