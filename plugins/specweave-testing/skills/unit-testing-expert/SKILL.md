---
name: unit-testing-expert
description: Comprehensive unit testing expertise covering Vitest, Jest, test-driven development (TDD), mocking strategies, test coverage, snapshot testing, test architecture, testing patterns, dependency injection, test doubles (mocks, stubs, spies, fakes), async testing, error handling tests, parametric testing, test organization, code coverage analysis, mutation testing, and production-grade unit testing best practices. Activates for unit testing, vitest, jest, test-driven development, TDD, red-green-refactor, mocking, stubbing, spying, test doubles, test coverage, snapshot testing, test architecture, dependency injection, async testing, test patterns, code coverage, mutation testing, test isolation, test fixtures, AAA pattern, given-when-then, test organization, testing best practices, vi.fn, vi.mock, vi.spyOn, describe, it, expect, beforeEach, afterEach.
---

# Unit Testing Expert

## Core Expertise

### 1. Vitest Fundamentals
**Modern Testing Framework** (Vite-native, Jest-compatible)

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserService } from './UserService';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new user', () => {
    const user = userService.create({ name: 'John', email: 'john@example.com' });

    expect(user).toMatchObject({
      id: expect.any(String),
      name: 'John',
      email: 'john@example.com',
      createdAt: expect.any(Date),
    });
  });

  it('should throw error for invalid email', () => {
    expect(() => {
      userService.create({ name: 'John', email: 'invalid' });
    }).toThrow('Invalid email format');
  });
});
```

### 2. Test-Driven Development (TDD)
**Red-Green-Refactor Cycle**

```typescript
// RED: Write failing test first
describe('Calculator', () => {
  it('should add two numbers', () => {
    const calculator = new Calculator();
    expect(calculator.add(2, 3)).toBe(5);
  });
});

// GREEN: Implement minimal code to pass
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}

// REFACTOR: Improve without breaking tests
class Calculator {
  add(...numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0);
  }
}

// Verify tests still pass
it('should add multiple numbers', () => {
  const calculator = new Calculator();
  expect(calculator.add(1, 2, 3, 4)).toBe(10);
});
```

**TDD Benefits**:
- Forces modular, testable design
- Prevents over-engineering
- Living documentation
- Confident refactoring
- Faster debugging

### 3. AAA Pattern (Arrange-Act-Assert)
**Structure for Clear Tests**

```typescript
describe('OrderService', () => {
  it('should calculate total with discount', () => {
    // ARRANGE: Set up test data and dependencies
    const orderService = new OrderService();
    const order = {
      items: [
        { price: 100, quantity: 2 },
        { price: 50, quantity: 1 },
      ],
      discountCode: 'SAVE20',
    };

    // ACT: Execute the behavior under test
    const total = orderService.calculateTotal(order);

    // ASSERT: Verify the result
    expect(total).toBe(200); // (100*2 + 50*1) * 0.8 = 200
  });
});
```

**Alternative: Given-When-Then (BDD Style)**

```typescript
describe('OrderService', () => {
  it('should apply discount when valid code is provided', () => {
    // GIVEN: An order with items and a discount code
    const orderService = new OrderService();
    const order = createOrder({ discountCode: 'SAVE20' });

    // WHEN: Calculating the total
    const total = orderService.calculateTotal(order);

    // THEN: The discount should be applied
    expect(total).toBe(200);
  });
});
```

### 4. Mocking Strategies
**Test Doubles: Mocks, Stubs, Spies, Fakes**

#### Mocks (Track Calls + Control Behavior)
```typescript
import { vi } from 'vitest';

describe('EmailService', () => {
  it('should send welcome email on user registration', async () => {
    // Mock external email API
    const mockSendEmail = vi.fn().mockResolvedValue({ success: true });
    const emailService = new EmailService({ sendEmail: mockSendEmail });

    await emailService.sendWelcomeEmail('user@example.com');

    // Verify mock was called correctly
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Welcome!',
      body: expect.stringContaining('Welcome to our platform'),
    });
  });
});
```

#### Spies (Track Calls on Real Methods)
```typescript
describe('Logger', () => {
  it('should log errors to console', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const logger = new Logger();
    logger.error('Something went wrong');

    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Something went wrong');

    consoleErrorSpy.mockRestore();
  });
});
```

#### Stubs (Return Predefined Values)
```typescript
describe('UserRepository', () => {
  it('should fetch user by id', async () => {
    // Stub database query
    const dbStub = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: 1, name: 'John' }],
      }),
    };

    const repo = new UserRepository(dbStub);
    const user = await repo.findById(1);

    expect(user).toEqual({ id: 1, name: 'John' });
  });
});
```

#### Fakes (Working Implementations for Testing)
```typescript
// Fake in-memory database
class FakeDatabase {
  private data: Map<string, any> = new Map();

