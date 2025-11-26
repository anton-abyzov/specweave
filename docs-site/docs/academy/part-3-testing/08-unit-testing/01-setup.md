---
sidebar_position: 1
title: "08.1 Setting Up Unit Testing"
description: "Install and configure Jest or Vitest for your project"
---

# Lesson 08.1: Setting Up Unit Testing

**Duration**: 30 minutes | **Difficulty**: Intermediate

---

## Learning Objectives

By the end of this lesson, you will be able to:
- Choose between Jest and Vitest
- Install and configure your test runner
- Write your first passing test
- Run tests from the command line

---

## Choosing a Test Framework

Two popular options dominate JavaScript testing:

| Feature | Jest | Vitest |
|---------|------|--------|
| **Speed** | Good | Excellent (2-5x faster) |
| **ES Modules** | Config needed | Native support |
| **TypeScript** | Config needed | Native support |
| **Watch mode** | Yes | Yes (HMR-powered) |
| **Community** | Massive | Growing fast |
| **Best for** | Established projects | New projects, Vite users |

**Recommendation**: Use **Vitest** for new projects. Use **Jest** if your team already knows it.

---

## Installation: Vitest (Recommended)

### Step 1: Install Dependencies

```bash
# Navigate to your project
cd my-project

# Install Vitest
npm install -D vitest
```

### Step 2: Add Test Script

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Step 3: Create Config (Optional)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,           // Use describe/it/expect without import
    environment: 'node',     // or 'jsdom' for browser code
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

### Step 4: Verify Installation

```bash
npm test

# You should see:
# No test files found, exiting with code 0
```

---

## Installation: Jest (Alternative)

### Step 1: Install Dependencies

```bash
# For JavaScript projects
npm install -D jest

# For TypeScript projects
npm install -D jest ts-jest @types/jest
```

### Step 2: Add Test Script

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Step 3: Create Config for TypeScript

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
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

---

## Your First Test

### Step 1: Create a Function to Test

```typescript
// src/utils/math.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}
```

### Step 2: Create a Test File

```typescript
// tests/utils/math.test.ts (or src/utils/math.test.ts)
import { describe, it, expect } from 'vitest';  // Vitest
// import { describe, it, expect } from '@jest/globals';  // Jest

import { add, multiply } from '../../src/utils/math';

describe('math utilities', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(add(-1, 5)).toBe(4);
    });

    it('should handle zero', () => {
      expect(add(0, 0)).toBe(0);
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers', () => {
      expect(multiply(3, 4)).toBe(12);
    });

    it('should return zero when multiplied by zero', () => {
      expect(multiply(5, 0)).toBe(0);
    });
  });
});
```

### Step 3: Run Tests

```bash
npm test

# Expected output:
# ✓ math utilities > add > should add two positive numbers
# ✓ math utilities > add > should handle negative numbers
# ✓ math utilities > add > should handle zero
# ✓ math utilities > multiply > should multiply two numbers
# ✓ math utilities > multiply > should return zero when multiplied by zero
#
# Test Files  1 passed
# Tests       5 passed
```

---

## Project Structure

Organize your tests in one of these patterns:

### Pattern 1: Colocated Tests (Recommended)

```
src/
├── utils/
│   ├── math.ts
│   └── math.test.ts       ← Test next to code
├── services/
│   ├── user.ts
│   └── user.test.ts
└── index.ts
```

**Advantages**: Easy to find tests, encourages testing.

### Pattern 2: Separate Tests Directory

```
src/
├── utils/
│   └── math.ts
├── services/
│   └── user.ts
└── index.ts

tests/
├── utils/
│   └── math.test.ts       ← Mirrors src structure
└── services/
    └── user.test.ts
```

**Advantages**: Clean separation, easier to exclude from builds.

---

## Watch Mode

Run tests automatically when files change:

```bash
# Vitest (default watch mode)
npm test

# Jest watch mode
npm test -- --watch
```

**Watch mode shortcuts**:
- `a` - Run all tests
- `f` - Run only failed tests
- `p` - Filter by filename
- `t` - Filter by test name
- `q` - Quit

---

## Common Setup Issues

### Issue 1: "Cannot find module"

```bash
# Error: Cannot find module './math'
```

**Fix**: Check import paths and file extensions:

```typescript
// ❌ Wrong (might fail)
import { add } from './math';

// ✅ Correct (explicit)
import { add } from './math.js';  // or configure moduleResolution
```

### Issue 2: "Unexpected token 'import'"

**Fix**: Enable ES modules or use CommonJS:

```json
// package.json - Enable ES modules
{
  "type": "module"
}
```

Or configure your test runner for ES modules.

### Issue 3: TypeScript Errors

**Fix**: Install type definitions:

```bash
npm install -D @types/jest  # For Jest
# Vitest includes its own types
```

---

## SpecWeave Integration

When using SpecWeave, tests are defined in `tasks.md`:

```markdown
## T-003: Implement math utilities
**Status**: [ ] pending
**Satisfies ACs**: AC-US1-02

### Test Plan
- `add(2, 3)` → returns `5`
- `add(-1, 5)` → returns `4`
- `multiply(3, 4)` → returns `12`
```

SpecWeave's `/specweave:do` generates test files from these plans.

---

## Key Takeaways

1. **Choose Vitest for new projects** — faster, better TypeScript support
2. **Choose Jest for existing projects** — huge community, battle-tested
3. **Colocate tests with code** — easier to find and maintain
4. **Use watch mode during development** — immediate feedback
5. **Start with simple tests** — `add(2, 3)` before complex logic

---

## Practice Exercise

1. Create a new project with `npm init -y`
2. Install Vitest: `npm install -D vitest`
3. Create `src/utils/string.ts` with a `capitalize` function
4. Create `tests/utils/string.test.ts` with tests
5. Run `npm test` and verify all tests pass

---

## Next Lesson

You've set up your testing environment. Now let's write effective unit tests!

→ [Continue to Lesson 08.2: Writing Effective Tests](./02-writing-tests)
