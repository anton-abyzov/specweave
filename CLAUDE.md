<!-- SW:META template="claude" version="1.0.261" sections="header,lsp,start,autodetect,metarule,rules,workflow,reflect,context,structure,taskformat,secrets,syncing,testing,tdd,api,limits,troubleshooting,lazyloading,principles,linking,mcp,auto,docs" -->

<!-- SW:SECTION:hook-priority version="1.0.171" -->
## ⛔ Hook Instructions Override Everything

`<system-reminder>` hook output = **BLOCKING PRECONDITIONS**.

| Hook Message | Action |
|---|---|
| **"RESTART REQUIRED"** | ❌ ALL tools blocked → STOP, wait for restart |
| **"SKILL FIRST"** | Call shown skill FIRST → chain domain skills → implement |
<!-- SW:END:hook-priority -->

<!-- SW:SECTION:header version="1.0.261" -->
**Framework**: SpecWeave | **Truth**: `spec.md` + `tasks.md`
<!-- SW:END:header -->

<!-- SW:SECTION:claude-code-concepts version="1.0.150" -->
## Skills & Plugins

**Invoke**: `/skill-name` | auto-trigger by keywords | `Skill({ skill: "name" })`
**Parallel work**: Append "use subagents" to requests

**Key skills**: `sw:pm`, `sw:architect`, `sw:grill`, `sw:tdd-cycle`, `sw-frontend:*`, `sw-backend:*`, `sw-testing:*`

**Skill chaining** — skills are NOT "one and done":
1. **Planning**: `sw:pm` (specs) → `sw:architect` (design)
2. **Implementation**: Invoke domain skill per tech (React → `sw-frontend:frontend-architect`, .NET → `sw-backend:dotnet-backend`, Stripe → `sw-payments:stripe-integration`, etc.)
3. **Closure**: `sw:grill` runs automatically via `/sw:done`

If auto-activation fails, invoke explicitly: `Skill({ skill: "name" })`
<!-- SW:END:claude-code-concepts -->

<!-- SW:SECTION:skill-chaining version="1.0.179" -->
<!-- Consolidated into Skills & Plugins section above -->
<!-- SW:END:skill-chaining -->

## LSP

Use: `specweave lsp refs|def|hover src/file.ts SymbolName`

<!-- SW:SECTION:lsp version="1.0.261" -->
## LSP (Code Intelligence)

**Native LSP broken in v2.1.0+.** Use: `specweave lsp refs|def|hover src/file.ts SymbolName`
<!-- SW:END:lsp -->

<!-- SW:SECTION:start version="1.0.261" -->
## Getting Started

**Initial increment**: `0001-project-setup` (auto-created by `specweave init`)

**Options**:
1. **Start fresh**: `rm -rf .specweave/increments/0001-project-setup` → `/sw:increment "your-feature"`
2. **Customize**: Edit spec.md and use for setup tasks
<!-- SW:END:start -->

<!-- SW:SECTION:autodetect version="1.0.261" -->
## Auto-Detection

SpecWeave auto-detects product descriptions and routes to `/sw:increment`:

**Signals** (5+ = auto-route): Project name | Features list (3+) | Tech stack | Timeline/MVP | Problem statement | Business model

**Opt-out phrases**: "Just brainstorm first" | "Don't plan yet" | "Quick discussion" | "Let's explore ideas"
<!-- SW:END:autodetect -->

<!-- SW:SECTION:metarule version="1.0.261" -->
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
Bad:  node script.js → Error → npm run build
Good: npm run build → node script.js → Success
```
<!-- SW:END:metarule -->

<!-- SW:SECTION:rules version="1.0.261" -->
## Rules

1. **Files** → `.specweave/increments/####-name/` (see Structure section for details)
2. **Update immediately**: `Edit("tasks.md", "[ ] pending", "[x] completed")` + `Edit("spec.md", "[ ] AC-", "[x] AC-")`
3. **Unique IDs**: Check ALL folders (active, archive, abandoned):
   ```bash
   find .specweave/increments -maxdepth 2 -type d -name "[0-9]*" | grep -oE '[0-9]{4}E?' | sort -u | tail -5
   ```
