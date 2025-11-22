---
name: tdd-expert
description: Test-Driven Development (TDD) expertise covering red-green-refactor cycle, behavior-driven development, test-first design, refactoring with confidence, TDD best practices, TDD workflow, unit testing strategies, mock-driven development, test doubles, TDD patterns, SOLID principles through testing, emergent design, incremental development, TDD anti-patterns, and production-grade TDD practices. Activates for TDD, test-driven development, red-green-refactor, test-first, behavior-driven, BDD, refactoring, test doubles, mock-driven, test design, SOLID principles, emergent design, incremental development, TDD workflow, TDD best practices, TDD patterns, Kent Beck, Robert Martin, Uncle Bob, test-first design.
---

# Test-Driven Development (TDD) Expert

## Core Philosophy

Test-Driven Development is a software development approach where tests are written BEFORE the implementation code. This forces better design, ensures testability, and provides a safety net for refactoring.

**Core Principle**: "Red, Green, Refactor"

## The TDD Cycle

### 1. Red Phase: Write a Failing Test

**Goal**: Define expected behavior through a test that fails

```typescript
import { describe, it, expect } from 'vitest';
import { Calculator } from './Calculator';

describe('Calculator', () => {
  it('should add two numbers', () => {
    const calculator = new Calculator();

    // This test WILL fail because Calculator doesn't exist yet
    expect(calculator.add(2, 3)).toBe(5);
  });
});
```

**Red Phase Checklist**:
- [ ] Test describes ONE specific behavior
- [ ] Test fails for the RIGHT reason (not syntax error)
- [ ] Test is readable and understandable
- [ ] Expected behavior is clear from test name

**Common Mistakes in Red Phase**:
- Writing multiple assertions in one test
- Testing implementation details instead of behavior
- Writing tests that pass immediately (no value!)
- Unclear test names

### 2. Green Phase: Make It Pass (Minimal Implementation)

**Goal**: Write the simplest code that makes the test pass

```typescript
// Calculator.ts
export class Calculator {
  add(a: number, b: number): number {
    return 5; // Hardcoded! But test passes
  }
}
```

**Wait, hardcoded 5?** Yes! This is intentional. The green phase is about making tests pass with minimal code. The next test will force us to generalize.

**Add another test** (triangulation):
```typescript
it('should add different numbers', () => {
  const calculator = new Calculator();
  expect(calculator.add(10, 20)).toBe(30); // Now hardcoded 5 fails!
});
```

**Now implement properly**:
```typescript
export class Calculator {
  add(a: number, b: number): number {
    return a + b; // Generalized solution
  }
}
```

**Green Phase Checklist**:
- [ ] All tests pass
- [ ] Implementation is minimal (no premature optimization)
- [ ] No extra features beyond what tests require
- [ ] Code is simple and direct

**Common Mistakes in Green Phase**:
- Over-engineering the solution
- Adding features not covered by tests
- Premature optimization
- Skipping the refactor phase

### 3. Refactor Phase: Improve Code Quality

**Goal**: Improve code structure while keeping all tests green

```typescript
// Before refactoring
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }

  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }
}
```

**Refactored with better design**:
```typescript
// Extract operation interface
interface Operation {
  execute(a: number, b: number): number;
}

class AddOperation implements Operation {
  execute(a: number, b: number): number {
    return a + b;
  }
}

class DivideOperation implements Operation {
  execute(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }
}

export class Calculator {
  private operations: Map<string, Operation> = new Map([
    ['add', new AddOperation()],
    ['divide', new DivideOperation()],
  ]);

  perform(operation: string, a: number, b: number): number {
    const op = this.operations.get(operation);
    if (!op) {
      throw new Error(`Unknown operation: ${operation}`);
    }
    return op.execute(a, b);
  }
}
```

**Refactor Phase Checklist**:
- [ ] All tests still pass
- [ ] Code is more readable
- [ ] Duplication removed (DRY principle)
- [ ] Code follows SOLID principles
- [ ] Better separation of concerns
- [ ] No new functionality added

**Refactoring Patterns**:
- Extract Method/Function
- Extract Class
- Introduce Parameter Object
- Replace Conditional with Polymorphism
- Extract Interface
- Rename for clarity

