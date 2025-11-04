---
name: check-tests
description: Validate test coverage for increment tasks, check AC-ID coverage, report test status, and verify coverage targets (NEW format with embedded tests in tasks.md)
---

# Check Tests - Test Coverage Validation

**Purpose**: Validate test coverage from tasks.md (NEW format with embedded tests)

**Replaces**: `validate-coverage` (old command for tests.md format)

Shows:
- Task test coverage status (which tasks have tests)
- Test pass/fail status (if tests implemented)
- Coverage targets vs actual coverage
- AC-ID coverage (which acceptance criteria are tested)
- Missing tests or gaps in coverage

---

## Usage

```bash
# Check tests for current increment
/check-tests

# Check tests for specific increment
/check-tests 0007

# Detailed report with test case breakdown
/check-tests 0007 --detailed

# AC-ID coverage report only
/check-tests 0007 --ac-coverage
```

---

## What It Does

### Architecture Change (v0.7.0)

**OLD Format** (pre-v0.7.0):
- Separate tests.md file with TC-IDs
- validate-coverage command parsed tests.md

**NEW Format** (v0.7.0+):
- Embedded tests in tasks.md
- check-tests command parses tasks.md for test plans

**Why the change?**
- Single source of truth (no sync issues)
- Simpler architecture
- Industry-aligned (BDD, Agile patterns)

---

## Output Example (NEW Format)

```bash
/check-tests 0007

📊 Test Status Report: 0007-smart-increment-discipline

═══════════════════════════════════════════════════════════════

Task Coverage Analysis:

✅ T-001: Update plan.md (N/A - documentation)
   Validation: Manual review complete

✅ T-003: Create test-aware-planner structure (2 test cases, 85% coverage)
   - Manual: Directory structure verified ✅
   - Integration: tests/integration/test-aware-planner/agent-invocation.test.ts
     • testAgentCanBeInvoked() ✅ (passed)
     • testAgentReadsSpecPlan() ✅ (passed)
   Coverage: 87% (target: 85%) ✅

⚠️  T-007: Create check-tests command (0 test cases, 0% coverage)
   WARNING: No test plan defined!
   Action: Add test cases to T-007 or mark as non-testable

❌ T-008: Implement check-tests logic (3 test cases, 45% coverage)
   - Unit: tests/unit/check-tests.test.ts
     • testParseTasksMd() ❌ (failing: Expected 3 tasks, got 2)
     • testExtractTestCases() ✅ (passed)
     • testCalculateCoverage() ⏸️  (not implemented)
   Coverage: 45% ❌ (target: 85%, below threshold!)
   Action: Fix failing test, implement missing test

═══════════════════════════════════════════════════════════════

Overall Coverage: 72% ⚠️  (target: 80-90%)

Breakdown:
- Testable tasks: 15/24 (62%)
- Non-testable tasks: 9/24 (38%) ✅
- Average coverage (testable): 78% ⚠️
- Tests passing: 12/18 (67%) ⚠️
- Tests failing: 3/18 (17%) ❌
- Tests not implemented: 3/18 (17%) ⏸️

═══════════════════════════════════════════════════════════════

Acceptance Criteria Coverage:

✅ AC-US1-01: Covered by T-001, T-003 (6 tests, 88% coverage)
✅ AC-US1-02: Covered by T-002, T-004 (4 tests, 92% coverage)
⚠️  AC-US2-01: Partially covered by T-007 (0 tests)
   Missing: Unit tests for command logic
❌ AC-US3-05: Not covered by any task
   Action: Add task for AC-US3-05 or mark as won't-do

═══════════════════════════════════════════════════════════════

🎯 Recommendations:

Priority: P1 (blocking issues)
1. Fix failing test in T-008: testParseTasksMd()
2. Implement missing test in T-008: testCalculateCoverage()
3. Add test plan to T-007 or mark as non-testable

Priority: P2 (coverage gaps)
4. Increase coverage in T-008 to ≥85%
5. Add unit tests for AC-US2-01
6. Create task for uncovered AC-US3-05

═══════════════════════════════════════════════════════════════

Summary:
- Status: ⚠️  NEEDS WORK (coverage below 80%, failing tests)
- Next: Fix failing tests, implement missing tests
- Run: npm test (to re-run all tests)
```

---

## Detailed Report (--detailed flag)

```bash
/check-tests 0007 --detailed

[Shows expanded report with:]
- Full test case breakdown per task
- Code coverage metrics per file
- Test execution times
- Test file paths and line numbers
- Suggestions for improving coverage
```

---

## AC Coverage Report (--ac-coverage flag)

