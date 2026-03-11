const AKOYA_SANDBOX_IDP = 'https://sandbox-idp.ddp.akoya.com'
const AKOYA_SANDBOX_PRODUCTS = 'https://sandbox-products.ddp.akoya.com'

export function getAkoyaAuthUrl(connectorId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.AKOYA_CLIENT_ID!,
    redirect_uri: process.env.AKOYA_REDIRECT_URI!,
    response_type: 'code',
    scope: 'openid profile offline_access accounts transactions balances',
    state: connectorId,
  })
  return `${AKOYA_SANDBOX_IDP}/auth?${params.toString()}`
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ access_token: string; refresh_token: string }> {
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

  return res.json()
}

export async function fetchAkoyaAccounts(
  connectorId: string,
  accessToken: string
) {
  const res = await fetch(
    `${AKOYA_SANDBOX_PRODUCTS}/accounts/v2/${connectorId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.statusText}`)
  return res.json()
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
