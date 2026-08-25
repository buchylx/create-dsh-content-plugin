// Bluesky platform adapter.
// API: AT Protocol / XRPC (https://atproto.com/apis/app-bsky-feed-post)
// Auth: handle + app password (app passwords created in Bluesky settings)
import type { PlatformAdapter, PublishInput, PublishResult } from '../../core/types.js'

export const blueskyAdapter: PlatformAdapter = {
  id: 'bluesky',
  label: 'Bluesky',
  type: 'post',
  maxChars: 300,
  requiresAuth: true,
  supportsThread: true,

  validate(cred: any) {
    if (!cred || !cred.handle || !cred.appPassword) {
      return { valid: false, message: 'handle and/or appPassword not configured.' }
    }
    return { valid: true }
  },

  async publish(input: PublishInput): Promise<PublishResult> {
    const { content, cred } = input

    // TODO: Implement actual Bluesky / AT Protocol posting.
    // 1. Create session: POST https://bsky.social/xrpc/com.atproto.server.createSession
    // 2. Create record:  POST https://bsky.social/xrpc/com.atproto.repo.createRecord
    //    collection: app.bsky.feed.post
    //    record: { text, createdAt: new Date().toISOString() }

    // Placeholder — replace with real implementation
    return {
      platform: 'bluesky',
      status: 'skipped',
      message: 'Bluesky adapter not yet implemented (placeholder).',
    }
  },
}