## TDD Best Practices

### 1. Test Behavior, Not Implementation

**❌ BAD: Testing implementation details**
```typescript
it('should call internal helper method', () => {
  const spy = vi.spyOn(calculator, '_internalHelper');
  calculator.add(2, 3);
  expect(spy).toHaveBeenCalled(); // Brittle! Breaks on refactor
});
```

**✅ GOOD: Testing behavior**
```typescript
it('should return sum of two numbers', () => {
  expect(calculator.add(2, 3)).toBe(5); // Robust!
});
```

### 2. One Assertion Per Test (When Possible)

**❌ BAD: Multiple unrelated assertions**
```typescript
it('should validate user', () => {
  expect(user.name).toBe('John');
  expect(user.email).toBe('john@example.com');
  expect(user.isActive).toBe(true);
  expect(user.roles).toContain('admin');
});
```

**✅ GOOD: Focused tests**
```typescript
it('should have correct name', () => {
  expect(user.name).toBe('John');
});

it('should have valid email', () => {
  expect(user.email).toBe('john@example.com');
});

it('should be active by default', () => {
  expect(user.isActive).toBe(true);
});

it('should include admin role', () => {
  expect(user.roles).toContain('admin');
});
```

### 3. Test Edge Cases and Boundaries

**Test pyramid for a single function**:
1. Happy path (normal input)
2. Edge cases (empty, null, boundary values)
3. Error cases (invalid input)

```typescript
describe('divide', () => {
  // Happy path
  it('should divide two positive numbers', () => {
    expect(calculator.divide(10, 2)).toBe(5);
  });

  // Edge cases
  it('should handle division resulting in decimal', () => {
    expect(calculator.divide(5, 2)).toBe(2.5);
  });

  it('should handle negative numbers', () => {
    expect(calculator.divide(-10, 2)).toBe(-5);
  });

  it('should handle zero dividend', () => {
    expect(calculator.divide(0, 5)).toBe(0);
  });

  // Error case
  it('should throw error for division by zero', () => {
    expect(() => calculator.divide(10, 0)).toThrow('Division by zero');
  });
});
```

### 4. Use Descriptive Test Names

**Pattern**: `should [expected behavior] when [condition]`

```typescript
// ✅ GOOD: Clear and descriptive
it('should return empty array when no users exist', () => { ... });
it('should throw ValidationError when email is invalid', () => { ... });
it('should apply discount when user has premium membership', () => { ... });

// ❌ BAD: Vague and unclear
it('works', () => { ... });
it('test user creation', () => { ... });
it('returns data', () => { ... });
```

### 5. Follow AAA Pattern (Arrange-Act-Assert)

```typescript
it('should calculate total with discount', () => {
  // ARRANGE: Set up test data and dependencies
  const cart = new ShoppingCart();
  cart.addItem({ name: 'Book', price: 20 });
  cart.addItem({ name: 'Pen', price: 5 });
  const discountCode = 'SAVE10';

  // ACT: Execute the behavior under test
  const total = cart.calculateTotal(discountCode);

  // ASSERT: Verify the result
  expect(total).toBe(22.5); // 25 * 0.9 = 22.5
});
```

### 6. Test Isolation (No Shared State)

**❌ BAD: Shared state between tests**
```typescript
let user: User; // SHARED STATE!

beforeAll(() => {
  user = new User('John'); // Created once
});

it('should update name', () => {
  user.updateName('Jane'); // MUTATES SHARED STATE
  expect(user.name).toBe('Jane');
});

it('should have original name', () => {
  expect(user.name).toBe('John'); // FAILS! Name is 'Jane' from previous test
});
```

**✅ GOOD: Isolated tests**
```typescript
describe('User', () => {
  let user: User;

  beforeEach(() => {
    user = new User('John'); // FRESH instance for each test
  });

  it('should update name', () => {
    user.updateName('Jane');
    expect(user.name).toBe('Jane');
  });

  it('should have original name', () => {
    expect(user.name).toBe('John'); // PASSES! Fresh instance
  });
});
```

## TDD Workflow Examples

### Example 1: Building a User Validator

**Step 1: RED - Write failing test**
```typescript
describe('UserValidator', () => {
  it('should validate email format', () => {
    const validator = new UserValidator();
    expect(validator.validateEmail('user@example.com')).toBe(true);
  });
});
```

