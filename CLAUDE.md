<!-- SW:META template="claude" version="1.0.272" sections="header,lsp,start,autodetect,metarule,rules,workflow,reflect,context,structure,taskformat,secrets,syncing,testing,tdd,api,limits,troubleshooting,lazyloading,principles,linking,mcp,auto,docs" -->

<!-- SW:SECTION:header version="1.0.272" -->
**Framework**: SpecWeave | **Truth**: `spec.md` + `tasks.md`
<!-- SW:END:header -->

<!-- SW:SECTION:lsp version="1.0.272" -->
## LSP (Code Intelligence)

**Native LSP broken in v2.1.0+.** Use: `specweave lsp refs|def|hover src/file.ts SymbolName`
<!-- SW:END:lsp -->

<!-- SW:SECTION:start version="1.0.272" -->
## Getting Started

**Initial increment**: `0001-project-setup` (auto-created by `specweave init`)

**Options**:
1. **Start fresh**: `rm -rf .specweave/increments/0001-project-setup` → `/sw:increment "your-feature"`
2. **Customize**: Edit spec.md and use for setup tasks
<!-- SW:END:start -->

<!-- SW:SECTION:autodetect version="1.0.272" -->
## Auto-Detection

SpecWeave auto-detects product descriptions and routes to `/sw:increment`:

**Signals** (5+ = auto-route): Project name | Features list (3+) | Tech stack | Timeline/MVP | Problem statement | Business model

**Opt-out phrases**: "Just brainstorm first" | "Don't plan yet" | "Quick discussion" | "Let's explore ideas"
<!-- SW:END:autodetect -->

<!-- SW:SECTION:metarule version="1.0.272" -->
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

<!-- SW:SECTION:rules version="1.0.272" -->
## Rules

1. **Files** → `.specweave/increments/####-name/` (see Structure section for details)
2. **Update immediately**: `Edit("tasks.md", "[ ] pending", "[x] completed")` + `Edit("spec.md", "[ ] AC-", "[x] AC-")`
3. **Unique IDs**: Check ALL folders (active, archive, abandoned):
   ```bash
   find .specweave/increments -maxdepth 2 -type d -name "[0-9]*" | grep -oE '[0-9]{4}E?' | sort -u | tail -5
   ```
4. **Emergency**: "emergency mode" → 1 edit, 50 lines max, no agents
5. **Initialization guard**: `.specweave/` folders MUST ONLY exist where `specweave init` was run
6. **Plugin refresh**: Use `specweave refresh-plugins` CLI (not `scripts/refresh-marketplace.sh`)
7. **Numbered folder collisions**: Before creating `docs/NN-*` folders, CHECK existing prefixes
8. **Multi-repo**: ALL repos MUST be at `repositories/{org}/{repo-name}/` — NEVER directly under `repositories/`
<!-- SW:END:rules -->

<!-- SW:SECTION:workflow version="1.0.272" -->
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

<!-- SW:SECTION:reflect version="1.0.272" -->
## Skill Memories

SpecWeave learns from corrections. Learnings saved here automatically. Edit or delete as needed.

**Disable**: Set `"reflect": { "enabled": false }` in `.specweave/config.json`
<!-- SW:END:reflect -->

<!-- SW:SECTION:context version="1.0.272" -->
## Context

**Before implementing**: Check ADRs at `.specweave/docs/internal/architecture/adr/`

**Load context**: `/sw:docs <topic>` loads relevant living docs into conversation
<!-- SW:END:context -->

<!-- SW:SECTION:structure version="1.0.272" -->
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

<!-- SW:SECTION:taskformat version="1.0.272" -->
## Task Format

```markdown
### T-001: Title
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given [X] → When [Y] → Then [Z]
```
<!-- SW:END:taskformat -->

<!-- SW:SECTION:secrets version="1.0.272" -->
## Secrets

Before CLI tools, check existing config (`grep -q` only — never display values).
<!-- SW:END:secrets -->

<!-- SW:SECTION:syncing version="1.0.272" -->
## External Sync

Primary: `/sw:progress-sync`. Individual: `/sw-github:push`, `/sw-github:close`. Mapping: Feature→Milestone | Story→Issue | Task→Checkbox.
<!-- SW:END:syncing -->

<!-- SW:SECTION:testing version="1.0.272" -->
## Testing

BDD in tasks.md | Unit >80% | `.test.ts` (Vitest) | ESM mocking: `vi.hoisted()` + `vi.mock()`
<!-- SW:END:testing -->

<!-- SW:SECTION:tdd version="1.0.272" -->
## TDD

When `testing.defaultTestMode: "TDD"` in config.json: RED→GREEN→REFACTOR. Use `/sw:tdd-cycle`. Enforcement via `testing.tddEnforcement` (strict|warn|off).
<!-- SW:END:tdd -->

<!-- SW:SECTION:api version="1.0.272" -->
<!-- API: Enable `apiDocs` in config.json. Commands: /sw:api-docs -->
<!-- SW:END:api -->

<!-- SW:SECTION:limits version="1.0.272" -->
## Limits

**Max 1500 lines/file** — extract before adding
<!-- SW:END:limits -->

<!-- SW:SECTION:troubleshooting version="1.0.272" -->
## Troubleshooting

| Issue | Fix |
|-------|-----|
| Skills missing | Restart Claude Code |
| Plugins outdated | `specweave refresh-plugins` |
| Out of sync | `/sw:sync-progress` |
| Session stuck | `rm -f .specweave/state/*.lock` + restart |
<!-- SW:END:troubleshooting -->

<!-- SW:SECTION:lazyloading version="1.0.272" -->
## Plugin Auto-Loading

Plugins load automatically. Manual: `vskill add specweave --plugin sw-frontend`. Disable: `export SPECWEAVE_DISABLE_AUTO_LOAD=1`
<!-- SW:END:lazyloading -->

<!-- SW:SECTION:principles version="1.0.272" -->
## Principles

1. **Spec-first**: `/sw:increment` before coding
2. **Docs = truth**: Specs guide implementation
3. **Simplicity First**: Minimal code, minimal impact
4. **No Laziness**: Root causes, senior standards
5. **DRY**: Don't Repeat Yourself — flag and eliminate repetitions aggressively
6. **Plan Review**: Review the plan thoroughly before making any code changes
<!-- SW:END:principles -->

<!-- SW:SECTION:linking version="1.0.272" -->
## Bidirectional Linking

Tasks ↔ User Stories auto-linked via AC-IDs: `AC-US1-01` → `US-001`

Task format: `**AC**: AC-US1-01, AC-US1-02` (CRITICAL for linking)
<!-- SW:END:linking -->

<!-- SW:SECTION:mcp version="1.0.272" -->
## External Services

CLI tools first (`gh`, `wrangler`, `supabase`) → MCP for complex integrations.
<!-- SW:END:mcp -->

<!-- SW:SECTION:auto version="1.0.272" -->
## Auto Mode

`/sw:auto` (start) | `/sw:auto-status` (check) | `/sw:cancel-auto` (emergency)

Pattern: IMPLEMENT → TEST → FAIL? → FIX → PASS → NEXT. STOP & ASK if spec conflicts or ambiguity.
<!-- SW:END:auto -->

<!-- SW:SECTION:docs version="1.0.272" -->
## Docs

[spec-weave.com](https://spec-weave.com)
<!-- SW:END:docs -->
