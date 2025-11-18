# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: Open Source NPM Package (TypeScript CLI)
**Repository**: https://github.com/anton-abyzov/specweave
**Website**: https://spec-weave.com

This CLAUDE.md is for **contributors to SpecWeave itself**, not users of SpecWeave.
Users receive a different CLAUDE.md via the template system.

---

## 🚨 CRITICAL: NEVER POLLUTE PROJECT ROOT!

**⛔ THIS IS THE #1 RULE - VIOLATING THIS WILL GET YOUR PR REJECTED ⛔**

**ALL AI-generated files MUST go into the CURRENT INCREMENT folder**, NOT in the project root!

### ❌ NEVER Create in Root (Pollutes Repository)

```
❌ WRONG - ROOT FILES (REJECTED!):
/PLUGIN-MIGRATION-COMPLETE.md          # NO! Goes to increment reports/
/SESSION-SUMMARY-2025-10-28.md         # NO! Goes to increment reports/
/ADR-006-DEEP-ANALYSIS.md              # NO! Goes to .specweave/docs/internal/architecture/adr/
/ANALYSIS-MULTI-TOOL-COMPARISON.md     # NO! Goes to increment reports/
/QUICK-START.md                        # NO! Goes to increment reports/
/migration-helper.sh                   # NO! Goes to increment scripts/
/execution.log                         # NO! Goes to increment logs/

✅ CORRECT - INCREMENT FOLDERS:
.specweave/increments/0004-plugin-architecture/
├── spec.md                            # ⚠️ ONLY THESE 3 FILES in root!
├── plan.md
├── tasks.md                           # Tasks with embedded tests
├── reports/                           # ✅ ALL REPORTS HERE!
│   ├── PLUGIN-MIGRATION-COMPLETE.md   # ✅ Completion reports
│   ├── SESSION-SUMMARY.md             # ✅ Session summaries
│   ├── QUICK-START.md                 # ✅ Quick start guides
│   └── ANALYSIS-*.md                  # ✅ Analysis files
├── scripts/                           # ✅ ALL SCRIPTS HERE!
│   └── migration-helper.sh            # ✅ Helper scripts
└── logs/                              # ✅ ALL LOGS HERE!
    └── execution.log                  # ✅ Execution logs

.specweave/docs/internal/architecture/ # ✅ PUT ADRS/DIAGRAMS HERE!
└── adr/
    └── 0006-deep-analysis.md          # ✅ Architecture decisions
```

**Before committing, ALWAYS check**: `git status` - If you see `.md` files in root, MOVE THEM!

### 📁 Increment Structure Rules (MANDATORY)

**ONLY 3 files allowed in increment root**:
1. ✅ `spec.md` - Specification
2. ✅ `plan.md` - Implementation plan
3. ✅ `tasks.md` - Tasks with embedded tests

**Everything else MUST be in subfolders**:
- `reports/` - Session summaries, completion reports, analysis files, quick-start guides
- `scripts/` - Helper scripts, migrations, utilities
- `logs/` - Execution logs, debug output, temp files

**Examples of files that belong in subfolders**:
- `QUICK-START.md` → `reports/QUICK-START.md`
- `SESSION-NOTES.md` → `reports/SESSION-NOTES.md`
- `ULTRATHINK-*.md` → `reports/ULTRATHINK-*.md`
- `validation.sh` → `scripts/validation.sh`
- `debug.log` → `logs/debug.log`

**Why this matters**:
- ✅ Clean, predictable structure
- ✅ Easy to find files by type
- ✅ No increment root clutter
- ✅ Consistent across all increments

---

## 🛡️ CRITICAL: NEVER DELETE .specweave/ DIRECTORIES!

**⛔ MASS DELETION PROTECTION IS ACTIVE ⛔**

**PROTECTED DIRECTORIES**:
- `.specweave/docs/` - All project documentation (internal + public)
- `.specweave/increments/` - All increment history and specifications

**WHAT THIS MEANS**:
- ❌ **NEVER** run `rm -rf .specweave/docs` or `rm -rf .specweave/increments`
- ❌ **NEVER** delete more than 50 files in these directories at once
- ✅ Pre-commit hook will **BLOCK** accidental mass deletions
- ✅ If intentional, bypass with `git commit --no-verify`

