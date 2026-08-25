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
