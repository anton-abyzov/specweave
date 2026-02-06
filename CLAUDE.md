<!-- SW:META template="claude" version="1.0.231" sections="header,start,autodetect,metarule,rules,workflow,reflect,context,structure,taskformat,secrets,syncing,testing,tdd,api,limits,troubleshooting,lazyloading,principles,linking,mcp,auto,docs" -->

<!-- SW:SECTION:hook-priority version="1.0.171" -->
## ⛔ Hook Instructions Override Everything

`<system-reminder>` hook output = **BLOCKING PRECONDITIONS**.

| Hook Message | Action |
|---|---|
| **"RESTART REQUIRED"** | ❌ ALL tools blocked → STOP, wait for restart |
| **"SKILL FIRST"** | Call shown skill FIRST → chain domain skills → implement |
<!-- SW:END:hook-priority -->

<!-- SW:SECTION:header version="1.0.231" -->
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

<!-- SW:SECTION:start version="1.0.231" -->
## Getting Started

`0001-project-setup` auto-created by `specweave init`. Start fresh: `/sw:increment "your-feature"`, or customize existing spec.md.
<!-- SW:END:start -->

<!-- SW:SECTION:autodetect version="1.0.231" -->
## Auto-Detection

Routes to `/sw:increment` when 5+ signals detected: Project name | Features list (3+) | Tech stack | Timeline/MVP | Problem statement | Business model

**Opt-out**: "Just brainstorm first" | "Don't plan yet" | "Quick discussion"
<!-- SW:END:autodetect -->

<!-- SW:SECTION:metarule version="1.0.231" -->
## Workflow Orchestration

1. **Plan first**: Enter plan mode for non-trivial tasks (3+ steps). If sideways → STOP, re-plan.
2. **Subagents**: Offload research/exploration. One task per subagent. Use liberally for large analysis.
3. **Verify before done**: Prove it works. "Would a staff engineer approve this?"
4. **Dependencies first**: Build before run. Install before import.
<!-- SW:END:metarule -->

<!-- SW:SECTION:rules version="1.0.231" -->
## Rules

1. **Files** → `.specweave/increments/####-name/` (only `metadata.json`, `spec.md`, `plan.md`, `tasks.md` at root; everything else → subfolders)
2. **Update immediately**: Mark tasks `[x]` + update spec.md ACs on completion
3. **Unique IDs**: Check all folders: `find .specweave/increments -maxdepth 2 -type d -name "[0-9]*" | grep -oE '[0-9]{4}E?' | sort -u | tail -5`
4. **Emergency mode**: 1 edit, 50 lines max, no agents
5. ⛔ `.specweave/` folders ONLY where `specweave init` was run
6. ⛔ Use `specweave refresh-marketplace` CLI (not `scripts/refresh-marketplace.sh`)
7. ⛔ Before creating `docs/NN-*`, check existing prefixes to avoid collisions
<!-- SW:END:rules -->

<!-- SW:SECTION:workflow version="1.0.231" -->
## Workflow

`/sw:increment "X"` → `/sw:do` → `/sw:progress` → `/sw:done 0001`

| Cmd | Action |
|---|---|
| `/sw:increment` | Plan feature |
| `/sw:do` | Execute tasks |
| `/sw:auto` | Autonomous (IMPLEMENT→TEST→FIX→NEXT). Requires explicit stop conditions. |
| `/sw:validate` | Quality check |
| `/sw:done` | Close (grill → validate → sync) |
| `/sw-github:sync` `/sw-jira:sync` | External sync |

**Natural language**: "Let's build X" → increment | "What's status?" → progress | "We're done" → done | "Ship while sleeping" → auto
<!-- SW:END:workflow -->

<!-- SW:SECTION:save-nested-repos version="1.0.194" -->
## Nested Repos

Before git operations, scan: `for d in repositories packages services apps libs workspace; do [ -d "$d" ] && find "$d" -maxdepth 2 -name ".git" -type d; done`
<!-- SW:END:save-nested-repos -->

<!-- SW:SECTION:reflect version="1.0.231" -->
## Skill Memories

Auto-captured learnings. Disable: `"reflect": { "enabled": false }` in config.json
<!-- SW:END:reflect -->

<!-- Auto-captured by SpecWeave reflect. Edit or delete as needed. -->

### Pm
- Enable interview during increment creation (5+ questions minimum)
- Call /sw:grill before completing features/increments

### General
- Use subagents liberally (10+ concurrent for large exploration)
- Auto command: explicit stop conditions, visible output
- Prefer leaderboard-style reporting for analysis

<!-- SW:SECTION:context version="1.0.231" -->
## Context

Check ADRs at `.specweave/docs/internal/architecture/adr/` before implementing. Load context: `/sw:context <topic>`
<!-- SW:END:context -->

<!-- SW:SECTION:structure version="1.0.231" -->
## Structure

```
.specweave/
├── increments/####-name/     # metadata.json, spec.md, plan.md, tasks.md
├── docs/internal/specs/      # Living docs
└── config.json
```

