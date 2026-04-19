import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

async function getUser(request: NextRequest) {
  // Try Bearer token first (profile page edit form)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7))
    if (user) return user
  }

  // Fall back to session cookies (onboarding page)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function countAssetAccounts(userId: string): Promise<number> {
  return prisma.account.count({
    where: { userId, classification: 'asset' },
  })
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [profile, assetCount] = await Promise.all([
      prisma.onboardingProfile.findUnique({ where: { userId: user.id } }),
      countAssetAccounts(user.id),
    ])

    // Derived flag: onboarding profile exists but no asset-classified account is
    // linked. The dashboard can use this to render a graceful-degradation view.
    const skippedAssetLink = profile !== null && assetCount === 0

    return NextResponse.json({ profile, skippedAssetLink })
  } catch (error) {
    console.error('[onboarding GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { age, annualIncome, savingsRate, retirementAge, skipped } = body

    if (
      typeof age !== 'number' ||
      typeof annualIncome !== 'number' ||
      typeof savingsRate !== 'number' ||
      typeof retirementAge !== 'number'
    ) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }

    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.user.upsert({
      where: { email: user.email! },
      update: {},
      create: { id: user.id, email: user.email! },
    })

    // Onboarding completes only when at least one asset-classified account
    // (checking, savings, investment, etc.) is linked, or the user has
    // explicitly opted out via the "Skip for now" affordance on the Plaid step.
    // Credit cards alone are not sufficient to build a full financial picture.
    if (skipped !== true) {
      const assetCount = await countAssetAccounts(user.id)
      if (assetCount === 0) {
        return NextResponse.json(
          {
            error: 'asset_account_required',
            message:
              'Illumin needs at least one checking, savings, or investment account to show your full financial picture. Credit cards alone only tell half the story.',
          },
          { status: 400 }
        )
      }
    }

    const profile = await prisma.onboardingProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, age, annualIncome, savingsRate, retirementAge },
      update: { age, annualIncome, savingsRate, retirementAge },
    })

    return NextResponse.json({ success: true, profile, skipped: skipped === true })
  } catch (error) {
    console.error('[onboarding POST]', error)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
