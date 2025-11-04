---
name: specweave:validate-coverage
description: Validate test coverage for acceptance criteria and tasks
usage: /specweave:validate-coverage [increment-id]
aliases: [validate-coverage]
---

# Validate Coverage Command

**Usage**: `/specweave:validate-coverage [increment-id]`

**Shortcut**: `/validate-coverage [increment-id]`

---

## Purpose

Validate test coverage for an increment by checking:
- **AC Coverage**: Every acceptance criterion has linked tests
- **Task Coverage**: Every testable task has test plans
- **Bidirectional Links**: AC ↔ Task ↔ Test relationships are complete

**When to use**:
- Before marking increment complete (`/done`)
- During implementation to check progress
- After adding new tasks/tests
- During code review

---

## Output Format

### Complete Coverage (Success)

```bash
/validate-coverage 0007

✅ Coverage Validation - Increment 0007

📊 Acceptance Criteria Coverage: 100% (20/20)
✅ AC-US1-01: 2 test plans (T-001, T-003)
✅ AC-US1-02: 2 test plans (T-004, T-005)
✅ AC-US2-01: 3 test plans (T-006, T-007, T-008)
... (all ACs listed)

📊 Task Coverage: 90% (36/40 testable tasks)
✅ T-001: Test plan present (unit + integration)
✅ T-002: Test plan present (unit)
✅ T-003: Test plan present (E2E)
... (testable tasks listed)

⚪ Non-Testable Tasks (4):
  T-005: Documentation task
  T-012: Configuration task
  T-025: Research task
  T-030: Planning task

📊 Summary:
  - Total ACs: 20
  - Covered ACs: 20 (100%)
  - Total tasks: 40
  - Testable tasks: 36
  - Covered testable tasks: 36 (100%)
  - Non-testable tasks: 4

✅ COVERAGE MEETS TARGET (80%+ threshold)

💡 Ready to mark increment complete: /done 0007
```

### Incomplete Coverage (Needs Work)

```bash
/validate-coverage 0008

⚠️  Coverage Validation - Increment 0008

📊 Acceptance Criteria Coverage: 70% (14/20)
✅ AC-US1-01: 2 test plans (T-001, T-003)
✅ AC-US1-02: 1 test plan (T-004)
❌ AC-US2-01: NO TEST PLANS
❌ AC-US2-02: NO TEST PLANS
❌ AC-US3-01: NO TEST PLANS

📊 Task Coverage: 65% (26/40 testable tasks)
✅ T-001: Test plan present
✅ T-002: Test plan present
❌ T-008: NO TEST PLAN (testable task!)
❌ T-012: NO TEST PLAN (testable task!)
❌ T-015: NO TEST PLAN (testable task!)

❌ COVERAGE BELOW TARGET (80% threshold)

🚨 Issues Found:
1. AC-US2-01 has no test coverage (no tasks reference it)
2. AC-US2-02 has no test coverage (no tasks reference it)
3. AC-US3-01 has no test coverage (no tasks reference it)
4. T-008 has no test plan (implementation task without tests)
5. T-012 has no test plan (implementation task without tests)
6. T-015 has no test plan (implementation task without tests)

💡 Recommendations:
  - Add test plans to T-008, T-012, T-015
  - Create tasks for AC-US2-01, AC-US2-02, AC-US3-01
  - Or mark ACs as "won't implement" if scope reduced

❌ NOT READY for completion. Fix coverage issues first.
```

---

## Coverage Calculation

### AC Coverage

```typescript
// Parse spec.md - extract all AC-IDs
const acIds = extractACIds(specContent);  // ["AC-US1-01", "AC-US1-02", ...]

// Parse tasks.md - find which ACs are referenced
const taskACs = extractACReferences(tasksContent);

// Calculate coverage
acIds.forEach(acId => {
  const tasks = taskACs[acId] || [];
  if (tasks.length > 0) {
    console.log(`✅ ${acId}: ${tasks.length} test plans`);
  } else {
    console.log(`❌ ${acId}: NO TEST PLANS`);
  }
});

const covered = acIds.filter(ac => taskACs[ac]?.length > 0).length;
const coverage = Math.round((covered / acIds.length) * 100);
```

### Task Coverage

```typescript
// Parse tasks.md - extract all tasks
const tasks = extractTasks(tasksContent);

// Identify testable vs non-testable
const testable = tasks.filter(t => !isNonTestable(t));
const nonTestable = tasks.filter(t => isNonTestable(t));

// Check which have test plans
const covered = testable.filter(t => hasTestPlan(t));

// Calculate coverage
const coverage = Math.round((covered.length / testable.length) * 100);
```

### Non-Testable Task Detection

Tasks are non-testable if:
- Marked as "N/A (documentation)"
- Tagged with "documentation", "configuration", "research", "planning"
- Have "Test Plan: N/A" section

```markdown
### T-005: Update Documentation

**Test Plan**: N/A (documentation task)
```

---

## Coverage Thresholds

