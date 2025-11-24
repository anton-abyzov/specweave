# Implementation Plan: Console.* Elimination - Phase 2

## Overview

This plan details the technical approach for migrating 20 CLI command files (~500 console.* violations) to the logger abstraction pattern, ensuring test reliability and maintaining user experience quality.

## Architecture

### Current State

```
CLI Commands (20 files, ~500 violations)
├── console.log() → stdout (user output + debug logs mixed)
├── console.error() → stderr (errors mixed with warnings)
├── console.warn() → stderr (warnings)
└── Tests polluted with console output

Problems:
- No way to silence logs in tests
- Mixed concerns (user output vs debug)
- Poor traceability in production
- Violates CLAUDE.md Rule #7
```

### Target State

```
CLI Commands (20 files, 0 violations)
├── logger.log() → consoleLogger → stdout (debug logs)
├── logger.error() → consoleLogger → stderr (errors)
├── console.log() → stdout (ONLY documented user-facing output)
└── Tests use silentLogger (no output pollution)

Benefits:
- Testable (inject silentLogger)
- Traceable (structured logs)
- Consistent error handling
- Clean test output
```

### Logger Injection Architecture

```typescript
// Pattern 1: CLI Command Function
export async function commandName(
  arg1: string,
  options: {
    option1?: boolean;
    logger?: Logger;  // ← Inject logger here
  } = {}
): Promise<void> {
  const logger = options.logger ?? consoleLogger;  // ← Default fallback

  // Debug logs use logger
  logger.log('Processing...');
  logger.error('Failed', error);

  // User-facing output (documented exception)
  // User-facing output (exception to logger rule)
  console.log(chalk.green('✅ Success!'));
}

// Pattern 2: Tests
import { silentLogger } from '../../../src/utils/logger.js';

it('should work', async () => {
  await commandName('arg', { logger: silentLogger });  // ← No output
  expect(...).toBe(...);
});
```

## Migration Strategy

### Prioritization (Based on Violations + Impact)

**Tier 1: High Impact (>40 violations)**
1. `cli/commands/init.ts` - 246 violations (HIGHEST PRIORITY)
2. `cli/commands/next-command.ts` - 42 violations

**Tier 2: Medium Impact (25-40 violations)**
3. `cli/commands/migrate-to-profiles.ts` - 34 violations
4. `cli/commands/validate-plugins.ts` - 30 violations
5. `cli/commands/check-discipline.ts` - 29 violations
6. `cli/commands/list.ts` - 27 violations
7. `cli/commands/init-multiproject.ts` - 27 violations

**Tier 3: Lower Impact (<25 violations)**
8-20. Remaining 13 CLI command files (~100 violations combined)

### Phase 2 Execution Order

**Week 1: Tier 1 (High Impact)**
- Days 1-3: `cli/commands/init.ts` (246 violations, most complex)
- Day 4: `cli/commands/next-command.ts` (42 violations)
- Day 5: Testing, validation, buffer

**Week 2: Tier 2 (Medium Impact)**
- Day 1: `cli/commands/migrate-to-profiles.ts` (34)
- Day 2: `cli/commands/validate-plugins.ts` (30)
- Day 3: `cli/commands/check-discipline.ts` (29)
- Day 4: `cli/commands/list.ts` (27)
- Day 5: `cli/commands/init-multiproject.ts` (27)

**Week 3: Tier 3 (Lower Impact) + Wrap-up**
- Days 1-3: Remaining 13 CLI commands (~100 violations)
- Day 4: Integration testing, documentation updates
- Day 5: Final validation, increment closure

## Technical Implementation

### Step 1: Pre-Migration Analysis

For each CLI command file:

1. **Identify console.* usage patterns**:
   ```bash
   grep -n "console\.\(log\|error\|warn\)" cli/commands/init.ts
   ```

2. **Categorize each console.* call**:
   - ✅ User-facing output (keep as console.log with comment)
   - ❌ Debug logs (migrate to logger.log)
   - ❌ Error messages (migrate to logger.error)
   - ❌ Warnings (migrate to logger.warn)

3. **Check for test coverage**:
   ```bash
   find tests -name "*init*.test.ts" -exec grep -l "initCommand" {} \;
   ```

4. **Document current behavior**:
   - CLI output format (colors, tables, progress bars)
   - Error handling patterns
   - User interaction flows (prompts, confirmations)

### Step 2: Add Logger Injection

**For each CLI command function**:

1. **Add logger import**:
   ```typescript
   import { Logger, consoleLogger } from '../../utils/logger.js';
   ```

2. **Update function signature**:
   ```typescript
   // Before
   export async function initCommand(
     projectPath: string,
     options: { force?: boolean } = {}
   ): Promise<void>

   // After
   export async function initCommand(
     projectPath: string,
     options: {
       force?: boolean;
       logger?: Logger;  // ← Add this
     } = {}
   ): Promise<void> {
     const logger = options.logger ?? consoleLogger;  // ← Add this
   ```

