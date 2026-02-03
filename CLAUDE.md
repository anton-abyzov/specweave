<!-- SW:META template="claude" version="1.0.205" sections="header,start,autodetect,metarule,rules,workflow,reflect,context,structure,taskformat,secrets,syncing,testing,tdd,api,limits,troubleshooting,lazyloading,principles,linking,mcp,auto,docs" -->

<!-- SW:SECTION:hook-priority version="1.0.171" -->
## ⛔ Hook Instructions Override Everything

`<system-reminder>` hook output = **BLOCKING PRECONDITIONS**.

| Hook Message | Action |
|--------------|--------|
| **"RESTART REQUIRED"** | ❌ ALL tools blocked → Display warning, STOP, wait for restart |
| **"SKILL FIRST"** | Call shown skill FIRST → then domain skills → then implement |

**SKILL FIRST ≠ only one skill.** Chain: hook skill → `sw-frontend:*` / `sw-backend:*` / etc → implement.
<!-- SW:END:hook-priority -->

<!-- SW:SECTION:header version="1.0.205" -->
**Framework**: SpecWeave | **Truth**: `spec.md` + `tasks.md`
<!-- SW:END:header -->

<!-- SW:SECTION:claude-code-concepts version="1.0.150" -->
## Claude Code Concepts

| Concept | How to Use |
|---------|------------|
| **Skills** | `/skill-name` or auto-invoke via keywords |
| **Plugins** | `claude plugin install sw@specweave` |
| **Subagents** | Append "use subagents" for parallel work |

**Skill invocation control** (frontmatter):
- `disable-model-invocation: true` → User only (side effects like `/deploy`)
- `user-invocable: false` → Claude only (background knowledge)
<!-- SW:END:claude-code-concepts -->

<!-- SW:SECTION:skill-chaining version="1.0.179" -->
## ⚠️ MANDATORY: Skill Chaining During Implementation

**Skills are NOT "one and done".** You MUST use multiple skills throughout implementation.

### The Pattern (FOLLOW THIS)

```
PLANNING PHASE:
  Hook says "SKILL FIRST" → Call sw:increment-planner
  Then ALSO invoke: sw:pm (specs), sw:architect (design)

IMPLEMENTATION PHASE:
  For each domain, invoke the relevant skill:
  - React/Vue/Angular → sw-frontend:frontend-architect
  - .NET/C# → sw-backend:dotnet-backend
  - Node.js → sw-backend:nodejs-backend
  - Stripe → sw-payments:stripe-integration
  - Database → sw-backend:database-optimizer

CODE INTELLIGENCE (LSP):
  Use `specweave lsp refs/def/hover` (native LSP broken in v2.1.0+)
```

### Skills vs LSP Plugins

| Type | Has SKILL.md | How to Use |
|------|--------------|------------|
| **Skill plugins** | ✅ Yes | `/skill-name` or `Skill({ skill: "name" })` |
| **LSP plugins** | ❌ No | Native LSP broken in v2.1.0+, use `specweave lsp` CLI |

### Why Auto-Activation May Not Trigger

