# Design & Architecture

> 设计文档 — 记录为什么这么做，而不只是做了什么。

## 定位

`create-dsh-content` 是一个**面向「内容自动化」的 DSH 插件领域脚手架**。它不是又一个通用模板——通用层交给 `create-dsh-plugin`，我们的差异化在「内容发布领域层」。

核心主张：**做内容插件的 80% 是接线杂活（平台适配、凭证管理、格式转换），真正想做的功能只占 20%。脚手架把 80% 做成填空题。**

## 为什么不直接 fork create-dsh-plugin

`create-dsh-plugin` 的价值在「通用脚手架机制」：版本锁定、沙箱验证、参数解析、模板替换。这些是基础设施，我们原样复用。

我们的增量在：
1. **领域模板** — `content` 模板，含平台适配器层、凭证管理、格式适配
2. **平台裁剪** — `--platforms` 选项按选择生成对应适配器，不生成没用的
3. **发布流水线** — GitHub Actions 一键发布到 npm + 打 topic + 索引占位
4. **领域防呆** — 内容插件特有的坑（网络错误分类、BYOK 凭证三态）

## 架构

```
create-dsh-content (脚手架本体，JS, 零依赖)
├── src/cli.js          入口编排
├── src/args.js         命令行解析
├── src/prompt.js       交互向导
├── src/templates.js    模板注册表 + 平台分级 + 坑清单
├── src/generate.js     模板渲染 + 平台裁剪
├── src/util.js         版本锁定 + 子进程 + 文件工具
├── src/verify.js       沙箱验证
└── templates/
    └── content/        ★ 内容插件模板 (TS, 用户生成后拿到的东西)
        ├── src/
        │   ├── index.ts              插件入口 (defineTool)
        │   ├── core/                 平台无关核心
        │   │   ├── types.ts          PlatformAdapter 接口
        │   │   └── publisher.ts      多平台编排
        │   ├── adapters/             平台适配器 (按 --platforms 裁剪)
        │   │   ├── devto/
        │   │   ├── bluesky/
        │   │   ├── mastodon/
        │   └── github/
        │   ├── formatters/           格式转换层
        │   │   └── markdown.ts
        │   └── services/             服务层
        │       └── credential.ts     凭证管理 (BYOK)
        ├── package.json              声明 dsh.bundle.patch
        ├── cordis.patch.yml          bundle patch
        ├── tsconfig.json
        └── README.md
```

## 关键设计决策

### 1. BYOK + 适配器模式（架构核心）

**问题**：如果插件作者需要申请平台 API 权限，那每个平台的准入政策都会成为项目的生死线。

**决策**：凭证完全由终端用户自填（Bring Your Own Key），插件作者零审批。适配器模式隔离各平台——任何一个平台政策变化只影响对应适配器，不影响核心和其他平台。

**后果**：
- 插件作者无需任何平台合作/审核
- 用户数据（token）留在自己的 DSH profile 配置里
- 平台故障/政策变化是局部的，不是全局的

### 2. 平台分级（Tier-0 起步）

**问题**：上来就做 10 个平台，每个都浅，维护成本爆炸。

**决策**：按「开放 · 免费 · 免审批」程度分四级，v1 只做 **Tier-0**（已实装）：
- **Tier-0**（v1 内置，已实装 `--platforms` 可选）：Dev.to · GitHub · Bluesky · Mastodon · LinkedIn
  - LinkedIn 适配器也已完整实装，但因 OAuth 应用审核接入成本高，标记为「实验性」——不在旗舰路线，读者不要误以为尚未支持。
- **Tier-1**（路线图，未实装）：Kit · Reddit
- **Tier-2**（付费墙，路线图）：Hashnode · X(Twitter)
- **Tier-3**（未来，硬审核）：Meta（合作制）

**后果**：所有 Tier-0 适配器在 `--platforms` 里被选中即生成对应代码；路线图平台在仓库中还没有适配器目录，因此不会被生成任何代码。tier 分级用来指导「先做哪些」，而非运行时过滤——实际能力以 `PLATFORM_TIERS` 注册表为准。

### 3. 生成时裁剪适配器

**问题**：如果模板包含所有平台的适配器，用户不用的平台代码也在包里——冗余、混淆、还可能引入不需要的依赖。

**决策**：`generate.js` 在生成时按 `--platforms` 参数过滤 `src/adapters/<id>/` 目录，只保留用户选了的。

**后果**：生成的项目精简单一，每个适配器都对应用户实际要发的平台。

### 4. 错误从不抛出，只返回状态

**问题**：内容插件是多平台并行发布。A 平台挂了不应该影响 B 平台。

**决策**：每个 adapter 的 `publish()` 永远不 throw。错误被 catch 后转成 `{ status: 'error', message }`。Publisher 层并行调用所有 adapter，结果按平台返回。

**后果**：agent 能看到每个平台的独立状态，能决定重试哪个、跳过哪个。整体更健壮。

### 5. 复用 create-dsh-plugin 的约定，不重复造轮子

**问题**：从零写脚手架，版本锁定、沙箱验证这些坑都要自己踩一遍。

**决策**：核心约定（版本锁定逻辑、cordis.patch.yml 接线、10 大坑防呆、verify 四步法）直接从 `create-dsh-plugin` 搬过来，保持一致。我们的工作量集中在「内容领域层」。

**后果**：
- 省掉大量基础设施工作
- 用户从 `create-dsh-plugin` 迁移过来有熟悉感
- 我们的差异化清晰，不在通用层内卷

## 与 create-dsh-plugin 的关系

| 层 | create-dsh-plugin | create-dsh-content |
|---|---|---|
| 通用脚手架机制 | ✅ 原创 | ⚡ 复用约定 |
| 模板类型 | tool / events / webui / panel / preset-pack | content（新增） |
| 版本锁定 | ✅ | ✅ 同样逻辑 |
| 沙箱验证 | ✅ | ✅ 同样四步法 |
| 平台适配层 | ❌ | ✅ 核心差异 |
| 凭证管理 | ❌ | ✅ BYOK |
| 格式转换 | ❌ | ✅ |
| 发布流水线 | ❌ | ✅ GitHub Actions |
| 领域防呆 | 通用 10 坑 | 通用 + 内容特有 2 坑 |

## 路线图

- **M0**：脚手架本体跑通，content 模板能生成可编译项目
- **M1**：用本脚手架生成旗舰 `dsh-crosspost`，真实运营
- **M2**：发布流水线 + 文档 + 生态收录
- **M3**：更多平台适配器 + 领域模板扩展（Newsletter/数据看板）
