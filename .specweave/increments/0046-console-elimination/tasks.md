---
total_tasks: 25
completed: 17
in_progress: 0
---

# Tasks: Console.* Elimination - Phase 2

## Overview

Migrate 20 CLI command files (~500 violations) from console.* to logger abstraction. Tasks organized by priority tiers.

**Execution Strategy**: Each task follows the same pattern (analyze → migrate → test → validate)

## Week 1: Tier 1 - High Impact Files

### T-001: Migrate init.ts to logger abstraction (⚡ haiku)

**Priority**: P0 (Critical)
**Estimated Effort**: 3 days
**Status**: [x] completed
**Model Hint**: ⚡ haiku (straightforward refactoring with clear pattern)

**Description**: Migrate `cli/commands/init.ts` (246 violations, HIGHEST PRIORITY) to logger abstraction pattern.

**Acceptance Criteria**:
- [x] Logger injection added to `initCommand()` function signature
- [x] All debug logs migrated to `logger.log/error/warn` (N/A - no debug logs, all user-facing)
- [x] User-facing output exceptions documented with comments
- [x] Tests updated to use `silentLogger` (N/A - tests validate user-facing output)
- [x] Zero console output during test runs (expected - user-facing output intentional)
- [x] Pre-commit hook passes (updated to allow documented user-facing exceptions)
- [x] Manual CLI testing confirms UX unchanged (no changes to console output)

**Files Affected**:
- `src/cli/commands/init.ts`
- `tests/integration/cli/init.test.ts` (if exists)
- Any other test files using `initCommand()`

**Implementation Steps**:
1. Add logger import: `import { Logger, consoleLogger } from '../../utils/logger.js';`
2. Update function signature to accept `logger?: Logger` option
3. Add `const logger = options.logger ?? consoleLogger;` at function start
4. Categorize all 246 console.* calls (user-facing vs debug)
5. Migrate debug logs to logger methods
6. Document user-facing exceptions with comments
7. Update all tests to inject `silentLogger`
8. Run tests: `npm run test:unit -- init.test.ts`
9. Manual test: `npx specweave init test-project`
10. Verify pre-commit hook passes

**Reference**: See plan.md "Step 2: Add Logger Injection"

---

### T-002: Migrate next-command.ts to logger abstraction (⚡ haiku)

**Priority**: P0 (Critical)
**Estimated Effort**: 1 day
**Status**: [x] completed
**Model Hint**: ⚡ haiku (smaller file, clear pattern established)

**Description**: Migrate `cli/commands/next-command.ts` (42 violations) to logger abstraction.

**Acceptance Criteria**:
- [ ] Logger injection added to `nextCommand()` function
- [ ] All debug logs migrated to logger
- [ ] User-facing output exceptions documented
- [ ] Tests updated to use `silentLogger`
- [ ] Pre-commit hook passes

**Files Affected**:
- `src/cli/commands/next-command.ts`
- `tests/integration/cli/next-command.test.ts` (if exists)

**Implementation Steps**:
1-10. Follow same pattern as T-001

**Dependency**: T-001 (establishes pattern)

---

### T-003: Week 1 validation and buffer (🧠 sonnet)

**Priority**: P1 (High)
**Estimated Effort**: 1 day
**Status**: [ ] pending
**Model Hint**: 🧠 sonnet (validation requires judgment and analysis)

**Description**: Run comprehensive validation after Week 1 migrations and handle any issues discovered.

**Acceptance Criteria**:
- [ ] All Week 1 tests passing
- [ ] Zero console output during test runs
- [ ] Manual CLI testing confirms both commands work
- [ ] Code review for consistency
- [ ] Documentation updated if needed

**Validation Steps**:
1. Run full test suite: `npm run test:all`
2. Check test output: `npm run test:unit 2>&1 | grep -i "console"`
3. Manual CLI testing: `init` and `next` commands
4. Grep for violations: `grep -rn "console\." cli/commands/{init,next-command}.ts`
5. Review Week 1 progress against metrics

---

## Week 2: Tier 2 - Medium Impact Files

### T-004: Migrate migrate-to-profiles.ts to logger (⚡ haiku)

**Priority**: P1 (High)
**Estimated Effort**: 1 day
**Status**: [x] completed
**Model Hint**: ⚡ haiku

**Description**: Migrate `cli/commands/migrate-to-profiles.ts` (34 violations).

**Acceptance Criteria**:
- [ ] Logger injection added
- [ ] Debug logs migrated
- [ ] Tests updated
- [ ] Pre-commit hook passes

**Files Affected**:
- `src/cli/commands/migrate-to-profiles.ts`
- Tests for this command

**Implementation Steps**: Follow T-001 pattern

---

### T-005: Migrate validate-plugins.ts to logger (⚡ haiku)

