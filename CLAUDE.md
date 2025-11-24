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

---

### 1a. Quick Marketplace Refresh (NEW! 🚀)

**Problem**: After implementing new plugins locally, Claude Code needs to reload the marketplace.

**Solution**: Use the automated refresh script!

```bash
# FROM GITHUB (default, recommended) - Pulls latest from GitHub
bash scripts/refresh-marketplace.sh

# LOCAL DEVELOPMENT - Uses your local changes (ONLY for active development!)
bash scripts/refresh-marketplace.sh --local
```

**🚨 CRITICAL: Always Use GitHub Mode Unless Actively Developing!**

**Why GitHub mode is mandatory:**
- ✅ **Separate Installation**: Creates proper copy at `~/.claude/plugins/marketplaces/specweave/`
- ✅ **Stable Source**: Pulls from committed GitHub code, not unstable local changes
- ✅ **No Path Coupling**: Clear separation between source and runtime
- ✅ **Production-Ready**: What end users will experience

**Why local mode is dangerous:**
- ❌ **Filesystem Coupling**: `installLocation` = source directory (no separate copy!)
- ❌ **Stale Hook Risk**: Any git operations, file deletions, or uncommitted changes affect "installed" plugins
- ❌ **Path Confusion**: Claude Code expects hooks at `~/.claude/plugins/marketplaces/` but they're in your working directory
- ❌ **Instability**: Leads to "hook not found" errors like you just experienced

**Rule of thumb:**
- **Development workflow**: Commit → Push → `bash scripts/refresh-marketplace.sh` (GitHub mode) → Test
- **Emergency local testing**: Use `--local` ONLY when you need to test uncommitted changes, then immediately switch back to GitHub mode

**What it does**:
1. ✅ Removes existing marketplace
2. ✅ Clears all plugin caches
3. ✅ Re-adds marketplace (local or GitHub)
4. ✅ Installs ALL plugins automatically
5. ✅ Shows success/failure summary

