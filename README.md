# create-dsh-content

> Scaffold a **content-automation** DeepSeek Harness (DSH) plugin in seconds.
> 一键生成面向「内容自动化」的 DeepSeek Harness 插件。

Zero dependencies, pure ESM, Node `^22.19 || >=24`. Dual mode: **non-interactive flags** or an **interactive wizard** (bilingual prompts).

Built on the conventions proven by [`create-dsh-plugin`](https://www.npmjs.com/package/create-dsh-plugin) — same `next`-tag version pinning, same `--verify` smoke test — and extended with a **content-publishing domain layer**: platform adapters, credential management (BYOK), cross-platform formatting, and a release pipeline that gets your plugin indexed by the ecosystem.

---

## Quick Start

```sh
# Non-interactive
npx create-dsh-content my-crosspost --platforms devto,bluesky

# Interactive wizard
npx create-dsh-content
```

### Options

| Flag | Description |
|---|---|
| `-t, --template <content>` | Template variant (default `content`) |
| `-n, --name <pkg>` | npm package name (derived from dir) |
| `--plugin-id <id>` | cordis patch row id + plugin `name` export |
| `--tool-name <name>` | Tool name (default derived from package name) |
| `--platforms <list>` | Comma-separated platforms: `devto,bluesky,mastodon,github,linkedin` |
| `-y, --yes` | Skip prompts, use defaults |
| `--verify` | After generation: build + install into temp profile + dump-config |
| `--skip-install` | Skip `pnpm install` inside the generated project |
| `--with-ci` | Include GitHub Actions release pipeline (default: on) |
| `-h, --help` | Show help |
| `-v, --version` | Print version |

## What you get

Every generated project ships with:

- **Platform adapter layer** — `PlatformAdapter` interface + working adapters for Dev.to / GitHub / Bluesky / Mastodon / LinkedIn (BYOK, no platform approval needed from the plugin author; LinkedIn is marked experimental due to OAuth review)
- **Credential management** — typed credential service with validation (missing / invalid / disabled states)
- **Cross-platform formatters** — Markdown normalization, auto-split for long posts, result card rendering
- **Version pinning** — `@deepseek-ai/dsh-tools` pinned to the `next`-tag version (npm `latest` is a stale `0.0.1-rc.1`)
- **Release pipeline** — `--with-ci` (default on) drops a GitHub Actions workflow into the generated project: type-check → build → publish to npm on a `v*` tag
- **Pitfall guardrails** — the 10 real-world pitfalls from the verified spike, baked into the generated README

## Why a domain scaffold?

`create-dsh-plugin` gives you a standard empty kitchen — appliances work, but you cook from scratch. `create-dsh-content` gives you a **ready-to-run content operation kitchen**: adapters wired, credential drawers labeled, format rules in place, plating pre-designed. You focus on what makes your plugin unique.

Read the full design rationale in [`docs/DESIGN.md`](docs/DESIGN.md).

## Development

```sh
node src/cli.js --help
node --test test/

# After a @deepseek-ai/dsh-* release: is it just a version refresh, or do we
# need to adapt the template? Compile-checks the current template against the
# current `next` DSH packages.
node scripts/dsh-compat.mjs    # or: pnpm run compat
```

## License

MIT