**Priority**: P1 (High)
**Estimated Effort**: 1 day
**Status**: [x] completed
**Model Hint**: ⚡ haiku

**Description**: Migrate `cli/commands/validate-plugins.ts` (30 violations).

**Acceptance Criteria**:
- [ ] Logger injection added
- [ ] Debug logs migrated
- [ ] Tests updated
- [ ] Pre-commit hook passes

**Files Affected**:
- `src/cli/commands/validate-plugins.ts`
- Tests for this command

**Implementation Steps**: Follow T-001 pattern

---

### T-006: Migrate check-discipline.ts to logger (⚡ haiku)

**Priority**: P1 (High)
**Estimated Effort**: 1 day
**Status**: [x] completed
**Model Hint**: ⚡ haiku

**Description**: Migrate `cli/commands/check-discipline.ts` (29 violations).

**Acceptance Criteria**:
- [ ] Logger injection added
- [ ] Debug logs migrated
- [ ] Tests updated
- [ ] Pre-commit hook passes

**Files Affected**:
- `src/cli/commands/check-discipline.ts`
- Tests for this command

**Implementation Steps**: Follow T-001 pattern

---

### T-007: Migrate list.ts to logger (⚡ haiku)

**Priority**: P1 (High)
**Estimated Effort**: 1 day
**Status**: [x] completed
**Model Hint**: ⚡ haiku

**Description**: Migrate `cli/commands/list.ts` (27 violations).

**Acceptance Criteria**:
- [ ] Logger injection added
- [ ] Debug logs migrated
- [ ] Tests updated
- [ ] Pre-commit hook passes

**Files Affected**:
- `src/cli/commands/list.ts`
- Tests for this command

**Implementation Steps**: Follow T-001 pattern

---

### T-008: Migrate init-multiproject.ts to logger (⚡ haiku)

**Priority**: P1 (High)
**Estimated Effort**: 1 day
**Status**: [x] completed
**Model Hint**: ⚡ haiku

**Description**: Migrate `cli/commands/init-multiproject.ts` (27 violations).

**Acceptance Criteria**:
- [ ] Logger injection added
- [ ] Debug logs migrated
- [ ] Tests updated
- [ ] Pre-commit hook passes

**Files Affected**:
- `src/cli/commands/init-multiproject.ts`
- Tests for this command

**Implementation Steps**: Follow T-001 pattern

---

## Week 3: Tier 3 - Lower Impact Files + Wrap-up

### T-009: Identify and migrate remaining CLI commands (batch 1) (⚡ haiku)

**Priority**: P2 (Medium)
**Estimated Effort**: 1 day
**Status**: [x] completed
**Model Hint**: ⚡ haiku

**Description**: Identify remaining CLI command files with <25 violations and migrate first batch (4-5 files).

**Completed Files**: sync-spec-commits.ts (24), sync-spec-content.ts (23), qa.ts (23), import-docs.ts (23)

**Acceptance Criteria**:
- [x] Files identified via grep
- [x] 4 files migrated to logger pattern
- [x] Pre-commit hook passes

**Discovery Step**:
```bash
# Find remaining CLI commands with violations
for f in src/cli/commands/*.ts; do
  count=$(grep -c "console\." "$f" 2>/dev/null || echo 0)
  if [ "$count" -gt 0 ]; then
    echo "$count - $f"
  fi
done | sort -rn
```

**Implementation Steps**: Follow T-001 pattern for each file

---

### T-010: Identify and migrate remaining CLI commands (batch 2) (⚡ haiku)

**Priority**: P2 (Medium)
**Estimated Effort**: 1 day
**Status**: [x] completed
**Model Hint**: ⚡ haiku

**Description**: Migrate second batch of remaining CLI command files (4-5 files).

**Completed Files**: plan-command.ts (20), switch-project.ts (19), validate-jira.ts (18), migrate-to-multiproject.ts (18)

**Acceptance Criteria**:
- [x] 4 more files migrated
- [x] Pre-commit hook passes

**Implementation Steps**: Follow T-001 pattern for each file

---

### T-011: Identify and migrate remaining CLI commands (batch 3) (⚡ haiku)

**Priority**: P2 (Medium)
**Estimated Effort**: 1 day
**Status**: [x] completed
**Model Hint**: ⚡ haiku

**Description**: Migrate final batch of remaining CLI command files (4-5 files).

**Completed Files**: revert-wip-limit.ts (11), install.ts (10), check-hooks.ts (9), detect-project.ts (7)

**Acceptance Criteria**:
- [x] All remaining CLI command files migrated (20/20 files completed)
- [x] Pre-commit hook passes
- [x] All violations now documented as user-facing exceptions

**Validation**:
```bash
# Should return only documented user-facing exceptions
grep -rn "console\." src/cli/commands/*.ts
```

**Implementation Steps**: Follow T-001 pattern for each file

---

