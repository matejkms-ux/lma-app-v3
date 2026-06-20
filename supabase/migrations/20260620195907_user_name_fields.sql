-- Extend users table with structured name fields and username.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name  text,
  ADD COLUMN IF NOT EXISTS last_names  text,
  ADD COLUMN IF NOT EXISTS called_name text,
  ADD COLUMN IF NOT EXISTS username    text;

-- Partial unique index so upsert-on-conflict works (NULLs stay non-unique).
CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx
  ON public.users (username)
  WHERE username IS NOT NULL;

-- Allow admin panel to update learner records via anon key.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'update_user') THEN
    CREATE POLICY update_user ON public.users FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;
