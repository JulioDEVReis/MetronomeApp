export type Song = {
  id: string
  name: string
  bpm: number
}

export type PlaylistListItem = {
  id: string
  name: string
  _count?: { items: number }
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

const API_BASE = String(import.meta.env.VITE_API_URL ?? "")
  .trim()
  .replace(/\/$/, "")

function apiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const p = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE}${p}`
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Erro HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const Api = {
  health: () => api<{ ok: boolean }>("/api/health"),

  listSongs: () => api<Song[]>("/api/songs"),
  createSong: (data: { name: string; bpm: number }) =>
    api<Song>("/api/songs", { method: "POST", body: JSON.stringify(data) }),
  updateSong: (id: string, data: Partial<{ name: string; bpm: number }>) =>
    api<Song>(`/api/songs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSong: (id: string) => api<void>(`/api/songs/${id}`, { method: "DELETE" }),

  listPlaylists: () => api<PlaylistListItem[]>("/api/playlists"),
  createPlaylist: (data: { name: string }) =>
    api<{ id: string; name: string }>("/api/playlists", { method: "POST", body: JSON.stringify(data) }),
  getPlaylist: (id: string) => api<Playlist>(`/api/playlists/${id}`),
  addPlaylistItem: (playlistId: string, data: { songId: string }) =>
    api<PlaylistItem>(`/api/playlists/${playlistId}/items`, { method: "POST", body: JSON.stringify(data) }),
  deletePlaylistItem: (playlistId: string, itemId: string) =>
    api<void>(`/api/playlists/${playlistId}/items/${itemId}`, { method: "DELETE" }),
  reorderPlaylistItems: (playlistId: string, itemIds: string[]) =>
    api<Playlist>(`/api/playlists/${playlistId}/items/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ itemIds }),
    }),
}

