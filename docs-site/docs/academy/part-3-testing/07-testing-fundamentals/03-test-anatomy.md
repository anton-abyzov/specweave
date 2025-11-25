---
sidebar_position: 3
title: "07.3 Test Anatomy"
description: "Structure of a good test - AAA pattern and best practices"
---

# Lesson 07.3: Test Anatomy

**Duration**: 45 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will understand:
- The AAA (Arrange-Act-Assert) pattern
- How to name tests descriptively
- What makes a good assertion
- Common testing mistakes to avoid

---

## The AAA Pattern

Every good test follows the **Arrange-Act-Assert** pattern:

```typescript
describe('UserService', () => {
  it('should hash password before storing', async () => {
    // ARRANGE: Set up test data and dependencies
    const userService = new UserService();
    const email = 'user@example.com';
    const password = 'PlainTextPassword123';

    // ACT: Execute the function under test
    const result = await userService.register(email, password);

    // ASSERT: Verify the outcome
    expect(result.password).not.toBe(password); // Not plain text
    expect(result.password).toMatch(/^\$2[aby]\$/); // Bcrypt format
  });
});
```

### Arrange

Set up everything needed for the test:
- Create test data
- Initialize objects
- Set up mocks
- Configure state

```typescript
// ARRANGE
const mockEmailService = { send: jest.fn() };
const authService = new AuthService(mockEmailService);
const testUser = {
  email: 'test@example.com',
  password: 'SecurePass123'
};
```

### Act

Execute the code being tested:
- Call the function
- Make the API request
- Trigger the event

```typescript
// ACT
const result = await authService.register(testUser.email, testUser.password);
```

### Assert

Verify the expected outcome:
- Check return values
- Verify side effects
- Confirm state changes

```typescript
// ASSERT
expect(result.id).toBeDefined();
expect(result.email).toBe(testUser.email);
expect(mockEmailService.send).toHaveBeenCalledWith({
  to: testUser.email,
  subject: 'Welcome!'
});
```

---

## Test Naming

### The "Should" Convention

```typescript
// Pattern: should [expected behavior] when [condition]

it('should return 0 when cart is empty');
it('should throw error when password is too short');
it('should apply 20% discount when user is premium');
it('should redirect to dashboard when login is successful');
```

### Good vs. Bad Names

```typescript
// ❌ Bad: Vague, doesn't describe behavior
it('test calculateTotal');
it('works');
it('handles edge case');

// ✅ Good: Describes expected behavior
it('should return sum of all item prices');
it('should return 0 for empty cart');
it('should throw ValidationError for negative prices');
```

### Reading Tests Like Documentation

When tests are well-named, `describe` and `it` read like specifications:

```typescript
describe('ShoppingCart', () => {
  describe('calculateTotal', () => {
    it('should return sum of item prices');
    it('should apply percentage discounts');
    it('should apply fixed amount discounts');
    it('should not allow total below zero');
  });

  describe('addItem', () => {
    it('should add item to cart');
    it('should increase quantity if item exists');
    it('should throw if item is out of stock');
  });
});

// Reads as:
// ShoppingCart
//   calculateTotal
//     ✓ should return sum of item prices
//     ✓ should apply percentage discounts
//     ...
```

---

## Assertions

### One Concept Per Test

```typescript
// ❌ Bad: Testing multiple concepts
it('should register user', async () => {
  const result = await authService.register('user@example.com', 'pass123');

  expect(result.id).toBeDefined();           // Concept 1: User created
  expect(result.email).toBe('user@example.com');
  expect(result.password).not.toBe('pass123'); // Concept 2: Password hashed
  expect(mockEmailService.send).toHaveBeenCalled(); // Concept 3: Email sent
});

// ✅ Good: Separate tests for each concept
it('should create user with generated ID', async () => {
  const result = await authService.register('user@example.com', 'pass123');
  expect(result.id).toBeDefined();
  expect(result.email).toBe('user@example.com');
});

it('should hash password before storing', async () => {
  const result = await authService.register('user@example.com', 'pass123');
  expect(result.password).not.toBe('pass123');
  expect(result.password).toMatch(/^\$2[aby]\$/);
});

it('should send welcome email after registration', async () => {
  await authService.register('user@example.com', 'pass123');
  expect(mockEmailService.send).toHaveBeenCalledWith({
    to: 'user@example.com',
    subject: expect.stringContaining('Welcome')
  });
});
```

### Meaningful Assertions

```typescript
// ❌ Bad: Meaningless assertion
it('should work', () => {
  const result = calculateTotal([{ price: 100 }]);
  expect(result).toBeDefined(); // Just checks it exists
});

// ✅ Good: Verifies actual behavior
it('should return sum of prices', () => {
  const result = calculateTotal([{ price: 100 }, { price: 50 }]);
  expect(result).toBe(150); // Verifies correct calculation
});
```

### Assertion Types

