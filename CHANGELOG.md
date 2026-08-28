# Changelog

## [0.4.0] - 2026-xx-xx

### Added
- **`--with-ci` 现在真正生效**：默认给生成出的插件放进 `.github/workflows/release.yml`（`v*` tag → install → typecheck → build → publish 到 npm）。之前该选项只是空操作，README 宣称的「生成产物自带发布流水线」名不副实。
- **`scripts/dsh-compat.mjs`（`pnpm run compat`）**：判断 DSH 版本更新是「仅刷新版本」还是「需要适配模板」。抓取当前 `next` 版本 → 用当前模板重生成全平台插件 → `tsc --noEmit` → 退出码区分 PASS / API DRIFT / UNKNOWN。
- **`.github/workflows/compat.yml`**：每月定时 + 手动触发 + 模板/脚本变动触发，检测到 API 漂移自动开 issue 提醒（带自动去重）。

### Fixed
- **CI 发布权限修复**：`release.yml` 里请求了 `administration: write`，但 `GITHUB_TOKEN` 不支持该权限，导致整个工作流 0-job 失败、连 npm publish 都不执行（0.4.0 因此从未发布成功）。现已移除非法权限，并把「打 topic」步骤改为 `continue-on-error`（`GITHUB_TOKEN` 无法设置 repo topics；如需真正打上，用带 repo scope 的 PAT 走 `TOPIC_TOKEN` secret）。
- **发布步骤幂等化**：`npm publish` 前先查 npmjs 上该版本是否已存在，存在则跳过——重复推送 / master 分支误触发不会再报「already published」红。
- **topic 步骤接入 `TOPIC_TOKEN`**：设置 `TOPIC_TOKEN` secret（带 `repo` scope 或 `Administration: write` 权限的 PAT）即真正打上 topic；未设置则自动回退 `GITHUB_TOKEN` 并安全忽略 403。
- **`dsh-compat` 安装目录修复**：此前在临时根目录跑 `npm install`（ENOENT），现改为在生成的插件目录（`result.targetAbs`）安装并 `tsc --noEmit`，CI 实测 PASS（当前 next `0.1.1-rc.2` 与模板兼容）。
- **平台分级与文档一致**：LinkedIn 其实已在 `--platforms` 可用且实现完整，原 DESIGN 却标为「Tier-3 不做」。现修正 DESIGN、README、CLI help、向导；`PLATFORM_TIERS` 注释不再误导。
- **`credential.ts` 平台列表由生成器注入**：`KNOWN_PLATFORMS` 不再硬编码，只校验实际生成的平台，与生成时裁剪对齐。
- **`util.js` `run()` 抗同步 throw**：`spawn` 在受限环境会同步抛 EPERM，绕过原有 `{code:-1}` 处理，导致离线版本兜底永远用不上；现已用 try/catch 包裹，忠实于「永不 throw」契约。

### Docs
- README / CONTRIBUTING / DESIGN 同步，加入 compat 命令与发布流水线说明。
