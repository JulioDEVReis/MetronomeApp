import { useEffect, useMemo, useRef, useState } from "react"
import { Api, type Playlist, type PlaylistItem, type Song } from "../../api"

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

const Body = () => {
  const [songs, setSongs] = useState<Song[]>([])
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string; count: number }>>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("")
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)

  const [songName, setSongName] = useState("")
  const [songBpm, setSongBpm] = useState(120)

  const [playlistName, setPlaylistName] = useState("")

  const [addSongId, setAddSongId] = useState<string>("")

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [isFullscreenUi, setIsFullscreenUi] = useState(false)

  const [error, setError] = useState<string>("")

  const currentItem: PlaylistItem | null = useMemo(() => {
    const items = selectedPlaylist?.items ?? []
    return items.length ? items[Math.min(currentIndex, items.length - 1)] : null
  }, [currentIndex, selectedPlaylist])

  const currentBpm = currentItem?.song?.bpm ?? 120
  const { beatOn } = useMetronome({ bpm: currentBpm, enabled: isPlaying && !!currentItem, soundEnabled })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setError("")
        const [s, p] = await Promise.all([Api.listSongs(), Api.listPlaylists()])
        if (!alive) return
        setSongs(s)
        setPlaylists(p.map((x) => ({ id: x.id, name: x.name, count: x._count?.items ?? 0 })))
      } catch (e: any) {
        if (!alive) return
        setError(e?.message ?? "Erro ao carregar dados.")
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!selectedPlaylistId) {
      setSelectedPlaylist(null)
      setCurrentIndex(0)
      setIsPlaying(false)
      return
    }

    let alive = true
    ;(async () => {
      try {
        setError("")
        const pl = await Api.getPlaylist(selectedPlaylistId)
        if (!alive) return
        setSelectedPlaylist(pl)
        setCurrentIndex(0)
        setIsPlaying(false)
      } catch (e: any) {
        if (!alive) return
        setError(e?.message ?? "Erro ao carregar playlist.")
      }
    })()

    return () => {
      alive = false
    }
  }, [selectedPlaylistId])

  useEffect(() => {
    const onFs = () => {
      const isFs = !!document.fullscreenElement
      setIsFullscreenUi(isFs)
    }
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  async function refreshSongs() {
    const s = await Api.listSongs()
    setSongs(s)
  }

  async function refreshPlaylistsList() {
    const p = await Api.listPlaylists()
    setPlaylists(p.map((x) => ({ id: x.id, name: x.name, count: x._count?.items ?? 0 })))
  }

  async function refreshSelectedPlaylist() {
    if (!selectedPlaylistId) return
    const pl = await Api.getPlaylist(selectedPlaylistId)
    setSelectedPlaylist(pl)
  }

  async function onAddSong() {
    try {
      setError("")
      const bpm = clampInt(Number(songBpm), 20, 300)
      await Api.createSong({ name: songName.trim(), bpm })
      setSongName("")
      setSongBpm(120)
      await refreshSongs()
    } catch (e: any) {
      setError(e?.message ?? "Erro ao criar música.")
    }
  }

  async function onDeleteSong(id: string) {
    try {
      setError("")
      await Api.deleteSong(id)
      await refreshSongs()
      await refreshSelectedPlaylist()
    } catch (e: any) {
      setError(e?.message ?? "Erro ao apagar música.")
    }
  }

  async function onCreatePlaylist() {
    try {
      setError("")
      const pl = await Api.createPlaylist({ name: playlistName.trim() })
      setPlaylistName("")
      await refreshPlaylistsList()
      setSelectedPlaylistId(pl.id)
    } catch (e: any) {
      setError(e?.message ?? "Erro ao criar playlist.")
    }
  }

  async function onAddToPlaylist() {
    if (!selectedPlaylistId || !addSongId) return
    try {
      setError("")
      await Api.addPlaylistItem(selectedPlaylistId, { songId: addSongId })
      setAddSongId("")
      await refreshSelectedPlaylist()
      await refreshPlaylistsList()
    } catch (e: any) {
      setError(e?.message ?? "Erro ao adicionar na playlist.")
    }
  }

  async function onRemoveItem(itemId: string) {
    if (!selectedPlaylistId) return
    try {
      setError("")
      await Api.deletePlaylistItem(selectedPlaylistId, itemId)
      await refreshSelectedPlaylist()
      await refreshPlaylistsList()
      setCurrentIndex(0)
      setIsPlaying(false)
    } catch (e: any) {
      setError(e?.message ?? "Erro ao remover item.")
    }
  }

  async function persistOrder(newItems: PlaylistItem[]) {
    if (!selectedPlaylistId) return
    try {
      setError("")
      const updated = await Api.reorderPlaylistItems(
        selectedPlaylistId,
        newItems.map((x) => x.id),
      )
      setSelectedPlaylist(updated)
    } catch (e: any) {
      setError(e?.message ?? "Erro ao reordenar a playlist.")
      await refreshSelectedPlaylist()
    }
  }

  async function moveItem(from: number, to: number) {
    const items = [...(selectedPlaylist?.items ?? [])]
    if (!items.length) return
    if (from < 0 || from >= items.length) return
    if (to < 0 || to >= items.length) return
    const [it] = items.splice(from, 1)
    if (!it) return
    items.splice(to, 0, it)
    if (selectedPlaylist) setSelectedPlaylist({ ...selectedPlaylist, items })
    setCurrentIndex((idx) => {
      if (idx === from) return to
      if (from < idx && idx <= to) return idx - 1
      if (to <= idx && idx < from) return idx + 1
      return idx
    })
    await persistOrder(items)
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

  const playerDisabled = !currentItem

  const main = (
    <div className="container">
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
            <span className="pill mono">{playlists.length}</span>
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
                {playlists.map((p) => (
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
                    <button className="btn" onClick={() => void moveItem(idx, idx - 1)} disabled={idx === 0}>
                      ↑
                    </button>
                    <button
                      className="btn"
                      onClick={() => void moveItem(idx, idx + 1)}
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
      <div className={["fullscreen__stage", beatOn ? "fullscreen__stage--on" : ""].join(" ")}>
        {/* Mantemos vazio para piscar “a tela inteira” */}
      </div>
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