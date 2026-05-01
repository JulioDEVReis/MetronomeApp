import { useState } from "react"
import type { Song } from "../../localStore"
import { MAX_NOTE_LENGTH } from "../../localStore"

type MusicasProps = {
  songs: Song[]
  onAddSong: (name: string, bpm: number, note: string) => void
  onDeleteSong: (id: string) => void
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

const Musicas = ({ songs, onAddSong, onDeleteSong }: MusicasProps) => {
  const [songName, setSongName] = useState("")
  const [songBpm, setSongBpm] = useState(120)
  const [songNote, setSongNote] = useState("")
  const [error, setError] = useState("")

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
        {songs.map((s) => (
          <div className="listItem" key={s.id}>
            <div>
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
            <button className="btn btn--danger" onClick={() => onDeleteSong(s.id)}>
              Apagar
            </button>
          </div>
        ))}
        {!songs.length && <div style={{ opacity: 0.7 }}>Sem músicas ainda.</div>}
      </div>

      {!!error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </section>
  )
}

export default Musicas
