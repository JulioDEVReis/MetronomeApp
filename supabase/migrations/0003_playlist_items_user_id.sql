-- Fix-up migration: the code (src/lib/cloudStore.ts) and the checked-in
-- 0002 migration expect playlist_items.user_id to exist directly (simpler
-- RLS than the EXISTS-subquery version from the original approved plan
-- text). Run this if playlist_items was created from that earlier text
-- and is missing the column — safe to run even if the table is empty.

alter table public.playlist_items
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.playlist_items pi
set user_id = p.user_id
from public.playlists p
where pi.playlist_id = p.id and pi.user_id is null;

alter table public.playlist_items alter column user_id set not null;

drop policy if exists "own playlist items" on public.playlist_items;

create policy "own playlist items" on public.playlist_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