  async save(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }

  async find(key: string): Promise<any> {
    return this.data.get(key);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
}

describe('CacheService', () => {
  it('should store and retrieve values', async () => {
    const fakeDb = new FakeDatabase();
    const cache = new CacheService(fakeDb);

    await cache.set('key', 'value');
    const result = await cache.get('key');

    expect(result).toBe('value');
  });
});
```

### 5. Module Mocking
**Mock Entire Modules**

```typescript
// Mock external dependency
vi.mock('./database', () => ({
  Database: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(true),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    disconnect: vi.fn(),
  })),
}));

import { Database } from './database';
import { UserService } from './UserService';

describe('UserService', () => {
  it('should connect to database on initialization', async () => {
    const userService = new UserService();
    await userService.init();

    expect(Database).toHaveBeenCalledTimes(1);
  });
});
```

**Partial Module Mocking**

```typescript
vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Mock only specific functions
    fetchData: vi.fn().mockResolvedValue({ data: 'mocked' }),
  };
});
```

**Auto-mocking with vi.hoisted**

```typescript
import { vi } from 'vitest';

// Hoist mocks to top (before imports)
vi.hoisted(() => {
  vi.mock('./config', () => ({
    API_URL: 'https://test-api.example.com',
  }));
});

import { API_URL } from './config';
```

### 6. Async Testing
**Handle Promises, Timers, and Callbacks**

#### Testing Promises
```typescript
describe('AsyncService', () => {
  it('should resolve with data', async () => {
    const service = new AsyncService();

    const result = await service.fetchData();

    expect(result).toEqual({ id: 1, name: 'Test' });
  });

  it('should reject with error', async () => {
    const service = new AsyncService();

    await expect(service.fetchInvalidData()).rejects.toThrow('Not found');
  });

  it('should handle multiple async operations', async () => {
    const service = new AsyncService();

    const [user, posts] = await Promise.all([
      service.fetchUser(1),
      service.fetchPosts(1),
    ]);

    expect(user.id).toBe(1);
    expect(posts.length).toBeGreaterThan(0);
  });
});
```

#### Testing Timers
```typescript
describe('DebounceService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllTimers();
  });

  it('should debounce function calls', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 1000);

    debounced();
    debounced();
    debounced();

    expect(callback).not.toHaveBeenCalled();

    // Fast-forward time
    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should cancel pending debounced calls', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 1000);

    debounced();
    debounced.cancel();

    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });
});
```

#### Testing Callbacks
```typescript
describe('EventEmitter', () => {
  it('should execute callback on event', (done) => {
    const emitter = new EventEmitter();

    emitter.on('data', (data) => {
      expect(data).toBe('test');
      done(); // Signal async completion
    });

    emitter.emit('data', 'test');
  });

  // Modern alternative: Promisify
  it('should execute callback on event (promisified)', () => {
    const emitter = new EventEmitter();

    const promise = new Promise((resolve) => {
      emitter.on('data', resolve);
    });

    emitter.emit('data', 'test');

    return expect(promise).resolves.toBe('test');
  });
});
```

### 7. Parametric Testing (Table-Driven Tests)
**Test Multiple Cases Efficiently**

```typescript
describe.each([
  { input: 2, expected: 4 },
  { input: 3, expected: 9 },
  { input: 4, expected: 16 },
  { input: 5, expected: 25 },
])('square($input)', ({ input, expected }) => {
  it(`should return ${expected}`, () => {
    expect(square(input)).toBe(expected);
  });
});

// Alternative syntax
it.each([
  [1, 2, 3],
  [2, 3, 5],
  [3, 4, 7],
])('add(%i, %i) should equal %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected);
});

