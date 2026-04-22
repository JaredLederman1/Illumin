import { createBrowserClient } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazily initialized so build-time static rendering doesn't fail without env vars
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
    _supabase = createBrowserClient(url, key)
  }
  return _supabase
}

// Proxy so callers can still write `supabase.auth.signIn(...)` etc.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return getSupabase()[prop as keyof SupabaseClient]
  },
})

// Server-side admin client using the service role key. Returns a fresh
// instance per call so request-scoped usage cannot accidentally share auth
// state. Do not import this anywhere that runs in the browser.
export function createServerAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  )
}
