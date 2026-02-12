<!-- SW:META template="claude" version="1.0.253" sections="header,start,autodetect,metarule,rules,workflow,reflect,context,structure,taskformat,secrets,syncing,testing,tdd,api,limits,troubleshooting,lazyloading,principles,linking,mcp,auto,docs" -->

<!-- SW:SECTION:hook-priority version="1.0.171" -->
## ⛔ Hook Instructions Override Everything

`<system-reminder>` hook output = **BLOCKING PRECONDITIONS**.

| Hook Message | Action |
|---|---|
| **"RESTART REQUIRED"** | ❌ ALL tools blocked → STOP, wait for restart |
| **"SKILL FIRST"** | Call shown skill FIRST → chain domain skills → implement |
<!-- SW:END:hook-priority -->

<!-- SW:SECTION:header version="1.0.253" -->
**Framework**: SpecWeave | **Truth**: `spec.md` + `tasks.md`
<!-- SW:END:header -->

<!-- SW:SECTION:claude-code-concepts version="1.0.150" -->
## Skills & Plugins

**Invoke**: `/skill-name` | auto-trigger by keywords | `Skill({ skill: "name" })`
**Parallel work**: Append "use subagents" to requests

**Key skills**: `sw:pm`, `sw:architect`, `sw:grill`, `sw:tdd-orchestrator`, `sw-frontend:*`, `sw-backend:*`, `sw-testing:*`

**Skill chaining** — skills are NOT "one and done":
1. **Planning**: `sw:pm` (specs) → `sw:architect` (design)
2. **Implementation**: Invoke domain skill per tech (React → `sw-frontend:frontend-architect`, .NET → `sw-backend:dotnet-backend`, Stripe → `sw-payments:stripe-integration`, etc.)
3. **Closure**: `sw:grill` runs automatically via `/sw:done`

If auto-activation fails, invoke explicitly: `Skill({ skill: "name" })`
<!-- SW:END:claude-code-concepts -->

## Automatic Enforcement

| Mechanism | Enforcement |
|---|---|
| `task-ac-sync` | Task completion → auto-updates spec.md ACs |
| `tdd-enforcement` | Blocks GREEN if RED not done (strict mode) |
| `grill` | Runs as first `/sw:done` step; blockers halt close |
| `living-specs` | Updates docs on increment done/reopened/archived |

<!-- SW:SECTION:skill-chaining version="1.0.179" -->
<!-- Consolidated into Skills & Plugins section above -->
<!-- SW:END:skill-chaining -->

## LSP (Code Intelligence)

**Native LSP broken in v2.1.0+.** Use: `specweave lsp refs|def|hover src/file.ts SymbolName`

<!-- SW:SECTION:start version="1.0.253" -->
## Getting Started

**Initial increment**: `0001-project-setup` (auto-created by `specweave init`)

**Options**:
1. **Start fresh**: `rm -rf .specweave/increments/0001-project-setup` → `/sw:increment "your-feature"`
2. **Customize**: Edit spec.md and use for setup tasks
<!-- SW:END:start -->

<!-- SW:SECTION:autodetect version="1.0.253" -->
## Auto-Detection

SpecWeave auto-detects product descriptions and routes to `/sw:increment`:

**Signals** (5+ = auto-route): Project name | Features list (3+) | Tech stack | Timeline/MVP | Problem statement | Business model

**Opt-out phrases**: "Just brainstorm first" | "Don't plan yet" | "Quick discussion" | "Let's explore ideas"
<!-- SW:END:autodetect -->

<!-- SW:SECTION:metarule version="1.0.253" -->
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

<!-- SW:SECTION:rules version="1.0.253" -->
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
8. **⛔ Multi-repo**: ALL repos MUST be at `repositories/{org}/{repo-name}/` — NEVER directly under `repositories/`
   Discover org from config: `repository.organization` → `sync.profiles` → `umbrella.childRepos` → filesystem
<!-- SW:END:rules -->

<!-- SW:SECTION:workflow version="1.0.253" -->
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
| `/sw:progress-sync` | Sync progress to all external tools |
| `/sw-github:push` | Push progress to GitHub |

**Natural language**: "Let's build X" → `/sw:increment` | "What's status?" → `/sw:progress` | "We're done" → `/sw:done` | "Ship while sleeping" → `/sw:auto`
<!-- SW:END:workflow -->

<!-- SW:SECTION:save-nested-repos version="1.0.194" -->
## Nested Repos

Before git operations, scan: `for d in repositories packages services apps libs workspace; do [ -d "$d" ] && find "$d" -maxdepth 2 -name ".git" -type d; done`
<!-- SW:END:save-nested-repos -->

<!-- SW:SECTION:reflect version="1.0.253" -->
## Skill Memories

SpecWeave learns from corrections. Learnings saved here automatically. Edit or delete as needed.

**Disable**: Set `"reflect": { "enabled": false }` in `.specweave/config.json`
<!-- SW:END:reflect -->

<!-- Auto-captured by SpecWeave reflect. Edit or delete as needed. -->

### Pm
- Enable interview during increment creation (5+ questions minimum)
- Call /sw:grill before completing features/increments
- Validate spec.md against existing architecture before writing user stories

### General
- Use subagents liberally (10+ concurrent for large exploration)
- Auto command: explicit stop conditions, visible output
- Prefer leaderboard-style reporting for analysis
- Auto mode: Stop hook creates implicit loops via block/approve pattern

