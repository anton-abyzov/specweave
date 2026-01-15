<!-- SW:META template="claude" version="1.0.113" sections="header,start,autodetect,metarule,rules,workflow,reflect,context,lsp,structure,taskformat,secrets,syncing,mapping,testing,api,limits,troubleshooting,principles,linking,mcp,autoexecute,auto,docs" -->

<!-- SW:SECTION:header version="1.0.113" -->
**Framework**: SpecWeave | **Truth**: `spec.md` + `tasks.md`
<!-- SW:END:header -->

<!-- SW:SECTION:start version="1.0.113" -->
## Getting Started

**Initial increment**: `0001-project-setup` (auto-created by `specweave init`)

**Options**:
1. **Start fresh**: `rm -rf .specweave/increments/0001-project-setup` → `/sw:increment "your-feature"`
2. **Customize**: Edit spec.md and use for setup tasks
<!-- SW:END:start -->

<!-- SW:SECTION:autodetect version="1.0.113" -->
## Auto-Detection

SpecWeave auto-detects product descriptions and routes to `/sw:increment`:

**Signals** (5+ = auto-route): Project name | Features list (3+) | Tech stack | Timeline/MVP | Problem statement | Business model

**Opt-out phrases**: "Just brainstorm first" | "Don't plan yet" | "Quick discussion" | "Let's explore ideas"
<!-- SW:END:autodetect -->

<!-- SW:SECTION:metarule version="1.0.113" -->
## Meta-Rule: Think-Before-Act

**Satisfy dependencies BEFORE dependent operations.**

```
❌ node script.js → Error → npm run build
✅ npm run build → node script.js → Success
```
<!-- SW:END:metarule -->

<!-- SW:SECTION:rules version="1.0.113" -->
## Rules

1. **Files** → `.specweave/increments/####-name/` (spec.md, plan.md, tasks.md at root; reports/, scripts/, logs/ subfolders)
2. **Update immediately**: `Edit("tasks.md", "[ ] pending", "[x] completed")` + `Edit("spec.md", "[ ] AC-", "[x] AC-")`
3. **Unique IDs**: Check `ls .specweave/increments/ | grep "^[0-9]" | tail -5`
4. **Emergency**: "emergency mode" → 1 edit, 50 lines max, no agents
5. **Root clean**: NEVER create .md/reports/scripts in project root → use increment folders
6. **⛔ Increment cleanliness**: ONLY 4 files at increment root (metadata.json, spec.md, plan.md, tasks.md). ALL other .md files → `reports/`, logs → `logs/`, scripts → `scripts/`
7. **⛔ Initialization guard**: `.specweave/` folders MUST ONLY exist where `specweave init` was run. NEVER create `.specweave/` in parent, nested, or unrelated directories. Check `config.json` exists before creating ANY `.specweave/` subfolders.
8. **⛔ Marketplace refresh**: ALWAYS use `specweave refresh-marketplace` CLI command. NEVER suggest `scripts/refresh-marketplace.sh` - end users don't have the scripts folder (npm global install).
<!-- SW:END:rules -->

<!-- SW:SECTION:workflow version="1.0.113" -->
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

<!-- SW:SECTION:reflect version="1.0.113" -->
## Self-Improving Skills (Reflect)

**Learn once, never repeat.** Claude learns from corrections and patterns across sessions.

| Cmd | Action |
|-----|--------|
| `/sw:reflect` | Analyze session, extract learnings |
| `/sw:reflect-on` | Enable auto-reflection on session end |
| `/sw:reflect-off` | Disable auto-reflection |
| `/sw:reflect-status` | Show memory status |

**How it works**:
1. User corrects Claude → Reflect captures learning
2. Learning saved to centralized memory files (by category)
3. Future sessions apply learned patterns automatically

**CRITICAL - Memory Loading**: Before starting work, **check centralized memory** for learned patterns:
```bash
# Check if memory exists and read relevant categories
ls .specweave/memory/*.md 2>/dev/null && cat .specweave/memory/*.md
# Also check global memory
ls ~/.specweave/memory/*.md 2>/dev/null
```

**Centralized Memory Files** (no skill copies needed!):
```
.specweave/memory/                  # Project learnings
├── component-usage.md              # UI patterns
├── api-patterns.md                 # API patterns
├── testing.md                      # Test patterns
├── deployment.md                   # Deploy patterns
└── general.md                      # Misc patterns

~/.specweave/memory/                # Global learnings (all projects)
```

