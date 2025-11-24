# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: TypeScript CLI (NPM Package)
**Repository**: https://github.com/anton-abyzov/specweave

For **contributors to SpecWeave itself** (not users).

---

## 🚨 CRITICAL SAFETY RULES

### 0. Think-Then-Act Discipline (META RULE!)

**NEVER run commands you know will fail.** Act on reasoning BEFORE execution.

```bash
# ❌ WRONG: node -e "require('./dist/file.js')" (before build)
# ✅ CORRECT: npm run rebuild && node -e "require('./dist/file.js')"
```

---

## 1. Development Setup

**Standard Workflow**:
```bash
git clone https://github.com/YOUR_USERNAME/specweave.git
cd specweave && npm install && npm run rebuild

# Development Cycle
npm run rebuild && npm test
git add . && git commit -m "feat: feature" && git push origin develop
# Wait 5-10s → Claude Code auto-updates marketplace
```

**Testing Unpushed**: Temp branch → push → test → delete, OR `claude plugin marketplace add github:YOUR_USERNAME/specweave`

---

### 1a. Marketplace Refresh

```bash
bash scripts/refresh-marketplace.sh          # GitHub (default, ALWAYS use)
bash scripts/refresh-marketplace.sh --local  # Local dev only (filesystem coupling risks)
```

**Use GitHub mode**: Proper install path, stable source, no hook coupling (~30s)
**Verify**: `jq -r '.specweave.source' ~/.claude/plugins/known_marketplaces.json` → should be `"github"`

**Note**: GitHub mode shows "AC test validator not available" warning because `dist/` is gitignored. Use `--local` mode when developing hooks/validators to test with built artifacts. Regular users with `npm install specweave` won't see this (validator found in `node_modules/`).

---

### 1b. NPM Release

```bash
/specweave-release:npm         # GitHub Actions (2-3 min, recommended)
/specweave-release:npm --only  # Direct publish (30s, emergencies)
```

---

## 2. Folder Structure Rules

**At `.specweave/increments/` root - ONLY**:
1. `####-increment-name/` folders
2. `_archive/` folder
3. `README.md` (optional)

**Inside increment folders - ONLY at root**: `spec.md`, `plan.md`, `tasks.md`, `metadata.json`
**Everything else → subfolders**: `reports/`, `scripts/`, `logs/`

```bash
# Validation (should output NOTHING):
ls -1 .specweave/increments/ | grep -v "^[0-9]" | grep -v "^_archive" | grep -v "^README.md"
```

---

## 3. Protected Directories

**Never delete**: `.specweave/docs/`, `.specweave/increments/`
**Pre-commit hook blocks**: 50+ file deletions, `rm -rf` on protected dirs
**Recovery**: `git restore .specweave/`

---

## 4-6. Safety Rules

**4. Test Cleanup**: `pwd` check → dry-run → count → confirm → execute
**5. NEVER**: `specweave init . --force` (deletes all without backup)
**6. Completion**: `/specweave:done 0043` (validates), NEVER manual `metadata.json` edit

---

## 7. Source of Truth: tasks.md + spec.md (CRITICAL!)

**Internal TODO is ephemeral. tasks.md + spec.md are SOURCE OF TRUTH.**

**MANDATORY workflow**:
```typescript
// 1. Complete work → 2. TodoWrite → 3. IMMEDIATELY Edit tasks.md → 4. IMMEDIATELY Edit spec.md
await work();
TodoWrite([{task: "T-013", status: "completed"}]);
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");
Edit("spec.md", "- [ ] **AC-US1-01**", "- [x] **AC-US1-01**");
```

**Status Line Sync**: TodoWrite → `post-task-completion.sh` → cache updates
**GitHub Duplicates**: Use `DuplicateDetector.createWithProtection()`, NEVER `--limit 1` in gh searches
**Validation**: `/specweave:validate-status`

**Pre-closure check**:
```bash
grep "^\*\*Status\*\*:" tasks.md | grep -c "\[x\] completed"  # Must equal total
grep -c "^- \[x\] \*\*AC-" spec.md                            # Must equal total ACs
```

---

### 7a. AC Presence in spec.md (MANDATORY)

**spec.md MUST contain inline ACs** even with external living docs. AC sync hook requires them.

**Required Format**:
```markdown
## Acceptance Criteria
<!-- Auto-synced from living docs -->
### US-001: Title
- [ ] **AC-US1-01**: Description
```

