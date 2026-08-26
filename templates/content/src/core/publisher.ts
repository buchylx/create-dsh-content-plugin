// Publisher — orchestrates publishing across multiple platform adapters.
// Each adapter is called independently; failures on one platform do not block others.
import type { PlatformAdapter, PublishInput, PublishResult } from './types.js'
{{ADAPTER_IMPORTS}}

const ADAPTERS: Record<string, PlatformAdapter> = {
{{ADAPTER_REGISTRY}}
}

export interface PublishOptions {
  content: string
  title?: string
  creds: Record<string, any>
  targetPlatforms?: string[]
}

export async function publish(opts: PublishOptions): Promise<PublishResult[]> {
  const platformIds = opts.targetPlatforms && opts.targetPlatforms.length > 0
    ? opts.targetPlatforms.filter((id) => ADAPTERS[id])
    : Object.keys(ADAPTERS)

  if (platformIds.length === 0) {
    return [{
      platform: 'all',
      status: 'skipped',
      message: 'No valid platforms configured or selected.',
    }]
  }

  // Run all adapters in parallel. Each adapter handles its own errors.
  const results = await Promise.all(
    platformIds.map(async (id): Promise<PublishResult> => {
      const adapter = ADAPTERS[id]
      const cred = opts.creds[id]

      // Skip if no credentials provided
      const v = adapter.validate(cred)
      if (!v.valid) {
        return {
          platform: id,
          status: 'skipped',
          message: v.message || 'Credentials not configured.',
        }
      }

      try {
        return await adapter.publish({
          content: opts.content,
          title: opts.title,
          cred,
        })
      } catch (e: any) {
        return {
          platform: id,
          status: 'error',
          message: e?.message || String(e),
        }
      }
    }),
  )

  return results
}
