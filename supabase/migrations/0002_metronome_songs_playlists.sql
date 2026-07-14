-- Run by hand in the Supabase SQL editor, after 0001_metronome_entitlements.sql.
-- `id` columns are `text` (not `uuid`) so they accept whatever newId()
-- already generates on the client (crypto.randomUUID(), or the fallback
-- format for environments without it) with no translation.

create table if not exists public.songs (
  id                 text primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  bpm                integer not null,
  note               text not null default '',
  beats_per_measure  integer not null default 4,
  updated_at         timestamptz not null default now()
);

create table if not exists public.playlists (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.playlist_items (
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  playlist_id  text not null references public.playlists(id) on delete cascade,
  song_id      text not null references public.songs(id) on delete cascade,
  position     integer not null
);

alter table public.songs enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;

-- Each user has full read/write access to their own rows only — unlike
-- entitlements, sync happens directly from the browser via the anon key
-- plus the user's own JWT, so RLS is the only thing scoping data per user.
create policy "own songs" on public.songs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own playlists" on public.playlists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own playlist items" on public.playlist_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
