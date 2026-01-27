<!-- SW:META template="claude" version="1.0.177" sections="header,start,autodetect,metarule,rules,workflow,reflect,context,structure,taskformat,secrets,syncing,testing,tdd,api,limits,troubleshooting,lazyloading,principles,linking,mcp,auto,docs" -->

<!-- SW:SECTION:hook-priority version="1.0.171" -->
## ⛔ ABSOLUTE PRIORITY: Hook Instructions Are Mandatory

**READ THIS FIRST. This overrides ALL other instructions.**

If `<system-reminder>` contains hook output, those instructions are **BLOCKING PRECONDITIONS** - not suggestions.

### 🚫 RESTART REQUIRED = FULL STOP

If hook says **"PLUGINS INSTALLED - RESTART REQUIRED"**:

**YOU ARE BLOCKED FROM:**
- ❌ Write tool - BLOCKED
- ❌ Edit tool - BLOCKED
- ❌ Bash (except read-only) - BLOCKED
- ❌ Creating files or directories - BLOCKED
- ❌ ANY implementation work - BLOCKED

**YOUR ONLY ALLOWED ACTIONS:**
1. Display the restart warning to user prominently
2. Provide copy-paste prompt back to user
3. STOP and wait for user to restart

**DO NOT:** "Just help anyway", "Start while they restart", "Do a quick thing first"

### 🎯 SKILL FIRST = Start With This Skill, Then Use MORE

If hook says **"SKILL FIRST"** or shows a Skill tool call to make:

**ORDER MATTERS:**
1. ✅ Call the Skill tool FIRST (exactly as shown in hook)
2. ✅ THEN invoke ADDITIONAL domain skills for each technology
3. ✅ THEN proceed with implementation
4. ✅ AFTER code generation, invoke LSP skills for validation

**"SKILL FIRST" does NOT mean "only use one skill"!**

**DO NOT:**
- ❌ Call one skill and then implement everything directly
- ❌ Skip domain skills (sw-frontend, sw-backend, sw-payments)
- ❌ Skip LSP validation after writing code

**See "MANDATORY: Skill Chaining" section below for the full pattern.**

### Why This Matters

Hooks exist to enforce workflow discipline. If you ignore them:
- Plugins won't be available (features broken)
- Increments won't be tracked (work lost)
- The entire automation system is defeated

**This is non-negotiable. No exceptions. No "just this once".**
<!-- SW:END:hook-priority -->

<!-- SW:SECTION:header version="1.0.177" -->
**Framework**: SpecWeave | **Truth**: `spec.md` + `tasks.md`
<!-- SW:END:header -->

<!-- SW:SECTION:claude-code-concepts version="1.0.150" -->
## Claude Code Concepts (2.1.3+)

**Skills and slash commands are now unified.** Both file formats create the same `/name` command:
- `.claude/commands/review.md` → `/review`
- `.claude/skills/review/SKILL.md` → `/review`

### Core Concepts

| Concept | What It Is | How to Use |
|---------|------------|------------|
| **Skills** | Reusable instructions in SKILL.md | `/skill-name` or auto-invoke via keywords |
| **Plugins** | Packages with skills, agents, hooks | `claude plugin install sw@specweave` |
| **Agents** | Isolated subagents with own context | Task tool or `context: fork` in skill |

### Skill Invocation Control (Frontmatter)

| Frontmatter | User Can Invoke | Claude Can Invoke | Use Case |
|-------------|-----------------|-------------------|----------|
| (default) | Yes | Yes | Most skills |
| `disable-model-invocation: true` | Yes | **No** | Workflows with side effects (`/deploy`) |
| `user-invocable: false` | **No** | Yes | Background knowledge |

### SpecWeave Skill Organization