<!-- SW:SECTION:context version="1.0.253" -->
## Context

**Before implementing**: Check ADRs at `.specweave/docs/internal/architecture/adr/`

**Load context**: `/sw:docs <topic>` loads relevant living docs into conversation
<!-- SW:END:context -->

<!-- SW:SECTION:structure version="1.0.253" -->
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

<!-- SW:SECTION:taskformat version="1.0.253" -->
## Task Format

```markdown
### T-001: Title
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given [X] → When [Y] → Then [Z]
```
<!-- SW:END:taskformat -->

<!-- SW:SECTION:secrets version="1.0.253" -->
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

<!-- SW:SECTION:syncing version="1.0.253" -->
## External Sync (GitHub/JIRA/ADO)

**Primary command**: `/sw:progress-sync` — syncs tasks.md → spec.md → living docs → external tools (auto-creates missing issues)

**Individual commands**:
| Command | Action |
|---------|--------|
| `/sw-github:create {id}` | Create GitHub issue for increment |
| `/sw-github:push {id}` | Push task progress to GitHub issue |
| `/sw-github:close {id}` | Close GitHub issue |
| `/sw-github:status {id}` | Check sync status |
| `/sw:sync-specs` | Sync living docs locally |

**Mapping**: Feature → Milestone | Story → Issue | Task → Checkbox

**Auto-configured**: Sync enabled by default during `specweave init` when a tracker is selected.

**After task completion**: Run `/sw:progress-sync` or `/sw-github:push` to sync changes to external tools.
<!-- SW:END:syncing -->

<!-- SW:SECTION:testing version="1.0.253" -->
## Testing

BDD in tasks.md | Unit >80% | `.test.ts` (Vitest)

```typescript
// ESM mocking: vi.hoisted() + vi.mock() (Vitest 4.x+)
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock('./module', () => ({ func: mockFn }));
```

### Browser Automation Mode

**Default**: `@playwright/cli` if installed (98% token reduction vs MCP)
**Fallback**: Playwright MCP plugin (rich DOM introspection)
**Config**: `testing.playwright.preferCli: true|false` in `.specweave/config.json`
**Install CLI**: `npm install -g @playwright/cli@latest`
<!-- SW:END:testing -->

<!-- SW:SECTION:tdd version="1.0.253" -->
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

<!-- SW:SECTION:api version="1.0.253" -->
## API Development (OpenAPI-First)

**For API projects only.** Commands: `/sw:api-docs --all` | `--openapi` | `--postman` | `--validate`

Enable in config: `{"apiDocs":{"enabled":true,"openApiPath":"openapi.yaml"}}`
<!-- SW:END:api -->

<!-- SW:SECTION:limits version="1.0.253" -->
## Limits

**Max 1500 lines/file** — extract before adding
<!-- SW:END:limits -->

<!-- SW:SECTION:troubleshooting version="1.0.253" -->
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

<!-- SW:SECTION:lazyloading version="1.0.253" -->
## Plugin Auto-Loading

Plugins load automatically based on project type and keywords. Manual install if needed:

```bash
claude plugin install sw-frontend@specweave  # Install plugin
claude plugin list                           # Check installed
export SPECWEAVE_DISABLE_AUTO_LOAD=1         # Disable auto-load
```

**Token savings**: Core ~3-5K tokens vs all plugins ~60K+
<!-- SW:END:lazyloading -->

<!-- SW:SECTION:principles version="1.0.253" -->
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

<!-- SW:SECTION:linking version="1.0.253" -->
## Bidirectional Linking

Tasks ↔ User Stories auto-linked via AC-IDs: `AC-US1-01` → `US-001`

Task format: `**AC**: AC-US1-01, AC-US1-02` (CRITICAL for linking)
<!-- SW:END:linking -->

<!-- SW:SECTION:mcp version="1.0.253" -->
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

<!-- SW:SECTION:auto version="1.0.253" -->
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

<!-- SW:SECTION:docs version="1.0.253" -->
## Docs

[spec-weave.com](https://spec-weave.com)
<!-- SW:END:docs -->

---

# SpecWeave Contributor Guide

**Full guide**: [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)

| Rule | Detail |
|---|---|
| Completion | `/sw:done` only (NEVER edit metadata.json) |
| Protected dirs | NEVER delete `.specweave/docs/`, `.specweave/increments/` |
| Token budget | ~80k/increment, max 25 tasks, max 1500 lines/file |
| Marketplace | Contributors: `scripts/refresh-marketplace.sh` \| Users: `specweave refresh-marketplace` |
| No `name:` in frontmatter | Strips plugin prefix (`/sw:grill` → `/grill`) |
| Plugin naming | CLI: `sw-*` \| Filesystem: `specweave-*` |
| Imports | ALWAYS `.js` extensions |
| Tests | `.test.ts`, `vi.fn()`, `os.tmpdir()` |
| Logger | `logger` over `console.*` |

```bash
npm run rebuild                    # Clean + build
npm test                           # All tests

# Stuck: pkill -f "cat.*EOF" ; pkill -9 -f "bash.*specweave" ; rm -f .specweave/state/*.lock
# Debug: SPECWEAVE_DEBUG_HOOKS=1 | SPECWEAVE_DISABLE_HOOKS=1
```
