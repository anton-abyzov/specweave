# AC Test Validation - Enforced Test-Driven Development

## Overview

**AC Test Validation** is SpecWeave's quality gate that enforces test-driven development for Acceptance Criteria. It ensures that tasks cannot be marked complete until ALL linked Acceptance Criteria have passing tests.

### The Problem

Before AC Test Validation, SpecWeave allowed tasks to be marked complete without validating their Acceptance Criteria:

```
❌ Task marked complete via TodoWrite
❌ Acceptance Criteria remain unchecked in spec.md
❌ No validation that AC requirements are actually satisfied
❌ Quality promises broken without enforcement
```

### The Solution

AC Test Validation introduces a **pre-completion quality gate**:

```
✅ Task completion triggers automatic test validation
✅ ALL AC tests must pass before marking task complete
✅ Failing tests BLOCK task completion with detailed error
✅ Passing tests AUTO-CHECK ACs in spec.md
✅ Test-driven development ENFORCED by the framework
```

---

## How It Works

### Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. Developer marks task as complete via TodoWrite                │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. PreToolUse hook fires: pre-task-completion.sh                 │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Extract task's satisfiesACs field (AC-US1-01, AC-US1-02, ...) │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Extract test file from task's Test Plan section               │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. Run tests for each AC using test runner (vitest/jest)         │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. DECISION POINT:                                                │
│                                                                    │
│    ALL tests pass?                                                │
│    ├─ YES → Allow completion (continue: true)                    │
│    │         └─ Auto-check ACs in spec.md                        │
│    │         └─ Proceed with normal sync                         │
│    │                                                              │
│    └─ NO  → Block completion (continue: false)                   │
│              └─ Show detailed error message                      │
│              └─ Task remains in_progress                         │
└──────────────────────────────────────────────────────────────────┘
```

### Example: Passing Validation

```bash
# Task T-001 has ACs: AC-US1-01, AC-US1-02

# Developer marks task complete
TodoWrite([{task: "T-001", status: "completed"}])

# Hook validates tests
✓ AC-US1-01: 3 tests passed (120ms)
✓ AC-US1-02: 2 tests passed (85ms)

✅ VALIDATION PASSED
All Acceptance Criteria have passing tests.
Task completion allowed.

# Result:
# - Task marked complete in tasks.md
# - ACs auto-checked in spec.md
# - Living docs synced
```

### Example: Failing Validation

```bash
# Task T-001 has ACs: AC-US1-01, AC-US1-02

# Developer marks task complete
TodoWrite([{task: "T-001", status: "completed"}])

# Hook validates tests
✓ AC-US1-01: 3 tests passed (120ms)
✗ AC-US1-02: 1 test failed (90ms)
  Error: Expected true to be false

❌ VALIDATION FAILED
Task cannot be marked complete until all AC tests pass.

Fix the failing tests and try again.
Run tests manually: npm test

# Result:
# - Task completion BLOCKED
# - Task remains in_progress
# - Developer must fix failing test
```

---

## Task Format Requirements

### Test Plan Section (Required)

Every task with Acceptance Criteria MUST have a Test Plan section:

```markdown
### T-001: Implement user authentication

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [ ] pending

**Test Plan**:
- **File**: `tests/unit/auth.test.ts`
- **Tests**: TC-001, TC-002
```

### Test File Format

Tests MUST be organized by AC-ID:

```typescript
import { describe, it, expect } from 'vitest';

describe('AC-US1-01', () => {
  it('TC-001: Login with valid credentials succeeds', () => {
    expect(login('user', 'pass')).toBe(true);
  });

  it('TC-002: Login sets authentication token', () => {
    login('user', 'pass');
    expect(getAuthToken()).toBeDefined();
  });
});

