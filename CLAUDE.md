# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: TypeScript CLI (NPM Package)
**Repository**: https://github.com/anton-abyzov/specweave

For **contributors to SpecWeave itself** (not users).

---

## 🚨 CRITICAL SAFETY RULES

### 0. Thinking-Before-Acting Discipline (META RULE!)

**ALWAYS act on your reasoning BEFORE attempting operations that will fail.**

**Anti-pattern**: Running commands you know will fail, then fixing the issue.

```typescript
// ❌ WRONG: Attempt → Predictable failure → Fix
node -e "require('./dist/file.js')"  // Fails (you saw this coming!)
npm run rebuild                       // Then fix

// ✅ CORRECT: Recognize dependency → Fix → Attempt
npm run rebuild                       // Fix first
node -e "require('./dist/file.js')"  // Then succeed
```

**Why**: Wastes time, creates confusion, makes execution harder to follow.

**How to avoid**:
1. **Read your own thinking process** - What dependencies did you identify?
2. **Order operations logically** - Prerequisites BEFORE dependent operations
3. **Catch predictable failures** - If you know it will fail, don't run it yet

**Example patterns to watch for**:
- Running code before compilation (`tsc`, `npm run build`)
- Database queries before migrations/setup
- API calls before authentication
- File operations before directory creation

---

### 1. Local Development Setup

**SpecWeave uses Claude Code's GitHub marketplace** for plugin management. This is the **cross-platform, simple approach** that works on macOS, Linux, and Windows.

#### Quick Start (Recommended - All Platforms)

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/specweave.git
cd specweave
npm install

# 2. Build TypeScript
npm run rebuild

# 3. That's it! Claude Code auto-installs from GitHub marketplace
# Hooks execute from: ~/.claude/plugins/marketplaces/specweave/
```

#### Development Workflow

**How it works**: Claude Code automatically pulls your latest code from GitHub every 5-10 seconds.

```bash
# 1. Make changes in local repo
vim src/core/task-parser.ts

# 2. Build TypeScript changes
npm run rebuild

# 3. Test locally
npm test

# 4. Commit and push to your branch
git add . && git commit -m "feat: new feature"
git push origin develop

# 5. Wait 5-10 seconds → Claude Code auto-updates marketplace

# 6. Test in Claude Code
/specweave:increment "test feature"
# Your latest hooks now execute automatically!
```

**For hook-only changes** (no TypeScript build needed):
```bash
vim plugins/specweave/hooks/post-task-completion.sh
git add . && git commit -m "fix: improve hook logic"
git push origin develop
# Wait 5-10 seconds → hooks updated!
```

**Key Benefits**:
- ✅ **Cross-platform** (works on Windows, no admin privileges needed)
- ✅ **Simple** (standard git workflow, no scripts)
- ✅ **Reliable** (Claude Code manages updates, no symlink race conditions)
- ✅ **Team-friendly** (everyone gets updates automatically)

#### Testing Unpushed Changes (Advanced)

**Option 1: Temporary Branch** (Recommended)
```bash
# Create throwaway test branch
git checkout -b temp-test-$(date +%s)
git add . && git commit -m "temp: testing unpushed changes"
git push origin temp-test-1234567890

# Claude Code pulls from your test branch (5-10 seconds)
# Test your changes...

# Clean up when done
git push origin --delete temp-test-1234567890
git checkout develop && git branch -D temp-test-1234567890
```

**Option 2: Fork-Based Development**
```bash
# One-time: Point Claude Code to your fork
claude plugin marketplace remove specweave
claude plugin marketplace add github:YOUR_USERNAME/specweave

# Now push to your fork's branch
git push origin develop
# Claude Code pulls from YOUR fork, not upstream
```

**Option 3: Symlink Mode** (Advanced, Unix-Only)
If you need **instant updates** without pushing (e.g., rapid hook iteration):
- See: `.specweave/docs/internal/advanced/symlink-dev-mode.md`
- ⚠️ **Warning**: Only works on macOS/Linux, not Windows
- ⚠️ Requires bash scripts, registry manipulation, ongoing maintenance

#### NPM Testing Mode (End-User Experience)

To test the published npm package as end-users experience it:

```bash
# 1. Install global npm package
npm install -g specweave

# 2. Test in fresh directory
cd /tmp && mkdir test-project && cd test-project
specweave init .
# ... test end-user workflows ...

# 3. Resume development
cd /path/to/specweave/repo
# Claude Code automatically switches back to marketplace mode
```

### 2. NEVER Pollute Increment Folders

**ONLY 4 files allowed in `.specweave/increments/####/` root**:
- `spec.md`, `plan.md`, `tasks.md`, `metadata.json`

**Everything else → subfolders**:
- `reports/` - Analysis, completion reports, validation
- `scripts/` - Helper scripts, automation
- `logs/` - Execution logs, debug output

**Examples**:
```bash
# ❌ WRONG
.specweave/increments/0046/analysis-report.md

# ✅ CORRECT
.specweave/increments/0046/reports/analysis-report.md

# Fix before committing:
mkdir -p .specweave/increments/0046/reports
mv .specweave/increments/0046/*.md .specweave/increments/0046/reports/
git restore .specweave/increments/0046/{spec,plan,tasks}.md
```

### 3. NEVER Delete .specweave/ Directories

**Protected**: `.specweave/docs/`, `.specweave/increments/`

**Pre-commit hook blocks**:
- `rm -rf .specweave/docs` or `rm -rf .specweave/increments`
- Deletion of 50+ files at once in these directories

**If accidental deletion**:
```bash
git restore .specweave/
```

### 4. Test Cleanup Safety (MANDATORY)

**Danger**: `rm -rf` with wrong `pwd` = delete entire test suite.

**REQUIRED steps before any `rm -rf`**:
1. Verify `pwd` (MUST be project root)
2. Dry-run with `-print` (NO deletion)
3. Count files/directories to delete
4. Manual confirmation (type "DELETE")
5. Execute deletion
6. Verify results
7. Run tests

**Never** use `rm -rf` without ALL safety checks above.

### 5. NEVER Use `specweave init . --force`

**Danger**: Deletes ALL increments and docs without backup (unless you bypass warnings).

**Safe alternative**:
```bash
specweave init .  # Interactive, never deletes without confirmation
```

### 6. Increment Completion Validation

**NEVER** mark increment "completed" without:
1. All acceptance criteria checked (`- [x] **AC-...`)
2. All tasks completed
3. All tests passing
4. Coverage target met

**Always use**: `/specweave:done 0043` (validates before closing)
**Never**: Manual `metadata.json` edit (blocked by pre-commit hook)

### 7. Source of Truth: tasks.md and spec.md (CRITICAL!)

**THE MOST CRITICAL RULE**: Internal TODO lists are ONLY for tracking work during execution. The SOURCE OF TRUTH is ALWAYS:
1. **tasks.md** - Task completion status (`[x]` checkboxes)
2. **spec.md** - Acceptance criteria status (`[x]` checkboxes)