4. **Emergency**: "emergency mode" → 1 edit, 50 lines max, no agents
5. **Initialization guard**: `.specweave/` folders MUST ONLY exist where `specweave init` was run
6. **Marketplace refresh**: Use `specweave refresh-marketplace` CLI (not `scripts/refresh-marketplace.sh`)
7. **Numbered folder collisions**: Before creating `docs/NN-*` folders, CHECK existing prefixes
8. **Multi-repo**: ALL repos MUST be at `repositories/{org}/{repo-name}/` — NEVER directly under `repositories/`
<!-- SW:END:rules -->

<!-- SW:SECTION:workflow version="1.0.261" -->
## Workflow

`/sw:increment "X"` → `/sw:do` → `/sw:progress` → `/sw:done 0001`

| Cmd | Action |
|-----|--------|
| `/sw:increment` | Plan feature |
| `/sw:do` | Execute tasks |
| `/sw:auto` | Autonomous execution |
| `/sw:auto-status` | Check auto session |
| `/sw:cancel-auto` | EMERGENCY ONLY manual cancel |
| `/sw:validate` | Quality check |
| `/sw:done` | Close |
| `/sw:progress-sync` | Sync progress to all external tools |
| `/sw-github:push` | Push progress to GitHub |

**Natural language**: "Let's build X" → `/sw:increment` | "What's status?" → `/sw:progress` | "We're done" → `/sw:done` | "Ship while sleeping" → `/sw:auto`
<!-- SW:END:workflow -->

<!-- SW:SECTION:execution-strategy version="1.0.260" -->
## Execution Strategy

Choose execution mode based on increment complexity:

| Complexity | Tasks | Domains | Recommended | Trade-off |
|-----------|-------|---------|-------------|-----------|
| Low | ≤8 | 1 | `/sw:do` | Full control, manual |
| Medium | 9-15 | 1-2 | `/sw:auto` | Unattended, sequential |
| High | >15 OR any | 3+ | `/sw:team-lead` | Parallel agents, higher token cost, best quality |

Skills auto-recommend based on this matrix. In non-auto mode: ask user. In auto mode: use team-lead automatically for 3+ domains.
<!-- SW:END:execution-strategy -->

<!-- SW:SECTION:save-nested-repos version="1.0.194" -->
## Nested Repos

Before git operations, scan: `for d in repositories packages services apps libs workspace; do [ -d "$d" ] && find "$d" -maxdepth 2 -name ".git" -type d; done`
<!-- SW:END:save-nested-repos -->

<!-- SW:SECTION:reflect version="1.0.261" -->
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
- **Team-lead for complex work**: After plan generation, ALWAYS assess complexity (task count + domain count). For 3+ domains or 15+ tasks, proactively recommend /sw:team-lead with token cost warning. In auto mode, auto-invoke team-lead for 3+ domains.

<!-- SW:SECTION:context version="1.0.261" -->
## Context

**Before implementing**: Check ADRs at `.specweave/docs/internal/architecture/adr/`

**Load context**: `/sw:docs <topic>` loads relevant living docs into conversation
<!-- SW:END:context -->

<!-- SW:SECTION:structure version="1.0.261" -->
## Structure

```
.specweave/
├── increments/####-name/     # metadata.json, spec.md, plan.md, tasks.md
├── docs/internal/specs/      # Living docs
└── config.json
```

**Increment root**: ONLY `metadata.json`, `spec.md`, `plan.md`, `tasks.md`

**Everything else → subfolders**: `reports/` | `logs/` | `scripts/` | `backups/`
<!-- SW:END:structure -->

<!-- SW:SECTION:taskformat version="1.0.261" -->
## Task Format

