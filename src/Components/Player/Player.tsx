import { useEffect, useRef, useState } from "react"
import type { PlaylistItem } from "../../localStore"

type PlayerProps = {
  currentItem: PlaylistItem | null
  isPlaying: boolean
  currentIndex: number
  selectedPlaylistLength: number
  onPlayPause: () => void
  onPrev: () => void
  onNext: () => void
}

function useMetronome(bpm: number, enabled: boolean, soundEnabled: boolean) {
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

const Player = ({
  currentItem,
  isPlaying,
  currentIndex,
  selectedPlaylistLength,
  onPlayPause,
  onPrev,
  onNext,
}: PlayerProps) => {
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [isFullscreenUi, setIsFullscreenUi] = useState(false)

  const currentBpm = currentItem?.song?.bpm ?? 120
  const { beatOn } = useMetronome(currentBpm, isPlaying && !!currentItem, soundEnabled)

  useEffect(() => {
    const onFs = () => {
      const isFs = !!document.fullscreenElement
      setIsFullscreenUi(isFs)
    }
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await safeFullscreenEnter()
      else await safeFullscreenExit()
    } catch (e) {
      console.error("Fullscreen error:", e)
    }
  }

  const playerDisabled = !currentItem

  if (isFullscreenUi) {
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
              <button className="btn" onClick={onPrev} disabled={playerDisabled || currentIndex === 0}>
                ◀
              </button>
              <button className="btn btn--primary btn--big" onClick={onPlayPause} disabled={playerDisabled}>
                {isPlaying ? "Pausar" : "Play"}
              </button>
              <button
                className="btn"
                onClick={onNext}
                disabled={playerDisabled || currentIndex >= (selectedPlaylistLength - 1)}
              >
                ▶
              </button>
              <button className="btn" onClick={toggleFullscreen}>
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
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
        <button className="btn" onClick={onPrev} disabled={playerDisabled || currentIndex === 0}>
          ◀ Anterior
        </button>
        <button
          className="btn btn--primary btn--big"
          onClick={onPlayPause}
          disabled={playerDisabled}
        >
          {isPlaying ? "Pausar" : "Play"}
        </button>
        <button
          className="btn"
          onClick={onNext}
          disabled={playerDisabled || currentIndex >= (selectedPlaylistLength - 1)}
        >
          Próxima ▶
        </button>
      </div>
    </section>
  )
}

export default Player
