import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Supabase auth callback. Handles redirects from:
 *  - Password recovery emails (type=recovery) → /auth/update-password
 *  - Signup confirmation emails (type=signup | email) → /onboarding
 *  - Anything else with a valid code → /dashboard
 *
 * Writes the session cookies returned by exchangeCodeForSession before
 * redirecting, so the destination page has a usable session.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const type = url.searchParams.get('type')

  // Default destination by email type. Any unknown type falls through to the
  // dashboard, which will itself redirect to /onboarding if profile.completedAt
  // is null (see Part 4).
  const destinationForType =
    type === 'recovery'
      ? '/auth/update-password'
      : type === 'signup' || type === 'email'
        ? '/onboarding'
        : '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL(destinationForType, request.url))
  }

  const response = NextResponse.redirect(new URL(destinationForType, request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/auth/login?error=callback', request.url))
  }

  return response
}