Per [official Claude Code docs](https://code.claude.com/docs/en/skills):
1. Description keywords don't match user's exact phrasing
2. Character budget exceeded (15K default, many skills loaded)
3. Multi-domain requests dilute keyword matching

**Solution**: When auto-activation fails, EXPLICITLY invoke with `Skill({ skill: "name" })`

### Example: Multi-Domain Request

User says: "Create React dashboard with Stripe checkout and .NET backend"

**WRONG** (what I did before):
```
Skill(sw:increment-planner) → Implement everything directly
```

**CORRECT** (what I should do):
```
Skill(sw:increment-planner)           → Plan the increment
Skill(sw-frontend:frontend-architect) → React dashboard patterns
Skill(sw-payments:stripe-integration) → Stripe checkout flow
Skill(sw-backend:dotnet-backend)      → .NET API patterns
[Use specweave lsp CLI for code intelligence]
```

### Skill Usage Checklist

Before marking implementation complete, verify:
- [ ] Used planning skills (PM, Architect) if complex feature
- [ ] Used domain skills for each tech in the stack
- [ ] Invoked skills explicitly if auto-activation didn't trigger
<!-- SW:END:skill-chaining -->

## LSP (Code Intelligence)

**Native LSP broken in v2.1.0+** ([#17468](https://github.com/anthropics/claude-code/issues/17468)). Use SpecWeave CLI:

```bash
specweave lsp refs src/file.ts SymbolName    # Find references
specweave lsp def src/file.ts SymbolName     # Go to definition
specweave lsp hover src/file.ts 42 10        # Type info at line:col
```

Hook auto-detects "find references" requests and injects CLI instructions.

## Plugin Scopes

| Scope | Use |
|-------|-----|
| **User** (default) | Personal plugins, all projects |
| **Project** | Team plugins, shared via git |
| **Local** | Gitignored, personal experiments |

```bash
claude plugin install sw@specweave --scope project  # Team-shared
```

SpecWeave auto-installs: LSP → project scope, sw-* → user scope.

<!-- SW:SECTION:start version="1.0.205" -->
## Getting Started

**Initial increment**: `0001-project-setup` (auto-created by `specweave init`)

**Options**:
1. **Start fresh**: `rm -rf .specweave/increments/0001-project-setup` → `/sw:increment "your-feature"`
2. **Customize**: Edit spec.md and use for setup tasks
<!-- SW:END:start -->

<!-- SW:SECTION:autodetect version="1.0.205" -->
## Auto-Detection

SpecWeave auto-detects product descriptions and routes to `/sw:increment`:

**Signals** (5+ = auto-route): Project name | Features list (3+) | Tech stack | Timeline/MVP | Problem statement | Business model

**Opt-out phrases**: "Just brainstorm first" | "Don't plan yet" | "Quick discussion" | "Let's explore ideas"
<!-- SW:END:autodetect -->

<!-- SW:SECTION:metarule version="1.0.205" -->
## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, **STOP and re-plan** - don't keep pushing
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context clean
- Offload research, exploration, and parallel analysis to subagents
- One task per subagent for focused execution
- Append "use subagents" to requests for safe parallelization

### 3. Verification Before Done
- Never mark a task complete without proving it works
- Ask yourself: **"Would a staff engineer approve this?"**
- Run tests, check logs, demonstrate correctness

### 4. Think-Before-Act (Dependencies)
**Satisfy dependencies BEFORE dependent operations.**
```
❌ node script.js → Error → npm run build
✅ npm run build → node script.js → Success
```
<!-- SW:END:metarule -->

<!-- SW:SECTION:rules version="1.0.205" -->
## Rules

1. **Files** → `.specweave/increments/####-name/` (see Structure section for details)
2. **Update immediately**: `Edit("tasks.md", "[ ] pending", "[x] completed")` + `Edit("spec.md", "[ ] AC-", "[x] AC-")`
3. **Unique IDs**: Check ALL folders (active, archive, abandoned):
   ```bash
   find .specweave/increments -maxdepth 2 -type d -name "[0-9]*" | grep -oE '[0-9]{4}E?' | sort -u | tail -5
   ```
4. **Emergency**: "emergency mode" → 1 edit, 50 lines max, no agents
5. **⛔ Initialization guard**: `.specweave/` folders MUST ONLY exist where `specweave init` was run
6. **⛔ Marketplace refresh**: Use `specweave refresh-marketplace` CLI (not `scripts/refresh-marketplace.sh`)
7. **⛔ Numbered folder collisions**: Before creating `docs/NN-*` folders, CHECK existing prefixes:
   ```bash
   ls docs/ | grep -E '^[0-9]{2}-' | cut -d'-' -f1 | sort -u
   ```
   Use next available number. **NEVER create duplicate prefixes.**
<!-- SW:END:rules -->

<!-- SW:SECTION:workflow version="1.0.205" -->
## Workflow

`/sw:increment "X"` → `/sw:do` → `/sw:progress` → `/sw:done 0001`

| Cmd | Action |
|-----|--------|
| `/sw:increment` | Plan feature |
| `/sw:do` | Execute tasks |
| `/sw:auto` | Autonomous execution |
| `/sw:auto-status` | Check auto session |
| `/sw:cancel-auto` | ⚠️ EMERGENCY ONLY manual cancel |
| `/sw:validate` | Quality check |
| `/sw:done` | Close |
| `/sw-github:sync` | GitHub sync |
| `/sw-jira:sync` | Jira sync |

**Natural language**: "Let's build X" → `/sw:increment` | "What's status?" → `/sw:progress` | "We're done" → `/sw:done` | "Ship while sleeping" → `/sw:auto`
<!-- SW:END:workflow -->

<!-- SW:SECTION:save-nested-repos version="1.0.194" -->
## /sw:save - Nested Repository Scanning (MANDATORY)

**⚠️ ALWAYS scan for nested repositories BEFORE any git operations:**

```bash
# MANDATORY first step - check for nested repos
for folder in repositories packages services apps libs; do
  [ -d "$folder" ] && find "$folder" -maxdepth 2 -name ".git" -type d
done
```

**Common SpecWeave structure:**
```
project/
├── .specweave/
├── repositories/        # ← ALWAYS check this!
│   ├── frontend/.git
│   ├── backend/.git
│   └── shared/.git
└── .git                 # Parent repo
```

**NEVER assume single-repo mode without scanning first!**
<!-- SW:END:save-nested-repos -->

<!-- SW:SECTION:reflect version="1.0.205" -->
## Skill Memories

SpecWeave learns from corrections. Learnings saved here automatically. Edit or delete as needed.

**Disable**: Set `"reflect": { "enabled": false }` in `.specweave/config.json`
<!-- SW:END:reflect -->

## Skill Memories

<!-- Auto-captured by SpecWeave reflect. Edit or delete as needed. -->

### Pm
- **2026-02-02**: Enable interview process during increment creation for SpecWeave projects

### General
- **2026-02-02**: Use subagents liberally for codebase analysis - up to 10+ concurrent for large-scale exploration
- **2026-02-02**: Prefer leaderboard-style reporting when analyzing usage patterns or identifying deletion candidates

<!-- SW:SECTION:context version="1.0.205" -->
## Context

**Before implementing**: Check ADRs at `.specweave/docs/internal/architecture/adr/`

**Load context**: `/sw:context <topic>` loads relevant living docs into conversation
<!-- SW:END:context -->

<!-- SW:SECTION:structure version="1.0.205" -->
## Structure

```
.specweave/
├── increments/####-name/     # metadata.json, spec.md, plan.md, tasks.md
├── docs/internal/specs/      # Living docs
└── config.json
```

**⛔ Increment root**: ONLY `metadata.json`, `spec.md`, `plan.md`, `tasks.md`

**Everything else → subfolders**: `reports/` | `logs/` | `scripts/` | `backups/`
<!-- SW:END:structure -->

<!-- SW:SECTION:taskformat version="1.0.205" -->
## Task Format

```markdown
### T-001: Title
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given [X] → When [Y] → Then [Z]
```
<!-- SW:END:taskformat -->

<!-- SW:SECTION:secrets version="1.0.205" -->
## Secrets Check

**BEFORE CLI tools**: Check existing config first!
```bash
# Check if credentials EXIST (never display values!)
grep -qE "(GITHUB_TOKEN|GH_TOKEN|JIRA_|AZURE_DEVOPS_|ADO_)" .env 2>/dev/null && echo "Credentials found in .env"
cat .specweave/config.json | grep -A5 '"sync"'
gh auth status
```

**SECURITY**: NEVER use `grep TOKEN .env` without `-q` flag - it exposes credentials in terminal!
<!-- SW:END:secrets -->

<!-- SW:SECTION:syncing version="1.0.205" -->
## External Sync (GitHub/JIRA/ADO)

**Commands**: `/sw-github:sync {id}` (issues) | `/sw:sync-specs` (living docs only)

**Mapping**: Feature → Milestone | Story → Issue | Task → Checkbox

**Config**: Set `sync.github.enabled: true` + `canUpdateExternalItems: true` in config.json
<!-- SW:END:syncing -->

<!-- SW:SECTION:testing version="1.0.205" -->
## Testing

BDD in tasks.md | Unit >80% | `.test.ts` (Vitest)

```typescript
// ESM mocking: vi.hoisted() + vi.mock() (Vitest 4.x+)
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock('./module', () => ({ func: mockFn }));
```
<!-- SW:END:testing -->

<!-- SW:SECTION:tdd version="1.0.205" -->
## TDD Mode (Test-Driven Development)

**When `testing.defaultTestMode: "TDD"` is configured**, follow RED-GREEN-REFACTOR discipline:

### TDD Workflow (MANDATORY when configured)

```
1. RED:     Write FAILING test first → verify it fails
2. GREEN:   Write MINIMAL code to pass → no extra features
3. REFACTOR: Improve code quality → keep tests green
```

### Check TDD Mode Before Implementation

```bash
# Check if TDD mode is enabled
jq -r '.testing.defaultTestMode' .specweave/config.json
# Returns: "TDD" | "test-first" | "test-after"
```

### TDD Commands

| Command | Phase | Purpose |
|---------|-------|---------|
| `/sw:tdd-red` | RED | Write failing tests |
| `/sw:tdd-green` | GREEN | Minimal implementation |
| `/sw:tdd-refactor` | REFACTOR | Code quality improvement |
| `/sw:tdd-cycle` | ALL | Full orchestrated workflow |

### Enforcement Levels

Set `testing.tddEnforcement` in config.json:

| Level | Behavior |
|-------|----------|
| `strict` | **BLOCKS** task completion if RED not done before GREEN |
| `warn` | Shows warning but allows continuation (default) |
| `off` | No enforcement |

### TDD Task Format

When TDD is enabled, tasks include phase markers:

```markdown
### T-001: [RED] Write auth service tests
**Depends On**: None
**Status**: [ ] pending

### T-002: [GREEN] Implement auth service
**Depends On**: T-001
**Status**: [ ] pending

### T-003: [REFACTOR] Extract token utilities
**Depends On**: T-002
**Status**: [ ] pending
```

**Rule**: Complete dependencies BEFORE dependent tasks (RED before GREEN).
<!-- SW:END:tdd -->

<!-- SW:SECTION:api version="1.0.205" -->
## API Development (OpenAPI-First)

**For API projects only.** Commands: `/sw:api-docs --all` | `--openapi` | `--postman` | `--validate`

Enable in config: `{"apiDocs":{"enabled":true,"openApiPath":"openapi.yaml"}}`
<!-- SW:END:api -->

<!-- SW:SECTION:limits version="1.0.205" -->
## Limits

**Max 1500 lines/file** — extract before adding
<!-- SW:END:limits -->

<!-- SW:SECTION:troubleshooting version="1.0.205" -->
## Troubleshooting

| Issue | Fix |
|-------|-----|
| Skills/commands missing | Restart Claude Code |
| Plugins outdated | `specweave refresh-marketplace` |
| Out of sync | `/sw:sync-tasks` |
| Duplicate IDs | `/sw:fix-duplicates` |
| Edits blocked | Add `"additionalDirectories":["repositories"]` to `.claude/settings.json` |
| Session stuck | Kill + `rm -f .specweave/state/*.lock` + restart |
<!-- SW:END:troubleshooting -->

<!-- SW:SECTION:lazyloading version="1.0.205" -->
## Plugin Auto-Loading

Plugins load automatically based on project type and keywords. Manual install if needed:

```bash
claude plugin install sw-frontend@specweave  # Install plugin
claude plugin list                           # Check installed
export SPECWEAVE_DISABLE_AUTO_LOAD=1         # Disable auto-load
```

**Token savings**: Core ~3-5K tokens vs all plugins ~60K+
<!-- SW:END:lazyloading -->

<!-- SW:SECTION:principles version="1.0.205" -->
## Principles

### SpecWeave Principles
1. **Spec-first**: `/sw:increment` before coding
2. **Docs = truth**: Specs guide implementation
3. **Incremental**: Small, validated increments
4. **Traceable**: All work → specs → ACs

### Core Principles (Quality)
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Demand Elegance**: For non-trivial changes, pause and ask "is there a more elegant way?" - but skip this for simple, obvious fixes (don't over-engineer).
<!-- SW:END:principles -->

<!-- SW:SECTION:linking version="1.0.205" -->
## Bidirectional Linking

Tasks ↔ User Stories auto-linked via AC-IDs: `AC-US1-01` → `US-001`

Task format: `**AC**: AC-US1-01, AC-US1-02` (CRITICAL for linking)
<!-- SW:END:linking -->

<!-- SW:SECTION:mcp version="1.0.205" -->
## External Services

**Priority**: CLI tools first (simpler) → MCP for complex integrations

**CLI tools** (check auth first):
```bash
gh auth status          # GitHub
wrangler whoami         # Cloudflare
supabase status         # Supabase
```

**MCP servers** (for richer integrations):
```bash
claude mcp add --transport http github https://api.github.com/mcp
claude mcp add --transport stdio postgres -- npx -y @modelcontextprotocol/server-postgres
/mcp                    # Check status in Claude Code
```

MCP supports lazy-loading (auto mode) - tools load on-demand when >10% context.
<!-- SW:END:mcp -->

<!-- SW:SECTION:auto version="1.0.205" -->
## Auto Mode

**Commands**: `/sw:auto` (start) | `/sw:auto-status` (check) | `/sw:cancel-auto` (emergency only)

**Pattern**: IMPLEMENT → TEST → FAIL? → FIX → PASS → NEXT

**TDD in Auto Mode**: If `testing.defaultTestMode: "TDD"` is configured:
- Use `/sw:auto --tdd` for strict enforcement (ALL tests must pass)
- Auto mode reads config and displays TDD banner
- Follow RED → GREEN → REFACTOR order for task triplets

**Pragmatic completion**: MUST (MVP, security, data integrity) | SHOULD (edge cases) | CAN SKIP (conflicts - ask user)

**STOP & ASK** if: Spec conflicts | Task unnecessary | Requirement ambiguous
<!-- SW:END:auto -->

<!-- SW:SECTION:docs version="1.0.205" -->
## Docs

[spec-weave.com](https://spec-weave.com)
<!-- SW:END:docs -->

---
<!-- ↓ ORIGINAL ↓ -->

# SpecWeave Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: TypeScript CLI (NPM Package)

For **contributors to SpecWeave itself** (not users).

---

## Git Commits

- Do NOT include "Generated with Claude Code" or AI-assisted notes in commit messages
- Do NOT include "Co-Authored-By: Claude" in commit messages
- Keep commit messages clean and professional

---

## Marketplace Commands

| Who | Command |
|-----|---------|
| **Contributors** | `bash scripts/refresh-marketplace.sh` (defaults to --github) |
| **End Users** | `specweave refresh-marketplace` |

⚠️ NEVER suggest `scripts/` to end users - they don't have it (npm global install).

---

## Critical Safety Rules (Contributors)

### 1. Context Management (CRASH PREVENTION)

**Active increment (10+ tasks) + large file edit (2000+ lines) = CRASH**

```bash
/sw:pause XXXX → edit large file → /sw:resume XXXX
```

- **Token budget**: ~80k/increment | **Max tasks**: 25 | **Max lines/file**: 1500

### 2. Status Workflow

**NEVER edit metadata.json to "completed" directly!** Use `/sw:done <id>` which validates ACs.

Programmatic closure: `MetadataManager.updateStatus(id, IncrementStatus.COMPLETED)` - only succeeds from `ready_for_review`.

### 3. Task-AC Auto-Sync

Hooks auto-update when task marked complete: task checkboxes → spec.md ACs → `ready_for_review` status.

### 4. Per-US Project Fields

User Stories need `**Project**: my-project` field for external sync. Each US = ONE Project.

### 5. Protected Directories

**NEVER delete**: `.specweave/docs/`, `.specweave/increments/`

### 6. Subagent Parallelization ("use subagents")

**The phrase "use subagents" is a SAFE parallelization trigger.** Append it to requests to distribute work.

**How it works** (per Boris Cherny, Claude Code creator):
- Claude spawns isolated subagents (up to 10 concurrent)
- Each subagent has its own context (~20K tokens overhead each)
- Main context stays clean and focused
- Subagents handle complexity, return results

**When to use "use subagents":**
```
✅ "Find all unused exports in src/ - use subagents"
✅ "Analyze each module for security issues - use subagents"
✅ "Search for deprecated patterns across the codebase - use subagents"
✅ "Review these 15 files for code quality - use subagents"
```

**Best for:**
- Codebase exploration/discovery (read-only analysis)
- Multi-file searches and pattern detection
- Batch validation and quality checks
- Large-scale refactoring analysis
- Parallel code reviews

**Constraint**: Subagents don't receive full CLAUDE.md context - use for compartmentalized tasks.

### 7. Skills Best Practices

**ALWAYS use skills when available!** Skills provide specialized expertise and are designed to be used extensively.

**During Planning:**
- Use `/sw:pm` or PM skill for specification refinement
- Use `/sw:architect` or Architect skill for architecture design
- Skills can invoke other skills - this is encouraged!

**During Implementation:**
- Use `sw-frontend:*` skills for React/Vue/Angular work
- Use `sw-backend:*` skills for .NET/Node/Python APIs
- Use `sw-payments:stripe-integration` for Stripe

**Code Intelligence (LSP):** Use `specweave lsp` CLI (native LSP broken in CC v2.1.0+).

**Pattern:**
```
/sw:increment → PM skill → Architect skill → Implementation skills
(Use specweave lsp refs/def for code intelligence)
```

### 8. NODE_OPTIONS in Debug Mode

Child processes fail in VSCode Debug mode due to inherited `NODE_OPTIONS`. **Strip before spawning:**
```typescript
const cleanEnv = { ...process.env };
delete cleanEnv.NODE_OPTIONS;
delete cleanEnv.NODE_V8_COVERAGE;
spawnSync('claude', ['--version'], { env: cleanEnv });
```
See: `src/utils/claude-cli-detector.ts`

### 9. Fast Claude CLI Calls

For headless `claude -p` calls, skip settings loading (~50s → <1s):
```bash
claude -p "prompt" --model haiku --setting-sources ""
```

### 10. Increment ID Collision Prevention

**IDs must be unique across ALL folders** (active, _archive, _abandoned, _paused, external).
```bash
find .specweave/increments -maxdepth 2 -type d -name "[0-9]*" | grep -oE '[0-9]{4}E?' | sort -u
```
**Always use `IncrementNumberManager.getNextIncrementNumber()`** - never hardcode IDs.

### 11. Hook Output Format

| Event | Format |
|-------|--------|
| UserPromptSubmit/SessionStart | `{"hookSpecificOutput":{"hookEventName":"...","additionalContext":"..."}}` |
| PreToolUse | `{"decision":"allow"}` or `{"decision":"block","reason":"..."}` |
| PostToolUse | `{"continue":true}` |

⚠️ `systemMessage` doesn't exist - content silently ignored!

---

## Coding Standards

- **Logger**: Prefer `logger` over `console.*` in new code (legacy migration ongoing)
- **Imports**: ALWAYS `.js` extensions (enforced)
- **Tests**: `.test.ts` files, `vi.fn()` (not jest), `os.tmpdir()` (not cwd)
- **Filesystem**: Prefer native `fs` (fs-extra only in legacy utils)
- **Config vs Secrets**: Config in `config.json`, secrets in `.env`

### Plugin Naming Convention (`sw-*` vs `specweave-*`)

**Two naming systems exist for plugins:**

| System | Format | Example |
|--------|--------|---------|
| **Marketplace names** | `sw`, `sw-*` | `sw`, `sw-frontend`, `sw-github` |
| **Directory names** | `specweave`, `specweave-*` | `specweave`, `specweave-frontend`, `specweave-github` |

**Use MARKETPLACE names (`sw-*`) for:**
- Claude CLI: `claude plugin install sw@specweave`
- API inputs: `installPlugins(['sw', 'sw-github'])`
- LLM responses: `detectPluginsViaLLM()` returns `['sw-frontend']`
- `keyword-detector.ts` constants (PLUGIN_GROUPS, KEYWORD_PLUGIN_MAP)
- Registry keys: `sw-router@specweave` in `installed_plugins.json`
- State file: `loadedPlugins: ['sw', 'sw-github']`

**Use DIRECTORY names (`specweave-*`) for:**
- Marketplace filesystem paths: `~/.claude/plugins/marketplaces/specweave/plugins/specweave-frontend/`
- Test mocks for directories: `createMockPlugin(path, 'specweave')`

**Conversion functions** (in `cache-manager.ts`):
```typescript
marketplaceNameToDirectory('sw')          // → 'specweave'
marketplaceNameToDirectory('sw-frontend') // → 'specweave-frontend'
directoryToMarketplaceName('specweave')   // → 'sw'
```

---

## Key Formats

| Format | Pattern |
|--------|---------|
| GitHub Issue | `[FS-XXX][US-YYY] User Story Title` |
| ADR | `XXXX-decision-title.md` (no `adr-` prefix) |
| External Increment | `0111E-*` (E suffix for imported) |

Task format → see `## Task Format` section above.

---

## Build & Test

```bash
npm run rebuild     # Clean + build
npm test            # Smoke tests
npm run test:all    # All tests
```

---

## Emergency

### Session Stuck ("Marinating...")
```bash
# 1. Force quit Claude Code
# 2. Kill zombies:
pkill -f "cat.*EOF"
pkill -9 -f "bash.*specweave"
# 3. Clean locks:
rm -f .specweave/state/*.lock
# 4. Restart
```

### Disable Hooks
```bash
export SPECWEAVE_DISABLE_HOOKS=1
```

### Crash Loop
```bash
rm -f .specweave/state/*.lock
npm run rebuild
```

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| File ops | Write/Edit/Read tools ONLY (never Bash heredoc/echo) |
| Source of truth | tasks.md + spec.md (update immediately) |
| Completion | `/sw:done` only (NEVER edit metadata.json directly) |
| **Skills** | **ALWAYS use when available** (PM, Architect, domain skills) |
| **LSP** | Use `specweave lsp refs/def/hover` (native LSP broken in v2.1.0+) |
| **Parallelization** | Append "use subagents" for batch/exploration tasks |
| Increment root | ONLY 4 files: spec.md, plan.md, tasks.md, metadata.json |
| Increment IDs | 🚨 Check ALL folders: `find .specweave/increments -maxdepth 2 -name "[0-9]*" \| grep -oE '[0-9]{4}E?'` |
| Reports/logs | Always to `reports/`, `logs/` subfolders |
| Multi-repo | Clone to `repositories/` (never project root) |
| Secrets | Check `.env` first, never display values (`grep -q`) |
| Marketplace | `specweave refresh-marketplace` (not `scripts/`) |
| Stuck session | Kill + `pkill -f "bash.*specweave"` + `rm .specweave/state/*.lock` |

---

## References

- **Internal Docs**: `.specweave/docs/internal/`
- **ADRs**: `.specweave/docs/internal/architecture/adr/`
- **Troubleshooting**: `.specweave/docs/internal/troubleshooting/`
