import { useEffect, useMemo, useState } from "react"
import Navbar from "./Components/Navbar/Navbar"
import Musicas from "./Components/Musicas/Musicas"
import Playlists from "./Components/Playlists/Playlists"
import Player from "./Components/Player/Player"
import Backup from "./Components/Backup/Backup"
import {
  type AppData,
  type Playlist,
  type PlaylistItem,
  type RawPlaylistItem,
  type RawPlaylist,
  type Song,
  loadData,
  newId,
  saveData,
} from "./localStore"

type NavItem = "home" | "musicas" | "playlists" | "player" | "backup"

function toAppData(songs: Song[], playlists: RawPlaylist[]): AppData {
  return { version: 1, songs, playlists }
}

const App = () => {
  const [songs, setSongs] = useState<Song[]>([])
  const [playlists, setPlaylists] = useState<RawPlaylist[]>([])
  const [hydrated, setHydrated] = useState(false)

  const [activeItem, setActiveItem] = useState<NavItem>("home")

  const [selectedPlaylistId, setSelectedPlaylistId] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

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

  const selectedPlaylist: Playlist | null = useMemo(() => {
    console.log('Resolving playlist', selectedPlaylistId, 'songs count', songs.length, 'playlists count', playlists.length)
    if (!selectedPlaylistId) return null
    const raw = playlists.find((p) => p.id === selectedPlaylistId)
    if (!raw) {
      console.log('No raw playlist found for id', selectedPlaylistId)
      return null
    }
    console.log('Raw playlist items', raw.items.length, raw.items.slice(0,3))
    const byId = new Map(songs.map((s) => [s.id, s]))
    const items = [...raw.items]
      .sort((a, b) => a.position - b.position)
      .map((it) => {
        const song = byId.get(it.songId)
        if (!song) {
          console.log('Song not found for songId', it.songId)
          return null
        }
        return { id: it.id, position: it.position, song } as PlaylistItem
      })
      .filter((item): item is PlaylistItem => item !== null)
    console.log('Resolved items', items.length)
    return { id: raw.id, name: raw.name, items } as Playlist
  }, [selectedPlaylistId, playlists, songs])

  const currentItem: PlaylistItem | null = useMemo(() => {
    const items = selectedPlaylist?.items ?? []
    return items.length ? items[Math.min(currentIndex, items.length - 1)] : null
  }, [currentIndex, selectedPlaylist])

  useEffect(() => {
    if (!selectedPlaylistId) {
      setCurrentIndex(0)
      setIsPlaying(false)
      return
    }
    setCurrentIndex(0)
    setIsPlaying(false)
  }, [selectedPlaylistId])

  function setPlaylistById(id: string, fn: (pl: RawPlaylist) => RawPlaylist) {
    setPlaylists((prev) => prev.map((p) => (p.id === id ? fn(p) : p)))
  }

// Musicas handlers
  function onAddSong(name: string, bpm: number, note: string) {
    setSongs((s) => [...s, { id: newId(), name, bpm, note }])
  }

  function onDeleteSong(id: string) {
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

  function onUpdateSong(id: string, name: string, bpm: number, note: string) {
    setSongs((s) => s.map((song) => 
      song.id === id ? { ...song, name, bpm, note } : song
    ))
  }

  // Playlists handlers
  function onCreatePlaylist(name: string) {
    const id = newId()
    setPlaylists((p) => [...p, { id, name, items: [] }])
    setSelectedPlaylistId(id)
  }

  function onAddToPlaylist(playlistId: string, songId: string) {
    setPlaylistById(playlistId, (pl) => {
      const nextPos = (pl.items.reduce((m: number, it: RawPlaylistItem) => Math.max(m, it.position), 0) || 0) + 1
      return {
        ...pl,
        items: [...pl.items, { id: newId(), position: nextPos, songId }],
      }
    })
  }

  function onRemoveItem(playlistId: string, itemId: string) {
    setPlaylistById(playlistId, (pl) => {
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

  function onMoveItem(playlistId: string, from: number, to: number) {
    const items = [...(selectedPlaylist?.items ?? [])]
    if (!items.length) return
    if (from < 0 || from >= items.length) return
    if (to < 0 || to >= items.length) return
    const [it] = items.splice(from, 1)
    if (!it) return
    items.splice(to, 0, it)
    setPlaylistById(playlistId, (pl) => ({
      ...pl,
      items: items.map((it, idx) => ({
        id: it.id,
        position: idx + 1,
        songId: it.song.id,
      })),
    }))
    setCurrentIndex((idx) => {
      if (idx === from) return to
      if (from < idx && idx <= to) return idx - 1
      if (to <= idx && idx < from) return idx + 1
      return idx
    })
  }

  function onSelectItem(index: number) {
    setCurrentIndex(index)
  }

  function onDeletePlaylist(id: string) {
    if (!confirm(`Eliminar playlist "${playlists.find(p => p.id === id)?.name || id}"?`)) return
    setPlaylists((p) => p.filter((pl) => pl.id !== id))
    setSelectedPlaylistId("")
    setCurrentIndex(0)
    setIsPlaying(false)
  }

  function onBulkDeleteSongs(ids: string[]) {
    if (!confirm(`Eliminar ${ids.length} música(s) selecionada(s)?`)) return
    for (const id of ids) {
      onDeleteSong(id)
    }
  }

  // Player handlers
  function onPlayPause() {
    setIsPlaying((p) => !p)
  }

  function onPrev() {
    const items = selectedPlaylist?.items ?? []
    if (!items.length) return
    setCurrentIndex((i) => (i <= 0 ? 0 : i - 1))
  }

  function onNext() {
    const items = selectedPlaylist?.items ?? []
    if (!items.length) return
    setCurrentIndex((i) => (i >= items.length - 1 ? items.length - 1 : i + 1))
  }

  // Backup handlers
  function onImportJson(data: AppData) {
    setSongs(data.songs)
    setPlaylists(data.playlists)
    setSelectedPlaylistId("")
    setCurrentIndex(0)
    setIsPlaying(false)
  }

  function onImportCsv(imported: Song[]) {
    setSongs((prev) => {
      const byName = new Map(prev.map((s) => [s.name.toLowerCase(), s]))
      for (const s of imported) {
        byName.set(s.name.toLowerCase(), s)
      }
      return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  // Navigation handlers
  const handleNavigate = (item: NavItem) => {
    setActiveItem(item)
    if (item === "player" && !selectedPlaylistId) {
      // Stay in home if no playlist selected
      setActiveItem("home")
    }
  }

  const renderContent = () => {
    switch (activeItem) {
      case "musicas":
        return (
          <Musicas
            songs={songs}
            onAddSong={onAddSong}
            onDeleteSong={onDeleteSong}
            onUpdateSong={onUpdateSong}
            onBulkDeleteSongs={onBulkDeleteSongs}
          />
        )
      case "playlists":
        return (
            <Playlists
              songs={songs}
              playlists={playlists}
              selectedPlaylistId={selectedPlaylistId}
              currentIndex={currentIndex}
              onSelectPlaylist={setSelectedPlaylistId}
              onCreatePlaylist={onCreatePlaylist}
              onAddToPlaylist={onAddToPlaylist}
              onRemoveItem={onRemoveItem}
              onMoveItem={onMoveItem}
              onSelectItem={onSelectItem}
              onDeletePlaylist={onDeletePlaylist}
            />
        )
      case "player":
        return (
          <Player
            currentItem={currentItem}
            isPlaying={isPlaying}
            currentIndex={currentIndex}
            selectedPlaylistLength={selectedPlaylist?.items?.length ?? 0}
            onPlayPause={onPlayPause}
            onPrev={onPrev}
            onNext={onNext}
          />
        )
      case "backup":
        return (
          <Backup
            songs={songs}
            playlists={playlists}
            onImportJson={onImportJson}
            onImportCsv={onImportCsv}
          />
        )
case "home":
      default:
        return (
          <div className="container">
            <Playlists
              songs={songs}
              playlists={playlists}
              selectedPlaylistId={selectedPlaylistId}
              currentIndex={currentIndex}
              onSelectPlaylist={setSelectedPlaylistId}
              onCreatePlaylist={onCreatePlaylist}
              onAddToPlaylist={onAddToPlaylist}
              onRemoveItem={onRemoveItem}
              onMoveItem={onMoveItem}
              onSelectItem={onSelectItem}
              onDeletePlaylist={onDeletePlaylist}
            />

            <Player
              currentItem={currentItem}
              isPlaying={isPlaying}
              currentIndex={currentIndex}
              selectedPlaylistLength={selectedPlaylist?.items?.length ?? 0}
              onPlayPause={onPlayPause}
              onPrev={onPrev}
              onNext={onNext}
            />
          </div>
        )
    }
  }

  return (
    <>
      <Navbar activeItem={activeItem} onNavigate={handleNavigate} />
      <main>{renderContent()}</main>
    </>
  )
}

export default App