// Complex validation
describe.each([
  { email: 'user@example.com', valid: true },
  { email: 'invalid', valid: false },
  { email: 'missing@', valid: false },
  { email: '@domain.com', valid: false },
  { email: '', valid: false },
])('validateEmail($email)', ({ email, valid }) => {
  it(`should return ${valid}`, () => {
    expect(validateEmail(email)).toBe(valid);
  });
});
```

### 8. Snapshot Testing
**Capture and Compare Complex Outputs**

```typescript
describe('ComponentRenderer', () => {
  it('should render user profile correctly', () => {
    const user = { id: 1, name: 'John', email: 'john@example.com' };
    const rendered = renderUserProfile(user);

    expect(rendered).toMatchSnapshot();
  });

  it('should render empty state', () => {
    const rendered = renderUserProfile(null);

    expect(rendered).toMatchSnapshot();
  });

  // Inline snapshots (better for small outputs)
  it('should format date', () => {
    const formatted = formatDate(new Date('2025-01-15'));

    expect(formatted).toMatchInlineSnapshot('"January 15, 2025"');
  });
});
```

**Update snapshots**: `npm test -- -u`

**Snapshot Best Practices**:
- Use for UI components, API responses, complex objects
- Keep snapshots small and focused
- Review snapshot diffs carefully in PRs
- Avoid snapshots for simple values (use `.toBe()` instead)

### 9. Error Handling Tests
**Verify Error Conditions**

```typescript
describe('ValidationService', () => {
  it('should throw for invalid input', () => {
    const validator = new ValidationService();

    expect(() => {
      validator.validate(null);
    }).toThrow('Input is required');
  });

  it('should throw specific error type', () => {
    const validator = new ValidationService();

    expect(() => {
      validator.validate({ age: -1 });
    }).toThrow(ValidationError);
  });

  it('should include error details', () => {
    const validator = new ValidationService();

    try {
      validator.validate({ age: 'invalid' });
      fail('Expected error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Age must be a number');
      expect(error.field).toBe('age');
      expect(error.code).toBe('INVALID_TYPE');
    }
  });

  it('should handle async errors', async () => {
    const service = new AsyncService();

    await expect(async () => {
      await service.fetchWithInvalidToken();
    }).rejects.toThrow('Unauthorized');
  });
});
```

### 10. Dependency Injection for Testability
**Design for Easy Testing**

```typescript
// ❌ BAD: Hard to test (tight coupling)
class UserService {
  async getUser(id: string) {
    const db = new Database(); // Hard-coded dependency
    return db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

// ✅ GOOD: Easy to test (dependency injection)
class UserService {
  constructor(private db: Database) {}

  async getUser(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

// Test with mock
describe('UserService', () => {
  it('should fetch user by id', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({ id: '1', name: 'John' }),
    };

    const service = new UserService(mockDb as any);
    const user = await service.getUser('1');

    expect(user).toEqual({ id: '1', name: 'John' });
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE id = ?',
      ['1']
    );
  });
});
```

**Factory Pattern for Dependencies**

```typescript
interface Dependencies {
  logger?: Logger;
  cache?: Cache;
  db?: Database;
}

class UserService {
  private logger: Logger;
  private cache: Cache;
  private db: Database;

