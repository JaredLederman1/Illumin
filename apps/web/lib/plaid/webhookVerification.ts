/**
 * Plaid webhook signature verification.
 *
 * Every incoming POST to /api/plaid/webhook MUST be verified before any
 * downstream work (DB writes, sync, scan) is performed. Plaid signs each
 * webhook with an ES256 JWT in the `Plaid-Verification` header. The JWT
 * body contains `request_body_sha256`, which must match the SHA-256 of
 * the raw request body. This prevents an attacker from replaying a real
 * signature against a tampered body.
 *
 * Public keys are fetched from `/webhook_verification_key/get` (keyed by
 * the JWT header's `kid`) and cached in-process for 24h. Cache is module
 * scoped; each serverless invocation starts cold but subsequent calls in
 * the same lambda reuse the key.
 */

import crypto from 'crypto'
import { plaidClient } from '@/lib/plaid'
import type { JWKPublicKey } from 'plaid'

const KEY_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const IAT_TOLERANCE_SECONDS = 5 * 60

interface CachedKey {
  jwk: JWKPublicKey
  cachedAt: number
}

const keyCache = new Map<string, CachedKey>()

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (padded.length % 4)) % 4
  return Buffer.from(padded + '='.repeat(padLen), 'base64')
}

interface JwtParts {
  header: { alg?: string; kid?: string; typ?: string }
  payload: { iat?: number; request_body_sha256?: string }
  signingInput: string
  signature: Buffer
}

function parseJwt(jwt: string): JwtParts | null {
  const parts = jwt.split('.')
  if (parts.length !== 3) return null

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]).toString('utf8'))
    const payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8'))
    const signature = base64UrlDecode(parts[2])
    return {
      header,
      payload,
      signingInput: `${parts[0]}.${parts[1]}`,
      signature,
    }
  } catch {
    return null
  }
}

async function getVerificationKey(kid: string): Promise<JWKPublicKey | null> {
  const cached = keyCache.get(kid)
  if (cached && Date.now() - cached.cachedAt < KEY_CACHE_TTL_MS) {
    return cached.jwk
  }

  try {
    const response = await plaidClient.webhookVerificationKeyGet({ key_id: kid })
    const jwk = response.data.key
    if (jwk.expired_at !== null) {
      console.warn('[plaid:webhook] verification key is expired', { kid, expired_at: jwk.expired_at })
      return null
    }
    keyCache.set(kid, { jwk, cachedAt: Date.now() })
    return jwk
  } catch (err) {
    console.error('[plaid:webhook] failed to fetch verification key', { kid, err })
    return null
  }
}

function verifySignature(jwk: JWKPublicKey, signingInput: string, signature: Buffer): boolean {
  if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || jwk.alg !== 'ES256') {
    console.warn('[plaid:webhook] unexpected JWK algorithm', {
      kty: jwk.kty,
      crv: jwk.crv,
      alg: jwk.alg,
    })
    return false
  }

  try {
    const publicKey = crypto.createPublicKey({
      key: {
        kty: jwk.kty,
        crv: jwk.crv,
        x: jwk.x,
        y: jwk.y,
      },
      format: 'jwk',
    })

    return crypto.verify(
      'sha256',
      Buffer.from(signingInput, 'utf8'),
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      signature,
    )
  } catch (err) {
    console.error('[plaid:webhook] signature verify threw', err)
    return false
  }
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

/**
 * Verify a Plaid webhook. Returns true only when all of:
 *   1. JWT parses and uses ES256
 *   2. Public key for `kid` is retrievable and unexpired
 *   3. Signature verifies against `header.payload`
 *   4. `iat` is within a 5-minute window of now (replay protection)
 *   5. `request_body_sha256` matches SHA-256(rawBody) in hex
 *
 * Any failure path returns false and logs. Never throws to the caller.
 */
export async function verifyWebhook(rawBody: string, jwt: string): Promise<boolean> {
  const parsed = parseJwt(jwt)
  if (!parsed) {
    console.warn('[plaid:webhook] JWT parse failed')
    return false
  }

  if (parsed.header.alg !== 'ES256') {
    console.warn('[plaid:webhook] unsupported alg', parsed.header.alg)
    return false
  }

  const kid = parsed.header.kid
  if (!kid) {
    console.warn('[plaid:webhook] JWT missing kid')
    return false
  }

  const jwk = await getVerificationKey(kid)
  if (!jwk) return false

  if (!verifySignature(jwk, parsed.signingInput, parsed.signature)) {
    console.warn('[plaid:webhook] signature mismatch', { kid })
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  const iat = parsed.payload.iat
  if (typeof iat !== 'number' || Math.abs(now - iat) > IAT_TOLERANCE_SECONDS) {
    console.warn('[plaid:webhook] iat outside tolerance', { iat, now })
    return false
  }

  const expectedHash = parsed.payload.request_body_sha256
  if (typeof expectedHash !== 'string') {
    console.warn('[plaid:webhook] payload missing request_body_sha256')
    return false
  }

  const actualHash = sha256Hex(rawBody)
  if (actualHash !== expectedHash) {
    console.warn('[plaid:webhook] body hash mismatch')
    return false
  }

  return true
}
