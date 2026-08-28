// Command-line parsing for create-dsh-content (zero deps, uses node:util).
import { parseArgs as parse } from 'node:util'
import { c, paint } from './util.js'
import { TEMPLATES } from './templates.js'

export function parseArgs(argv) {
  const options = {
    template: { type: 'string', short: 't' },
    name: { type: 'string', short: 'n' },
    'plugin-id': { type: 'string' },
    'tool-name': { type: 'string' },
    platforms: { type: 'string' },
    'with-ci': { type: 'boolean', default: true },
    yes: { type: 'boolean', short: 'y' },
    verify: { type: 'boolean' },
    'skip-install': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
  }
  const { values, positionals } = parse({ args: argv, options, allowPositionals: true, strict: false })
  return { targetDir: positionals[0] ?? null, flags: values }
}

export const HELP = `
${paint(c.bold, 'create-dsh-content')} — scaffold a content-automation DSH plugin
${paint(c.bold, 'create-dsh-content')} — 一键生成内容自动化 DSH 插件

${paint(c.cyan, 'Usage / 用法')}
  npm init dsh-content [project-dir] [options]
  npx create-dsh-content [project-dir] [options]

${paint(c.cyan, 'Arguments / 参数')}
  [project-dir]              Target directory (项目目录). Omit to enter the interactive wizard.

${paint(c.cyan, 'Options / 选项')}
  -t, --template <name>      Template: ${TEMPLATES.join(' | ')}  (default: content)
  -n, --name <pkg>           npm package name (默认由目录名推导)
      --plugin-id <id>       cordis patch row id + plugin name export (默认由包名推导)
      --tool-name <name>     Tool name (默认由包名推导)
      --platforms <list>     Comma-separated platforms (平台列表，逗号分隔)
                             devto,bluesky,mastodon,github,linkedin
                             (default: devto,bluesky)
      --with-ci              Include GitHub Actions release pipeline (默认开启)
  -y, --yes                  Skip prompts, use defaults (跳过向导用默认值)
      --verify               After generation: build + install into temp profile + dump-config
                             (生成后自动验证装载)
      --skip-install         Do not run package install inside the generated project
  -h, --help                 Show this help
  -v, --version              Print version

${paint(c.cyan, 'Examples / 示例')}
  npx create-dsh-content my-crosspost --platforms devto,bluesky
  npx create-dsh-content my-publisher -t content --verify
  npx create-dsh-content                           # interactive wizard / 交互向导
`
