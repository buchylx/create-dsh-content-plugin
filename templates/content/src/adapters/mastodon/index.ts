// Mastodon platform adapter.
// API: Mastodon REST API v1 (https://docs.joinmastodon.org/methods/statuses/)
// Auth: access token (created in Mastodon settings → Development)
import type { PlatformAdapter, PublishInput, PublishResult } from '../../core/types.js'

export const mastodonAdapter: PlatformAdapter = {
  id: 'mastodon',
  label: 'Mastodon',
  type: 'post',
  maxChars: 500,
  requiresAuth: true,
  supportsThread: true,

  validate(cred: any) {
    if (!cred || !cred.instance || !cred.accessToken) {
      return { valid: false, message: 'instance and/or accessToken not configured.' }
    }
    return { valid: true }
  },

  async publish(input: PublishInput): Promise<PublishResult> {
    const { content, cred } = input

    // TODO: Implement actual Mastodon API call.
    // POST https://<instance>/api/v1/statuses
    // Headers: Authorization: Bearer <accessToken>
    // Body: { status: content }

    // Placeholder — replace with real implementation
    return {
      platform: 'mastodon',
      status: 'skipped',
      message: 'Mastodon adapter not yet implemented (placeholder).',
    }
  },
}