3. **Keep backward compatibility**:
   - Default `logger ?? consoleLogger` ensures existing calls work
   - No breaking changes to CLI interface
   - Only tests need updates

### Step 3: Migrate Console Calls

**Decision Tree for Each console.* Call**:

```
Is this console.* call...?
│
├─ User-facing output? (ASCII art, tables, success messages)
│  └─ YES: Keep as console.log, add comment
│     // User-facing output (exception to logger rule)
│     console.log(chalk.green('✅ Success!'));
│
└─ Debug/error log? (state changes, errors, warnings)
   └─ YES: Migrate to logger
      logger.log('Starting process...');
      logger.error('Failed to read file', error);
```

**Examples**:

```typescript
// ❌ Before
console.log('Loading configuration from ' + configPath);
console.error('Failed to initialize:', error);
console.warn('Directory already exists');
console.log(chalk.green('✅ Initialized successfully!'));

// ✅ After
logger.log(`Loading configuration from ${configPath}`);
logger.error('Failed to initialize', error);
logger.warn('Directory already exists');

// User-facing output (exception to logger rule)
console.log(chalk.green('✅ Initialized successfully!'));
```

### Step 4: Update Tests

**For each test file that uses the CLI command**:

1. **Add silentLogger import**:
   ```typescript
   import { silentLogger } from '../../../src/utils/logger.js';
   ```

2. **Inject silentLogger in all command calls**:
   ```typescript
   // Before
   await initCommand('.', { force: true });

   // After
   await initCommand('.', { force: true, logger: silentLogger });
   ```

3. **Remove unnecessary waits**:
   ```typescript
   // Before
   await initCommand('.');
   await new Promise(resolve => setTimeout(resolve, 100));  // ❌ Remove
   const result = await fs.readFile(...);

   // After
   await initCommand('.', { logger: silentLogger });
   const result = await fs.readFile(...);  // ✅ Immediate
   ```

4. **Verify no console output**:
   ```bash
   npm run test:unit -- init.test.ts
   # Output should have NO console.log/error/warn
   ```

### Step 5: Validation

**For each migrated file**:

1. **Grep for remaining violations**:
   ```bash
   grep -n "console\.\(log\|error\|warn\)" cli/commands/init.ts
   # Should only show documented user-facing exceptions
   ```

2. **Run affected tests**:
   ```bash
   npm run test:unit -- init.test.ts
   # Should pass with 0 console output
   ```

3. **Manual CLI testing**:
   ```bash
   npm run rebuild
   npx specweave init test-project
   # Verify user experience unchanged
   ```

4. **Pre-commit hook check**:
   ```bash
   git add cli/commands/init.ts
   bash scripts/pre-commit-console-check.sh
   # Should pass (only user-facing exceptions allowed)
   ```

## Testing Strategy

### Unit Tests

**Coverage Requirements**:
- All CLI commands have unit tests
- Tests use `silentLogger` to prevent output pollution
- No console.* calls during test runs
- Coverage maintained at 80%+

**Test Pattern**:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { silentLogger } from '../../../src/utils/logger.js';
import { initCommand } from '../../../src/cli/commands/init.js';