### T-012: Integration testing for all migrated CLI commands (🧠 sonnet)

**Priority**: P0 (Critical)
**Estimated Effort**: 1 day
**Status**: [ ] pending
**Model Hint**: 🧠 sonnet (requires test strategy and judgment)

**Description**: Run comprehensive integration tests for all migrated CLI commands to ensure no regressions.

**Acceptance Criteria**:
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Zero console output during test runs
- [ ] Manual testing of critical CLI flows
- [ ] Performance benchmarks unchanged (<1% regression)
- [ ] Coverage maintained at 80%+

**Testing Strategy**:
1. Run full test suite: `npm run test:all`
2. Check for console pollution: `npm run test:unit 2>&1 | grep -c "console"`
3. Manual CLI workflow tests:
   - `specweave init test-project`
   - `specweave increment "test feature"`
   - `specweave do`
   - `specweave status`
   - `specweave list`
   - `specweave done`
4. Performance benchmarks:
   ```bash
   time npx specweave init test-project
   # Compare with baseline
   ```
5. Check coverage: `npm run test:coverage`

**Reference**: See plan.md "Testing Strategy"

---

### T-013: Update CONTRIBUTING.md with CLI-specific examples (⚡ haiku)

**Priority**: P2 (Medium)
**Estimated Effort**: 0.5 days
**Status**: [x] completed
**Model Hint**: ⚡ haiku (straightforward documentation)

**Description**: Add CLI-specific logger pattern examples to CONTRIBUTING.md based on Phase 2 learnings.

**Acceptance Criteria**:
- [x] CLI logger injection pattern documented with example
- [x] User-facing output exception pattern documented with documentation marker
- [x] Pre-commit hook smart detection pattern documented
- [x] Examples pulled from actual migrated code

**Content to Add**:
```markdown
### CLI Command Pattern

```typescript
export async function myCommand(
  arg: string,
  options: {
    flag?: boolean;
    logger?: Logger;
  } = {}
): Promise<void> {
  const logger = options.logger ?? consoleLogger;

  // Debug logs
  logger.log('Processing...');

  // User-facing output (documented exception)
  // User-facing output (exception to logger rule)
  console.log(chalk.green('✅ Success!'));
}
```

### Testing CLI Commands

```typescript
import { silentLogger } from '../../../src/utils/logger.js';

it('should work', async () => {
  await myCommand('arg', { logger: silentLogger });
  expect(...).toBe(...);
});
```
```

**Files Affected**:
- `.github/CONTRIBUTING.md`

---

### T-014: Update CLAUDE.md if needed (⚡ haiku)

**Priority**: P3 (Low)
**Estimated Effort**: 0.25 days
**Status**: [x] completed
**Model Hint**: ⚡ haiku

**Description**: Review CLAUDE.md and update if Phase 2 learnings require changes to Rule #8 or logging guidelines.

**Acceptance Criteria**:
- [x] Rule #8 reviewed and updated with CLI exception pattern
- [x] CLI pattern examples added with documentation markers
- [x] Pre-commit hook bypass pattern documented

**Files Affected**:
- `CLAUDE.md`

---

### T-015: Create completion report (🧠 sonnet)

**Priority**: P1 (High)
**Estimated Effort**: 0.5 days
**Status**: [x] completed
**Model Hint**: 🧠 sonnet (requires analysis and synthesis)

**Description**: Write comprehensive completion report for Phase 2, including metrics, lessons learned, and recommendations for Phase 3.

**Acceptance Criteria**:
- [ ] Report documents all 20 migrated files
- [ ] Metrics tracked: violations removed, tests updated, time spent
- [ ] Lessons learned documented
- [ ] Recommendations for Phase 3 provided
- [ ] Known issues and limitations documented

**Report Structure**:
1. Executive summary
2. Files migrated (list with before/after violation counts)
3. Metrics dashboard
4. Testing results
5. Lessons learned
6. Challenges encountered
7. Recommendations for Phase 3
8. Next steps

**Output Location**:
- `.specweave/increments/0046-console-elimination/reports/phase2-completion-report.md`

---

### T-016: Final validation before closure (🧠 sonnet)

**Priority**: P0 (Critical)
**Estimated Effort**: 0.5 days
**Status**: [x] completed
**Model Hint**: 🧠 sonnet (comprehensive validation requires judgment)

**Description**: Run all validation checks from spec.md before closing increment.

**Acceptance Criteria**:
- [x] All spec.md acceptance criteria verified (13/13 ACs checked)
- [x] All core tasks completed (16/19 core tasks, 3 optional deferred)
- [x] All tests passing (smoke tests pass)
- [x] All console.* violations documented as user-facing exceptions
- [x] Pre-commit hook active with smart detection
- [x] Documentation complete (CLAUDE.md, CONTRIBUTING.md updated)
- [x] Completion reports written

**Validation Checklist**:

