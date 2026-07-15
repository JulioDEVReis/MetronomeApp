import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation()
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
      setError(t("musicas.errorDuplicateName"))
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
      setError(t("musicas.errorEmptyName"))
      return
    }
    const lowerName = name.toLowerCase()
    if (songs.some((s) => s.id !== editingId && s.name.toLowerCase() === lowerName)) {
      setError(t("musicas.errorDuplicateName"))
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
        <strong>{t("musicas.title")}</strong>
        <span className="pill mono">{isPro ? songs.length : `${songs.length}/${FREE_SONG_LIMIT}`}</span>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ flex: 1, minWidth: 220 }}>
          <div className="label">{t("musicas.name")}</div>
          <input value={songName} onChange={(e) => setSongName(e.target.value)} placeholder={t("musicas.namePlaceholder")} />
        </div>
        <div className="field" style={{ width: 140 }}>
          <div className="label">{t("musicas.bpm")}</div>
          <input
            value={songBpm}
            onChange={(e) => setSongBpm(Number(e.target.value))}
            type="number"
            min={20}
            max={300}
          />
        </div>
        <div className="field" style={{ width: 120 }}>
          <div className="label">{t("musicas.beatsPerMeasure")}</div>
          <input
            value={songBeats}
            onChange={(e) => setSongBeats(Number(e.target.value))}
            type="number"
            min={1}
            max={12}
            title={t("musicas.beatsPerMeasureHint")}
          />
        </div>
        <button className="btn btn--primary" onClick={handleAddSong} disabled={!songName.trim() || atFreeLimit}>
          {t("musicas.add")}
        </button>
      </div>

      {atFreeLimit && (
        <UpgradeHint
          message={t("musicas.limitReached", { count: FREE_SONG_LIMIT })}
          onGoToConta={onGoToConta}
        />
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <div className="label">
            {t("musicas.noteLabel", { count: MAX_NOTE_LENGTH })}
          </div>
          <input
            value={songNote}
            onChange={(e) => setSongNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
            placeholder={t("musicas.notePlaceholder")}
          />
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <div className="label">{t("musicas.searchByName")}</div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("musicas.searchPlaceholder")}
          />
        </div>
        <div className="field" style={{ width: 200 }}>
          <div className="label">{t("musicas.sortBy")}</div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
            <option value="none">{t("musicas.sortDefault")}</option>
            <option value="name-asc">{t("musicas.sortNameAsc")}</option>
            <option value="name-desc">{t("musicas.sortNameDesc")}</option>
            <option value="bpm-asc">{t("musicas.sortBpmAsc")}</option>
            <option value="bpm-desc">{t("musicas.sortBpmDesc")}</option>
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
                      <div className="label">{t("musicas.name")}</div>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder={t("musicas.namePlaceholderEdit")}
                        autoFocus
                      />
                    </div>
                    <div className="row" style={{ gap: 12 }}>
                      <div className="field" style={{ width: 100 }}>
                        <div className="label">{t("musicas.bpm")}</div>
                        <input
                          value={editBpm}
                          onChange={(e) => setEditBpm(Number(e.target.value))}
                          type="number"
                          min={20}
                          max={300}
                        />
                      </div>
                      <div className="field" style={{ width: 100 }}>
                        <div className="label">{t("musicas.beatsPerMeasure")}</div>
                        <input
                          value={editBeats}
                          onChange={(e) => setEditBeats(Number(e.target.value))}
                          type="number"
                          min={1}
                          max={12}
                          title={t("musicas.beatsPerMeasureHint")}
                        />
                      </div>
                      <div className="field" style={{ flex: 1 }}>
                        <div className="label">{t("musicas.note")}</div>
                        <input
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
                          placeholder={t("musicas.notePlaceholder")}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn--primary btn--small" onClick={handleUpdateSong}>
                      {t("musicas.save")}
                    </button>
                    <button className="btn btn--secondary btn--small" onClick={handleCancelEdit}>
                      {t("musicas.cancel")}
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
                        {t("musicas.songSummary", { bpm: s.bpm, count: s.beatsPerMeasure })}
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
                      {t("musicas.edit")}
                    </button>
                    <button className="btn btn--danger btn--small" onClick={() => onDeleteSong(s.id)}>
                      {t("musicas.delete")}
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
        {!songs.length && <div style={{ opacity: 0.7 }}>{t("musicas.noSongsYet")}</div>}
        {!!songs.length && !visibleSongs.length && (
          <div style={{ opacity: 0.7 }}>{t("musicas.noResultsFor", { query: searchQuery })}</div>
        )}
        {selectedSongIds.size > 0 && (
          <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn--danger" onClick={handleBulkDelete}>
              {t("musicas.deleteSelected", { count: selectedSongIds.size })}
            </button>
          </div>
        )}
      </div>

      {!!error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </section>
  )
}

export default Musicas
