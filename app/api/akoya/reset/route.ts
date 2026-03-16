import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Dev-only: clears all Akoya tokens and deletes all transactions so you can re-connect clean
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    // Delete all transactions first (FK constraint)
    const { count: txCount } = await prisma.transaction.deleteMany({})

    // Clear Akoya tokens and delete accounts
    const { count: accountCount } = await prisma.account.deleteMany({})

    return NextResponse.json({ success: true, deletedTransactions: txCount, deletedAccounts: accountCount })
  } catch (error) {
    console.error('[Reset] failed:', error)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