**If missing**: `/specweave:embed-acs 0050` (auto-embeds from living docs)
**Validation**: `/specweave:do` blocks if ACs missing

---

### 7b. AC Sync Parser (v0.25.2)

**Both formats supported**: `- [x] Done` (legacy list) OR `**Status**: [x] completed` (field format)

---

## 8. Logger Abstraction

**Rule**: ALL `src/` code uses logger injection, NEVER `console.*`

```typescript
import { Logger, consoleLogger } from '../../utils/logger.js';
constructor(options: { logger?: Logger } = {}) {
  this.logger = options.logger ?? consoleLogger;
}
```

**Exception**: `src/cli/commands/*.ts` may use `console.*` with comment explaining it's user-facing output

---

### 8a. Native fs

**Use native Node.js `fs`, NEVER `fs-extra`**

```typescript
// ✅ CORRECT
import { existsSync, readFileSync } from 'fs';
import { promises as fs } from 'fs';
import { mkdirpSync, writeJsonSync } from '../utils/fs-native.js';
```

---

## 9. Coding Standards

**Critical rules (enforced)**:
1. NEVER `console.*` (use logger)
2. ALWAYS `.js` extensions in imports
3. Test files: `.test.ts` (NEVER `.spec.ts`)
4. Avoid `any` type
5. Functions < 100 lines
6. Custom error types
7. Comment "why" not "what"
8. No hardcoded secrets
9. No N+1 queries
10. Naming: camelCase (vars), PascalCase (classes), UPPER_SNAKE_CASE (constants)

**Auto-discovery**: `/specweave:analyze-standards`

---

## 10. GitHub Issue Format

**ONLY Correct Format**: `[FS-XXX][US-YYY] User Story Title`

**PROHIBITED**: `[SP-*]`, `[FS-XXX]` alone, `[undefined][US-XXX]`, project suffixes

**Architecture**: Feature → Milestone, User Stories → Issues

**Create**: `/specweave-github:sync FS-048`

---

### 10a. NO Increment-to-Increment References (ADR-0061)

**FORBIDDEN**: User stories referencing increments (`increments: [0050-...]`)
**ONLY ALLOWED**: `INCREMENT → FEATURE → USER STORIES` (forward reference only)

**Why**: Hooks break, circular dependencies, multi-increment support broken

---

## 11. Task Format with US Linkage

```markdown
### T-001: Task Title
**User Story**: US-001           ← MANDATORY
**Satisfies ACs**: AC-US1-01     ← MANDATORY
**Status**: [x] completed
```

---

## 12. ADR Naming

**Format**: `XXXX-decision-title.md` (4-digit, kebab-case, NO `adr-` prefix)
**Header**: `# ADR-XXXX: Decision Title`
**Location**: `.specweave/docs/internal/architecture/adr/`

**Auto-numbering**:
```bash
ls .specweave/docs/internal/architecture/adr/*.md | grep -E '/[0-9]{4}-' | \
  sed 's/.*\/\([0-9][0-9][0-9][0-9]\)-.*/\1/' | sort -u | tail -1 | \
  awk '{printf "Next ADR: %04d\n", $1 + 1}'
```

---

## 13. Structured Data Matching

**NEVER use string search for frontmatter/IDs**:

```typescript
// ❌ WRONG: content.includes('FS-039')  // Matches "See FS-039"!
// ✅ CORRECT: const match = content.match(/^feature_id:\s*["']?([^"'\n]+)["']?$/m);
```

---

## 14. Marketplace Plugin Completeness

**Complete plugin requires**: `agents/`, `commands/`, OR `lib/` (not just `.claude-plugin/` + `skills/`)

**MANDATORY**: `bash scripts/validate-marketplace-plugins.sh`

---

## 15. Skills vs Agents

| Aspect | Skills | Agents |
|--------|--------|--------|
| **Location** | `plugins/*/skills/name/SKILL.md` | `plugins/*/agents/name/AGENT.md` |
| **Invocation** | `Skill()` or `/command` | `Task()` with `subagent_type` |
| **Activation** | Automatic (keywords) | Explicit |

**Agent naming**: `{plugin}:{directory}:{yaml-name}`

### Skills Must NOT Spawn Large Content-Generating Agents (ADR-0133)

**CRITICAL**: Skills spawning agents via `Task()` causes Claude Code crashes due to context explosion.

**Problem**: Skill (1500 lines) + Agent (600 lines) + Agent output (2000+ lines) = 4000+ lines in memory = CRASH 💥

