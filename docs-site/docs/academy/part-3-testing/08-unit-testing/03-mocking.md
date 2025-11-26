---
sidebar_position: 3
title: "08.3 Mocking Dependencies"
description: "Isolate your code from external dependencies using mocks"
---

# Lesson 08.3: Mocking Dependencies

**Duration**: 45 minutes | **Difficulty**: Intermediate

---

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand why mocking is essential for unit tests
- Create mock functions and modules
- Use spies to observe function behavior
- Mock external services (API calls, databases)

---

## Why Mock?

Unit tests should test **one unit in isolation**. But real code has dependencies:

```typescript
// This function depends on fetch (external API)
async function getUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

Without mocking, your tests would:
- **Be slow**: Real API calls take time
- **Be flaky**: Network issues cause failures
- **Require setup**: Need a running API server
- **Have side effects**: Might modify real data

With mocking, tests are **fast, reliable, and isolated**.

---

## Mock Functions

### Creating a Mock Function

```typescript
import { vi, describe, it, expect } from 'vitest';
// For Jest: const mockFn = jest.fn();

describe('Order processing', () => {
  it('should call payment processor', () => {
    // Create a mock function
    const processPayment = vi.fn();

    // Use the mock
    processPayment(100, 'credit_card');

    // Assert it was called correctly
    expect(processPayment).toHaveBeenCalled();
    expect(processPayment).toHaveBeenCalledWith(100, 'credit_card');
    expect(processPayment).toHaveBeenCalledTimes(1);
  });
});
```

### Mock Return Values

```typescript
const getUserById = vi.fn();

// Return a specific value
getUserById.mockReturnValue({ id: 1, name: 'Alice' });

// Return different values on subsequent calls
getUserById
  .mockReturnValueOnce({ id: 1, name: 'Alice' })
  .mockReturnValueOnce({ id: 2, name: 'Bob' });

// Return a Promise
getUserById.mockResolvedValue({ id: 1, name: 'Alice' });
getUserById.mockRejectedValue(new Error('Not found'));
```

---

## Mocking Modules

### Mock an Entire Module

```typescript
// Mock the entire 'axios' module
vi.mock('axios');

import axios from 'axios';
import { fetchUsers } from './userService';

describe('userService', () => {
  it('should fetch users from API', async () => {
    // Setup mock response
    (axios.get as any).mockResolvedValue({
      data: [{ id: 1, name: 'Alice' }]
    });

    // Call the function that uses axios
    const users = await fetchUsers();

    // Assert
    expect(axios.get).toHaveBeenCalledWith('/api/users');
    expect(users).toEqual([{ id: 1, name: 'Alice' }]);
  });
});
```

### Mock Specific Functions

```typescript
// Only mock certain functions
vi.mock('./database', () => ({
  ...vi.importActual('./database'),  // Keep real implementations
  query: vi.fn()                      // Mock just this one
}));
```

---

## Spies

Spies let you observe calls without replacing the implementation:

```typescript
import * as mathUtils from './mathUtils';

describe('Calculator', () => {
  it('should call add internally', () => {
    // Spy on the function
    const addSpy = vi.spyOn(mathUtils, 'add');

    // Use the real implementation
    const result = calculate('2 + 3');

    // Assert the spy was called
    expect(addSpy).toHaveBeenCalledWith(2, 3);
    expect(result).toBe(5);

    // Clean up
    addSpy.mockRestore();
  });
});
```

### Spying and Replacing

```typescript
const consoleSpy = vi.spyOn(console, 'log');

// Replace implementation
consoleSpy.mockImplementation(() => {});  // Silence console.log

// Or use original but track calls
consoleSpy.mockImplementation((...args) => {
  // Do something with args
});
```

---

## Practical Example: Mocking API Calls

### The Code Being Tested

```typescript
// userService.ts
export async function createUser(userData: UserInput) {
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData),
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to create user');
  }

  return response.json();
}
```

### The Test

```typescript
// userService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUser } from './userService';

