import type { AppData, RawPlaylist, Song } from "../localStore"

export const FREE_SONG_LIMIT = 10
export const FREE_PLAYLIST_ITEM_LIMIT = 5

export function canAddSong(currentCount: number, isPro: boolean): boolean {
  return isPro || currentCount < FREE_SONG_LIMIT
}

export function canAddPlaylistItem(currentCount: number, isPro: boolean): boolean {
  return isPro || currentCount < FREE_PLAYLIST_ITEM_LIMIT
}

export function capCsvImport(
  existingSongs: Song[],
  imported: Song[],
  isPro: boolean,
): { toApply: Song[]; skippedCount: number } {
  if (isPro) return { toApply: imported, skippedCount: 0 }

  const knownNames = new Set(existingSongs.map((s) => s.name.toLowerCase()))
  let remaining = Math.max(0, FREE_SONG_LIMIT - existingSongs.length)
  const toApply: Song[] = []
  let skippedCount = 0

  for (const song of imported) {
    const key = song.name.toLowerCase()
    if (knownNames.has(key)) {
      // Updates an existing song by name — doesn't consume a new slot.
      toApply.push(song)
      continue
    }
    if (remaining > 0) {
      toApply.push(song)
      knownNames.add(key)
      remaining--
    } else {
      skippedCount++
    }
  }

  return { toApply, skippedCount }
}

export function capJsonImport(
  data: AppData,
  isPro: boolean,
): { songs: Song[]; playlists: RawPlaylist[]; skippedCount: number } {
  if (isPro || data.songs.length <= FREE_SONG_LIMIT) {
    return { songs: data.songs, playlists: data.playlists, skippedCount: 0 }
  }

  const songs = data.songs.slice(0, FREE_SONG_LIMIT)
  const keptIds = new Set(songs.map((s) => s.id))
  const playlists = data.playlists.map((p) => {
    const items = p.items
      .filter((it) => keptIds.has(it.songId))
      .sort((a, b) => a.position - b.position)
      .map((it, idx) => ({ ...it, position: idx + 1 }))
    return { ...p, items }
  })

  return { songs, playlists, skippedCount: data.songs.length - FREE_SONG_LIMIT }
}