**MANDATORY Workflow When Using TodoWrite Tool**:

```
For EVERY task marked complete in internal TODO:
1. ✅ Mark task as completed in internal TODO
2. ⚠️  IMMEDIATELY update tasks.md checkbox: `[ ] pending` → `[x] completed`
3. ⚠️  IMMEDIATELY update spec.md AC checkbox: `[ ]` → `[x]`
4. ✅ Verify both files updated BEFORE moving to next task
```

**Example of CORRECT workflow**:
```typescript
// Step 1: Complete the work
await createIntegrationTest();

// Step 2: Update internal TODO
TodoWrite([{task: "T-013", status: "completed"}]);

// Step 3: IMMEDIATELY update tasks.md (NEVER skip this!)
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");

// Step 4: IMMEDIATELY update spec.md ACs
Edit("spec.md", "- [ ] **AC-US1-01**", "- [x] **AC-US1-01**");

// Step 5: Move to next task
```

**❌ CRITICAL ERROR - Never Do This**:
```typescript
// ❌ WRONG: Marking TODO as complete WITHOUT updating source files
TodoWrite([
  {task: "T-013", status: "completed"},  // ❌ Only internal tracking
  {task: "T-014", status: "completed"},  // ❌ Only internal tracking
  {task: "T-015", status: "completed"}   // ❌ Only internal tracking
]);
// tasks.md still shows `[ ] pending` → DESYNC!
// This is a CRITICAL VIOLATION!
```

**Pre-Closure Validation** (MANDATORY before `/specweave:done`):
```bash
# 1. Verify ALL tasks marked in tasks.md
grep "^\*\*Status\*\*:" tasks.md | grep -c "\[x\] completed"
# Output MUST equal total_tasks in frontmatter

# 2. Verify ALL ACs checked in spec.md
grep -c "^- \[x\] \*\*AC-" spec.md
# Output MUST equal total ACs

# 3. Only then close increment
/specweave:done 0044
```

**Why This Matters**:
- Internal TODO is ephemeral (lost between sessions)
- tasks.md is permanent source of truth
- spec.md is contract with stakeholders
- Desync = broken promises to users/team

**Incident Reference**: 2025-11-19 - Increment 0044 was incorrectly closed with tasks.md showing `[ ] pending` while internal TODO showed "completed". This violated SpecWeave's core principle. See `.specweave/increments/0044-integration-testing-status-hooks/reports/INCIDENT-SOURCE-OF-TRUTH-VIOLATION.md` for full post-mortem.

### 7a. Status Line Synchronization (AUTOMATIC & ENFORCED!)

**CRITICAL**: Status line MUST ALWAYS reflect current task completion status.

**How It Works** (Automatic):
1. Every TodoWrite call → `post-task-completion.sh` hook fires
2. Hook calls `update-status-line.sh` → cache updates
3. Status line displays updated progress immediately

**The ONLY Way to Complete Tasks**:
```
ALWAYS use TodoWrite when working on increment tasks!
- TodoWrite triggers hooks automatically
- Hooks update status line cache
- Status line stays synchronized
```

**❌ NEVER Complete Tasks Without TodoWrite**:
```typescript
// ❌ WRONG: Direct Edit without TodoWrite
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");
// Status line will NOT update! Hook never fires!

// ✅ CORRECT: TodoWrite triggers automatic update
TodoWrite([{task: "T-001", status: "in_progress"}]);
// ... do the work ...
TodoWrite([{task: "T-001", status: "completed"}]);
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");
// Hook fires → status line updates automatically!
```

**Validation Commands**:
```bash
# Check if status line is in sync
/specweave:validate-status

# Manual update (emergency only)
bash plugins/specweave/hooks/lib/update-status-line.sh

# Validate all increments
npx tsx src/core/status-line-validator.ts
```

**Detection & Recovery**:
- Pre-commit hook validates sync (blocks commit if desync detected)
- `/specweave:done` validates before closing (blocks if desync)
- Automatic tests verify hook fires correctly

**Why This Matters**:
- Status line is visible to user at ALL times
- Stale status = broken trust
- Hooks ensure atomic updates (task complete → status updates together)

**Incident Reference**: 2025-11-20 - Status line showed 21/52 tasks when actually 26/52 were complete (10% desync). Root cause: Tasks marked complete without using TodoWrite, so hooks never fired. Added validation layer and tests to prevent future occurrences.

### 7b. GitHub Duplicate Prevention (CRITICAL!)

**CRITICAL**: External tool items (GitHub issues, JIRA tickets, ADO work items) MUST NEVER be duplicated.

**Rule**: ALWAYS use DuplicateDetector for GitHub issue creation.

**Why This Matters**:
- GitHub search has eventual consistency (2-5 second lag)
- Race conditions can create duplicates if sync runs multiple times quickly
- Manual search with `--limit 1` hides duplicates

**The ONLY Way to Create GitHub Issues**:
```typescript
import { DuplicateDetector } from './duplicate-detector.js';

// ✅ CORRECT: Use DuplicateDetector.createWithProtection()
const titlePattern = `[${featureId}][${userStory.id}]`;  // e.g., "[FS-047][US-001]"
const result = await DuplicateDetector.createWithProtection({
  title: issueContent.title,
  body: issueContent.body,
  titlePattern,
  labels: issueContent.labels,
  milestone: milestoneTitle,
  repo: `${owner}/${repo}`
});

// Provides automatic:
// ✅ Phase 1 (Detection): Search for existing before create
// ✅ Phase 2 (Verification): Count-check after creation
// ✅ Phase 3 (Reflection): Auto-close duplicates, keep oldest

// ❌ WRONG: Manual gh issue create (no duplicate protection!)
execSync('gh issue create --title "..." --body "..."');
```

**3-Phase Protection**:
1. **Detection** - Search GitHub for existing issues BEFORE creating
2. **Verification** - Count-check AFTER creation (handles eventual consistency)
3. **Reflection** - Auto-close duplicates if detected, keep oldest

**Search Limits** (CRITICAL!):
```typescript
// ❌ WRONG: --limit 1 hides duplicates!
gh issue list --search "[FS-047][US-001] in:title" --limit 1
// Returns ONLY 1 result even if 10 duplicates exist!

// ✅ CORRECT: --limit 50 detects duplicates
gh issue list --search "[FS-047][US-001] in:title" --limit 50
// Returns up to 50 results, enabling duplicate detection
```

**Cleanup Existing Duplicates**:
```bash
# Preview what will be cleaned up:
bash scripts/cleanup-duplicate-github-issues.sh --dry-run

# Actually close duplicates (keeps oldest):
bash scripts/cleanup-duplicate-github-issues.sh
```

**Validation**:
```bash
# Check for duplicates:
gh issue list --json title,createdAt --limit 100 | \
  jq -r '.[] | .title' | sort | uniq -d

# If output is empty → No duplicates! ✅
# If output shows titles → Duplicates exist, investigate!
```

