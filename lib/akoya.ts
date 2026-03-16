const AKOYA_SANDBOX_IDP = 'https://sandbox-idp.ddp.akoya.com'
const AKOYA_SANDBOX_PRODUCTS = 'https://sandbox-products.ddp.akoya.com'

export function getAkoyaAuthUrl(connectorId: string): string {
  const clientId = process.env.AKOYA_CLIENT_ID
  const redirectUri = process.env.AKOYA_REDIRECT_URI

  console.log('[Akoya] Building auth URL:', {
    connectorId,
    clientId: clientId ? `${clientId.slice(0, 8)}…` : 'MISSING',
    redirectUri: redirectUri ?? 'MISSING',
    clientSecret: process.env.AKOYA_CLIENT_SECRET ? 'set' : 'MISSING',
  })

  const params = new URLSearchParams({
    connector: connectorId,
    client_id: clientId!,
    redirect_uri: redirectUri!,
    response_type: 'code',
    scope: 'openid profile offline_access',
    state: `${connectorId}:${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
  })

  const url = `${AKOYA_SANDBOX_IDP}/auth?${params.toString()}`
  console.log('[Akoya] Full auth URL:', url)
  return url
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ access_token: string; id_token?: string; refresh_token: string }> {
  const credentials = Buffer.from(
    `${process.env.AKOYA_CLIENT_ID}:${process.env.AKOYA_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${AKOYA_SANDBOX_IDP}/token`, {
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

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  const tokenData = await res.json()
  console.log('[Akoya] token response keys:', Object.keys(tokenData))
  console.log('[Akoya] token_type:', tokenData.token_type)
  console.log('[Akoya] scope:', tokenData.scope)
  console.log('[Akoya] access_token prefix:', tokenData.access_token?.slice(0, 40))
  return tokenData
}

export async function fetchAkoyaAccounts(
  connectorId: string,
  accessToken: string,
  idToken?: string
) {
  const url = `${AKOYA_SANDBOX_PRODUCTS}/accounts/v2/${connectorId}`

  // Try access_token first, fall back to id_token (Akoya sometimes requires id_token)
  const tokens = [accessToken, ...(idToken && idToken !== accessToken ? [idToken] : [])]

  for (const token of tokens) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) return res.json()
    const body = await res.text()
    console.error('[Akoya] accounts error with token type:', res.status, body)
    if (tokens.indexOf(token) === tokens.length - 1) {
      throw new Error(`Failed to fetch accounts: ${res.status} ${res.statusText} — ${body}`)
    }
  }
}

export async function fetchAkoyaTransactions(
  connectorId: string,
  accountId: string,
  accessToken: string
) {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 6)
  const params = new URLSearchParams({
    startDate: startDate.toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  const res = await fetch(
    `${AKOYA_SANDBOX_PRODUCTS}/transactions/v2/${connectorId}/${accountId}?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  if (!res.ok) throw new Error(`Failed to fetch transactions: ${res.statusText}`)
  return res.json()
}
