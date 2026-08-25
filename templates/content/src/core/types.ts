// Core types for the content plugin.
// Platform-agnostic — all adapters implement these interfaces.

export type PlatformType = 'article' | 'post' | 'gist'

export interface PlatformAdapter {
  id: string
  label: string
  type: PlatformType
  maxChars?: number
  supportsThread: boolean
  requiresAuth: boolean

  /** Publish content to the platform. Must never throw — return error status instead. */
  publish(input: PublishInput): Promise<PublishResult>

  /** Validate credentials for this platform. */
  validate(cred: any): { valid: boolean; message?: string }
}

export interface PublishInput {
  content: string
  title?: string
  cred: any  // platform-specific credential object
}

export type PublishStatus = 'success' | 'skipped' | 'error'

export interface PublishResult {
  platform: string
  status: PublishStatus
  url?: string
  message?: string
}
