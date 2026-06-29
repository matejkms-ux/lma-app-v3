-- Per-user lesson lock bypass.
-- When true, all lessons with audio are immediately accessible regardless of
-- sequential completion. Set per learner in the Supabase dashboard.
alter table users add column if not exists unlock_all boolean not null default false;
