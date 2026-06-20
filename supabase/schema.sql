-- LMA Practice Player — schema (v3 brief §6, key entities).
-- Run in the Supabase SQL editor, or via `supabase db push` if using the CLI.
-- Safe to re-run: uses IF NOT EXISTS / idempotent policies where practical.

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS — adventurers, provisioned by LMA. Name-select at entry (no self-signup).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  language    text not null,
  role        text not null default 'adventurer',
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LESSONS — the LMPI series. 10 sentences each.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.lessons (
  id            uuid primary key default gen_random_uuid(),
  series_code   text not null default 'LMPI',
  code          text not null unique,            -- e.g. LMPI-003
  title         text not null,
  "order"       int  not null,
  status        text not null default 'locked',  -- passed | in-progress | locked
  passed        int  not null default 0,         -- sentences passed (0..10)
  avg_stars     numeric(2,1),
  current_step  text                              -- GRASP|HUM|SHADOW|READ|RECALL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SENTENCES — text + transliteration + audio URLs. Fed by the import script
-- (text) and the audio upload script (l2_audio_url / l1_audio_url).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.sentences (
  id              uuid primary key default gen_random_uuid(),
  lesson_code     text not null references public.lessons(code) on delete cascade,
  sentence_number int  not null,                 -- 1..10, display number
  position        int  not null,                 -- audio match key (REF-00N)
  l1_text         text not null,                 -- English
  l2_text         text not null,                 -- target language
  transliteration text,
  clause_count    int,
  l2_audio_url    text,
  l1_audio_url    text,
  -- UI conveniences mirrored from StepProgress for the overview list:
  status          text not null default 'locked',-- done | active | locked
  stars           int  not null default 0,
  unique (lesson_code, position)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP PROGRESS — per user, per sentence, per step. The gate lives here.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.step_progress (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  sentence_id    uuid not null references public.sentences(id) on delete cascade,
  step           text not null,                  -- GRASP..RECALL
  stars          int  not null default 0,
  attempts       int  not null default 0,
  passed_by_auto boolean not null default false,
  cleared        boolean not null default false,
  unique (user_id, sentence_id, step)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- REPS — every take is +1. Drives daily + lifetime counters and the streak.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.reps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  sentence_id uuid not null references public.sentences(id) on delete cascade,
  step        text not null,
  ts          timestamptz not null default now()
);

create index if not exists reps_user_ts_idx on public.reps (user_id, ts);
create index if not exists sentences_lesson_idx on public.sentences (lesson_code, position);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-level security. Roster + content are readable by the anon client; writes
-- go through the service role (scripts) or an authenticated path later.
-- NOTE: name-select is NOT auth — gate payments/credentials behind a stronger
-- step before exposing those tables (brief §4).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.users         enable row level security;
alter table public.lessons       enable row level security;
alter table public.sentences     enable row level security;
alter table public.step_progress enable row level security;
alter table public.reps          enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'read_roster') then
    create policy read_roster on public.users for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'lessons' and policyname = 'read_lessons') then
    create policy read_lessons on public.lessons for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sentences' and policyname = 'read_sentences') then
    create policy read_sentences on public.sentences for select using (true);
  end if;
end $$;