| Coverage Level | Percentage | Status |
|---------------|------------|--------|
| **Excellent** | 90-100% | ✅ Excellent coverage |
| **Good** | 80-89% | ✅ Meets threshold |
| **Acceptable** | 70-79% | ⚠️  Below threshold but acceptable |
| **Poor** | <70% | ❌ Insufficient coverage |

**Target**: 80%+ for AC and testable task coverage

---

## Command Options

### Default (Current Increment)

```bash
/validate-coverage

# Validates the current increment (most recently active)
```

### Specific Increment

```bash
/validate-coverage 0007

# Validates increment 0007
```

### All Increments

```bash
/validate-coverage --all

📊 Coverage Report - All Increments

✅ 0001-core-framework: 95% AC, 90% task
✅ 0002-enhancements: 85% AC, 85% task
⚠️  0003-model-selection: 75% AC, 70% task
✅ 0004-plugin-arch: 90% AC, 88% task
❌ 0005-cross-platform: 60% AC, 55% task

Average: 81% AC, 78% task
```

---

## Integration with /done Command

Before completing an increment, `/done` automatically runs coverage validation:

```bash
/done 0007

🔍 Running coverage validation...

⚠️  Coverage: 75% AC, 70% task (below 80% threshold)

❓ Continue anyway? [y/N]: n

❌ Completion cancelled
💡 Fix coverage issues first: /validate-coverage 0007
```

---

## Detailed Validation Report

### With --verbose Flag

```bash
/validate-coverage 0007 --verbose

📊 Detailed Coverage Report - Increment 0007

━━━ ACCEPTANCE CRITERIA ━━━

AC-US1-01: "User can login with email/password"
  ✅ Covered by: T-001 (Login API endpoint)
  ✅ Covered by: T-003 (Frontend login form)
  📝 Test plans:
     - tests/unit/auth-service.test.ts
     - tests/e2e/login.spec.ts

AC-US1-02: "Invalid credentials show error"
  ✅ Covered by: T-002 (Error handling)
  📝 Test plans:
     - tests/unit/auth-service.test.ts (edge cases)

AC-US2-01: "Session persists after refresh"
  ❌ NO COVERAGE
  💡 Recommendation: Add task for session persistence

━━━ TASKS ━━━

T-001: Implement login API endpoint
  ✅ Test plan present
  📝 References: AC-US1-01
  📝 Test file: tests/unit/auth-service.test.ts
  📝 Test functions:
     - should login with valid credentials
     - should reject invalid email
     - should reject wrong password

T-002: Add error handling
  ✅ Test plan present
  📝 References: AC-US1-02
  📝 Test file: tests/unit/auth-service.test.ts
  📝 Test functions:
     - should show error message
     - should not leak details

T-005: Update documentation
  ⚪ Non-testable (documentation)

... (all tasks listed)

━━━ SUMMARY ━━━

AC Coverage: 85% (17/20)
Task Coverage: 82% (33/40 testable)

✅ MEETS THRESHOLD (80%+)
```

---

## Best Practices

✅ **Validate early and often** - Check during implementation, not just at end

✅ **Fix coverage gaps promptly** - Don't accumulate technical debt

✅ **80% is the target** - Not 100% (diminishing returns)

✅ **Non-testable tasks are OK** - Documentation, config don't need tests

✅ **Use verbose mode** - For detailed debugging

❌ **Don't skip validation** - Coverage ensures quality

❌ **Don't over-test** - Focus on critical paths, not trivial code

---

## Related Commands

- `/do` - Implement tasks (generates test plans)
- `/done` - Complete increment (runs validation automatically)
- `/specweave:check-tests` - Run actual tests (not just validate plans)

---

## Implementation

Uses TypeScript utility:

```typescript
// src/core/validation/coverage-validator.ts
export class CoverageValidator {
  static validate(incrementId: string): CoverageReport {
    // Read increment files
    const spec = this.readSpec(incrementId);
    const tasks = this.readTasks(incrementId);

    // Extract AC-IDs from spec
    const acIds = this.extractACIds(spec);

    // Extract AC references from tasks
    const taskACRefs = this.extractACReferences(tasks);

    // Calculate AC coverage
    const acCoverage = this.calculateACCoverage(acIds, taskACRefs);

    // Extract tasks
    const allTasks = this.extractTasks(tasks);
    const testableTasks = allTasks.filter(t => !this.isNonTestable(t));

    // Check which tasks have test plans
    const tasksWithTests = testableTasks.filter(t => this.hasTestPlan(t));

    // Calculate task coverage
    const taskCoverage = this.calculateTaskCoverage(testableTasks, tasksWithTests);

    return {
      acCoverage,
      taskCoverage,
      issues: this.findIssues(acIds, taskACRefs, testableTasks, tasksWithTests)
    };
  }
}
```

---

**Command**: `/specweave:validate-coverage` (or `/validate-coverage`)
**Plugin**: specweave (core)
**Version**: v0.7.0+
**Part of**: Increment 0007 - Test-Aware Planning
