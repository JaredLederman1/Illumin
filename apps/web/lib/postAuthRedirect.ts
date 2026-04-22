'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Decide where to route a just-authenticated user.
 *
 * Flow:
 *  1. Check MFA on the client. If aal2 is needed, return
 *     `/auth/mfa/verify?redirect=<final>` where <final> is whatever the
 *     server destination route ends up returning for the eventual post-MFA
 *     redirect.
 *  2. Otherwise fetch /api/auth/post-login-destination which handles admin
 *     gating and onboarding completion gating server-side (those decisions
 *     require ADMIN_EMAILS + a DB lookup, neither of which belong on the
 *     client).
 *
 * Callers should `router.push(await getPostAuthRedirect(...))`.
 */
export async function getPostAuthRedirect(params: {
  supabase: SupabaseClient
  intendedDestination?: string | null
}): Promise<string> {
  const { supabase, intendedDestination } = params

  // 1. Fetch the underlying (post-MFA) destination so we can forward it
  //    through the /auth/mfa/verify?redirect= query param if MFA is needed.
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? null

  let destination = '/dashboard'
  if (token) {
    try {
      const res = await fetch('/api/auth/post-login-destination', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ intended: intendedDestination ?? null }),
      })
      if (res.ok) {
        const data = (await res.json()) as { destination?: string }
        if (data.destination && data.destination.startsWith('/')) {
          destination = data.destination
        }
      }
    } catch {
      // Fall through to the default /dashboard; the layout gates will still
      // enforce the right behavior if the user is not allowed where they land.
    }
  }

  // 2. MFA check. If the user has MFA enrolled but this session is still at
  //    aal1, bounce them through verify with the final destination preserved.
  const { data: levelData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (levelData?.nextLevel === 'aal2' && levelData.currentLevel !== 'aal2') {
    return `/auth/mfa/verify?redirect=${encodeURIComponent(destination)}`
  }

  return destination
}
