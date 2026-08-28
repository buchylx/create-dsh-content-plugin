# M1 启动清单 — dsh-crosspost 旗舰插件开发

工作目录：`c:\Users\KK\Dev\dsh-crosspost`
状态：✅ 已生成、已构建（tsc 通过）、已装载验证（dsh plugin add + dump-config 全过）

## 0. 当前资产

- **npm 包**: `create-dsh-content@0.1.0`（个人发布，M0 完成）
- **仓库**: `github.com/buchylx/create-dsh-content-plugin`
- **DSH host**: `@deepseek-ai/dsh@0.1.1-rc.2`（全局 pnpm 安装）
- **dsh-tools**: 已锁定 `0.1.1-rc.2`（无 stale 坑）
- 4 平台适配器全部就位：`devto` / `github` / `bluesky` / `mastodon`

## 1. 项目结构（关键文件）

```
dsh-crosspost/
├── src/
│   ├── index.ts              # cordis 插件入口 + ctx.command
│   ├── core/
│   │   ├── types.ts          # PlatformAdapter 接口、publish_content 工具 schema
│   │   └── publisher.ts      # 并行发布 + 单平台失败不阻塞
│   ├── adapters/
│   │   ├── devto/index.ts    # ✅ 真实实现（POST /api/articles）
│   │   ├── github/index.ts   # ✅ 真实实现（POST /gists）
│   │   ├── bluesky/index.ts  # ⏸ stub（待实现）
│   │   └── mastodon/index.ts # ⏸ stub（待实现）
│   ├── formatters/markdown.ts # 跨平台格式清洗
│   └── services/credential.ts # BYOK 凭证管理（已配/未配/失效三态）
├── cordis.patch.yml          # 版本锁定
└── package.json              # bin 已配
```

## 2. 需要你手动做的事（凭证）

### Dev.to（真实可用）
1. 登录 dev.to → 右上头像 → Settings → Profile → 底部 **API Keys**
2. 生成 key，复制存到本地（发给对话里的 AI，让它持久化到 DSH profile）

### GitHub（真实可用）
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → 勾 **gist** scope（写 Gist 需要）
3. 复制 token

### Bluesky / Mastodon（stub，暂不需要凭证）
- 先不填。适配器是 stub，验证时不回传失败

## 3. 填凭证 + 真实发文（第一步里程碑）

```bash
# 1) 装载插件到你的 DSH profile（从父目录）
dsh plugin --profile main add c:\Users\KK\Dev\dsh-crosspost

# 2) 启动 DSH，让 agent 加载插件
dsh --profile main        # 或 dsh --profile main --dump-config 看插件行在不在

# 3) 告诉 DSH agent：用 dsh_crosspost 工具发一篇测试内容到 dev.to + github
```

## 4. 第一篇引流内容（写完发 Dev.to + GitHub）

题目建议：**"How I automated my content distribution with a DSH plugin I scaffolded myself"**

结构：
- 为什么（海外私域是第一步）
- 我从零搭 DSH content 插件踩的 3 个坑（stale-latest / ESM / cordis.patch）
- 用脚手架 60 秒生成可运行插件 + `--verify` 全绿
- 端到端 dogfooding：用自己发的包生成旗舰插件
- 链接：create-dsh-content on GitHub + npm

## 5. 后续里程碑（节奏建议）

| 里程碑 | 内容 | 标记 |
|---|---|---|
| M1.1 | 真实 Dev.to + GitHub 发文跑通，首个真实内容上线 | 优先 |
| M1.2 | 实现 bluesky 适配器（AT Proto，代码量适中） | 中 |
| M1.3 | 实现 mastodon 适配器 | 中 |
| M1.4 | 给插件也做一次发布（v0.2.0）+ 使用体验反馈回到脚手架 | 提升 |
| M1.5 | 用 dsh-crosspost 自身多平台发文积累 follower | 持续 |

## 6. 环境备注（这台机器）

- **pnpm 已装**: `corepack enable` → `pnpm@11.18.0`，全局 bin `C:\Users\KK\AppData\Local\pnpm\bin`
- **dsh 全局可用**: `pnpm install -g @deepseek-ai/dsh@next` → `dsh --version` = `0.1.1-rc.2`
- **npm 在 Windows 解析大依赖图会挂**: 项目内安装优先用 pnpm；`npx -y` 跑 dsh 会卡住，用全局 dsh 命令替代
- **registry 是镜像**: `npm config get registry` → npmmirror（dev.to/github API 不受影响，走 HTTPS）

## 7. 给新对话助手的提示词（可直接粘贴）

```
继续 M1：在 c:\Users\KK\Dev\dsh-crosspost 上开发旗舰内容发布插件 dsh-crosspost。
背景：M0 已发布脚手架 create-dsh-content@0.1.0；用脚手架生成的这个插件已通过 --verify（编译+装载）。
目标：1) 我先填 Dev.to 和 GitHub 凭证（你指导我 URL）；2) 装载进 DSH profile；3) 真实发一篇测试内容到 dev.to+github；
4) 编写第一篇引流内容并发布。实现 bluesky/mastodon 适配器看精力，不作为第一步。
```