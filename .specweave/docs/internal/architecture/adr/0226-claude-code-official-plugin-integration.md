# ADR-0226: Claude Code Official Plugin Integration Strategy

**Status**: Accepted
**Date**: 2026-01-10
**Updated**: 2026-01-27 (clarified LSP plugins are NOT skills)
**Decision Makers**: SpecWeave Core Team
**Category**: Integration

## Context

SpecWeave provides specialized skills and agents for various domains (mobile, frontend, backend, DevOps, etc.). Claude Code offers an official plugin ecosystem with high-quality integrations for:

1. **Language Server Protocol (LSP) plugins** - Code intelligence for 11+ languages
2. **Developer tools** - Code review, hookify, frontend-design
3. **External integrations** - Greptile, Vercel, Stripe, Supabase, etc.

Currently, SpecWeave skills operate independently without leveraging these official plugins. This creates missed opportunities for:
- Enhanced code intelligence during skill execution
- Safety rails via hookify
- Faster codebase search via Greptile for large repos
- Platform-specific integrations (Vercel for frontend, Stripe for payments)

## ⚠️ CRITICAL: LSP Plugins vs Skills

**LSP plugins are NOT skills!** They are a fundamentally different plugin type:

| Plugin Type | Has SKILL.md | How to Use | Example |
|-------------|--------------|------------|---------|
| **Skill plugins** | ✅ Yes | `/skill-name` or `Skill({ skill: "name" })` | sw:pm, frontend-design |
| **LSP plugins** | ❌ No | **AUTOMATIC** - activates on file extension | csharp-lsp, typescript-lsp |

LSP plugins use `lspServers` configuration in `marketplace.json`, NOT `skills/` folders:
```json
{
  "name": "csharp-lsp",
  "lspServers": {
    "csharp-ls": {
      "command": "csharp-ls",
      "extensionToLanguage": { ".cs": "csharp" }
    }
  }
}
```

**You CANNOT invoke LSP plugins** - they work transparently when editing code files.

## Decision

**Integrate Claude Code official plugins into SpecWeave skills through documented recommendations with graceful degradation.**

### Why Recommendations Only (Not Dependencies)