**Output Example**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SpecWeave Marketplace Refresh (github mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Step 1: Removing existing marketplace...
✓ Marketplace removed

🧹 Step 2: Clearing plugin caches...
✓ Installed plugins cache backed up

📥 Step 3: Adding marketplace...
Pulling latest from GitHub: anton-abyzov/specweave
Cloning via SSH: git@github.com:anton-abyzov/specweave.git
✓ GitHub marketplace added

📋 Step 4: Reading plugin list...
✓ Found 27 plugins

⚙️  Step 5: Installing all plugins...
  Installing specweave...
  ✓ specweave installed

  [... all 19 plugins ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Installation Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total plugins: 19
  Successful: 19
  Failed: 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ ALL PLUGINS INSTALLED SUCCESSFULLY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
  1. Restart Claude Code for changes to take effect
  2. Run /plugin to verify all plugins loaded
  3. Check ~/.claude/plugins/installed_plugins.json
```

**When to use**:
- ✅ After pushing changes to GitHub (GitHub mode - default)
- ✅ After pulling latest from GitHub (GitHub mode)
- ✅ When plugins aren't loading correctly (GitHub mode)
- ✅ After adding new plugins (commit → push → refresh with GitHub mode)
- ⚠️  To test uncommitted local changes (local mode - use sparingly!)

**Time**: ~30 seconds (vs 5-10 minutes manual)

**Verification after refresh**:
```bash
# Check marketplace source (should be "github")
cat ~/.claude/plugins/known_marketplaces.json | jq -r '.specweave.source'

# Should output: {"source": "github", "repo": "anton-abyzov/specweave"}
# NOT: {"source": "directory", "path": "/Users/..."}
```

**Requirements**: `jq` installed (`brew install jq`)

---

### 1b. NPM Release Workflow (NEW! 🚀)

**Two release modes**: Default (GitHub Actions) and Direct (`--only` flag)

#### Default Mode (Recommended)

```bash
# Push to GitHub → GitHub Actions publishes to npm
/specweave-release:npm
```

**What happens**:
1. ✅ Bumps patch version (e.g., 0.24.11 → 0.24.12)
2. ✅ Creates git commit + tag
3. ✅ Pushes to GitHub
4. ✅ Triggers GitHub Actions workflow
5. ✅ GitHub Actions publishes to npm (1-2 min)

**Use when**: Regular releases, want CI validation

#### Direct Mode (`--only` flag)

```bash
# Publish directly to npm (bypasses GitHub Actions)
/specweave-release:npm --only
```

**What happens**:
1. ✅ Bumps patch version
2. ✅ Creates git commit + tag
3. ✅ Builds package (`npm run rebuild`)
4. ✅ **Publishes to npm immediately**
5. ✅ Pushes git changes to GitHub (optional)

**Use when**:
- 🔥 Emergency releases (hotfix needed NOW)
- ⚡ Want immediate feedback (no CI wait)
- 🧪 Testing release process locally
- 💻 GitHub Actions unavailable

**Example output**:
```
✅ Published directly to npm!

📦 Version: v0.24.12
🔗 NPM: https://www.npmjs.com/package/specweave
🏷️ Git Tag: v0.24.12 (created locally)

What happened:
- ✅ Version bumped and committed
- ✅ Git tag created locally
- ✅ Package built (npm run rebuild)
- ✅ Published to npm directly
- ✅ Git changes pushed to GitHub

Note: Published via direct push (bypassed GitHub Actions)
```

**Safety**:
- ✅ Both modes do pre-flight checks (branch, uncommitted changes)
- ✅ Both create proper git commits/tags
- ✅ Direct mode rebuilds before publishing
- ✅ Default mode is preferred for regular releases

**Time comparison**:
- Default mode: 2-3 minutes (includes CI)
- Direct mode (`--only`): 30 seconds

---

### 2. Increment Folder Structure

**CRITICAL RULES**:

**At `.specweave/increments/` root - ONLY 3 things allowed**:
1. Numbered increment folders: `####-increment-name/` (e.g., `0053-safe-feature-deletion/`)
2. Archive folder: `_archive/`
3. README.md (optional documentation)

**❌ NOT ALLOWED at root**: `_working/`, `reports/`, `logs/`, `scripts/`, or ANY other folders/files

**Inside each increment folder - ONLY 4 files at root**: `spec.md`, `plan.md`, `tasks.md`, `metadata.json`

**Everything else → subfolders**: `reports/`, `scripts/`, `logs/`

```bash
# ❌ WRONG: .specweave/increments/_working/fix/
# ❌ WRONG: .specweave/increments/reports/
# ❌ WRONG: .specweave/increments/0046/analysis-report.md
# ✅ CORRECT: .specweave/increments/0046/reports/analysis-report.md
```

**Validation**:
```bash
# Check for violations at root (should output NOTHING)
ls -1 .specweave/increments/ | grep -v "^[0-9]" | grep -v "^_archive" | grep -v "^README.md"
```

**See**: `.specweave/docs/internal/governance/increment-folder-structure.md` (complete standard)

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

### 7a. AC Presence in spec.md (MANDATORY - v0.24.0+) ⚠️

**CRITICAL RULE**: spec.md MUST contain inline Acceptance Criteria, even when using `structure: user-stories` with external living docs.

**Why**: The AC sync hook (`post-task-completion.sh`) requires ACs in spec.md to function. Without inline ACs, you get 0% AC completion and broken status line.

**Architecture** (ADR-0064):
```
spec.md = SOURCE OF TRUTH for ACs
living docs = DOCUMENTATION LAYER (optional, provides rich context)
```

**Validation Gates**:
1. `/specweave:do` (pre-start hook) - **BLOCKS** if ACs missing
2. `/specweave:validate` - **ERRORS** if ACs missing
3. `/specweave:increment` - **AUTO-EMBEDS** ACs during creation

**Required Format**:
```markdown
## Acceptance Criteria

<!-- Auto-synced from living docs -->

### US-001: User Story Title

- [ ] **AC-US1-01**: Criterion description
- [ ] **AC-US1-02**: Criterion description
```

**If ACs are missing**:
```bash
# Manual fix: Auto-embed ACs from living docs
/specweave:embed-acs 0050

# Or add ACs manually to spec.md
Edit("spec.md", "...", "...\n\n## Acceptance Criteria\n\n...")
```

**Common mistake**: Generating "pointer-only" spec.md that just references living docs without embedding ACs.

**Incident** (2025-11-22, Increment 0050):
- spec.md had 0 inline ACs (only references to living docs)
- tasks.md referenced 39 ACs (AC-US1-01, AC-US4-01, etc.)
- AC sync hook failed: 38 warnings, 0% completion
- Fix: `/specweave:embed-acs 0050` → auto-embedded 39 ACs → 100% completion

**Prevention**:
- Pre-start hook validates AC presence before allowing work to start
- Spec generators auto-embed ACs when `structure: user-stories` is used
- Validation command checks AC count matches metadata.json

**See**: ADR-0064, `src/utils/ac-embedder.ts`, `src/core/validators/ac-presence-validator.ts`

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

**PROHIBITED Formats** (Pre-commit hook blocks these):
```
❌ [SP-US-XXX] ...          (Deprecated SP- prefix, removed v0.24.0)
❌ [SP-FS-XXX] ...          (Deprecated SP- prefix, removed v0.24.0)
❌ [SP-FS-XXX-specweave] ...  (SP prefix + project suffix, DEPRECATED!)
❌ [FS-048] ...             (Feature-only - USE MILESTONE, NOT ISSUE!)
❌ [FS-048-specweave] ...   (Project suffix - README.md ONLY, NOT GitHub!)
❌ [undefined][US-XXX] ...  (Missing Feature ID - validation error!)
```

**ONLY CORRECT Examples**:
```
✅ [FS-048][US-001] Smart Pagination During Init
✅ [FS-048][US-002] CLI-First Defaults
✅ [FS-033][US-015] Task Completion Tracking
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

**Enforcement**:
- **Pre-commit hook**: Blocks code commits with prohibited formats
- **UserStoryIssueBuilder**: Runtime validation throws error if featureId invalid
- **Pattern matching**: Final safety check before issue creation
- **Manual review**: Close any wrong-format issues immediately

**If you see wrong-format issues** (e.g., `[SP-US-XXX]`, `[SP-FS-XXX]`, or `[FS-XXX]` alone):
1. **Close immediately** with comment: "WRONG FORMAT: Violates ADR-0032. Use [FS-XXX][US-YYY] format."
2. Delete any duplicate Feature folders (e.g., FS-050 when FS-048 exists)
3. Use `/specweave-github:sync FS-XXX` to create correct User Story issues
4. **REPORT THE BUG** - this should never happen with validation!

**See**:
- `.specweave/increments/0047-us-task-linkage/reports/FEATURE-LEVEL-GITHUB-SYNC-REMOVAL-PLAN.md`
- `.specweave/increments/0050-*/reports/GITHUB-ISSUE-BUG-ANALYSIS-2025-11-22.md`
- `.specweave/increments/0050-*/reports/SP-PREFIX-BUG-ROOT-CAUSE-2025-11-22.md`

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

## 17. Git Provider Abstraction (v0.24.0+)

**Architecture**: Interface-driven multi-platform support with registry pattern

**Key files**:
- `src/core/repo-structure/git-provider.ts` - Interface definition
- `src/core/repo-structure/platform-registry.ts` - Singleton registry
- `src/core/repo-structure/providers/` - Platform implementations

**Provider Interface**:
```typescript
export interface GitProvider {
  readonly config: GitProviderConfig;

  validateRepository(owner: string, repo: string, token?: string): Promise<ValidationResult>;
  validateOwner(owner: string, token?: string): Promise<OwnerValidationResult>;
  createRepository(params: CreateRepoParams, token: string): Promise<string>;
  isOrganization(owner: string, token?: string): Promise<boolean>;

  getRemoteUrl(owner: string, repo: string, urlType: 'ssh' | 'https'): string;
  getTokenUrl(): string;
  getRequiredScopes(isOrg: boolean): string[];
}
```

**Usage pattern**:
```typescript
import { initializeProviders } from './providers/index.js';
import { getPlatformRegistry } from './platform-registry.js';

// Initialize providers (call once during startup)
initializeProviders();

// Get provider for user-selected platform
const registry = getPlatformRegistry();
const provider = registry.getProvider('github'); // or 'gitlab', 'bitbucket'

// Use provider methods (platform-agnostic code)
const result = await provider.validateRepository('owner', 'repo', token);
const url = provider.getRemoteUrl('owner', 'repo', 'ssh');
await provider.createRepository({ owner, name, description, visibility }, token);
```

**Platform Support**:
- ✅ GitHub (fully supported): `github-provider.ts`
- ✅ GitLab (fully supported): `gitlab-provider.ts`
- ✅ Bitbucket (fully supported): `bitbucket-provider.ts`
- ✅ Azure DevOps (fully supported): `azure-devops-provider.ts`
- ✅ Local Git (fully supported): `local-provider.ts`

**Adding new platform**:
1. Create `src/core/repo-structure/providers/{platform}-provider.ts`
2. Implement `GitProvider` interface
3. Register in `providers/index.ts`: `registry.registerProvider('platform', provider)`
4. Update platform registry metadata: `registry.registerPlatform({ type, name, description, supported })`

**NEVER**:
- ❌ Hardcode platform names (use `provider.config.name`)
- ❌ Hardcode API endpoints (use `provider.config.apiBaseUrl`)
- ❌ Hardcode Git hosts (use `provider.config.host`)
- ❌ Use GitHub-specific methods (use provider interface)

**See**: ADR-0069 (Git Provider Abstraction Layer)

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

## 9a. Hook Performance & Safety (CRITICAL - v0.25.0)

**Critical incidents**:
- 2025-11-22 - Multiple Claude Code crashes due to hook overhead
- 2025-11-23 - Hook process storm (6 hooks per Edit/Write → 300 processes/min)
- 2025-11-24 - PROJECT_ROOT order bug (recursion guard at wrong path → crashes)

**Root cause**: Process exhaustion from spawning 6 bash processes per Edit/Write operation

**LONG-TERM FIX (v0.25.0)**: Hook Consolidation
- **Reduced from 6 → 4 hooks per Edit/Write** (33% reduction)
- **Consolidated hooks**:
  - `pre-edit-write-consolidated.sh` (replaces pre-edit-spec + pre-write-spec)
  - `post-edit-write-consolidated.sh` (replaces post-edit-spec + post-write-spec)
  - `post-metadata-change.sh` (enhanced with ultra-fast early exit)
- **Performance**: 50% reduction in hook overhead
- **See**: ADR-0070 (Hook Consolidation)

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
1. `PROJECT_ROOT` defined BEFORE any path variables (CRITICAL - v0.26.1)
2. Kill switch check (`SPECWEAVE_DISABLE_HOOKS`)
3. Circuit breaker check (3 failure threshold)
4. File locking (prevent concurrent runs)
5. Debouncing (5s minimum)
6. Error isolation (`set +e`, `exit 0`)
7. Background work wrapped in subshell
8. Circuit breaker updates on success/failure

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

### Active Increment Filtering (v0.24.4 - ARCHITECTURAL FIX)

**Critical architectural change**: Hooks now **ONLY** process active increments.

**Problem**: The old logic used `ls -td` (time-based) which:
- Processed 50+ increments on every TodoWrite
- Could pick completed increments if recently modified
- Caused infinite loops when hitting bad AC data
- Wasted 90%+ of hook overhead on completed work

**Solution**: State-based filtering (`.specweave/state/active-increment.json`)

```bash
# NEW: Read active increments from state file
mapfile -t ACTIVE_INCREMENTS < <(jq -r '.ids[]' "$ACTIVE_STATE_FILE")

# Process ONLY active increments
for CURRENT_INCREMENT in "${ACTIVE_INCREMENTS[@]}"; do
  # Safety: Skip if completed/abandoned/archived
  if [[ "$STATUS" == "completed" ]] || [[ "$STATUS" == "abandoned" ]]; then
    continue
  fi

  # Process (tasks.md, AC sync, living docs, etc.)
done
```

**Impact**:
- ✅ 95% reduction in hook overhead (50+ → 1-2 increments)
- ✅ Zero risk of infinite loops (completed increments never touched)
- ✅ Clean architecture (source of truth: state file)
- ✅ Multi-increment support (processes array)

**Fail-safe defaults**:
- No state file → skip all work
- Empty array → skip all work (normal when no active increments)
- Missing directory → skip increment
- Archived → skip increment
- Completed/abandoned status → skip increment

**See**: `.specweave/increments/0050-*/reports/ARCHITECTURAL-FIX-ACTIVE-INCREMENT-FILTERING.md`

### Hook Variable Initialization Order (v0.26.1 - CRITICAL FIX)

**CRITICAL BUG PATTERN**: Variables used in path construction MUST be defined BEFORE they're used!

**Incident** (2025-11-24): Claude Code crashed 3x due to `PROJECT_ROOT` being used before definition in `post-task-completion.sh`.

**The Bug**:
```bash
# ❌ WRONG: Uses $PROJECT_ROOT before it's defined
RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"  # Line 71
# ... 40 lines later ...
PROJECT_ROOT="$(find_project_root ...)"  # Line 112 - TOO LATE!

# Result: Guard file created at wrong path (/.specweave/state/...)
```

**What Happened**:
1. Guard file created at **invalid path** (`/.specweave/state/.hook-recursion-guard`)
2. Other hooks check guard at **correct path** (`/full/project/path/.specweave/state/...`)
3. Guard not found → hooks don't exit early → **INFINITE RECURSION**
4. PreToolUse hook fired 3x → Claude Code crashed

**✅ CORRECT Pattern**:
```bash
# 1. Define find_project_root() function FIRST (line 40)
find_project_root() { ... }

# 2. Set PROJECT_ROOT IMMEDIATELY (line 50)
PROJECT_ROOT="$(find_project_root ...)"

# 3. NOW use PROJECT_ROOT in paths (line 60+)
RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"
```

**Validation** (automated script):
```bash
# Run the validation script (validates all hooks automatically)
bash scripts/validate-hook-variable-order.sh

# Expected output: ✅ ALL HOOKS VALIDATED SUCCESSFULLY
# If fails: Script shows exactly which hooks have wrong variable order
```

**Enforcement** (✅ DONE - v0.26.1):
- ✅ Pre-commit hook added: runs `validate-hook-variable-order.sh` on every commit
- ✅ Regression tests added: `tests/unit/hooks/recursion-guard.test.ts` (29 tests)
- ✅ Validates all hooks with RECURSION_GUARD_FILE have correct variable order
- ✅ Blocks commits where `PROJECT_ROOT` is defined after `RECURSION_GUARD_FILE`

**Manual validation**:
```bash
# Check specific hook manually
hook="plugins/specweave/hooks/post-task-completion.sh"
guard_line=$(grep -n "^RECURSION_GUARD_FILE=" "$hook" | cut -d: -f1)
root_line=$(grep -n "^PROJECT_ROOT=" "$hook" | cut -d: -f1)
echo "PROJECT_ROOT: line $root_line"
echo "RECURSION_GUARD_FILE: line $guard_line"
# root_line MUST be < guard_line
```

**See**:
- `.specweave/increments/0051-*/reports/PROJECT-ROOT-ORDER-BUG-2025-11-24.md`
- `scripts/validate-hook-variable-order.sh` (validation script)
- `tests/unit/hooks/recursion-guard.test.ts` (regression tests)

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
/specweave:pause/resume/abandon # State management

# Feature deletion
specweave delete-feature FS-042 --dry-run    # Preview deletion
specweave delete-feature FS-042              # Safe deletion (requires confirmation)
specweave delete-feature FS-042 --force      # Force delete (orphans active increments)
specweave delete-feature FS-042 --no-git     # Skip git operations
specweave delete-feature FS-042 --no-github  # Skip GitHub issue cleanup
specweave delete-feature FS-042 --yes        # Skip confirmations (except elevated)
```

**Local setup**:
```bash
git clone https://github.com/YOUR_USERNAME/specweave.git
cd specweave && npm install && npm run rebuild
bash scripts/install-git-hooks.sh

# Push changes to GitHub → Claude Code auto-updates marketplace (5-10s)
# For fork-based testing: claude plugin marketplace add github:YOUR_USERNAME/specweave
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

## Comprehensive Progress Sync (v0.25.0+)

**Command**: `/specweave:sync-progress`

**Purpose**: Single-button multi-system synchronization. Orchestrates complete flow from task completion → living docs → external tools (GitHub/JIRA/ADO).

### What It Does

**Comprehensive Sync Flow**:
```
tasks.md (source of truth)
  ↓
spec.md ACs (marked complete)
  ↓
Living docs (user stories updated)
  ↓
External tools (GitHub/JIRA/ADO synced)
  ↓
Status line cache (updated display)
```

**One command replaces 4 manual steps**:
```bash
# OLD: Manual multi-step sync (error-prone)
/specweave:sync-acs 0053
/specweave:sync-specs 0053
/specweave-github:sync 0053
/specweave:update-status

# NEW: Single comprehensive sync ✅
/specweave:sync-progress 0053
```

### Usage

```bash
# Auto-detect active increment
/specweave:sync-progress

# Explicit increment ID
/specweave:sync-progress 0053

# Dry-run mode (preview without executing)
/specweave:sync-progress 0053 --dry-run

# Skip external tools (local-only sync)
/specweave:sync-progress 0053 --no-github --no-jira --no-ado
```

### When to Use

**✅ Use /specweave:sync-progress when**:
1. After completing tasks in tasks.md
2. Before closing increment (`/specweave:done`)
3. Want to update status line with latest progress
4. Need to sync to external tools (GitHub/JIRA/ADO)
5. After bulk task completion

**❌ Don't use when**:
1. Only need to sync ACs → Use `/specweave:sync-acs`
2. Only need to sync docs → Use `/specweave:sync-specs`
3. Only need to sync GitHub → Use `/specweave-github:sync`

### Multi-Phase Orchestration

**Phase 1: Tasks → ACs (spec.md)**
- Reads completed tasks from tasks.md
- Finds linked ACs via `**Satisfies ACs**` field
- Marks ACs as complete: `[ ]` → `[x]`
- Updates metadata.json with AC count

**Phase 2: Spec → Living Docs**
- Syncs spec.md to living docs structure
- Updates user story completion status
- Generates/updates feature ID if needed

**Phase 3: Living Docs → External Tools**
- **GitHub**: Closes completed user story issues, updates epic checklist
- **JIRA**: Updates story status, transitions workflow
- **Azure DevOps**: Updates work item state, adds comments

**Phase 4: Status Line Cache**
- Updates status line with latest completion %

### Flags

| Flag | Purpose | Example |
|------|---------|---------|
| `--dry-run` | Preview without executing | `--dry-run` |
| `--no-github` | Skip GitHub sync | `--no-github` |
| `--no-jira` | Skip JIRA sync | `--no-jira` |
| `--no-ado` | Skip Azure DevOps sync | `--no-ado` |
| `--force` | Force sync even if validation fails | `--force` |

### Error Handling

**Graceful Degradation**:
- **Critical errors** (AC sync, docs sync): Abort entire sync
- **Non-critical errors** (GitHub, JIRA, ADO): Log warning, continue

**Philosophy**: Core sync (tasks → docs) must succeed. External tool sync is best-effort.

### Example Workflow

**Typical increment workflow with progress sync**:

```bash
# 1. Plan increment
/specweave:increment "Safe feature deletion"

# 2. Execute tasks
/specweave:do

# [Complete 5 tasks...]

# 3. Sync progress after batch
/specweave:sync-progress

# [Complete remaining 32 tasks...]

# 4. Final sync before closure
/specweave:sync-progress 0053

# 5. Validate quality
/specweave:validate 0053 --quality

# 6. Close increment
/specweave:done 0053
```

### External Tool Auto-Detection

**Automatic detection** from `.specweave/config.json`:
- GitHub: `"provider": "github"`
- JIRA: `"provider": "jira"`
- Azure DevOps: `"provider": "azure-devops"`

**Only configured tools are synced**:
```
✅ GitHub integration detected → Will sync
ℹ️  No JIRA integration → Skip
ℹ️  No ADO integration → Skip
```

### Troubleshooting

**"No active increment found"**:
```bash
# Provide increment ID explicitly
/specweave:sync-progress 0053
```

**"AC sync had warnings: 5 ACs not found"**:
```bash
# Embed ACs from living docs into spec.md
/specweave:embed-acs 0053

# Then retry sync
/specweave:sync-progress 0053
```

**"GitHub rate limit exceeded"** (non-critical):
- Docs are synced successfully
- Retry GitHub sync later when rate limit resets:
  ```bash
  /specweave-github:sync 0053
  ```

**See**:
- Skill: `progress-sync` (comprehensive guide)
- Increment 0053 (added in this increment)

---

## Safe Feature Deletion (v0.25.0+)

**Command**: `specweave delete-feature <feature-id>`

Safe deletion of features with multi-gate validation, automatic cleanup, and audit logging.

### Usage

```bash
# Preview deletion (recommended first step)
specweave delete-feature FS-042 --dry-run

# Safe deletion (requires confirmation)
specweave delete-feature FS-042

# Force deletion (bypasses active increment validation)
specweave delete-feature FS-042 --force

# Skip git operations
specweave delete-feature FS-042 --no-git

# Skip GitHub issue cleanup
specweave delete-feature FS-042 --no-github

# Skip confirmations (except elevated confirmation in force mode)
specweave delete-feature FS-042 --yes
```

### Safety Features

**4-Tier Validation**:
1. **Feature Detection**: Scans living docs and user stories
2. **Active Increment Check**: Blocks deletion if active increments reference feature (safe mode)
3. **Git Status Check**: Ensures clean working directory
4. **GitHub Issue Scan**: Finds related issues for cleanup

**3-Phase Commit Pattern**:
1. **Validation Phase**: All safety checks
2. **Staging Phase**: Reversible (file backup, git staging)
3. **Commit Phase**: Irreversible (git commit, GitHub cleanup, audit log)

**Multi-Gate Confirmation**:
- Primary Confirmation: y/N prompt for all deletions
- Elevated Confirmation: Type "delete" for force mode (orphans active increments)
- GitHub Confirmation: Separate prompt for closing GitHub issues

### What Gets Deleted

✅ Living docs: `.specweave/docs/internal/specs/_features/FS-XXX/FEATURE.md`
✅ User stories: `.specweave/docs/internal/specs/{project}/FS-XXX/us-*.md`
✅ README files: `.specweave/docs/internal/specs/{project}/FS-XXX/README.md`
✅ GitHub issues: Issues matching `[FS-XXX][US-YYY]` pattern (optional)

❌ NOT deleted: Increments (only metadata.json updated if orphaned)

### Modes

**Safe Mode (default)**:
- Blocks deletion if active increments reference feature
- Requires clean git working directory
- Requires explicit confirmation

**Force Mode (`--force`)**:
- Allows deletion with active increments
- Updates orphaned increment metadata.json (removes feature_id)
- Requires elevated confirmation (type "delete")

**Dry-Run Mode (`--dry-run`)**:
- Preview deletion without executing
- Shows all files to be deleted
- Shows git operations
- Shows GitHub issues to be closed

### Audit Logging

All deletions logged to `.specweave/logs/feature-deletions.log` (JSON Lines format):

```json
{
  "featureId": "FS-042",
  "timestamp": "2025-11-24T01:45:00.000Z",
  "user": "john-doe",
  "mode": "safe",
  "filesDeleted": 6,
  "commitSha": "abc123def",
  "githubIssuesClosed": 3,
  "orphanedIncrements": [],
  "status": "success"
}
```

**Log rotation**: Automatically rotates at 10MB threshold.

### Error Handling

**Non-blocking errors** (logged as warnings):
- GitHub API rate limits (exponential backoff retry)
- GitHub issue cleanup failures
- Audit log write failures

**Blocking errors** (prevent deletion):
- Feature not found
- Active increments in safe mode
- Git working directory not clean (without `--no-git`)
- Invalid feature ID format (must be FS-XXX)

### Examples

```bash
# Recommended workflow
specweave delete-feature FS-042 --dry-run    # Preview
specweave delete-feature FS-042              # Execute (with confirmation)

# Force delete feature with active increment 0050
specweave delete-feature FS-042 --force      # Requires typing "delete"

# Delete without git commit (manual git workflow)
specweave delete-feature FS-042 --no-git

# Delete with auto-yes (CI/CD pipelines)
specweave delete-feature FS-042 --yes --dry-run  # Still shows preview
```

### Important Notes

**GitHub Integration**:
- Owner/repo auto-detected from `git remote get-url origin`
- If no GitHub remote → GitHub cleanup silently skipped (non-blocking)
- Pattern detection: `https://github.com/owner/repo.git` or `git@github.com:owner/repo.git`

**No Undo**:
- Deletion is permanent (files deleted from filesystem)
- Recovery: `git log --all --full-history -- path/to/deleted/file` → `git checkout <commit> -- path`
- Audit log: `.specweave/logs/feature-deletions.log` (includes commit SHA)

**Force Mode Risk**:
- Orphaned increments lose `feature_id` in metadata.json
- Breaking change: `/specweave:sync-specs` won't sync orphaned increments
- Recovery: Manually restore `feature_id` in metadata.json

**See**: Increment 0053-safe-feature-deletion for implementation details.

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

