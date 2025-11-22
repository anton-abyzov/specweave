# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: TypeScript CLI (NPM Package)
**Repository**: https://github.com/anton-abyzov/specweave

For **contributors to SpecWeave itself** (not users).

---

## 🚨 CRITICAL SAFETY RULES

### 0. Think-Then-Act Discipline (META RULE!)

**NEVER run commands you know will fail.** Act on reasoning BEFORE execution.

**Common patterns:**
- Running code before compilation → `npm run rebuild` FIRST
- Database queries before migrations/setup
- File ops before directory creation

```typescript
// ❌ WRONG: Attempt → Fail → Fix
node -e "require('./dist/file.js')"  // You knew this would fail!
npm run rebuild

// ✅ CORRECT: Fix → Attempt
npm run rebuild
node -e "require('./dist/file.js')"
```

---

### 1. Local Development Setup

**Standard Workflow** (Cross-platform):

```bash
# Setup
git clone https://github.com/YOUR_USERNAME/specweave.git
cd specweave && npm install && npm run rebuild

# Development Cycle
vim src/core/task-parser.ts
npm run rebuild && npm test
git add . && git commit -m "feat: feature"
git push origin develop
# Wait 5-10s → Claude Code auto-updates marketplace
```

**Testing Unpushed Changes:**
- **Option 1**: Temp branch → push → test → delete
- **Option 2**: Fork-based (`claude plugin marketplace add github:YOUR_USERNAME/specweave`)
- **Option 3**: Symlink (Unix-only, see `.specweave/docs/internal/advanced/symlink-dev-mode.md`)

---

### 2. Increment Folder Structure

**ONLY 4 files in `.specweave/increments/####/` root**: `spec.md`, `plan.md`, `tasks.md`, `metadata.json`

**Everything else → subfolders**: `reports/`, `scripts/`, `logs/`

```bash
# ❌ WRONG: .specweave/increments/0046/analysis-report.md
# ✅ CORRECT: .specweave/increments/0046/reports/analysis-report.md
```

---

### 3. Protected Directories

**Never delete**: `.specweave/docs/`, `.specweave/increments/`

**Pre-commit hook blocks**: Deletion of 50+ files, `rm -rf` on protected dirs

**Recovery**: `git restore .specweave/`

---

### 4. Test Cleanup Safety

**REQUIRED before `rm -rf`**:
1. Verify `pwd` (MUST be project root)
2. Dry-run with `-print` (NO deletion)
3. Count files to delete
4. Manual confirmation
5. Execute → Verify → Run tests

---

### 5. NEVER Use `specweave init . --force`

**Danger**: Deletes ALL increments/docs without backup

**Use**: `specweave init .` (interactive, safe)

---

### 6. Increment Completion

**Always use**: `/specweave:done 0043` (validates ACs, tasks, tests, coverage)

**Never**: Manual `metadata.json` edit (blocked by pre-commit hook)

---

### 7. Source of Truth: tasks.md + spec.md (CRITICAL!)

**THE MOST CRITICAL RULE**: Internal TODO is ephemeral. **tasks.md + spec.md are SOURCE OF TRUTH.**

**MANDATORY workflow:**
```typescript
// 1. Complete work
await createIntegrationTest();

// 2. Update internal TODO
TodoWrite([{task: "T-013", status: "completed"}]);

// 3. IMMEDIATELY update tasks.md (NEVER skip!)
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");

// 4. IMMEDIATELY update spec.md ACs
Edit("spec.md", "- [ ] **AC-US1-01**", "- [x] **AC-US1-01**");
```