**WHY THIS EXISTS**:
On 2025-11-17, an accidental mass deletion occurred (1,200+ files). All files were recovered via `git restore`, but this protection prevents future incidents.

**IF YOU ACCIDENTALLY DELETE**:
```bash
# Immediately restore:
git restore .specweave/

# Verify restoration:
git status
```

**See**: `.specweave/increments/0039/reports/ACCIDENTAL-DELETION-RECOVERY-2025-11-17.md`

---

## ⚠️ CRITICAL: NEVER USE `specweave init . --force` FOR REINSTALLS!

**⛔ COMMON MISTAKE THAT DELETES ALL DATA ⛔**

**THE DANGER**:
```bash
# ❌ DANGEROUS (deletes ALL increments and docs):
specweave init . --force

# What --force actually does:
# 1. Skips all confirmation prompts
# 2. AUTOMATICALLY DELETES .specweave/ entirely
# 3. Loses all increments, docs, and history
# 4. No backup unless you create one manually
```

**SAFE ALTERNATIVES**:
```bash
# ✅ SAFE - Update files, keep all data:
specweave init .
# When prompted, select: "Continue working"

# ✅ SAFE - Always interactive, never deletes:
npx specweave init .
```

**WHY THIS MATTERS**:
- Documentation used to recommend `--force` for troubleshooting (FIXED in v0.21.4+)
- Users followed the docs and lost all their work
- Now `--force` has multiple safeguards:
  - ⚠️ BIG RED WARNING before deletion
  - ✅ ALWAYS requires confirmation (even in force mode)
  - 📦 Automatic backup created before deletion
  - 🔒 Pre-commit hook blocks accidental commits

**IF YOU NEED A FRESH START**:
1. Backup first: `cp -r .specweave .specweave.backup-$(date +%Y%m%d)`
2. Run: `specweave init .` (select "Fresh start" option)
3. Or: `specweave init . --force` (requires confirmation + creates auto-backup)

**NEVER use `--force` unless you want to DELETE EVERYTHING!**

---

## Tool Support

SpecWeave supports multiple AI coding tools with varying automation levels:
- **Claude Code** (Recommended): Native support via plugins, hooks, MCP
- **Cursor**: Partial support via AGENTS.md compilation
- **Other tools** (Copilot, ChatGPT, Gemini): Basic support via AGENTS.md

For adapter implementation details, see "Multi-Tool Support via Adapters" section below.

---

## Development Workflow

### Core SpecWeave Commands

**Note**: Detailed rules (naming, discipline, archiving) are in skills that auto-load when you use these commands.

**Primary Workflow**:
```bash
/specweave:increment "feature name"  # Plan new work (increment-planner skill)
/specweave:do                        # Execute tasks
/specweave:progress                  # Check status
/specweave:done                      # Close increment
```

**State Management**:
```bash
/specweave:pause 0002 --reason="..." # Pause increment
/specweave:resume 0002               # Resume paused
/specweave:abandon 0002              # Abandon incomplete
```

**Archiving** (MANUAL ONLY):
```bash
/specweave:archive 0031              # Archive specific
/specweave:archive --keep-last 10    # Archive old work
/specweave:restore 0031              # Restore from archive
```

**Quality**:
```bash
/specweave:validate 0001             # Rule-based validation
/specweave:qa 0001                   # AI quality assessment
```

**Documentation**:
```bash
/specweave:sync-docs update          # Sync living docs
/specweave:sync-tasks                # Sync task status
```

**For complete command reference**: See "Quick Reference" section below.

---

## Project Structure

### Source of Truth Principle

```
src/                    # TypeScript code ONLY (compiled to dist/)
plugins/                # ALL Claude Code components (skills, agents, commands, hooks)
├── specweave/          # Core plugin (auto-loaded)
└── specweave-*/        # Optional plugins (GitHub, JIRA, etc.)
.specweave/             # Framework data (increments, docs, logs)
```

