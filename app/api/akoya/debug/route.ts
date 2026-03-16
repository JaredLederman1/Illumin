import { NextRequest, NextResponse } from 'next/server'

const AKOYA_SANDBOX_IDP = 'https://sandbox-idp.ddp.akoya.com'
const AKOYA_SANDBOX_PRODUCTS = 'https://sandbox-products.ddp.akoya.com'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const connectorId = searchParams.get('connector') ?? 'mikomo'

  if (!code) {
    return NextResponse.json({ error: 'Pass ?code=AUTH_CODE&connector=mikomo' })
  }

  const credentials = Buffer.from(
    `${process.env.AKOYA_CLIENT_ID}:${process.env.AKOYA_CLIENT_SECRET}`
  ).toString('base64')

  // Step 1: Token exchange
  const tokenRes = await fetch(`${AKOYA_SANDBOX_IDP}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.AKOYA_REDIRECT_URI!,
    }),
  })
  const tokenData = await tokenRes.json()

  if (!tokenRes.ok) {
    return NextResponse.json({ step: 'token_exchange', status: tokenRes.status, tokenData })
  }

  const { access_token, id_token } = tokenData

  // Decode JWT claims without verification (just base64)
  const decodeJwt = (jwt: string) => {
    try {
      return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
    } catch { return null }
  }

  const accessClaims = access_token ? decodeJwt(access_token) : null
  const idClaims = id_token ? decodeJwt(id_token) : null

  // Step 2: Try accounts with access_token
  const accountsRes = await fetch(
    `${AKOYA_SANDBOX_PRODUCTS}/accounts/v2/${connectorId}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  )
  const accountsBody = await accountsRes.text()

  // Step 3: Try accounts with id_token (if access_token failed)
  let idTokenAccountsBody = null
  let idTokenStatus = null
  if (!accountsRes.ok && id_token) {
    const r2 = await fetch(
      `${AKOYA_SANDBOX_PRODUCTS}/accounts/v2/${connectorId}`,
      { headers: { Authorization: `Bearer ${id_token}` } }
    )
    idTokenStatus = r2.status
    idTokenAccountsBody = await r2.text()
  }

  return NextResponse.json({
    tokenKeys: Object.keys(tokenData),
    tokenType: tokenData.token_type,
    scope: tokenData.scope,
    accessClaims,
    idClaims,
    accountsStatus: accountsRes.status,
    accountsBody: JSON.parse(accountsBody),
    idTokenAccountsStatus: idTokenStatus,
    idTokenAccountsBody: idTokenAccountsBody ? JSON.parse(idTokenAccountsBody) : null,
  })
}
