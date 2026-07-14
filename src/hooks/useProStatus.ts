import { useCallback, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { getSupabase } from "../lib/supabaseClient"

const APP_ID = "metronome"

export function useProStatus(user: User | null) {
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase || !user) {
      setIsPro(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("entitlements")
      .select("is_pro")
      .eq("user_id", user.id)
      .eq("app", APP_ID)
      .maybeSingle()
    setIsPro(!!data?.is_pro)
    setLoading(false)
  }, [user])

  useEffect(() => {
    // Defer to a microtask so no setState call happens synchronously
    // within the effect body itself (refresh sets loading/isPro before
    // its first await when called directly).
    void Promise.resolve().then(refresh)
  }, [refresh])

  return { isPro, loading, refresh }
}
