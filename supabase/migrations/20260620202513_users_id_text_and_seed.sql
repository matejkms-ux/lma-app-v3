-- ─────────────────────────────────────────────────────────────────────────────
-- Change users.id from UUID to TEXT so short mock-IDs (u1–u4) can be inserted.
-- step_progress and reps are empty and safe to ALTER.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop FK constraints from the empty tables first
ALTER TABLE public.step_progress DROP CONSTRAINT IF EXISTS step_progress_user_id_fkey;
ALTER TABLE public.reps         DROP CONSTRAINT IF EXISTS reps_user_id_fkey;

-- Convert users.id
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Convert the referencing columns to match
ALTER TABLE public.step_progress ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.reps          ALTER COLUMN user_id TYPE text USING user_id::text;

-- Restore FK constraints
ALTER TABLE public.step_progress
  ADD CONSTRAINT step_progress_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.reps
  ADD CONSTRAINT reps_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed the 4 learner rows with IDs that match the app's mock/progress keys.
-- NOTE: the instruction listed u1=Anamarija, u2=Jerod, u3=Tom, u4=Won-Chak,
-- but mock.ts (and existing lesson_step_progress rows) use:
--   u3 = Anamarija, u4 = Jerod, u2 = Tom, u1 = Won-Chak.
-- Seeding with the ACTUAL mock IDs to preserve all existing progress.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.users (id, name, first_name, last_names, called_name, language, username, role)
VALUES
  ('u3', 'Anamarija Cvelbar', 'Anamarija', 'Cvelbar', NULL,      'GERMAN',   'ANAMARIJAC2604-de',  'adventurer'),
  ('u4', 'Jerod Cox',         'Jerod',     'Cox',     NULL,      'THAI',     'JERODC2604-th',      'adventurer'),
  ('u2', 'Tom Roberge',       'Tom',       'Roberge', NULL,      'KHMER',    'TOMR2504-km',        'adventurer'),
  ('u1', 'Won-Chak Leung',    'Won-Chak',  'Leung',   'Charles', 'JAPANESE', 'WONCHAKL2401-ja',    'adventurer')
ON CONFLICT (id) DO NOTHING;
