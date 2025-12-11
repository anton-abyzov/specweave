---
sidebar_position: 5
title: "08.5 Test Coverage"
description: "Measure and improve your test coverage effectively"
---

# Lesson 08.5: Test Coverage

**Duration**: 30 minutes | **Difficulty**: Intermediate

---

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand coverage metrics (lines, branches, functions)
- Generate coverage reports
- Set coverage thresholds
- Identify meaningful vs vanity coverage

---

## What is Test Coverage?

**Test coverage** measures how much of your code is executed during tests.

```
Coverage = (Tested Lines / Total Lines) × 100%
```

### Coverage Types

| Type | What It Measures | Example |
|------|------------------|---------|
| **Line** | Lines of code executed | 80/100 lines = 80% |
| **Branch** | Decision paths taken | Both `if` and `else` branches |
| **Function** | Functions called | 8/10 functions = 80% |
| **Statement** | Individual statements | Similar to line coverage |

---

## Generating Coverage Reports

### Vitest

```bash
# Run with coverage
npm test -- --coverage

# Or add to package.json
{
  "scripts": {
    "test:coverage": "vitest run --coverage"
  }
}
```

### Jest

```bash
# Run with coverage
npm test -- --coverage
```

### Sample Output

```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   85.23 |    78.45 |   90.12 |   84.67 |
 src/utils/         |   92.00 |    88.00 |  100.00 |   92.00 |
  math.ts           |  100.00 |   100.00 |  100.00 |  100.00 |
  string.ts         |   84.00 |    76.00 |  100.00 |   84.00 |
 src/services/      |   78.50 |    68.90 |   80.25 |   77.33 |
  user.ts           |   65.00 |    55.00 |   70.00 |   64.00 |
  order.ts          |   92.00 |    82.80 |   90.50 |   90.66 |
--------------------|---------|----------|---------|---------|
```

---

## Understanding Branch Coverage

Branch coverage is often the most meaningful metric:

```typescript
function getDiscount(total: number, isPremium: boolean): number {
  if (total > 100) {           // Branch 1: total > 100
    if (isPremium) {           // Branch 2: isPremium
      return 0.20;             // Path A: both true
    }
    return 0.10;               // Path B: total > 100, not premium
  }
  return 0;                    // Path C: total <= 100
}
```

**100% branch coverage requires testing**:
- Path A: `getDiscount(150, true)` → 0.20
- Path B: `getDiscount(150, false)` → 0.10
- Path C: `getDiscount(50, true)` → 0

```typescript
describe('getDiscount', () => {
  it('should return 20% for premium customers over $100', () => {
    expect(getDiscount(150, true)).toBe(0.20);
  });

  it('should return 10% for non-premium over $100', () => {
    expect(getDiscount(150, false)).toBe(0.10);
  });

  it('should return 0% for orders under $100', () => {
    expect(getDiscount(50, true)).toBe(0);
    expect(getDiscount(50, false)).toBe(0);
  });
});
```

---

## Setting Coverage Thresholds

### Vitest Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Per-file thresholds
        './src/critical/**': {
          branches: 100,
          functions: 100,
          lines: 100
        }
      }
    }
  }
});
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

**CI will fail if thresholds aren't met!**

---

## HTML Coverage Reports

Generate visual reports:

```bash
npm test -- --coverage
open coverage/index.html
```

The HTML report shows:
- Line-by-line coverage highlighting
- Uncovered branches marked
- File-by-file breakdown
- Clickable navigation

---

## Coverage vs Quality

### High Coverage ≠ Good Tests

```typescript
// ❌ 100% coverage but useless test
it('should execute all lines', () => {
  const result = complexCalculation(1, 2, 3);
  expect(result).toBeDefined();  // Doesn't verify correctness!
});

// ✅ Meaningful test
it('should calculate compound interest correctly', () => {
  const result = complexCalculation(1000, 0.05, 12);
  expect(result).toBeCloseTo(1051.16, 2);
});
```

### Coverage Tells You What's NOT Tested

The real value of coverage:
- **Identifies untested code paths**
- **Highlights risky areas**
- **Guides testing efforts**

Coverage doesn't tell you if tests are **meaningful**.

---

## Practical Coverage Strategy

### 1. Focus on Critical Paths

```
Payment processing:     100% coverage required
User authentication:    100% coverage required
Business logic:         90%+ coverage
UI components:          70%+ coverage
Utility functions:      80%+ coverage
```

### 2. Ignore What Doesn't Matter

```typescript
// vitest.config.ts
coverage: {
  exclude: [
    'node_modules/**',
    'tests/**',
    '**/*.d.ts',
    '**/index.ts',        // Re-export files
    '**/types.ts',        // Type definitions
    '**/*.stories.tsx',   // Storybook files
  ]
}
```

### 3. Use Coverage to Find Gaps

```bash
# Find files with low coverage
npm test -- --coverage | grep -E "^\s+\S+\s+[0-6][0-9]\."
```

---

## SpecWeave Coverage Integration

SpecWeave's quality gates include coverage:

```markdown
## Quality Gate: Test Coverage

**Minimum thresholds**:
- Lines: 80%
- Branches: 80%
- Functions: 80%

**Critical paths** (100% required):
- `/src/auth/**`
- `/src/payments/**`
```

The `/sw:done` command validates coverage before closing increments.

---

## Common Coverage Patterns

### Pattern 1: Improving Coverage Incrementally

```json
// Start realistic, improve over time
{
  "coverageThreshold": {
    "global": {
      "lines": 60  // Start here
    }
  }
}

// After 3 months
{
  "coverageThreshold": {
    "global": {
      "lines": 75  // Ratchet up
    }
  }
}
```

### Pattern 2: New Code Must Have Coverage

```bash
# Check coverage diff in PR
npm test -- --coverage --changedSince=main
```

### Pattern 3: Never Decrease Coverage

```bash
# In CI: Fail if coverage decreases
npx jest --coverage --coverageReporters=json-summary
# Compare with previous coverage
```

---

## Key Takeaways

1. **Coverage shows what's NOT tested** — Use it to find gaps
2. **Branch coverage matters most** — Tests all decision paths
3. **80% is a good baseline** — 100% isn't always practical
4. **High coverage ≠ good tests** — Verify behavior, not just execution
5. **Critical code needs 100%** — Payments, auth, core logic

---

## Practice Exercise

1. Run coverage on your test project
2. Find a function with < 80% branch coverage
3. Identify the missing branches
4. Write tests to achieve 100% branch coverage
5. Verify with another coverage run

---

## Module Complete!

You've mastered unit testing fundamentals. Next, learn how to test component interactions.

→ [Continue to Module 09: Integration Testing](../09-integration-testing/)