**Step 2: GREEN - Minimal implementation**
```typescript
export class UserValidator {
  validateEmail(email: string): boolean {
    return true; // Hardcoded! But test passes
  }
}
```

**Step 3: Add negative test (triangulation)**
```typescript
it('should reject invalid email', () => {
  const validator = new UserValidator();
  expect(validator.validateEmail('invalid')).toBe(false); // Forces real implementation
});
```

**Step 4: GREEN - Real implementation**
```typescript
export class UserValidator {
  validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

**Step 5: REFACTOR - Extract regex**
```typescript
export class UserValidator {
  private static EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validateEmail(email: string): boolean {
    return UserValidator.EMAIL_REGEX.test(email);
  }
}
```

**Step 6: Add more edge cases**
```typescript
it('should reject empty email', () => {
  expect(validator.validateEmail('')).toBe(false);
});

it('should reject null email', () => {
  expect(validator.validateEmail(null as any)).toBe(false);
});

it('should reject email without domain', () => {
  expect(validator.validateEmail('user@')).toBe(false);
});
```

**Final refactored implementation**:
```typescript
export class UserValidator {
  private static EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validateEmail(email: string | null | undefined): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }
    return UserValidator.EMAIL_REGEX.test(email);
  }
}
```

### Example 2: Building a Shopping Cart

**RED: Test adding items**
```typescript
describe('ShoppingCart', () => {
  it('should add item to cart', () => {
    const cart = new ShoppingCart();
    cart.addItem({ id: 1, name: 'Book', price: 20 });

    expect(cart.getItemCount()).toBe(1);
  });
});
```

**GREEN: Minimal implementation**
```typescript
interface CartItem {
  id: number;
  name: string;
  price: number;
}

export class ShoppingCart {
  private items: CartItem[] = [];

  addItem(item: CartItem): void {
    this.items.push(item);
  }

  getItemCount(): number {
    return this.items.length;
  }
}
```

**RED: Test calculating total**
```typescript
it('should calculate total price', () => {
  const cart = new ShoppingCart();
  cart.addItem({ id: 1, name: 'Book', price: 20 });
  cart.addItem({ id: 2, name: 'Pen', price: 5 });

  expect(cart.getTotal()).toBe(25);
});
```

**GREEN: Implement total**
```typescript
export class ShoppingCart {
  // ... previous code ...

  getTotal(): number {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }
}
```

**RED: Test removing items**
```typescript
it('should remove item from cart', () => {
  const cart = new ShoppingCart();
  cart.addItem({ id: 1, name: 'Book', price: 20 });
  cart.removeItem(1);

  expect(cart.getItemCount()).toBe(0);
});
```

**GREEN: Implement remove**
```typescript
export class ShoppingCart {
  // ... previous code ...

  removeItem(itemId: number): void {
    this.items = this.items.filter(item => item.id !== itemId);
  }
}
```

**REFACTOR: Extract calculations**
```typescript
export class ShoppingCart {
  private items: CartItem[] = [];

  addItem(item: CartItem): void {
    this.items.push(item);
  }

  removeItem(itemId: number): void {
    this.items = this.items.filter(item => item.id !== itemId);
  }

  getItemCount(): number {
    return this.items.length;
  }

  getTotal(): number {
    return this.calculateTotal(this.items);
  }

  private calculateTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price, 0);
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}
```

## TDD with Mocks and Test Doubles

### Types of Test Doubles

1. **Dummy**: Objects passed but never used
2. **Stub**: Returns predefined values
3. **Spy**: Records information about calls
4. **Mock**: Verifies interactions
5. **Fake**: Working implementation (simplified)

### Example: Testing with Mocks

**RED: Test user creation with email service**
```typescript
describe('UserService', () => {
  it('should send welcome email when user created', async () => {
    const emailService = createMockEmailService();
    const userService = new UserService(emailService);

    await userService.createUser({ name: 'John', email: 'john@example.com' });

    expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith('john@example.com');
  });
});
```

**GREEN: Implementation with dependency injection**
```typescript
interface EmailService {
  sendWelcomeEmail(email: string): Promise<void>;
}