```
plugins/specweave/
├── commands/          # User-invocable workflows (have hooks)
│   ├── do.md          # → /sw:do (execute tasks)
│   ├── done.md        # → /sw:done (close increment)
│   └── status.md      # → /sw:status
└── skills/            # Auto-activating expertise (keyword-triggered)
    ├── architect/     # → activates on "architecture", "system design"
    ├── pm/            # → activates on "product", "requirements", "MVP"
    └── tech-lead/     # → activates on "code review", "best practices"
```

### Quick Examples

```bash
# Explicit invocation (user types command)
/sw:do                              # Execute tasks
/sw:increment "auth feature"        # Plan increment

# Auto-activation (Claude detects keywords, loads skill)
"Design the auth architecture"      # → architect skill
"Help me plan this product"         # → PM skill
```

### Key Insight

**Old "commands" are just skills with `disable-model-invocation: true`** - they only respond to explicit `/name` invocation, not keyword detection.
<!-- SW:END:claude-code-concepts -->

<!-- SW:SECTION:skill-chaining version="1.0.177" -->
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

POST-IMPLEMENTATION (RECOMMENDED):
  After writing code → Use sw:lsp-integration for code quality
  - LSP plugins (csharp-lsp, typescript-lsp) run AUTOMATICALLY
  - Use findReferences before refactoring
  - Use diagnostics to catch type errors
```

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
[After writing code] → Skill(sw:lsp-integration) → Use LSP for validation
```

**Note on LSP**: LSP plugins (csharp-lsp, typescript-lsp) provide AUTOMATIC code intelligence.
Use `sw:lsp-integration` skill for guidance on findReferences, goToDefinition, diagnostics.

### Skill Usage Checklist

Before marking implementation complete, verify:
- [ ] Used planning skills (PM, Architect) if complex feature
- [ ] Used domain skills for each tech in the stack
- [ ] Used LSP skill after code generation
- [ ] Invoked skills explicitly if auto-activation didn't trigger
<!-- SW:END:skill-chaining -->

<!-- SW:SECTION:start version="1.0.177" -->
## Getting Started

**Initial increment**: `0001-project-setup` (auto-created by `specweave init`)

**Options**:
1. **Start fresh**: `rm -rf .specweave/increments/0001-project-setup` → `/sw:increment "your-feature"`
2. **Customize**: Edit spec.md and use for setup tasks
<!-- SW:END:start -->

<!-- SW:SECTION:autodetect version="1.0.177" -->
## Auto-Detection

SpecWeave auto-detects product descriptions and routes to `/sw:increment`:

**Signals** (5+ = auto-route): Project name | Features list (3+) | Tech stack | Timeline/MVP | Problem statement | Business model

**Opt-out phrases**: "Just brainstorm first" | "Don't plan yet" | "Quick discussion" | "Let's explore ideas"
<!-- SW:END:autodetect -->

<!-- SW:SECTION:metarule version="1.0.177" -->
## Meta-Rule: Think-Before-Act

**Satisfy dependencies BEFORE dependent operations.**

```
❌ node script.js → Error → npm run build
✅ npm run build → node script.js → Success
```
<!-- SW:END:metarule -->

<!-- SW:SECTION:rules version="1.0.177" -->
## Rules

1. **Files** → `.specweave/increments/####-name/` (see Structure section for details)
2. **Update immediately**: `Edit("tasks.md", "[ ] pending", "[x] completed")` + `Edit("spec.md", "[ ] AC-", "[x] AC-")`
3. **Unique IDs**: Check `ls .specweave/increments/ | grep "^[0-9]" | tail -5`
4. **Emergency**: "emergency mode" → 1 edit, 50 lines max, no agents
5. **⛔ Initialization guard**: `.specweave/` folders MUST ONLY exist where `specweave init` was run
6. **⛔ Marketplace refresh**: Use `specweave refresh-marketplace` CLI (not `scripts/refresh-marketplace.sh`)
<!-- SW:END:rules -->

<!-- SW:SECTION:workflow version="1.0.177" -->
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

<!-- SW:SECTION:reflect version="1.0.177" -->
## Skill Memories

SpecWeave learns from corrections. Learnings saved here automatically. Edit or delete as needed.

