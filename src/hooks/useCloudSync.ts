import { useEffect, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import type { RawPlaylist, Song } from "../localStore"
import { fetchRemoteData, pushAllData, type RemoteData } from "../lib/cloudStore"

type SyncStatus = "idle" | "syncing" | "synced" | "error"

type UseCloudSyncArgs = {
  user: User | null
  songs: Song[]
  playlists: RawPlaylist[]
  setSongs: (songs: Song[]) => void
  setPlaylists: (playlists: RawPlaylist[]) => void
}

const PUSH_DEBOUNCE_MS = 1000

export function useCloudSync({ user, songs, playlists, setSongs, setPlaylists }: UseCloudSyncArgs) {
  const [status, setStatus] = useState<SyncStatus>("idle")
  const [conflict, setConflict] = useState<RemoteData | null>(null)
  const reconciledForUserId = useRef<string | null>(null)
  const pushTimer = useRef<number | undefined>(undefined)
  const skipNextPush = useRef(false)
  const latestLocal = useRef({ songs, playlists })
  latestLocal.current = { songs, playlists }

  // Initial reconciliation: runs once per login (per user id).
  useEffect(() => {
    if (!user) {
      reconciledForUserId.current = null
      setConflict(null)
      return
    }
    if (reconciledForUserId.current === user.id) return

    let cancelled = false
    fetchRemoteData(user.id).then((remote) => {
      if (cancelled || !remote) return
      const { songs: localSongs, playlists: localPlaylists } = latestLocal.current
      const hasLocal = localSongs.length > 0 || localPlaylists.length > 0
      const hasRemote = remote.songs.length > 0 || remote.playlists.length > 0

      if (hasRemote && hasLocal) {
        setConflict(remote)
        return
      }

      if (hasRemote && !hasLocal) {
        skipNextPush.current = true
        setSongs(remote.songs)
        setPlaylists(remote.playlists)
        reconciledForUserId.current = user.id
        setStatus("synced")
        return
      }

      pushAllData(user.id, localSongs, localPlaylists).then((ok) => {
        if (cancelled) return
        reconciledForUserId.current = user.id
        setStatus(ok ? "synced" : "error")
      })
    })

    return () => {
      cancelled = true
    }
    // Only re-run when the logged-in user changes — songs/playlists are
    // read from latestLocal.current at the time this fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Ongoing debounced push once the initial reconciliation is done.
  useEffect(() => {
    if (!user || reconciledForUserId.current !== user.id) return
    if (skipNextPush.current) {
      skipNextPush.current = false
      return
    }
    const timer = window.setTimeout(() => {
      setStatus("syncing")
      pushAllData(user.id, songs, playlists).then((ok) => setStatus(ok ? "synced" : "error"))
    }, PUSH_DEBOUNCE_MS)
    pushTimer.current = timer
    return () => window.clearTimeout(timer)
  }, [user, songs, playlists])

  function resolveConflict(useRemote: boolean) {
    if (!conflict || !user) return
    if (useRemote) {
      skipNextPush.current = true
      setSongs(conflict.songs)
      setPlaylists(conflict.playlists)
    }
    reconciledForUserId.current = user.id
    setStatus("synced")
    setConflict(null)
  }

  return { status, conflict, resolveConflict }
}