**Why This Matters**:
- Incident 2025-11-20: 10+ duplicate User Story issues created
- Root Cause #1: Race condition (GitHub search eventual consistency lag)
- Root Cause #2: `--limit 1` bug (hid duplicates in search results)
- Root Cause #3: No post-create verification
- **Fix**: DuplicateDetector integration (github-feature-sync.ts:149-227)

**Protected Files**:
- `plugins/specweave-github/lib/github-feature-sync.ts` - Uses DuplicateDetector
- `plugins/specweave-github/lib/duplicate-detector.ts` - 3-phase protection
- `plugins/specweave-github/lib/github-client-v2.ts` - Fixed --limit 50

**Incident Reference**: 2025-11-20 - Duplicate GitHub issues for User Stories ([SP-US-006], [SP-US-007], etc.). Root cause: Race conditions + --limit 1 bug + missing DuplicateDetector integration. Fixed by implementing 3-phase protection. See `.specweave/increments/0047-us-task-linkage/reports/DUPLICATE-GITHUB-ISSUES-ROOT-CAUSE.md`.

### 8. NEVER Use `console.*` in Production Code

**Rule**: ALL `src/` code MUST use logger abstraction, NEVER `console.log/error/warn`.

**Why**: `console.*` pollutes test output even when errors are expected and properly handled.

**Use logger injection**:
```typescript
import { Logger, consoleLogger } from '../../utils/logger.js';

export class MyClass {
  private logger: Logger;

  constructor(options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  doSomething() {
    this.logger.log('Info message');
    this.logger.error('Error message', error);
  }
}
```

**In tests, use `silentLogger`**:
```typescript
import { silentLogger } from '../../src/utils/logger.js';

const instance = new MyClass({ logger: silentLogger });
```

**Protection**: Code review + search before commit:
```bash
# Check for console.* in src/ before committing:
git diff --cached --name-only | grep '^src/.*\.ts$' | xargs grep -n 'console\.' 2>/dev/null
```

**Exception: CLI Commands (User-Facing Output)**:

CLI commands in `src/cli/commands/*.ts` are 99% user-facing output (colored messages, progress indicators, confirmations). These files may keep `console.*` calls with proper documentation:

```typescript
export async function myCommand(options: CommandOptions = {}) {
  // Initialize logger (injectable for testing)
  const logger = options.logger ?? consoleLogger;

  // NOTE: This CLI command is primarily user-facing output (console.log/console.error).
  // All console.* calls in this file are legitimate user-facing exceptions
  // as defined in CONTRIBUTING.md (colored messages, confirmations, formatted output).
  // Logger infrastructure available for future internal debug logs if needed.

  // User-facing output (keeps console.log)
  console.log(chalk.green('✅ Operation successful!'));

  // Internal debug logs (use logger)
  logger.log('Internal state updated');
}
```

**Pre-commit hook allows files with documentation marker**:
- Files with comment `"user-facing output"` or `"legitimate user-facing exceptions"` bypass console.* check
- Pre-commit hook: `scripts/pre-commit-console-check.sh`
- See: `.specweave/increments/0046-console-elimination/` for migration pattern

### 8a. NEVER Use `fs-extra` (Native fs Migration)

**Rule**: ALL code MUST use native Node.js `fs` module, NEVER `fs-extra`.

**Why**: `fs-extra` causes hook failures when not installed. Native fs is faster, smaller, and always available.

**Migration completed**: 2025-11-20 - All hooks converted to native fs

**Correct usage**:
```typescript
// ✅ CORRECT - Native fs (sync operations)
import { existsSync, readFileSync, statSync } from 'fs';

if (existsSync(configPath)) {
  const content = readFileSync(configPath, 'utf-8');
  const stats = statSync(configPath);
}
```

```typescript
// ✅ CORRECT - Native fs (async operations)
import { promises as fs } from 'fs';

const content = await fs.readFile(configPath, 'utf-8');
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(filePath, content, 'utf-8');
```

```typescript
// ✅ CORRECT - Custom utilities (from utils/fs-native.js)
import { mkdirpSync, writeJsonSync, readJsonSync } from '../utils/fs-native.js';

mkdirpSync(dir);                                  // Create directory recursively
writeJsonSync(path, data);                        // Write JSON file
const config = readJsonSync(configPath);         // Read JSON file
```

**Migration guide (fs-extra → native fs)**:
```typescript
// ❌ WRONG (fs-extra)
import fs from 'fs-extra';

fs.existsSync(path);              → existsSync(path)
fs.readFileSync(path, 'utf-8');   → readFileSync(path, 'utf-8')
fs.statSync(path);                → statSync(path)
await fs.readFile(path, 'utf-8'); → await fs.readFile(path, 'utf-8')
await fs.ensureDir(dir);          → await fs.mkdir(dir, { recursive: true })
                                      OR mkdirpSync(dir) for sync
await fs.writeFile(path, content); → await fs.writeFile(path, content, 'utf-8')
fs.removeSync(path);              → removeSync(path) from fs-native.js
await fs.copy(src, dest);         → await fs.cp(src, dest, { recursive: true })
```

**Prevention**:
1. **Pre-commit hook**: `scripts/pre-commit-fs-extra-check.sh` blocks fs-extra imports
2. **Installation**: Hook installed automatically via `bash scripts/install-git-hooks.sh`
3. **Legacy marker**: Add `// legacy fs-extra` comment to bypass check (temporary only)

**Testing**:
```bash
# Verify no fs-extra in hooks
grep -r "from 'fs-extra'" plugins/*/lib/hooks/*.js

# Should return nothing (empty output)
```

**Incident Reference**: 2025-11-20 - Hook failures due to fs-extra dependency. All hooks converted to native fs. Pre-commit hook added to prevent regression.

### 9. Coding Standards

**Full standards**: `.specweave/docs/internal/governance/coding-standards.md`
**Auto-discovery**: Runs during brownfield analysis or `/specweave:analyze-standards`

**Critical rules (enforced during code generation)**:

1. ✅ **NEVER use `console.*`** - Use logger abstraction (already enforced above)
2. ✅ **ALWAYS import with `.js` extensions** - Required for ESM (already enforced in Build section)
3. ✅ **Test files MUST use `.test.ts`** suffix, never `.spec.ts` (already enforced in Testing section)
4. **Avoid `any` type** - Use specific types or generics
5. **Functions < 50 lines** (ideal), < 100 lines (max)
6. **Use custom error types**, not generic Error
7. **Comment "why" not "what"**
8. **No hardcoded secrets** - Use environment variables
9. **No N+1 queries** - Batch database operations
10. **Naming**: camelCase (vars), PascalCase (classes), UPPER_SNAKE_CASE (constants)

**Auto-discovery features**:
- **Brownfield projects**: Standards auto-detected during project analysis
- **Manual analysis**: `/specweave:analyze-standards` - Generate comprehensive standards report
- **Drift detection**: `/specweave:analyze-standards --drift` - Check compliance with declared standards
- **Update standards**: `/specweave:analyze-standards --update` - Update official standards from analysis

