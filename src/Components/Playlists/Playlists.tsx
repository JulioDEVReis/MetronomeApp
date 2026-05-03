import { useMemo, useState } from "react"
import type { Song, Playlist, RawPlaylist, PlaylistItem } from "../../localStore"

type PlaylistsProps = {
  songs: Song[]
  playlists: RawPlaylist[]
  selectedPlaylistId: string
  currentIndex: number
  onSelectPlaylist: (id: string) => void
  onCreatePlaylist: (name: string) => void
  onAddToPlaylist: (playlistId: string, songId: string) => void
  onRemoveItem: (playlistId: string, itemId: string) => void
  onMoveItem: (playlistId: string, from: number, to: number) => void
  onSelectItem: (index: number) => void
  onDeletePlaylist: (id: string) => void
}

const Playlists = ({
  songs,
  playlists,
  selectedPlaylistId,
  currentIndex,
  onSelectPlaylist,
  onCreatePlaylist,
  onAddToPlaylist,
  onRemoveItem,
  onMoveItem,
  onSelectItem,
  onDeletePlaylist,
}: PlaylistsProps) => {
  const [playlistName, setPlaylistName] = useState("")
  const [addSongId, setAddSongId] = useState("")
  const [error, setError] = useState("")

  const playlistsMeta = useMemo(
    () => playlists.map((p) => ({ id: p.id, name: p.name, count: p.items.length })),
    [playlists],
  )

  const selectedPlaylist: Playlist | null = useMemo(() => {
    if (!selectedPlaylistId) return null
    const raw = playlists.find((p) => p.id === selectedPlaylistId)
    if (!raw) return null
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
  }, [selectedPlaylistId, playlists, songs])

  function handleCreatePlaylist() {
    setError("")
    const name = playlistName.trim()
    if (!name) return
    if (playlists.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setError("Já existe uma playlist com esse nome.")
      return
    }
    onCreatePlaylist(name)
    setPlaylistName("")
  }

  function handleAddToPlaylist() {
    if (!selectedPlaylistId || !addSongId) return
    setError("")
    onAddToPlaylist(selectedPlaylistId, addSongId)
    setAddSongId("")
  }

  return (
    <section className="card">
      <div className="row row--between">
        <strong>Playlists</strong>
        <span className="pill mono">{playlistsMeta.length}</span>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ flex: 1, minWidth: 220 }}>
          <div className="label">Nova playlist</div>
          <input value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} placeholder="Ex: Show 12/04" />
        </div>
        <button className="btn btn--primary" onClick={handleCreatePlaylist} disabled={!playlistName.trim()}>
          Criar
        </button>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ flex: 1, minWidth: 260 }}>
          <div className="label">Selecionar playlist</div>
          <select value={selectedPlaylistId} onChange={(e) => onSelectPlaylist(e.target.value)}>
            <option value="">—</option>
            {playlistsMeta.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.count})
              </option>
            ))}
          </select>
        </div>
        <button 
          className="btn btn--danger" 
          onClick={() => onDeletePlaylist(selectedPlaylistId)} 
          disabled={!selectedPlaylistId}
          style={{ marginLeft: 12 }}
        >
          Eliminar playlist
        </button>
      </div>

      <div className="card" style={{ marginTop: 12, background: "rgba(255,255,255,0.03)" }}>
        <div className="row row--between">
          <strong>Itens</strong>
          <span className="pill mono">{selectedPlaylist?.items?.length ?? 0}</span>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <div className="field" style={{ flex: 1, minWidth: 240 }}>
            <div className="label">Adicionar música</div>
            <select value={addSongId} onChange={(e) => setAddSongId(e.target.value)} disabled={!selectedPlaylistId}>
              <option value="">—</option>
              {songs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} • {s.bpm} BPM
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn--primary" onClick={handleAddToPlaylist} disabled={!selectedPlaylistId || !addSongId}>
            Adicionar
          </button>
        </div>

        <div className="list">
          {(selectedPlaylist?.items ?? []).map((it, idx) => (
            <div className="listItem" key={it.id} style={{ borderColor: idx === currentIndex ? "rgba(59,130,246,0.45)" : undefined }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  <span className="mono" style={{ opacity: 0.7 }}>
                    #{idx + 1}
                  </span>{" "}
                  {it.song.name}
                </div>
                <div className="mono" style={{ opacity: 0.8 }}>
                  {it.song.bpm} BPM
                </div>
              </div>
              <div className="row">
                <button className="btn" onClick={() => onMoveItem(selectedPlaylistId, idx, idx - 1)} disabled={idx === 0}>
                  ↑
                </button>
                <button
                  className="btn"
                  onClick={() => onMoveItem(selectedPlaylistId, idx, idx + 1)}
                  disabled={idx >= ((selectedPlaylist?.items?.length ?? 1) - 1)}
                >
                  ↓
                </button>
                <button className="btn" onClick={() => onSelectItem(idx)} disabled={!selectedPlaylist?.items?.length}>
                  Selecionar
                </button>
                <button className="btn btn--danger" onClick={() => onRemoveItem(selectedPlaylistId, it.id)}>
                  X
                </button>
              </div>
            </div>
          ))}
          {selectedPlaylistId && !(selectedPlaylist?.items?.length ?? 0) && <div style={{ opacity: 0.7 }}>Playlist vazia.</div>}
          {!selectedPlaylistId && <div style={{ opacity: 0.7 }}>Selecione uma playlist para ver/editar os itens.</div>}
        </div>
      </div>

      {!!error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </section>
  )
}

export default Playlists
