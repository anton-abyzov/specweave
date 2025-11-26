---
sidebar_position: 2
title: "08.2 Writing Effective Tests"
description: "Learn to write clear, maintainable unit tests"
---

# Lesson 08.2: Writing Effective Unit Tests

**Duration**: 45 minutes | **Difficulty**: Intermediate

---

## Learning Objectives

By the end of this lesson, you will be able to:
- Structure tests using Arrange-Act-Assert
- Write clear test descriptions
- Test edge cases and error conditions
- Avoid common testing mistakes

---

## The AAA Pattern

Every unit test follows **Arrange-Act-Assert**:

```typescript
describe('calculateDiscount', () => {
  it('should apply 20% discount for premium customers', () => {
    // ARRANGE: Set up test data
    const customer = { isPremium: true };
    const orderTotal = 100;

    // ACT: Execute the function
    const result = calculateDiscount(orderTotal, customer);

    // ASSERT: Verify the result
    expect(result).toBe(20);
  });
});
```

| Phase | Purpose | Example |
|-------|---------|---------|
| **Arrange** | Set up inputs and dependencies | Create test data, mock functions |
| **Act** | Execute the code being tested | Call the function |
| **Assert** | Verify the output | Check return value, side effects |

---

## Writing Clear Test Descriptions

### Use the "should" Convention

```typescript
// ❌ Vague
it('works', () => { ... });
it('test discount', () => { ... });

// ✅ Descriptive
it('should apply 10% discount for orders over $100', () => { ... });
it('should return zero discount for orders under $50', () => { ... });
it('should throw error for negative order totals', () => { ... });
```

### Describe the Input and Expected Output

```typescript
describe('formatCurrency', () => {
  // Pattern: "should [expected output] when [input condition]"
  it('should format 1000 as $1,000.00', () => { ... });
  it('should format 0 as $0.00', () => { ... });
  it('should format negative numbers with minus sign', () => { ... });
});
```

---

## Testing Different Scenarios

### Happy Path (Normal Use)

```typescript
describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });
});
```

### Edge Cases

```typescript
describe('validateEmail', () => {
  // Empty/null inputs
  it('should return false for empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('should return false for null', () => {
    expect(validateEmail(null as any)).toBe(false);
  });

  // Boundary values
  it('should accept email with single character local part', () => {
    expect(validateEmail('a@example.com')).toBe(true);
  });

  // Special characters
  it('should accept email with plus sign', () => {
    expect(validateEmail('user+tag@example.com')).toBe(true);
  });
});
```

### Error Conditions

```typescript
describe('divide', () => {
  it('should throw error when dividing by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });

  it('should throw error for non-numeric inputs', () => {
    expect(() => divide('a' as any, 5)).toThrow('Invalid input');
  });
});
```

---

## Common Assertions

### Value Comparison

```typescript
// Exact equality
expect(result).toBe(5);                    // Strict ===
expect(result).toEqual({ a: 1, b: 2 });    // Deep equality

// Truthiness
expect(result).toBeTruthy();
expect(result).toBeFalsy();
expect(result).toBeNull();
expect(result).toBeUndefined();
expect(result).toBeDefined();

// Numbers
expect(result).toBeGreaterThan(5);
expect(result).toBeLessThan(10);
expect(result).toBeCloseTo(0.3, 5);        // For floating point

// Strings
expect(result).toMatch(/pattern/);
expect(result).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objects
expect(object).toHaveProperty('key');
expect(object).toHaveProperty('nested.key', 'value');
```

### Testing Errors

```typescript
// Function throws
expect(() => riskyFunction()).toThrow();
expect(() => riskyFunction()).toThrow('specific message');
expect(() => riskyFunction()).toThrow(CustomError);

// Async throws
await expect(asyncRiskyFunction()).rejects.toThrow('error');
```

---

## Organizing Tests

