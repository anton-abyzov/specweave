---
increment: 0046-console-elimination
status: in-progress
type: feature
priority: high
created: 2025-11-19
started: 2025-11-19
phase: 2
estimated_duration: 2-3 weeks
---

# Console.* Elimination - Phase 2: CLI Commands

## Overview

Systematically eliminate all `console.*` violations from the SpecWeave codebase to improve test reliability, debugging capabilities, and code quality. This increment focuses on **Phase 2: CLI Commands Migration** - the highest-impact user-facing code.

### Problem Statement

The codebase currently has **1,863 `console.*` violations** across 128 files (25.6% of src/). This causes:
- Test output pollution and flaky tests
- Inconsistent error handling
- Poor log traceability in production
- Direct violation of CLAUDE.md Rule #7

**Phase 1 Status**: ✅ Completed
- Fixed metadata-manager.ts
- Added pre-commit hook
- Updated CONTRIBUTING.md
- All tests passing

**Phase 2 Target**: CLI Commands (20 files, ~500 violations, 27% of total)

### Success Criteria

- Zero `console.*` violations in targeted CLI command files
- All tests passing with silent logger
- No test output pollution
- Consistent error handling patterns
- User-facing output quality maintained or improved

## User Stories

### US-001: As a Developer, I want CLI commands to use logger abstraction

**Priority**: P0 (Critical)
**Effort**: 5 story points

**Description**: Migrate all CLI command files from `console.*` to logger abstraction to enable consistent logging, testability, and production debugging.

**Acceptance Criteria**:
- [ ] **AC-US1-01**: All CLI command files use logger injection pattern (4/20 complete)
- [ ] **AC-US1-02**: Zero `console.*` calls in migrated CLI commands (except legitimate user output) (4/20 complete)
- [ ] **AC-US1-03**: All CLI command tests use `silentLogger` to prevent output pollution (N/A - tests validate user output)
- [x] **AC-US1-04**: Pre-commit hook prevents new `console.*` violations
- [x] **AC-US1-05**: User-facing output quality unchanged or improved

**Files Affected**:
- `cli/commands/init.ts` (246 violations) - Highest priority
- `cli/commands/next-command.ts` (42 violations)
- `cli/commands/migrate-to-profiles.ts` (34 violations)
- `cli/commands/validate-plugins.ts` (30 violations)
- `cli/commands/check-discipline.ts` (29 violations)
- `cli/commands/list.ts` (27 violations)
- `cli/commands/init-multiproject.ts` (27 violations)
- Plus 13 additional CLI command files

**Technical Notes**:
- Use CLI pattern: `function initCommand(options: { logger?: Logger } = {})`
- Default to `consoleLogger` for backward compatibility
- Distinguish user-facing output vs debug logs
- Preserve CLI UX (colors, formatting, progress indicators)

### US-002: As a QA Engineer, I want tests to run without console pollution

**Priority**: P0 (Critical)
**Effort**: 3 story points

**Description**: Update all tests that interact with CLI commands to use `silentLogger`, eliminating test output pollution and improving test reliability.

**Acceptance Criteria**:
- [ ] **AC-US2-01**: All CLI command tests inject `silentLogger`
- [ ] **AC-US2-02**: No console output during test runs (npm run test:unit)
- [ ] **AC-US2-03**: Test coverage maintained or improved
- [ ] **AC-US2-04**: No flaky tests caused by timing/output issues

**Technical Notes**:
- Update test setup: `const result = await initCommand('.', { logger: silentLogger })`
- Remove unnecessary `setTimeout()` waits
- Verify synchronous behavior
- Check for leaked console.* in test utilities

### US-003: As a Contributor, I want clear guidelines for logging

**Priority**: P1 (High)
**Effort**: 2 story points

**Description**: Ensure CONTRIBUTING.md, CLAUDE.md, and code examples provide clear, actionable guidance on when and how to use logger abstraction vs user-facing output.

**Acceptance Criteria**:
- [ ] **AC-US3-01**: CONTRIBUTING.md has comprehensive logging guidelines (already added in Phase 1)
- [ ] **AC-US3-02**: Code examples demonstrate CLI pattern with logger injection
- [ ] **AC-US3-03**: Clear distinction between user output vs debug logs documented
- [ ] **AC-US3-04**: Pre-commit hook provides helpful error messages with examples

**Technical Notes**:
- Already largely complete from Phase 1
- May need minor updates based on Phase 2 learnings
- Add CLI-specific examples

## Technical Requirements

### TR-001: Logger Injection Pattern

**Description**: All CLI command functions must accept optional logger parameter with default fallback.

**Implementation**:
```typescript
import { Logger, consoleLogger } from '../../utils/logger.js';

export async function initCommand(
  projectPath: string,
  options: {
    force?: boolean;
    language?: string;
    logger?: Logger;
  } = {}
): Promise<void> {
  const logger = options.logger ?? consoleLogger;

  // Use logger for debug/error messages
  logger.log('Starting initialization...');
  logger.error('Failed to initialize', error);

  // Use console.log ONLY for user-facing output (tables, ASCII art, etc.)
  // Document with comment: // User-facing output (exception to logger rule)
  console.log(chalk.green('✅ Project initialized successfully!'));
}
```

**Validation**:
- Grep for `console.*` in CLI commands (should find only documented exceptions)
- Run tests with silentLogger (should pass without output)
- Pre-commit hook catches new violations