**Disable**: Set `"reflect": { "enabled": false }` in `.specweave/config.json`
<!-- SW:END:reflect -->

## Skill Memories

<!-- Auto-captured by SpecWeave reflect. Edit or delete as needed. -->

### External Projects
- **2026-01-27**: When hook says "EXTERNAL PROJECT DETECTED", STOP and tell user to start a new Claude Code session in that folder. NEVER proceed with external project work from wrong context.

### Increment ID Creation
- **2026-01-27**: NEVER manually assign increment IDs. ALWAYS run `find .specweave/increments -maxdepth 2 -name "[0-9]*" | grep -oE '[0-9]{4}E?' | sort -u` to check ALL folders (_archive, _abandoned, _paused) before creating. Or use IncrementNumberManager API.

### Skill Chaining
- **2026-01-27**: Skills are NOT optional. MANDATORY pattern: sw:increment-planner → sw:pm + sw:architect → domain skills → implementation → sw:lsp-integration. Skipping ANY step is a workflow violation.
- **2026-01-27**: Auto-activation is UNRELIABLE! With multiple plugins (15K char budget), skill descriptions get truncated. ALWAYS use explicit `Skill({ skill: "name" })` invocation - do NOT wait for auto-activation.
- **2026-01-27**: After EVERY code generation block (C#, TypeScript, Python, etc.), IMMEDIATELY invoke `Skill({ skill: "sw:lsp-integration" })` for validation. This is MANDATORY, not optional.
- **2026-01-27**: PROOF: SpecWeave has 179 skills/commands but only ~133 fit in 15K budget. 26% ARE EXCLUDED from context! User should set `SLASH_COMMAND_TOOL_CHAR_BUDGET=30000` to increase limit.

### Logging
- **2026-01-27**: // Do NOT verify immediately - show dialog instead

<!-- SW:SECTION:context version="1.0.177" -->
## Context

**Before implementing**: Check ADRs at `.specweave/docs/internal/architecture/adr/`

**Load context**: `/sw:context <topic>` loads relevant living docs into conversation
<!-- SW:END:context -->

<!-- SW:SECTION:structure version="1.0.177" -->
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

<!-- SW:SECTION:taskformat version="1.0.177" -->
## Task Format

```markdown
### T-001: Title
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given [X] → When [Y] → Then [Z]
```
<!-- SW:END:taskformat -->

<!-- SW:SECTION:secrets version="1.0.177" -->
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

<!-- SW:SECTION:syncing version="1.0.177" -->
## External Sync (GitHub/JIRA/ADO)

**Commands**: `/sw-github:sync {id}` (issues) | `/sw:sync-specs` (living docs only)

**Mapping**: Feature → Milestone | Story → Issue | Task → Checkbox

**Config**: Set `sync.github.enabled: true` + `canUpdateExternalItems: true` in config.json
<!-- SW:END:syncing -->

<!-- SW:SECTION:testing version="1.0.177" -->
## Testing

BDD in tasks.md | Unit >80% | `.test.ts` (Vitest)

```typescript
// ESM mocking: vi.hoisted() + vi.mock() (Vitest 4.x+)
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock('./module', () => ({ func: mockFn }));
```
<!-- SW:END:testing -->

<!-- SW:SECTION:tdd version="1.0.177" -->
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

<!-- SW:SECTION:api version="1.0.177" -->
## API Development (OpenAPI-First)

**For API projects only.** Commands: `/sw:api-docs --all` | `--openapi` | `--postman` | `--validate`

Enable in config: `{"apiDocs":{"enabled":true,"openApiPath":"openapi.yaml"}}`
<!-- SW:END:api -->

<!-- SW:SECTION:limits version="1.0.177" -->
## Limits

**Max 1500 lines/file** — extract before adding
<!-- SW:END:limits -->

<!-- SW:SECTION:troubleshooting version="1.0.177" -->
## Troubleshooting

| Issue | Fix |
|-------|-----|
| Skills/commands missing | Restart Claude Code |
| Plugins outdated | `specweave refresh-marketplace` |
| Out of sync | `/sw:sync-tasks` |
| Find increment | `/sw:status` |
| Root polluted | Move to `.specweave/increments/####/reports/` |
| Duplicate IDs | `/sw:fix-duplicates` |
| GitHub sync issues | Check config: `sync.github.enabled`, `canUpdateExternalItems` |
| Edits blocked | Add `"additionalDirectories":["repositories"]` to `.claude/settings.json` |
| Marketplace shows 0 | Normal with auto-load; `/plugin list` shows actual |
<!-- SW:END:troubleshooting -->

<!-- SW:SECTION:lazyloading version="1.0.177" -->
## Plugin Auto-Loading

Plugins load automatically based on project type and keywords. Manual install if needed:

```bash
claude plugin install sw-frontend@specweave  # Install plugin
claude plugin list                           # Check installed
export SPECWEAVE_DISABLE_AUTO_LOAD=1         # Disable auto-load
```

**Token savings**: Core ~3-5K tokens vs all plugins ~60K+
<!-- SW:END:lazyloading -->

<!-- SW:SECTION:principles version="1.0.177" -->
## Principles

1. **Spec-first**: `/sw:increment` before coding
2. **Docs = truth**: Specs guide implementation
3. **Incremental**: Small, validated increments
4. **Traceable**: All work → specs → ACs
<!-- SW:END:principles -->

<!-- SW:SECTION:linking version="1.0.177" -->
## Bidirectional Linking

Tasks ↔ User Stories auto-linked via AC-IDs: `AC-US1-01` → `US-001`

Task format: `**AC**: AC-US1-01, AC-US1-02` (CRITICAL for linking)
<!-- SW:END:linking -->

<!-- SW:SECTION:mcp version="1.0.177" -->
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

<!-- SW:SECTION:auto version="1.0.177" -->
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

<!-- SW:SECTION:docs version="1.0.177" -->
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

### 6. Parallel Agents

**Parallel agents + large files = CRASH** (context shared). Process files ONE BY ONE.

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
- Use `csharp-lsp` for C# code quality (CRITICAL - always use LSP!)
- Use language-specific LSP skills whenever available

**Pattern:**
```
/sw:increment → PM skill → Architect skill → Implementation skills → LSP validation
```

### 8. NODE_OPTIONS and VSCode Debug Mode

**⚠️ When spawning child processes (like `claude CLI`), they fail in VSCode Debug mode!**

**Root Cause**: VSCode debugger sets `NODE_OPTIONS` with inspector flags (`--inspect-brk`). These get inherited by child processes, causing them to try to attach to the debugger and fail with exit code 1.

**Symptoms:**
- Tests pass with "Run Test" but fail with "Debug Test"
- Spawned processes exit with code 1 and empty stdout/stderr
- `spawnSync` or `execFileSync` calls fail silently

**Solution - Strip debugger env vars before spawning (works on ALL platforms + CI/CD):**
```typescript
function getCleanEnv(): NodeJS.ProcessEnv {
  const cleanEnv = { ...process.env };
  // Debugger flags (VSCode, WebStorm, IntelliJ)
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_INSPECT;
  delete cleanEnv.NODE_INSPECT_RESUME_ON_START;
  // Coverage/instrumentation (CI/CD pipelines)
  delete cleanEnv.NODE_V8_COVERAGE;
  delete cleanEnv.VSCODE_INSPECTOR_OPTIONS;
  return cleanEnv;
}

// Use in spawn calls:
const result = spawnSync('claude', ['--version'], {
  encoding: 'utf8',
  env: getCleanEnv(),  // ← CRITICAL for debug mode + CI/CD
});
```

**Files using this pattern:**
- `src/utils/claude-cli-detector.ts` - All child process spawning
- `tests/integration/lazy-loading/claude-cli-detection.test.ts` - Test utilities

**See:** `.specweave/docs/public/troubleshooting/vscode-debug-child-processes.md`

### 9. Fast Claude CLI Calls (--setting-sources "")

**⚠️ When spawning `claude -p` for programmatic use, loading settings causes ~50s startup!**

**Root Cause**: Claude CLI loads user/project settings which includes context caching (~30K tokens). For simple prompt-response calls (like plugin detection), this is unnecessary overhead.

**Symptoms:**
- `claude -p "prompt"` takes 50+ seconds
- `duration_ms` much higher than `duration_api_ms` in JSON output
- Timeouts in detect-intent and similar automation

**Solution - Use `--setting-sources ""` (empty string):**
```bash
# SLOW (~50s): Loads all settings + context cache
claude -p "Say hello" --model haiku

# FAST (<1s startup): Skips all settings loading
claude -p "Say hello" --model haiku --setting-sources ""
```

**When to use:**
- ✅ Plugin detection (detect-intent)
- ✅ Simple classification tasks
- ✅ Any headless `claude -p` automation
- ❌ Interactive sessions (need settings)
- ❌ Tasks that need project context

**Files using this pattern:**
- `src/core/lazy-loading/llm-plugin-detector.ts` - Plugin detection via CLI

### 10. Increment ID Collision Prevention (v1.0.160)

**🚨 CRITICAL: Increment IDs MUST be unique across ALL folders!**

**Check these locations BEFORE creating an increment:**
- Active: `.specweave/increments/NNNN-*`
- Archived: `.specweave/increments/_archive/NNNN-*`
- Abandoned: `.specweave/increments/_abandoned/NNNN-*`
- Paused: `.specweave/increments/_paused/NNNN-*`
- **External**: `.specweave/increments/NNNNE-*` (imported items with E suffix)

**Manual Check (if creating increments manually):**
```bash
# Find all existing increment IDs
find .specweave/increments -maxdepth 2 -type d -name "[0-9][0-9][0-9][0-9]*" | \
  grep -oE '[0-9]{4}E?' | sort -u

# Example output:
# 0001       ← archived
# 0002       ← active
# 0123E      ← external imported
# Next safe ID: 0003
```

**Root Cause**: Archived/external increments retain their IDs. Creating a new increment with the same number causes:
- GitHub sync confusion (which 0001 is which?)
- Feature ID collisions in living docs
- Database integrity violations

**Solution - ALWAYS use IncrementNumberManager:**
```typescript
// ✅ CORRECT: Scans ALL folders (active, _archive, _abandoned, _paused, external)
const nextId = IncrementNumberManager.getNextIncrementNumber(projectRoot);

// ❌ WRONG: Only checking active folder
const incrementId = '0001-project-setup';  // May collide with archived!
```

**Files using this pattern:**
- `src/core/increment/increment-utils.ts` - `getAllIncrementNumbers()` scans all directories
- `src/cli/helpers/init/initial-increment-generator.ts` - Uses IncrementNumberManager (fixed v1.0.160)

### 11. Claude Code Hook Output Format (v1.0.166)

**⚠️ Different hook events require DIFFERENT output formats!**

| Hook Event | Correct Output | Wrong (Ignored) |
|------------|----------------|-----------------|
| UserPromptSubmit | `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}` | `{"systemMessage":"..."}` |
| SessionStart | `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}` | `{"systemMessage":"..."}` |
| PreToolUse | `{"decision":"allow"}` or `{"decision":"block","reason":"..."}` | - |
| PostToolUse | `{"continue":true}` | - |

**Common Mistake**: Using `systemMessage` for UserPromptSubmit hooks - this field does NOT exist and content is silently ignored!

**Helper function** (in `user-prompt-submit.sh`):
```bash
output_approve_with_context() {
  local context="$1"
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$(escape_json "$context")"
}
```

**See**: [Claude Code Hooks Guide](https://docs.claude.com/en/docs/claude-code/hooks) | ADR-0230

---

## Skills vs Agents (Official Claude Code Behavior)

**Per [official Anthropic documentation](https://code.claude.com/docs/en/skills):**

> "Claude uses skills when relevant, or you can invoke one directly with `/skill-name`."

### How Skills Work (Two Mechanisms)

**1. Auto-Activation (Primary)**: Skills auto-activate when their description keywords match user's request.
**2. Explicit Invocation (Fallback)**: Use Skill tool when auto-activation doesn't trigger.

```
User: "Create a React dashboard with Stripe checkout"
      ↓
Auto-activation checks skill descriptions for:
  - "React", "dashboard" → sw-frontend:frontend-architect
  - "Stripe", "checkout" → sw-payments:stripe-integration
      ↓
If skills load automatically → great!
If NOT → invoke via Skill tool as fallback
```

### When to Use Skill Tool Explicitly

**Use Skill tool when:**
- Auto-activation didn't trigger (skill didn't load)
- You need a specific skill immediately
- Hook instructions say "SKILL FIRST"
- Complex multi-domain requests (invoke multiple skills)

**Don't force Skill tool when:**
- Skill already auto-activated (descriptions matched)
- Simple requests that don't need specialized expertise

### Plugin Skills Reference

**⚠️ These are EXAMPLES - use ANY skill that matches the task!**

New plugins add more skills. Custom user skills are equally valid. To discover all available skills: `/plugin list` or ask "What skills are available?"

**Common Skills (non-exhaustive):**

| Domain | Example Skill | Auto-Activates On |
|--------|--------------|-------------------|
| **Frontend** | `sw-frontend:frontend-architect` | React, Vue, Next.js, dashboard, UI |
| **Backend .NET** | `sw-backend:dotnet-backend` | .NET, C#, ASP.NET, EF Core, Web API |
| **Database** | `sw-backend:database-optimizer` | SQL, database, query optimization |
| **Payments** | `sw-payments:stripe-integration` | Stripe, checkout, payment, subscription |
| **Kubernetes** | `sw-k8s:kubernetes-architect` | K8s, EKS, AKS, GKE, pods, helm |
| **DevOps** | `sw-infra:devops` | Terraform, Docker, CI/CD, AWS, Azure |
| **Mobile** | `sw-mobile:mobile-architect` | React Native, iOS, Android |
| **Testing** | `sw-testing:qa-engineer` | E2E, Playwright, Vitest, Jest |
| **ML/AI** | `sw-ml:ml-engineer` | ML, model, training, PyTorch |
| **Architecture** | `sw:architect` | architecture, system design, ADR |
| **Security** | `sw:security` | security, OWASP, vulnerabilities |
| **TDD** | `sw:tdd-orchestrator` | TDD, test-driven, red-green-refactor |
| **LSP** | `csharp-lsp`, `typescript-lsp`, etc. | After code generation (always!) |

**Plus any skills from:**
- Newly installed plugins
- Custom user skills in `.claude/skills/`
- Project-specific skills

### Usage Pattern

```typescript
// Scenario 1: Auto-activation works (most cases)
// User says: "Design the auth architecture"
// → sw:architect auto-loads via keyword "architecture"
// → Just respond with architectural guidance

// Scenario 2: Auto-activation didn't trigger
// User says: "Build .NET API" but skill didn't load
// → Explicitly invoke:
Skill({ skill: "sw-backend:dotnet-backend", args: "Build API..." })

// Scenario 3: Multi-domain request (invoke both)
// User says: "React dashboard with Stripe"
Skill({ skill: "sw-frontend:frontend-architect", args: "dashboard" })
Skill({ skill: "sw-payments:stripe-integration", args: "Stripe" })
```

### Troubleshooting Auto-Activation

If skills don't auto-activate:
1. Check skill description includes keywords user would naturally say
2. Verify skill appears in `/plugin list`
3. Try rephrasing request to match description
4. **Fallback**: Invoke directly with `Skill({ skill: "name" })`

### When to Use What

| Scenario | Approach |
|----------|----------|
| Domain work (React, .NET, Stripe) | Let auto-activate, Skill tool if not |
| Architecture, security review | Usually auto-activates on keywords |
| Hook says "SKILL FIRST" | **Always** use Skill tool explicitly |
| **Code quality (LSP)** | **ALWAYS invoke after code generation** (csharp-lsp, typescript-lsp, etc.) |
| Increment planning | Use PM/Architect skills for spec/plan refinement |
| External syncs | Commands: `/sw-github:sync` |
| Codebase exploration | Task tool: `subagent_type: "Explore"` |
| Complex planning | Task tool: `subagent_type: "Plan"` |

**CRITICAL**: LSP skills (csharp-lsp, typescript-lsp, python-lsp) should be invoked after ANY code generation to validate quality, detect issues, and ensure best practices.

**Reference**: See `plugins/PLUGINS-INDEX.md` for full plugin catalog with triggers.

---

## Secrets & Service Integration Check (MANDATORY)

**BEFORE using CLI tools that require authentication (gh, jira, az, etc.), ALWAYS check for existing configuration:**

1. **Check `.env` file** for tokens/credentials:
   ```bash
   # Look for relevant tokens before running CLI commands (presence only!)
   grep -qE "(GITHUB_TOKEN|GH_TOKEN|JIRA_|AZURE_DEVOPS_|ADO_)" .env 2>/dev/null && echo "Credentials found"
   ```

2. **Check `.specweave/config.json`** for service configuration:
   ```bash
   # Check sync configuration
   cat .specweave/config.json | grep -A 10 '"sync"'
   ```

3. **Check project-specific config files**:
   - `.github/` for GitHub Actions secrets references
   - `package.json` for repository URLs
   - `.specweave/config.json` for external tool settings

**Common patterns**:
```bash
# GitHub - check if already authenticated
gh auth status

# JIRA - check configured domain (presence only - never display values!)
grep -q JIRA .env && echo "JIRA config in .env"
cat .specweave/config.json | grep -A5 '"jira"'

# Azure DevOps - check org/project (presence only!)
grep -qE "(ADO_|AZURE_DEVOPS)" .env && echo "ADO config in .env"
cat .specweave/config.json | grep -A5 '"ado"'
```

**Rule**: NEVER assume CLI tools are unconfigured. Check first, then use existing credentials.

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

### Task Format
```markdown
### T-001: Task Title
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
```

### spec.md Format
```markdown
---
increment: 0001-feature-name
title: "Feature Title"
---
### US-001: Feature Name
**Project**: my-project
**As a** user, I want...
```

### GitHub Issue Format
**ONLY**: `[FS-XXX][US-YYY] User Story Title`

### ADR Naming
**Format**: `XXXX-decision-title.md` (4-digit, NO `adr-` prefix)
**Location**: `.specweave/docs/internal/architecture/adr/`

### External Increment E-Suffix
```
✅ 0111E-dora-metrics-fix (external GitHub issue)
❌ 0111-dora-metrics-fix  (missing E suffix for external)
```

---

## Commands

```bash
# Core workflow
/sw:increment "feature"    # Plan new increment
/sw:do                     # Execute tasks
/sw:auto                   # Autonomous execution
/sw:done 0002              # Close (validates gates)
/sw:progress               # Show status
/sw:next                   # Smart transition (auto-close + suggest)

# Quality & validation
/sw:validate 0001          # Validate increment
/sw:qa 0001                # Quality assessment
/sw:judge-llm 0001         # LLM-as-Judge validation

# Status & sync
/sw:status                 # All increments overview
/sw:sync-progress          # Full sync
/sw:context "auth"         # Load living docs context
/sw:save                   # Smart git commit & push
```

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
| **Skills** | **ALWAYS use when available** (PM, Architect, LSP, domain skills) |
| **LSP** | **MANDATORY after code generation** (csharp-lsp, typescript-lsp, etc.) |
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