describe('createUser', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.restoreAllMocks();
  });

  it('should send POST request with user data', async () => {
    // Arrange: Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: 'Alice' })
    });

    // Act
    const result = await createUser({ name: 'Alice', email: 'alice@example.com' });

    // Assert
    expect(fetch).toHaveBeenCalledWith('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
      headers: { 'Content-Type': 'application/json' }
    });
    expect(result).toEqual({ id: 1, name: 'Alice' });
  });

  it('should throw error when API fails', async () => {
    // Arrange: Mock failed response
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    });

    // Act & Assert
    await expect(createUser({ name: 'Alice' }))
      .rejects.toThrow('Failed to create user');
  });
});
```

---

## Mocking Timers

For code that uses `setTimeout`, `setInterval`, or `Date`:

```typescript
describe('Delayed operations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call callback after delay', () => {
    const callback = vi.fn();

    // Function that calls callback after 1000ms
    delayedCall(callback, 1000);

    // Callback not called yet
    expect(callback).not.toHaveBeenCalled();

    // Fast-forward time
    vi.advanceTimersByTime(1000);

    // Now it's called
    expect(callback).toHaveBeenCalled();
  });

  it('should use current date', () => {
    // Set a specific date
    vi.setSystemTime(new Date('2025-01-01'));

    expect(getCurrentYear()).toBe(2025);
  });
});
```

---

## Mocking Best Practices

### 1. Mock at the Boundary

```typescript
// ❌ Don't mock internal functions
vi.mock('./calculateSubtotal');  // Too internal

// ✅ Mock external dependencies
vi.mock('axios');
vi.mock('./database');
```

### 2. Keep Mocks Simple

```typescript
// ❌ Over-complicated mock
const mockDb = {
  query: vi.fn().mockImplementation((sql) => {
    if (sql.includes('SELECT')) {
      return Promise.resolve([...]);
    } else if (sql.includes('INSERT')) {
      return Promise.resolve({ insertId: 1 });
    }
    // ... more logic
  })
};

// ✅ Simple, focused mock
const mockDb = {
  query: vi.fn().mockResolvedValue([{ id: 1 }])
};
```

### 3. Reset Mocks Between Tests

```typescript
beforeEach(() => {
  vi.clearAllMocks();  // Clear call history
  // or
  vi.resetAllMocks();  // Clear + reset implementations
  // or
  vi.restoreAllMocks(); // Restore original implementations
});
```

### 4. Don't Over-Mock

```typescript
// ❌ Mocking everything (test doesn't test much)
it('should process order', () => {
  vi.mock('./validateOrder');
  vi.mock('./calculateTotal');
  vi.mock('./applyDiscount');
  vi.mock('./chargePayment');
  vi.mock('./sendConfirmation');

  processOrder(order);  // What are we actually testing?
});

// ✅ Mock only external dependencies
it('should process order and charge payment', () => {
  vi.mock('./paymentGateway');  // External service

  // Real order processing logic is tested
  const result = processOrder(order);

  expect(paymentGateway.charge).toHaveBeenCalled();
});
```

---

## Key Takeaways

1. **Mocks isolate your unit** — Test one thing at a time
2. **Mock at boundaries** — External APIs, databases, file system
3. **Spies observe** — Track calls without replacing
4. **Reset between tests** — Prevent test pollution
5. **Keep mocks simple** — Only mock what you need

---

## Practice Exercise

Mock the `EmailService` dependency in this function:

```typescript
import { EmailService } from './emailService';

export async function registerUser(email: string, password: string) {
  const user = await createUserInDatabase(email, password);
  await EmailService.sendWelcomeEmail(email);
  return user;
}
```

Write tests that:
1. Verify `sendWelcomeEmail` is called with correct email
2. Handle case where email sending fails
3. Verify user is still created even if email fails

---

## Next Lesson

Let's learn how to test asynchronous code effectively.

→ [Continue to Lesson 08.4: Testing Async Code](./04-async)