describe('AC-US1-02', () => {
  it('TC-003: Login with invalid credentials fails', () => {
    expect(login('user', 'wrong')).toBe(false);
  });
});
```

**Key Requirements**:
- Test suites MUST use AC-ID as describe block name (`describe('AC-US1-01', ...)`)
- Test cases SHOULD include TC-ID in test name for traceability
- All tests for an AC must pass for validation to succeed

---

## Test Runner Configuration

### Automatic Detection

AC Test Validator automatically detects your test runner from `package.json`:

```json
{
  "devDependencies": {
    "vitest": "^1.0.0"  // Auto-detected: vitest run
    // OR
    "jest": "^29.0.0"   // Auto-detected: jest
  }
}
```

### Supported Test Runners

| Test Runner | Command Generated | Notes |
|-------------|-------------------|-------|
| Vitest | `vitest run <file> -t "AC-XXX"` | Recommended (fastest) |
| Jest | `jest <file> --testNamePattern="AC-XXX"` | Widely supported |
| npm test | `npm test -- <file> -t "AC-XXX"` | Fallback |

### Manual Configuration

Override test runner in `.specweave/config.json`:

```json
{
  "testing": {
    "runner": "vitest",
    "command": "npm run test:ci",
    "timeout": 60000
  }
}
```

---

## Validation Rules

### Rule 1: AC Coverage

**Every task with `satisfiesACs` field MUST have a Test Plan**

```markdown
❌ INVALID (missing Test Plan):
### T-001: Implement feature
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

✅ VALID:
### T-001: Implement feature
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

**Test Plan**:
- **File**: `tests/unit/feature.test.ts`
```

### Rule 2: Test File Existence

**Test file specified in Test Plan MUST exist**

```markdown
**Test Plan**:
- **File**: `tests/unit/auth.test.ts`  ← File must exist
```

### Rule 3: AC Test Suite

**Test file MUST have describe block for each AC**

```typescript
// For task satisfying AC-US1-01:

❌ INVALID (no describe block for AC):
it('login works', () => { ... });

✅ VALID:
describe('AC-US1-01', () => {
  it('login works', () => { ... });
});
```

### Rule 4: All Tests Pass

**ALL tests for ALL ACs must pass (100% pass rate)**

```
Partial pass NOT allowed:
✓ AC-US1-01: 3 passed
✗ AC-US1-02: 1 failed  ← BLOCKS completion

Required:
✓ AC-US1-01: 3 passed
✓ AC-US1-02: 2 passed  ← All pass = Allow completion
```

---

## Integration with SpecWeave Workflow

### Step 1: Create Increment with Test Mode

```bash
/specweave:increment "User Authentication Feature"
# Choose test mode: test-first (TDD) or test-after
```

### Step 2: Implement Feature with Tests

```bash
# Implement code
# Write tests for each AC
# Verify tests pass locally: npm test
```

### Step 3: Mark Task Complete

```bash
# When ready, mark task complete
# Hook automatically validates AC tests
TodoWrite([{task: "T-001", status: "completed"}])
```

### Step 4: Automatic Validation

```bash
# If tests pass:
✅ Task marked complete
✅ ACs auto-checked in spec.md
✅ Living docs synced
✅ External tools notified

# If tests fail:
❌ Task completion blocked
❌ Detailed error shown
❌ Developer fixes tests and retries
```

---

## CLI Usage

### Manual Validation

Validate an increment's AC tests manually:

```bash
node dist/src/core/ac-test-validator-cli.js 0047-us-task-linkage
```

Output:

```
[AC Test Validator] Parsing tasks...
Found 3 completed tasks with ACs to validate

Validating T-001: Implement task parser
─────────────────────────────────────────
Summary:
  Total ACs: 2
  ACs Tested: 2
  Tests Passed: 5
  Tests Failed: 0

✓ VALIDATION PASSED
All Acceptance Criteria have passing tests.
```

### Integration with `/specweave:done`

The validation automatically runs when closing an increment:

```bash
/specweave:done 0047