**Key Rules**:
- ✅ `src/` = TypeScript code ONLY
- ✅ ALL skills/agents/commands/hooks = Inside `plugins/`
- ✅ Marketplace = GLOBAL via CLI (no per-project `.claude/`)
- ❌ NEVER mix `*.ts` and `SKILL.md` in same directory
- ❌ NEVER create new files in project root (use increment folders)

**For complete structure**: See `README.md`

---

## Plugin Architecture

### Core Plugin (Always Auto-Loaded)

**Plugin**: `specweave` - The essential SpecWeave plugin loaded in every project:
- **Skills**: 9 skills (increment-planner, tdd-workflow, spec-generator, etc.)
- **Agents**: 22 agents (PM, Architect, Tech Lead, + 19 specialized)
- **Commands**: 22 commands (/specweave:increment, /specweave:do, etc.)
- **Hooks**: 8 lifecycle hooks
- **Size**: ~12K tokens

### Available Plugins

All plugins are auto-installed during `specweave init`. Skills activate based on context keywords.

**Plugin List**: `ls plugins/` or `/plugin list --installed`

**Example plugins**:
- `specweave` - Core (increment lifecycle, living docs)
- `specweave-github` - GitHub Issues sync
- `specweave-{frontend|backend|infrastructure}` - Tech stacks
- `specweave-{ml|payments}` - Domain-specific

### Plugin Installation

`specweave init` automatically:
1. Registers marketplace: `claude plugin marketplace add anton-abyzov/specweave`
2. Installs all plugins via Claude CLI
3. Marketplace is GLOBAL (persists across projects)

After init, all plugins are ready. Skills auto-activate based on keywords.

### Local Development Setup (Contributors Only)

**🚨 CRITICAL for SpecWeave Contributors:**

When developing SpecWeave itself, you MUST use a **symlink** from the marketplace to your local repository. This ensures:
- ✅ All code/hook/skill changes are immediately reflected
- ✅ No need to reinstall plugins after every change
- ✅ Real-time testing of hooks, skills, and commands

**Setup Instructions:**

```bash
# 1. Remove any existing marketplace installation
rm -rf ~/.claude/plugins/marketplaces/specweave

# 2. Create symlink to your local SpecWeave repository
ln -s /path/to/your/specweave/repo ~/.claude/plugins/marketplaces/specweave

# Example:
ln -s ~/Projects/github/specweave ~/.claude/plugins/marketplaces/specweave

# 3. Register the local marketplace with Claude Code
cd /path/to/your/specweave/repo
claude plugin marketplace add ./.

# 4. Verify the marketplace is registered
claude plugin marketplace list
# Should show: specweave (Source: Directory /path/to/your/repo)

# 5. Update marketplace to discover all plugins
claude plugin marketplace update specweave

# 6. Verify hooks are accessible
test -f ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/user-prompt-submit.sh && \
  echo "✅ Hooks accessible" || echo "❌ Setup failed"
```

**If you see "Plugin not found" errors:**

This means the plugin registry is out of sync. Fix it:

```bash
# 1. Backup current registry
cp ~/.claude/plugins/installed_plugins.json ~/.claude/plugins/installed_plugins.json.backup

# 2. Clear registry (forces rediscovery)
echo '{"version": 1, "plugins": {}}' > ~/.claude/plugins/installed_plugins.json

# 3. Update marketplace
claude plugin marketplace update specweave

# 4. Restart Claude Code
# All 25 plugins will be rediscovered from your local repo
```

**Verification:**

```bash
# Check symlink target
readlink ~/.claude/plugins/marketplaces/specweave
# Should output: /path/to/your/specweave/repo

# Check all plugins are accessible
ls ~/.claude/plugins/marketplaces/specweave/plugins/
# Should list: specweave, specweave-github, specweave-jira, etc.
```

**Why This Matters:**

Without the symlink, Claude Code will try to execute hooks from a non-existent location:
```
❌ Plugin hook error: /bin/sh:
   ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/user-prompt-submit.sh:
   No such file or directory
```

**Troubleshooting:**

If you see "Plugin not found in marketplace 'specweave'" errors:
1. Check symlink exists: `ls -la ~/.claude/plugins/marketplaces/specweave`
2. Verify it points to your repo: `readlink ~/.claude/plugins/marketplaces/specweave`
3. Recreate symlink if needed (see setup instructions above)