```typescript
// Equality
expect(value).toBe(5);           // Strict equality (===)
expect(value).toEqual({ a: 1 }); // Deep equality for objects

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeDefined();
expect(value).toBeUndefined();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThanOrEqual(10);
expect(value).toBeCloseTo(0.3, 5); // Float comparison

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Exceptions
expect(() => badFunction()).toThrow();
expect(() => badFunction()).toThrow('Error message');
expect(() => badFunction()).toThrow(TypeError);

// Async
await expect(asyncFn()).resolves.toBe(value);
await expect(asyncFn()).rejects.toThrow('Error');
```

---

## Test Independence

### Tests Should Not Depend on Each Other

```typescript
// ❌ Bad: Tests depend on shared state
let user;

it('should create user', () => {
  user = createUser('test@example.com');
  expect(user.id).toBeDefined();
});

it('should update user email', () => {
  updateUser(user.id, { email: 'new@example.com' }); // Depends on previous test!
  expect(user.email).toBe('new@example.com');
});

// ✅ Good: Each test is independent
it('should create user', () => {
  const user = createUser('test@example.com');
  expect(user.id).toBeDefined();
});

it('should update user email', () => {
  const user = createUser('test@example.com'); // Creates its own user
  updateUser(user.id, { email: 'new@example.com' });

  const updated = getUser(user.id);
  expect(updated.email).toBe('new@example.com');
});
```

### Use Setup and Teardown

```typescript
describe('UserService', () => {
  let db;
  let userService;

  // Run before each test
  beforeEach(async () => {
    db = await createTestDatabase();
    userService = new UserService(db);
  });

  // Run after each test
  afterEach(async () => {
    await db.truncate();
    await db.close();
  });

  it('should create user', async () => {
    const user = await userService.create('test@example.com');
    expect(user.id).toBeDefined();
  });

  it('should find user by email', async () => {
    await userService.create('test@example.com');
    const user = await userService.findByEmail('test@example.com');
    expect(user).toBeDefined();
  });
});
```

---

## Testing Edge Cases

Don't just test the happy path!

```typescript
describe('validateEmail', () => {
  // Happy path
  it('should accept valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  // Edge cases
  it('should reject email without @', () => {
    expect(() => validateEmail('userexample.com')).toThrow();
  });

  it('should reject email without domain', () => {
    expect(() => validateEmail('user@')).toThrow();
  });

  it('should reject empty string', () => {
    expect(() => validateEmail('')).toThrow('Email required');
  });

  it('should reject null', () => {
    expect(() => validateEmail(null)).toThrow('Email required');
  });

  it('should reject undefined', () => {
    expect(() => validateEmail(undefined)).toThrow('Email required');
  });

  it('should trim whitespace', () => {
    expect(validateEmail('  user@example.com  ')).toBe(true);
  });

  // Boundary cases
  it('should accept email at max length', () => {
    const longEmail = 'a'.repeat(64) + '@example.com';
    expect(validateEmail(longEmail)).toBe(true);
  });

  it('should reject email over max length', () => {
    const tooLongEmail = 'a'.repeat(65) + '@example.com';
    expect(() => validateEmail(tooLongEmail)).toThrow();
  });
});
```

---

## Common Mistakes

### 1. Testing Implementation, Not Behavior

```typescript
// ❌ Bad: Tests implementation details
it('should call hashPassword with bcrypt', () => {
  const spy = jest.spyOn(bcrypt, 'hash');
  authService.register('user@example.com', 'password');
  expect(spy).toHaveBeenCalledWith('password', 10);
});

// ✅ Good: Tests behavior
it('should not store plain text password', async () => {
  const result = await authService.register('user@example.com', 'password');
  expect(result.password).not.toBe('password');
});
```

### 2. Flaky Tests

```typescript
// ❌ Bad: Depends on timing
it('should debounce search', async () => {
  searchInput.type('hello');
  await sleep(500); // Arbitrary wait
  expect(results).toHaveLength(5);
});

// ✅ Good: Explicit wait for condition
it('should debounce search', async () => {
  searchInput.type('hello');
  await waitFor(() => expect(results).toHaveLength(5));
});
```

### 3. Test Pollution

```typescript
// ❌ Bad: Modifies global state
beforeAll(() => {
  global.DEBUG = true; // Affects all tests!
});

// ✅ Good: Restore state
let originalDebug;
beforeEach(() => {
  originalDebug = global.DEBUG;
  global.DEBUG = true;
});
afterEach(() => {
  global.DEBUG = originalDebug;
});
```

---

## Key Takeaways

1. **Follow AAA** — Arrange, Act, Assert structure
2. **Name descriptively** — "should [behavior] when [condition]"
3. **One concept per test** — easier to debug failures
4. **Tests must be independent** — no shared state between tests
5. **Test edge cases** — empty, null, boundaries, errors

---

## Next Lesson

Now let's see how SpecWeave integrates testing into the development workflow.

→ [Continue to Lesson 07.4: Testing with SpecWeave](./04-specweave-testing)