```bash
/check-tests 0007 --ac-coverage

═══════════════════════════════════════════════════════════════

Acceptance Criteria Coverage Report: 0007

✅ AC-US1-01: User can login with email/password
   Covered by: T-001, T-003
   Test cases: 6 (unit: 3, integration: 2, E2E: 1)
   Coverage: 88%
   Status: ✅ PASSING

✅ AC-US1-02: User can logout
   Covered by: T-002, T-004
   Test cases: 4 (unit: 2, integration: 2)
   Coverage: 92%
   Status: ✅ PASSING

⚠️  AC-US2-01: Command validates test coverage
   Covered by: T-007, T-008
   Test cases: 3 (unit: 3)
   Coverage: 45% ⚠️
   Status: ⚠️  PARTIAL (1 failing, 1 not implemented)

❌ AC-US3-05: Documentation is complete
   Covered by: NONE
   Test cases: 0
   Coverage: 0%
   Status: ❌ NOT COVERED

═══════════════════════════════════════════════════════════════

Summary:
- Total AC-IDs: 4
- Fully covered: 2 (50%)
- Partially covered: 1 (25%)
- Not covered: 1 (25%)
- Overall AC coverage: 75% ⚠️
```

---

## What It Checks

### 1. Task Test Coverage

For each task in tasks.md:

**Testable tasks**:
- Parses "Test Plan" section (Given/When/Then)
- Extracts "Test Cases" (unit/integration/E2E)
- Checks if test files exist
- Runs tests (if implemented)
- Compares actual vs target coverage

**Non-testable tasks**:
- Verifies "Test Plan: N/A" is set
- Checks "Validation" section exists
- Reports validation methods

### 2. Test Execution Status

- ✅ Passing tests (green)
- ❌ Failing tests (red, shows error)
- ⏸️  Not implemented (gray, needs implementation)
- 🚫 Test file missing (needs creation)

### 3. Coverage Metrics

- Per-task coverage (from task definition)
- Per-test-level coverage (unit/int/E2E)
- Overall increment coverage
- Comparison to target (80-90%)

### 4. AC-ID Coverage

- Maps AC-IDs from spec.md → tasks in tasks.md
- Checks which AC-IDs have test coverage
- Identifies untested acceptance criteria
- Reports partial vs full coverage

### 5. Recommendations

Priority-based action items:
- **P1 (blocking)**: Failing tests, missing critical tests
- **P2 (important)**: Coverage gaps, untested AC-IDs
- **P3 (nice-to-have)**: Minor coverage improvements

---

## How It Works (NEW Format)

### Step 1: Parse tasks.md

```typescript
// Pseudo-code for check-tests logic

const tasks = parseTasksMd('.specweave/increments/0007/tasks.md');

for (const task of tasks) {
  if (task.testPlan === 'N/A') {
    // Non-testable task
    reportValidation(task);
  } else {
    // Testable task
    const testCases = extractTestCases(task);
    const results = runTests(testCases);
    const coverage = calculateCoverage(results);

    reportTestStatus(task, testCases, results, coverage);
  }
}
```

### Step 2: Extract Test Cases

From each task's "Test Cases" section:

```markdown
**Test Cases**:
1. **Unit**: `tests/unit/auth.test.ts`
   - testValidLogin(): ...
   - testInvalidLogin(): ...
```

Extracts:
- Test level (Unit, Integration, E2E)
- Test file path
- Test function names
- Coverage target

### Step 3: Run Tests (if implemented)

```bash
# For each test file, run:
npm test tests/unit/auth.test.ts

# Capture:
# - Pass/fail status
# - Error messages
# - Code coverage %
```

### Step 4: Compare Coverage

```
Actual coverage: 87%
Target coverage: 85%
Status: ✅ PASSING (actual ≥ target)
```

### Step 5: Check AC-ID Coverage

```markdown
# From spec.md:
AC-US1-01: User can login

# From tasks.md:
T-001: Implement login
  Acceptance Criteria: AC-US1-01

# Result:
AC-US1-01 → Covered by T-001 ✅
```

---

## Backward Compatibility (OLD Format)

**If increment has tests.md** (pre-v0.7.0):

```bash
/check-tests 0003  # Old format increment

⚠️  OLD FORMAT DETECTED: tests.md exists

This increment uses the old format (separate tests.md).
The check-tests command supports both formats.

[Parses tests.md with TC-IDs instead of tasks.md]

📊 Test Status Report: 0003 (OLD FORMAT)

Test Case Coverage:
✅ TC-001: User can login (3 tests, 90% coverage)
...
```

**Detection logic**:

```typescript
const hasTestsMd = fs.existsSync('.specweave/increments/0003/tests.md');

if (hasTestsMd) {
  // OLD FORMAT: Parse tests.md for TC-IDs
  return checkTestsOldFormat(incrementId);
} else {
  // NEW FORMAT: Parse tasks.md for embedded tests
  return checkTestsNewFormat(incrementId);
}
```

