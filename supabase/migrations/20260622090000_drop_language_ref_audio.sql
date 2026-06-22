-- Per-language reference audio (added in 20260621123000_language_ref_audio) was
-- removed: it was never read by the learner app and added nothing over the
-- per-lesson ref_l2/ref_l1 audio. The table held no data; its policies drop with it.
DROP TABLE IF EXISTS public.language_ref_audio;
