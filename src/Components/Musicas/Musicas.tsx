import { useState } from "react"
import type { Song } from "../../localStore"
import { MAX_NOTE_LENGTH } from "../../localStore"

type MusicasProps = {
  songs: Song[]
  onAddSong: (name: string, bpm: number, note: string) => void
  onDeleteSong: (id: string) => void
  onUpdateSong: (id: string, name: string, bpm: number, note: string) => void
  onBulkDeleteSongs: (ids: string[]) => void
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

const Musicas = ({ songs, onAddSong, onDeleteSong, onUpdateSong, onBulkDeleteSongs }: MusicasProps) => {
  const [songName, setSongName] = useState("")
  const [songBpm, setSongBpm] = useState(120)
  const [songNote, setSongNote] = useState("")
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editBpm, setEditBpm] = useState(120)
  const [editNote, setEditNote] = useState("")
  const [selectedSongIds, setSelectedSongIds] = useState(new Set<string>())

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
    onAddSong(name, bpm, note)
    setSongName("")
    setSongBpm(120)
    setSongNote("")
  }

  function startEdit(song: Song) {
    setEditingId(song.id)
    setEditName(song.name)
    setEditBpm(song.bpm)
    setEditNote(song.note)
    setError("")
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditName("")
    setEditBpm(120)
    setEditNote("")
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
    onUpdateSong(editingId!, name, bpm, note)
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
        <span className="pill mono">{songs.length}</span>
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
        <button className="btn btn--primary" onClick={handleAddSong} disabled={!songName.trim()}>
          Adicionar
        </button>
      </div>

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

      <div className="list">
{songs.map((s) => {
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
                        {s.bpm} BPM
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