**What NOT to Do:**

- ❌ Don't copy the repository - use a symlink
- ❌ Don't use relative paths in symlink - use absolute paths
- ❌ Don't register the marketplace via `claude plugin marketplace add` - symlink is enough for local dev

---

## Multi-Tool Support via Adapters

SpecWeave supports multiple AI coding tools through an adapter system. Tool selection happens during `specweave init`.

**Adapter Architecture**:
- **Location**: `src/adapters/` (interface, loader, tool-specific implementations)
- **Selection**: Auto-detected or via `--adapter` flag
- **Files**: Tool-specific files (`.cursorrules`, `AGENTS.md`, etc.)

**Supported Tools**:

| Tool | Automation Level | Implementation | Status |
|------|------------------|----------------|--------|
| **Claude Code** | Full | Native plugins (no adapter) | ✅ Recommended |
| **Cursor** | Partial | AGENTS.md compilation | ✅ Supported |
| **Generic** | Basic | AGENTS.md static file | ✅ Supported |

**Key Differences**:
- **Claude Code**: No adapter needed - uses native plugin system
- **Cursor/Generic**: Require compilation step to generate AGENTS.md
- **All tools**: Share same `.specweave/` data structure

**For contributors**: Adapter code is in `src/adapters/`. Tests in `tests/unit/adapter-loader.test.ts`.

---

## Development Principles

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md#core-development-principles) for:
- Source of Truth Discipline
- Documentation = Code
- Testing Requirements
- Incremental Development
- Multi-Tool Support

---

## Recent Architectural Enhancements (v0.18.3+)

### Project-Specific Tasks in User Stories

**New in v0.18.3**: User stories now include project-specific checkable task lists instead of just links to increment tasks.

**Key Changes**:
1. **TaskProjectSpecificGenerator** (`src/core/living-docs/task-project-specific-generator.ts`):
   - Filters increment tasks by User Story ID (via AC-IDs)
   - Optional project keyword filtering (backend vs frontend)
   - Preserves completion status from increment tasks.md

2. **User Story File Format** - New `## Tasks` section:
```markdown
## Tasks

- [ ] **T-001**: Setup API endpoint
- [x] **T-003**: Add DB migration (completed)

> **Note**: Tasks are project-specific. See increment tasks.md for full list
```

3. **GitHub Sync** - Issues now have checkable task lists:
   - Stakeholders can tick/untick tasks in GitHub
   - Task completion syncs from user story files
   - Backward compatible (falls back to legacy extraction)

**Benefits**:
- **Project Isolation**: Backend tasks ≠ Frontend tasks
- **Traceability**: Each user story explicitly lists its tasks
- **GitHub UX**: Checkable task lists in issues
- **Completion Tracking**: Status preserved from increment

**Data Flow**:
```
Increment tasks.md (All tasks, source of truth)
    ↓
TaskProjectSpecificGenerator (Filters by US + Project)
    ↓
User Story ## Tasks Section (Project-specific checkboxes)
    ↓
GitHub Issue (Checkable task list for stakeholders)
```

**See Also**:
- Implementation: `.specweave/increments/0034-github-ac-checkboxes-fix/reports/PROJECT-SPECIFIC-TASKS-IMPLEMENTATION-COMPLETE.md`
- Architecture: `.specweave/increments/0034-github-ac-checkboxes-fix/reports/ULTRATHINK-PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md`

---

## Build & Test

### Build Commands

```bash
# ALWAYS use clean build during development (prevents TS5055 errors)
npm run rebuild             # Clean + build (RECOMMENDED)

# Or manual steps:
npm run clean              # Remove dist/ folder
npm run build              # Compile TypeScript
```

### Testing

**Test Framework**: **Vitest** (migrated from Jest on 2025-11-17)

```bash
npm test                    # Smoke tests (quick validation)
npm run test:unit           # Unit tests with Vitest
npm run test:integration    # Integration tests with Vitest
npm run test:e2e            # E2E tests (Playwright)
npm run test:all            # All tests
npm run test:coverage       # Coverage report
```

