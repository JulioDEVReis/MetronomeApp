import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import NoSleep from "nosleep.js"
import type { PlaylistItem } from "../../localStore"

type PlayerProps = {
  currentItem: PlaylistItem | null
  isPlaying: boolean
  currentIndex: number
  selectedPlaylistLength: number
  onPlayPause: () => void
  onPrev: () => void
  onNext: () => void
  onSaveBpm: (songId: string, bpm: number) => void
}

const ACCENT_FREQ = 1600
const BEAT_FREQ = 1000
const PEAK_GAIN = 0.9
const BEAT_GAIN_RATIO = 0.65

function useMetronome(
  bpm: number,
  enabled: boolean,
  soundEnabled: boolean,
  volume: number,
  beatsPerMeasure: number,
) {
  const [beatOn, setBeatOn] = useState(false)
  const [isAccentBeat, setIsAccentBeat] = useState(false)
  const audioRef = useRef<AudioContext | null>(null)

  // Read via refs so toggling sound or dragging the volume slider doesn't
  // restart the interval (which would reset the measure's beat count).
  const soundEnabledRef = useRef(soundEnabled)
  const volumeRef = useRef(volume)
  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])
  useEffect(() => {
    volumeRef.current = volume
  }, [volume])

  useEffect(() => {
    if (!enabled) return

    const intervalMs = Math.round(60000 / Math.max(1, bpm))
    const beatsInMeasure = Math.max(1, Math.round(beatsPerMeasure))
    let alive = true
    let beatIndex = 0

    const tick = () => {
      if (!alive) return
      const accent = beatIndex === 0
      setBeatOn(true)
      setIsAccentBeat(accent)

      if (soundEnabledRef.current) {
        const AudioContextClass: typeof AudioContext | undefined =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (AudioContextClass) {
          if (!audioRef.current) audioRef.current = new AudioContextClass()
          const ctx = audioRef.current
          if (ctx.state === "suspended") void ctx.resume()

          const now = ctx.currentTime
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = "square"
          osc.frequency.value = accent ? ACCENT_FREQ : BEAT_FREQ
          const peak = Math.max(0.0001, volumeRef.current * PEAK_GAIN * (accent ? 1 : BEAT_GAIN_RATIO))
          gain.gain.setValueAtTime(0.0001, now)
          gain.gain.exponentialRampToValueAtTime(peak, now + 0.003)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now)
          osc.stop(now + 0.1)
        }
      }

      beatIndex = (beatIndex + 1) % beatsInMeasure

      window.setTimeout(() => {
        if (!alive) return
        setBeatOn(false)
      }, Math.min(120, Math.floor(intervalMs / 2)))
    }

    tick()
    const t = window.setInterval(tick, intervalMs)

    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [bpm, enabled, beatsPerMeasure])

  return { beatOn: enabled && beatOn, isAccentBeat: enabled && isAccentBeat }
}

const MIN_BPM = 20
const MAX_BPM = 300
const TAP_MAX_SAMPLES = 8
const TAP_RESET_GAP_MS = 2000