export class UserService {
  constructor(private emailService: EmailService) {}

  async createUser(userData: { name: string; email: string }): Promise<User> {
    const user = new User(userData);
    await this.emailService.sendWelcomeEmail(user.email);
    return user;
  }
}

// Test helper
function createMockEmailService(): EmailService {
  return {
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  };
}
```

## TDD and SOLID Principles

TDD naturally leads to SOLID design:

### 1. Single Responsibility Principle (SRP)

**TDD forces SRP** because classes with multiple responsibilities are hard to test.

```typescript
// ❌ BAD: Multiple responsibilities (hard to test!)
class UserManager {
  createUser() { /* ... */ }
  sendEmail() { /* ... */ }
  saveToDatabase() { /* ... */ }
  validateInput() { /* ... */ }
}

// ✅ GOOD: Single responsibility (easy to test!)
class UserCreator {
  createUser() { /* ... */ }
}

class EmailSender {
  sendEmail() { /* ... */ }
}

class UserRepository {
  save() { /* ... */ }
}

class UserValidator {
  validate() { /* ... */ }
}
```

### 2. Open/Closed Principle (OCP)

**TDD encourages extension through abstraction**

```typescript
// Extension through interfaces
interface PaymentProcessor {
  process(amount: number): Promise<PaymentResult>;
}

class StripeProcessor implements PaymentProcessor {
  async process(amount: number): Promise<PaymentResult> {
    // Stripe implementation
  }
}

class PayPalProcessor implements PaymentProcessor {
  async process(amount: number): Promise<PaymentResult> {
    // PayPal implementation
  }
}

// Tests can easily mock PaymentProcessor
describe('OrderService', () => {
  it('should process payment', async () => {
    const mockProcessor: PaymentProcessor = {
      process: vi.fn().mockResolvedValue({ success: true }),
    };

    const orderService = new OrderService(mockProcessor);
    await orderService.completeOrder(100);

    expect(mockProcessor.process).toHaveBeenCalledWith(100);
  });
});
```

### 3. Liskov Substitution Principle (LSP)

**TDD ensures LSP through contract testing**

```typescript
// Base class contract
abstract class Shape {
  abstract area(): number;
}

// Implementations must satisfy contract
class Rectangle extends Shape {
  constructor(private width: number, private height: number) {
    super();
  }

  area(): number {
    return this.width * this.height;
  }
}

class Circle extends Shape {
  constructor(private radius: number) {
    super();
  }

  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

// Test contract for all shapes
function testShapeContract(createShape: () => Shape) {
  it('should have positive area', () => {
    const shape = createShape();
    expect(shape.area()).toBeGreaterThan(0);
  });

  it('should return number', () => {
    const shape = createShape();
    expect(typeof shape.area()).toBe('number');
  });
}

describe('Rectangle', () => {
  testShapeContract(() => new Rectangle(10, 5));
});

describe('Circle', () => {
  testShapeContract(() => new Circle(5));
});
```

### 4. Interface Segregation Principle (ISP)

**TDD reveals when interfaces are too large**

```typescript
// ❌ BAD: Fat interface (forces unnecessary mocking)
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
}

// Mocking is painful
const mockWorker: Worker = {
  work: vi.fn(),
  eat: vi.fn(),   // Not needed for this test!
  sleep: vi.fn(), // Not needed for this test!
};

// ✅ GOOD: Segregated interfaces
interface Workable {
  work(): void;
}

interface Eatable {
  eat(): void;
}

// Only mock what you need
const mockWorkable: Workable = {
  work: vi.fn(),
};
```

### 5. Dependency Inversion Principle (DIP)

**TDD requires dependency injection (essential for testing)**

```typescript
// ✅ GOOD: Depends on abstraction
interface Logger {
  log(message: string): void;
}

class UserService {
  constructor(private logger: Logger) {} // Injected dependency

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);
    // ...
  }
}

