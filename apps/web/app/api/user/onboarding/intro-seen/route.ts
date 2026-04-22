import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

async function getUser(request: NextRequest) {
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

// Marks the cinematic welcome intro as seen for the authenticated user. An
// upsert is required because the welcome intro can fire before Step 1 has
// been saved, so an OnboardingProfile row may not yet exist. The minimal
// create path writes only the intro timestamp; Step 1 fields are filled in
// by the main onboarding POST once the user reaches them.
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.user.upsert({
      where:  { email: user.email! },
      update: {},
      create: { id: user.id, email: user.email! },
    })

    const now = new Date()
    const existing = await prisma.onboardingProfile.findUnique({
      where: { userId: user.id },
    })

    if (existing) {
      await prisma.onboardingProfile.update({
        where: { userId: user.id },
        data:  { introSeenAt: now },
      })
    } else {
      // Minimal row. Step 1 columns are NOT NULL in the schema, so we
      // fall back to zeros that will be overwritten by the first real
      // Step 1 save. introSeenAt is the only field this endpoint
      // actually sets from user intent.
      await prisma.onboardingProfile.create({
        data: {
          userId:        user.id,
          age:           0,
          annualIncome:  0,
          savingsRate:   0,
          retirementAge: 0,
          introSeenAt:   now,
        },
      })
    }

    return NextResponse.json({ success: true, introSeenAt: now.toISOString() })
  } catch (error) {
    console.error('[onboarding intro-seen POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