**Why Vitest?**
- ✅ ESM-native (no tsconfig hacks)
- ✅ Faster than Jest
- ✅ Better TypeScript integration
- ✅ Native import.meta.url support
- ✅ Modern, actively maintained

**Test Organization** (4 categories):
- `tests/unit/` - Pure logic tests (no I/O) - **Vitest**
- `tests/plugin-validation/` - Plugin structure contracts
- `tests/integration/` - 4 semantic categories - **Vitest**:
  - `external-tools/` - GitHub, JIRA, ADO, Kafka sync
  - `core/` - Core framework + workflows
  - `generators/` - Code generation (frontend, backend, ML)
  - `features/` - Feature plugins (Figma, i18n, diagrams, etc.)
- `tests/e2e/` - Full user scenarios - **Playwright**

**Writing Tests**:
```typescript
// Import from vitest (NOT jest)
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocking
vi.mock('fs/promises');
const mockFn = vi.fn();
vi.clearAllMocks();
```

**Details**: `.specweave/docs/internal/architecture/TEST-ORGANIZATION-PROPOSAL.md`

### Test Isolation (CRITICAL - Prevents .specweave/ Deletion!)

**🚨 MANDATORY FOR ALL TESTS creating .specweave/ structures:**

**THE PROBLEM**: Tests using `process.cwd()` can accidentally delete the project `.specweave/` folder containing all your work!

**CORRECT PATTERN** (ALWAYS use this):
```typescript
import * as os from 'os';
import * as path from 'path';

// ✅ SAFE: Uses isolated temp directory
const testRoot = path.join(os.tmpdir(), 'test-name-' + Date.now());
```

**DANGEROUS PATTERN** (NEVER use this):
```typescript
// ❌ DANGER: Creates directories in project root!
const testRoot = path.join(process.cwd(), '.test-something');
const testPath = path.join(__dirname, '..', '.specweave', 'increments');
```

### Vitest Mock Best Practices

**🚨 MANDATORY FOR ALL TESTS using mocks:**

**CORRECT PATTERN** (vi.mocked() for type-safe mocks):
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs-extra';

// Mock fs-extra BEFORE using it
vi.mock('fs-extra');

// Type-safe mocked functions
const mockReadFile = vi.mocked(fs.readFile);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockExistsSync = vi.mocked(fs.existsSync);

beforeEach(() => {
  vi.clearAllMocks();
  mockExistsSync.mockReturnValue(true);
  mockReadFile.mockResolvedValue('content');
});
```

**DANGEROUS PATTERN** (NEVER use this):
```typescript
// ❌ WRONG: Invalid anyed<> syntax (pre-Vitest migration)
const mockFs = fs as anyed<typeof fs> & {
  readFile: anyedFunction<typeof fs.readFile>;
};
// This causes TypeScript errors and test failures!
```

**Why This Matters**:
1. `vi.mocked()` provides full type safety
2. Catches mock setup errors at compile time
3. Works correctly with Vitest's mock system
4. Prevents runtime "Cannot read properties of undefined" errors

**Common Mock Gotchas**:
- Always call `vi.clearAllMocks()` in beforeEach
- Use `mockResolvedValue` for async functions
- Use `mockReturnValue` for sync functions
- Check that mocks are actually called: `expect(mockFn).toHaveBeenCalled()`

**Why This Matters**:
1. Tests create mock `.specweave/` structures for testing
2. Cleanup uses `fs.rm(testRoot, { recursive: true })`
3. If `testRoot` points to project root → **DELETES REAL .specweave/!**
4. You lose all increments, docs, and history

**Use Test Utilities** (RECOMMENDED):
```typescript
import { createIsolatedTestDir, createSpecweaveStructure } from '../test-utils/isolated-test-dir';

