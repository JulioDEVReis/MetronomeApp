import { useEffect, useMemo, useRef, useState } from "react"
import {
  type AppData,
  type Playlist,
  type PlaylistItem,
  type RawPlaylistItem,
  type RawPlaylist,
  type Song,
  downloadBlob,
  exportJsonBlob,
  exportSongsCsv,
  loadData,
  newId,
  parseImportedJson,
  parseSongsCsv,
  resolvePlaylist,
  saveData,
} from "../../localStore"

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

type MetronomeOpts = {
  bpm: number
  enabled: boolean
  soundEnabled: boolean
}

function useMetronome({ bpm, enabled, soundEnabled }: MetronomeOpts) {
  const [beatOn, setBeatOn] = useState(false)
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!enabled) {
      setBeatOn(false)
      return
    }

    const intervalMs = Math.round(60000 / Math.max(1, bpm))
    let alive = true
    let t: number | undefined

    const tick = () => {
      if (!alive) return
      setBeatOn(true)

      if (soundEnabled) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext
        if (!audioRef.current) audioRef.current = new Ctx()
        const ctx = audioRef.current
        if (ctx.state === "suspended") void ctx.resume()

        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "square"
        osc.frequency.value = 1000
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.002)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.05)
      }

      window.setTimeout(() => {
        if (!alive) return
        setBeatOn(false)
      }, Math.min(120, Math.floor(intervalMs / 2)))
    }

    tick()
    t = window.setInterval(tick, intervalMs)

    return () => {
      alive = false
      if (t) window.clearInterval(t)
    }
  }, [bpm, enabled, soundEnabled])

  return { beatOn }
}

async function safeFullscreenEnter() {
  const el = document.documentElement
  if (document.fullscreenElement) return
  if (el.requestFullscreen) await el.requestFullscreen()
}

async function safeFullscreenExit() {
  if (!document.fullscreenElement) return
  if (document.exitFullscreen) await document.exitFullscreen()
}

function toAppData(songs: Song[], playlists: RawPlaylist[]): AppData {
  return { version: 1, songs, playlists }
}