**❌ FORBIDDEN**:
```typescript
// In a skill SKILL.md:
Task({
  subagent_type: "specweave:architect:architect",  // ❌ Generates 1000-3000 lines
  subagent_type: "specweave:pm:pm",                // ❌ Generates 500-2000 lines
  subagent_type: "specweave:test-aware-planner",   // ❌ Generates 500-1500 lines
});
```

**✅ CORRECT**:
```typescript
// Skills create templates and guide users:
1. Create basic templates (< 50 lines each)
2. Output: "Tell Claude: 'Complete the spec for increment 0005-feature'"
3. Agents activate in MAIN context (not nested) = SAFE
```

**When to use Task() from skills**:
- ✅ Small utility agents (output < 200 lines)
- ✅ Data processing agents (no large generation)
- ❌ Content generators (specs, ADRs, plans, tasks)

**Reference**: ADR-0133, Architect crash incident (2025-11-24, Increment 0052)

---

## 16. YAML Frontmatter

**Required**:
```yaml
---
increment: 0001-feature-name  # REQUIRED: 4-digit + kebab-case
feature_id: FS-001            # OPTIONAL
---
```

**Validation**: Pre-commit hook, spec parser, `/specweave:validate 0001`

---

## 17. Git Provider Abstraction

**Interface-driven multi-platform support**:
- GitHub, GitLab, Bitbucket, Azure DevOps, Local Git

**Usage**:
```typescript
import { getPlatformRegistry } from './platform-registry.js';
const provider = registry.getProvider('github');
const result = await provider.validateRepository('owner', 'repo', token);
```

**NEVER**: Hardcode platform names, API endpoints, Git hosts

---

### 17a. GitHub Multi-Repo Init Flow (v0.26.3 - ADR-0132)

**Rule**: NEVER early returns in routing code. Use mapping.

```typescript
// ❌ if (option === 'advanced') return { type: 'basic' };
// ✅ let mapped = undefined; if (option === 'advanced') mapped = 'enhanced';
```

---

## Hook Performance & Safety

**Emergency**: `export SPECWEAVE_DISABLE_HOOKS=1` → `rm -f .specweave/state/.hook-*` → `npm run rebuild`

**Mandatory Checklist**: PROJECT_ROOT first, kill switch, circuit breaker, file lock, debounce (5s), `set +e`, `exit 0`, active-only filtering
**Never**: `set -e`, sync spawns, error propagation
**Targets**: <100ms, 0-2 processes, 0 breaker trips

**Critical Fixes**:
- v0.26.1: **Automatic US sync restored!** `SKIP_US_SYNC` removed → Smart throttle (60s window) → fs.writeFile() validated safe
- v0.25.2: `SKIP_EXTERNAL_SYNC` guard at LivingDocsSync layer → prevents recursion cascade
- v0.25.1: TodoWrite crash → emergency `SKIP_US_SYNC=true` → manual `/specweave:sync-progress` (temporary fix)
- v0.25.0: 6→4 hooks (33% reduction)
- v0.24.4: State-based filtering (95% overhead reduction)
- v0.26.1: PROJECT_ROOT before RECURSION_GUARD_FILE (order bug fix)

---

## Development Workflow

**Core commands**:
```bash
/specweave:increment "feature"  # Plan
/specweave:do                   # Execute
/specweave:progress             # Status
/specweave:sync-progress        # Comprehensive sync (tasks → docs → external tools)
/specweave:done 0002            # Close (validates)
/specweave:validate 0001        # Validate
/specweave:qa 0001              # Quality check

# Feature deletion
specweave delete-feature FS-042 --dry-run  # Preview
specweave delete-feature FS-042            # Safe delete (requires confirmation)
specweave delete-feature FS-042 --force    # Force (orphans active increments)
```

---

## Build & Test

**Build**: `npm run rebuild` (clean + build), `npm run build`
**Architecture**: `tsc` → `dist/src/`, esbuild → hooks, copy deps → `plugins/*/lib/vendor/`
**CRITICAL**: Always `.js` extensions in imports

**Test**:
```bash
npm test                 # Smoke
npm run test:unit        # Unit
npm run test:integration # Integration
npm run test:all         # All
npm run test:coverage    # Coverage (80%+ required)
```

**Test rules**: `vi.fn()` (NOT `jest.fn()`), `os.tmpdir()` (NOT `process.cwd()`), `.test.ts` (NOT `.spec.ts`)

