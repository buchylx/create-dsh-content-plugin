// Dev.to platform adapter.
// API: https://developers.forem.com/api/v1#tag/articles/operation/createArticle
// Auth: API key (obtained from dev.to/settings/extensions)
import type { PlatformAdapter, PublishInput, PublishResult } from '../../core/types.js'

const ENDPOINT = 'https://dev.to/api/articles'

/**
 * Classify a Dev.to API error into a human-readable, agent-actionable message.
 * 401 → bad/expired API key; 429 → rate limit; 422 → bad request body.
 */
function classifyError(status: number, body: any): string {
  if (status === 401 || status === 403) return `auth failed (${status}) — apiKey invalid or revoked.`
  if (status === 429) return `rate limited (429) — retry later.`
  if (status === 422) {
    const detail = body?.error && typeof body.error === 'string' ? body.error : JSON.stringify(body?.errors || body?.error || body)
    return `bad request (422) — ${detail}.`
  }
  return `HTTP ${status}.`
}

export const devtoAdapter: PlatformAdapter = {
  id: 'devto',
  label: 'Dev.to',
  type: 'article',
  requiresAuth: true,
  supportsThread: false,

  validate(cred: any) {
    if (!cred || !cred.apiKey || typeof cred.apiKey !== 'string' || !cred.apiKey.trim()) {
      return { valid: false, message: 'apiKey not configured.' }
    }
    return { valid: true }
  },

  async publish(input: PublishInput): Promise<PublishResult> {
    const { content, title, cred } = input
    // Dev.to requires a title for published articles; fall back to a default
    // so the call does not 422 when the agent omits one.
    const safeTitle = (title && title.trim()) ? title.trim() : 'Untitled'

    let res: Response
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': cred.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          article: {
            title: safeTitle,
            body_markdown: content,
            published: true,
          },
        }),
      })
    } catch (e: any) {
      // Network-level failure (DNS, connection reset, timeout).
      return {
        platform: 'devto',
        status: 'error',
        message: `network error — ${e?.message || String(e)}`,
      }
    }

    // Parse the body once; tolerate non-JSON error responses.
    let body: any = null
    const text = await res.text()
    try { body = JSON.parse(text) } catch { /* non-JSON */ }

    if (!res.ok) {
      return { platform: 'devto', status: 'error', message: classifyError(res.status, body) }
    }

    const url: string | undefined = body?.url
    return {
      platform: 'devto',
      status: 'success',
      url,
      message: url ? undefined : `created (id=${body?.id ?? '?'})`,
    }
  },
}
