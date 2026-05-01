import { useRef, useState } from "react"
import type { AppData, Song, RawPlaylist } from "../../localStore"
import {
  downloadBlob,
  exportJsonBlob,
  exportSongsCsv,
  parseImportedJson,
  parseSongsCsv,
} from "../../localStore"

type BackupProps = {
  songs: Song[]
  playlists: RawPlaylist[]
  onImportJson: (data: AppData) => void
  onImportCsv: (songs: Song[]) => void
}

const Backup = ({ songs, playlists, onImportJson, onImportCsv }: BackupProps) => {
  const [error, setError] = useState("")
  const importJsonRef = useRef<HTMLInputElement>(null)
  const importCsvRef = useRef<HTMLInputElement>(null)

  function toAppDataLocal(songs: Song[], playlists: RawPlaylist[]): AppData {
    return { version: 1, songs, playlists }
  }

  function onExportJson() {
    setError("")
    downloadBlob(exportJsonBlob(toAppDataLocal(songs, playlists)), "metronome-dados.json")
  }

  function onExportCsv() {
    setError("")
    downloadBlob(exportSongsCsv(songs), "metronome-musicas.csv")
  }

  function onImportJsonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError("")
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "")
        const data = parseImportedJson(text)
        onImportJson(data)
      } catch (err: any) {
        setError(err?.message ?? "Erro ao importar JSON.")
      }
    }
    reader.readAsText(file)
  }

  function onImportCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError("")
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "")
        const imported = parseSongsCsv(text)
        if (!imported.length) {
          setError("Nenhuma música encontrada no CSV.")
          return
        }
        onImportCsv(imported)
      } catch (err: any) {
        setError(err?.message ?? "Erro ao importar CSV.")
      }
    }
    reader.readAsText(file)
  }

  return (
    <section className="card">
      <div className="row row--between">
        <strong>Backup (JSON / Excel CSV)</strong>
        <span className="pill">só neste dispositivo</span>
      </div>
      <p style={{ margin: "10px 0 0", opacity: 0.75, fontSize: 13, lineHeight: 1.45 }}>
        Os dados ficam no telemóvel ou browser (<strong>localStorage</strong>). Exporta um ficheiro para guardar no
        telemóvel ou na cloud; importa para restaurar ou juntar músicas a partir de uma folha CSV (<code>Nome;BPM</code>
        , abre no Excel).
      </p>
      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn--primary" onClick={onExportJson}>
          Exportar JSON
        </button>
        <button type="button" className="btn" onClick={() => importJsonRef.current?.click()}>
          Importar JSON
        </button>
        <input
          ref={importJsonRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={onImportJsonFile}
        />
        <button type="button" className="btn" onClick={onExportCsv}>
          Exportar músicas CSV
        </button>
        <button type="button" className="btn" onClick={() => importCsvRef.current?.click()}>
          Importar músicas CSV
        </button>
        <input ref={importCsvRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={onImportCsvFile} />
      </div>

      {!!error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </section>
  )
}

export default Backup