⛔ Increment root: ONLY 4 files. Everything else → subfolders (`reports/`, `logs/`, `scripts/`)
<!-- SW:END:structure -->

<!-- SW:SECTION:taskformat version="1.0.231" -->
## Task Format

```markdown
### T-001: Title
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given [X] → When [Y] → Then [Z]
```
<!-- SW:END:taskformat -->

<!-- SW:SECTION:secrets version="1.0.231" -->
## Secrets Check

Before CLI tools: `grep -qE "(GITHUB_TOKEN|GH_TOKEN|JIRA_|AZURE_DEVOPS_|ADO_)" .env 2>/dev/null && echo "Found"`

⛔ NEVER `grep TOKEN .env` without `-q` — exposes credentials in terminal!
<!-- SW:END:secrets -->

<!-- SW:SECTION:syncing version="1.0.231" -->
## External Sync

Commands: `/sw-github:sync {id}` | `/sw:sync-specs` (living docs)
Mapping: Feature → Milestone | Story → Issue | Task → Checkbox
Config: `sync.github.enabled: true` + `canUpdateExternalItems: true`
<!-- SW:END:syncing -->

<!-- SW:SECTION:testing version="1.0.231" -->
## Testing

BDD in tasks.md | Unit >80% | `.test.ts` (Vitest)

```typescript
// ESM mocking (Vitest 4.x+)
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock('./module', () => ({ func: mockFn }));
```
<!-- SW:END:testing -->

<!-- SW:SECTION:tdd version="1.0.231" -->
## TDD Mode

When `testing.defaultTestMode: "TDD"` in config.json: RED → GREEN → REFACTOR.

Commands: `/sw:tdd-red` | `/sw:tdd-green` | `/sw:tdd-refactor` | `/sw:tdd-cycle`

Enforcement (`testing.tddEnforcement`): `strict` (blocks GREEN until RED) | `warn` (default) | `off`

TDD tasks use phase markers: `[RED] Write tests` → `[GREEN] Implement` → `[REFACTOR] Optimize`. Complete dependencies in order.
<!-- SW:END:tdd -->

<!-- SW:SECTION:api version="1.0.231" -->
## API Development

OpenAPI-first. Commands: `/sw:api-docs --all|--openapi|--postman|--validate`. Enable: `apiDocs.enabled: true`
<!-- SW:END:api -->

<!-- SW:SECTION:limits version="1.0.231" -->
## Limits

Max 1500 lines/file — extract before adding
<!-- SW:END:limits -->

<!-- SW:SECTION:troubleshooting version="1.0.231" -->
## Troubleshooting

| Issue | Fix |
|---|---|
| Skills missing | Restart Claude Code |
| Plugins outdated | `specweave refresh-marketplace` |
| Out of sync | `/sw:sync-tasks` |
| Edits blocked | Add `"additionalDirectories":["repositories"]` to `.claude/settings.json` |
| Session stuck | `rm -f .specweave/state/*.lock` + restart |
<!-- SW:END:troubleshooting -->

<!-- SW:SECTION:lazyloading version="1.0.231" -->
## Plugin Auto-Loading

Auto-loads by project type. Manual: `claude plugin install sw-frontend@specweave`. Disable: `SPECWEAVE_DISABLE_AUTO_LOAD=1`
<!-- SW:END:lazyloading -->

<!-- SW:SECTION:principles version="1.0.231" -->
## Principles

1. **Spec-first**: `/sw:increment` before coding. Docs = truth. Small increments. All work traceable to ACs.
2. **Simplicity**: Simplest solution. Minimal impact. Only change what's needed.
3. **No laziness**: Root causes. No temp fixes. Senior developer standards.
4. **Elegance**: Pause for non-trivial changes — "is there a more elegant way?" Pragmatic > perfect.
<!-- SW:END:principles -->

<!-- SW:SECTION:linking version="1.0.231" -->
## Bidirectional Linking

Tasks ↔ User Stories auto-linked via AC-IDs: `AC-US1-01` → `US-001`
<!-- SW:END:linking -->

<!-- SW:SECTION:mcp version="1.0.231" -->
## External Services

CLI first → MCP for complex integrations. Check auth: `gh auth status` | `wrangler whoami` | `supabase status`

MCP: `claude mcp add --transport http github https://api.github.com/mcp` | `/mcp` to check status
<!-- SW:END:mcp -->

<!-- SW:SECTION:auto version="1.0.231" -->
## Auto Mode

**TDD in auto**: `/sw:auto --tdd` for strict enforcement. Follows RED → GREEN → REFACTOR per task triplet.

**Pragmatic completion**: MUST (MVP, security) | SHOULD (edge cases) | CAN SKIP (conflicts — ask user)

**STOP & ASK**: Spec conflicts | Task unnecessary | Requirement ambiguous
<!-- SW:END:auto -->

<!-- SW:SECTION:docs version="1.0.231" -->
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