---

## Configuration Management

**Secrets** (.env, gitignored) vs **Config** (.specweave/config.json, committed)

| Type | Location | Committed? |
|------|----------|------------|
| Tokens/Emails | `.env` | ❌ |
| Domains/Strategies | `config.json` | ✅ |

---

## Cache Management

**Location**: `.specweave/cache/`, **TTL**: 24 hours

**Cached**: JIRA projects, ADO config, boards, components (NOT tokens/PATs)

**Manual**: `/specweave-jira:refresh-cache --all`, `/specweave:cleanup-cache --older-than 7d`

---

## Comprehensive Progress Sync

**Command**: `/specweave:sync-progress [increment]`

**Flow**: tasks.md → spec.md ACs → living docs → external tools (GitHub/JIRA/ADO) → status line

**Replaces 4 commands**: `/specweave:sync-acs` + `/specweave:sync-specs` + `/specweave-github:sync` + `/specweave:update-status`

**Flags**: `--dry-run`, `--no-github`, `--no-jira`, `--no-ado`, `--force`

**When to use**: After completing tasks, before closing increment, bulk completion

---

## Safe Feature Deletion

**Command**: `specweave delete-feature <feature-id>`

**4-Tier Validation**: Feature detection → active increment check → git status → GitHub scan
**3-Phase Commit**: Validation → staging (reversible) → commit (irreversible)
**Multi-Gate Confirmation**: Primary (y/N) → elevated (type "delete" in force mode) → GitHub (separate)

**Deletes**: Living docs FEATURE.md, user stories, README, GitHub issues
**NOT deleted**: Increments (metadata.json updated if orphaned)

**Modes**: Safe (default, blocks active increments), Force (`--force`, orphans increments), Dry-run (`--dry-run`, preview)

**Audit**: `.specweave/logs/feature-deletions.log` (JSON Lines, includes commit SHA)

---

## Project Structure

```
src/                    # TypeScript → dist/
plugins/                # Skills, agents, commands, hooks
├── specweave/          # Core
└── specweave-*/        # Optional
.specweave/             # Increments, docs, logs
```

---

## Plugin Hook Registration

**Valid events** (10): PostToolUse, PreToolUse, PermissionRequest, Notification, UserPromptSubmit, Stop, SubagentStop, PreCompact, SessionStart, SessionEnd

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "TodoWrite",
      "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-task-completion.sh", "timeout": 10 }]
    }]
  }
}
```

---

## Quick Reference

**Commands**: `/specweave:increment`, `/specweave:do`, `/specweave:done`, `/specweave:progress`, `/specweave:validate`, `/specweave:qa`

**Build**: `npm run rebuild`, `npm test`, `npm run test:all`

**Structure**: `src/` (TS), `plugins/` (components), `.specweave/` (data), `tests/` (tests)

**Remember**:
1. Push → GitHub → auto-updates (5-10s)
2. Keep root clean (reports in increment subfolders)
3. Test before commit
4. NEVER delete `.specweave/`
5. Use `/specweave:done` (not manual edits)
6. ALWAYS use GitHub mode for marketplace refresh (unless actively developing uncommitted changes)
7. tasks.md + spec.md are SOURCE OF TRUTH (not internal TODO)

**See**: `.github/CONTRIBUTING.md`, https://spec-weave.com

---

## References

**ADRs**: 0032 (GitHub Hierarchy), 0050 (Config Management), 0051 (Caching), 0060 (Hook Optimization), 0061 (No Increment References), 0064 (AC Presence), 0069 (Git Provider Abstraction), 0070 (Hook Consolidation), 0129 (US Sync Guard Rails), 0132 (No Early Returns)

**Emergency Procedures**: `.specweave/docs/internal/emergency-procedures/HOOK-CRASH-RECOVERY.md`, `TODOWRITE-CRASH-RECOVERY.md`, `AC-SYNC-CONFLICT-FIX-2025-11-24.md`

**Incident Reports**: See increment 0044 (TODO desync), 0047 (GitHub sync removal), 0050 (Hook crashes, AC presence, GitHub issues), 0051 (PROJECT_ROOT order), 0053 (Safe deletion, TodoWrite crash, AC parser, GitHub multi-repo)

**Validation Scripts**: `validate-marketplace-plugins.sh`, `validate-plugin-directories.sh`, `validate-hook-variable-order.sh`, `cleanup-duplicate-github-issues.sh`
