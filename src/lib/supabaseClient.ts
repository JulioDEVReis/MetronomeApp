import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null | undefined

/**
 * Returns the shared Supabase client, or null if VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY aren't configured — callers must handle the null
 * case so the app keeps working fully offline/anonymous without them.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client

  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    client = null
    return client
  }

  client = createClient(url, anonKey)
  return client
}
