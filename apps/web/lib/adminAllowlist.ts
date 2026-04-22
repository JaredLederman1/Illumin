/**
 * Unified admin allowlist. Single source of truth for "is this email an admin?"
 *
 * Reads ADMIN_EMAILS (server-side only, comma-separated) at call time so that
 * re-deploys with a new list pick it up without requiring a rebuild of any
 * module that closes over the array.
 *
 * NEXT_PUBLIC_ADMIN_EMAIL continues to exist for client-side UI affordances
 * (Header admin pill). Do not expose the full list client-side.
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS
  if (!raw || !raw.trim()) return []
  return raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.toLowerCase())
}