function clampBpm(n: number) {
  return Math.max(MIN_BPM, Math.min(MAX_BPM, n))
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
  onSaveBpm,
}: PlayerProps) => {
  const { t } = useTranslation()
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreenUi, setIsFullscreenUi] = useState(false)
  const [bpmOverride, setBpmOverride] = useState<number | null>(null)
  const [lastSongId, setLastSongId] = useState(currentItem?.song?.id)
  const noSleepRef = useRef<NoSleep | null>(null)
  const tapTimestampsRef = useRef<number[]>([])

  // BPM adjustments only affect live playback, never the saved song: reset
  // them whenever the selected song changes (React-recommended pattern for
  // adjusting state during render instead of in an effect).
  if (currentItem?.song?.id !== lastSongId) {
    setLastSongId(currentItem?.song?.id)
    setBpmOverride(null)
  }

  useEffect(() => {
    tapTimestampsRef.current = []
  }, [lastSongId])

  const savedBpm = currentItem?.song?.bpm ?? 120
  const beatsPerMeasure = currentItem?.song?.beatsPerMeasure ?? 4
  const currentBpm = bpmOverride ?? savedBpm
  const bpmAdjusted = bpmOverride !== null && bpmOverride !== savedBpm
  const { beatOn, isAccentBeat } = useMetronome(
    currentBpm,
    isPlaying && !!currentItem,
    soundEnabled,
    volume,
    beatsPerMeasure,
  )

  function adjustBpm(delta: number) {
    if (!currentItem) return
    setBpmOverride((prev) => clampBpm((prev ?? savedBpm) + delta))
  }

  function saveBpm() {
    if (!currentItem || !bpmAdjusted) return
    onSaveBpm(currentItem.song.id, currentBpm)
    setBpmOverride(null)
  }

  function handleTapTempo() {
    if (!currentItem) return
    const now = performance.now()
    const taps = tapTimestampsRef.current
    if (taps.length && now - taps[taps.length - 1]! > TAP_RESET_GAP_MS) {
      taps.length = 0
    }
    taps.push(now)
    if (taps.length > TAP_MAX_SAMPLES) taps.shift()
    if (taps.length < 2) return

    const intervals: number[] = []
    for (let i = 1; i < taps.length; i++) intervals.push(taps[i]! - taps[i - 1]!)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    setBpmOverride(clampBpm(Math.round(60000 / avgInterval)))
  }

  useEffect(() => {
    noSleepRef.current = new NoSleep()
  }, [])

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
      <div className="fullscreen" role="application" aria-label={t("player.title")}>
        <div
          className={[
            "fullscreen__stage",
            beatOn ? "fullscreen__stage--on" : "",
            beatOn && isAccentBeat ? "fullscreen__stage--accent" : "",
          ].join(" ")}
        />
        <div className="fullscreen__bar">
          <div className="row row--between">
            <div style={{ opacity: 0.95 }}>
              {currentItem ? (
                <>
                  {currentItem.song.note && (
                    <div style={{ fontSize: '20px', marginBottom: 4, opacity: 0.85, fontWeight: 500 }}>
                      {currentItem.song.note}
                    </div>
                  )}
                  <strong>{currentItem.song.name}</strong> •{" "}
                  <span className="mono">
                    {currentBpm} {t("player.bpmUnit")}{bpmAdjusted ? t("player.adjustedSuffix") : ""} • {t("player.beatsInline", { count: beatsPerMeasure })}
                  </span>
                  {bpmAdjusted && (
                    <button className="btn btn--small btn--primary" style={{ marginLeft: 8 }} onClick={saveBpm}>
                      {t("player.saveBpm")}
                    </button>
                  )}
                </>
              ) : (
                t("player.noSongSelected")
              )}
            </div>
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn" onClick={onPrev} disabled={playerDisabled || currentIndex === 0}>
                ◀
              </button>
              <button
                className="btn btn--bpm"
                onClick={() => adjustBpm(-1)}
                disabled={playerDisabled || currentBpm <= MIN_BPM}
                aria-label={t("player.decreaseBpmAriaLabel")}
              >
                −
              </button>
              <button className="btn btn--primary btn--big" onClick={onPlayPause} disabled={playerDisabled}>
                {isPlaying ? t("player.pause") : t("player.play")}
              </button>
              <button
                className="btn btn--bpm"
                onClick={() => adjustBpm(1)}
                disabled={playerDisabled || currentBpm >= MAX_BPM}
                aria-label={t("player.increaseBpmAriaLabel")}
              >
                +
              </button>
              <button
                className="btn"
                onClick={onNext}
                disabled={playerDisabled || currentIndex >= (selectedPlaylistLength - 1)}
              >
                ▶
              </button>
              <button className="btn" onClick={handleTapTempo} disabled={playerDisabled}>
                {t("player.tap")}
              </button>
              <button className="btn" onClick={toggleFullscreen}>
                {t("player.exit")}
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
          <div style={{ fontWeight: 800, fontSize: 16 }}>{t("player.title")}</div>
          <div style={{ opacity: 0.75, marginTop: 2 }}>
            {currentItem ? (
              <>
                <strong>{currentItem.song.name}</strong> •{" "}
                <span className="mono">
                  {currentBpm} {t("player.bpmUnit")}{bpmAdjusted ? t("player.adjustedSuffix") : ""} • {t("player.beatsInline", { count: beatsPerMeasure })}
                </span>
                {bpmAdjusted && (
                  <button className="btn btn--small btn--primary" style={{ marginLeft: 8 }} onClick={saveBpm}>
                    {t("player.saveBpm")}
                  </button>
                )}
              </>
            ) : (
              t("player.noPlaylistSelected")
            )}
          </div>
        </div>
        <div className="row">
          <label className="row" style={{ gap: 8, opacity: 0.9 }}>
            <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
            {t("player.sound")}
          </label>
          <label className="row" style={{ gap: 8, opacity: 0.9 }}>
            <span style={{ fontSize: 13 }}>{t("player.volume")}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              disabled={!soundEnabled}
              aria-label={t("player.volumeAriaLabel")}
            />
          </label>
          <button className="btn" onClick={toggleFullscreen} disabled={playerDisabled}>
            {isFullscreenUi ? t("player.exitFullscreen") : t("player.fullscreen")}
          </button>
        </div>
      </div>

      <div className="beatBox">
        <div
          className={[
            "beatBox__inner",
            beatOn ? "beatBox__inner--on" : "",
            beatOn && isAccentBeat ? "beatBox__inner--accent" : "",
          ].join(" ")}
        />
      </div>

      <div className="controls">
        <button className="btn" onClick={onPrev} disabled={playerDisabled || currentIndex === 0}>
          ◀
        </button>
        <button
          className="btn btn--bpm"
          onClick={() => adjustBpm(-1)}
          disabled={playerDisabled || currentBpm <= MIN_BPM}
          aria-label={t("player.decreaseBpmAriaLabel")}
        >
          −
        </button>
        <button
          className="btn btn--primary btn--big"
          onClick={onPlayPause}
          disabled={playerDisabled}
        >
          {isPlaying ? t("player.pause") : t("player.play")}
        </button>
        <button
          className="btn btn--bpm"
          onClick={() => adjustBpm(1)}
          disabled={playerDisabled || currentBpm >= MAX_BPM}
          aria-label={t("player.increaseBpmAriaLabel")}
        >
          +
        </button>
        <button
          className="btn"
          onClick={onNext}
          disabled={playerDisabled || currentIndex >= (selectedPlaylistLength - 1)}
        >
          ▶
        </button>
        <button className="btn" onClick={handleTapTempo} disabled={playerDisabled}>
          {t("player.tap")}
        </button>
      </div>
    </section>
  )
}

export default Player
