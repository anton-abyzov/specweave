# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: TypeScript CLI (NPM Package)
**Repository**: https://github.com/anton-abyzov/specweave

For **contributors to SpecWeave itself** (not users).

---

## 🚨 CRITICAL SAFETY RULES

### 1. Symlink Setup (MANDATORY for Contributors)

**Problem**: Claude Code executes hooks from `~/.claude/plugins/marketplaces/specweave/`. If this is a **directory** (not symlink), hooks fail with "No such file or directory".

**Fix**:
```bash
# Verify symlink exists:
ls -ld ~/.claude/plugins/marketplaces/specweave
# Must show: lrwxr-xr-x ... -> /path/to/repo (SYMLINK, not drwxr-xr-x)

# If directory, fix it:
rm -rf ~/.claude/plugins/marketplaces/specweave
ln -s "$(pwd)" ~/.claude/plugins/marketplaces/specweave

# Verify:
bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh
```

**Without symlink**: Hooks fail, status line broken, living docs don't sync.
**Protection**: Pre-commit hook verifies symlink before each commit.

### 2. NEVER Pollute Project Root

**Rule**: ALL AI-generated files go into `.specweave/increments/####/` subfolders, NOT project root.

**ONLY 3 files allowed in increment root**:
- `spec.md`, `plan.md`, `tasks.md`

**Everything else goes in subfolders**:
- `reports/` - Session summaries, analysis, completion reports
- `scripts/` - Helper scripts, migrations
- `logs/` - Execution logs, debug output

```bash
# Before committing:
git status  # If you see .md files in root, MOVE THEM!
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

### 7. NEVER Use `console.*` in Production Code

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
**Hooks failing**: Verify symlink (see "Symlink Setup" above)

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
1. Symlink setup is MANDATORY for contributors
2. Keep root clean (use increment folders)
3. Test before committing
4. Never delete .specweave/ directories
5. Use `/specweave:done` (never manual metadata edits)

**See also**: `.github/CONTRIBUTING.md`, https://spec-weave.com
