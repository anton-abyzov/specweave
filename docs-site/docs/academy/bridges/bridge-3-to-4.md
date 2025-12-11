---
sidebar_position: 4
title: "Part 3 → Part 4"
description: "From tests to quality"
---

# Bridge: Testing → Quality

**You can test. Now let's ensure consistency.**

---

## What You Mastered in Part 3

| Skill | What You Learned |
|-------|------------------|
| Unit testing | Test individual functions |
| Integration testing | Test components together |
| E2E testing | Test full user flows |
| Mocking | Isolate dependencies |
| TDD | Write tests first |
| Coverage | Measure test completeness |

---

## What's Coming in Part 4

```
Part 3: "My code is tested"
    ↓
Part 4: "My code is tested AND consistent"
```

You'll add automated quality checks that enforce standards.

---

## Why Quality Tooling Matters

### The Problem

Your tests pass, but:

```javascript
// File A: uses camelCase
const userName = 'Alice';

// File B: uses snake_case
const user_name = 'Bob';

// File C: uses PascalCase
const UserName = 'Charlie';
```

Tests don't catch inconsistency.

### The Solution

Quality tools enforce standards:

```javascript
// ESLint rule: camelcase
// All files use same style
const userName = 'Alice';  // ✓
const user_name = 'Bob';   // Error! Must use camelCase
```

Consistency makes code readable.

---

## Connection Points

### Tests → Type Safety

In Part 3, you tested at runtime:
```javascript
it('should throw for wrong type', () => {
  expect(() => addTask(123)).toThrow();
});
```

In Part 4, TypeScript catches at compile time:
```typescript
function addTask(title: string): Task {
  // If you pass 123, TypeScript errors before running
}
```

**Shift errors left — catch earlier.**

### Coverage → Quality Gates

In Part 3, you measured coverage:
```bash
npm run test:coverage
# Coverage: 85%
```

In Part 4, you enforce minimums:
```bash
/sw:validate 0001
# ✓ Coverage: 85% (minimum: 80%)
# ✓ Linting: 0 errors
# ✓ Types: No errors
```

**Same metrics, now enforced.**

### TDD → Quality First

In Part 3, you wrote tests first:
```javascript
// 1. Write test
it('should validate email', () => ...);

// 2. Write code to pass
function validateEmail() { ... }
```

In Part 4, quality becomes automatic:
```bash
# Pre-commit hook runs automatically
✓ ESLint: 0 errors
✓ Prettier: Formatted
✓ TypeScript: Compiled
✓ Tests: Passed
```

**Quality on every commit.**

---

## Self-Assessment

Before Part 4, you should be comfortable with:

- [ ] Writing unit tests with assertions
- [ ] Understanding what mocks are for
- [ ] Running test commands (npm test)
- [ ] Interpreting coverage reports
- [ ] Knowing why tests matter

**Unsure about any of these?** Review Part 3.

---

## Bridge Exercise

**Before starting Part 4, audit your code:**

Look at your task tracker and find:

1. **Inconsistent naming** — Mix of camelCase/snake_case?
2. **Missing types** — Variables without clear types?
3. **Dead code** — Unused functions?
4. **Long functions** — Any over 50 lines?
5. **Magic numbers** — `if (x > 100)` without explanation?

These are what quality tools catch automatically.

---

## What Changes in Part 4

| Part 3 | Part 4 |
|--------|--------|
| Tests verify behavior | Tools verify style |
| Manual code review | Automated code review |
| "It works" | "It works AND is readable" |
| Catch bugs at runtime | Catch bugs at write time |
| Developer discipline | Automated enforcement |

---

## The Quality Stack

```
            ┌──────────────────┐
            │   Quality Gates  │  /sw:validate
            │    (SpecWeave)   │
            └────────┬─────────┘
                     │
            ┌────────▼─────────┐
            │   Pre-commit     │  Husky + lint-staged
            │     Hooks        │
            └────────┬─────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼───┐       ┌────▼───┐       ┌────▼───┐
│ ESLint │      │Prettier│      │  Type  │
│ (Rules)│      │(Format)│      │ Script │
└────────┘      └────────┘      └────────┘
```

Each layer catches different issues.

---

## Preview: Quality Tools

**ESLint** — Catch problems:
```javascript
// Unused variable
const unused = 5;  // ESLint: 'unused' is defined but never used

// Potential error
if (x = 5) { }  // ESLint: Did you mean '==='?
```

**Prettier** — Format consistently:
```javascript
// Before (messy)
function add(a,b){return a+b}

// After (clean)
function add(a, b) {
  return a + b;
}
```

**TypeScript** — Catch type errors:
```typescript
function greet(name: string) {
  return `Hello, ${name}`;
}

greet(123);  // TypeScript: Argument must be string
```

---

## Ready?

→ [Start Part 4: Quality](/docs/academy/part-4-quality/)