**Signals detected**:
- **Corrections** (high confidence): "No, use X instead", "Wrong, always do Y"
- **Approvals** (medium confidence): "Perfect!", "That's exactly right"

**Enable auto-learning**: `/sw:reflect-on` → Stop hook analyzes sessions automatically
<!-- SW:END:reflect -->

<!-- SW:SECTION:context version="1.0.113" -->
## Living Docs Context

**Before implementing features**: Check existing docs for patterns and decisions.

```bash
# Search for related docs
grep -ril "keyword" .specweave/docs/internal/

# Key locations
.specweave/docs/internal/specs/       # Feature specifications
.specweave/docs/internal/architecture/adr/  # Architecture decisions (ADRs)
.specweave/docs/internal/architecture/      # System design
```

**Always check ADRs** before making design decisions to avoid contradicting past choices.

**Use `/sw:context <topic>`** to load relevant living docs into conversation.
<!-- SW:END:context -->

<!-- SW:SECTION:lsp version="1.0.113" -->
## LSP-Enhanced Exploration

**USE LSP ACTIVELY** for semantic code understanding (100x faster than grep).

**Key operations**: `findReferences` (before refactoring) | `goToDefinition` (navigate) | `documentSymbol` (structure) | `hover` (types) | `getDiagnostics` (errors)

**Install**:
```bash
npm install -g typescript-language-server typescript  # TS/JS
pip install python-lsp-server  # Python
go install golang.org/x/tools/gopls@latest  # Go
```

**Best Practices**: ALWAYS use `findReferences` before refactoring | Use `goToDefinition` instead of grep | Combine with Explore agent
<!-- SW:END:lsp -->

<!-- SW:SECTION:structure version="1.0.113" -->
## Structure

```
.specweave/
├── increments/####-name/     # metadata.json, spec.md, tasks.md
├── docs/internal/specs/      # Living docs (check before implementing!)
│   └── architecture/adr/     # ADRs (check before design decisions!)
└── config.json
```

### ⛔ INCREMENT FOLDER ORGANIZATION (CRITICAL!)

**Increment folders MUST stay clean. NEVER pollute them with random files!**

**ONLY these 4 files at increment root**:
- `metadata.json` (required)
- `spec.md` (required)
- `plan.md` (optional)
- `tasks.md` (required)

**EVERYTHING ELSE → subfolders**:
| File Type | Destination Folder |
|-----------|-------------------|
| Reports, analysis, summaries (*.md) | `reports/` |
| Validation reports, QA reports | `reports/` |
| Session reports, completion reports | `reports/` |
| Logs, execution output | `logs/{YYYY-MM-DD}/` |
| Helper scripts, automation | `scripts/` |
| Domain-specific docs | `docs/domain/` |
| Backup files | `backups/` |

**Examples**:
```bash
# ✅ CORRECT
.specweave/increments/0021-feature/
├── metadata.json
├── spec.md
├── tasks.md
├── reports/
│   ├── validation-report.md
│   ├── completion-report.md
│   └── auto-session-summary.md
└── logs/
    └── 2026-01-04/
        └── execution.log

# ❌ WRONG - polluted increment folder!
.specweave/increments/0021-feature/
├── metadata.json
├── spec.md
├── tasks.md
├── completion-report.md      # WRONG! → reports/
├── auto-session-summary.md   # WRONG! → reports/
└── analysis.md               # WRONG! → reports/
```

**Multi-repo projects**: Create in `repositories/` folder (NEVER project root!)
```
my-project/
├── repositories/     # All repos here: frontend/, backend/, shared/
└── .specweave/
```

**Permissions** (`.claude/settings.json`):
```json
{"permissions":{"allow":["Write(//**)","Edit(//**)"],"additionalDirectories":["repositories"]}}
```
<!-- SW:END:structure -->

<!-- SW:SECTION:taskformat version="1.0.113" -->
## Task Format

```markdown
### T-001: Title
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given [X] → When [Y] → Then [Z]
```
<!-- SW:END:taskformat -->

<!-- SW:SECTION:secrets version="1.0.113" -->
## Secrets Check