  constructor(deps: Dependencies = {}) {
    this.logger = deps.logger ?? new ConsoleLogger();
    this.cache = deps.cache ?? new RedisCache();
    this.db = deps.db ?? new PostgresDatabase();
  }
}

// Production
const service = new UserService();

// Testing
const service = new UserService({
  logger: silentLogger,
  cache: inMemoryCache,
  db: mockDatabase,
});
```

### 11. Test Coverage Analysis
**Measure and Improve Coverage**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/types/**',
        'src/index.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

**Run with coverage**: `npm test -- --coverage`

**Coverage Types**:
- **Statement**: % of code statements executed
- **Branch**: % of conditional branches tested
- **Function**: % of functions called
- **Line**: % of lines executed

**Coverage Best Practices**:
- Aim for 80%+ overall coverage
- 100% coverage ≠ bug-free (test quality matters)
- Focus on critical paths and edge cases
- Use coverage to find untested code
- Don't game the system (write meaningful tests)

### 12. Test Organization
**Structure for Maintainability**

```
src/
├── services/
│   ├── UserService.ts
│   ├── UserService.test.ts       # Co-located tests
│   ├── OrderService.ts
│   └── OrderService.test.ts
├── utils/
│   ├── validation.ts
│   ├── validation.test.ts
│   ├── formatting.ts
│   └── formatting.test.ts
└── __tests__/                     # Alternative: separate test dir
    ├── unit/
    │   ├── services/
    │   │   ├── UserService.test.ts
    │   │   └── OrderService.test.ts
    │   └── utils/
    │       ├── validation.test.ts
    │       └── formatting.test.ts
    └── integration/
        ├── api.test.ts
        └── database.test.ts
```

**Naming Conventions**:
- Test files: `*.test.ts` or `*.spec.ts`
- Test suites: `describe('ClassName')`
- Test cases: `it('should do something specific')`
- Helper files: `*.fixture.ts`, `*.mock.ts`

### 13. Test Fixtures & Helpers
**Reusable Test Data and Utilities**

```typescript
// fixtures/user.fixture.ts
export const createUser = (overrides = {}) => ({
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date('2025-01-01'),
  ...overrides,
});

export const createUserList = (count = 3) =>
  Array.from({ length: count }, (_, i) =>
    createUser({ id: String(i + 1), name: `User ${i + 1}` })
  );

// Usage in tests
import { createUser, createUserList } from '../fixtures/user.fixture';

describe('UserRepository', () => {
  it('should save user', async () => {
    const user = createUser({ name: 'Jane' });
    await repo.save(user);

    expect(await repo.findById(user.id)).toEqual(user);
  });

  it('should find all users', async () => {
    const users = createUserList(5);
    await Promise.all(users.map(u => repo.save(u)));

    expect(await repo.findAll()).toHaveLength(5);
  });
});
```

**Test Helpers**

```typescript
// helpers/test-utils.ts
export const waitFor = (condition: () => boolean, timeout = 1000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for condition'));
      }
    }, 10);
  });
};

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

export const createMockLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});
```

### 14. Advanced Matchers
**Custom and Built-in Matchers**

```typescript
describe('Advanced Matchers', () => {
  // Equality
  it('exact equality', () => expect(1 + 1).toBe(2));
  it('deep equality', () => expect({ a: 1 }).toEqual({ a: 1 }));
  it('reference equality', () => {
    const obj = { a: 1 };
    expect(obj).toBe(obj);
  });

  // Truthiness
  it('truthy', () => expect(true).toBeTruthy());
  it('falsy', () => expect(false).toBeFalsy());
  it('defined', () => expect('value').toBeDefined());
  it('undefined', () => expect(undefined).toBeUndefined());
  it('null', () => expect(null).toBeNull());

  // Numbers
  it('greater than', () => expect(10).toBeGreaterThan(5));
  it('less than', () => expect(5).toBeLessThan(10));
  it('close to', () => expect(0.1 + 0.2).toBeCloseTo(0.3, 5));

  // Strings
  it('contains', () => expect('hello world').toContain('world'));
  it('matches regex', () => expect('test@example.com').toMatch(/^\S+@\S+$/));

  // Arrays
  it('contains item', () => expect([1, 2, 3]).toContain(2));
  it('has length', () => expect([1, 2, 3]).toHaveLength(3));
  it('contains object', () => {
    expect([{ id: 1 }, { id: 2 }]).toContainEqual({ id: 1 });
  });

  // Objects
  it('matches object', () => {
    expect({ id: 1, name: 'John', age: 30 }).toMatchObject({
      id: 1,
      name: 'John',
    });
  });
  it('has property', () => expect({ a: 1 }).toHaveProperty('a'));
  it('has property with value', () => expect({ a: 1 }).toHaveProperty('a', 1));

  // Functions
  it('throws', () => {
    expect(() => { throw new Error('fail'); }).toThrow('fail');
  });
  it('called', () => {
    const mock = vi.fn();
    mock();
    expect(mock).toHaveBeenCalled();
  });
  it('called with', () => {
    const mock = vi.fn();
    mock(1, 2);
    expect(mock).toHaveBeenCalledWith(1, 2);
  });

  // Negation
  it('not equal', () => expect(1).not.toBe(2));
});
```

**Custom Matchers**

```typescript
import { expect } from 'vitest';

expect.extend({
  toBeValidEmail(received: string) {
    const pass = /^\S+@\S+\.\S+$/.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
    };
  },
});

