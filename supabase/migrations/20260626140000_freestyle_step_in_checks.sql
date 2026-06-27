-- FREESTYLE (the 6th step) becomes a valid step value everywhere a step is stored.
-- It has no reference audio (stays out of AUDIO_STEPS in the app) and its takes live
-- in learner_recordings (already unconstrained); these widen the CHECKs so a FREESTYLE
-- row is never rejected.

ALTER TABLE public.lesson_step_progress DROP CONSTRAINT IF EXISTS lesson_step_progress_step_check;
ALTER TABLE public.lesson_step_progress ADD CONSTRAINT lesson_step_progress_step_check
  CHECK (step = ANY (ARRAY['GRASP','HUM','SHADOW','READ','RECALL','FREESTYLE']));

ALTER TABLE public.lesson_audio DROP CONSTRAINT IF EXISTS lesson_audio_step_check;
ALTER TABLE public.lesson_audio ADD CONSTRAINT lesson_audio_step_check
  CHECK (step = ANY (ARRAY['GRASP','HUM','SHADOW','READ','RECALL','FREESTYLE','ref_l2','ref_l1']));

ALTER TABLE public.sentence_scores DROP CONSTRAINT IF EXISTS sentence_scores_step_check;
ALTER TABLE public.sentence_scores ADD CONSTRAINT sentence_scores_step_check
  CHECK (step = ANY (ARRAY['GRASP','SHADOW','RECALL','FREESTYLE']));
