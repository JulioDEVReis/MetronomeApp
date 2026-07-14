import { useMemo, useState } from "react"
import type { Song } from "../../localStore"
import { MAX_NOTE_LENGTH } from "../../localStore"
import { FREE_SONG_LIMIT } from "../../lib/limits"
import UpgradeHint from "../UpgradeHint/UpgradeHint"

type SortOption = "none" | "name-asc" | "name-desc" | "bpm-asc" | "bpm-desc"

type MusicasProps = {
  songs: Song[]
  isPro: boolean
  onAddSong: (name: string, bpm: number, note: string, beatsPerMeasure: number) => { ok: boolean }
  onDeleteSong: (id: string) => void
  onUpdateSong: (id: string, name: string, bpm: number, note: string, beatsPerMeasure: number) => void
  onBulkDeleteSongs: (ids: string[]) => void
  onGoToConta: () => void
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

const Musicas = ({ songs, isPro, onAddSong, onDeleteSong, onUpdateSong, onBulkDeleteSongs, onGoToConta }: MusicasProps) => {
  const [songName, setSongName] = useState("")
  const [songBpm, setSongBpm] = useState(120)
  const [songNote, setSongNote] = useState("")
  const [songBeats, setSongBeats] = useState(4)
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editBpm, setEditBpm] = useState(120)
  const [editNote, setEditNote] = useState("")
  const [editBeats, setEditBeats] = useState(4)
  const [selectedSongIds, setSelectedSongIds] = useState(new Set<string>())
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("none")

  const visibleSongs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = query ? songs.filter((s) => s.name.toLowerCase().includes(query)) : songs
    if (sortBy === "none") return filtered
    const sorted = [...filtered]
    switch (sortBy) {
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name))
        break
      case "bpm-asc":
        sorted.sort((a, b) => a.bpm - b.bpm)
        break
      case "bpm-desc":
        sorted.sort((a, b) => b.bpm - a.bpm)
        break
    }
    return sorted
  }, [songs, searchQuery, sortBy])

  const atFreeLimit = !isPro && songs.length >= FREE_SONG_LIMIT

  function handleAddSong() {
    setError("")
    const name = songName.trim()
    if (!name) return
    if (songs.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setError("Já existe uma música com esse nome.")
      return
    }
    const bpm = clampInt(Number(songBpm), 20, 300)
    const note = songNote.trim()
    const beatsPerMeasure = clampInt(Number(songBeats), 1, 12)
    const result = onAddSong(name, bpm, note, beatsPerMeasure)
    if (!result.ok) return
    setSongName("")
    setSongBpm(120)
    setSongNote("")
    setSongBeats(4)
  }

  function startEdit(song: Song) {
    setEditingId(song.id)
    setEditName(song.name)
    setEditBpm(song.bpm)
    setEditNote(song.note)
    setEditBeats(song.beatsPerMeasure)
    setError("")
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditName("")
    setEditBpm(120)
    setEditNote("")
    setEditBeats(4)
  }

  function handleUpdateSong() {
    setError("")
    const name = editName.trim()
    if (!name) {
      setError("O nome não pode estar vazio.")
      return
    }
    const lowerName = name.toLowerCase()
    if (songs.some((s) => s.id !== editingId && s.name.toLowerCase() === lowerName)) {
      setError("Já existe uma música com esse nome.")
      return
    }
    const bpm = clampInt(Number(editBpm), 20, 300)
    const note = editNote.trim()
    const beatsPerMeasure = clampInt(Number(editBeats), 1, 12)
    onUpdateSong(editingId!, name, bpm, note, beatsPerMeasure)
    handleCancelEdit()
  }

  function toggleSongSelection(id: string) {
    setSelectedSongIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  function handleBulkDelete() {
    if (selectedSongIds.size === 0) return
    onBulkDeleteSongs(Array.from(selectedSongIds))
    setSelectedSongIds(new Set())
  }

  return (
    <section className="card">
      <div className="row row--between">
        <strong>Músicas</strong>
        <span className="pill mono">{isPro ? songs.length : `${songs.length}/${FREE_SONG_LIMIT}`}</span>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ flex: 1, minWidth: 220 }}>
          <div className="label">Nome</div>
          <input value={songName} onChange={(e) => setSongName(e.target.value)} placeholder="Ex: Enter Sandman" />
        </div>
        <div className="field" style={{ width: 140 }}>
          <div className="label">BPM</div>
          <input
            value={songBpm}
            onChange={(e) => setSongBpm(Number(e.target.value))}
            type="number"
            min={20}
            max={300}
          />
        </div>
        <div className="field" style={{ width: 120 }}>
          <div className="label">Compasso</div>
          <input
            value={songBeats}
            onChange={(e) => setSongBeats(Number(e.target.value))}
            type="number"
            min={1}
            max={12}
            title="Tempos por compasso (ex: 4 para 4/4, 3 para 3/4)"
          />
        </div>
        <button className="btn btn--primary" onClick={handleAddSong} disabled={!songName.trim() || atFreeLimit}>
          Adicionar
        </button>
      </div>

      {atFreeLimit && (
        <UpgradeHint
          message={`Limite do plano Grátis atingido (${FREE_SONG_LIMIT} músicas).`}
          onGoToConta={onGoToConta}
        />
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <div className="label">
            Nota (máx. {MAX_NOTE_LENGTH} caracteres)
          </div>
          <input
            value={songNote}
            onChange={(e) => setSongNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
            placeholder="Ex: Inicia com guitarra. Cuidado no Solo."
          />
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <div className="label">Buscar por nome</div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ex: Sandman"
          />
        </div>
        <div className="field" style={{ width: 200 }}>
          <div className="label">Ordenar por</div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
            <option value="none">— (padrão)</option>
            <option value="name-asc">Nome (A-Z)</option>
            <option value="name-desc">Nome (Z-A)</option>
            <option value="bpm-asc">BPM (menor-maior)</option>
            <option value="bpm-desc">BPM (maior-menor)</option>
          </select>
        </div>
      </div>

      <div className="list">
{visibleSongs.map((s) => {
          const isEditing = editingId === s.id
          return (
            <div className="listItem" key={s.id}>
              {isEditing ? (
                <>
                  <div style={{ flex: 1 }}>
                    <div className="field" style={{ marginBottom: 8 }}>
                      <div className="label">Nome</div>
                      <input 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)} 
                        placeholder="Nome da música" 
                        autoFocus 
                      />
                    </div>
                    <div className="row" style={{ gap: 12 }}>
                      <div className="field" style={{ width: 100 }}>
                        <div className="label">BPM</div>
                        <input
                          value={editBpm}
                          onChange={(e) => setEditBpm(Number(e.target.value))}
                          type="number"
                          min={20}
                          max={300}
                        />
                      </div>
                      <div className="field" style={{ width: 100 }}>
                        <div className="label">Compasso</div>
                        <input
                          value={editBeats}
                          onChange={(e) => setEditBeats(Number(e.target.value))}
                          type="number"
                          min={1}
                          max={12}
                          title="Tempos por compasso (ex: 4 para 4/4, 3 para 3/4)"
                        />
                      </div>
                      <div className="field" style={{ flex: 1 }}>
                        <div className="label">Nota</div>
                        <input
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
                          placeholder="Ex: Inicia com guitarra. Cuidado no Solo."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn--primary btn--small" onClick={handleUpdateSong}>
                      Salvar
                    </button>
                    <button className="btn btn--secondary btn--small" onClick={handleCancelEdit}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <label className="checkbox" style={{ marginRight: 12 }}>
                      <input 
                        type="checkbox" 
                        checked={selectedSongIds.has(s.id)}
                        onChange={() => toggleSongSelection(s.id)}
                      />
                    </label>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div className="mono" style={{ opacity: 0.8 }}>
                        {s.bpm} BPM • Compasso {s.beatsPerMeasure}
                      </div>
                      {s.note && (
                        <div style={{ marginTop: 4, opacity: 0.75, fontSize: 13 }}>
                          📝 {s.note}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button 
                      className="btn btn--primary btn--small" 
                      onClick={() => startEdit(s)}
                    >
                      Editar
                    </button>
                    <button className="btn btn--danger btn--small" onClick={() => onDeleteSong(s.id)}>
                      Apagar
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
        {!songs.length && <div style={{ opacity: 0.7 }}>Sem músicas ainda.</div>}
        {!!songs.length && !visibleSongs.length && (
          <div style={{ opacity: 0.7 }}>Nenhuma música encontrada para "{searchQuery}".</div>
        )}
        {selectedSongIds.size > 0 && (
          <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn--danger" onClick={handleBulkDelete}>
              Apagar {selectedSongIds.size} selecionada(s)
            </button>
          </div>
        )}
      </div>

      {!!error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </section>
  )
}

export default Musicas