const Body = () => {
  const [songs, setSongs] = useState<Song[]>([])
  const [playlists, setPlaylists] = useState<RawPlaylist[]>([])
  const [hydrated, setHydrated] = useState(false)

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("")

  const [songName, setSongName] = useState("")
  const [songBpm, setSongBpm] = useState(120)

  const [playlistName, setPlaylistName] = useState("")

  const [addSongId, setAddSongId] = useState<string>("")

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [isFullscreenUi, setIsFullscreenUi] = useState(false)

  const [error, setError] = useState<string>("")

  const importJsonRef = useRef<HTMLInputElement>(null)
  const importCsvRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const d = loadData()
    setSongs(d.songs)
    setPlaylists(d.playlists)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveData(toAppData(songs, playlists))
  }, [songs, playlists, hydrated])

  const playlistsMeta = useMemo(
    () => playlists.map((p) => ({ id: p.id, name: p.name, count: p.items.length })),
    [playlists],
  )

  const selectedPlaylist: Playlist | null = useMemo(() => {
    if (!selectedPlaylistId) return null
    const raw = playlists.find((p) => p.id === selectedPlaylistId)
    if (!raw) return null
    return resolvePlaylist(raw, songs)
  }, [selectedPlaylistId, playlists, songs])

  const currentItem: PlaylistItem | null = useMemo(() => {
    const items = selectedPlaylist?.items ?? []
    return items.length ? items[Math.min(currentIndex, items.length - 1)] : null
  }, [currentIndex, selectedPlaylist])

  const currentBpm = currentItem?.song?.bpm ?? 120
  const { beatOn } = useMetronome({ bpm: currentBpm, enabled: isPlaying && !!currentItem, soundEnabled })

  useEffect(() => {
    if (!selectedPlaylistId) {
      setCurrentIndex(0)
      setIsPlaying(false)
      return
    }
    setCurrentIndex(0)
    setIsPlaying(false)
  }, [selectedPlaylistId])

  useEffect(() => {
    const onFs = () => {
      const isFs = !!document.fullscreenElement
      setIsFullscreenUi(isFs)
    }
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  function setPlaylistById(id: string, fn: (pl: RawPlaylist) => RawPlaylist) {
    setPlaylists((prev) => prev.map((p) => (p.id === id ? fn(p) : p)))
  }

  function onAddSong() {
    setError("")
    const name = songName.trim()
    if (!name) return
    if (songs.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setError("Já existe uma música com esse nome.")
      return
    }
    const bpm = clampInt(Number(songBpm), 20, 300)
    setSongs((s) => [...s, { id: newId(), name, bpm }])
    setSongName("")
    setSongBpm(120)
  }

  function onDeleteSong(id: string) {
    setError("")
    setSongs((s) => s.filter((x) => x.id !== id))
    setPlaylists((pls) =>
      pls.map((p) => ({
        ...p,
        items: p.items
          .filter((it: RawPlaylistItem) => it.songId !== id)
          .map((it: RawPlaylistItem, idx: number) => ({ ...it, position: idx + 1 })),
      })),
    )
  }

  function onCreatePlaylist() {
    setError("")
    const name = playlistName.trim()
    if (!name) return
    if (playlists.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setError("Já existe uma playlist com esse nome.")
      return
    }
    const id = newId()
    setPlaylists((p) => [...p, { id, name, items: [] }])
    setPlaylistName("")
    setSelectedPlaylistId(id)
  }

  function onAddToPlaylist() {
    if (!selectedPlaylistId || !addSongId) return
    setError("")
    setPlaylistById(selectedPlaylistId, (pl) => {
      const nextPos = (pl.items.reduce((m: number, it: RawPlaylistItem) => Math.max(m, it.position), 0) || 0) + 1
      return {
        ...pl,
        items: [...pl.items, { id: newId(), position: nextPos, songId: addSongId }],
      }
    })
    setAddSongId("")
  }

  function onRemoveItem(itemId: string) {
    if (!selectedPlaylistId) return
    setError("")
    setPlaylistById(selectedPlaylistId, (pl) => {
      const remaining = pl.items
        .filter((it: RawPlaylistItem) => it.id !== itemId)
        .sort((a: RawPlaylistItem, b: RawPlaylistItem) => a.position - b.position)
      return {
        ...pl,
        items: remaining.map((it: RawPlaylistItem, idx: number) => ({ ...it, position: idx + 1 })),
      }
    })
    setCurrentIndex(0)
    setIsPlaying(false)
  }

  function persistOrder(newItems: PlaylistItem[]) {
    if (!selectedPlaylistId) return
    setPlaylistById(selectedPlaylistId, (pl) => ({
      ...pl,
      items: newItems.map((it, idx) => ({
        id: it.id,
        position: idx + 1,
        songId: it.song.id,
      })),
    }))
  }

  function moveItem(from: number, to: number) {
    const items = [...(selectedPlaylist?.items ?? [])]
    if (!items.length) return
    if (from < 0 || from >= items.length) return
    if (to < 0 || to >= items.length) return
    const [it] = items.splice(from, 1)
    if (!it) return
    items.splice(to, 0, it)
    persistOrder(items)
    setCurrentIndex((idx) => {
      if (idx === from) return to
      if (from < idx && idx <= to) return idx - 1
      if (to <= idx && idx < from) return idx + 1
      return idx
    })
  }

  function prev() {
    const items = selectedPlaylist?.items ?? []
    if (!items.length) return
    setCurrentIndex((i) => (i <= 0 ? 0 : i - 1))
  }

  function next() {
    const items = selectedPlaylist?.items ?? []
    if (!items.length) return
    setCurrentIndex((i) => (i >= items.length - 1 ? items.length - 1 : i + 1))
  }

  async function toggleFullscreen() {
    try {
      setError("")
      if (!document.fullscreenElement) await safeFullscreenEnter()
      else await safeFullscreenExit()
    } catch (e: any) {
      setError(e?.message ?? "Erro ao alternar fullscreen.")
    }
  }

  function onExportJson() {
    setError("")
    downloadBlob(exportJsonBlob(toAppData(songs, playlists)), "metronome-dados.json")
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
        setSongs(data.songs)
        setPlaylists(data.playlists)
        setSelectedPlaylistId("")
        setCurrentIndex(0)
        setIsPlaying(false)
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
        setSongs((prev) => {
          const byName = new Map(prev.map((s) => [s.name.toLowerCase(), s]))
          for (const s of imported) {
            byName.set(s.name.toLowerCase(), s)
          }
          return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
        })
      } catch (err: any) {
        setError(err?.message ?? "Erro ao importar CSV.")
      }
    }
    reader.readAsText(file)
  }

  const playerDisabled = !currentItem

  const main = (
    <div className="container">
      <section className="card" style={{ marginBottom: 16 }}>
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
      </section>

      <div className="grid">
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
            <button className="btn btn--primary" onClick={onAddSong} disabled={!songName.trim()}>
              Adicionar
            </button>
          </div>

          <div className="list">
            {songs.map((s) => (
              <div className="listItem" key={s.id}>
                <div>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div className="mono" style={{ opacity: 0.8 }}>
                    {s.bpm} BPM
                  </div>
                </div>
                <button className="btn btn--danger" onClick={() => onDeleteSong(s.id)}>
                  Apagar
                </button>
              </div>
            ))}
            {!songs.length && <div style={{ opacity: 0.7 }}>Sem músicas ainda.</div>}
          </div>
        </section>

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
            <button className="btn btn--primary" onClick={onCreatePlaylist} disabled={!playlistName.trim()}>
              Criar
            </button>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div className="field" style={{ flex: 1, minWidth: 260 }}>
              <div className="label">Selecionar playlist</div>
              <select value={selectedPlaylistId} onChange={(e) => setSelectedPlaylistId(e.target.value)}>
                <option value="">—</option>
                {playlistsMeta.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.count})
                  </option>
                ))}
              </select>
            </div>
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
              <button className="btn btn--primary" onClick={onAddToPlaylist} disabled={!selectedPlaylistId || !addSongId}>
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
                    <button className="btn" onClick={() => moveItem(idx, idx - 1)} disabled={idx === 0}>
                      ↑
                    </button>
                    <button
                      className="btn"
                      onClick={() => moveItem(idx, idx + 1)}
                      disabled={idx >= ((selectedPlaylist?.items?.length ?? 1) - 1)}
                    >
                      ↓
                    </button>
                    <button className="btn" onClick={() => setCurrentIndex(idx)} disabled={!selectedPlaylist?.items?.length}>
                      Selecionar
                    </button>
                    <button className="btn btn--danger" onClick={() => onRemoveItem(it.id)}>
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              {selectedPlaylistId && !(selectedPlaylist?.items?.length ?? 0) && <div style={{ opacity: 0.7 }}>Playlist vazia.</div>}
              {!selectedPlaylistId && <div style={{ opacity: 0.7 }}>Selecione uma playlist para ver/editar os itens.</div>}
            </div>
          </div>
        </section>
      </div>

      <section className="card player">
        <div className="row row--between">
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Player</div>
            <div style={{ opacity: 0.75, marginTop: 2 }}>
              {currentItem ? (
                <>
                  <strong>{currentItem.song.name}</strong> • <span className="mono">{currentItem.song.bpm} BPM</span>
                </>
              ) : (
                "Selecione uma playlist e escolha uma música."
              )}
            </div>
          </div>
          <div className="row">
            <label className="row" style={{ gap: 8, opacity: 0.9 }}>
              <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
              Som
            </label>
            <button className="btn" onClick={toggleFullscreen} disabled={playerDisabled}>
              {isFullscreenUi ? "Sair do Fullscreen" : "Fullscreen"}
            </button>
          </div>
        </div>

        <div className="beatBox">
          <div className={["beatBox__inner", beatOn ? "beatBox__inner--on" : ""].join(" ")} />
        </div>

        <div className="controls">
          <button className="btn" onClick={prev} disabled={playerDisabled || currentIndex === 0}>
            ◀ Anterior
          </button>
          <button
            className="btn btn--primary btn--big"
            onClick={() => setIsPlaying((p) => !p)}
            disabled={playerDisabled}
          >
            {isPlaying ? "Pausar" : "Play"}
          </button>
          <button
            className="btn"
            onClick={next}
            disabled={playerDisabled || currentIndex >= ((selectedPlaylist?.items?.length ?? 1) - 1)}
          >
            Próxima ▶
          </button>
        </div>
      </section>

      {!!error && <div className="error">{error}</div>}
    </div>
  )

  if (!isFullscreenUi) return main

  return (
    <div className="fullscreen" role="application" aria-label="Metronomo em tela cheia">
      <div className={["fullscreen__stage", beatOn ? "fullscreen__stage--on" : ""].join(" ")} />
      <div className="fullscreen__bar">
        <div className="row row--between">
          <div style={{ opacity: 0.95 }}>
            {currentItem ? (
              <>
                <strong>{currentItem.song.name}</strong> • <span className="mono">{currentItem.song.bpm} BPM</span>
              </>
            ) : (
              "Sem música selecionada"
            )}
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={prev} disabled={playerDisabled || currentIndex === 0}>
              ◀
            </button>
            <button className="btn btn--primary btn--big" onClick={() => setIsPlaying((p) => !p)} disabled={playerDisabled}>
              {isPlaying ? "Pausar" : "Play"}
            </button>
            <button
              className="btn"
              onClick={next}
              disabled={playerDisabled || currentIndex >= ((selectedPlaylist?.items?.length ?? 1) - 1)}
            >
              ▶
            </button>
            <button className="btn" onClick={toggleFullscreen}>
              Sair
            </button>
          </div>
        </div>
        {!!error && <div className="error">{error}</div>}
      </div>
    </div>
  )
}

export default Body
