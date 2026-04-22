import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Prisma } from '@prisma/client'
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

    const skippedAssetLink = profile !== null && assetCount === 0

    return NextResponse.json({ profile, skippedAssetLink })
  } catch (error) {
    console.error('[onboarding GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Field-level builders: accept raw body, normalize into Prisma create / update
// shapes. Partial saves only include the fields actually present in the body
// so a Step 2 save does not blow away Step 4 data that was written later.
type Body = Record<string, unknown>

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  return undefined
}

function str(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim() !== '') return v.trim()
  return undefined
}

function buildWritableFields(body: Body) {
  const fields: Record<string, unknown> = {}

  const age           = num(body.age)
  const annualIncome  = num(body.annualIncome)
  const savingsRate   = num(body.savingsRate)
  const retirementAge = num(body.retirementAge)
  if (age           !== undefined) fields.age           = age
  if (annualIncome  !== undefined) fields.annualIncome  = annualIncome
  if (savingsRate   !== undefined) fields.savingsRate   = savingsRate
  if (retirementAge !== undefined) fields.retirementAge = retirementAge

  const locationCity  = str(body.locationCity)
  const locationState = str(body.locationState)
  if ('locationCity'  in body) fields.locationCity  = locationCity  ?? null
  if ('locationState' in body) fields.locationState = locationState ?? null

  const jobTitle = str(body.jobTitle)
  const employer = str(body.employer)
  if ('jobTitle' in body) fields.jobTitle = jobTitle ?? null
  if ('employer' in body) fields.employer = employer ?? null
  if ('employerStartDate' in body) {
    const raw = body.employerStartDate
    fields.employerStartDate =
      typeof raw === 'string' && raw.trim() !== ''
        ? new Date(raw)
        : null
  }

  const targetRetirementIncome = num(body.targetRetirementIncome)
  if ('targetRetirementIncome' in body) {
    fields.targetRetirementIncome = targetRetirementIncome ?? null
  }

  const emergencyFundMonthsTarget = num(body.emergencyFundMonthsTarget)
  if ('emergencyFundMonthsTarget' in body) {
    fields.emergencyFundMonthsTarget = emergencyFundMonthsTarget ?? null
  }

  if ('majorGoals' in body) {
    const raw = body.majorGoals
    fields.majorGoals = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      : []
  }

  const riskTolerance = num(body.riskTolerance)
  if ('riskTolerance' in body) {
    fields.riskTolerance =
      typeof riskTolerance === 'number' && riskTolerance >= 1 && riskTolerance <= 5
        ? Math.round(riskTolerance)
        : null
  }

  if ('contractParsedData' in body) {
    const raw = body.contractParsedData
    if (raw && typeof raw === 'object') {
      fields.contractParsedData    = raw as Prisma.InputJsonValue
      fields.contractUploadedAt    = new Date()
      // A successful upload supersedes any prior skip so future resume
      // logic does not misread the state.
      fields.contractStepSkippedAt = null
    } else if (raw === null) {
      fields.contractParsedData = Prisma.JsonNull
      fields.contractUploadedAt = null
    }
  }

  // Explicit skip of Step 3. Records a timestamp without touching the
  // parsed-data or upload fields so the resume logic can tell skip apart
  // from a completed upload.
  if (body.contractStepSkipped === true) {
    fields.contractStepSkippedAt = new Date()
  }

  return fields
}

/**
 * Dev-only reset. Drops the user's OnboardingProfile and EmploymentBenefits so
 * the onboarding flow starts from a blank slate. Refuses to run when
 * NODE_ENV === 'production' to keep this out of reach in live deploys.
 */
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.$transaction([
      prisma.onboardingProfile.deleteMany({ where: { userId: user.id } }),
      prisma.employmentBenefits.deleteMany({ where: { userId: user.id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[onboarding DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: Body
  try {
    body = await request.json() as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const step    = typeof body.step    === 'number' ? body.step    : null
    const finalize = body.finalize === true
    const skipped  = body.skipped  === true

    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.user.upsert({
      where:  { email: user.email! },
      update: {},
      create: { id: user.id, email: user.email! },
    })

    const writable = buildWritableFields(body)

    // Partial save path — no Step 1 validation, no asset-account gate. Used
    // between steps so the user can refresh and resume without losing data.
    if (!finalize) {
      // Partial saves require an existing profile row (so age / income / etc.
      // are not null in the column). If none exists yet, Step 1 fields must
      // be present to create one. Otherwise we only update.
      const existing = await prisma.onboardingProfile.findUnique({
        where: { userId: user.id },
      })

      if (!existing) {
        const hasStep1 =
          typeof writable.age           === 'number' &&
          typeof writable.annualIncome  === 'number' &&
          typeof writable.savingsRate   === 'number' &&
          typeof writable.retirementAge === 'number'
        if (!hasStep1) {
          return NextResponse.json(
            { success: true, profile: null, pending: true },
            { status: 200 }
          )
        }
        const profile = await prisma.onboardingProfile.create({
          data: { ...(writable as Prisma.OnboardingProfileUncheckedCreateInput), userId: user.id },
        })
        return NextResponse.json({ success: true, profile, step })
      }

      const profile = await prisma.onboardingProfile.update({
        where: { userId: user.id },
        data:  writable as Prisma.OnboardingProfileUncheckedUpdateInput,
      })
      return NextResponse.json({ success: true, profile, step })
    }

    // Finalize path — validate Step 1 required fields are present (merging
    // the request body with any existing profile), then enforce asset-account
    // gating unless skipped=true.
    const existing = await prisma.onboardingProfile.findUnique({
      where: { userId: user.id },
    })

    const mergedAge           = writable.age           ?? existing?.age
    const mergedIncome        = writable.annualIncome  ?? existing?.annualIncome
    const mergedSavingsRate   = writable.savingsRate   ?? existing?.savingsRate
    const mergedRetirementAge = writable.retirementAge ?? existing?.retirementAge

    if (
      typeof mergedAge           !== 'number' ||
      typeof mergedIncome        !== 'number' ||
      typeof mergedSavingsRate   !== 'number' ||
      typeof mergedRetirementAge !== 'number'
    ) {
      return NextResponse.json(
        { error: 'step1_required', message: 'Age, income, savings rate, and retirement age are required.' },
        { status: 400 }
      )
    }

    if (!skipped) {
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

    const completedAt = new Date()
    const profile = await prisma.onboardingProfile.upsert({
      where: { userId: user.id },
      create: {
        ...(writable as Prisma.OnboardingProfileUncheckedCreateInput),
        userId: user.id,
        age:           mergedAge,
        annualIncome:  mergedIncome,
        savingsRate:   mergedSavingsRate,
        retirementAge: mergedRetirementAge,
        completedAt,
      },
      update: {
        ...(writable as Prisma.OnboardingProfileUncheckedUpdateInput),
        completedAt,
      },
    })

    const assetCount = await countAssetAccounts(user.id)
    return NextResponse.json({
      success: true,
      profile,
      skipped,
      skippedAssetLink: assetCount === 0,
    })
  } catch (error) {
    console.error('[onboarding POST]', error)
    const message =
      error instanceof Error ? error.message : 'Server error while saving onboarding.'
    const isDev = process.env.NODE_ENV !== 'production'
    return NextResponse.json(
      {
        error: 'onboarding_save_failed',
        message: isDev ? message : 'Server error while saving onboarding.',
      },
      { status: 500 }
    )
  }
}
