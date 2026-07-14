import { getSupabase } from "./supabaseClient"
import type { RawPlaylist, RawPlaylistItem, Song } from "../localStore"

type RemoteSongRow = {
  id: string
  name: string
  bpm: number
  note: string
  beats_per_measure: number
}

type RemotePlaylistRow = { id: string; name: string }
type RemotePlaylistItemRow = { id: string; playlist_id: string; song_id: string; position: number }

export type RemoteData = { songs: Song[]; playlists: RawPlaylist[] }

export async function fetchRemoteData(userId: string): Promise<RemoteData | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const [songsRes, playlistsRes, itemsRes] = await Promise.all([
    supabase.from("songs").select("id,name,bpm,note,beats_per_measure").eq("user_id", userId),
    supabase.from("playlists").select("id,name").eq("user_id", userId),
    supabase.from("playlist_items").select("id,playlist_id,song_id,position").eq("user_id", userId),
  ])

  if (songsRes.error || playlistsRes.error || itemsRes.error) return null

  const songs: Song[] = ((songsRes.data ?? []) as RemoteSongRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    bpm: r.bpm,
    note: r.note,
    beatsPerMeasure: r.beats_per_measure,
  }))

  const itemsByPlaylist = new Map<string, RawPlaylistItem[]>()
  for (const it of (itemsRes.data ?? []) as RemotePlaylistItemRow[]) {
    const list = itemsByPlaylist.get(it.playlist_id) ?? []
    list.push({ id: it.id, position: it.position, songId: it.song_id })
    itemsByPlaylist.set(it.playlist_id, list)
  }

  const playlists: RawPlaylist[] = ((playlistsRes.data ?? []) as RemotePlaylistRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    items: (itemsByPlaylist.get(r.id) ?? []).sort((a, b) => a.position - b.position),
  }))

  return { songs, playlists }
}

/**
 * Mirrors local state to Supabase: wipes this user's rows and reinserts the
 * current local songs/playlists fresh. Simpler and safer than diffing
 * inserts/updates/deletes for a small personal-library dataset, and
 * naturally propagates local deletions to the cloud.
 */
export async function pushAllData(userId: string, songs: Song[], playlists: RawPlaylist[]): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  const songRows = songs.map((s) => ({
    id: s.id,
    user_id: userId,
    name: s.name,
    bpm: s.bpm,
    note: s.note,
    beats_per_measure: s.beatsPerMeasure,
    updated_at: new Date().toISOString(),
  }))
  const playlistRows = playlists.map((p) => ({
    id: p.id,
    user_id: userId,
    name: p.name,
    updated_at: new Date().toISOString(),
  }))
  const itemRows = playlists.flatMap((p) =>
    p.items.map((it) => ({
      id: it.id,
      user_id: userId,
      playlist_id: p.id,
      song_id: it.songId,
      position: it.position,
    })),
  )

  const deletions = await Promise.all([
    supabase.from("playlist_items").delete().eq("user_id", userId),
    supabase.from("songs").delete().eq("user_id", userId),
    supabase.from("playlists").delete().eq("user_id", userId),
  ])
  if (deletions.some((r) => r.error)) return false

  const [songsRes, playlistsRes] = await Promise.all([
    songRows.length ? supabase.from("songs").insert(songRows) : Promise.resolve({ error: null }),
    playlistRows.length ? supabase.from("playlists").insert(playlistRows) : Promise.resolve({ error: null }),
  ])
  if (songsRes.error || playlistsRes.error) return false

  const itemsRes = itemRows.length ? await supabase.from("playlist_items").insert(itemRows) : { error: null }
  return !itemsRes.error
}