---

## Integration with Workflow

**When to run check-tests**:

1. **During development**: After implementing tasks
   ```bash
   # Implement T-001
   # Write tests
   /check-tests  # Verify tests pass
   ```

2. **Before PR**: Ensure coverage meets targets
   ```bash
   /check-tests 0007
   # Fix any failing tests
   # Commit and push
   ```

3. **In CI/CD**: Automated test validation
   ```bash
   # In .github/workflows/test.yml
   - name: Check test coverage
     run: npx specweave check-tests $INCREMENT_ID
   ```

4. **PM Gate 2**: Part of increment closure
   ```bash
   /done 0007
   # PM Agent runs /check-tests automatically
   # Verifies >80% coverage before closure
   ```

---

## Exit Codes

For CI/CD integration:

```bash
/check-tests 0007
echo $?  # Exit code

# Exit codes:
# 0 = All tests passing, coverage ≥80%
# 1 = Tests failing
# 2 = Coverage <80%
# 3 = AC-IDs not covered
# 4 = Command error (invalid increment, etc.)
```

---

## Files Read

The command reads:
- `.specweave/increments/{id}/tasks.md` (NEW format)
- `.specweave/increments/{id}/tests.md` (OLD format, if exists)
- `.specweave/increments/{id}/spec.md` (for AC-IDs)
- Test files (to check existence)
- Coverage reports (if generated)

---

## Related Commands

- `/validate 0007` - Full increment validation (tasks, tests, docs)
- `/progress` - Current increment progress with test status
- `/done 0007` - Close increment (runs check-tests automatically)

---

## Comparison: OLD vs NEW Command

| Aspect | OLD (validate-coverage) | NEW (check-tests) |
|--------|------------------------|-------------------|
| **Reads** | tests.md | tasks.md |
| **Test IDs** | TC-001, TC-002 | Function names |
| **Format** | Separate file | Embedded in tasks |
| **BDD** | No | Yes (Given/When/Then) |
| **AC Traceability** | Manual | Automatic (AC-IDs) |
| **Sync Issues** | tasks ↔ tests | None (single file) |
| **Coverage Target** | Per test case | Per task + overall |
| **Status** | Deprecated (v0.7+) | Current |

---

## Technical Implementation Notes

For developers working on check-tests logic (T-008):

### Input: tasks.md (NEW format)

```markdown
### T-001: Implement Feature

**Test Plan**:
- **Given** precondition
- **When** action
- **Then** outcome

**Test Cases**:
1. **Unit**: `tests/unit/feature.test.ts`
   - testFeatureSuccess(): ...
   - **Coverage Target**: 90%
**Overall Coverage Target**: 85%
```

### Parsing Logic

```typescript
interface TaskTest {
  taskId: string;
  testPlan: TestPlan | 'N/A';
  testCases: TestCase[];
  overallTarget: number;
}

interface TestPlan {
  given: string;
  when: string;
  then: string;
  and?: string;
}

interface TestCase {
  level: 'Unit' | 'Integration' | 'E2E';
  filePath: string;
  functions: string[];
  target: number;
}
```

### Test Execution

```typescript
async function runTest(testCase: TestCase): Promise<TestResult> {
  // Run: npm test {filePath}
  // Parse output for pass/fail
  // Extract coverage %
  return {
    passed: boolean,
    coverage: number,
    errors: string[]
  };
}
```

### Report Generation

```typescript
function generateReport(results: TaskTest[]): Report {
  return {
    taskCoverage: calculateTaskCoverage(results),
    acCoverage: calculateACCoverage(results, specMd),
    recommendations: generateRecommendations(results),
    overallStatus: determineStatus(results)
  };
}
```

---

## Future Enhancements (Post-v0.7.0)

- **Visual coverage reports**: HTML report generation
- **Trend tracking**: Coverage over time (per increment)
- **Auto-fix suggestions**: "Run this command to fix coverage"
- **Integration with IDEs**: VS Code extension
- **Parallel test execution**: Speed up large test suites

---

## Summary

**check-tests** is the NEW command (v0.7.0+) for validating test coverage from tasks.md with embedded test plans.

**Key Features**:
- ✅ Parses tasks.md (NEW format)
- ✅ Checks AC-ID coverage
- ✅ Reports test pass/fail status
- ✅ Validates coverage targets (80-90%)
- ✅ Backward compatible (supports old tests.md format)
- ✅ Generates actionable recommendations

**Replaces**: validate-coverage (deprecated)

**See also**: ARCHITECTURE-PIVOT.md (rationale for NEW format)