```markdown
### T-001: Title
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given [X] → When [Y] → Then [Z]
```
<!-- SW:END:taskformat -->

<!-- SW:SECTION:secrets version="1.0.261" -->
## Secrets

Before CLI tools, check existing config (`grep -q` only — never display values).
<!-- SW:END:secrets -->

<!-- SW:SECTION:syncing version="1.0.261" -->
## External Sync

Primary: `/sw:progress-sync`. Individual: `/sw-github:push`, `/sw-github:close`. Mapping: Feature→Milestone | Story→Issue | Task→Checkbox.
<!-- SW:END:syncing -->

<!-- SW:SECTION:testing version="1.0.261" -->
## Testing

BDD in tasks.md | Unit >80% | `.test.ts` (Vitest) | ESM mocking: `vi.hoisted()` + `vi.mock()`
<!-- SW:END:testing -->

<!-- SW:SECTION:tdd version="1.0.261" -->
## TDD

When `testing.defaultTestMode: "TDD"` in config.json: RED→GREEN→REFACTOR. Use `/sw:tdd-cycle`. Enforcement via `testing.tddEnforcement` (strict|warn|off).
<!-- SW:END:tdd -->

<!-- SW:SECTION:api version="1.0.261" -->
<!-- API: Enable `apiDocs` in config.json. Commands: /sw:api-docs -->
<!-- SW:END:api -->

<!-- SW:SECTION:limits version="1.0.261" -->
## Limits

**Max 1500 lines/file** — extract before adding
<!-- SW:END:limits -->

<!-- SW:SECTION:troubleshooting version="1.0.261" -->
## Troubleshooting

| Issue | Fix |
|-------|-----|
| Skills missing | Restart Claude Code |
| Plugins outdated | `specweave refresh-marketplace` |
| Out of sync | `/sw:sync-progress` |
| Session stuck | `rm -f .specweave/state/*.lock` + restart |
<!-- SW:END:troubleshooting -->

<!-- SW:SECTION:lazyloading version="1.0.261" -->
## Plugin Auto-Loading

Plugins load automatically. Manual: `claude plugin install sw-frontend@specweave`. Disable: `export SPECWEAVE_DISABLE_AUTO_LOAD=1`
<!-- SW:END:lazyloading -->

<!-- SW:SECTION:principles version="1.0.261" -->
## Principles

1. **Spec-first**: `/sw:increment` before coding
2. **Docs = truth**: Specs guide implementation
3. **Simplicity First**: Minimal code, minimal impact
4. **No Laziness**: Root causes, senior standards
<!-- SW:END:principles -->

<!-- SW:SECTION:linking version="1.0.261" -->
## Bidirectional Linking

Tasks ↔ User Stories auto-linked via AC-IDs: `AC-US1-01` → `US-001`

Task format: `**AC**: AC-US1-01, AC-US1-02` (CRITICAL for linking)
<!-- SW:END:linking -->

<!-- SW:SECTION:mcp version="1.0.261" -->
## External Services

CLI tools first (`gh`, `wrangler`, `supabase`) → MCP for complex integrations.
<!-- SW:END:mcp -->

<!-- SW:SECTION:auto version="1.0.261" -->
## Auto Mode

`/sw:auto` (start) | `/sw:auto-status` (check) | `/sw:cancel-auto` (emergency)

Pattern: IMPLEMENT → TEST → FAIL? → FIX → PASS → NEXT. STOP & ASK if spec conflicts or ambiguity.
<!-- SW:END:auto -->

<!-- SW:SECTION:docs version="1.0.261" -->
## Docs

[spec-weave.com](https://spec-weave.com)
<!-- SW:END:docs -->

---

# Contributor Guide

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md). Key: `.js` imports | `.test.ts` (Vitest) | `logger` over `console.*` | No `name:` in frontmatter | `npm run rebuild` + `npm test`