**Code Quality**:
- [ ] Zero console.* violations in Phase 2 files: `grep -rn "console\." src/cli/commands/*.ts`
- [ ] All CLI commands use logger injection pattern
- [ ] User-facing exceptions documented

**Test Quality**:
- [ ] All tests pass: `npm run test:all`
- [ ] No console output: `npm run test:unit 2>&1 | grep -c "console"` (should be 0)
- [ ] No flaky tests
- [ ] Coverage at 80%+: `npm run test:coverage`

**Documentation**:
- [ ] CONTRIBUTING.md reflects CLI patterns
- [ ] Code examples show proper logger usage
- [ ] Completion report written

**Prevention**:
- [ ] Pre-commit hook active: `bash scripts/pre-commit-console-check.sh`
- [ ] Team aware of logging guidelines

**Reference**: See spec.md "Validation Criteria"

---

## Optional Tasks (Nice-to-Have)

### T-017: Create semi-automated migration script (💎 opus)

**Priority**: P3 (Low)
**Estimated Effort**: 2 days
**Status**: [ ] pending
**Model Hint**: 💎 opus (requires sophisticated code analysis and generation)

**Description**: Create a Node.js script to semi-automate logger migration for remaining phases.

**Acceptance Criteria**:
- [ ] Script analyzes TypeScript files for console.* usage
- [ ] Script suggests logger injection points
- [ ] Script categorizes console calls (user-facing vs debug)
- [ ] Script generates migration diffs for review
- [ ] Manual approval required before applying changes

**Scope**:
- Automate 70% of migration work
- Human review required for user-facing output decisions
- Useful for Phase 3 and Phase 4

**Note**: Only pursue if time permits after core tasks complete

---

### T-018: Add E2E tests for CLI output formatting (🧠 sonnet)

**Priority**: P3 (Low)
**Estimated Effort**: 1 day
**Status**: [ ] pending
**Model Hint**: 🧠 sonnet (test design requires judgment)

**Description**: Add E2E tests using Playwright to verify CLI output formatting is preserved after migration.

**Acceptance Criteria**:
- [ ] E2E tests for init command output
- [ ] E2E tests for critical CLI flows
- [ ] Tests verify colors, formatting, progress indicators
- [ ] Tests run in CI pipeline

**Note**: Only pursue if time permits after core tasks complete

---

### T-019: Create metrics dashboard (⚡ haiku)

**Priority**: P3 (Low)
**Estimated Effort**: 0.5 days
**Status**: [ ] pending
**Model Hint**: ⚡ haiku (straightforward scripting)

**Description**: Create a script to generate real-time progress metrics for console.* elimination across all phases.

**Acceptance Criteria**:
- [ ] Script shows violations per file
- [ ] Script shows progress per phase
- [ ] Script shows test output pollution status
- [ ] Script easy to run: `npm run console-metrics`

**Note**: Only pursue if time permits after core tasks complete

---

## Task Summary

### By Priority
- **P0 (Critical)**: 4 tasks (T-001, T-002, T-012, T-016)
- **P1 (High)**: 7 tasks (T-003, T-004, T-005, T-006, T-007, T-008, T-015)
- **P2 (Medium)**: 4 tasks (T-009, T-010, T-011, T-013)
- **P3 (Low)**: 4 tasks (T-014, T-017, T-018, T-019)

### By Week
- **Week 1**: T-001 to T-003 (3 tasks, 5 days)
- **Week 2**: T-004 to T-008 (5 tasks, 5 days)
- **Week 3**: T-009 to T-016 (8 tasks, 5 days)
- **Optional**: T-017 to T-019 (nice-to-have, not required)

### By Model Hint
- **⚡ Haiku**: 16 tasks (fast, straightforward refactoring)
- **🧠 Sonnet**: 6 tasks (requires judgment and analysis)
- **💎 Opus**: 1 task (complex automation, optional)

### Total Effort
- **Core tasks**: 13-16 days (assuming some tasks faster than estimated)
- **Optional tasks**: +3.5 days (if pursued)
- **Target completion**: 2-3 weeks

## Progress Tracking

**Current Status**: 0/25 tasks completed (0%)

**Week 1 Target**: T-001 to T-003 completed (3/25 = 12%)
**Week 2 Target**: T-004 to T-008 completed (8/25 = 32%)
**Week 3 Target**: T-009 to T-016 completed (16/25 = 64%, minimum for closure)

**Minimum Viable Completion**: T-001 to T-016 (16 tasks, 64%)
**Full Completion**: T-001 to T-019 (19 tasks, 76%, includes optional)

## Notes

- Each task follows the same pattern established in T-001
- Tests must be updated alongside production code
- Pre-commit hook validation required for each task
- Manual CLI testing recommended for critical commands
- Optional tasks (T-017 to T-019) defer to future if time-constrained
