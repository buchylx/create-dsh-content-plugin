// Mastodon platform adapter.
// API: Mastodon REST API v1 (https://docs.joinmastodon.org/methods/statuses/)
// Auth: access token (created in Mastodon settings → Development)
//
// Flow:
//   1. POST <instance>/api/v1/statuses  with { status, in_reply_to_id? }
//   2. Response carries the status id + url of the toot.
// Long plain text (> maxChars) becomes a reply thread (root = first toot).
import type { PlatformAdapter, PublishInput, PublishResult } from '../../core/types.js'
import { toPlainText, splitByChars } from '../../formatters/markdown.js'

const MAX_CHARS = 500
const DEFAULT_VISIBILITY = 'public'

/** Normalize an instance URL; throws with a readable message if it is not usable. */
function normalizeInstance(instance: string): string {
  const s = String(instance || '').trim().replace(/\/+$/, '')
  if (!s) throw new Error('instance not configured.')
  if (!/^https?:\/\//.test(s)) {
    throw new Error(`instance "${s}" does not look like a URL — expected e.g. https://mastodon.social.`)
  }
  return s
}

/** Classify a Mastodon API error into a human-readable, agent-actionable message. */
function classifyError(status: number, body: any): string {
  const detail = Array.isArray(body?.error) ? body.error.join('; ') : body?.error
  if (status === 401) return `auth failed (401) — accessToken invalid.`
  if (status === 403) return `forbidden (403) — token lacks write/permission.`
  if (status === 422) return `validation error (422)${detail ? ` — ${detail}` : ''}.`
  if (status === 429) return `rate limited (429) — retry later.`
  return `HTTP ${status}${detail ? ` — ${detail}` : ''}.`
}

export const mastodonAdapter: PlatformAdapter = {
  id: 'mastodon',
  label: 'Mastodon',
  type: 'post',
  maxChars: MAX_CHARS,
  requiresAuth: true,
  supportsThread: true,

  validate(cred: any) {
    if (!cred || !cred.instance || !cred.accessToken) {
      return { valid: false, message: 'instance and/or accessToken not configured.' }
    }
    if (typeof cred.instance !== 'string' || typeof cred.accessToken !== 'string') {
      return { valid: false, message: 'instance and accessToken must be strings.' }
    }
    return { valid: true }
  },

  async publish(input: PublishInput): Promise<PublishResult> {
    const { content, cred } = input
    let base: string
    const accessToken = String(cred.accessToken).trim()
    try {
      base = normalizeInstance(String(cred.instance))
    } catch (e: any) {
      return { platform: 'mastodon', status: 'error', message: e?.message || String(e) }
    }

    // Strip markdown and split long text into a thread.
    const plain = toPlainText(content)
    if (!plain) {
      return { platform: 'mastodon', status: 'error', message: 'empty content after markdown-to-plain-text conversion.' }
    }
    const chunks = plain.length > MAX_CHARS ? splitByChars(plain, MAX_CHARS) : [plain]

    const posted: { id: string; url: string }[] = []
    try {
      for (let i = 0; i < chunks.length; i++) {
        const payload: Record<string, any> = {
          status: chunks[i].trim(),
          visibility: DEFAULT_VISIBILITY,
        }
        if (i > 0) payload.in_reply_to_id = posted[i - 1].id

        const res = await fetch(`${base}/api/v1/statuses`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        const text = await res.text()
        let body: any = null
        try { body = JSON.parse(text) } catch { /* non-JSON */ }
        if (!res.ok) throw new Error(classifyError(res.status, body))
        if (!body?.id) throw new Error('create status returned no id.')
        posted.push({ id: body.id, url: body.url || `${base}/@${body.account?.acct ?? ''}/${body.id}` })
      }
    } catch (e: any) {
      const msg = e?.message || String(e)
      return {
        platform: 'mastodon',
        status: 'error',
        message: posted.length > 0 ? `published ${posted.length}/${chunks.length} toots, then failed — ${msg}` : msg,
      }
    }

    const first = posted[0]
    return {
      platform: 'mastodon',
      status: 'success',
      url: first.url,
      message: posted.length > 1 ? `thread of ${posted.length} toots (${first.id}).` : `status ${first.id}.`,
    }
  },
}