**How it works**:
1. Scans codebase (src/**/*.ts) for naming patterns, import styles, function characteristics
2. Parses ESLint, Prettier, TypeScript configs for enforced rules
3. Analyzes existing CLAUDE.md, CONTRIBUTING.md for declared standards
4. Generates evidence-based standards with confidence levels (90%+ = HIGH confidence)
5. Detects anti-patterns: hardcoded secrets, large files (>500 lines), missing error handling
6. Outputs to `.specweave/docs/internal/governance/coding-standards-analysis.md`

**Note**: Most standards are enforced by ESLint/Prettier. This list focuses on SpecWeave-specific rules and patterns that can't be auto-fixed by linters.

### 10. GitHub Issue Format Policy (v0.24.0+)

**CRITICAL**: ALL GitHub issues MUST use User Story-level format.

**ONLY Correct Format**:
```
[FS-XXX][US-YYY] User Story Title
```

**Examples**:
- ✅ `[FS-043][US-001] Status Line Shows Correct Active Increment`
- ✅ `[FS-047][US-002] AC-Task Mapping`

**Incorrect Formats** (NEVER use):
- ❌ `[FS-047]` (Feature-only, missing US-ID)
- ❌ `[SP-US-006]` (SP prefix, missing Feature ID)
- ❌ `[SP-FS-047-specweave]` (SP prefix, project name)
- ❌ `[INC-0047]` (Increment-only)

**How to Create Issues**:
```bash
# CORRECT way (creates [FS-XXX][US-YYY] issues)
node -e "
const { GitHubFeatureSync } = require('./dist/plugins/specweave-github/lib/github-feature-sync.js');
const { GitHubClientV2 } = require('./dist/plugins/specweave-github/lib/github-client-v2.js');

const client = GitHubClientV2.fromRepo('anton-abyzov', 'specweave');
const sync = new GitHubFeatureSync(client, '.specweave/docs/internal/specs', process.cwd());
sync.syncFeatureToGitHub('FS-047').then(console.log).catch(console.error);
"

# WRONG way (deprecated, creates [FS-XXX] issues)
/specweave:increment "feature"  # ← This no longer creates GitHub issues
```

**Why This Matters**:
- **Features** are tracked via GitHub **Milestones** (not Issues)
- **User Stories** are tracked via GitHub **Issues**
- **Tasks** are tracked as **checkboxes** in User Story issue body

**Architecture**:
```
Feature (FS-047)
  ↓ GitHub Milestone #13
  ├─ User Story (US-001) → GitHub Issue #638: [FS-047][US-001] Title
  ├─ User Story (US-002) → GitHub Issue #639: [FS-047][US-002] Title
  └─ User Story (US-003) → GitHub Issue #640: [FS-047][US-003] Title
```

**Deprecated Mechanisms**:
- ❌ `post-increment-planning.sh` hook (disabled by default)
- ❌ `update-epic-github-issue.sh` script (deprecated)
- ❌ `generate-epic-issue-body.ts` script (deprecated)

These created Feature-only issues with format `[FS-XXX]` which is INCORRECT.

**Hooks Disabled**:
- Increment-level GitHub sync in `post-increment-planning.sh` (disabled unless `SPECWEAVE_ENABLE_INCREMENT_GITHUB_SYNC=true`)
- Epic sync in `post-task-completion.sh` (disabled unless `SPECWEAVE_ENABLE_EPIC_SYNC=true`)

**See Also**:
- `.specweave/increments/0047-us-task-linkage/reports/GITHUB-TITLE-FORMAT-FIX-PLAN.md`
- `plugins/specweave-github/lib/user-story-issue-builder.ts:94`

### 11. Task Format with US-Task Linkage (v0.23.0+)

**CRITICAL**: ALL tasks MUST include User Story linkage fields for proper traceability.

**New Task Format** (increment 0047+):
```markdown
### T-001: Task Title

**User Story**: US-001                        ← MANDATORY: Link to parent User Story
**Satisfies ACs**: AC-US1-01, AC-US1-02      ← MANDATORY: AC coverage mapping
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 6 hours

**Description**: Detailed task description...

**Implementation Steps**:
1. Step one
2. Step two

**Test Plan**:
- **File**: `tests/unit/component.test.ts`
- **Tests**: TC-001, TC-002

**Files Affected**:
- `src/path/to/file.ts`
```

**Why This Matters**:
- **Traceability**: Navigate Task ↔ User Story ↔ Acceptance Criteria ↔ Feature
- **Living Docs Sync**: Automatic task list updates in living docs US files
- **AC Coverage**: Validation ensures all acceptance criteria have implementing tasks
- **Progress Tracking**: Show per-US completion (e.g., "US-001: 8/11 tasks, 73%")

**Hierarchical Structure**:
```markdown
## User Story: US-001 - User Authentication

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Tasks**: 11 total, 8 completed

### T-001: Implement login API
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
...

### T-002: Add JWT token generation
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
...
```

**Validation Rules**:
1. `userStory` field MUST reference valid US-ID from spec.md (format: `US-XXX`)
2. `satisfiesACs` field MUST list valid AC-IDs from spec.md (format: `AC-USXX-YY`)
3. AC-IDs MUST belong to correct User Story (AC-US1-XX belongs to US-001)
4. Tasks without US linkage trigger warnings during `/specweave:validate`
5. `/specweave:done` blocks closure if orphan tasks exist (no AC coverage)

**Living Docs Auto-Sync**:
When task marked completed in tasks.md:
1. Hook detects change via `post-task-completion.sh`
2. `sync-living-docs.js` parses tasks with `parseTasksWithUSLinks()`
3. Updates living docs US file:
   - Task list: `- [x] [T-001](link): Task title`
   - AC checkboxes: `- [x] **AC-US1-01**` (if all tasks complete)

**Backward Compatibility**:
- Old increments (0001-0046) work without US linkage
- Parser supports both formats (graceful degradation)
- Migration tool available: `npx tsx scripts/migrate-task-linkage.ts <increment-id>`

**See Also**:
- Implementation: `.specweave/increments/0047-us-task-linkage/`
- Proposal: `.specweave/increments/0046-console-elimination/reports/US-TASK-LINKAGE-PROPOSAL.md`
- Living Docs: `.specweave/docs/public/guides/bidirectional-linking.md`

### 12. ADR Naming Convention (CRITICAL!)

**Architecture Decision Records (ADRs) MUST follow strict naming convention**:

**Correct Format**:
- **Filename**: `XXXX-decision-title.md` (4-digit number, kebab-case, NO `adr-` prefix)
- **Header**: `# ADR-XXXX: Decision Title` (includes `ADR-` prefix for document clarity)
- **Location**: `.specweave/docs/internal/architecture/adr/`