test('my test', async () => {
  const { testDir, cleanup } = await createIsolatedTestDir('my-test');

  try {
    // Setup .specweave structure in isolated directory
    await createSpecweaveStructure(testDir);

    // Test code here - NEVER touches project .specweave/
    const incrementPath = path.join(testDir, '.specweave', 'increments', '0001-test');
    // ...
  } finally {
    await cleanup(); // ALWAYS cleanup
  }
});
```

**Protection Layers**:
1. ✅ **Pre-commit hook**: Blocks commits with dangerous test patterns
2. ✅ **Test utilities**: `tests/test-utils/isolated-test-dir.ts`
3. ✅ **Documentation**: This section

**Related Incident**: 2025-11-17 - Multiple `.specweave/` deletions traced to dangerous test patterns
**Root Cause Analysis**: `.specweave/increments/0037/reports/DELETION-ROOT-CAUSE-2025-11-17.md`

### Build Health Checks

**CRITICAL**: TypeScript ES Modules require specific practices:

1. **Always Import with .js Extensions**:
   ```typescript
   // ❌ WRONG (will break at runtime):
   import { foo } from './bar';

   // ✅ CORRECT:
   import { foo } from './bar.js';
   ```

2. **Fix Missing Extensions**:
   ```bash
   # Auto-fix all missing .js extensions:
   node scripts/fix-js-extensions.js

   # Preview changes first:
   node scripts/fix-js-extensions.js --dry-run
   ```

3. **Verify Build is Clean**:
   ```bash
   # Check for polluted dist/ (TS5055 indicator):
   find dist/src -name "*.ts" -not -name "*.d.ts"
   # Should return NOTHING

   # If files found, clean rebuild:
   npm run rebuild
   ```

4. **Test Hook Execution**:
   ```bash
   # Hooks must import correctly at runtime:
   node plugins/specweave/lib/hooks/update-ac-status.js 0001
   # Should execute without "Cannot find module" errors
   ```

5. **Install Git Hooks** (RECOMMENDED):
   ```bash
   bash scripts/install-git-hooks.sh
   # Verifies build health before every commit
   ```

### Common Build Errors & Fixes

**Error: TS5055 - Cannot write file (would overwrite input)**
```bash
# Cause: dist/ polluted with .ts source files
# Fix:
npm run clean && npm run build
```

**Error: Cannot find module 'src/...' (hook execution)**
```bash
# Cause: Hooks importing from src/ instead of dist/src/
#    OR: Missing .js extensions in imports
# Fix:
node scripts/fix-js-extensions.js
npm run rebuild
```

**Error: Module import without .js extension**
```bash
# Cause: TypeScript ES modules REQUIRE .js in relative imports
# Fix:
node scripts/fix-js-extensions.js
```

### Build Architecture

SpecWeave uses **dual compilation**:
- `tsc`: Compiles `src/` → `dist/src/` (source files)
- `esbuild`: Compiles `plugins/**/lib/hooks/*.ts` → in-place `.js` (hooks only)

**Why?** Hooks must import from `dist/src/` (compiled), but TypeScript would try to compile them before `dist/` exists (chicken-and-egg). Solution: Exclude hooks from `tsconfig.json`, compile separately with esbuild.

### Increment Scripts vs Hooks

**CRITICAL DISTINCTION**: Increment scripts and hooks have different purposes and import patterns.

**Hooks** (`plugins/**/lib/hooks/*.ts`):
- **Purpose**: Production runtime executables (called by shell scripts)
- **Execution**: `#!/usr/bin/env node` (JavaScript runtime)
- **Imports**: MUST use `dist/src/` (compiled JavaScript)
- **Compilation**: esbuild (separate from main build)
- **Example**:
  ```typescript
  #!/usr/bin/env node
  import { ACStatusManager } from '../../../../dist/src/core/increment/ac-status-manager.js';
  ```

**Increment Scripts** (`.specweave/increments/####/scripts/*.ts`):
- **Purpose**: Development utilities (one-off tasks, migrations, analysis)
- **Execution**: `#!/usr/bin/env tsx` (TypeScript runtime with ESM support)
- **Imports**: MUST use `src/` (TypeScript source, NOT compiled)
- **Compilation**: None (tsx transpiles on-the-fly)
- **Example**:
  ```typescript
  #!/usr/bin/env tsx
  import { ACStatusManager } from '../../../../src/core/increment/ac-status-manager.js';
  ```

**Why Different Patterns?**

| Aspect | Hooks (dist/) | Increment Scripts (src/) |
|--------|---------------|-------------------------|
| **Context** | Production runtime | Development only |
| **Tooling** | Node.js only | TypeScript tooling (tsx) |
| **Build dependency** | Yes (requires dist/) | No (live source code) |
| **Live reload** | No (must rebuild) | Yes (tsx auto-transpiles) |
| **Purpose** | Permanent infrastructure | Temporary dev utilities |

**Common Mistake**: Copying hook import patterns to increment scripts.

```typescript
// ❌ WRONG (increment script importing from dist/):
#!/usr/bin/env tsx
import { ACStatusManager } from '../../../../dist/src/core/...';
// Issues:
// - Requires npm run build before execution
// - Stale code if src/ changes without rebuild
// - Semantic confusion (TS runtime + JS imports)

// ✅ CORRECT (increment script importing from src/):
#!/usr/bin/env tsx
import { ACStatusManager } from '../../../../src/core/...';
// Benefits:
// - No build dependency
// - Always uses latest source code
// - Clear dev script pattern
```

**Note**: Use `tsx` (not `ts-node`) for increment scripts - it has better ESM + TypeScript support.

### Running Increment Scripts

**CRITICAL**: Increment scripts use `#!/usr/bin/env tsx` shebang, which assumes tsx is in your PATH. This often fails in development environments.

**Recommended Execution Method** (Always Works):
```bash
# ✅ Use npx - finds tsx in node_modules/.bin/ automatically
npx tsx .specweave/increments/####/scripts/script-name.ts

# Example:
npx tsx .specweave/increments/0037-project-specific-tasks/scripts/validate-task-consistency.ts
```

**Why npx?**
- ✅ Works without global tsx installation
- ✅ Uses project's tsx version (consistent across team)
- ✅ No PATH configuration needed
- ✅ Same behavior in CI/CD and local dev

**Alternative Methods** (Less Recommended):
```bash
# Option 1: Direct execution (requires global tsx)
chmod +x script.ts
./script.ts
# ❌ Fails if tsx not globally installed

# Option 2: Install tsx globally (not recommended for teams)
npm install -g tsx
./script.ts
# ❌ Every contributor must install globally
# ❌ Version inconsistencies across team

# Option 3: Full path
./node_modules/.bin/tsx script.ts
# ✅ Works, but verbose
```

**Troubleshooting "command not found: tsx" (Exit Code 127)**:

This error means tsx isn't in your shell's PATH.

**Root Cause**:
- tsx is a **dev dependency** (installed in `node_modules/`)
- Shell can't find commands in `node_modules/.bin/` automatically
- npm scripts add `node_modules/.bin/` to PATH, but direct shell execution doesn't

**Fix**:
```bash
# Instead of:
tsx script.ts          # ❌ Fails with error 127

# Use:
npx tsx script.ts      # ✅ Always works
```

**Why This Happens "Sometimes"**:
- **npm scripts**: Work (PATH includes node_modules/.bin/)
- **Direct shell**: Fails (PATH doesn't include node_modules/.bin/)
- **Global tsx installed**: Works (tsx in system PATH)
- **CI/CD**: Depends on environment setup

**Execution Context Comparison**:

| Method | tsx in PATH? | Works? |
|--------|--------------|--------|
| `npm run script` | ✅ Yes (npm adds it) | ✅ Yes |
| `./script.ts` | ❌ No (unless global) | ❌ Usually fails |
| `tsx script.ts` | ❌ No (unless global) | ❌ Usually fails |
| `npx tsx script.ts` | ✅ Yes (npx finds it) | ✅ Always works |

**Best Practice for Contributors**:
- **Creating scripts**: Use `#!/usr/bin/env tsx` shebang (conventional)
- **Running scripts**: Always use `npx tsx script.ts` (reliable)
- **Documentation**: Show npx execution method in examples

### Coverage Requirements

- Critical paths: 90%+
- Overall: 80%+

### Related Documentation

- Build process details: `.github/CONTRIBUTING.md` → "Build Process & Best Practices"
- Ultrathink analysis: `.specweave/increments/0039/reports/HOOK-IMPORT-ERROR-ULTRATHINK-ANALYSIS.md`
- Build verification tests: `tests/integration/build/build-verification.test.ts`

---

## Common Tasks

### Adding Skills, Agents, or Commands

**All components go into plugins**:
- **Core components**: `plugins/specweave/{skills|agents|commands|hooks}/`
- **Plugin components**: `plugins/specweave-{name}/{skills|agents|commands}/`
- **Tests**: `tests/integration/{component-name}/` or `tests/unit/`

**See**: `.github/CONTRIBUTING.md` for complete instructions

### Updating Documentation

```bash
# Internal docs (architecture, ADRs)
vim .specweave/docs/internal/architecture/hld-system.md

# Public docs (user-facing guides)
vim .specweave/docs/public/guides/user-guide.md

# Build docs site
cd docs-site && npm run build
```

---

## Troubleshooting

**Skills not activating?**
1. Check plugin installed: `/plugin list --installed`
2. Verify YAML frontmatter in skill SKILL.md
3. Restart Claude Code
4. Check description has trigger keywords

**Commands not working?**
1. Check plugin installed: `/plugin list --installed`
2. Verify command exists in plugin
3. Restart Claude Code

**Tests failing?**
1. Run `npm run build` first
2. Check test output
3. Verify test data in `tests/fixtures/`

**Root folder polluted?**
1. Move files to `.specweave/increments/####/reports/`
2. Update `.gitignore` if needed

**Plugin hooks not working? (Development)**
See `.claude/CONTRIBUTING.md` for plugin marketplace setup.

---

## Getting Help

**Documentation**:
- User docs: https://spec-weave.com
- Contributor docs: `.specweave/docs/internal/`
- Architecture: `.specweave/docs/internal/architecture/`

**Community**:
- GitHub Issues: https://github.com/anton-abyzov/specweave/issues
- Discussions: https://github.com/anton-abyzov/specweave/discussions

**Current Increment**:
```bash
/specweave:status  # Show all increments
```

---

## Quick Reference

**Commands** (all use `/specweave:*` namespace):

*Primary*:
- `/specweave:increment "feature"` - Plan new increment
- `/specweave:do` - Execute tasks
- `/specweave:done 0002` - Close increment
- `/specweave:validate 0002` - Validate increment
- `/specweave:qa 0002` - Quality assessment
- `/specweave:status` - Show status
- `/specweave:progress` - Check progress

*State management*:
- `/specweave:pause 0002 --reason="..."` - Pause
- `/specweave:resume 0002` - Resume
- `/specweave:abandon 0002 --reason="..."` - Abandon

*Archiving (MANUAL ONLY)*:
- `/specweave:archive 0031` - Archive specific
- `/specweave:archive --keep-last 10` - Archive old
- `/specweave:restore 0031` - Restore
- `/specweave:fix-duplicates` - Resolve duplicates

*Documentation*:
- `/specweave:sync-docs update` - Sync living docs
- `/specweave:sync-tasks` - Sync task status

*Other*:
- `/specweave:costs` - AI cost dashboard
- `/specweave:translate` - Translate content
- `/specweave:update-scope` - Log scope changes
- `/specweave:next` - Smart transition

**Build & Test**:
- `npm run build` - Compile TypeScript
- `npm test` - Unit tests
- `npm run test:e2e` - E2E tests
- `npm run test:integration` - Integration tests

**File Structure**:
- Source: `src/` (TypeScript) and `plugins/` (skills/agents/commands)
- Marketplace: GLOBAL (via CLI)
- Increments: `.specweave/increments/`
- Docs: `.specweave/docs/internal/` and `.specweave/docs/public/`
- Tests: `tests/` (unit, integration, E2E)

---

**Remember**:
1. Edit source files in `src/` and `plugins/`, not `.claude/`
2. Keep root folder clean (use increment folders)
3. Test before committing (E2E + unit + integration)
4. Skills/agents/commands auto-activate when needed
5. All detailed rules are in skills (progressive disclosure)

**SpecWeave Documentation**: https://spec-weave.com
**Last Updated**: 2025-11-15
