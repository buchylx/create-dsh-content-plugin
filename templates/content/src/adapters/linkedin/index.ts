// LinkedIn platform adapter.
// API: LinkedIn UGC Posts API v2 (https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api)
// Auth: OAuth 2.0 access token (requires scopes: w_member_social, profile)
//
// Flow:
//   1. GET https://api.linkedin.com/v2/userinfo  → person URN (sub)
//   2. POST https://api.linkedin.com/v2/ugcPosts → post URN
// LinkedIn does not support native threading; content > maxChars is truncated.
import type { PlatformAdapter, PublishInput, PublishResult } from '../../core/types.js'
import { toPlainText } from '../../formatters/markdown.js'

const API_BASE = 'https://api.linkedin.com'
const USERINFO_ENDPOINT = `${API_BASE}/v2/userinfo`
const UGCPOSTS_ENDPOINT = `${API_BASE}/v2/ugcPosts`
const MAX_CHARS = 3000

/** Classify a LinkedIn API error into a human-readable, agent-actionable message. */
function classifyError(status: number, body: any): string {
  const detail = body?.message && typeof body.message === 'string' ? body.message : ''
  if (status === 401) return `auth failed (401) — accessToken invalid or expired.`
  if (status === 403) return `forbidden (403) — token lacks w_member_social scope.`
  if (status === 422) return `validation error (422)${detail ? ` — ${detail}` : ''}.`
  if (status === 429) return `rate limited (429) — retry later.`
  return `HTTP ${status}${detail ? ` — ${detail}` : ''}.`
}

/** Fetch the person URN (urn:li:person:{sub}) using the access token. */
async function getPersonUrn(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })
  const text = await res.text()
  let body: any = null
  try { body = JSON.parse(text) } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(classifyError(res.status, body))
  const sub = body?.sub
  if (!sub) throw new Error('userinfo returned no sub (person id).')
  return `urn:li:person:${sub}`
}

export const linkedinAdapter: PlatformAdapter = {
  id: 'linkedin',
  label: 'LinkedIn',
  type: 'post',
  maxChars: MAX_CHARS,
  requiresAuth: true,
  supportsThread: false,

  validate(cred: any) {
    if (!cred || !cred.accessToken || typeof cred.accessToken !== 'string' || !cred.accessToken.trim()) {
      return { valid: false, message: 'accessToken not configured.' }
    }
    return { valid: true }
  },

  async publish(input: PublishInput): Promise<PublishResult> {
    const { content, cred } = input
    const accessToken = String(cred.accessToken).trim()

    // Strip markdown to plain text; truncate if over LinkedIn's limit.
    const plain = toPlainText(content)
    if (!plain) {
      return { platform: 'linkedin', status: 'error', message: 'empty content after markdown-to-plain-text conversion.' }
    }
    const text = plain.length > MAX_CHARS ? plain.slice(0, MAX_CHARS - 3) + '...' : plain

    // Step 1: resolve person URN from the token.
    let authorUrn: string
    try {
      authorUrn = await getPersonUrn(accessToken)
    } catch (e: any) {
      return { platform: 'linkedin', status: 'error', message: e?.message || String(e) }
    }

    // Step 2: create the UGC post.
    let res: Response
    try {
      res = await fetch(UGCPOSTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        }),
      })
    } catch (e: any) {
      return { platform: 'linkedin', status: 'error', message: `network error — ${e?.message || String(e)}` }
    }

    const bodyText = await res.text()
    let body: any = null
    try { body = JSON.parse(bodyText) } catch { /* non-JSON */ }

    if (!res.ok) {
      return { platform: 'linkedin', status: 'error', message: classifyError(res.status, body) }
    }

    // The post URN looks like "urn:li:ugcPost:1234567890".
    const postUrn: string | undefined = body?.id || body?.activity
    const postUrl = postUrn
      ? `https://www.linkedin.com/feed/update/${postUrn}/`
      : undefined

    return {
      platform: 'linkedin',
      status: 'success',
      url: postUrl,
      message: postUrn ? `post ${postUrn}.` : 'published (no URN returned).',
    }
  },
}
