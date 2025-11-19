# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: TypeScript CLI (NPM Package)
**Repository**: https://github.com/anton-abyzov/specweave

For **contributors to SpecWeave itself** (not users).

---

## 🚨 CRITICAL SAFETY RULES

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

### 10. Task Format with US-Task Linkage (v0.23.0+)

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
npm run build      # Compile TypeScript
npm run clean      # Remove dist/
```

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