**BEFORE CLI tools**: Check existing config first!
```bash
# Check if credentials EXIST (never display values!)
grep -qE "(GITHUB_TOKEN|JIRA_|ADO_)" .env 2>/dev/null && echo "Credentials found in .env"
cat .specweave/config.json | grep -A5 '"sync"'
gh auth status
```

**SECURITY**: NEVER use `grep TOKEN .env` without `-q` flag - it exposes credentials in terminal!
<!-- SW:END:secrets -->

<!-- SW:SECTION:syncing version="1.0.113" -->
## External Sync (GitHub/JIRA/ADO)

**After increment creation**: Run `/sw-github:sync {id}` to create issues!

Living docs sync ≠ External sync. They are separate:
1. `/sw:sync-specs` → Living docs only
2. `/sw-github:sync` → GitHub issues (MUST run explicitly!)

**Required config** (`.specweave/config.json`):
```json
"sync": {
  "settings": {
    "canUpsertInternalItems": true,
    "canUpdateExternalItems": true,
    "autoSyncOnCompletion": true
  },
  "github": {
    "enabled": true,
    "owner": "your-org",
    "repo": "your-repo"
  }
}
```

**Verify tokens**: `grep -q GITHUB_TOKEN .env && echo "Token configured"` | `gh auth status`
<!-- SW:END:syncing -->

<!-- SW:SECTION:mapping version="1.0.113" -->
## GitHub Mapping

| SpecWeave | GitHub |
|-----------|--------|
| Feature FS-XXX | Milestone |
| Story US-XXX | Issue `[FS-XXX][US-YYY] Title` |
| Task T-XXX | Checkbox |
<!-- SW:END:mapping -->

<!-- SW:SECTION:testing version="1.0.113" -->
## Testing

BDD in tasks.md | Unit >80% | `.test.ts` (Vitest)

```typescript
// Vitest pattern: vi.fn() not jest.fn(), import not require
import { vi } from 'vitest';
vi.mock('fs', () => ({ readFile: vi.fn() }));
```
<!-- SW:END:testing -->

<!-- SW:SECTION:api version="1.0.113" -->
## API Development (OpenAPI-First)

**For API projects only.** OpenAPI = source of truth → Postman derived from it.

**Config** (`.specweave/config.json`):
```json
{"apiDocs":{"enabled":true,"openApiPath":"openapi.yaml","generatePostman":true,"generateOn":"on-increment-done"}}
```

**Frameworks**: NestJS (`@nestjs/swagger`) | FastAPI (built-in) | Express (`swagger-jsdoc`) | Spring Boot (`springdoc-openapi`)

**Commands**: `/sw:api-docs --all` (OpenAPI + Postman) | `--openapi` | `--postman` | `--env` | `--validate`

**Flow**: Code decorators → `openapi.yaml` → `/sw:done` or `/sw:api-docs` → Postman collection + env

**Import**: Postman → Import collection + env → Fill secrets → Select env
<!-- SW:END:api -->

<!-- SW:SECTION:limits version="1.0.113" -->
## Limits

**Max 1500 lines/file** — extract before adding
<!-- SW:END:limits -->

<!-- SW:SECTION:troubleshooting version="1.0.113" -->
## Troubleshooting