### Group Related Tests

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', () => { ... });
    it('should hash password before saving', () => { ... });
    it('should throw error for duplicate email', () => { ... });
  });

  describe('updateUser', () => {
    it('should update user name', () => { ... });
    it('should throw error for non-existent user', () => { ... });
  });

  describe('deleteUser', () => {
    it('should soft delete by default', () => { ... });
    it('should hard delete when forced', () => { ... });
  });
});
```

### Setup and Teardown

```typescript
describe('Database operations', () => {
  let db: Database;

  // Run once before all tests in this describe
  beforeAll(async () => {
    db = await createTestDatabase();
  });

  // Run before each test
  beforeEach(async () => {
    await db.clear();
    await db.seed(testData);
  });

  // Run after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Run once after all tests
  afterAll(async () => {
    await db.close();
  });

  it('should insert record', async () => {
    // db is ready with test data
  });
});
```

---

## Testing Pure Functions

Pure functions (same input → same output, no side effects) are easiest to test:

```typescript
// Pure function
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Easy to test!
describe('calculateTotal', () => {
  it('should sum item prices with quantities', () => {
    const items = [
      { name: 'Apple', price: 1.00, quantity: 3 },
      { name: 'Banana', price: 0.50, quantity: 2 }
    ];

    expect(calculateTotal(items)).toBe(4.00);
  });

  it('should return 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('should handle single item', () => {
    const items = [{ name: 'Apple', price: 1.50, quantity: 1 }];
    expect(calculateTotal(items)).toBe(1.50);
  });
});
```

---

## Common Mistakes to Avoid

### Mistake 1: Testing Implementation Details

```typescript
// ❌ BAD: Tests how, not what
it('should call reduce once', () => {
  const spy = jest.spyOn(Array.prototype, 'reduce');
  calculateTotal(items);
  expect(spy).toHaveBeenCalledTimes(1);
});

// ✅ GOOD: Tests behavior
it('should return correct total', () => {
  expect(calculateTotal(items)).toBe(4.00);
});
```

### Mistake 2: Multiple Assertions Testing Different Things

```typescript
// ❌ BAD: One test, multiple concerns
it('should work correctly', () => {
  expect(createUser(validData)).toBeDefined();
  expect(createUser(invalidData)).toThrow();  // Different scenario!
  expect(getUserCount()).toBe(1);
});

// ✅ GOOD: One assertion per concept
it('should return created user for valid data', () => {
  expect(createUser(validData)).toBeDefined();
});

it('should throw for invalid data', () => {
  expect(() => createUser(invalidData)).toThrow();
});
```

### Mistake 3: Tests Depend on Order

```typescript
// ❌ BAD: Test B depends on Test A's state
it('should create user', () => {
  createUser({ id: 1, name: 'Test' });
});

it('should find created user', () => {
  expect(findUser(1)).toBeDefined();  // Only works if Test A ran first!
});

// ✅ GOOD: Each test is independent
it('should find user when exists', () => {
  createUser({ id: 1, name: 'Test' });
  expect(findUser(1)).toBeDefined();
});
```

### Mistake 4: Magic Numbers/Strings

```typescript
// ❌ BAD: What is 25.5?
expect(calculateTax(100)).toBe(25.5);

// ✅ GOOD: Clear what's being tested
it('should apply 25.5% tax rate for luxury items', () => {
  const LUXURY_TAX_RATE = 0.255;
  const itemPrice = 100;
  const expectedTax = itemPrice * LUXURY_TAX_RATE;

  expect(calculateTax(itemPrice)).toBe(expectedTax);
});
```

---

## Testing Checklist

For each function, consider testing:

- [ ] **Happy path**: Normal, expected input
- [ ] **Empty input**: Empty string, empty array, null, undefined
- [ ] **Boundary values**: 0, 1, max value, min value
- [ ] **Invalid input**: Wrong types, malformed data
- [ ] **Error conditions**: What should throw errors?
- [ ] **Special characters**: Unicode, spaces, special symbols

---

## Key Takeaways

1. **Use AAA pattern** — Arrange, Act, Assert
2. **Write descriptive test names** — "should X when Y"
3. **Test one thing per test** — Single responsibility
4. **Test behavior, not implementation** — What, not how
5. **Tests should be independent** — No test depends on another

---

## Practice Exercise

Write tests for this function:

```typescript
function greet(name: string, timeOfDay?: 'morning' | 'afternoon' | 'evening'): string {
  if (!name || name.trim() === '') {
    throw new Error('Name is required');
  }

  const greeting = timeOfDay
    ? `Good ${timeOfDay}`
    : 'Hello';

  return `${greeting}, ${name.trim()}!`;
}
```

Test cases to cover:
1. Basic greeting without time
2. Morning/afternoon/evening greetings
3. Name with extra whitespace
4. Empty name (should throw)
5. Null/undefined name (should throw)

---

## Next Lesson

Now let's learn how to isolate your code from dependencies using mocks.

→ [Continue to Lesson 08.3: Mocking Dependencies](./03-mocking)
