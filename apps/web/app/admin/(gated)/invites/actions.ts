'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { cookies as getCookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'
import { isAdminEmail } from '@/lib/adminAllowlist'

async function requireAdminEmail(): Promise<string> {
  const cookieStore = await getCookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    throw new Error('Unauthorized')
  }
  return user.email!.toLowerCase()
}

function generateCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

export async function createInviteCode(formData: FormData): Promise<void> {
  const adminEmail = await requireAdminEmail()

  const rawNote = formData.get('note')
  const rawMaxUses = formData.get('maxUses')
  const rawExpiresAt = formData.get('expiresAt')

  const note = typeof rawNote === 'string' && rawNote.trim() ? rawNote.trim() : null
  const parsedMax = typeof rawMaxUses === 'string' ? parseInt(rawMaxUses, 10) : NaN
  const maxUses = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 1
  const expiresAt =
    typeof rawExpiresAt === 'string' && rawExpiresAt.trim()
      ? new Date(rawExpiresAt)
      : null

  // Retry on the slim chance we collide an existing code.
  let attempts = 0
  while (attempts < 5) {
    try {
      await prisma.inviteCode.create({
        data: {
          code: generateCode(),
          maxUses,
          note,
          expiresAt,
          createdBy: adminEmail,
        },
      })
      break
    } catch (err) {
      attempts++
      if (attempts >= 5) throw err
    }
  }

  revalidatePath('/admin/invites')
}

export async function disableInviteCode(formData: FormData): Promise<void> {
  await requireAdminEmail()

  const id = formData.get('id')
  if (typeof id !== 'string' || !id) throw new Error('Missing id')

  await prisma.inviteCode.update({
    where: { id },
    data: { disabledAt: new Date() },
  })

  revalidatePath('/admin/invites')
}