**Examples**:
```
✅ CORRECT:
  Filename: 0007-github-first-task-sync.md
  Header:   # ADR-0007: GitHub-First Task-Level Synchronization

✅ CORRECT:
  Filename: 0032-universal-hierarchy-mapping.md
  Header:   # ADR-0032: Universal Hierarchy Mapping

❌ WRONG:
  Filename: adr-0007-github-first-task-sync.md  (NO adr- prefix!)
  Reason:   Redundant (already in /adr/ directory)

❌ WRONG:
  Filename: ADR-0007-github-first-task-sync.md  (uppercase)
  Reason:   Filenames must be lowercase

❌ WRONG:
  Filename: 007-github-first-task-sync.md  (3-digit)
  Reason:   MUST be 4-digit (0001-9999)
```

**Why This Matters**:
- **Consistency**: All ADRs follow same pattern (sortable, predictable)
- **Clarity**: File location indicates type (in `/adr/` directory)
- **Tooling**: Scripts expect 4-digit format for auto-numbering
- **Cross-references**: Links use `adr/XXXX-name.md` format

**Enforcement**:
- Architect agent validates format before creating ADRs
- Pre-commit hook checks for `adr-XXXX-*.md` pattern and rejects
- `/specweave:validate` command verifies ADR naming

**Common Mistakes**:
1. Adding `adr-` prefix to filename (copying from header)
2. Using 3-digit numbers instead of 4-digit (001 vs 0001)
3. Uppercase filenames (ADR-0007 vs 0007)
4. Missing kebab-case (spaces or underscores instead of hyphens)

**Auto-Numbering**:
To find next available ADR number (handles duplicates correctly):
```bash
ls .specweave/docs/internal/architecture/adr/*.md | \
  grep -E '/[0-9]{4}-' | \
  sed 's/.*\/\([0-9][0-9][0-9][0-9]\)-.*/\1/' | \
  sort -u | \
  tail -1 | \
  awk '{printf "Next ADR: %04d\n", $1 + 1}'
# Output: Next ADR: 0049
# (Extracts unique numbers only, finds max, adds 1)
```

### 13. Archiving Logic Anti-Patterns (CRITICAL!)

**NEVER use string search or substring matching for structured data matching**

#### Anti-Pattern #1: String Search for Frontmatter Fields

```typescript
// ❌ WRONG: Matches ANYWHERE in file (false positives!)
const content = await fs.readFile('spec.md', 'utf-8');
if (content.includes('FS-039')) {
  // This matches:
  // - feature_id: FS-039 ✓ (correct)
  // - "See FS-039 for details" ✗ (FALSE POSITIVE!)
  // - [Related](FS-039) ✗ (FALSE POSITIVE!)
}

// ✅ CORRECT: Parse frontmatter explicitly
const featureIdMatch = content.match(/^feature_id:\s*["']?([^"'\n]+)["']?$/m);
if (featureIdMatch && featureIdMatch[1].trim() === 'FS-039') {
  // Only matches actual frontmatter field
}
```

#### Anti-Pattern #2: Substring Matching for IDs

```typescript
// ❌ WRONG: Substring matching (false positives!)
const isArchived = archivedList.some(item => item.includes(searchId));
// "0039-ultra-smart-v2".includes("0039-ultra-smart") → TRUE (WRONG!)

// ✅ CORRECT: Exact equality
const isArchived = archivedList.some(item => item === searchId);
```

**Why This Matters**:
- **Incident 2025-11-20**: String search caused 11 features to be incorrectly archived
- Features that merely REFERENCED another feature appeared to BELONG to it
- Substring matching confused similar IDs as identical

**Prevention**:
1. Always parse structured data (YAML frontmatter, JSON) explicitly
2. Use exact equality (`===`) for ID matching, never `.includes()`
3. Add comprehensive logging to show matching decisions
4. Test with edge cases: references, links, partial matches

**See Also**: `.specweave/increments/0047-us-task-linkage/reports/CRITICAL-ARCHIVING-BUGS-FIX.md`

### 14. Marketplace Plugin Completeness (CRITICAL!)

**NEVER add incomplete plugins to `.claude-plugin/marketplace.json`**

**Rule**: ONLY plugins with complete implementation (agents/, commands/, or lib/) may be listed in marketplace.json.

**Why This Matters**:
When users install `npm i -g specweave`, Claude Code loads ALL plugins listed in marketplace.json. Incomplete plugins (skeleton-only with just skills/) cause loading errors that confuse users and damage the framework's reputation.

**Incomplete Plugin Definition**:
A plugin is considered INCOMPLETE if it ONLY has:
- `.claude-plugin/` directory
- `skills/` directory

A plugin is COMPLETE if it has ANY of:
- `agents/` directory (specialized Claude Code agents)
- `commands/` directory (slash commands)
- `lib/` directory (shared utilities, TypeScript implementations)

**Validation Process** (MANDATORY before ANY marketplace.json changes):

```bash
# 1. Run validation script
bash scripts/validate-marketplace-plugins.sh

# Expected output: "✅ VALIDATION PASSED!"
# If FAILED: Remove incomplete plugins from marketplace.json
```

**Examples**:

```bash
# ✅ COMPLETE plugins (may be listed in marketplace.json):
plugins/specweave-github/
  ├── .claude-plugin/
  ├── agents/          ← Has agents
  ├── commands/        ← Has commands
  ├── lib/             ← Has lib
  └── skills/

plugins/specweave-kafka/
  ├── .claude-plugin/
  ├── agents/          ← Has agents
  ├── lib/             ← Has lib
  └── skills/

# ✗ INCOMPLETE plugins (MUST NOT be listed in marketplace.json):
plugins/specweave-cost-optimizer/
  ├── .claude-plugin/
  └── skills/          ← ONLY skills!

plugins/specweave-figma/
  ├── .claude-plugin/
  └── skills/          ← ONLY skills!
```

**Adding New Plugins**:

```bash
# 1. Create plugin with COMPLETE structure
mkdir -p plugins/specweave-newplugin/{.claude-plugin,agents,skills}

# 2. Implement at least ONE of: agents/, commands/, or lib/
# (Don't just create empty directories!)

# 3. Add to marketplace.json
vim .claude-plugin/marketplace.json

# 4. VALIDATE (this is CRITICAL!)
bash scripts/validate-marketplace-plugins.sh

# 5. Update bin/fix-marketplace-errors.sh
vim bin/fix-marketplace-errors.sh
# Add "specweave-newplugin" to plugins=(...) array

# 6. Commit
git add .claude-plugin/marketplace.json bin/fix-marketplace-errors.sh
git commit -m "feat: add specweave-newplugin to marketplace"
```

**Pre-Commit Hook** (TODO - add this):
```bash
# .git/hooks/pre-commit should run:
bash scripts/validate-marketplace-plugins.sh
# Block commit if validation fails
```

**Incident History**:
- **2025-11-20**: Global npm install caused 8 incomplete plugins to fail loading, generating confusing errors for users. Root cause: marketplace.json listed skeleton plugins that weren't ready for distribution.

