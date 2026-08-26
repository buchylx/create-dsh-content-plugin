// GitHub gist platform adapter.
// API: GitHub REST API (https://docs.github.com/en/rest/gists/gists#create-a-gist)
// Auth: personal access token with gist scope (classic) or gist permission (fine-grained)
import type { PlatformAdapter, PublishInput, PublishResult } from '../../core/types.js'

const ENDPOINT = 'https://api.github.com/gists'

/**
 * Sanitize a title into a gist filename. GitHub rejects filenames containing
 * path separators or empty/overly long names, which would 422 the request.
 */
function toFilename(title?: string): string {
  const base = (title && title.trim()) ? title.trim() : 'content'
  // Strip path separators, control chars, and shell-unfriendly chars.
  const cleaned = base.replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').trim().slice(0, 120)
  const name = cleaned || 'content'
  return name.toLowerCase().endsWith('.md') ? name : `${name}.md`
}

/**
 * Classify a GitHub API error into an agent-actionable message.
 * 401 → bad token; 403 → token lacks gist scope / rate limit; 422 → bad body.
 */
function classifyError(status: number, body: any): string {
  if (status === 401) return `auth failed (401) — token invalid.`
  if (status === 403) {
    if (body?.message && /rate limit/i.test(body.message)) return `rate limited (403) — retry later.`
    return `forbidden (403) — token lacks the "gist" scope.`
  }
  if (status === 422) {
    return `bad request (422) — ${body?.message || 'validation failed'}.`
  }
  return `HTTP ${status}.`
}

export const githubAdapter: PlatformAdapter = {
  id: 'github',
  label: 'GitHub',
  type: 'gist',
  requiresAuth: true,
  supportsThread: false,

  validate(cred: any) {
    if (!cred || !cred.token || typeof cred.token !== 'string' || !cred.token.trim()) {
      return { valid: false, message: 'token not configured.' }
    }
    // GitHub classic PATs start with ghp_/github_pat_; tokens can take other
    // shapes (oauth), so we only reject obviously-empty values here.
    return { valid: true }
  },

  async publish(input: PublishInput): Promise<PublishResult> {
    const { content, title, cred } = input
    const filename = toFilename(title)

    let res: Response
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cred.token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: (title && title.trim()) ? title.trim() : undefined,
          public: false,
          files: { [filename]: { content } },
        }),
      })
    } catch (e: any) {
      return {
        platform: 'github',
        status: 'error',
        message: `network error — ${e?.message || String(e)}`,
      }
    }

    let body: any = null
    const text = await res.text()
    try { body = JSON.parse(text) } catch { /* non-JSON */ }

    if (!res.ok) {
      return { platform: 'github', status: 'error', message: classifyError(res.status, body) }
    }

    const url: string | undefined = body?.html_url
    return {
      platform: 'github',
      status: 'success',
      url,
      message: url ? undefined : `created (id=${body?.id ?? '?'})`,
    }
  },
}
