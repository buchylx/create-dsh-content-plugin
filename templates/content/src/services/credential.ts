// Credential service — validates and manages BYOK credentials.
// Credentials live in the DSH profile config (ctx.config), never in code.

export interface CredentialStore {
  [platformId: string]: any
}

export interface ValidationSummary {
  configured: number
  disabled: number
  details: Record<string, { valid: boolean; message?: string }>
}

/**
 * Validate credentials for all known platforms.
 * Returns counts and per-platform details — useful for startup logging
 * and for the agent to understand which platforms are usable.
 */
export function validateAll(creds: CredentialStore): ValidationSummary {
  const KNOWN_PLATFORMS = ['devto', 'bluesky', 'mastodon', 'github']
  const details: Record<string, { valid: boolean; message?: string }> = {}
  let configured = 0
  let disabled = 0

  for (const id of KNOWN_PLATFORMS) {
    const cred = creds[id]
    if (!cred || isEmptyCred(cred)) {
      details[id] = { valid: false, message: 'not configured (disabled).' }
      disabled++
    } else {
      // Each platform has its own validation rules; do a basic check here.
      // Adapters do deeper validation at publish time.
      const hasAnyField = Object.values(cred).some((v) => v && String(v).trim().length > 0)
      if (hasAnyField) {
        details[id] = { valid: true }
        configured++
      } else {
        details[id] = { valid: false, message: 'empty credential object.' }
        disabled++
      }
    }
  }

  return { configured, disabled, details }
}

function isEmptyCred(cred: any): boolean {
  if (!cred || typeof cred !== 'object') return true
  const values = Object.values(cred)
  if (values.length === 0) return true
  return values.every((v) => !v || String(v).trim().length === 0)
}
