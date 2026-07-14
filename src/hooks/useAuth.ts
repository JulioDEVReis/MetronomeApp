import { useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { getSupabase } from "../lib/supabaseClient"

type AuthState = {
  session: Session | null
  user: User | null
  loading: boolean
  configured: boolean
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const supabase = getSupabase()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => sub.subscription.unsubscribe()
  }, [supabase])

  async function signInWithMagicLink(email: string) {
    if (!supabase) return { error: "Conta indisponível: configuração em falta." }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return {
    session,
    user: session?.user ?? null,
    loading,
    configured: !!supabase,
    signInWithMagicLink,
    signOut,
  }
}
