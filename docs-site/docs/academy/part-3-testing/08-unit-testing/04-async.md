---
sidebar_position: 4
title: "08.4 Testing Async Code"
description: "Master testing promises, async/await, and callbacks"
---

# Lesson 08.4: Testing Async Code

**Duration**: 30 minutes | **Difficulty**: Intermediate

---

## Learning Objectives

By the end of this lesson, you will be able to:
- Test functions that return Promises
- Use async/await in tests
- Handle rejected promises and errors
- Test callbacks and event-based code

---

## Testing Promises

### Basic Promise Test

```typescript
import { describe, it, expect } from 'vitest';
import { fetchUser } from './userService';

describe('fetchUser', () => {
  it('should return user data', async () => {
    // Use async/await
    const user = await fetchUser(1);

    expect(user).toEqual({
      id: 1,
      name: 'Alice'
    });
  });
});
```

### Alternative: Return the Promise

```typescript
it('should return user data', () => {
  // Return the promise - test waits for it
  return fetchUser(1).then(user => {
    expect(user).toEqual({ id: 1, name: 'Alice' });
  });
});
```

---

## Testing Rejected Promises

### Using rejects Matcher

```typescript
describe('fetchUser', () => {
  it('should throw error for non-existent user', async () => {
    // Use rejects for async errors
    await expect(fetchUser(999)).rejects.toThrow('User not found');
  });

  it('should reject with specific error type', async () => {
    await expect(fetchUser(999)).rejects.toBeInstanceOf(NotFoundError);
  });
});
```

### Using try/catch

```typescript
it('should throw error for invalid id', async () => {
  try {
    await fetchUser(-1);
    // If we get here, test should fail
    expect(true).toBe(false); // Force failure
  } catch (error) {
    expect(error.message).toBe('Invalid user ID');
  }
});
```

---

## Testing with Mocked Async Functions

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the API module
vi.mock('./api');
import { api } from './api';
import { getUserProfile } from './userService';

describe('getUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and format user profile', async () => {
    // Setup mock to return resolved promise
    (api.get as any).mockResolvedValue({
      data: { id: 1, firstName: 'Alice', lastName: 'Smith' }
    });

    const profile = await getUserProfile(1);

    expect(api.get).toHaveBeenCalledWith('/users/1');
    expect(profile).toEqual({
      id: 1,
      fullName: 'Alice Smith'
    });
  });

  it('should handle API errors', async () => {
    // Setup mock to return rejected promise
    (api.get as any).mockRejectedValue(new Error('Network error'));

    await expect(getUserProfile(1)).rejects.toThrow('Network error');
  });
});
```

---

## Testing Multiple Async Operations

### Sequential Operations

```typescript
it('should process orders in sequence', async () => {
  const result = await processOrderFlow(order);

  // Verify sequence of calls
  expect(validateOrder).toHaveBeenCalledBefore(chargePayment);
  expect(chargePayment).toHaveBeenCalledBefore(sendConfirmation);
  expect(result.status).toBe('completed');
});
```

### Parallel Operations

```typescript
it('should fetch all resources in parallel', async () => {
  const [users, products, orders] = await Promise.all([
    fetchUsers(),
    fetchProducts(),
    fetchOrders()
  ]);

  expect(users).toHaveLength(10);
  expect(products).toHaveLength(50);
  expect(orders).toHaveLength(5);
});
```

---

## Testing Timeouts

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Timeout handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should timeout after 5 seconds', async () => {
    const promise = fetchWithTimeout('/slow-endpoint', 5000);

    // Fast-forward time
    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow('Request timeout');
  });

  it('should succeed before timeout', async () => {
    // Mock fast response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'success' })
    });

    const promise = fetchWithTimeout('/fast-endpoint', 5000);

    // Don't need to advance timers - response is immediate
    const result = await promise;
    expect(result.data).toBe('success');
  });
});
```

---

## Testing Callbacks

### Converting Callbacks to Promises

```typescript
// Function with callback
function readFile(path: string, callback: (err: Error | null, data: string) => void) {
  // ...
}

// Test using Promise wrapper
it('should read file contents', async () => {
  const data = await new Promise<string>((resolve, reject) => {
    readFile('test.txt', (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  expect(data).toContain('expected content');
});
```

### Using done Callback (Jest/Vitest)

```typescript
it('should call callback with data', (done) => {
  fetchData((err, data) => {
    try {
      expect(err).toBeNull();
      expect(data).toBe('expected');
      done(); // Signal test completion
    } catch (error) {
      done(error); // Signal test failure
    }
  });
});
```

---

## Testing Event Emitters

```typescript
import { EventEmitter } from 'events';

describe('DataStream', () => {
  it('should emit data events', async () => {
    const stream = new DataStream();
    const dataPromise = new Promise<string[]>((resolve) => {
      const chunks: string[] = [];

      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        resolve(chunks);
      });
    });

    stream.start();

    const chunks = await dataPromise;
    expect(chunks).toEqual(['chunk1', 'chunk2', 'chunk3']);
  });

  it('should emit error on failure', async () => {
    const stream = new DataStream({ failAfter: 2 });

    await expect(new Promise((_, reject) => {
      stream.on('error', reject);
      stream.start();
    })).rejects.toThrow('Stream error');
  });
});
```

---

## Common Async Testing Mistakes

### Mistake 1: Forgetting await

```typescript
// ❌ BAD: Test passes immediately, doesn't wait
it('should fetch user', () => {
  expect(fetchUser(1)).resolves.toBeDefined(); // No await!
});

// ✅ GOOD: Wait for the promise
it('should fetch user', async () => {
  await expect(fetchUser(1)).resolves.toBeDefined();
});
```

### Mistake 2: Not Handling Rejections

```typescript
// ❌ BAD: Unhandled rejection crashes test
it('should handle error', async () => {
  const result = await fetchUser(999); // Throws!
  expect(result).toBeNull();
});

// ✅ GOOD: Expect the rejection
it('should handle error', async () => {
  await expect(fetchUser(999)).rejects.toThrow();
});
```

### Mistake 3: Race Conditions

```typescript
// ❌ BAD: Mock might not be set before call
it('should use mocked data', async () => {
  const promise = fetchUser(1);  // Starts before mock is ready
  api.get.mockResolvedValue({ id: 1 });
  const result = await promise;
});

// ✅ GOOD: Set up mock first
it('should use mocked data', async () => {
  api.get.mockResolvedValue({ id: 1 });
  const result = await fetchUser(1);
  expect(result.id).toBe(1);
});
```

---

## Key Takeaways

1. **Always await async tests** — Or return the promise
2. **Use rejects for error testing** — `await expect(fn()).rejects.toThrow()`
3. **Mock async dependencies** — `mockResolvedValue` / `mockRejectedValue`
4. **Use fake timers for timeouts** — Control time in tests
5. **Set up mocks before calling** — Avoid race conditions

---

## Practice Exercise

Test this async function:

```typescript
async function retryFetch(url: string, maxRetries: number = 3): Promise<Response> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      await delay(1000 * (i + 1)); // Exponential backoff
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
}
```

Write tests for:
1. Successful first attempt
2. Success after 2 failures
3. Failure after all retries exhausted
4. Verify exponential backoff timing

---

## Next Lesson

Learn to measure and improve your test coverage.

→ [Continue to Lesson 08.5: Test Coverage](./05-coverage)
