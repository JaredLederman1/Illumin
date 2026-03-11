import { NextRequest, NextResponse } from 'next/server'
import { getAkoyaAuthUrl } from '@/lib/akoya'

export async function GET(request: NextRequest) {
  const connectorId = request.nextUrl.searchParams.get('connectorId') ?? 'schwab'

  if (!process.env.AKOYA_CLIENT_ID) {
    return NextResponse.json({ error: 'Akoya not configured' }, { status: 503 })
  }

  const authUrl = getAkoyaAuthUrl(connectorId)
  return NextResponse.json({ authUrl })
}
