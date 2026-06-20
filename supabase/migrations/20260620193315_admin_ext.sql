-- Extend lesson_audio step check to include reference audio slots.
ALTER TABLE public.lesson_audio DROP CONSTRAINT IF EXISTS lesson_audio_step_check;
ALTER TABLE public.lesson_audio ADD CONSTRAINT lesson_audio_step_check
  CHECK (step IN ('GRASP','HUM','SHADOW','READ','RECALL','ref_l2','ref_l1'));

-- Allow upserting lessons and sentences from the admin panel (anon key).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lessons' AND policyname = 'update_lesson') THEN
    CREATE POLICY update_lesson ON public.lessons FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sentences' AND policyname = 'update_sentence') THEN
    CREATE POLICY update_sentence ON public.sentences FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sentences' AND policyname = 'delete_sentence') THEN
    CREATE POLICY delete_sentence ON public.sentences FOR DELETE USING (true);
  END IF;
END $$;
