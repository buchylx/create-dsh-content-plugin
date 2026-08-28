// Template registry + shared metadata for create-dsh-content.

export const TEMPLATES = ['content']

export const TEMPLATE_META = {
  content: {
    id: 'content',
    label: 'content',
    description: 'content-automation plugin with platform adapters + credential management / 内容自动化插件（多平台适配器 + 凭证管理）',
    defaultPluginId: 'my-content-plugin',
    defaultToolName: 'publish_content',
    asksToolName: true,
  },
}

// Platform tiers — adapters are bundled only for Tier-0; Tier-1+ are optional.
export const PLATFORM_TIERS = {
  'devto':    { tier: 0, label: 'Dev.to',     type: 'article', requiresAuth: true,  maxChars: null },
  'bluesky':  { tier: 0, label: 'Bluesky',    type: 'post',    requiresAuth: true,  maxChars: 300, supportsThread: true },
  'mastodon': { tier: 0, label: 'Mastodon',   type: 'post',    requiresAuth: true,  maxChars: 500, supportsThread: true },
  'github':   { tier: 0, label: 'GitHub',     type: 'gist',    requiresAuth: true,  maxChars: null },
  'linkedin': { tier: 0, label: 'LinkedIn',   type: 'post',    requiresAuth: true,  maxChars: 3000, supportsThread: false },
}

export const DEFAULT_PLATFORMS = ['devto', 'bluesky']

// The 10 pitfalls from the verified spike (bilingual), plus content-specific ones.
export const PITFALLS = [
  {
    en: 'Node version: DSH requires Node ^22.19.0 || >=24.0.0. Older Node only warns EBADENGINE but may hit runtime issues — upgrade if you can.',
    zh: 'Node 版本：DSH 要求 ^22.19.0 || >=24.0.0。旧版本只告警 EBADENGINE，不阻断，但建议升级。',
  },
  {
    en: 'npm dist-tag trap (the big one): `@deepseek-ai/dsh-tools` `latest` is a STALE 0.0.1-rc.1; the real line is under the `next` tag. This scaffold pins the next-tag version for you — never `npm i @deepseek-ai/dsh-tools` over it.',
    zh: 'npm dist-tag 坑（最大）：`@deepseek-ai/dsh-tools` 的 latest 是过期的 0.0.1-rc.1，正确版本在 next tag。本脚手架已锁 next 版本，勿再手动 npm i 覆盖。',
  },
  {
    en: 'Version-line alignment: keep every `@deepseek-ai/dsh-*` package on the same `0.1.0-rc.x` line so pnpm does not install two module copies.',
    zh: '版本线对齐：所有 @deepseek-ai/dsh-* 包统一用同一 0.1.0-rc.x 线，避免 pnpm 装两份模块。',
  },
  {
    en: '`@deepseek-ai/cordis` is a peerDependency: import only `type { Context }` (erased at compile). At runtime the host hands you `ctx` — never import cordis values at runtime.',
    zh: '@deepseek-ai/cordis 是 peerDep：只 import type（编译期擦除），运行时 ctx 由宿主传入。',
  },
  {
    en: 'Pure ESM: package.json must set `"type": "module"`; build with `module: esnext` + `moduleResolution: bundler` to keep bare specifiers.',
    zh: '纯 ESM：package.json 必须 "type": "module"；tsc 用 module:esnext + moduleResolution:bundler 保留 bare specifier。',
  },
  {
    en: '`dsh plugin add <dir>` anchors relative paths to the INVOKING directory — run it from the parent directory, not from inside the plugin.',
    zh: 'dsh plugin add <dir> 的相对路径锚定调用目录——要在插件的父目录执行。',
  },
  {
    en: 'In the bundle `cordis.patch.yml`, `name` is a package name (resolved via node_modules / `$DSH_HOME/profiles/node_modules`), not a relative path.',
    zh: 'bundle 的 cordis.patch.yml 里 name 用包名（走 node_modules 解析），不要用相对路径。',
  },
  {
    en: 'Registrations are effects: `ctx.tools.register()` / `ctx.on()` auto-dispose on unload. Wrap your OWN resources (timers/connections) in `ctx.effect(() => { acquire; return cleanup })`.',
    zh: '注册是 effect：ctx.tools.register()/ctx.on() 卸载自动清理；自己的资源要包 ctx.effect(() => {…; return cleanup})。',
  },
  {
    en: 'Load order = service dependencies, never file order: `export const inject = [\'tools\']` makes the plugin wait until `ctx.tools` is ready.',
    zh: '加载顺序靠服务依赖（inject），不靠文件顺序。',
  },
  {
    en: 'Full end-to-end (model actually calls your tool) needs `DEEPSEEK_API_KEY`; without it `--verify` proves load/list/event, and the model call fails with MISSING_CREDENTIAL.',
    zh: '端到端（模型真正调工具）需 DEEPSEEK_API_KEY；无 key 时 --verify 只能证明加载/列出/事件。',
  },
  // Content-specific pitfalls
  {
    en: 'Content plugins make real network calls. Always wrap HTTP in try/catch and classify errors (rate-limit / auth / bad-request) so the agent can retry or skip per platform.',
    zh: '内容插件会发起真实网络调用。务必用 try/catch 包裹并分类错误（限流/凭证/参数错误），让 agent 能按平台重试或跳过。',
  },
  {
    en: 'Credentials are BYOK — the plugin author needs zero platform approval. Store them in `ctx.config` (not hardcoded) and validate on plugin load with clear missing/invalid/disabled states.',
    zh: '凭证 BYOK——插件作者无需任何平台审批。存在 ctx.config 里（不要硬编码），加载时校验并明确缺凭证/无效/已禁用三种状态。',
  },
]
