// Dev.to platform adapter.
// API: https://developers.forem.com/api/v1#tag/articles/operation/createArticle
// Auth: API key (obtained from dev.to/settings/extensions)
import type { PlatformAdapter, PublishInput, PublishResult } from '../../core/types.js'

export const devtoAdapter: PlatformAdapter = {
  id: 'devto',
  label: 'Dev.to',
  type: 'article',
  requiresAuth: true,
  supportsThread: false,

  validate(cred: any) {
    if (!cred || !cred.apiKey) {
      return { valid: false, message: 'apiKey not configured.' }
    }
    return { valid: true }
  },

  async publish(input: PublishInput): Promise<PublishResult> {
    const { content, title, cred } = input

    // TODO: Implement actual Dev.to API call.
    // POST https://dev.to/api/articles
    // Headers: api-key: <cred.apiKey>
    // Body: { article: { title, body_markdown: content, published: true } }

    // Placeholder — replace with real implementation
    return {
      platform: 'devto',
      status: 'skipped',
      message: 'Dev.to adapter not yet implemented (placeholder).',
    }
  },
}
