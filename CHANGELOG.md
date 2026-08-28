# Changelog

## [0.4.0] - 2026-xx-xx

### Added
- **`--with-ci` 现在真正生效**：默认给生成出的插件放进 `.github/workflows/release.yml`（`v*` tag → install → typecheck → build → publish 到 npm）。之前该选项只是空操作，README 宣称的「生成产物自带发布流水线」名不副实。
- **`scripts/dsh-compat.mjs`（`pnpm run compat`）**：判断 DSH 版本更新是「仅刷新版本」还是「需要适配模板」。抓取当前 `next` 版本 → 用当前模板重生成全平台插件 → `tsc --noEmit` → 退出码区分 PASS / API DRIFT / UNKNOWN。
- **`.github/workflows/compat.yml`**：每月定时 + 手动触发 + 模板/脚本变动触发，检测到 API 漂移自动开 issue 提醒（带自动去重）。

### Fixed
- **平台分级与文档一致**：LinkedIn 其实已在 `--platforms` 可用且实现完整，原 DESIGN 却标为「Tier-3 不做」。现修正 DESIGN、README、CLI help、向导；`PLATFORM_TIERS` 注释不再误导。
- **`credential.ts` 平台列表由生成器注入**：`KNOWN_PLATFORMS` 不再硬编码，只校验实际生成的平台，与生成时裁剪对齐。
- **`util.js` `run()` 抗同步 throw**：`spawn` 在受限环境会同步抛 EPERM，绕过原有 `{code:-1}` 处理，导致离线版本兜底永远用不上；现已用 try/catch 包裹，忠实于「永不 throw」契约。

### Docs
- README / CONTRIBUTING / DESIGN 同步，加入 compat 命令与发布流水线说明。