**Status Line Sync (Automatic):**
- TodoWrite → `post-task-completion.sh` hook → status line cache updates
- **NEVER** edit tasks.md without TodoWrite (hook won't fire → desync)
- Validation: `/specweave:validate-status`

**GitHub Duplicate Prevention:**
- **ALWAYS** use `DuplicateDetector.createWithProtection()` for GitHub issues
- 3-phase: Detection → Verification → Reflection (auto-close duplicates)
- **NEVER** use `--limit 1` in gh searches (hides duplicates, use `--limit 50`)
- Cleanup: `bash scripts/cleanup-duplicate-github-issues.sh --dry-run`

**Pre-closure validation:**
```bash
grep "^\*\*Status\*\*:" tasks.md | grep -c "\[x\] completed"  # Must equal total_tasks
grep -c "^- \[x\] \*\*AC-" spec.md                            # Must equal total ACs
/specweave:done 0044
```

**Incidents**:
- 2025-11-19 (0044): Internal TODO "completed" while tasks.md showed `[ ] pending`
- 2025-11-20: Status line 10% desync (tasks marked without TodoWrite)
- 2025-11-20: 10+ duplicate GitHub issues (race conditions, --limit 1 bug)

---

### 8. Logger Abstraction (NEVER `console.*`)

**Rule**: ALL `src/` code uses logger injection, NEVER `console.log/error/warn`

```typescript
import { Logger, consoleLogger } from '../../utils/logger.js';

export class MyClass {
  constructor(options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;
  }
}
// In tests: new MyClass({ logger: silentLogger });
```

**Exception - CLI Commands**: `src/cli/commands/*.ts` may use `console.*` with comment:
```typescript
// NOTE: This CLI command is primarily user-facing output (console.log/console.error).
// All console.* calls are legitimate user-facing exceptions as defined in CONTRIBUTING.md.
```

---

### 8a. Native fs (NEVER `fs-extra`)

**Rule**: Use native Node.js `fs`, NEVER `fs-extra`

```typescript
// ✅ CORRECT - Native fs
import { existsSync, readFileSync } from 'fs';
import { promises as fs } from 'fs';
import { mkdirpSync, writeJsonSync } from '../utils/fs-native.js';

// ❌ WRONG: import fs from 'fs-extra';
```

**Migration**: `fs.existsSync → existsSync`, `fs.ensureDir → fs.mkdir(dir, {recursive: true})`, `fs.removeSync → removeSync`

**Prevention**: Pre-commit hook blocks fs-extra imports (bypass: `// legacy fs-extra`)

---

### 9. Coding Standards

**Critical rules (enforced)**:
1. ✅ NEVER `console.*` (use logger)
2. ✅ ALWAYS `.js` extensions in imports
3. ✅ Test files: `.test.ts` (NEVER `.spec.ts`)
4. Avoid `any` type
5. Functions < 100 lines
6. Custom error types
7. Comment "why" not "what"
8. No hardcoded secrets
9. No N+1 queries
10. Naming: camelCase (vars), PascalCase (classes), UPPER_SNAKE_CASE (constants)

**Auto-discovery**: `/specweave:analyze-standards`

---

### 10. GitHub Issue Format (v0.24.0+)

**CRITICAL**: GitHub issues are ONLY created for User Stories, NEVER for Features!

**ONLY Correct Format**: `[FS-XXX][US-YYY] User Story Title`

**Examples**:
```
✅ [FS-048][US-001] Smart Pagination During Init
✅ [FS-048][US-002] CLI-First Defaults
❌ [FS-048]             (Feature-only - USE MILESTONE!)
❌ [SP-FS-048-specweave] (SP prefix - DEPRECATED!)
❌ [FS-048-specweave]   (Project suffix - README.md ONLY, NOT GitHub!)
```

**Architecture** (ADR-0032 Universal Hierarchy Mapping):
```
Feature FS-048 → GitHub Milestone "FS-048: Feature Title"
├─ User Story US-001 → Issue #XXX: [FS-048][US-001] US Title
├─ User Story US-002 → Issue #YYY: [FS-048][US-002] US Title
└─ User Story US-003 → Issue #ZZZ: [FS-048][US-003] US Title
```

**Create issues**:
```bash
# ✅ CORRECT: Creates User Story issues
/specweave-github:sync FS-048

# ❌ WRONG: /specweave:increment does NOT create GitHub issues
```

**If you see Feature-level issues** (`[FS-XXX]` without `[US-YYY]`):
1. Close them immediately with comment explaining the violation
2. Delete any duplicate Feature folders (e.g., FS-050 when FS-048 exists)
3. Use `/specweave-github:sync FS-XXX` to create correct User Story issues
4. **REPORT THE BUG** - this should never happen!

**See**:
- `.specweave/increments/0047-us-task-linkage/reports/FEATURE-LEVEL-GITHUB-SYNC-REMOVAL-PLAN.md`
- `.specweave/increments/0050-*/reports/GITHUB-ISSUE-BUG-ANALYSIS-2025-11-22.md`

---

### 10a. NO Increment-to-Increment References (ADR-0061) ⛔

**CRITICAL ARCHITECTURAL RULE**: Increments NEVER reference other increments!

**The Only Allowed Flow**:
```
INCREMENT (metadata.json: feature_id) → FEATURE → USER STORIES
```

**❌ FORBIDDEN**:
```yaml
# In user story frontmatter
---
id: US-001
feature: FS-048
increments: [0050-external-tool-import]  # ❌ NEVER DO THIS!
---
```

```markdown
# In user story content
Implemented in increment 0050-external-tool-import  ❌ NEVER DO THIS!
```

**✅ CORRECT**:
```yaml
# Increment metadata.json
{
  "feature_id": "FS-048"  ✅ Forward reference only
}

# User story frontmatter
---
id: US-001
feature: FS-048  ✅ No increment reference needed!
---
```

**Why This Matters**:

1. **Hooks Break Without This**: The GitHub sync hook reads increment metadata → finds feature_id → finds all user stories for that feature → creates GitHub issues. If user stories required increment references, this creates circular dependencies and hooks detect 0 specs.

2. **Clean Separation**: Living docs (user stories) are permanent. Increments are temporary implementations. User stories should never know about increments.

3. **Multi-Increment Support**: Multiple increments can implement the same feature (Phase 1a, 1b, 1c). Each auto-syncs ALL user stories without duplication.

**Enforcement**:
- Pre-commit hook validates NO increment references in living docs
- Spec-detector ignores reverse references (defensive)
- **See**: ADR-0061 for complete architectural rationale

**Incident**: 2025-11-22 - Hooks appeared broken (0 specs detected, 0 GitHub issues created) due to old spec-detector logic requiring reverse references. Fixed in v0.24.0+.

---

### 11. Task Format with US Linkage (v0.23.0+)

**Required fields**:
```markdown
### T-001: Task Title
**User Story**: US-001                       ← MANDATORY
**Satisfies ACs**: AC-US1-01, AC-US1-02     ← MANDATORY
**Status**: [x] completed
```

**Why**: Traceability (Task ↔ User Story ↔ AC ↔ Feature), Living docs auto-sync, AC coverage validation

**Validation**: Tasks without linkage → warnings, orphan tasks → `/specweave:done` blocks closure

---

### 12. ADR Naming Convention

**Correct format**: `XXXX-decision-title.md` (4-digit, kebab-case, NO `adr-` prefix)

**Header**: `# ADR-XXXX: Decision Title`

**Location**: `.specweave/docs/internal/architecture/adr/`

```
✅ Filename: 0007-github-first-task-sync.md, Header: # ADR-0007: ...
❌ adr-0007-github-first-task-sync.md (redundant adr- prefix)
❌ 007-github-first-task-sync.md (3-digit)
```

**Auto-numbering**:
```bash
ls .specweave/docs/internal/architecture/adr/*.md | grep -E '/[0-9]{4}-' | \
  sed 's/.*\/\([0-9][0-9][0-9][0-9]\)-.*/\1/' | sort -u | tail -1 | \
  awk '{printf "Next ADR: %04d\n", $1 + 1}'
```

---

### 13. Structured Data Matching

**NEVER use string search for frontmatter/IDs**:

```typescript
// ❌ WRONG: Matches ANYWHERE (false positives!)
content.includes('FS-039')  // Matches "See FS-039" in docs!

// ✅ CORRECT: Parse frontmatter explicitly
const match = content.match(/^feature_id:\s*["']?([^"'\n]+)["']?$/m);
if (match && match[1].trim() === 'FS-039') { /* ... */ }

// ❌ WRONG: Substring matching
archivedList.some(item => item.includes(searchId))

// ✅ CORRECT: Exact equality
archivedList.some(item => item === searchId)
```

**Incident**: 2025-11-20 - 11 features incorrectly archived (string search false positives)

---

### 14. Marketplace Plugin Completeness

**NEVER add incomplete plugins to marketplace.json**

**Complete plugin requires**: `agents/`, `commands/`, OR `lib/` (not just `.claude-plugin/` + `skills/`)

**MANDATORY validation**:
```bash
bash scripts/validate-marketplace-plugins.sh  # Must see "✅ VALIDATION PASSED!"
```

**Adding new plugin**:
1. Create with agents/commands/lib (NOT empty dirs!)
2. Add to marketplace.json
3. **VALIDATE** (critical!)
4. Update `bin/fix-marketplace-errors.sh`
5. Test: `npm pack && npm i -g ./specweave-*.tgz`

**Incident**: 2025-11-20 - 8 incomplete plugins failed loading on global install

---

### 15. Skills vs Agents

**Key Differences**:

| Aspect | Skills | Agents |
|--------|--------|--------|
| **Location** | `plugins/*/skills/name/SKILL.md` | `plugins/*/agents/name/AGENT.md` |
| **Invocation** | `Skill()` or `/command` | `Task()` with `subagent_type` |
| **Activation** | Automatic (keywords) | Explicit call |
| **File** | `SKILL.md` (YAML frontmatter) | `AGENT.md` |

**Agent naming**: `{plugin}:{directory}:{yaml-name}`

```typescript
// ✅ CORRECT: Skill
Skill({ skill: "increment-quality-judge-v2" }); // or /specweave:qa

// ✅ CORRECT: Agent
Task({ subagent_type: "specweave:qa-lead:qa-lead", prompt: "..." });

// ❌ WRONG: Skill as agent
Task({ subagent_type: "specweave:increment-quality-judge-v2" });  // ERROR!
```

**Validation**: `bash scripts/validate-plugin-directories.sh --fix`

**Incident**: 2025-11-20 - Empty agent directory caused "Agent not found" error

---

### 16. YAML Frontmatter Validation

**Required format**:
```yaml
---
increment: 0001-feature-name  # REQUIRED: 4-digit + kebab-case
title: Feature Title           # OPTIONAL
feature_id: FS-001            # OPTIONAL
---
```

**Common mistakes**: Unclosed brackets/quotes, invalid objects, missing `increment`, uppercase in ID

**Validation layers**:
1. Pre-commit hook: `scripts/pre-commit-yaml-validation.sh`
2. Spec parser (uses `js-yaml`, provides line numbers)
3. `/specweave:validate 0001`

**Manual test**:
```bash
node -e "const yaml = require('js-yaml'); const fs = require('fs'); \
  const content = fs.readFileSync('.specweave/increments/0001-test/spec.md', 'utf-8'); \
  const fm = content.match(/^---\n([\s\S]*?)\n---/); \
  console.log('✅ Valid:', JSON.stringify(yaml.load(fm[1]), null, 2));"
```

---

## Project Structure

```
src/                    # TypeScript (compiled to dist/)
plugins/                # Skills, agents, commands, hooks
├── specweave/          # Core plugin
└── specweave-*/        # Optional plugins
.specweave/             # Increments, docs, logs
```

**Rules**: `src/` = TS only, ALL components = `plugins/`, NEVER mix `.ts` + `SKILL.md`, NEVER root files

---

## Plugin Hook Registration

**Valid hook events** (10 total): `PostToolUse`, `PreToolUse`, `PermissionRequest`, `Notification`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `PreCompact`, `SessionStart`, `SessionEnd`

**Format** (`plugins/*/.claude-plugin/plugin.json`):
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [{
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-task-completion.sh",
          "timeout": 10
        }]
      }
    ]
  }
}
```

**❌ WRONG**: `"TodoWrite": {...}` (invalid event)
**✅ CORRECT**: `"PostToolUse"` with `"matcher": "TodoWrite"`

---

## 9a. Hook Performance & Safety (CRITICAL - v0.24.3)

**Critical incidents**: 2025-11-22 - Multiple Claude Code crashes due to hook overhead

**Root cause**: Process exhaustion from spawning 6+ Node.js processes per task completion

**Emergency fixes implemented (v0.24.3)**:

### 1. Emergency Kill Switch
```bash
# INSTANT disable of ALL hooks
export SPECWEAVE_DISABLE_HOOKS=1
```

### 2. Circuit Breaker (Auto-Protection)
- **Threshold**: 3 consecutive failures → auto-disable hooks
- **File**: `.specweave/state/.hook-circuit-breaker`
- **Recovery**: `rm .specweave/state/.hook-circuit-breaker`

### 3. File Locking (Prevents Concurrent Execution)
- **Max instances**: 1 per hook type
- **Timeout**: 5-10 seconds with stale lock cleanup
- **Mechanism**: Directory-based mutex

### 4. Aggressive Debouncing
- **Window**: 5 seconds (increased from 1s)
- **Effect**: Batches rapid operations
- **Trade-off**: 5s staleness acceptable for UX

### 5. Complete Error Isolation
```bash
set +e  # NEVER use set -e in hooks
exit 0  # ALWAYS exit 0, never block workflow
```

### 6. Consolidated Background Work
- **Before**: 6+ Node.js spawns per task (exhaustion!)
- **After**: 1 consolidated background job
- **Reduction**: 85% fewer processes

### Hook Safety Checklist (MANDATORY)

**✅ EVERY hook MUST have**:
1. Kill switch check (`SPECWEAVE_DISABLE_HOOKS`)
2. Circuit breaker check (3 failure threshold)
3. File locking (prevent concurrent runs)
4. Debouncing (5s minimum)
5. Error isolation (`set +e`, `exit 0`)
6. Background work wrapped in subshell
7. Circuit breaker updates on success/failure

**❌ NEVER in hooks**:
- `set -e` (causes crashes)
- Synchronous Node.js spawns
- Multiple separate background jobs
- Error propagation to Claude Code
- Missing `exit 0` at end

### Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Hook execution | <100ms | 100-500ms | >500ms |
| Background processes | 0-2 | 3-5 | 6+ |
| Circuit breaker count | 0 | 1-2 | 3 (open) |

### Emergency Recovery

**If Claude Code crashes**:
```bash
# 1. Immediate kill switch
export SPECWEAVE_DISABLE_HOOKS=1

