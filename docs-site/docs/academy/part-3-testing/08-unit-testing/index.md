---
sidebar_position: 1
title: "Module 08: Unit Testing"
description: "Master the art of testing individual functions in isolation"
---

# Module 08: Unit Testing

**Duration**: 2-3 hours | **Difficulty**: Intermediate

Unit tests are the foundation of your testing pyramid. They're fast, focused, and provide immediate feedback on your code's correctness.

---

## What You'll Learn

- Setting up Jest/Vitest for unit testing
- Writing effective unit tests
- Mocking dependencies
- Testing async code
- Achieving meaningful coverage

---

## Module Lessons

| Lesson | Topic | Duration |
|--------|-------|----------|
| [08.1 Setup](./01-setup) | Installing and configuring Jest | 30 min |
| [08.2 Writing Tests](./02-writing-tests) | Your first unit tests | 45 min |
| [08.3 Mocking](./03-mocking) | Isolating code with mocks | 45 min |
| [08.4 Async Testing](./04-async) | Testing promises and async/await | 30 min |
| [08.5 Coverage](./05-coverage) | Measuring test coverage | 30 min |

---

## Unit Test Characteristics

```
Speed:        ⚡ Fast (milliseconds)
Count:        📊 Many (hundreds/thousands)
Scope:        🎯 Single function/class
Dependencies: 🔧 Mocked
Cost:         💰 Cheap to write/maintain
```

---

## Example Unit Test

```typescript
describe('calculateDiscount', () => {
  it('should apply 10% discount for orders over $100', () => {
    // Arrange
    const orderTotal = 150;
    const discountRate = 0.1;

    // Act
    const result = calculateDiscount(orderTotal, discountRate);

    // Assert
    expect(result).toBe(15);
  });

  it('should return 0 for orders at $100 or below', () => {
    expect(calculateDiscount(100, 0.1)).toBe(0);
    expect(calculateDiscount(50, 0.1)).toBe(0);
  });
});
```

---

## Prerequisites

Before starting:
- ✅ Completed Module 07
- ✅ Node.js project initialized
- ✅ Comfortable with JavaScript functions

---

## Let's Begin

Ready to write your first unit tests?

→ [Start Lesson 08.1: Setup](./01-setup)
