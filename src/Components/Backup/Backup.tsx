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
  isPro: boolean
  onImportJson: (data: AppData) => { addedCount: number; skippedCount: number }
  onImportCsv: (songs: Song[]) => { addedCount: number; skippedCount: number }
}

const Backup = ({ songs, playlists, isPro, onImportJson, onImportCsv }: BackupProps) => {
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
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

  function reportImportResult(addedCount: number, skippedCount: number) {
    if (skippedCount > 0) {
      setInfo(
        `Importadas ${addedCount} música(s). ${skippedCount} ficaram de fora — limite do plano Grátis atingido.` +
          (isPro ? "" : " Torna-te PRO na aba Conta para importar tudo."),
      )
    } else {
      setInfo(`Importadas ${addedCount} música(s).`)
    }
  }

  function onImportJsonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError("")
    setInfo("")
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "")
        const data = parseImportedJson(text)
        const { addedCount, skippedCount } = onImportJson(data)
        reportImportResult(addedCount, skippedCount)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao importar JSON.")
      }
    }
    reader.readAsText(file)
  }

  function onImportCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError("")
    setInfo("")
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "")
        const imported = parseSongsCsv(text)
        if (!imported.length) {
          setError("Nenhuma música encontrada no CSV.")
          return
        }
        const { addedCount, skippedCount } = onImportCsv(imported)
        reportImportResult(addedCount, skippedCount)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao importar CSV.")
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

      {!!info && <p style={{ marginTop: 10, opacity: 0.8, fontSize: 13 }}>{info}</p>}
      {!!error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </section>
  )
}

export default Backup
