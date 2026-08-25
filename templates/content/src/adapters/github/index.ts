// GitHub gist platform adapter.
// API: GitHub REST API (https://docs.github.com/en/rest/gists/gists#create-a-gist)
// Auth: personal access token with gist scope
import type { PlatformAdapter, PublishInput, PublishResult } from '../../core/types.js'

export const githubAdapter: PlatformAdapter = {
  id: 'github',
  label: 'GitHub',
  type: 'gist',
  requiresAuth: true,
  supportsThread: false,

  validate(cred: any) {
    if (!cred || !cred.token) {
      return { valid: false, message: 'token not configured.' }
    }
    return { valid: true }
  },

  async publish(input: PublishInput): Promise<PublishResult> {
    const { content, title, cred } = input
    const filename = title ? `${title}.md` : 'content.md'

    // TODO: Implement actual GitHub Gist API call.
    // POST https://api.github.com/gists
    // Headers: Authorization: Bearer <token>, Accept: application/vnd.github+json
    // Body: { description: title, public: false, files: { [filename]: { content } } }

    // Placeholder — replace with real implementation
    return {
      platform: 'github',
      status: 'skipped',
      message: 'GitHub adapter not yet implemented (placeholder).',
    }
  },
}