**Prevention**:
1. Run `bash scripts/validate-marketplace-plugins.sh` before EVERY marketplace.json change
2. NEVER add plugins to marketplace.json until they have agents/, commands/, or lib/
3. Update bin/fix-marketplace-errors.sh whenever marketplace.json changes
4. Test global npm install (`npm pack && npm i -g ./specweave-*.tgz`) before releases

**See Also**:
- Validation script: `scripts/validate-marketplace-plugins.sh`
- Fix script: `bin/fix-marketplace-errors.sh`

### 15. Skills vs Agents: Understanding the Distinction (CRITICAL!)

**NEVER confuse skills with agents** - They are different components with different invocation methods.

**The Problem**:
Empty agent directories cause "Agent type not found" errors when someone tries to invoke them. This happened with `specweave:increment-quality-judge-v2` which existed as a skill but had an empty agent directory.

**Key Differences**:

| Aspect | Skills | Agents |
|--------|--------|--------|
| **Location** | `plugins/*/skills/name/SKILL.md` | `plugins/*/agents/name/AGENT.md` |
| **Invocation** | Skill tool or slash commands | Task tool with `subagent_type` |
| **Activation** | Automatic (based on keywords) | Explicit (you call them) |
| **Required File** | `SKILL.md` with YAML frontmatter | `AGENT.md` or agent config |
| **Purpose** | Expand context with knowledge | Execute multi-step tasks |

**Correct Invocation Examples**:

```typescript
// ✅ CORRECT: Invoking a skill
Skill({ skill: "increment-quality-judge-v2" });
// OR use slash command:
/specweave:qa 0047

// ✅ CORRECT: Invoking an agent
Task({
  subagent_type: "specweave:qa-lead:qa-lead",
  prompt: "Create test plan for increment 0047"
});

// ❌ WRONG: Trying to invoke skill as agent
Task({
  subagent_type: "specweave:increment-quality-judge-v2",  // ERROR!
  prompt: "Quality assessment"
});
```

**Agent Naming Convention** (CRITICAL!):

Claude Code agents follow a strict naming pattern for `subagent_type`:

**Directory-based agents**: `{plugin-name}:{directory-name}:{name-from-yaml}`

Examples:
- Agent at `plugins/specweave/agents/qa-lead/AGENT.md` with `name: qa-lead`
  → Invoke as: `specweave:qa-lead:qa-lead`
- Agent at `plugins/specweave/agents/pm/AGENT.md` with `name: pm`
  → Invoke as: `specweave:pm:pm`
- Agent at `plugins/specweave/agents/architect/AGENT.md` with `name: architect`
  → Invoke as: `specweave:architect:architect`

**Why the "duplication"?**
The pattern is `{plugin}:{directory}:{yaml-name}`. When the directory name matches the YAML `name` field (best practice), it creates the appearance of duplication: `qa-lead:qa-lead`.

**File-based agents** (legacy pattern):
- Agent at `plugins/specweave/agents/code-reviewer.md`
  → Invoke as: `specweave:code-reviewer` (no duplication)

**How to find the correct agent type**:
```bash
# List all available agents
ls -la plugins/specweave/agents/

# Check YAML name field
head -5 plugins/specweave/agents/qa-lead/AGENT.md
# Output: name: qa-lead

# Construct agent type: specweave:qa-lead:qa-lead
```

**Common Mistakes**:
```typescript
// ❌ WRONG: Missing the directory/name duplication
Task({ subagent_type: "specweave:qa-lead", ... });
// Error: Agent type 'specweave:qa-lead' not found

// ✅ CORRECT: Full pattern with duplication
Task({ subagent_type: "specweave:qa-lead:qa-lead", ... });
```

**Directory Structure Requirements**:

```bash
# ✅ CORRECT: Skill with SKILL.md
plugins/specweave/skills/increment-quality-judge-v2/
  └── SKILL.md  (with YAML frontmatter)

# ✅ CORRECT: Agent with AGENT.md
plugins/specweave/agents/qa-lead/
  └── AGENT.md

# ❌ WRONG: Empty agent directory
plugins/specweave/agents/increment-quality-judge-v2/
  (empty - no AGENT.md!)

# ❌ WRONG: Skill missing SKILL.md
plugins/specweave/skills/my-skill/
  └── some-file.txt  (not SKILL.md!)
```

**SKILL.md Format** (MANDATORY):
```yaml
---
name: skill-name
description: What it does AND trigger keywords. Include all variations.
---

# Skill Content

Your skill documentation here...
```

**Validation** (MANDATORY before commits):

```bash
# Check for empty/invalid directories
bash scripts/validate-plugin-directories.sh

# Auto-fix empty directories
bash scripts/validate-plugin-directories.sh --fix

# This catches:
# - Empty agent/skill directories
# - Missing SKILL.md files
# - Missing YAML frontmatter
# - Invalid plugin structures
```

**Common Mistakes**:

1. **Creating empty agent directories during scaffolding**
   ```bash
   # ❌ WRONG
   mkdir -p plugins/specweave/agents/new-agent
   git add . && git commit  # Empty directory!

   # ✅ CORRECT
   mkdir -p plugins/specweave/agents/new-agent
   echo "---" > plugins/specweave/agents/new-agent/AGENT.md
   # ... add agent content ...
   git add . && git commit
   ```

2. **Copying skill as agent without changing structure**
   - Skills need `SKILL.md` with YAML
   - Agents need `AGENT.md` or config
   - Don't copy-paste between them!

3. **Using wrong invocation method**
   - Check available skills: Skills list in context
   - Check available agents: Error message shows all agents
   - Skills → Skill tool or slash commands
   - Agents → Task tool

**When to Use Skills vs Agents**:

**Use Skills when**:
- Providing domain knowledge (e.g., Kafka best practices)
- Expanding Claude's context with project-specific info
- Explaining concepts, patterns, frameworks
- Want automatic activation based on keywords

**Use Agents when**:
- Need multi-step task execution (e.g., generate docs)
- Require specialized sub-agent capabilities
- Building complex workflows with tools
- Want explicit control over when they run

**Incident History**:
- **2025-11-20**: `specweave:increment-quality-judge-v2` agent invocation failed because only skill existed. Empty agent directory caused "Agent type not found" error. Fixed by removing empty directory and documenting distinction.

**Prevention**:
1. Run `bash scripts/validate-plugin-directories.sh` before commits
2. Never create empty agent/skill directories
3. Always include required files (SKILL.md, AGENT.md)
4. Test invocation method matches component type
5. Use pre-commit hook (blocks invalid structures)

**See Also**:
- Validation script: `scripts/validate-plugin-directories.sh`
- Skills index: `plugins/specweave/skills/SKILLS-INDEX.md`
- Claude Code Skills docs: `~/CLAUDE.md` (Personal skills reference)

### 16. YAML Frontmatter Validation (CRITICAL!)

**Rule**: ALL spec.md files MUST have valid YAML frontmatter with required fields.

