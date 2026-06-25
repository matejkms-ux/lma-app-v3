-- Per-learner study plan: 3-context consumption breakdown stored as JSONB.
-- Only populated for learners who have a structured program; others see NULL.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan JSONB;