# 2. Reset circuit breaker
rm -f .specweave/state/.hook-circuit-breaker

# 3. Clear locks
rm -rf .specweave/state/.hook-*.lock

# 4. Rebuild
npm run rebuild
```

**See**:
- `.specweave/docs/internal/emergency-procedures/HOOK-CRASH-RECOVERY.md` (Complete recovery guide)
- ADR-0060 (Three-tier optimization architecture)
- `.specweave/increments/0050-*/reports/hook-crash-analysis.md` (Incident analysis)

---

## Development Workflow

**Core commands**:
```bash
/specweave:increment "feature"  # Plan
/specweave:do                   # Execute
/specweave:progress             # Status
/specweave:done 0002            # Close (validates)
/specweave:validate 0001        # Validate
/specweave:qa 0001              # Quality check
/specweave:pause/resume/abandon # State management
```

**Local setup**:
```bash
git clone https://github.com/YOUR_USERNAME/specweave.git
cd specweave && npm install
mkdir -p ~/.claude/plugins/marketplaces
ln -s "$(pwd)" ~/.claude/plugins/marketplaces/specweave
bash scripts/install-git-hooks.sh
```

---

## Build & Test

**Build**:
```bash
npm run rebuild    # Clean + build (development)
npm run build      # Compile TS + copy deps
```

**Architecture**: `tsc` → `dist/src/`, esbuild → plugin hooks, copy deps → `plugins/*/lib/vendor/`

**CRITICAL**: Always `.js` extensions (`import { foo } from './bar.js'`)

**Test**:
```bash
npm test                    # Smoke
npm run test:unit           # Unit
npm run test:integration    # Integration
npm run test:all            # All
npm run test:coverage       # Coverage (80%+ required)
```

**Test rules**:
- Use `vi.fn()` (NOT `jest.fn()`)
- Use `os.tmpdir()` (NOT `process.cwd()`)
- ALL tests = `.test.ts` (NEVER `.spec.ts`)
- Use `createIsolatedTestDir()` helper

---

## Configuration Management (v0.24.0+)

**Secrets** (.env, gitignored) vs **Config** (.specweave/config.json, committed)

```typescript
import { getConfigManager } from '../core/config/index.js';

const configManager = getConfigManager(projectRoot);
const config = await configManager.read();
await configManager.update({ issueTracker: { provider: 'jira', domain: 'example.atlassian.net' }});
```

**What goes where**:

| Type | Location | Example | Committed? |
|------|----------|---------|------------|
| Tokens/Emails | `.env` | `JIRA_API_TOKEN=xyz` | ❌ |
| Domains/Strategies | `config.json` | `"domain": "example.atlassian.net"` | ✅ |

**Migration**: `node -e "require('./dist/src/cli/commands/migrate-config.js').migrateConfig({ dryRun: true })"`

**See**: ADR-0050, `src/core/config/config-manager.ts`

---

## Cache Management (v0.24.0+)

**Smart Caching with 24-Hour TTL**: Reduces API calls by 90% during init and sync operations.

### Cache Architecture

**Location**: `.specweave/cache/`
**TTL**: 24 hours (configurable)
**Format**: JSON with timestamps

### Cached Data

| Cache Key | Data | Use Case |
|-----------|------|----------|
| `jira-projects-{domain}` | Project list | JIRA init (auto-discovery) |
| `ado-config` | Org/project/teams | ADO init (manual entry) |
| `jira-{PROJECT}-deps` | Boards, components, versions | On-demand dependency loading |
| `ado-{PROJECT}-deps` | Area paths, teams | ADO dependency loading |

### Cache Operations

**Automatic caching** (during init):
- JIRA: `promptJiraCredentials()` caches selected projects
- ADO: `promptAzureDevOpsCredentials()` caches org/project config

**Manual cache management**:
```bash
# Refresh cache (bypass TTL)
/specweave-jira:refresh-cache --all
/specweave-ado:refresh-cache --all

# Clean old caches
/specweave:cleanup-cache --older-than 7d

# View cache statistics
/specweave:cache-stats
```

### Cache Security

**Never cached**: API tokens, PATs, passwords (secrets stay in `.env`)
**Always cached**: Non-sensitive config (domains, project keys, org names)
**Atomic writes**: Temp file → rename pattern prevents corruption
**Auto-recovery**: Corrupted cache auto-deleted, fallback to API

### Integration

**CLI Helpers**:
- `src/cli/helpers/issue-tracker/jira.ts`: JIRA project caching
- `src/cli/helpers/issue-tracker/ado.ts`: ADO config caching

**Core Module**:
- `src/core/cache/cache-manager.ts`: TTL validation, atomic writes, corruption handling

**Tests**:
- `tests/integration/cli/helpers/cache-integration.test.ts`: 85%+ coverage

**See**: ADR-0051 (Smart Caching with TTL), `src/core/cache/rate-limit-checker.ts`

---

## Troubleshooting

- **Skills not activating**: Check YAML frontmatter, restart Claude Code
- **Commands not working**: Verify plugin installed, restart
- **Tests failing**: `npm run rebuild`
- **Root polluted**: Move to `.specweave/increments/####/reports/`
- **Hooks failing**: Push to GitHub (auto-updates 5-10s)

---

## Quick Reference

**Commands**: `/specweave:increment`, `/specweave:do`, `/specweave:done`, `/specweave:progress`, `/specweave:validate`, `/specweave:qa`

**Build**: `npm run rebuild`, `npm test`, `npm run test:all`

**Structure**: `src/` (TS), `plugins/` (components), `.specweave/` (data), `tests/` (tests)

**Remember**:
1. Push → GitHub → Claude Code auto-updates (5-10s)
2. Keep root clean
3. Test before commit
4. NEVER delete `.specweave/`
5. Use `/specweave:done` (not manual edits)

**See**: `.github/CONTRIBUTING.md`, https://spec-weave.com

