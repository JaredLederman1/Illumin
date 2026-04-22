import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/adminAllowlist'

function sanitize(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/')) return null
  if (raw.startsWith('//')) return null
  return raw
}

/**
 * Returns the destination a just-authenticated user should be routed to.
 *
 * Does NOT check MFA — callers who care about MFA gating should check AAL on
 * the client via supabase.auth.mfa.getAuthenticatorAssuranceLevel first. The
 * server cannot read the AAL without re-authenticating the full cookie chain,
 * and the client already has the information.
 *
 * Priority order: admin → onboarding incomplete → intended → dashboard.
 */
export async function POST(request: Request) {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { authUser, dbUser } } = result

  let intended: string | null = null
  try {
    const body = (await request.json()) as { intended?: string }
    intended = sanitize(body.intended)
  } catch {
    intended = null
  }

  if (isAdminEmail(authUser.email)) {
    return NextResponse.json({ destination: '/admin' })
  }

  const profile = await prisma.onboardingProfile.findUnique({
    where: { userId: dbUser.id },
    select: { completedAt: true },
  })

  if (!profile?.completedAt) {
    return NextResponse.json({ destination: '/onboarding' })
  }

  return NextResponse.json({ destination: intended ?? '/dashboard' })
}