# Internally runs:
# 1. Validate all tasks have passing tests
# 2. Check all ACs are covered
# 3. Block closure if validation fails
```

---

## Troubleshooting

### Issue: "Test file not found"

**Cause**: Test Plan references non-existent file

**Solution**:
```markdown
**Test Plan**:
- **File**: `tests/unit/auth.test.ts`  ← Check path is correct
```

### Issue: "No Test Plan section"

**Cause**: Task missing Test Plan section

**Solution**: Add Test Plan to task:
```markdown
**Test Plan**:
- **File**: `tests/unit/component.test.ts`
- **Tests**: TC-001, TC-002
```

### Issue: "Tests not running"

**Cause**: Test runner not detected or misconfigured

**Solution**:
```bash
# Check test runner is installed
npm list vitest jest

# Run tests manually to verify
npm test tests/unit/component.test.ts
```

### Issue: "Hook timeout"

**Cause**: Tests taking longer than 60 seconds

**Solution**: Increase timeout in plugin.json:
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "TodoWrite",
      "hooks": [{
        "timeout": 120  // 120 seconds
      }]
    }]
  }
}
```

---

## Best Practices

### 1. Write Tests BEFORE Implementation (TDD)

```markdown
**Recommended workflow**:
1. Create task in tasks.md
2. Write failing tests for all ACs
3. Run tests (should fail)
4. Implement feature
5. Run tests (should pass)
6. Mark task complete (validation passes automatically)
```

### 2. One Test File Per Task

```markdown
**Good**:
T-001: Implement auth → tests/unit/auth.test.ts (focused)

**Avoid**:
T-001: Implement auth → tests/unit/everything.test.ts (bloated)
```

### 3. Explicit AC Coverage

```typescript
// GOOD: Explicit AC markers
describe('AC-US1-01: Login succeeds with valid credentials', () => {
  it('TC-001: Returns true for valid user/pass', () => { ... });
  it('TC-002: Sets authentication token in session', () => { ... });
});

// AVOID: Generic test names
describe('login tests', () => {
  it('works', () => { ... });
});
```

### 4. Test Isolation

```typescript
// GOOD: Each test is independent
describe('AC-US1-01', () => {
  beforeEach(() => {
    resetAuthState(); // Clean state
  });

  it('TC-001: Login succeeds', () => { ... });
  it('TC-002: Sets token', () => { ... });
});

// AVOID: Tests depend on each other
describe('AC-US1-01', () => {
  let token;
  it('TC-001: Login succeeds', () => {
    token = login(...); // State shared
  });
  it('TC-002: Token is valid', () => {
    verify(token); // Depends on TC-001
  });
});
```

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│ ACTestValidator (src/core/ac-test-validator.ts)                 │
│ - Core validation engine                                        │
│ - Test runner integration (vitest/jest)                         │
│ - Result formatting and reporting                               │
└─────────────────────────────────────────────────────────────────┘
          │
          │ uses
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ ac-test-validator-cli.ts (CLI wrapper)                          │
│ - Parse increment tasks                                         │
│ - Run validation for completed tasks                            │
│ - Exit with status code (0=pass, 1=fail)                        │
└─────────────────────────────────────────────────────────────────┘
          │
          │ called by
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ pre-task-completion.sh (Hook)                                   │
│ - Fires before TodoWrite completes                              │
│ - Detects task completion                                       │
│ - Calls CLI validator                                           │
│ - Returns {continue: false} to block if tests fail              │
└─────────────────────────────────────────────────────────────────┘
```

### Hook Registration

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/pre-task-completion.sh",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

---

## Future Enhancements

### Planned Features

1. **Coverage Thresholds**: Require minimum % of AC tests to pass
2. **Partial Completion**: Allow "pending_review" status for partially passing ACs
3. **Visual Test Reports**: HTML reports with AC coverage matrix
4. **Test Generation**: Auto-generate test stubs from AC specifications
5. **CI Integration**: Run validation in CI/CD pipelines before merge

---

## Summary

AC Test Validation is SpecWeave's **quality enforcement mechanism** that ensures:

✅ **No task marked complete without validated ACs**
✅ **Test-driven development enforced by framework**
✅ **Acceptance Criteria promises kept to stakeholders**
✅ **Quality gates automated and consistent**

**This is the solution to the critical gap** where tasks were completed without testing their linked Acceptance Criteria.
