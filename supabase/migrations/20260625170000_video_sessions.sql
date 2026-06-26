-- In-app video sessions (spec "Version 1 - LMA Video SDK Build Spec" §3).
-- `topic` is the deterministic join key shared by both parties (lma-{id}) and
-- equals the JWT `tpc` claim. Zoom cloud recording is the system of record for
-- the session video, so the recording_* columns are filled by the recording
-- webhook (netlify/functions/zoom-recording-webhook.ts).
-- users.id is TEXT in v3 (migration 20260620202513), so the FKs are text.

create extension if not exists "pgcrypto";

create table if not exists public.video_sessions (
  id            uuid primary key default gen_random_uuid(),
  topic         text unique not null,                 -- == client.join() topic == JWT tpc
  companion_id  text references public.users(id),
  adventurer_id text references public.users(id),
  lesson_code   text,                                 -- optional: lesson the panel loads
  status        text not null default 'scheduled'
                  check (status in ('scheduled','live','ended','cancelled')),

  -- Zoom cloud recording (system of record for in-app sessions)
  recording_status       text not null default 'none'
                  check (recording_status in ('none','recording','processing','available','failed')),
  recording_url          text,
  recording_file_id      text,
  recording_started_at   timestamptz,
  recording_completed_at timestamptz,

  created_at    timestamptz not null default now()
);

create index if not exists video_sessions_companion_idx  on public.video_sessions (companion_id);
create index if not exists video_sessions_adventurer_idx on public.video_sessions (adventurer_id);

alter table public.video_sessions enable row level security;

-- Anon read mirrors the rest of v3 (tighten when auth lands — spec §7.1).
-- Inserts/updates are service-role only (admin tooling + recording webhook).
drop policy if exists "video_sessions readable" on public.video_sessions;
create policy "video_sessions readable" on public.video_sessions
  for select using (true);