**Required Format**:
```yaml
---
increment: 0001-feature-name  # REQUIRED: 4-digit number + kebab-case
title: Feature Title           # OPTIONAL: Human-readable title
feature_id: FS-001            # OPTIONAL: Living docs feature ID
---
```

**Common Mistakes**:

```yaml
# ❌ WRONG: Unclosed bracket
---
increment: 0001-test
data: [unclosed
---

# ❌ WRONG: Unclosed quote
---
increment: 0001-test
title: "unclosed string
---

# ❌ WRONG: Invalid YAML object
---
increment: 0001-test
config: {key: value, broken
---

# ❌ WRONG: Invalid increment ID format
---
increment: 1-test  # Missing leading zeros
---

# ❌ WRONG: Invalid increment ID format (uppercase)
---
increment: 0001-Test-Feature  # Uppercase letters not allowed
---

# ❌ WRONG: Missing required field
---
title: Feature Title  # Missing increment field!
---

# ✅ CORRECT: Minimal valid frontmatter
---
increment: 0001-feature-name
---

# ✅ CORRECT: Full frontmatter
---
increment: 0042-bug-fix
title: Critical Bug Fix
feature_id: FS-013
---
```

**Prevention Layers**:

1. **Pre-commit hook** - Validates YAML before commits (blocks malformed frontmatter)
   ```bash
   # Runs automatically on git commit
   scripts/pre-commit-yaml-validation.sh
   ```

2. **Spec parser** - Uses `js-yaml` library (detects errors at runtime)
   - Provides descriptive error messages
   - Shows line numbers for YAML errors
   - Suggests common fixes

3. **Command validation** - `/specweave:validate` checks YAML syntax
   ```bash
   /specweave:validate 0001
   ```

**Manual YAML Testing**:

```bash
# Validate YAML in spec.md (manual check)
node -e "
  const yaml = require('js-yaml');
  const fs = require('fs');
  const content = fs.readFileSync('.specweave/increments/0001-test/spec.md', 'utf-8');
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) throw new Error('No frontmatter found');
  const parsed = yaml.load(frontmatter[1]);
  console.log('✅ Valid YAML:', JSON.stringify(parsed, null, 2));
"
```

**Error Messages**:

When YAML validation fails, you'll see descriptive errors:

```
ERROR: Malformed YAML syntax in frontmatter
DETAILS: Unexpected end of stream
LOCATION: Lines 2-5
HINT: Common mistakes:
  - Unclosed brackets: [unclosed
  - Unclosed quotes: "unclosed
  - Invalid YAML object: {key: value, broken
```

**Why This Matters**:
- **Silent failures**: Malformed YAML can cause missing/incorrect metadata
- **Sync issues**: Invalid increment IDs break living docs sync
- **GitHub sync**: Broken frontmatter prevents issue creation
- **Validation failures**: Tasks/ACs can't be parsed without valid metadata

**Incident History**:
- **Test case**: `tests/integration/commands/plan-command.integration.test.ts:626` tests malformed YAML handling
- **Root cause**: Regex-based parsing was tolerant but unreliable
- **Solution**: Multi-layered YAML validation with `js-yaml` library

**See Also**:
- Pre-commit hook: `scripts/pre-commit-yaml-validation.sh`
- Spec parser: `src/generators/spec/spec-parser.ts` (uses js-yaml)
- Test suite: `tests/integration/commands/plan-command.integration.test.ts`

---

## Project Structure

```
src/                    # TypeScript code (compiled to dist/)
plugins/                # Claude Code components (skills, agents, commands, hooks)
├── specweave/          # Core plugin
└── specweave-*/        # Optional plugins (GitHub, JIRA, etc.)
.specweave/             # Framework data (increments, docs, logs)
```

**Rules**:
- `src/` = TypeScript ONLY
- ALL skills/agents/commands/hooks = `plugins/`
- Marketplace = GLOBAL via CLI
- NEVER mix `*.ts` and `SKILL.md` in same directory
- NEVER create files in project root

---

## Plugin Hook Registration (CRITICAL!)

**When**: Adding or modifying hooks that respond to Claude Code tool events

**Hook Schema Rules** (v0.22.14+):
1. ✅ **ONLY use valid Claude Code hook events** (e.g., PostToolUse, PreToolUse, SessionStart)
2. ❌ **NEVER use custom hook names** (e.g., "TodoWrite") as hook events
3. ✅ **Use matchers** to filter which tool calls trigger the hook

### Valid Claude Code Hook Events

Claude Code supports **only these 10 hook events**:
- `PostToolUse` - After a tool completes (use this for TodoWrite, Write, Edit, etc.)
- `PreToolUse` - Before a tool executes
- `PermissionRequest` - When permission dialogs appear
- `Notification` - When notifications are sent
- `UserPromptSubmit` - When users submit prompts
- `Stop` - When the main agent finishes
- `SubagentStop` - When subagents finish
- `PreCompact` - Before compaction operations
- `SessionStart` - At session initialization
- `SessionEnd` - When sessions terminate

### Correct Hook Registration Format

**File**: `plugins/*/. claude-plugin/plugin.json`

```json
{
  "name": "specweave",
  "version": "0.22.14",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-task-completion.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**Schema Breakdown**:
| Field | Type | Purpose |
|-------|------|---------|
| `PostToolUse` | array | Hook event (one of 10 valid events above) |
| `matcher` | string | Tool name pattern (e.g., "TodoWrite", "Write\|Edit") |
| `type` | string | Always "command" for shell scripts |
| `command` | string | Script path (use `${CLAUDE_PLUGIN_ROOT}` for plugin directory) |
| `timeout` | number | Seconds before timeout (default: 30) |

### Common Mistakes (v0.22.13 Bug)

❌ **WRONG** (Invalid hook event):
```json
{
  "hooks": {
    "TodoWrite": {
      "post": "./hooks/post-task-completion.sh"
    }
  }
}
```
**Error**: `"TodoWrite"` is not a valid Claude Code hook event

✅ **CORRECT** (Use PostToolUse with matcher):
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [{"type": "command", "command": "..."}]
      }
    ]
  }
}
```

### Testing Hook Registration

```bash
# 1. Update plugin.json with correct schema
vim plugins/specweave/.claude-plugin/plugin.json

# 2. Commit and push
git add plugins/specweave/.claude-plugin/plugin.json
git commit -m "fix: correct hook registration schema"
git push origin develop

# 3. Wait 5-10 seconds for marketplace auto-update

# 4. Force refresh marketplace (if needed)
cd ~/.claude/plugins/marketplaces
rm -rf specweave
git clone https://github.com/YOUR_USERNAME/specweave.git

# 5. Restart Claude Code

# 6. Verify no plugin loading errors
# Should NOT see: "hooks: Invalid input" error
```

### Documentation References

