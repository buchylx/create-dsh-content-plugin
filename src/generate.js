// Template rendering + file writing for create-dsh-content.
import { readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'
import { c, paint, ok, exists, writeFileDeep, readText, resolveDshVersions } from './util.js'
import { TEMPLATE_META, PITFALLS, PLATFORM_TIERS } from './templates.js'

const here = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_ROOT = resolve(here, '../templates')

async function listFiles(dir, base = dir) {
  const out = []
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry)
    const st = await stat(full)
    if (st.isDirectory()) out.push(...await listFiles(full, base))
    else out.push(relative(base, full).replace(/\\/g, '/'))
  }
  return out
}

function renderPitfalls() {
  const lines = ['## Pitfalls / 坑（从真实 spike 提炼，防呆）', '']
  for (let i = 0; i < PITFALLS.length; i++) {
    const p = PITFALLS[i]
    lines.push(`${i + 1}. ${p.en}`)
    lines.push(`   - ${p.zh}`)
    lines.push('')
  }
  return lines.join('\n')
}

function parsePlatforms(csv) {
  return String(csv || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && PLATFORM_TIERS[s])
}

function renderPlatformList(platformIds) {
  return platformIds.map((id) => `- \`${id}\` — ${PLATFORM_TIERS[id].label}`).join('\n')
}

export async function generate(cfg) {
  const meta = TEMPLATE_META[cfg.template]
  const versions = await resolveDshVersions()

  const targetAbs = resolve(cfg.targetDir)
  if (await exists(targetAbs) && await readdir(targetAbs).then((l) => l.length > 0)) {
    throw new Error(
      `target directory ${JSON.stringify(cfg.targetDir)} is not empty — refusing to overwrite. Choose a new directory or empty it first.`,
    )
  }

  const platformIds = parsePlatforms(cfg.platforms)
  if (platformIds.length === 0) {
    throw new Error(`no valid platforms selected from "${cfg.platforms}". Available: ${Object.keys(PLATFORM_TIERS).join(', ')}`)
  }

  // Include the release pipeline (`.github/workflows/release.yml`) unless --with-ci=false.
  // The flag is a no-op historically; now it actually gates the `.github` dir.
  const includeCI = cfg.withCI !== false

  // Build per-platform import lines + registry entries for publisher.ts.
  // The publisher statically imports only the selected adapters — this keeps
  // the generated project free of references to unselected platform dirs
  // (which generate.js filters out above).
  const adapterImports = platformIds
    .map((id) => `import { ${id}Adapter } from '../adapters/${id}/index.js'`)
    .join('\n')
  const adapterRegistry = platformIds
    .map((id) => `  ${id}: ${id}Adapter,`)
    .join('\n')

  const tokens = {
    PKG_NAME: cfg.name,
    PKG_DESCRIPTION: `${cfg.name} — a content-automation DSH plugin.`,
    PLUGIN_ID: cfg.pluginId,
    TOOL_NAME: cfg.toolName || 'publish_content',
    DSH_TOOLS_VERSION: versions.dshTools,
    DSH_SESSION_VERSION: versions.dshSession,
    CORDIS_VERSION: versions.cordis,
    SCHEMASTERY_VERSION: versions.schemastery,
    DSH_VERSION: versions.dsh,
    YEAR: String(new Date().getFullYear()),
    PITFALLS: renderPitfalls(),
    PLATFORM_LIST: renderPlatformList(platformIds),
    PLATFORM_IDS: platformIds.join(','),
    PLATFORM_IDS_LIST: platformIds.map((id) => `'${id}'`).join(', '),
    WITH_CI: includeCI ? 'on' : 'off',
    RELEASE_SECTION: includeCI
      ? '## Release pipeline\n\nBecause CI is enabled (`--with-ci`), a `v*` tag push triggers `.github/workflows/release.yml`: it installs, type-checks, builds, and publishes this plugin to npm. Set an `NPM_TOKEN` repo secret to publish.'
      : '(Release pipeline not included — regenerate with `--with-ci` to add it.)',
    ADAPTER_IMPORTS: adapterImports,
    ADAPTER_REGISTRY: adapterRegistry,
  }

  const replace = (content) =>
    content.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in tokens ? tokens[key] : m))

  const srcRoot = join(TEMPLATES_ROOT, cfg.template)
  const allFiles = await listFiles(srcRoot)

  // Filter: only include adapters the user selected (skip unselected adapter dirs)
  // and, when CI is off, drop the `.github` release pipeline entirely.
  const files = allFiles.filter((rel) => {
    if (!includeCI && rel.startsWith('.github/')) return false
    const m = rel.match(/^src\/adapters\/([a-z0-9_-]+)\//)
    if (!m) return true
    return platformIds.includes(m[1])
  })

  const written = []
  for (const rel of files) {
    const content = replace(await readText(join(srcRoot, rel)))
    await writeFileDeep(join(targetAbs, rel), content)
    written.push(rel)
  }

  console.log('')
  console.log(ok(`✔ Generated ${cfg.template} plugin in ${targetAbs} (生成完成)`))
  console.log(paint(c.dim, `  package: ${cfg.name}  plugin-id: ${cfg.pluginId}  tool: ${cfg.toolName}`))
  console.log(paint(c.dim, `  platforms: ${platformIds.join(', ')}`))
  console.log(paint(c.dim, `  @deepseek-ai/dsh-tools pinned to ${versions.dshTools} (next tag)`))

  return { cfg, versions, files: written, targetAbs, platformIds }
}