// Easy to test with mock
describe('UserService', () => {
  it('should log user creation', () => {
    const mockLogger: Logger = { log: vi.fn() };
    const service = new UserService(mockLogger);

    service.createUser('John');

    expect(mockLogger.log).toHaveBeenCalledWith('Creating user: John');
  });
});
```

## TDD Anti-Patterns to Avoid

### 1. The Liar (Passing test that doesn't test anything)

**❌ BAD**:
```typescript
it('should validate user', () => {
  const result = true; // Hardcoded!
  expect(result).toBe(true); // Always passes
});
```

### 2. Excessive Setup (Tests too complex)

**❌ BAD**:
```typescript
beforeEach(() => {
  // 50 lines of setup code...
  database.connect();
  seedTestData();
  setupMocks();
  configureEnvironment();
  // ...
});
```

**✅ GOOD**: Extract to helper or fixture
```typescript
beforeEach(() => {
  testEnv = createTestEnvironment(); // Encapsulated setup
});
```

### 3. The Giant (One test testing everything)

**❌ BAD**:
```typescript
it('should handle entire user lifecycle', () => {
  // 200 lines of test code testing create, update, delete, search...
});
```

**✅ GOOD**: One test per behavior
```typescript
it('should create user', () => { /* ... */ });
it('should update user', () => { /* ... */ });
it('should delete user', () => { /* ... */ });
```

### 4. The Mockery (Over-mocking)

**❌ BAD**:
```typescript
vi.mock('./utils');
vi.mock('./helpers');
vi.mock('./validators');
vi.mock('./formatters');
// Testing nothing but mocks!
```

**✅ GOOD**: Mock only external dependencies
```typescript
vi.mock('./externalApi'); // Mock external API only
// Test real code integration
```

### 5. The Slow Poke (Slow tests)

**❌ BAD**:
```typescript
it('should process data', async () => {
  await sleep(5000); // Hardcoded delays
  // ...
});
```

**✅ GOOD**: Use fake timers
```typescript
it('should process data', () => {
  vi.useFakeTimers();
  // ...
  vi.advanceTimersByTime(5000);
  vi.restoreAllTimers();
});
```

## TDD Metrics & Success Indicators

**Good TDD indicators**:
- ✅ 80%+ code coverage
- ✅ Tests run in < 1 second (unit tests)
- ✅ Tests are independent and can run in any order
- ✅ Tests are readable and self-documenting
- ✅ Red-Green-Refactor cycle followed consistently
- ✅ Code is modular and testable

**Warning signs**:
- ❌ Tests take minutes to run
- ❌ Tests fail randomly (flakiness)
- ❌ Hard to write tests (indicates design issues)
- ❌ Mocking everything (over-mocking)
- ❌ Tests break on refactoring (testing implementation)

## TDD in Practice: Real-World Tips

### 1. Start Small
Begin TDD on new features, not legacy code. Retrofit tests gradually.

### 2. Write Test First (Always!)
Resist urge to code first. The test is your design tool.

### 3. Keep Tests Fast
Unit tests should run in milliseconds. Slow tests kill TDD.

### 4. Commit Test + Code Together
Tests are part of the implementation, not afterthought.

### 5. Refactor Relentlessly
Green doesn't mean done. Refactor for clarity.

### 6. Test Behavior, Not Implementation
Tests should survive refactoring.

### 7. Use TDD to Drive Design
Let tests guide your architecture (dependency injection, SOLID).

## TDD Workflow Commands

**Development cycle**:
```bash
# 1. Write failing test (RED)
npm test -- --watch

# 2. Implement (GREEN)
# Make changes, watch tests turn green

# 3. Refactor
# Improve code, tests stay green

# 4. Commit
git add .
git commit -m "feat: add user validation"
```

**Coverage check**:
```bash
npm test -- --coverage
# Ensure 80%+ coverage
```

## Resources

- **Kent Beck**: "Test-Driven Development by Example"
- **Robert C. Martin**: "Clean Code" (TDD chapter)
- **Martin Fowler**: Refactoring patterns
- **Growing Object-Oriented Software, Guided by Tests** (Freeman & Pryce)

## Summary

**TDD Core Rules**:
1. Write test FIRST (red)
2. Make it pass MINIMALLY (green)
3. Refactor RELENTLESSLY (refactor)
4. Repeat

**Benefits**:
- Better design (testable = modular)
- Living documentation
- Fearless refactoring
- Fast feedback loop
- Higher confidence

**Remember**: TDD is about **design**, not just testing. Tests are a tool to drive better architecture.