- **Claude Code Plugin Hooks**: https://code.claude.com/docs/en/hooks.md
- **Hooks Reference**: https://code.claude.com/docs/en/hooks-reference.md
- **Fix History**: See CHANGELOG.md v0.22.14 for the hook schema bug fix

---

## Development Workflow

### Core Commands

```bash
# Primary workflow
/specweave:increment "feature"  # Plan new work
/specweave:do                   # Execute tasks
/specweave:progress             # Check status
/specweave:done                 # Close (validates ACs, tasks, tests)

# State management
/specweave:pause 0002 --reason="..."
/specweave:resume 0002
/specweave:abandon 0002

# Quality
/specweave:validate 0001
/specweave:qa 0001

# Documentation
/specweave:sync-docs update
/specweave:sync-tasks
```

### Local Development Setup

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/specweave.git
cd specweave
npm install

# 2. Create symlink (CRITICAL!)
mkdir -p ~/.claude/plugins/marketplaces
rm -rf ~/.claude/plugins/marketplaces/specweave
ln -s "$(pwd)" ~/.claude/plugins/marketplaces/specweave

# 3. Verify setup
bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh

# 4. Install git hooks
bash scripts/install-git-hooks.sh
```

**If "Plugin not found" errors**:
```bash
echo '{"version": 1, "plugins": {}}' > ~/.claude/plugins/installed_plugins.json
claude plugin marketplace update specweave
```

---

## Build & Test

### Build

```bash
npm run rebuild    # Clean + build (use this during development)
npm run build      # Compile TypeScript + copy hook dependencies
npm run clean      # Remove dist/
```

**Build Architecture**:
1. `tsc` compiles `src/**/*.ts` → `dist/src/**/*.js`
2. `copy:locales` copies translation files
3. `copy:plugins` compiles plugin TypeScript with esbuild
4. `copy:hook-deps` **NEW**: Copies hook dependencies to vendor/

**Hook Dependencies** (NEW in v0.22.15):
- Problem: Hooks imported from `../../../../dist/src/...` (failed in marketplace)
- Solution: Copy compiled files to `plugins/*/lib/vendor/`
- Hooks now import from `../vendor/...` (self-contained)
- Script: `scripts/copy-hook-dependencies.js`
- Auto-detect deps: `scripts/find-hook-dependencies.js`

**Critical**: Always import with `.js` extensions:
```typescript
// ✅ CORRECT
import { foo } from './bar.js';

// ❌ WRONG
import { foo } from './bar';
```

**Fix missing extensions**: `node scripts/fix-js-extensions.js`

### Testing

**Framework**: Vitest (migrated from Jest 2025-11-17)

```bash
npm test                    # Smoke tests
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e            # E2E tests (Playwright)
npm run test:all            # All tests
npm run test:coverage       # Coverage report
```

**Test structure**:
- `tests/unit/` - Pure logic (no I/O)
- `tests/integration/` - Organized by: `core/`, `external-tools/`, `generators/`, `features/`
- `tests/e2e/` - Full user scenarios

**Naming**: ALL tests use `.test.ts` (NEVER `.spec.ts`)

### Writing Tests

```typescript
// ✅ CORRECT
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs-extra';

vi.mock('fs-extra');

const mockReadFile = vi.mocked(fs.readFile);

beforeEach(() => {
  vi.clearAllMocks();
  mockReadFile.mockResolvedValue('content');
});
```

**Critical anti-patterns**:
```typescript
// ❌ NEVER use jest APIs
jest.fn()                    // Use: vi.fn()
jest.mock()                  // Use: vi.mock()

// ❌ NEVER use project root in tests
const testRoot = path.join(process.cwd(), '.test-something');

// ✅ ALWAYS use temp directory
const testRoot = path.join(os.tmpdir(), 'test-' + Date.now());
```

**Use test utilities**:
```typescript
import { createIsolatedTestDir } from '../test-utils/isolated-test-dir';

const { testDir, cleanup } = await createIsolatedTestDir('my-test');
try {
  // Test code here
} finally {
  await cleanup();  // ALWAYS cleanup
}
```

### Build Architecture

**Dual compilation**:
- `tsc`: `src/` → `dist/src/` (source files)
- `esbuild`: `plugins/**/lib/hooks/*.ts` → in-place `.js` (hooks only)

**Hook imports**:
```typescript
#!/usr/bin/env node
import { ACStatusManager } from '../../../../dist/src/core/...';  // Use dist/
```

**Increment script imports**:
```typescript
#!/usr/bin/env tsx
import { ACStatusManager } from '../../../../src/core/...';  // Use src/
```

**Running increment scripts**:
```bash
npx tsx .specweave/increments/####/scripts/script-name.ts
```

### Coverage

- Critical paths: 90%+
- Overall: 80%+

---

## Common Tasks

### Adding Components

All components go into `plugins/`:
- Core: `plugins/specweave/{skills|agents|commands|hooks}/`
- Plugins: `plugins/specweave-{name}/{skills|agents|commands}/`
- Tests: `tests/integration/` or `tests/unit/`

See `.github/CONTRIBUTING.md` for details.

### Updating Documentation

```bash
# Internal docs
vim .specweave/docs/internal/architecture/hld-system.md

# Public docs
vim .specweave/docs/public/guides/user-guide.md
```

---

## Troubleshooting

**Skills not activating**: Check YAML frontmatter, restart Claude Code
**Commands not working**: Verify plugin installed, restart Claude Code
**Tests failing**: Run `npm run rebuild`, check test output
**Root folder polluted**: Move files to `.specweave/increments/####/reports/`
**Hooks failing**: Ensure changes are pushed to GitHub (Claude Code auto-updates marketplace every 5-10s). For symlink mode, see `.specweave/docs/internal/advanced/symlink-dev-mode.md`

---

## Quick Reference

**Commands**:
- `/specweave:increment "feature"` - Plan
- `/specweave:do` - Execute
- `/specweave:done 0002` - Close (validates)
- `/specweave:status` - Show status
- `/specweave:progress` - Check progress
- `/specweave:validate 0002` - Validate
- `/specweave:qa 0002` - Quality check
- `/specweave:pause/resume/abandon` - State management
- `/specweave:archive/restore` - Archiving (manual only)
- `/specweave:sync-docs update` - Sync living docs

**Build**:
- `npm run rebuild` - Clean + build
- `npm test` - Smoke tests
- `npm run test:all` - All tests
- `npm run test:coverage` - Coverage

**File Structure**:
- Source: `src/` (TypeScript), `plugins/` (skills/agents/commands/hooks)
- Increments: `.specweave/increments/`
- Docs: `.specweave/docs/internal/`, `.specweave/docs/public/`
- Tests: `tests/` (unit, integration, E2E)

**Remember**:
1. Push changes to GitHub → Claude Code auto-updates marketplace (5-10s)
2. Keep root clean (use increment folders)
3. Test before committing
4. Never delete .specweave/ directories
5. Use `/specweave:done` (never manual metadata edits)

**See also**: `.github/CONTRIBUTING.md`, https://spec-weave.com