### TR-002: User-Facing Output Exceptions

**Description**: Distinguish between debug logs (use logger) and user-facing output (can use console.log with documentation).

**Criteria**:
- User-facing: Progress indicators, success messages, formatted tables, ASCII art
- Debug logs: Error details, state changes, file operations, API calls

**Documentation**:
```typescript
// User-facing output (exception to logger rule)
console.log(chalk.cyan(figlet.textSync('SpecWeave', { horizontalLayout: 'full' })));

// Debug log (use logger)
logger.log(`Loading configuration from ${configPath}`);
```

### TR-003: Test Integration

**Description**: All tests for CLI commands must inject `silentLogger` to prevent output pollution.

**Implementation**:
```typescript
import { silentLogger } from '../../../src/utils/logger.js';

describe('initCommand', () => {
  it('should initialize project', async () => {
    await initCommand('.', { logger: silentLogger });
    // Assertions...
  });
});
```

## Non-Functional Requirements

### NFR-001: Performance
- Logger injection adds negligible overhead (<1ms per call)
- No performance regression in CLI commands

### NFR-002: Backward Compatibility
- Default logger behavior unchanged (consoleLogger)
- Existing CLI usage works without modifications
- Only tests need updates (internal change)

### NFR-003: Test Quality
- All tests pass without console output
- No flaky tests introduced
- Coverage maintained at 80%+ (current: ~85%)

### NFR-004: Developer Experience
- Clear error messages from pre-commit hook
- Helpful migration examples in CONTRIBUTING.md
- Code review checklist includes logger verification

## Risks & Mitigations

### Risk 1: Breaking User-Facing Output
**Impact**: High
**Likelihood**: Medium
**Mitigation**:
- Carefully review all console.log usage before migration
- Distinguish user output vs debug logs
- Manual testing of CLI commands after migration
- Add E2E tests for CLI output formatting

### Risk 2: Test Coverage Gaps
**Impact**: Medium
**Likelihood**: Low
**Mitigation**:
- Run full test suite after each file migration
- Review test output for missing assertions
- Add integration tests for CLI commands

### Risk 3: Scope Creep (500 violations!)
**Impact**: High
**Likelihood**: Medium
**Mitigation**:
- Strict focus on Phase 2 files only (20 CLI commands)
- Defer Phase 3/4 to separate increments
- Time-box work to 2-3 weeks max

### Risk 4: Merge Conflicts
**Impact**: Medium
**Likelihood**: High (CLI commands frequently modified)
**Mitigation**:
- Coordinate with team on migration schedule
- Migrate highest-priority files first
- Frequent commits to reduce conflict window

## Dependencies

### Upstream (Blockers)
- ✅ Logger abstraction implemented (src/utils/logger.ts)
- ✅ Phase 1 complete (metadata-manager.ts, pre-commit hook)
- ✅ CONTRIBUTING.md guidelines added

### Downstream (Enables)
- Phase 3: Utilities & Integrations migration
- Phase 4: Init Flow & Adapters migration
- Zero console.* violations goal (Q2 2025)

## Out of Scope

The following are explicitly **not** included in Phase 2:

- Phase 3 files (utilities, integrations) - Separate increment
- Phase 4 files (init flows, adapters) - Separate increment
- Test utilities with console.* - Low priority
- Plugin files - Different logging strategy
- Automated migration script - Nice-to-have, not required

## Success Metrics

### Quantitative
- **Primary**: 0 console.* violations in 20 CLI command files (from ~500)
- **Test quality**: 0 console output during test runs
- **Coverage**: Maintain 80%+ test coverage
- **Performance**: <1% regression in CLI command execution time

### Qualitative
- Code reviews show consistent logger usage
- Developers report clearer error messages
- Tests run cleanly without output pollution
- Pre-commit hook prevents regressions

## Validation Criteria

Before closing this increment:

1. **Code Quality**
   - [ ] Zero console.* violations in Phase 2 files (verified with grep)
   - [ ] All CLI commands use logger injection pattern
   - [ ] User-facing exceptions documented with comments

2. **Test Quality**
   - [ ] All tests pass without console output
   - [ ] All CLI command tests use silentLogger
   - [ ] No flaky tests
   - [ ] Coverage at 80%+

3. **Documentation**
   - [ ] CONTRIBUTING.md reflects CLI patterns (if updated)
   - [ ] Code examples show proper logger usage
   - [ ] README.md updated if CLI behavior changed

4. **Prevention**
   - [ ] Pre-commit hook active and blocking violations
   - [ ] Code review checklist includes logger verification
   - [ ] Team aware of logging guidelines

## Related Work

- **Phase 1**: ✅ Complete (metadata-manager.ts, pre-commit hook, CONTRIBUTING.md)
- **Phase 3**: Utilities & Integrations (next quarter)
- **Phase 4**: Init Flow & Adapters (future)
- **Analysis Report**: `.specweave/increments/0046-console-elimination/reports/analysis-report.md`
- **Implementation Summary**: `.specweave/increments/0046-console-elimination/reports/implementation-summary.md`

## References

- **CLAUDE.md Rule #7**: "NEVER Use console.* in Production Code"
- **Logger Implementation**: `src/utils/logger.ts`
- **Silent Logger**: Used in tests to prevent output pollution
- **Pre-commit Hook**: `scripts/pre-commit-console-check.sh`