describe('initCommand', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-init-${Date.now()}`);
    await fs.mkdir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should initialize project with logger injection', async () => {
    await initCommand(testDir, { logger: silentLogger });

    // Assertions
    expect(await fs.pathExists(path.join(testDir, '.specweave'))).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'CLAUDE.md'))).toBe(true);
  });

  it('should handle errors with logger', async () => {
    // Test error handling (should not throw, should log via logger)
    await expect(
      initCommand('/invalid/path', { logger: silentLogger })
    ).rejects.toThrow();
  });
});
```

### Integration Tests

**Scenarios**:
1. Full CLI workflow (init → increment → do → done)
2. Error handling (invalid args, missing dependencies)
3. User interaction (prompts, confirmations)

**Pattern**:
```typescript
describe('CLI Integration', () => {
  it('should run full workflow', async () => {
    // Use silentLogger for all commands
    await initCommand(testDir, { logger: silentLogger });
    await incrementCommand('feature', { logger: silentLogger });
    await doCommand({ logger: silentLogger });

    // Verify state
    expect(...).toBe(...);
  });
});
```

### Manual Testing Checklist

**For each migrated CLI command**:

- [ ] Run command with no args
- [ ] Run command with valid args
- [ ] Run command with invalid args
- [ ] Verify error messages clear and helpful
- [ ] Verify user-facing output formatted correctly
- [ ] Verify colors/formatting preserved
- [ ] Verify no console output during tests

## Risk Mitigation

### Risk 1: Breaking User-Facing Output

**Detection**:
- Manual CLI testing after each migration
- Visual review of console.log calls before migration
- E2E tests for critical CLI flows

**Mitigation**:
- Document all user-facing exceptions with comments
- Review output formatting before/after migration
- Add E2E tests for CLI output if missing

### Risk 2: Test Failures

**Detection**:
- Run full test suite after each file migration
- Watch for flaky tests or timing issues
- Monitor test output for pollution

**Mitigation**:
- Use silentLogger consistently
- Remove unnecessary setTimeout() waits
- Add explicit assertions for test behavior

### Risk 3: Merge Conflicts (High Likelihood)

**Detection**:
- Check git status before starting each file
- Monitor team activity on CLI commands

**Mitigation**:
- Migrate highest-priority files first
- Coordinate with team on migration schedule
- Frequent commits to reduce conflict window
- Use feature branch, rebase frequently

### Risk 4: Scope Creep

**Detection**:
- Track violations remaining per file
- Monitor time spent per file

**Mitigation**:
- Strict focus on 20 CLI command files
- Time-box work: 3 days max per Tier 1 file
- Defer non-CLI files to Phase 3

## Definition of Done

### Per File

- [ ] All console.* calls categorized (user-facing vs debug)
- [ ] Logger injection added to function signature
- [ ] Debug logs migrated to logger.log/error/warn
- [ ] User-facing exceptions documented with comments
- [ ] Tests updated to use silentLogger
- [ ] No console output during test runs
- [ ] Pre-commit hook passes
- [ ] Manual CLI testing confirms UX unchanged

### Per Increment (Phase 2)

- [ ] All 20 CLI command files migrated
- [ ] Zero console.* violations (except documented user-facing)
- [ ] All tests passing with 0 output pollution
- [ ] Coverage maintained at 80%+
- [ ] Pre-commit hook active and blocking violations
- [ ] CONTRIBUTING.md updated (if CLI patterns added)
- [ ] Completion report written

## Tools & Scripts

### Useful Commands

```bash
# Count violations per file
grep -rn "console\.\(log\|error\|warn\)" cli/commands/*.ts | \
  cut -d: -f1 | uniq -c | sort -rn

# Find files with >30 violations
for f in cli/commands/*.ts; do
  count=$(grep -c "console\." "$f" 2>/dev/null || echo 0)
  if [ "$count" -gt 30 ]; then
    echo "$count - $f"
  fi
done | sort -rn

# Check test output pollution
npm run test:unit -- --reporter=verbose 2>&1 | grep -i "console"

# Verify pre-commit hook
bash scripts/pre-commit-console-check.sh
```

### Migration Workflow

```bash
# 1. Start with file
FILE="cli/commands/init.ts"

# 2. Count violations (before)
BEFORE=$(grep -c "console\." "$FILE")
echo "Before: $BEFORE violations"

# 3. Analyze patterns
grep -n "console\.\(log\|error\|warn\)" "$FILE"

# 4. Migrate (manual)
code "$FILE"

# 5. Count violations (after)
AFTER=$(grep -c "console\." "$FILE")
echo "After: $AFTER violations (removed: $((BEFORE - AFTER)))"

# 6. Run tests
npm run test:unit -- init.test.ts

# 7. Manual CLI test
npm run rebuild
npx specweave init test-project

# 8. Commit
git add "$FILE" tests/
git commit -m "feat(logger): migrate init.ts to logger abstraction"
```

## Progress Tracking

### Metrics Dashboard

```bash
# Track progress
echo "=== Phase 2 Progress ==="
echo "Tier 1: $(grep -L "const logger" cli/commands/{init,next-command}.ts | wc -l) / 2 remaining"
echo "Tier 2: $(grep -L "const logger" cli/commands/{migrate-to-profiles,validate-plugins,check-discipline,list,init-multiproject}.ts | wc -l) / 5 remaining"
echo "Tier 3: [Manual count] / 13 remaining"
echo ""
echo "Total violations remaining:"
grep -rn "console\.\(log\|error\|warn\)" cli/commands/*.ts | wc -l
echo ""
echo "Test output pollution:"
npm run test:unit 2>&1 | grep -c "console" || echo "0 (clean!)"
```

### Weekly Reports

**Week 1 Report Template**:
```
Phase 2 - Week 1 Summary
========================
Completed: init.ts (246 → 0), next-command.ts (42 → 0)
Violations removed: 288
Tests updated: 15 files
All tests passing: ✅
User experience: Unchanged

Blockers: None
Next week: Tier 2 files (5 files, ~150 violations)
```

## References

- **Logger Implementation**: `src/utils/logger.ts`
- **Silent Logger**: Used in tests (`silentLogger`)
- **Pre-commit Hook**: `scripts/pre-commit-console-check.sh`
- **CONTRIBUTING.md**: Logging guidelines
- **Analysis Report**: `.specweave/increments/0046-console-elimination/reports/analysis-report.md`
- **Phase 1 Summary**: `.specweave/increments/0046-console-elimination/reports/implementation-summary.md`

## Next Steps After Phase 2

1. **Close Increment**: `/specweave:done 0046`
2. **Phase 3 Planning**: Create increment for Utilities & Integrations (~400 violations)
3. **Phase 4 Planning**: Create increment for Init Flow & Adapters (~763 violations)
4. **Zero Console Goal**: Track progress toward Q2 2025 goal
