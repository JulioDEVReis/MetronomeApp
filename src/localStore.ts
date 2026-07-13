export type Song = {
  id: string
  name: string
  bpm: number
  note: string
  beatsPerMeasure: number
}

export type PlaylistItem = {
  id: string
  position: number
  song: Song
}

export type Playlist = {
  id: string
  name: string
  items: PlaylistItem[]
}

export type RawPlaylistItem = { id: string; position: number; songId: string }
export type RawPlaylist = { id: string; name: string; items: RawPlaylistItem[] }

export type AppData = {
  version: 1
  songs: Song[]
  playlists: RawPlaylist[]
}

const STORAGE_KEY = "metronome-app-v1"

const emptyData = (): AppData => ({
  version: 1,
  songs: [],
  playlists: [],
})

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.songs) || !Array.isArray(parsed.playlists)) {
      return emptyData()
    }
    return {
      version: 1,
      songs: parsed.songs.map((s) => ({
        id: String(s.id ?? newId()),
        name: String(s.name ?? ""),
        bpm: Number.isFinite(Number(s.bpm)) ? Math.trunc(Number(s.bpm)) : 120,
        note: String(s.note ?? ""),
        beatsPerMeasure: clampBeats(Number((s as Partial<Song>).beatsPerMeasure)),
      })),
      playlists: parsed.playlists.map((p) => ({
        id: String(p.id ?? newId()),
        name: String(p.name ?? ""),
        items: Array.isArray(p.items)
          ? p.items.map((it, idx) => ({
              id: String(it.id ?? newId()),
              position: Number.isFinite(Number(it.position)) ? Math.trunc(Number(it.position)) : idx + 1,
              songId: String(it.songId ?? ""),
            }))
          : [],
      })),
    }
  } catch {
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function resolvePlaylist(raw: RawPlaylist, songs: Song[]): Playlist {
  const byId = new Map(songs.map((s) => [s.id, s]))
  const items = [...raw.items]
    .sort((a, b) => a.position - b.position)
    .map((it) => {
      const song = byId.get(it.songId)
      if (!song) return null
      return { id: it.id, position: it.position, song } as PlaylistItem
    })
    .filter(Boolean) as PlaylistItem[]
  return { id: raw.id, name: raw.name, items }
}

export function exportJsonBlob(data: AppData): Blob {
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" })
}

export function exportSongsCsv(songs: Song[]): Blob {
  const lines = ["Nome;BPM;Nota", ...songs.map((s) => `${escapeCsv(s.name)};${s.bpm};${escapeCsv(s.note)}`)]
  const body = "\uFEFF" + lines.join("\n")
  return new Blob([body], { type: "text/csv;charset=utf-8" })
}

function escapeCsv(s: string) {
  if (s.includes(";") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function parseImportedJson(text: string): AppData {
  const parsed = JSON.parse(text) as Partial<AppData>
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.songs) || !Array.isArray(parsed.playlists)) {
    throw new Error("Ficheiro JSON inválido (esperado version: 1, songs e playlists).")
  }
  return {
    version: 1,
  songs: parsed.songs.map((s) => ({
      id: String(s.id ?? newId()),
      name: String(s.name ?? "").trim(),
      bpm: clampBpm(Number(s.bpm)),
      note: String(s.note ?? "").trim(),
      beatsPerMeasure: clampBeats(Number((s as Partial<Song>).beatsPerMeasure)),
    })).sort((a, b) => a.name.localeCompare(b.name)),
    playlists: parsed.playlists.map((p) => ({
      id: String(p.id),
      name: String(p.name ?? "").trim(),
      items: Array.isArray(p.items)
        ? p.items.map((it) => ({
            id: String(it.id),
            position: Number.isFinite(Number(it.position)) ? Math.trunc(Number(it.position)) : it.position ?? 1,
            songId: String(it.songId),
          }))
        : [],
    })),
  }
}

function clampBpm(n: number) {
  if (!Number.isFinite(n)) return 120
  return Math.max(20, Math.min(300, Math.trunc(n)))
}

function clampBeats(n: number) {
  if (!Number.isFinite(n)) return 4
  return Math.max(1, Math.min(12, Math.trunc(n)))
}

export function parseSongsCsv(text: string): Song[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return []
  const header = lines[0]!.toLowerCase()
  const start = header.includes("bpm") || header.includes("nome") || header.includes("name") ? 1 : 0
  const out: Song[] = []
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]!
    const parts = line.split(";").length > 1 ? line.split(";") : line.split(",")
    if (parts.length < 2) continue
    const name = parts[0]!.trim().replace(/^"|"$/g, "").replace(/""/g, '"')
    const bpm = clampBpm(Number(parts[1]!.replace(",", ".")))
    const note = parts.length > 2 ? parts[2]!.trim().replace(/^"|"$/g, "").replace(/""/g, '"') : ""
    if (!name) continue
    out.push({ id: newId(), name, bpm, note, beatsPerMeasure: 4 })
  }
  return out
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const MAX_NOTE_LENGTH = 200