// Usage
it('should validate email', () => {
  expect('user@example.com').toBeValidEmail();
  expect('invalid').not.toBeValidEmail();
});
```

### 15. Test Lifecycle Hooks
**Setup and Teardown**

```typescript
describe('Database Tests', () => {
  let db: Database;

  // Run once before all tests in suite
  beforeAll(async () => {
    db = new Database();
    await db.connect();
  });

  // Run once after all tests in suite
  afterAll(async () => {
    await db.disconnect();
  });

  // Run before each test
  beforeEach(async () => {
    await db.clear();
    await db.seed();
  });

  // Run after each test
  afterEach(async () => {
    await db.rollback();
  });

  it('should insert user', async () => {
    await db.insert('users', { name: 'John' });
    const users = await db.query('users');
    expect(users).toHaveLength(1);
  });

  it('should delete user', async () => {
    await db.insert('users', { name: 'John' });
    await db.delete('users', { name: 'John' });
    const users = await db.query('users');
    expect(users).toHaveLength(0);
  });
});
```

**Conditional Execution**

```typescript
// Skip tests
it.skip('not ready yet', () => {});
it.todo('implement later');

// Only run specific tests
it.only('focus on this test', () => {});

// Run if condition met
it.runIf(process.env.CI)('CI only test', () => {});

// Skip if condition met
it.skipIf(process.platform === 'win32')('Unix only test', () => {});

// Concurrent execution
describe.concurrent('parallel tests', () => {
  it('test 1', async () => { /* runs in parallel */ });
  it('test 2', async () => { /* runs in parallel */ });
});
```

## Best Practices

### Test Isolation
- Each test should be independent
- No shared state between tests
- Use `beforeEach` to reset state
- Avoid global variables
- Clean up resources in `afterEach`

### Test Naming
- Use descriptive names: `it('should return user when id exists')`
- Follow "should" convention
- Be specific about what is being tested
- Include edge cases in name: `it('should handle empty array')`

### Avoid Test Smells
❌ **Don't**:
- Test implementation details
- Write slow tests (mock external deps)
- Use magic numbers (use constants)
- Share state between tests
- Test framework code (test YOUR code)

✅ **Do**:
- Test behavior, not implementation
- Keep tests fast (< 100ms per test)
- Use descriptive variable names
- Isolate tests completely
- Focus on edge cases and error paths

### Performance
- Mock expensive operations (DB, API, file I/O)
- Use fake timers for time-based code
- Run tests in parallel (`--threads`)
- Cache test fixtures
- Profile slow tests: `npm test -- --reporter=verbose`

## Common Patterns

### Testing Classes
```typescript
class Counter {
  private count = 0;

  increment() { this.count++; }
  decrement() { this.count--; }
  getValue() { return this.count; }
}

describe('Counter', () => {
  let counter: Counter;

  beforeEach(() => {
    counter = new Counter();
  });

  it('should start at 0', () => {
    expect(counter.getValue()).toBe(0);
  });

  it('should increment', () => {
    counter.increment();
    expect(counter.getValue()).toBe(1);
  });

  it('should decrement', () => {
    counter.decrement();
    expect(counter.getValue()).toBe(-1);
  });
});
```

### Testing Utilities
```typescript
describe('formatCurrency', () => {
  it.each([
    [1000, '$1,000.00'],
    [0.5, '$0.50'],
    [-100, '-$100.00'],
  ])('formatCurrency(%i) should return %s', (input, expected) => {
    expect(formatCurrency(input)).toBe(expected);
  });
});
```

### Testing Hooks (React, Vue)
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('should increment', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

## Troubleshooting

### Common Issues
1. **Timeouts**: Increase timeout for slow async operations
2. **Flaky tests**: Ensure proper cleanup, avoid race conditions
3. **Mock not working**: Check mock is hoisted, correct path
4. **Coverage gaps**: Use `--coverage` to identify untested code
5. **Slow tests**: Profile and mock expensive operations

### Debug Strategies
```bash
# Run single test
npm test -- path/to/test.ts

# Run tests matching pattern
npm test -- --grep "UserService"

# Debug mode (Node inspector)
node --inspect-brk node_modules/.bin/vitest run

# Watch mode
npm test -- --watch

# Verbose output
npm test -- --reporter=verbose

# Coverage report
npm test -- --coverage
```

## Resources
- **Vitest Docs**: https://vitest.dev
- **Testing Library**: https://testing-library.com
- **Jest API**: https://jestjs.io/docs/api (Jest-compatible)
- **TDD Guide**: https://martinfowler.com/bliki/TestDrivenDevelopment.html
- **Test Doubles**: https://martinfowler.com/bliki/TestDouble.html