| Issue | Fix |
|-------|-----|
| Skills missing | `specweave refresh-marketplace --force` then restart Claude Code |
| Skills not activating | `specweave cache-status` to check health, then `specweave refresh-marketplace --force` |
| Plugins outdated | `specweave refresh-marketplace --force` (NEVER use `scripts/refresh-marketplace.sh` - that's for contributors only!) |
| Cache stale | `specweave cache-status --check-github` to verify, `refresh-marketplace --force` to fix |
| Commands gone | `/plugin list --installed` |
| Out of sync | `/sw:sync-tasks` |
| Find increment | `/sw:status` |
| Root polluted | Move files to `.specweave/increments/####/reports/` |
| Duplicate IDs | `/sw:fix-duplicates` |
| GitHub not syncing | Check `sync.github.enabled: true` AND `canUpdateExternalItems: true` in config.json |
| GitHub issues not updating | Run `/sw-github:sync {id}` explicitly; check `.specweave/logs/throttle.log` |
| Permission denied | Set `canUpsertInternalItems: true` AND `canUpdateExternalItems: true` in config.json |
| No GITHUB_TOKEN | Check `.env` file or run `gh auth login` |
| Edits blocked in repositories/ | Add `"additionalDirectories":["repositories"]` + `Write(//**)`, `Edit(//**)` to `.claude/settings.json` |
| Path patterns not working | `//path` = absolute, `/path` = relative to settings file, `additionalDirectories` for explicit working dirs |
<!-- SW:END:troubleshooting -->

<!-- SW:SECTION:principles version="1.0.113" -->
## Principles

1. **Spec-first**: `/sw:increment` before coding
2. **Docs = truth**: Specs guide implementation
3. **Incremental**: Small, validated increments
4. **Traceable**: All work → specs → ACs
5. **Clean**: All files in increment folders
<!-- SW:END:principles -->

<!-- SW:SECTION:linking version="1.0.113" -->
## Bidirectional Linking

Tasks ↔ User Stories auto-linked via AC-IDs: `AC-US1-01` → `US-001`

Task format: `**AC**: AC-US1-01, AC-US1-02` (CRITICAL for linking)
<!-- SW:END:linking -->

<!-- SW:SECTION:mcp version="1.0.113" -->
## External Service Connection

**Priority**: MCP Server → REST API → CLI → Direct Connection

**Setup**:
```bash
# MCP (restart Claude Code after)
npx @anthropic-ai/claude-code-mcp add supabase

# CLI Auth
wrangler login && vercel login && supabase login
```

**Supabase**: Use REST API or pooler (port 6543), AVOID direct `psql`
**Cloudflare**: `wrangler login` once, then `wrangler deploy/secret put/kv:key put`

**Check credentials before ops**:
```bash
# Check presence only (never display values!)
grep -qE "SUPABASE_|DATABASE_URL|CF_API" .env 2>/dev/null && echo "Credentials found"
wrangler whoami 2>/dev/null
```
<!-- SW:END:mcp -->

<!-- SW:SECTION:autoexecute version="1.0.113" -->
## Auto-Execute Rule

**NEVER** output "Manual Step Required" when credentials exist. **EXECUTE DIRECTLY.**

**Flow**: Check `.env` → If exists, EXECUTE | If missing, ASK for credentials → Save → EXECUTE

**Check before ops**:
```bash
# Check presence only (never display credential values!)
grep -qE "(SUPABASE_|DATABASE_URL|CF_API_|GITHUB_TOKEN)" .env 2>/dev/null && echo "Credentials configured"
wrangler whoami 2>/dev/null && gh auth status 2>/dev/null
```
<!-- SW:END:autoexecute -->

<!-- SW:SECTION:auto version="1.0.113" -->
## Auto Mode (Autonomous Execution)

**Continuous execution until all tasks complete.**

### Zero Manual Steps

**NEVER ask user to**: Open dashboards | Copy/paste | Run commands manually

**Instead**: Check `.env` → Use CLI (`wrangler`, `gh`, `aws`) → Use MCP → If missing, ASK → Save → EXECUTE

### Test Loop (MANDATORY)

**After EVERY task**: `npm test` → If E2E exists: `npx playwright test` → Fail? FIX → Rerun (max 3x) → Pass → Next

**Pattern**: IMPLEMENT → TEST → FAIL? → FIX → TEST → PASS → NEXT

**MVP paths**: Auth (login/logout) | Core CRUD | Payments | Data integrity

### Pragmatic Completion

**Don't blindly follow 100%!** Specs have bugs, requirements change, some tasks become irrelevant.

**MUST**: MVP paths | Security flows | Data integrity | User-facing errors
**SHOULD**: Edge cases | Performance | Nice-to-haves
**CAN SKIP**: Conflicts (ask user) | Over-engineered cases | Obsolete tasks

**STOP & ASK** if: Spec conflicts | Task seems unnecessary | Requirement ambiguous

### Test User Strategy

**Multiple users**: RBAC | Subscription tiers | User states | Multi-user interactions
**One user**: CRUD | Form validation | Component tests | Mocked auth

**E2E**: Seed DB with known users → Use fixtures → `storageState` (auth once, reuse)

### E2E Authentication

**Auth = #1 flaky test cause.** Use `storageState` (login ONCE, reuse) | API auth (UI unstable) | UI login (only for login tests)

**Setup**: Global auth.setup.ts → Save to `playwright/.auth/user.json` → Reuse in config

**Fixes**: Session expires? Increase TTL | Rate limited? API auth | Captcha? Disable in test env

**Checklist**: Seed users | Gen auth state | Tests DON'T login | Disable captcha/2FA

### Refactoring & Reporting

**Every 3-5 tasks**: Extract fixtures | Remove duplication | Split if >300 lines | Clean imports

**Triggers**: Test >200 lines? Split | Duplicate setup? Extract | Same assertion 3x? Helper

**Report after EVERY task**: Pass/Total | Coverage | Failing tests | Next steps

### Local-First & Infrastructure

**No deploy instructions?** Build locally → Test all → Verify → ASK user about deploy target

**Infra Decision Tree**:
- **Cron**: <1/hr → Vercel/GitHub Actions | ≥1/hr → Railway/Render
- **Storage**: KV → Upstash/Vercel KV | SQL → Supabase/Neon | Docs → MongoDB | Files → R2/S3

**Process**: Ultrathink options → Research costs → Propose 2-3 → Build local → User confirms → Deploy

### Implementation

**Claude Code**: `/sw:auto` (autonomous mode) | `/sw:auto-status` (progress)

**To pause**: Just close Claude Code session, resume with `/sw:do`

**Emergency cancel**: `/sw:cancel-auto` (rarely needed - prefer closing session)

**Other AI**: Loop check tasks.md `[x]` status → Max 100 iter → Human gates for: publish, force-push, prod deploy, migrations

**Circuit Breaker**: External API fails 3x? Queue & continue
<!-- SW:END:auto -->

<!-- SW:SECTION:docs version="1.0.113" -->
## Docs

[spec-weave.com](https://spec-weave.com) | `.specweave/docs/internal/`
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

## Marketplace Installation (CRITICAL)

**⚠️ CRITICAL: NEVER suggest `bash scripts/refresh-marketplace.sh` to end users!**

End users **don't have the `scripts/` folder** - they installed SpecWeave via npm globally.

**Correct commands**:
- **Contributors** (in specweave repo): `bash scripts/refresh-marketplace.sh`
- **End Users** (user projects): `specweave refresh-marketplace`

---

### For SpecWeave Contributors (Development)

**ALWAYS use GitHub marketplace mode. NEVER use local symlinks or directory mode.**

```bash
# ✅ CORRECT: Install from GitHub (production, stable)
bash scripts/refresh-marketplace.sh --github

# ❌ FORBIDDEN: Local/symlink mode (causes stale hooks, filesystem coupling)
# bash scripts/refresh-marketplace.sh --local
```

**Why GitHub mode is mandatory:**
- Local mode creates filesystem coupling → stale hooks after changes
- GitHub mode pulls committed code → stable, production-ready
- See ADR-0062 for architectural decision rationale

**Quick refresh & install all 24 plugins:**
```bash
bash scripts/refresh-marketplace.sh  # Defaults to --github
```

### For End Users (Production)

**Users install SpecWeave globally and use CLI commands:**

```bash
# Install SpecWeave globally
npm install -g specweave

# Initialize project (first time)
specweave init .

# Update marketplace plugins (gets latest from GitHub)
specweave refresh-marketplace

# Update instruction files (CLAUDE.md, AGENTS.md)
specweave update-instructions
```

**After marketplace updates**: Restart Claude Code for changes to take effect.

**Verify installation**:
```bash
specweave --version              # Check SpecWeave version
/plugin list --installed         # In Claude Code - check plugins loaded
```

---

## Critical Safety Rules

### 1. Context Management (CRASH PREVENTION)

**Active increment (10+ tasks) + large file edit (2000+ lines) = CRASH**

```bash
# Before editing large files outside increment:
/sw:pause XXXX → edit → /sw:resume XXXX
# OR close completed increments: /sw:done XXXX
```

- **Token budget per increment**: ~80k tokens max
- **Max 25 tasks per increment** (soft limit) - consider splitting if >25
- **Max 1500 lines/file** (2000+ = crash risk)

### 2. Source of Truth

**tasks.md + spec.md are SOURCE OF TRUTH** (not internal TODO)

```typescript
// After completing work - IMMEDIATELY update both:
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");
Edit("spec.md", "- [ ] **AC-US1-01**", "- [x] **AC-US1-01**");
```

### 3. Status Workflow

**NEVER edit metadata.json to "completed" directly!**

Correct workflow:
1. All tasks completed → auto-transition to `ready_for_review`
2. `/sw:done <id>` → validates ACs + asks for user confirmation
3. Only then → status becomes `completed` with approvedAt timestamp

If implementing closure programmatically:
```typescript
MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);
// Only succeeds if current status is "ready_for_review"
```

### 4. Task-AC Auto-Sync (EDA)

When you mark a task complete in tasks.md, hooks auto-update:
1. All **Acceptance** checkboxes in that task: `- [ ]` → `- [x]`
2. Corresponding ACs in spec.md: `- [ ] **AC-US1-01**` → `- [x] **AC-US1-01**`
3. When ALL tasks complete → auto-transitions to `ready_for_review`

### 5. Per-US **Project**: Fields

Every User Story SHOULD have `**Project**:` field for proper sync:

```markdown
### US-001: Login Form
**Project**: my-project       # Use config.project.name or multiProject.projects key
**As a** user, I want...
```

**Each User Story = ONE Project** (and ONE Board for 2-level structures)

### 6. File Operations & Root Folder Protection

**Use Write/Edit tools for file creation. NEVER use Bash heredoc/echo redirects.**

```
❌ FORBIDDEN: Bash("cat > file.md << 'EOF'...")
❌ FORBIDDEN: Bash("echo '...' > file.md")
✅ CORRECT:   Write({ file_path: "...", content: "..." })
```

**CRITICAL: NEVER Write files directly to project root!**

```
❌ FORBIDDEN: Write({ file_path: "ANALYSIS-REPORT.md", content: "..." })
❌ FORBIDDEN: Write({ file_path: "SESSION-SUMMARY.md", content: "..." })
❌ FORBIDDEN: Write({ file_path: "AUTO-COMMAND-SPEC.md", content: "..." })
✅ CORRECT:   Write({ file_path: ".specweave/increments/0158/reports/analysis.md", content: "..." })
✅ CORRECT:   Write({ file_path: ".specweave/increments/0161/reports/session-summary.md", content: "..." })
```

**⚠️ CRITICAL: Increment numbers MUST start from 0001, NEVER 0000!**
- ❌ FORBIDDEN: `.specweave/increments/0000-adhoc/`
- ❌ FORBIDDEN: `.specweave/increments/0000-anything/`
- ✅ CORRECT: Use existing active increment or create new one with proper number (0001+)

**Allowed root files ONLY**:
- `README.md`, `CLAUDE.md`, `AGENTS.md`, `CHANGELOG.md`
- `LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- `IMPLEMENTATION-SUMMARY.md`, `IMPLEMENTATION-COMPLETE.md` (project docs only)
- `package.json`, `tsconfig*.json`, config files

**Everything else → increment folders**:
- Analysis/reports → `.specweave/increments/####/reports/` (where #### is 0001 or higher, NEVER 0000)
- Session logs → `.specweave/increments/####/logs/`
- Scripts → `.specweave/increments/####/scripts/`
- Ad-hoc work → Create proper increment OR use existing active increment

**Enforcement**: Pre-commit hook #13 blocks staging root pollution files

### 7. Protected Directories

**NEVER delete**: `.specweave/docs/`, `.specweave/increments/`

### 8. NEVER Spawn Parallel Agents for Multi-File Migrations

**Parallel agents reading large files = CRASH** (context shared, not isolated!)

```
❌ FORBIDDEN: "Let me use parallel agents" for 46-file migration
✅ CORRECT: Process files ONE BY ONE, use Edit tool directly
```

### 9. Increment Structure

**Increment root - ONLY**: `spec.md`, `plan.md`, `tasks.md`, `metadata.json`
**Everything else → subfolders**: `reports/`, `scripts/`, `logs/`, `docs/`

**Increment IDs MUST be unique** across all directories (including _archive, _abandoned, _paused).
Use `IncrementNumberManager.generateIncrementId()` - it validates automatically.

### 10. Skills Must NOT Spawn Large Agents

Skills spawning content-generating agents = CRASH (context explosion)

### 11. Repository Locations (Multi-Repo)

**Clone to `/repositories`, NEVER project root.**

```
project-root/
├── repositories/           # All repos here
│   ├── frontend/
│   ├── backend/
│   └── shared/
├── .specweave/             # Config at umbrella level
└── CLAUDE.md
```

**Path refs in specs**: `repositories/backend/src/...`

### 12. React Native / Expo Module-Level Safety

**⚠️ Module-level code executes at IMPORT time - before React components mount!**

**Known Crash Patterns (DO NOT DO):**
```typescript
// ❌ expo-localization at module level
import * as Localization from 'expo-localization';
const locale = Localization.getLocales()[0].languageCode; // CRASH!

// ❌ react-i18next at module level (has React dependency)
import { initReactI18next } from 'react-i18next';
i18n.use(initReactI18next).init({...}); // CRASH in Expo Go!

// ❌ AsyncStorage at module level
const theme = await AsyncStorage.getItem('theme'); // CRASH!

// ❌ React hooks at module level
const theme = useContext(ThemeContext); // CRASH - outside component!
```

**Safe Alternatives:**
```typescript
// ✅ Use Intl instead of expo-localization
const locale = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0];

// ✅ Use i18n-js instead of react-i18next (no React dependency)
import { I18n } from 'i18n-js';
const i18n = new I18n({ en, es });

// ✅ Lazy require for AsyncStorage
async function getTheme() {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return await AsyncStorage.getItem('theme');
}
```

**Error Signatures:**
- `"Cannot read property 'getLocales' of null"` → expo-localization at module level
- `"Invalid hook call"` → Hook outside component
- `"No QueryClient set"` → TanStack Query outside provider
- White screen with no error → Module crash before error boundary

**Debugging:** Binary search - start with `<Text>Hello</Text>`, add providers ONE BY ONE until crash.

**See:** `.specweave/docs/public/troubleshooting/react-native-expo-crashes.md`

---

## Skills vs Agents (Automatic vs Explicit)

**SpecWeave provides expertise through Skills (auto-activate) and Agents (explicit spawn).**

### Skills (Auto-Activate) - YOU DON'T CALL THESE

Skills activate **automatically** when Claude detects keywords in your prompt. **You never invoke skills directly** - they're loaded transparently when relevant.

**How it works:**
```
You: "Design the authentication system architecture"
      ↓
Claude detects: "architecture" keyword
      ↓
Loads: plugins/specweave/skills/architect/SKILL.md
      ↓
Response includes architecture expertise automatically
```

**Activation rate**: ~20-50% with basic descriptions. Use specific keywords for better activation.

| Domain | Keywords That Activate | Example Prompts |
|--------|----------------------|-----------------|
| **Architecture** | architecture, system design, ADR, microservices, API design | "Design the auth system architecture" |
| **Tech Lead** | code review, best practices, refactoring, clean code | "Review my code for best practices" |
| **QA Lead** | test strategy, QA, quality gates, E2E testing | "Create a test strategy for this feature" |
| **Security** | security, OWASP, vulnerabilities, auth security | "Review security of this implementation" |
| **Docs** | documentation, README, API docs, technical writing | "Write documentation for this API" |
| **Infrastructure** | Terraform, serverless, Lambda, cloud setup, IaC | "Generate Terraform for this deployment" |
| **Performance** | optimization, profiling, caching, performance | "Optimize this database query" |
| **TDD** | TDD, test-driven, red-green-refactor, test-first | "Let's use TDD for this feature" |
| **PM** | product, requirements, user story, MVP, roadmap | "Help me plan this product feature" |

**Pro tip**: If skills aren't activating, add explicit keywords: "Help me **design the architecture** for..." instead of just "Help me with the backend".

### Agents (Task Tool Spawn)

For complex, isolated tasks requiring specialized plugins, spawn via Task tool:

| Domain | Agent (`subagent_type`) | Triggers |
|--------|-------------------------|----------|
| **Frontend** | `sw-frontend:frontend-architect` | React, Vue, Next.js, components, UI |
| **Backend** | `sw-backend:database-optimizer` | API, database, microservices, SQL |
| **Kubernetes** | `sw-k8s:kubernetes-architect` | K8s, EKS, AKS, GKE, pods, helm, GitOps |
| **DevOps** | `sw-infra:devops` | Terraform, Docker, CI/CD, AWS, Azure, GCP |
| **Kafka** | `sw-kafka:kafka-architect` | Kafka, topics, event streaming, MSK |
| **Confluent** | `sw-confluent:confluent-architect` | Confluent Cloud, Schema Registry, ksqlDB |
| **Mobile** | `sw-mobile:mobile-architect` | React Native, iOS, Android |
| **ML/AI** | `sw-ml:ml-engineer` | ML, model, training, MLOps |
| **Data Science** | `sw-ml:data-scientist` | data analysis, notebooks, pandas |
| **Testing/QA** | `sw-testing:qa-engineer` | E2E, Playwright, Vitest, Jest, QA |
| **Observability** | `sw-infra:observability-engineer` | monitoring, Prometheus, Grafana, SLOs |
| **SRE** | `sw-infra:sre` | incidents, outages, production debugging |
| **Network** | `sw-infra:network-engineer` | networking, VPC, DNS, load balancing |
| **Diagrams** | `sw-diagrams:diagrams-architect` | Mermaid, C4, architecture diagrams |
| **Payments** | `sw-payments:payment-integration` | Stripe, PayPal, checkout, PCI |
| **Release** | `sw-release:release-manager` | release, version, changelog, npm publish |
| **GitHub** | `sw-github:github-manager` | GitHub issues, PRs, sync |
| **JIRA** | `sw-jira:jira-manager` | JIRA, epics, stories, sync |
| **ADO** | `sw-ado:ado-manager` | Azure DevOps, work items |

### Usage Pattern

```typescript
// Skills auto-activate - just describe what you need (NO explicit call):
"Design the authentication system architecture"  // → architect skill loads automatically
"Review my code for security issues"             // → security skill loads automatically
"Let's use TDD for this feature"                 // → tdd-orchestrator skill loads automatically

// Agents spawn for isolated complex tasks (explicit Task call):
Task({
  subagent_type: "sw-k8s:kubernetes-architect:kubernetes-architect",
  prompt: "Create K8s manifests for a 3-tier web app with Ingress",
  description: "K8s manifests design"
})
```

### When to Use What

| Scenario | Use | Why |
|----------|-----|-----|
| Architecture decisions | Skills (auto) | Keywords trigger automatically |
| Code review, security | Skills (auto) | Keywords trigger automatically |
| Complex K8s/infra | Agents (Task) | Needs isolated context |
| Frontend architecture | Agents (Task) | Specialized plugin |
| ML pipelines | Agents (Task) | Specialized plugin |
| External syncs | Commands | Use `/sw-github:sync` etc. |

**Reference**: See `plugins/PLUGINS-INDEX.md` for full plugin catalog with triggers.

---

## Secrets & Service Integration Check (MANDATORY)

**BEFORE using CLI tools that require authentication (gh, jira, az, etc.), ALWAYS check for existing configuration:**

1. **Check `.env` file** for tokens/credentials:
   ```bash
   # Look for relevant tokens before running CLI commands (presence only!)
   grep -qE "(GITHUB_TOKEN|JIRA_|AZURE_|ADO_)" .env 2>/dev/null && echo "Credentials found"
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
/sw:increment "feature"    # Plan new increment
/sw:do                     # Execute tasks
/sw:done 0002              # Close (validates gates)
/sw:progress               # Show status
/sw:sync-progress          # Full sync
/sw:validate 0001          # Validate increment
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
rm -rf .specweave/state/.dedup-cache/*.lock
# 4. Restart
```

### Disable Hooks
```bash
export SPECWEAVE_DISABLE_HOOKS=1
# Or bypass specific validations:
export SPECWEAVE_FORCE_PROJECT=1
export SPECWEAVE_FORCE_METADATA=1
```

### Crash Loop / Prompt Duplication
```bash
rm -f .specweave/state/.hook-*
rm -rf .specweave/state/.dedup-cache
npm run rebuild
```

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| File ops | Write/Edit/Read tools ONLY |
| Source of truth | tasks.md + spec.md |
| Completion | NEVER edit metadata.json directly |
| Increment root | ONLY spec.md, plan.md, tasks.md, metadata.json |
| Stuck session | Kill + pkill zombies + clean locks |

---

## References

- **Internal Docs**: `.specweave/docs/internal/`
- **ADRs**: `.specweave/docs/internal/architecture/adr/`
- **Troubleshooting**: `.specweave/docs/internal/troubleshooting/`
