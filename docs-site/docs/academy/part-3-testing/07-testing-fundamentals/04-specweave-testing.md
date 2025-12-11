---
sidebar_position: 4
title: "07.4 Testing with SpecWeave"
description: "BDD scenarios, quality gates, and test-aware planning"
---

# Lesson 07.4: Testing with SpecWeave

**Duration**: 45 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will understand:
- How SpecWeave embeds testing in the planning phase
- BDD scenarios in tasks.md
- Quality gates for test validation
- The test-first development flow

---

## Test-Aware Planning

SpecWeave doesn't treat testing as an afterthought — tests are planned **before** code is written.

### Traditional Approach

```
1. Write code
2. "Oh, I should probably write tests"
3. Write tests that pass (testing implementation, not behavior)
4. Ship with gaps in coverage
```

### SpecWeave Approach

```
1. Define acceptance criteria (spec.md)
2. Create tasks with BDD test plans (tasks.md)
3. Write tests first (they fail initially)
4. Write code to make tests pass
5. Quality gates validate coverage
6. Ship with documented, tested code
```

---

## BDD Scenarios in tasks.md

Every task includes a test plan in **Given-When-Then** format:

```markdown
## T-003: Implement password validation

**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03

### Implementation Notes
Create validatePassword function that checks:
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

### Test Plan (BDD)

```gherkin
Scenario: Valid password accepted
  Given a password "Secure123!"
  When validatePassword is called
  Then it returns true

Scenario: Password too short
  Given a password "Abc1!"
  When validatePassword is called
  Then it throws "Password must be at least 8 characters"

Scenario: Password missing uppercase
  Given a password "secure123!"
  When validatePassword is called
  Then it throws "Password must contain uppercase letter"

Scenario: Password missing number
  Given a password "Secure!!!"
  When validatePassword is called
  Then it throws "Password must contain a number"

Scenario: Password missing special character
  Given a password "Secure123"
  When validatePassword is called
  Then it throws "Password must contain special character"
```

### Files Changed
- [ ] `src/validators/password.ts`
- [ ] `tests/validators/password.test.ts`
```

---

## From BDD to Tests

BDD scenarios translate directly to test code:

### The Scenario

```gherkin
Scenario: Valid password accepted
  Given a password "Secure123!"
  When validatePassword is called
  Then it returns true
```

### The Test

```typescript
describe('validatePassword', () => {
  it('should accept valid password', () => {
    // Given
    const password = 'Secure123!';

    // When
    const result = validatePassword(password);

    // Then
    expect(result).toBe(true);
  });
});
```

### Complete Test Suite from BDD

```typescript
describe('validatePassword', () => {
  // Scenario: Valid password accepted
  it('should accept valid password', () => {
    expect(validatePassword('Secure123!')).toBe(true);
  });

  // Scenario: Password too short
  it('should reject password shorter than 8 characters', () => {
    expect(() => validatePassword('Abc1!'))
      .toThrow('Password must be at least 8 characters');
  });

  // Scenario: Password missing uppercase
  it('should reject password without uppercase', () => {
    expect(() => validatePassword('secure123!'))
      .toThrow('Password must contain uppercase letter');
  });

  // Scenario: Password missing number
  it('should reject password without number', () => {
    expect(() => validatePassword('Secure!!!'))
      .toThrow('Password must contain a number');
  });

  // Scenario: Password missing special character
  it('should reject password without special character', () => {
    expect(() => validatePassword('Secure123'))
      .toThrow('Password must contain special character');
  });
});
```

---

## Quality Gates

SpecWeave enforces testing through quality gates.

### `/sw:validate` Checks

When you run `/sw:validate`, SpecWeave verifies:

```
Validating increment 0001-user-auth...

📋 Task Completion
   ✓ 12/12 tasks have test plans

✅ Acceptance Criteria Coverage
   ✓ AC-US1-01 → T-001, T-002
   ✓ AC-US1-02 → T-003
   ✓ AC-US1-03 → T-003, T-004
   ✓ 100% ACs covered by tasks with tests

🧪 Test Files
   ✓ tests/validators/password.test.ts exists
   ✓ tests/services/auth.test.ts exists
   ✓ tests/api/auth.test.ts exists

📊 Coverage (if available)
   ✓ Overall: 85% (threshold: 70%)
```

### `/sw:done` Requirements

You **cannot** complete an increment without:
- ✓ All tasks marked complete
- ✓ All acceptance criteria satisfied
- ✓ Test files exist for each task
- ✓ Coverage meets threshold
- ✓ All tests passing

```
/sw:done 0001

❌ Cannot complete increment:
   - Task T-008 missing test file
   - Coverage 65% below threshold (70%)
   - 2 tests failing

Fix these issues and try again.
```

---

## Traceability Chain

SpecWeave maintains full traceability from requirements to tests:

```
Business Need
    ↓
User Story (US-001: User Registration)
    ↓
Acceptance Criteria (AC-US1-02: Password must meet requirements)
    ↓
Task (T-003: Implement password validation)
    ↓
BDD Scenario (Valid password accepted)
    ↓
Test (validatePassword.test.ts → should accept valid password)
    ↓
Code (src/validators/password.ts → validatePassword)
```

### Why Traceability Matters

| Question | Answer |
|----------|--------|
| "Why does this test exist?" | Satisfies AC-US1-02 |
| "What tests cover this AC?" | T-003, T-004 tests |
| "Is this requirement tested?" | Check AC → Task → Test chain |
| "What breaks if I change this?" | Find tests linked to the code |

---

## The TDD Flow with SpecWeave

### Step 1: Create Increment

```
/sw:increment "User registration with password validation"
```

### Step 2: Review BDD Scenarios in tasks.md

```markdown
## T-003: Implement password validation
### Test Plan (BDD)
- Given password "Secure123!" → Should pass
- Given password "weak" → Should fail (too short)
...
```

### Step 3: Write Tests First (Red)

```typescript
// tests/validators/password.test.ts
describe('validatePassword', () => {
  it('should accept valid password', () => {
    expect(validatePassword('Secure123!')).toBe(true);
  });

  it('should reject short password', () => {
    expect(() => validatePassword('weak'))
      .toThrow('Password must be at least 8 characters');
  });
});
```

Run tests → **They fail** (function doesn't exist yet)

### Step 4: Implement to Pass (Green)

```typescript
// src/validators/password.ts
export function validatePassword(password: string): boolean {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  // ... more validations
  return true;
}
```

Run tests → **They pass**

### Step 5: Refactor (Blue)

Clean up the code while tests keep passing.

### Step 6: Mark Task Complete

```
/sw:do
→ T-003 complete ✓
```

### Step 7: Validate and Done

```
/sw:validate 0001
→ All checks passed ✓

/sw:done 0001
→ Increment complete ✓
```

---

## Coverage Targets

SpecWeave recommends these coverage targets:

| Code Type | Target |
|-----------|--------|
| Critical business logic | 90%+ |
| Core features | 85% |
| Utility functions | 80% |
| Overall project | 70%+ |

### Setting Coverage in Config

```json
// .specweave/config.json
{
  "testing": {
    "coverageThreshold": 70,
    "criticalPathThreshold": 90,
    "requireTestPlans": true
  }
}
```

---

## Module 07 Complete!

Congratulations! You've mastered testing fundamentals:
- ✅ Why testing matters
- ✅ The testing pyramid
- ✅ Test anatomy (AAA pattern)
- ✅ Testing with SpecWeave

---

## Next Module

Ready to dive deep into unit testing?

→ [Continue to Module 08: Unit Testing](../08-unit-testing/)
