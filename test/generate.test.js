// Basic smoke test for the content plugin scaffold.
// Run with: node --test test/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { generate } from '../src/generate.js'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))

test('generate creates expected files for content template', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'cdc-test-'))
  try {
    const result = await generate({
      targetDir: join(tmp, 'my-crosspost'),
      name: 'my-crosspost',
      template: 'content',
      pluginId: 'my-crosspost',
      toolName: 'publish_content',
      platforms: 'devto,bluesky',
      skipInstall: true,
    })

    assert.ok(result.files.length > 0, 'should generate files')
    assert.ok(result.files.includes('src/index.ts'), 'should have main entry')
    assert.ok(result.files.includes('src/core/publisher.ts'), 'should have publisher')
    assert.ok(result.files.includes('src/adapters/devto/index.ts'), 'should include devto adapter')
    assert.ok(result.files.includes('src/adapters/bluesky/index.ts'), 'should include bluesky adapter')
    assert.ok(!result.files.includes('src/adapters/mastodon/index.ts'), 'should NOT include unselected mastodon adapter')
    assert.ok(!result.files.includes('src/adapters/github/index.ts'), 'should NOT include unselected github adapter')
    assert.ok(result.files.includes('cordis.patch.yml'), 'should have bundle patch')
    assert.ok(result.files.includes('package.json'), 'should have package.json')

    // Verify placeholder replacement happened
    const pkgJson = JSON.parse(await readFile(join(result.targetAbs, 'package.json'), 'utf8'))
    assert.equal(pkgJson.name, 'my-crosspost')
    assert.ok(pkgJson.dependencies['@deepseek-ai/dsh-tools'], 'should pin dsh-tools version')
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
})

test('generate refuses non-empty directory', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'cdc-test-exists-'))
  try {
    // Put something in the dir
    await writeFileDeep(join(tmp, 'existing.txt'), 'stuff')
    await assert.rejects(
      () => generate({
        targetDir: tmp,
        name: 'x',
        template: 'content',
        pluginId: 'x',
        toolName: 'x',
        platforms: 'devto',
        skipInstall: true,
      }),
      /not empty/,
    )
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
})

// Helper
import { writeFile as _writeFile, mkdir } from 'node:fs/promises'
async function writeFileDeep(file, content) {
  await mkdir(dirname(file), { recursive: true })
  await _writeFile(file, content, 'utf8')
}

// Regression: apply() must receive config as the 2nd argument (Cordis pattern),
// NOT via ctx.config (which throws "cannot get property config without inject").
test('index.ts reads config via apply 2nd-arg, not ctx.config', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'cdc-id-'))
  try {
    const result = await generate({
      targetDir: join(tmp, 'p'),
      name: 'p',
      template: 'content',
      pluginId: 'my-plugin',
      toolName: 'publish_content',
      platforms: 'devto',
      skipInstall: true,
    })

    const index = await readFile(join(result.targetAbs, 'src/index.ts'), 'utf8')
    assert.match(index, /apply\(ctx: Context, config: any = \{\}\)/, 'should take ctx + config 2nd-arg')
    assert.match(index, /config\?\.platforms/, 'should read creds from config arg')
    assert.doesNotMatch(index, /ctx\.config/, 'should NOT use ctx.config')
    assert.doesNotMatch(index, /ctx as any/, 'should not cast ctx')
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
})

test('with-ci gates the .github release pipeline', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'cdc-ci-'))
  try {
    // Default (withCI undefined) → pipeline included.
    const withCi = await generate({
      targetDir: join(tmp, 'a'),
      name: 'a', template: 'content', pluginId: 'a', toolName: 'x',
      platforms: 'devto', skipInstall: true,
    })
    assert.ok(withCi.files.includes('.github/workflows/release.yml'), 'default should include the release pipeline')
    assert.match(withCi.files.join('\n'), /cordis\.patch\.yml/, 'still has the cordis bundle patch')

    // withCI:false → pipeline excluded, README reflects off.
    const noCi = await generate({
      targetDir: join(tmp, 'b'),
      name: 'b', template: 'content', pluginId: 'b', toolName: 'x',
      platforms: 'devto', skipInstall: true, withCI: false,
    })
    assert.ok(!noCi.files.includes('.github/workflows/release.yml'), 'withCI=false should drop the release pipeline')
    const readme = await readFile(join(noCi.targetAbs, 'README.md'), 'utf8')
    assert.match(readme, /CI \/ release pipeline: `off`/, 'README should report CI off when disabled')
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
})

test('credential.ts KNOWN_PLATFORMS only lists selected platforms', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'cdc-cred-'))
  try {
    const result = await generate({
      targetDir: join(tmp, 'p'),
      name: 'p', template: 'content', pluginId: 'p', toolName: 'x',
      platforms: 'devto,github', skipInstall: true,
    })
    const cred = await readFile(join(result.targetAbs, 'src/services/credential.ts'), 'utf8')
    assert.match(cred, /KNOWN_PLATFORMS = \['devto', 'github'\]/, 'should list only generated platforms')
    assert.doesNotMatch(cred, /'bluesky'/, 'should NOT reference an unselected platform')
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
})
