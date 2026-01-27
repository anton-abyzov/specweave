# Claude Code Official Plugins Reference

**Purpose**: Comprehensive guide to official Claude Code plugins that enhance SpecWeave skills and workflows.

**Last Updated**: 2026-01-27

**Official Repository**: https://github.com/anthropics/claude-plugins-official

---

## Overview

Claude Code provides an official plugin ecosystem at [github.com/anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official). This document maps these plugins to SpecWeave skills and provides installation/usage guidance.

### Important: Recommendations Only

**Claude Code does NOT support plugin dependencies** ([Issue #9444](https://github.com/anthropics/claude-code/issues/9444)). This means:

- SpecWeave **cannot require** these plugins as dependencies
- SpecWeave **cannot detect** if plugins are installed
- Users must **manually install** recommended plugins
- SpecWeave skills **work without** these plugins (graceful degradation)

**Installation**: Use `/plugin` command in Claude Code, or browse the Discover tab.

## ⚠️ CRITICAL: Understanding Plugin Types

Claude Code has TWO fundamentally different plugin types:

| Plugin Type | Has SKILL.md | How to Use | Example |
|-------------|--------------|------------|---------|
| **Skill plugins** | ✅ Yes | `/skill-name` or `Skill({ skill: "name" })` | frontend-design, code-review |
| **LSP plugins** | ❌ No | **AUTOMATIC** - activates on file extension | csharp-lsp, typescript-lsp |

**LSP plugins are NOT skills!** You cannot invoke them via `/csharp-lsp` or `Skill({ skill: "csharp-lsp" })`. They work transparently when editing code files.

## Plugin Categories

1. **LSP Plugins** - Language Server Protocol for code intelligence (AUTOMATIC)
2. **Developer Tools** - Code review, safety rails, UI design (invocable skills)
3. **External Integrations** - Third-party service connections (MCP servers)

---

## LSP Plugins (Language Intelligence) - AUTOMATIC

**⚠️ LSP plugins work AUTOMATICALLY when editing code files. They are NOT skills!**

You cannot invoke LSP plugins - they activate based on file extension:
- Edit `.cs` file → `csharp-lsp` automatically provides code intelligence
- Edit `.ts` file → `typescript-lsp` automatically provides type checking

Language Server Protocol plugins provide semantic code understanding: go-to-definition, find-references, diagnostics, hover information, and refactoring support.

### Complete LSP Reference

| Plugin | Languages | File Extensions | Installation |
|--------|-----------|-----------------|--------------|
| **typescript-lsp** | TypeScript, JavaScript | `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs`, `.cjs` | `npm i -g typescript-language-server typescript` |
| **swift-lsp** | Swift | `.swift` | Xcode (macOS) or `brew install swift` |
| **kotlin-lsp** | Kotlin | `.kt`, `.kts` | `brew install JetBrains/utils/kotlin-lsp` |
| **gopls-lsp** | Go | `.go` | `go install golang.org/x/tools/gopls@latest` |
| **pyright-lsp** | Python | `.py`, `.pyi` | `npm i -g pyright` or `pip install pyright` |
| **rust-analyzer-lsp** | Rust | `.rs` | `rustup component add rust-analyzer` |
| **jdtls-lsp** | Java | `.java` | `brew install jdtls` (requires JDK 17+) |
| **csharp-lsp** | C# | `.cs` | `dotnet tool install -g csharp-ls` (requires .NET 6+) |
| **php-lsp** | PHP | `.php` | `npm i -g intelephense` |
| **clangd-lsp** | C, C++ | `.c`, `.cpp`, `.cc`, `.cxx`, `.h`, `.hpp`, `.hxx` | `brew install llvm` |
| **lua-lsp** | Lua | `.lua` | `brew install lua-language-server` |

### How LSP Works with SpecWeave Skills

When you use a SpecWeave skill and edit code files, LSP activates **automatically**:

| SpecWeave Skill/Agent | Files You Edit | LSP Auto-Activates |
|-----------------------|----------------|---------------------|
| `sw-mobile:mobile-architect` | `.swift`, `.kt`, `.ts` | swift-lsp, kotlin-lsp, typescript-lsp |
| `sw-frontend:frontend-architect` | `.ts`, `.tsx` | typescript-lsp |
| `sw-backend:dotnet-backend` | `.cs` | csharp-lsp |
| `sw-backend:nodejs-backend` | `.ts`, `.js` | typescript-lsp |
| `sw-ml:ml-engineer` | `.py` | pyright-lsp |
| `sw-infra:devops` | `.go`, `.py` | gopls-lsp, pyright-lsp |
| `sw-k8s:kubernetes-architect` | `.go`, `.py` | gopls-lsp, pyright-lsp |

### LSP Best Practices

1. **Always use `findReferences` before refactoring** - Catch all usages across files
2. **Use `goToDefinition` instead of grep** - 100x faster, semantically accurate
3. **Check `getDiagnostics` after edits** - Catch type errors immediately
4. **Use `documentSymbol` for file structure** - Navigate large files quickly

### How to Verify LSP is Working

LSP works transparently - you don't invoke it. To verify:
1. Edit a code file (e.g., `.cs`, `.ts`)
2. Claude Code automatically has access to type information, references, definitions
3. No `/command` or `Skill()` call needed

---

## Developer Tools

### Hookify - Safety Rails

**Purpose**: Create custom hooks to prevent unwanted behaviors via simple markdown configuration.

**Installation**: Part of Claude Code marketplace (auto-discovered)

**Key Features**:
- Block dangerous operations (rm -rf, force push)
- Warn on sensitive file edits (.env, credentials)
- Enforce coding patterns (test-before-commit)
- No coding required - markdown configuration

**Commands**:
| Command | Purpose |
|---------|---------|
| `/hookify [description]` | Create rule from description |
| `/hookify` | Analyze conversation for patterns |
| `/hookify:list` | List all rules |
| `/hookify:configure` | Enable/disable rules |

**Event Types**:
- `bash` - Triggers on Bash tool commands
- `file` - Triggers on Edit, Write, MultiEdit tools
- `stop` - Triggers when Claude wants to stop
- `prompt` - Triggers on user prompt submission

**Actions**:
- `warn` - Shows warning but allows operation
- `block` - Prevents operation from executing

**See**: [SpecWeave Hookify Templates](#specweave-hookify-templates) below

### Code Review

**Purpose**: Automated PR review with multi-agent analysis and confidence scoring.

**Command**: `/code-review`

**Features**:
- 4 parallel review agents (CLAUDE.md compliance, bug detection, history analysis)
- Confidence scoring (0-100) with 80+ threshold
- Direct code links with SHA and line ranges
- Automatic skip for closed/draft/trivial PRs

**Best Use**: Run on all non-trivial PRs before merge

### Frontend Design

**Purpose**: Generate distinctive, production-grade frontend interfaces.

**Features**:
- Bold aesthetic choices (not generic AI UI)
- Distinctive typography and color palettes
- High-impact animations
- Context-aware implementation

**Activation**: Automatic when working on frontend projects

---

## External Integrations

### Greptile - AI Codebase Search

**Purpose**: AI-powered semantic code search and analysis.

**Why Use It**:
- Traditional grep: O(n) file scanning, keyword-only
- Greptile: Semantic graph search, understands code relationships
- **10x faster** for large codebases (>100k lines)

**Setup**:
1. Sign up at [greptile.com](https://greptile.com)
2. Get API key from [API Settings](https://app.greptile.com/settings/api)
3. Set environment variable:
   ```bash
   export GREPTILE_API_KEY="your-api-key"
   ```

**Tools Available**:
| Tool | Purpose |
|------|---------|
| `list_pull_requests` | List PRs with filtering |
| `get_merge_request` | Detailed PR info |
| `trigger_code_review` | Start Greptile review |
| `search_greptile_comments` | Search all review comments |

**SpecWeave Integration**: Recommended for `/sw:living-docs` on large brownfield projects.

### Vercel MCP

**Purpose**: Connect Claude Code to Vercel for deployment management.

**Setup**:
```bash
claude mcp add-json "vercel" '{"command":"npx","args":["-y","vercel-mcp"]}'
```

Or connect to official endpoint: `https://mcp.vercel.com`

**Features**:
- View deployment logs
- Access project metadata
- Monitor project status
- Read-only (secure by default)

**SpecWeave Integration**: Recommended for `sw-frontend:frontend-architect` and deployment workflows.

### Stripe

**Purpose**: Payment processing integration.

**SpecWeave Integration**: `sw-payments:payment-integration` skill.

### Supabase

**Purpose**: Backend-as-a-service (Postgres, Auth, Storage).

**SpecWeave Integration**: Backend skills for database operations.

### Firebase

**Purpose**: Google backend services (Firestore, Auth, Cloud Functions).

**SpecWeave Integration**: Mobile backend, serverless functions.

### Linear

**Purpose**: Issue tracking and project management.

**SpecWeave Integration**: Alternative to GitHub/JIRA for issue sync.

### Playwright

**Purpose**: Browser automation and E2E testing.

**SpecWeave Integration**: `sw-testing:qa-engineer` skill.

---

## SpecWeave Hookify Templates

Pre-configured hookify rules for SpecWeave conventions. Copy these to `.claude/` directory.

### Block Direct Metadata Edits

```yaml
# .claude/hookify.block-metadata-status.local.md
---
name: block-metadata-status
enabled: true
event: file
action: block
conditions:
  - field: file_path
    operator: regex_match
    pattern: metadata\.json$
  - field: new_text
    operator: regex_match
    pattern: "status":\s*"completed"
---

**Direct metadata.json status edit blocked!**

Use `/sw:done <increment-id>` to properly close increments.
This ensures all quality gates are validated.
```

### Warn on Root File Creation

```yaml
# .claude/hookify.warn-root-files.local.md
---
name: warn-root-files
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: ^[^/]+\.md$
  - field: file_path
    operator: not_contains
    pattern: README|CLAUDE|AGENTS|CHANGELOG|LICENSE|CODE_OF_CONDUCT|SECURITY
---

**Root-level markdown file detected!**

SpecWeave files should go in:
- `.specweave/increments/<id>/` for increment docs
- `.specweave/docs/internal/` for living docs

Only README.md, CLAUDE.md, AGENTS.md, CHANGELOG.md allowed at root.
```

### Block Force Push to Main

```yaml
# .claude/hookify.block-force-push.local.md
---
name: block-force-push-main
enabled: true
event: bash
action: block
conditions:
  - field: command
    operator: regex_match
    pattern: git\s+push.*--force.*main|git\s+push.*-f.*main
---

**Force push to main branch blocked!**

This is a destructive operation. If you really need to force push:
1. Create a backup branch first
2. Get explicit user confirmation
3. Consider using `--force-with-lease` instead
```

### Enforce Test Execution Before Commit

```yaml
# .claude/hookify.require-tests.local.md
---
name: require-tests-before-commit
enabled: false
event: bash
action: warn
conditions:
  - field: command
    operator: regex_match
    pattern: git\s+commit
---

**Committing without running tests?**

Consider running tests first:
- `npm test` - Unit tests
- `npx playwright test` - E2E tests

Enable strict mode: edit this file and change action to `block`
```

### Block Secrets in Code

```yaml
# .claude/hookify.block-secrets.local.md
---
name: block-hardcoded-secrets
enabled: true
event: file
action: block
conditions:
  - field: file_path
    operator: not_contains
    pattern: \.env
  - field: new_text
    operator: regex_match
    pattern: (sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AKIA[A-Z0-9]{16})
---

**Potential secret detected in code!**

Never hardcode API keys or tokens. Use:
- `.env` files (add to .gitignore)
- Environment variables
- Secret management services (Vault, AWS Secrets Manager)
```

---

## Installation Quick Reference

### Essential (All Projects)

```bash
# TypeScript/JavaScript LSP
npm install -g typescript-language-server typescript

# Hookify is auto-discovered from marketplace
```

### Mobile Development

```bash
# iOS (Swift LSP)
# Included with Xcode, or:
brew install swift

# Android (Kotlin LSP)
brew install JetBrains/utils/kotlin-lsp
```

### Backend Development

```bash
# Go
go install golang.org/x/tools/gopls@latest

# Python
pip install pyright
# or: npm install -g pyright

# Java
brew install jdtls
# Requires: JDK 17+

# Rust
rustup component add rust-analyzer

# C#
dotnet tool install -g csharp-ls
# Requires: .NET SDK 6.0+
```

### Systems Programming

```bash
# C/C++
brew install llvm
# Add to PATH: export PATH="/opt/homebrew/opt/llvm/bin:$PATH"

# Lua
brew install lua-language-server
```

---

## Troubleshooting

### LSP Not Working

```bash
# Check if language server is in PATH
which typescript-language-server
which sourcekit-lsp  # Swift
which gopls

# Verify installation
typescript-language-server --version
```

### Hookify Rules Not Triggering

1. Check `.claude/` directory exists
2. Verify file naming: `hookify.<name>.local.md`
3. Check `enabled: true` in frontmatter
4. Test regex pattern: `python3 -c "import re; print(re.search(r'pattern', 'text'))"`

### Greptile Connection Issues

```bash
# Verify API key is set
echo $GREPTILE_API_KEY

# Check if key works
curl -H "Authorization: Bearer $GREPTILE_API_KEY" https://api.greptile.com/v1/health
```

---

## Related Documentation

- [ADR-0226: Claude Code Official Plugin Integration](../architecture/adr/0226-claude-code-official-plugin-integration.md)
- [Mobile Architect Agent](../../../../plugins/specweave-mobile/agents/mobile-architect/AGENT.md)
- [LSP-Enhanced Exploration (CLAUDE.md)](../../../../CLAUDE.md#lsp-enhanced-exploration)
- [Official Plugin Repository](https://github.com/anthropics/claude-plugins-official)
