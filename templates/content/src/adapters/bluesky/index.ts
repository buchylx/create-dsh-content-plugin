// Bluesky platform adapter.
// API: AT Protocol / XRPC (https://atproto.com/apis/app-bsky-feed-post)
// Auth: handle + app password (app passwords created in Bluesky settings)
//
// Flow:
//   1. com.atproto.server.createSession  → accessJwt + did
//   2. com.atproto.repo.createRecord     → uri + cid (collection: app.bsky.feed.post)
// Long plain text (> maxChars) is split into a reply thread (root = first post).
import type { PlatformAdapter, PublishInput, PublishResult } from '../../core/types.js'
import { toPlainText, splitByChars } from '../../formatters/markdown.js'

const PDS = 'https://bsky.social'
const MAX_CHARS = 300
const SESSION_ENDPOINT = `${PDS}/xrpc/com.atproto.server.createSession`
const RECORD_ENDPOINT = `${PDS}/xrpc/com.atproto.repo.createRecord`
const POST_COLLECTION = 'app.bsky.feed.post'

/** Classify an XRPC error into a human-readable, agent-actionable message. */
function classifyError(status: number, body: any): string {
  const err = body?.error && typeof body.error === 'string' ? body.error : ''
  const detail = body?.message && typeof body.message === 'string' ? body.message : ''
  if (status === 401) return `auth failed (401) — handle or appPassword invalid.`
  if (status === 429) return `rate limited (429) — retry later.`
  if (err) return `XRPC error (${status}) — ${err}${detail ? `: ${detail}` : ''}.`
  return `HTTP ${status}.`
}

/** Create an app session; throws on failure. */
async function createSession(handle: string, appPassword: string): Promise<{ accessJwt: string; did: string }> {
  const res = await fetch(SESSION_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  })
  const text = await res.text()
  let body: any = null
  try { body = JSON.parse(text) } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(classifyError(res.status, body))
  if (!body?.accessJwt || !body?.did) throw new Error(`createSession returned no accessJwt/did.`)
  return { accessJwt: body.accessJwt, did: body.did }
}

/** Create a feed post record; returns uri + cid. */
async function createRecord(
  accessJwt: string,
  did: string,
  record: Record<string, any>,
): Promise<{ uri: string; cid: string }> {
  const res = await fetch(RECORD_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repo: did, collection: POST_COLLECTION, record }),
  })
  const text = await res.text()
  let body: any = null
  try { body = JSON.parse(text) } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(classifyError(res.status, body))
  if (!body?.uri || !body?.cid) throw new Error(`createRecord returned no uri/cid.`)
  return { uri: body.uri, cid: body.cid }
}

/** at://uri → https://bsky.app/profile/<handle>/post/<rkey> */
function toPostUrl(handle: string, uri: string): string {
  const rkey = uri.split('/').pop() ?? ''
  return `https://bsky.app/profile/${handle}/post/${rkey}`
}

export const blueskyAdapter: PlatformAdapter = {
  id: 'bluesky',
  label: 'Bluesky',
  type: 'post',
  maxChars: MAX_CHARS,
  requiresAuth: true,
  supportsThread: true,

  validate(cred: any) {
    if (!cred || !cred.handle || !cred.appPassword) {
      return { valid: false, message: 'handle and/or appPassword not configured.' }
    }
    if (typeof cred.handle !== 'string' || typeof cred.appPassword !== 'string') {
      return { valid: false, message: 'handle and appPassword must be strings.' }
    }
    return { valid: true }
  },

  async publish(input: PublishInput): Promise<PublishResult> {
    const { content, cred } = input
    const handle = String(cred.handle).trim()
    const appPassword = String(cred.appPassword).trim()

    // Strip markdown and split long text into a thread.
    const plain = toPlainText(content)
    if (!plain) {
      return { platform: 'bluesky', status: 'error', message: 'empty content after markdown-to-plain-text conversion.' }
    }
    const chunks = plain.length > MAX_CHARS ? splitByChars(plain, MAX_CHARS) : [plain]

    let session: { accessJwt: string; did: string }
    try {
      session = await createSession(handle, appPassword)
    } catch (e: any) {
      const msg = e?.message || String(e)
      return { platform: 'bluesky', status: 'error', message: msg.startsWith('auth failed') ? msg : `session error — ${msg}` }
    }

    const records: { uri: string; cid: string }[] = []
    try {
      for (let i = 0; i < chunks.length; i++) {
        const text = chunks[i].trim()
        const record: Record<string, any> = {
          text,
          createdAt: new Date().toISOString(),
        }
        if (i === 1) {
          // Second post replies to the first; the root is the thread's first post.
          record.reply = {
            parent: { uri: records[0].uri, cid: records[0].cid },
            root: { uri: records[0].uri, cid: records[0].cid },
          }
        } else if (i > 1) {
          record.reply = {
            parent: { uri: records[i - 1].uri, cid: records[i - 1].cid },
            root: { uri: records[0].uri, cid: records[0].cid },
          }
        }
        records.push(await createRecord(session.accessJwt, session.did, record))
      }
    } catch (e: any) {
      const msg = e?.message || String(e)
      const posted = records.length
      return {
        platform: 'bluesky',
        status: 'error',
        message: posted > 0 ? `published ${posted}/${chunks.length} posts, then failed — ${msg}` : msg,
      }
    }

    const first = records[0]
    return {
      platform: 'bluesky',
      status: 'success',
      url: toPostUrl(handle, first.uri),
      message: records.length > 1 ? `thread of ${records.length} posts (${first.uri}).` : first.uri,
    }
  },
}