**Claude Code does NOT currently support plugin dependencies.** Each plugin is completely independent ([Issue #9444](https://github.com/anthropics/claude-code/issues/9444) proposes this feature but it's not yet implemented).

This means:
- SpecWeave **cannot require** official plugins as dependencies
- SpecWeave **cannot programmatically detect** if a plugin is installed
- Users must **manually install** recommended plugins via `/plugin` command

### Integration Strategy

| Approach | Description | Implementation |
|----------|-------------|----------------|
| **Documentation** | Recommend plugins in skill/agent files | Add "Recommended Plugins" sections |
| **Graceful Degradation** | Skills work without plugins | Reduced capability, not failure |
| **User Education** | Guide installation | Include `/plugin install` commands |
| **Hookify Templates** | Ship pre-configured rules | Users copy to `.claude/` directory |

### NO Runtime Detection

Since Claude Code lacks plugin introspection APIs, SpecWeave skills should:
- ✅ **Document** which plugins enhance the experience
- ✅ **Work without** plugins (graceful degradation)
- ❌ **NOT check** for plugin availability at runtime
- ❌ **NOT fail** if plugins aren't installed

### Plugin Mappings

#### LSP Plugins (Language Intelligence) - AUTOMATIC

**LSP plugins work AUTOMATICALLY** when editing code files. No invocation needed.

| File Extension | LSP Plugin Activated | What It Provides |
|----------------|---------------------|------------------|
| `.cs` | `csharp-lsp` | C# type checking, references, definitions |
| `.ts`, `.tsx`, `.js`, `.jsx` | `typescript-lsp` | TypeScript/JS intelligence |
| `.py`, `.pyi` | `pyright-lsp` | Python type hints, diagnostics |
| `.go` | `gopls-lsp` | Go code intelligence |
| `.rs` | `rust-analyzer-lsp` | Rust analysis |
| `.java` | `jdtls-lsp` | Java language server |
| `.swift` | `swift-lsp` | Swift/iOS code intelligence |
| `.kt`, `.kts` | `kotlin-lsp` | Kotlin language server |

**Relevant SpecWeave skills benefit from LSP automatically:**

| SpecWeave Skill/Agent | Files Edited | LSP Automatically Activates |
|-----------------------|--------------|------------------------------|
| `sw-mobile:mobile-architect` | `.swift`, `.kt` | swift-lsp, kotlin-lsp |
| `sw-frontend:frontend-architect` | `.ts`, `.tsx` | typescript-lsp |
| `sw-backend:dotnet-backend` | `.cs` | csharp-lsp |
| `sw-backend:nodejs-backend` | `.ts`, `.js` | typescript-lsp |
| `sw-ml:ml-engineer` | `.py` | pyright-lsp |

#### Developer Tools

| SpecWeave Skill/Agent | Plugin | Benefit |
|-----------------------|--------|---------|
| **ALL skills** | `hookify` | Safety rails for destructive operations |
| `sw-testing:qa-engineer` | `hookify` | Enforce test-before-commit patterns |
| `sw-frontend:frontend-architect` | `frontend-design` | Production-grade UI aesthetics |
| `/code-review` (built-in) | `code-review` | Multi-agent PR review with confidence scoring |

#### External Integrations

| SpecWeave Skill/Agent | Plugin | Benefit |
|-----------------------|--------|---------|
| Living Docs Sync | `greptile` | AI-powered semantic codebase search |
| `sw-frontend:frontend-architect` | `vercel` MCP | Deployment, logs, project management |
| `sw-payments:payment-integration` | `stripe` | Native Stripe API access |
| `sw-backend` | `supabase`, `firebase` | Backend service integration |
| `sw-testing:qa-engineer` | `playwright` | E2E test automation |

### Hookify Integration (Critical)

Hookify provides safety rails via markdown configuration. SpecWeave should ship recommended hookify rules:

```yaml
# .claude/hookify.block-direct-metadata-edit.local.md
---
name: block-direct-metadata-edit
enabled: true
event: file
action: block
conditions:
  - field: file_path
    operator: regex_match
    pattern: metadata\.json$
  - field: new_text
    operator: contains
    pattern: '"status":\s*"completed"'
---
Use /sw:done to close increments, not direct metadata.json edits!
```

### Greptile for Living Docs (Performance)

For large codebases (>100k lines), recommend Greptile over grep-based search:

- **Traditional**: `grep` + `glob` = O(n) file scanning
- **Greptile**: Semantic graph search = O(log n) with context awareness

Integration point: `/sw:living-docs` can detect Greptile availability and use it for brownfield analysis.

## Consequences

### Positive

1. **Enhanced Code Intelligence**: LSP plugins provide go-to-definition, find-references, diagnostics
2. **Safety Rails**: Hookify prevents dangerous operations (rm -rf, force push, direct metadata edits)
3. **Performance**: Greptile accelerates large codebase analysis
4. **Platform Integration**: Direct access to Vercel, Stripe, Supabase APIs

### Negative

1. **Optional Dependencies**: Users must install plugins separately
2. **Documentation Overhead**: Must maintain plugin recommendations per skill
3. **Version Coupling**: Plugin updates may affect skill behavior

### Neutral

1. **Graceful Degradation**: Skills work without plugins, just with reduced capability
2. **User Choice**: Recommendations, not requirements (except for specialized use cases)

## Implementation

### Phase 1: Documentation (This ADR) ✅
- Document plugin recommendations in CLAUDE.md
- Create reference document in living docs
- **Completed**: [claude-code-official-plugins.md](../guides/claude-code-official-plugins.md)

### Phase 2: Skill Updates ✅
- Add "Recommended Plugins" section to key AGENT.md/SKILL.md files
- **Completed**: mobile-architect with swift-lsp, kotlin-lsp recommendations

### Phase 3: Hookify Templates ✅
- Create `.claude/hookify.*.local.md` templates
- **Completed**: 6 templates in `plugins/specweave/templates/hookify/`
- Users copy templates manually (no automatic installation)

### Phase 4: Future (When Claude Code Adds Plugin Dependencies)
- ~~Detect plugin availability at runtime~~ (blocked: no API)
- ~~Adjust skill behavior based on available plugins~~ (blocked: no introspection)
- When [Issue #9444](https://github.com/anthropics/claude-code/issues/9444) is implemented:
  - Add `dependencies` field to SpecWeave `plugin.json`
  - Automatic plugin installation
  - Runtime capability detection

## References

- [Claude Plugins Official Repository](https://github.com/anthropics/claude-plugins-official)
- [Vercel MCP Documentation](https://vercel.com/docs/mcp/vercel-mcp)
- [Greptile AI Code Review](https://www.greptile.com/code-context)
- [Hookify Plugin README](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/hookify/README.md)

## Appendix: Complete LSP Plugin Reference

| Plugin | Languages | Installation | Files |
|--------|-----------|--------------|-------|
| `typescript-lsp` | TS, JS, TSX, JSX, MTS, CTS, MJS, CJS | `npm i -g typescript-language-server typescript` | `.ts`, `.tsx`, `.js`, `.jsx` |
| `swift-lsp` | Swift | Xcode or `brew install swift` | `.swift` |
| `kotlin-lsp` | Kotlin, KTS | `brew install JetBrains/utils/kotlin-lsp` | `.kt`, `.kts` |
| `gopls-lsp` | Go | `go install golang.org/x/tools/gopls@latest` | `.go` |
| `pyright-lsp` | Python | `npm i -g pyright` or `pip install pyright` | `.py`, `.pyi` |
| `rust-analyzer-lsp` | Rust | `rustup component add rust-analyzer` | `.rs` |
| `jdtls-lsp` | Java | `brew install jdtls` | `.java` |
| `csharp-lsp` | C# | `dotnet tool install -g csharp-ls` | `.cs` |
| `php-lsp` | PHP | `npm i -g intelephense` | `.php` |
| `clangd-lsp` | C, C++ | `brew install llvm` | `.c`, `.cpp`, `.h`, `.hpp` |
| `lua-lsp` | Lua | `brew install lua-language-server` | `.lua` |

## Addendum: Playwright Dual-Mode Architecture (Feb 2026)

### Context

Microsoft released `@playwright/cli` (v0.1.0, Feb 7 2026), a standalone CLI designed for AI coding agents. Unlike the MCP plugin which pushes full accessibility trees into context (~5-8K tokens per snapshot), the CLI keeps browser state external and returns minimal element references (~250 chars regardless of page complexity).

### Decision

Integrate `@playwright/cli` as a **complementary** tool alongside the existing Playwright MCP plugin. The two modes serve different purposes:

| Mode | Tool | Best For | Token Cost |
|------|------|----------|------------|
| **CLI** | `@playwright/cli` via Bash | Test execution, automation scripts, CI/CD, token-constrained sessions | ~250 chars/snapshot |
| **MCP** | `playwright@claude-plugins-official` | Interactive page exploration, self-healing tests, deep DOM inspection | ~5-8K chars/snapshot |

### Routing Logic

The `sw-testing` Skill Fabric routes automatically:
- **CLI preferred** (80% of tasks): `ui-automate`, `e2e-test-run`, `screenshot`, `form-automation`, `ci-testing`
- **MCP preferred** (20% of tasks): `ui-inspect`, `page-exploration`, `self-healing-test`
- **Fallback**: If CLI is not installed, all tasks route to MCP (graceful degradation)

### Configuration

```json
{
  "testing": {
    "playwright": {
      "preferCli": true
    }
  }
}
```

### Capability Parity

82% full parity (18/22 MCP tools have direct CLI equivalents). Key gaps:
- `browser_wait_for` — CLI uses `eval` with polling
- `browser_install` — CLI requires pre-installed browsers via `npx playwright install`

CLI-exclusive features: network mocking (`route`), auth state persistence (`state-save/load`), granular storage management, PDF export.

### Installation

```bash
npm install -g @playwright/cli@latest  # Global install for CLI
# MCP plugin remains as before via claude plugin install
```

### Status

- **ADR Status**: Accepted (addendum to ADR-0226)
- **Increment**: 0195-playwright-cli-integration
- **Risk**: v0.1.0 maturity — API may change rapidly; wrapped in abstraction layer
