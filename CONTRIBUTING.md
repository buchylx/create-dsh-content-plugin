# Contributing

Thanks for your interest in contributing to `create-dsh-content`!

## Quick Start

```sh
# Run the CLI directly (no build step — zero deps pure ESM)
node src/cli.js --help

# Run tests
node --test test/

# Generate a test project and verify it loads
node src/cli.js test-output --platforms devto,bluesky --verify

# After a @deepseek-ai/dsh-* release, decide refresh-vs-adapt in one command
node scripts/dsh-compat.mjs
```

## Project Structure

```
src/           # Scaffold code (Node.js, pure ESM, zero dependencies)
templates/     # Plugin templates (TypeScript — what users get after generation)
test/          # Tests for the scaffold itself
docs/          # Design docs and architecture
```

## Adding a New Platform Adapter (to the template)

1. Create `templates/content/src/adapters/<platform-id>/index.ts`
2. Implement the `PlatformAdapter` interface from `core/types.ts`
3. Add the platform to `PLATFORM_TIERS` in `src/templates.js`
4. Register it in the `ADAPTERS` record in `templates/content/src/core/publisher.ts`
5. Add a test case in `test/generate.test.js`

## Adding a New Template Variant

1. Create a directory under `templates/<variant>/`
2. Add it to `TEMPLATES` and `TEMPLATE_META` in `src/templates.js`
3. Update `generate.js` if the new variant needs special handling

## Coding Conventions

- **Zero dependencies** for the scaffold itself. Template code may have deps.
- Pure ESM (`"type": "module"`).
- Bilingual output (English + Chinese) for CLI messages.
- Use `{{PLACEHOLDER}}` syntax for template tokens.

## Publishing

Push a `vX.Y.Z` tag. The Release workflow will:
1. Run tests
2. Publish to npm (skips if the version already exists)

Requires `NPM_TOKEN` secret — for `npm publish`.
