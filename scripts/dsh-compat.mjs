#!/usr/bin/env node
// dsh-compat — decide whether a DSH package bump is just a "version refresh"
// or a breaking "API change" that needs our template code updated.
//
// This is the check you run after `@deepseek-ai/dsh-*` publishes a new version:
//   1. Resolve the CURRENT `next`-tag versions of the DSH packages.
//   2. Scaffold a fresh plugin from the CURRENT templates (all shipped platforms).
//   3. Install deps + `tsc --noEmit` against it.
//   4. Classify the result.
//
//   PASS      → template still compiles → only a version refresh; no code change.
//   API DRIFT → typecheck failed → DSH likely changed API → adapt templates/content/src, re-release.
//   UNKNOWN   → deps couldn't be installed (offline / registry) → check `npm install` manually.
//
// Run: node scripts/dsh-compat.mjs
// Or:  pnpm run compat           (registered in package.json)
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generate } from '../src/generate.js'
import { run, which, paint, c, ok, warn, err } from '../src/util.js'

const EXIT = { PASS: 0, API_DRIFT: 1, UNKNOWN: 2 }

function section(label) {
  console.log(`\n${paint(c.cyan, `[${label}]`)}`)
}

async function main() {
  console.log(paint(c.bold, '✦ dsh-compat — 判断 DSH 版本更新是「刷新版本」还是「需要适配」'))

  const tmp = await mkdtemp(join(tmpdir(), 'dsh-compat-'))

  // [0] resolve current versions + scaffold the current template.
  let versions
  try {
    section('0/3')
    const result = await generate({
      targetDir: join(tmp, 'compat'),
      name: 'compat',
      template: 'content',
      pluginId: 'compat',
      toolName: 'publish_content',
      platforms: 'devto,bluesky,mastodon,github,linkedin', // every shipped adapter
      skipInstall: true,
      withCI: false,
    })
    versions = result.versions
  } catch (e) {
    console.error(err(`✘ scaffold failed: ${e?.message || String(e)}`))
    await rm(tmp, { recursive: true, force: true })
    process.exit(EXIT.UNKNOWN)
  }

  console.log(paint(c.dim, `  @deepseek-ai/dsh-tools   ${versions.dshTools} (next)`))
  console.log(paint(c.dim, `  @deepseek-ai/dsh-session ${versions.dshSession} (next)`))
  console.log(paint(c.dim, `  @deepseek-ai/cordis      ${versions.cordis}`))
  console.log(paint(c.dim, `  @deepseek-ai/schemastery ${versions.schemastery}`))
  console.log(paint(c.dim, `  @deepseek-ai/dsh         ${versions.dsh} (next)`))

  // Pick a package manager for the temp project.
  const pnpmPath = await which('pnpm')
  const npmPath = await which('npm')
  const pm = pnpmPath ? 'pnpm' : (npmPath ? 'npm' : null)
  if (!pm) {
    console.log(warn('⚠ no pnpm/npm on PATH — skipping install/typecheck. Reported versions above; verify builds manually.'))
    await rm(tmp, { recursive: true, force: true })
    process.exit(EXIT.UNKNOWN)
  }
  console.log(paint(c.dim, `  pm: ${pm} (${pm === 'pnpm' ? pnpmPath : npmPath})`))

  // [1/3] install.
  section('1/3 install')
  let r = await run(pm, ['install'], { cwd: tmp, timeout: 300000 })
  if (r.code !== 0) {
    console.log(err('✘ install failed.'))
    if (r.stderr?.trim()) console.log(paint(c.dim, r.stderr.trim().slice(-2000)))
    console.log(err('=> UNKNOWN: dependencies could not be installed (offline / registry). Check `npm install` manually.'))
    await rm(tmp, { recursive: true, force: true })
    process.exit(EXIT.UNKNOWN)
  }
  console.log(ok('✔ install ok. Also ensure the harness packages are reachable on your registry.'))

  // [2/3] typecheck against the current template.
  section('2/3 typecheck (tsc --noEmit)')
  r = await run(pm, ['run', 'typecheck'], { cwd: tmp, timeout: 180000 })
  if (r.code !== 0) {
    console.log(err('✘ typecheck FAILED.'))
    if (r.stdout?.trim()) console.log(paint(c.dim, r.stdout.trim().slice(-4000)))
    if (r.stderr?.trim()) console.log(paint(c.dim, r.stderr.trim().slice(-4000)))
    console.log(err('=> API DRIFT: the current DSH packages may have changed API. ' +
      'Adapt `templates/content/src` (defineTool / inject / apply(ctx, config) / cordis.patch.yml) and re-release the scaffold.'))
    await rm(tmp, { recursive: true, force: true })
    process.exit(EXIT.API_DRIFT)
  }

  // [3/3] PASS.
  section('3/3 result')
  console.log(ok('✔ typecheck PASSED.'))
  console.log(ok('=> COMPAT OK: template still compiles against the current DSH packages — just a version refresh, no code change needed.'))
  await rm(tmp, { recursive: true, force: true })
  process.exit(EXIT.PASS)
}

main()
