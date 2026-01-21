---
sidebar_position: 7
slug: 06-tdd-workflow
title: "Lesson 6: TDD Workflow"
description: "Test-Driven Development with SpecWeave"
---

# Lesson 6: TDD Workflow

**Time**: 45 minutes
**Goal**: Master test-first development

---

## Why TDD?

:::info TDD is Optional
[TDD](/docs/glossary/terms/tdd) improves code quality but slows development. Use it when correctness matters (critical logic, APIs). Skip it for prototyping.
:::

### Test-After (Traditional)

```
Write Code → Write Tests → Find Bugs → Fix → Repeat
                                └── Often: No tests at all
```

### Test-First (TDD)

```
Write Test → Watch Fail → Write Code → Watch Pass → Refactor
    ▼            ▼            ▼            ▼            ▼
 Define       Verify       Minimal      Verify      Improve
behavior   test works    implement    it works    quality
```

---

## The Red-Green-Refactor Cycle

```
         ┌─────────┐
         │   RED   │  Write failing test
         └────┬────┘
              ▼
         ┌─────────┐
         │  GREEN  │  Minimal code to pass
         └────┬────┘
              ▼
         ┌─────────┐
         │REFACTOR │  Clean up, keep green
         └────┬────┘
              ▼
        [Next Test]
```

---

## SpecWeave TDD Commands

```bash
/sw:tdd-cycle     # Full orchestration
/sw:tdd-red       # Write failing tests
/sw:tdd-green     # Implement to pass
/sw:tdd-refactor  # Clean up code
```

---

## Example: Calculator

Let's build a calculator using TDD.

### Step 1: Create Increment

```bash
/sw:increment "Calculator with basic operations"
```

### Step 2: Start TDD

```bash
/sw:tdd-cycle
```

### Phase 1: RED (Write Failing Tests)

```typescript
// tests/calculator.test.ts
import { describe, it, expect } from 'vitest';
import { add } from '../src/calculator';

describe('add()', () => {
  it('adds two positives', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('adds negatives', () => {
    expect(add(-5, 3)).toBe(-2);
  });

  it('handles zero', () => {
    expect(add(0, 0)).toBe(0);
  });
});
```

**Running tests:**
```
FAIL tests/calculator.test.ts
  ✕ adds two positives
  ✕ adds negatives
  ✕ handles zero

5 tests failed (expected!)

✅ RED PHASE COMPLETE
```

### Phase 2: GREEN (Make Tests Pass)

```typescript
// src/calculator.ts
export function add(a: number, b: number): number {
  return a + b;
}
```

**Running tests:**
```
PASS tests/calculator.test.ts
  ✓ adds two positives
  ✓ adds negatives
  ✓ handles zero

5 tests passed!

✅ GREEN PHASE COMPLETE
```

### Phase 3: REFACTOR (Improve Code)

```typescript
// src/calculator.ts (after refactor)
export function add(a: number, b: number): number {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Both arguments must be numbers');
  }
  if (Number.isNaN(a) || Number.isNaN(b)) {
    throw new TypeError('Arguments cannot be NaN');
  }
  return a + b;
}
```

**Verification:**
```
PASS tests/calculator.test.ts
  ✓ All original tests passing
  + 2 new validation tests added

✅ REFACTOR PHASE COMPLETE
```

---

## BDD in tasks.md

Every task includes [BDD](/docs/glossary/terms/bdd) test plans:

```markdown
### T-004: Implement divide()

**Test Plan** (BDD):

**Scenario 1: Normal division**
- **Given** two numbers 10 and 2
- **When** divide(10, 2) is called
- **Then** result is 5

**Scenario 2: Division by zero**
- **Given** divisor is 0
- **When** divide(10, 0) is called
- **Then** Error "Division by zero" is thrown

**Test Cases**:
- divide_normalDivision_returnsQuotient
- divide_byZero_throwsError
```

---

## TDD Best Practices

### Test Behavior, Not Implementation

```typescript
// ❌ BAD: Testing implementation
it('uses _calculateInternal method', () => {
  const spy = vi.spyOn(calc, '_calculateInternal');
  calc.add(1, 2);
  expect(spy).toHaveBeenCalled();
});

// ✅ GOOD: Testing behavior
it('adds two numbers', () => {
  expect(calc.add(1, 2)).toBe(3);
});
```

### Descriptive Test Names

```typescript
// ❌ BAD
it('test1', () => { ... });

// ✅ GOOD
it('add_twoPositives_returnsSum', () => { ... });
```

### One Assertion Per Test

```typescript
// ❌ BAD: Multiple unrelated assertions
it('calculator works', () => {
  expect(calc.add(1, 2)).toBe(3);
  expect(calc.subtract(5, 3)).toBe(2);
});

// ✅ GOOD: Focused tests
it('adds numbers', () => {
  expect(calc.add(1, 2)).toBe(3);
});

it('subtracts numbers', () => {
  expect(calc.subtract(5, 3)).toBe(2);
});
```

---

## Try It Yourself

Build a string calculator using TDD:

**Requirements**:
- `"1,2"` returns `3`
- Empty string returns `0`
- Single number returns that number
- Negative numbers throw error

```bash
/sw:increment "String calculator with TDD"
/sw:tdd-cycle
/sw:next
```

---

## Glossary Terms Used

- **[TDD](/docs/glossary/terms/tdd)** — Test-Driven Development
- **[BDD](/docs/glossary/terms/bdd)** — Behavior-Driven Development (Given/When/Then)
- **[Unit Testing](/docs/glossary/terms/unit-testing)** — Testing individual functions
- **[Test Coverage](/docs/glossary/terms/test-coverage)** — Percentage of code tested

---

## Key Takeaways

| Command | Phase | Purpose |
|---------|-------|---------|
| `/sw:tdd-cycle` | All | Full orchestration |
| `/sw:tdd-red` | RED | Write failing tests |
| `/sw:tdd-green` | GREEN | Implement to pass |
| `/sw:tdd-refactor` | REFACTOR | Improve code |

**The TDD mantra**:
1. **Red**: Write a failing test
2. **Green**: Make it pass (minimal code)
3. **Refactor**: Clean up (keep tests green)

---

## What's Next?

Connect SpecWeave to your project management tools.

**:next** → [Lesson 7: External Tools](./07-external-tools)
