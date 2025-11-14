---
id: testing-fundamentals
title: Testing Fundamentals & Quality Assurance
sidebar_label: Testing Fundamentals
description: Comprehensive guide to software testing covering the testing pyramid, TDD, BDD, test levels, coverage metrics, CI/CD integration, and SpecWeave testing approach
keywords: [testing, quality assurance, TDD, BDD, test pyramid, unit testing, integration testing, E2E testing, test coverage, QA]
---

# Testing Fundamentals & Quality Assurance

Testing is not just about catching bugs—it's about building confidence in your software, documenting expected behavior, and enabling fearless refactoring. This guide covers testing from first principles to advanced strategies, with real-world examples and SpecWeave integration.

---

## Why Testing Matters

### The Cost of Bugs

Software bugs don't have equal costs. When you catch a bug matters dramatically:

```mermaid
graph LR
    A[Development<br/>$10] --> B[QA Testing<br/>$100]
    B --> C[Staging<br/>$1,000]
    C --> D[Production<br/>$10,000+]

    style A fill:#c8e6c9
    style B fill:#fff9c4
    style C fill:#ffccbc
    style D fill:#ef9a9a
```

**Real-world cost examples**:

| Stage | Cost | Example |
|-------|------|---------|
| **Development** | $10 | Developer catches bug in unit test (5 min fix) |
| **QA Testing** | $100 | QA finds bug, writes report, developer debugs, retests (2 hours) |
| **Staging** | $1,000 | Bug blocks release, emergency fix, deployment cycle (1 day) |
| **Production** | $10,000+ | Data corruption, customer support, incident response, reputation damage |

### Benefits of Good Testing

**1. Prevent Production Bugs**
- Catch issues before users experience them
- Save customer support time
- Protect brand reputation

**2. Catch Regressions Early**
- Know immediately when changes break existing functionality
- Deploy with confidence
- Reduce "fear-driven development"

**3. Document Expected Behavior**
- Tests serve as living documentation
- New developers understand requirements from tests
- Business rules explicitly captured

**4. Enable Confident Refactoring**
- Improve code structure without breaking functionality
- Optimize performance safely
- Pay down technical debt

**5. Reduce Debugging Time**
- Failed tests point directly to problems
- Narrow down root cause faster
- Spend more time building, less time firefighting

---

## The Testing Pyramid

The testing pyramid is a visual metaphor for **how to distribute your testing effort** across different test types.

```mermaid
graph TD
    A[E2E Tests<br/>10%<br/>Slow, Few, Expensive]
    B[Integration Tests<br/>20%<br/>Moderate Speed]
    C[Unit Tests<br/>70%<br/>Fast, Many, Cheap]

    A --> B
    B --> C

    style A fill:#ef9a9a
    style B fill:#fff9c4
    style C fill:#c8e6c9
```

### The Layers Explained

#### Unit Tests (70% - Foundation)

**What**: Test individual functions or components in isolation

**Characteristics**:
- **Fast**: Milliseconds per test
- **Many**: Hundreds or thousands of tests
- **Isolated**: No external dependencies (DB, API, file system)
- **Cheap**: Easy to write and maintain

**Example**: Testing a calculation function
```typescript
// Unit test: Isolated, fast, no dependencies
describe('calculateOrderTotal', () => {
  it('should return sum of item prices', () => {
    const items = [
      { price: 100 },
      { price: 50 }
    ];

    expect(calculateOrderTotal(items)).toBe(150);
  });

  it('should handle empty cart', () => {
    expect(calculateOrderTotal([])).toBe(0);
  });

  it('should apply discount correctly', () => {
    const items = [{ price: 100 }];

    expect(calculateOrderTotal(items, 0.1)).toBe(90); // 10% discount
  });
});
```

#### Integration Tests (20% - Middle Layer)

**What**: Test how components work together

**Characteristics**:
- **Moderate Speed**: Seconds per test
- **Some Mocks**: Mock external services, use real DB (test instance)
- **Realistic**: Test actual integration points

**Example**: Testing API endpoint with database
```typescript
// Integration test: API + Database
describe('POST /api/orders', () => {
  it('should create order and update inventory', async () => {
    // Setup: Create product in test DB
    await testDb.products.create({
      id: 'laptop',
      name: 'MacBook Pro',
      stock: 10
    });

    // Act: Create order via API
    const response = await request(app)
      .post('/api/orders')
      .send({
        productId: 'laptop',
        quantity: 2
      });

    // Assert: Order created
    expect(response.status).toBe(201);
    expect(response.body.order.id).toBeDefined();

    // Assert: Inventory updated
    const product = await testDb.products.findById('laptop');
    expect(product.stock).toBe(8); // 10 - 2
  });
});
```

#### E2E Tests (10% - Top of Pyramid)

**What**: Test complete user workflows through the UI

**Characteristics**:
- **Slow**: Minutes per test
- **Few**: 5-20 critical paths
- **Expensive**: Require browser automation, complex setup
- **Realistic**: Real browser + backend + database

**Example**: Complete checkout flow
```typescript
// E2E test: Complete user journey
test('User can complete checkout', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'SecurePass123');
  await page.click('button[type="submit"]');

  // 2. Browse products
  await page.goto('/products');
  await page.click('[data-product="laptop"]');

  // 3. Add to cart
  await page.click('button:has-text("Add to Cart")');
  await expect(page.locator('.cart-badge')).toHaveText('1');

  // 4. Checkout
  await page.goto('/cart');
  await page.click('button:has-text("Checkout")');

  // 5. Payment
  await page.fill('[name="cardNumber"]', '4242424242424242');
  await page.fill('[name="expiry"]', '12/25');
  await page.fill('[name="cvc"]', '123');
  await page.click('button:has-text("Pay $999")');

  // 6. Verify success
  await expect(page.locator('text=Order Confirmed')).toBeVisible();
  await expect(page.url()).toContain('/order-success');
});
```

### Why This Distribution?

**Speed & Cost Trade-off**:
- Unit tests: 1ms each → 1000 tests = 1 second
- Integration tests: 1s each → 100 tests = 100 seconds
- E2E tests: 1 min each → 10 tests = 10 minutes

**Maintenance**:
- Unit tests: Rarely break during refactoring
- Integration tests: Break when APIs change
- E2E tests: Break when UI changes (brittle)

**Coverage**:
- Unit tests: Cover all edge cases, branches
- Integration tests: Cover critical workflows
- E2E tests: Cover happy paths only

### The Anti-Pattern: Ice Cream Cone

```mermaid
graph TD
    A[Unit Tests<br/>10%<br/>Too Few]
    B[Integration Tests<br/>20%<br/>Some]
    C[E2E Tests<br/>70%<br/>Too Many!]

    C --> B
    B --> A

    style A fill:#c8e6c9
    style B fill:#fff9c4
    style C fill:#ef9a9a
```

**Problems with Ice Cream Cone**:
- ❌ Test suite takes hours to run
- ❌ Flaky tests (E2E tests fail randomly)
- ❌ High maintenance cost (UI changes break many tests)
- ❌ Debugging is hard (E2E failures don't pinpoint root cause)

**Solution**: Follow the pyramid! Write many unit tests, some integration tests, few E2E tests.

---

## Testing Levels Deep Dive

### 1. Unit Testing

**Goal**: Test individual functions/methods in complete isolation

#### What Makes a Good Unit Test?

**AAA Pattern** (Arrange-Act-Assert):

```typescript
describe('UserService.register', () => {
  it('should hash password before storing', async () => {
    // Arrange: Set up test data and dependencies
    const userService = new UserService();
    const email = 'user@example.com';
    const password = 'PlainTextPassword123';

    // Act: Execute the function under test
    const result = await userService.register(email, password);

    // Assert: Verify the outcome
    expect(result.password).not.toBe(password); // Not plain text
    expect(result.password).toMatch(/^\$2[aby]\$\d+\$/); // Bcrypt format
  });
});
```

#### Testing Edge Cases

**Don't just test the happy path!**

```typescript
describe('validateEmail', () => {
  // Happy path
  it('should accept valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  // Edge cases
  it('should reject email without @', () => {
    expect(() => validateEmail('userexample.com')).toThrow('Invalid email');
  });

  it('should reject email without domain', () => {
    expect(() => validateEmail('user@')).toThrow('Invalid email');
  });

  it('should reject empty string', () => {
    expect(() => validateEmail('')).toThrow('Email required');
  });

  it('should reject null', () => {
    expect(() => validateEmail(null)).toThrow('Email required');
  });

  it('should trim whitespace', () => {
    expect(validateEmail('  user@example.com  ')).toBe(true);
  });
});
```

#### Mocking External Dependencies

**Use mocks to isolate unit under test**:

```typescript
describe('AuthService.register', () => {
  it('should send welcome email after registration', async () => {
    // Arrange: Mock email service (don't send real emails in tests!)
    const mockEmailService = {
      send: jest.fn().mockResolvedValue(true)
    };

    const authService = new AuthService(mockEmailService);

    // Act
    await authService.register('user@example.com', 'password123');

    // Assert: Email was sent
    expect(mockEmailService.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Welcome to SpecWeave',
      body: expect.stringContaining('Thanks for signing up')
    });
  });
});
```

#### Best Practices for Unit Tests

✅ **DO**:
- Test one thing per test
- Use descriptive test names: `should [expected behavior] when [condition]`
- Test edge cases (empty, null, boundary values)
- Mock external dependencies
- Keep tests fast (&lt;100ms each)

❌ **DON'T**:
- Test implementation details (private methods)
- Test framework code (e.g., testing that Express works)
- Make tests depend on each other
- Use real databases, APIs, or file system
- Write tests that can pass and fail randomly (flaky tests)

---

### 2. Integration Testing

**Goal**: Test how components work together

#### API + Database Integration

```typescript
describe('User API Integration', () => {
  let app: Express;
  let db: Database;

  beforeAll(async () => {
    // Setup: Start test database
    db = await createTestDatabase();
    app = createApp(db);
  });

  afterAll(async () => {
    // Cleanup: Destroy test database
    await db.destroy();
  });

  beforeEach(async () => {
    // Reset database before each test
    await db.truncate();
  });

  it('should register user and persist to database', async () => {
    // Act: Register via API
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user@example.com',
        password: 'SecurePass123'
      });

    // Assert: API response
    expect(response.status).toBe(201);
    expect(response.body.user.id).toBeDefined();

    // Assert: User exists in database
    const user = await db.users.findByEmail('user@example.com');
    expect(user).toBeDefined();
    expect(user.password).not.toBe('SecurePass123'); // Hashed
  });

  it('should reject duplicate email', async () => {
    // Setup: Create existing user
    await db.users.create({
      email: 'existing@example.com',
      password: 'hashed_password'
    });

    // Act: Try to register with same email
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'existing@example.com',
        password: 'AnotherPass123'
      });

    // Assert: Duplicate rejected
    expect(response.status).toBe(409); // Conflict
    expect(response.body.error).toBe('Email already exists');
  });
});
```

#### Service Integration

```typescript
describe('OrderService + InventoryService Integration', () => {
  it('should reduce inventory when order is created', async () => {
    // Arrange: Create product with stock
    const inventoryService = new InventoryService(db);
    const orderService = new OrderService(db, inventoryService);

    await inventoryService.createProduct({
      id: 'laptop',
      stock: 10
    });

    // Act: Create order
    const order = await orderService.create({
      productId: 'laptop',
      quantity: 3
    });

    // Assert: Order created
    expect(order.id).toBeDefined();
    expect(order.quantity).toBe(3);

    // Assert: Inventory reduced
    const product = await inventoryService.getProduct('laptop');
    expect(product.stock).toBe(7); // 10 - 3
  });

  it('should reject order if insufficient stock', async () => {
    // Arrange: Product with low stock
    const inventoryService = new InventoryService(db);
    const orderService = new OrderService(db, inventoryService);

    await inventoryService.createProduct({
      id: 'laptop',
      stock: 2
    });

    // Act & Assert: Order rejected
    await expect(orderService.create({
      productId: 'laptop',
      quantity: 5
    })).rejects.toThrow('Insufficient stock');

    // Verify: Stock unchanged
    const product = await inventoryService.getProduct('laptop');
    expect(product.stock).toBe(2);
  });
});
```

#### Best Practices for Integration Tests

✅ **DO**:
- Use test database (not production!)
- Reset database state between tests
- Test real integration points (don't mock everything)
- Test error scenarios (network failures, timeouts)
- Use Docker containers for dependencies (Testcontainers)

❌ **DON'T**:
- Share state between tests
- Use production services
- Skip cleanup (leave test data behind)
- Test UI in integration tests (that's E2E)

---

### 3. E2E (End-to-End) Testing

**Goal**: Test complete user journeys through the UI

#### Complete E2E Test Example

```typescript
// tests/e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Seed test database with products
    await seedDatabase({
      products: [
        { id: 'laptop', name: 'MacBook Pro', price: 999, stock: 10 }
      ],
      users: [
        { email: 'test@example.com', password: 'hashed_password' }
      ]
    });
  });

  test('User can complete full checkout flow', async ({ page }) => {
    // Step 1: Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123');
    await page.click('button[type="submit"]');

    // Verify: Redirected to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Step 2: Browse products
    await page.goto('/products');
    await expect(page.locator('h1')).toHaveText('Products');

    // Step 3: View product details
    await page.click('[data-product-id="laptop"]');
    await expect(page.locator('.product-name')).toHaveText('MacBook Pro');
    await expect(page.locator('.product-price')).toHaveText('$999');

    // Step 4: Add to cart
    await page.click('button:has-text("Add to Cart")');
    await expect(page.locator('.cart-badge')).toHaveText('1');
    await expect(page.locator('.toast')).toHaveText('Added to cart');

    // Step 5: View cart
    await page.click('a[href="/cart"]');
    await expect(page.locator('.cart-item-name')).toHaveText('MacBook Pro');
    await expect(page.locator('.cart-total')).toHaveText('$999');

    // Step 6: Proceed to checkout
    await page.click('button:has-text("Checkout")');
    await expect(page).toHaveURL('/checkout');

    // Step 7: Fill payment details (use Stripe test card)
    await page.fill('[name="cardNumber"]', '4242 4242 4242 4242');
    await page.fill('[name="expiry"]', '12/25');
    await page.fill('[name="cvc"]', '123');
    await page.fill('[name="zip"]', '94103');

    // Step 8: Submit payment
    await page.click('button:has-text("Pay $999")');

    // Wait for payment processing
    await page.waitForURL('/order-success', { timeout: 10000 });

    // Step 9: Verify success page
    await expect(page.locator('h1')).toHaveText('Order Confirmed!');
    await expect(page.locator('.order-id')).toBeVisible();
    await expect(page.locator('.order-total')).toHaveText('$999');

    // Step 10: Verify email sent (check test email service)
    const orderEmail = await getLastSentEmail();
    expect(orderEmail.to).toBe('test@example.com');
    expect(orderEmail.subject).toContain('Order Confirmation');
  });

  test('Should show error when payment fails', async ({ page }) => {
    // Login and add product to cart (reuse helper)
    await loginAndAddToCart(page, 'laptop');

    // Navigate to checkout
    await page.goto('/checkout');

    // Use Stripe test card that always fails
    await page.fill('[name="cardNumber"]', '4000 0000 0000 0002');
    await page.fill('[name="expiry"]', '12/25');
    await page.fill('[name="cvc"]', '123');

    // Submit payment
    await page.click('button:has-text("Pay")');

    // Verify: Error shown, still on checkout page
    await expect(page.locator('.error-message')).toHaveText('Payment failed');
    await expect(page).toHaveURL('/checkout');

    // Verify: Cart still has items
    await page.goto('/cart');
    await expect(page.locator('.cart-item')).toHaveCount(1);
  });
});
```

#### E2E Test Patterns

**Page Object Model** (organize selectors):

```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async expectDashboard() {
    await expect(this.page).toHaveURL('/dashboard');
  }
}

// Use in tests
test('User can login', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login('test@example.com', 'password');
  await loginPage.expectDashboard();
});
```

#### Best Practices for E2E Tests

✅ **DO**:
- Test critical user journeys only
- Use test data (seed database before tests)
- Use Page Object Model for maintainability
- Run against staging environment
- Take screenshots on failure
- Use explicit waits (avoid sleep)

❌ **DON'T**:
- Test every permutation (too slow)
- Test UI details (button color, font size)
- Make tests depend on each other
- Run against production
- Use hardcoded waits (`sleep(5000)`)

---

## Test-Driven Development (TDD)

**TDD**: Write tests **before** writing implementation code.

### The Red-Green-Refactor Cycle

```mermaid
graph LR
    A[🔴 Red<br/>Write Failing Test] --> B[🟢 Green<br/>Make Test Pass]
    B --> C[🔵 Refactor<br/>Improve Code]
    C --> A

    style A fill:#ef9a9a
    style B fill:#c8e6c9
    style C fill:#90caf9
```

### Complete TDD Example: Password Validator

#### Step 1: Red - Write Failing Test

```typescript
// tests/unit/validators/password.test.ts
describe('validatePassword', () => {
  it('should accept password with 8+ characters', () => {
    // This will fail - function doesn't exist yet
    expect(validatePassword('Abcd1234')).toBe(true);
  });
});
```

**Run**: `npm test` → ❌ Test fails (expected!)

```
ReferenceError: validatePassword is not defined
```

#### Step 2: Green - Make Test Pass

Write **minimal code** to pass the test:

```typescript
// src/validators/password.ts
export function validatePassword(password: string): boolean {
  return password.length >= 8;
}
```

**Run**: `npm test` → ✅ Test passes!

#### Step 3: Add More Tests (Red Again)

```typescript
describe('validatePassword', () => {
  it('should accept password with 8+ characters', () => {
    expect(validatePassword('Abcd1234')).toBe(true);
  });

  it('should reject password with less than 8 characters', () => {
    // This will fail - only checking length, not rejection
    expect(() => validatePassword('Short1')).toThrow('Password must be at least 8 characters');
  });

  it('should require at least one uppercase letter', () => {
    expect(() => validatePassword('abcd1234')).toThrow('Password must contain uppercase letter');
  });

  it('should require at least one number', () => {
    expect(() => validatePassword('Abcdefgh')).toThrow('Password must contain a number');
  });
});
```

**Run**: `npm test` → ❌ 3 tests fail

#### Step 4: Green - Make All Tests Pass

```typescript
// src/validators/password.ts
export function validatePassword(password: string): boolean {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain a number');
  }

  return true;
}
```

**Run**: `npm test` → ✅ All tests pass!

#### Step 5: Refactor - Improve Code

```typescript
// src/validators/password.ts
interface PasswordRule {
  test: (password: string) => boolean;
  message: string;
}

const PASSWORD_RULES: PasswordRule[] = [
  {
    test: (pwd) => pwd.length >= 8,
    message: 'Password must be at least 8 characters'
  },
  {
    test: (pwd) => /[A-Z]/.test(pwd),
    message: 'Password must contain uppercase letter'
  },
  {
    test: (pwd) => /[0-9]/.test(pwd),
    message: 'Password must contain a number'
  },
  {
    test: (pwd) => /[!@#$%^&*]/.test(pwd),
    message: 'Password must contain special character'
  }
];

export function validatePassword(password: string): boolean {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) {
      throw new Error(rule.message);
    }
  }

  return true;
}
```

**Run**: `npm test` → ✅ Still passes (refactoring successful!)

### TDD Benefits

**1. Better Design**: Tests force you to think about API before implementation
**2. Complete Coverage**: Every line of code has a test (by definition)
**3. Living Documentation**: Tests show how to use the code
**4. Fewer Bugs**: Bugs caught before implementation
**5. Refactoring Confidence**: Tests ensure behavior doesn't change

### When to Use TDD

✅ **Good for TDD**:
- Business logic (calculations, validation)
- Utility functions (pure functions)
- APIs (well-defined contracts)
- Bug fixes (write test that reproduces bug first)

❌ **Less suitable for TDD**:
- UI layout (visual design exploration)
- Prototypes (throwaway code)
- Glue code (simple library integration)
- Configuration files

---

## Behavior-Driven Development (BDD)

**BDD**: Extend TDD with natural language to describe behavior from user perspective.

### Given-When-Then Format

```gherkin
Feature: User Login

Scenario: Successful login with valid credentials
  Given a registered user with email "user@example.com"
  And the user's password is "SecurePass123"
  When the user submits the login form
  Then the user should be redirected to the dashboard
  And a session token should be stored
```

### BDD vs TDD

| Aspect | TDD | BDD |
|--------|-----|-----|
| **Focus** | Testing code | Describing behavior |
| **Language** | Technical | Natural (business-readable) |
| **Audience** | Developers | Developers + QA + Business |
| **Format** | Test functions | Given-When-Then scenarios |
| **Goal** | Prevent bugs | Shared understanding |

### BDD Example with Jest

```typescript
// tests/unit/services/auth.test.ts
describe('User Authentication', () => {
  describe('Login', () => {
    it('should redirect to dashboard when credentials are valid', async () => {
      // Given: User with valid credentials
      const email = 'user@example.com';
      const password = 'SecurePass123';
      await createUser(email, password);

      // When: User logs in
      const result = await authService.login(email, password);

      // Then: Redirect to dashboard with token
      expect(result.redirectUrl).toBe('/dashboard');
      expect(result.token).toBeDefined();
      expect(result.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format
    });

    it('should lock account after 5 failed attempts', async () => {
      // Given: User has failed 5 times
      const email = 'user@example.com';
      await createUser(email, 'password');
      await simulateFailedAttempts(email, 5);

      // When: 6th attempt is made
      const loginAttempt = () => authService.login(email, 'wrong');

      // Then: Account is locked
      await expect(loginAttempt()).rejects.toThrow('Account locked for 15 minutes');

      // And: Lockout timestamp is set
      const user = await getUser(email);
      expect(user.lockedUntil).toBeDefined();
      expect(user.lockedUntil.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
```

### BDD with Cucumber/Gherkin

**Feature file** (natural language):

```gherkin
# features/authentication.feature
Feature: User Authentication
  As a user
  I want to log in with my credentials
  So that I can access my account

  Background:
    Given the following users exist:
      | email              | password      | role  |
      | user@example.com   | SecurePass123 | user  |
      | admin@example.com  | AdminPass456  | admin |

  Scenario: Successful login with valid credentials
    When I navigate to the login page
    And I enter email "user@example.com"
    And I enter password "SecurePass123"
    And I click the "Login" button
    Then I should be redirected to "/dashboard"
    And I should see "Welcome back!"

  Scenario: Failed login with invalid password
    When I navigate to the login page
    And I enter email "user@example.com"
    And I enter password "WrongPassword"
    And I click the "Login" button
    Then I should see error "Invalid credentials"
    And I should remain on the login page

  Scenario Outline: Password validation
    When I enter password "<password>"
    Then validation should be "<result>"

    Examples:
      | password    | result  |
      | short       | Invalid |
      | NoNumbers1  | Invalid |
      | Abcd1234    | Valid   |
```

**Step definitions** (code):

```typescript
// features/steps/auth.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('the following users exist:', async function (dataTable) {
  for (const row of dataTable.hashes()) {
    await createUser(row.email, row.password, row.role);
  }
});

When('I navigate to the login page', async function () {
  await this.page.goto('/login');
});

When('I enter email {string}', async function (email: string) {
  await this.page.fill('[name="email"]', email);
});

When('I enter password {string}', async function (password: string) {
  await this.page.fill('[name="password"]', password);
});

When('I click the {string} button', async function (text: string) {
  await this.page.click(`button:has-text("${text}")`);
});

Then('I should be redirected to {string}', async function (path: string) {
  await expect(this.page.url()).to.include(path);
});

Then('I should see {string}', async function (text: string) {
  await expect(this.page.locator(`text=${text}`)).toBeVisible();
});
```

---

## Test Coverage

### What is Coverage?

**Coverage** measures which parts of your code are executed during tests.

### Coverage Types

```mermaid
graph LR
    A[Code Coverage] --> B[Line Coverage]
    A --> C[Branch Coverage]
    A --> D[Function Coverage]
    A --> E[Statement Coverage]

    style A fill:#e3f2fd
    style B fill:#fff9c4
    style C fill:#fff9c4
    style D fill:#fff9c4
    style E fill:#fff9c4
```

#### 1. Line Coverage

**What**: Percentage of lines executed

```typescript
function divide(a: number, b: number): number {
  if (b === 0) {           // Line 1
    throw new Error('Cannot divide by zero'); // Line 2
  }
  return a / b;            // Line 3
}

// Test:
test('divides two numbers', () => {
  expect(divide(10, 2)).toBe(5);
});

// Coverage: 66% (2/3 lines)
// ✅ Line 1 executed (b !== 0)
// ❌ Line 2 NOT executed (error not thrown)
// ✅ Line 3 executed (return statement)
```

#### 2. Branch Coverage

**What**: Percentage of if/else branches tested

```typescript
function getDiscount(total: number, isPremium: boolean): number {
  if (isPremium) {         // Branch 1: true
    return total * 0.2;    // 20% discount
  } else {                 // Branch 2: false
    return total * 0.1;    // 10% discount
  }
}

// Test 1: Only premium path
test('premium discount', () => {
  expect(getDiscount(100, true)).toBe(20);
});
// Branch coverage: 50% (1/2 branches)

// Test 2: Add regular path
test('regular discount', () => {
  expect(getDiscount(100, false)).toBe(10);
});
// Branch coverage: 100% (2/2 branches)
```

#### 3. Function Coverage

**What**: Percentage of functions called

```typescript
class UserService {
  register() { /* ... */ }    // Function 1
  login() { /* ... */ }        // Function 2
  logout() { /* ... */ }       // Function 3
  deleteAccount() { /* ... */ }// Function 4
}

// Tests only cover register and login
// Function coverage: 50% (2/4 functions)
```

### Coverage Reports

**Jest coverage report**:

```bash
npm test -- --coverage
```

**Output**:

```
---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
All files                  |   85.32 |    78.94 |   89.47 |   84.91 |
 services                  |   92.50 |    87.50 |  100.00 |   92.11 |
  auth.ts                  |   94.73 |    90.00 |  100.00 |   94.44 |
  users.ts                 |   88.88 |    83.33 |  100.00 |   88.46 |
 utils                     |   78.26 |    66.66 |   80.00 |   77.77 |
  validation.ts            |   80.00 |    75.00 |   85.71 |   79.41 |
  encryption.ts            |   75.00 |    50.00 |   66.66 |   75.00 |
---------------------------|---------|----------|---------|---------|
```

**HTML coverage report**:

```bash
npm test -- --coverage --coverageReporters=html
open coverage/index.html
```

Shows line-by-line coverage with colors:
- 🟢 Green: Covered
- 🔴 Red: Not covered
- 🟡 Yellow: Partially covered (branch)

### The 100% Coverage Myth

**Why 100% coverage is NOT the goal**:

#### Diminishing Returns

```mermaid
graph LR
    A[0% → 80%<br/>Easy] --> B[80% → 90%<br/>Moderate]
    B --> C[90% → 95%<br/>Hard]
    C --> D[95% → 100%<br/>Very Hard]

    style A fill:#c8e6c9
    style B fill:#fff9c4
    style C fill:#ffccbc
    style D fill:#ef9a9a
```

**Effort distribution**:
- 80% coverage: 20% of effort
- 90% coverage: 40% of effort
- 95% coverage: 70% of effort
- 100% coverage: 100% of effort (last 5% takes 30% of effort!)

#### Coverage ≠ Quality

```typescript
// 100% coverage, but terrible test quality
test('user service', () => {
  const service = new UserService();
  service.register('test@example.com', 'password'); // No assertions!
  service.login('test@example.com', 'password');    // No assertions!
  service.logout();                                 // No assertions!

  expect(true).toBe(true); // Meaningless assertion
});

// Coverage: 100%, but test tells us nothing!
```

#### Recommended Coverage Targets

| Code Type | Target | Rationale |
|-----------|--------|-----------|
| **Critical business logic** | 95%+ | Payment, authentication, data integrity |
| **Important features** | 85-90% | Core user workflows |
| **Utility functions** | 80-85% | Reusable helpers |
| **Glue code** | 60-70% | Simple integration, config |
| **Overall project** | 80%+ | Balanced quality/effort |

**SpecWeave approach**: 85-90% coverage for critical paths, 80%+ overall

---

## Testing Strategies by Application Type

### API Testing

**Goal**: Test REST/GraphQL endpoints with request/response validation

#### Complete API Test Suite

```typescript
describe('POST /api/users', () => {
  it('should create user with valid data', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'user@example.com',
        password: 'SecurePass123',
        name: 'John Doe'
      });

    // Assert status
    expect(response.status).toBe(201);

    // Assert response structure
    expect(response.body).toMatchObject({
      user: {
        id: expect.any(String),
        email: 'user@example.com',
        name: 'John Doe',
        createdAt: expect.any(String)
      }
    });

    // Assert password NOT returned
    expect(response.body.user.password).toBeUndefined();
  });

  it('should validate email format', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'invalid-email',
        password: 'SecurePass123'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid email format');
  });

  it('should enforce password strength', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'user@example.com',
        password: 'weak'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Password must be');
  });

  it('should reject duplicate email', async () => {
    // Create first user
    await request(app)
      .post('/api/users')
      .send({ email: 'user@example.com', password: 'Pass123' });

    // Try to create duplicate
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'user@example.com', password: 'Pass456' });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Email already exists');
  });

  it('should require authentication header', async () => {
    const response = await request(app)
      .get('/api/users/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Authentication required');
  });

  it('should return user with valid token', async () => {
    // Register and login to get token
    const { token } = await loginUser('user@example.com', 'Pass123');

    // Request with token
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe('user@example.com');
  });
});
```

### React Component Testing

**Goal**: Test component rendering, interactions, state management

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should render login form', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('should call onSubmit with form data', async () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    // Type email
    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');

    // Type password
    await userEvent.type(screen.getByLabelText('Password'), 'password123');

    // Click submit
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    // Assert onSubmit called with correct data
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123'
    });
  });

  it('should show validation errors', async () => {
    render(<LoginForm />);

    // Click submit without filling form
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    // Assert validation errors shown
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('should disable submit button while loading', async () => {
    const onSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    render(<LoginForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password');

    const submitButton = screen.getByRole('button', { name: 'Login' });
    await userEvent.click(submitButton);

    // Assert button disabled during submission
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show error message on failed login', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
```

### Database Testing

**Goal**: Test migrations, queries, constraints, performance

```typescript
describe('User Database Operations', () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(async () => {
    await db.truncate();
  });

  it('should enforce unique email constraint', async () => {
    await db.users.create({ email: 'user@example.com', password: 'hash' });

    // Try to create duplicate
    await expect(
      db.users.create({ email: 'user@example.com', password: 'hash2' })
    ).rejects.toThrow('duplicate key');
  });

  it('should cascade delete user sessions', async () => {
    // Create user with sessions
    const user = await db.users.create({ email: 'user@example.com' });
    await db.sessions.create({ userId: user.id, token: 'token1' });
    await db.sessions.create({ userId: user.id, token: 'token2' });

    // Delete user
    await db.users.delete(user.id);

    // Assert sessions also deleted
    const sessions = await db.sessions.findByUserId(user.id);
    expect(sessions).toHaveLength(0);
  });

  it('should index email for fast lookup', async () => {
    // Insert 10,000 users
    for (let i = 0; i < 10000; i++) {
      await db.users.create({ email: `user${i}@example.com` });
    }

    // Query should be fast (< 10ms with index)
    const start = Date.now();
    await db.users.findByEmail('user5000@example.com');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10);
  });
});
```

---

## Mocking and Stubbing

### When to Mock

**Mock external dependencies** to isolate unit under test:

```mermaid
graph TD
    A[Your Function] --> B{External Dependency?}
    B -->|Yes| C[Mock It]
    B -->|No| D[Test Real Code]

    C --> E[Examples:<br/>• API calls<br/>• Database<br/>• File system<br/>• Date.now<br/>• Random numbers]

    style A fill:#e3f2fd
    style C fill:#fff9c4
    style E fill:#f3e5f5
```

### Test Doubles Explained

```typescript
// 1. STUB: Pre-programmed responses (no verification)
const stubEmailService = {
  send: () => Promise.resolve(true)
};

// 2. MOCK: Verify interactions (what was called, with what args)
const mockEmailService = {
  send: jest.fn().mockResolvedValue(true)
};

// Later: assert it was called
expect(mockEmailService.send).toHaveBeenCalledWith({
  to: 'user@example.com',
  subject: 'Welcome'
});

// 3. SPY: Record calls to real object
const emailService = new EmailService();
const spy = jest.spyOn(emailService, 'send');

// 4. FAKE: Working implementation (lighter than real)
class FakeDatabase implements Database {
  private data = new Map();

  async save(key, value) {
    this.data.set(key, value);
  }

  async find(key) {
    return this.data.get(key);
  }
}
```

### Mocking Examples

#### Mock External API

```typescript
// Mock axios
import axios from 'axios';
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WeatherService', () => {
  it('should fetch weather data', async () => {
    // Setup mock response
    mockedAxios.get.mockResolvedValue({
      data: { temperature: 72, condition: 'sunny' }
    });

    const weatherService = new WeatherService();
    const weather = await weatherService.getCurrentWeather('San Francisco');

    // Assert API called correctly
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.weather.com/current',
      { params: { city: 'San Francisco' } }
    );

    // Assert result parsed correctly
    expect(weather).toEqual({ temperature: 72, condition: 'sunny' });
  });
});
```

#### Mock Database

```typescript
// Mock database for unit test
const mockUserRepo = {
  findByEmail: jest.fn(),
  save: jest.fn()
};

describe('AuthService', () => {
  it('should register new user', async () => {
    // Setup: User doesn't exist
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.save.mockResolvedValue({ id: '123', email: 'user@example.com' });

    const authService = new AuthService(mockUserRepo);
    const user = await authService.register('user@example.com', 'password');

    // Assert user created
    expect(user.id).toBe('123');

    // Assert save called with hashed password
    expect(mockUserRepo.save).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: expect.not.stringContaining('password') // Hashed
    });
  });
});
```

#### Mock Date

```typescript
describe('TokenService', () => {
  it('should set token expiry to 1 hour from now', () => {
    // Mock Date.now to return fixed timestamp
    jest.spyOn(Date, 'now').mockReturnValue(1000000000); // Jan 9, 1970

    const tokenService = new TokenService();
    const token = tokenService.generateToken('user123');

    // Assert expiry is 1 hour later
    expect(token.expiresAt).toBe(1000000000 + (60 * 60 * 1000));
  });
});
```

---

## Test Data Management

### Fixtures

**Create reusable test data**:

```typescript
// tests/fixtures/users.ts
export const mockUsers = {
  regularUser: {
    id: 'user-001',
    email: 'user@example.com',
    password: 'hashed_password_123',
    role: 'user',
    createdAt: new Date('2024-01-01')
  },

  adminUser: {
    id: 'admin-001',
    email: 'admin@example.com',
    password: 'hashed_admin_password',
    role: 'admin',
    createdAt: new Date('2024-01-01')
  },

  premiumUser: {
    id: 'premium-001',
    email: 'premium@example.com',
    password: 'hashed_premium_password',
    role: 'user',
    isPremium: true,
    createdAt: new Date('2024-01-01')
  }
};

// Use in tests
import { mockUsers } from './fixtures/users';

test('premium user gets free shipping', () => {
  const shipping = calculateShipping(mockUsers.premiumUser);
  expect(shipping).toBe(0);
});
```

### Factory Pattern

**Generate test data dynamically**:

```typescript
// tests/factories/user.factory.ts
import { faker } from '@faker-js/faker';

export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    return {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      name: faker.name.fullName(),
      password: faker.internet.password(),
      createdAt: faker.date.past(),
      ...overrides // Override defaults
    };
  }

  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

// Use in tests
import { UserFactory } from './factories/user.factory';

test('should list all users', async () => {
  // Create 10 test users
  const users = UserFactory.createMany(10);
  await db.users.insertMany(users);

  const result = await userService.listUsers();

  expect(result).toHaveLength(10);
});

test('should find premium users', async () => {
  // Create mix of regular and premium users
  await db.users.insertMany([
    ...UserFactory.createMany(5, { isPremium: false }),
    ...UserFactory.createMany(3, { isPremium: true })
  ]);

  const premiumUsers = await userService.findPremiumUsers();

  expect(premiumUsers).toHaveLength(3);
});
```

---

## CI/CD Integration

### Test Pipeline

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as Git Repo
    participant CI as CI/CD
    participant Tests as Test Suite
    participant Deploy as Deployment

    Dev->>Git: Push code
    Git->>CI: Trigger pipeline
    CI->>Tests: 1. Run linter
    Tests-->>CI: ✅ Pass
    CI->>Tests: 2. Run unit tests
    Tests-->>CI: ✅ Pass
    CI->>Tests: 3. Run integration tests
    Tests-->>CI: ✅ Pass
    CI->>Tests: 4. Run E2E smoke tests
    Tests-->>CI: ✅ Pass
    CI->>Deploy: Deploy to staging
    Deploy->>Tests: 5. Run full E2E suite
    Tests-->>Deploy: ✅ Pass
    Deploy->>Deploy: Deploy to production
```

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            coverage/
            test-results/
            playwright-report/
```

### Quality Gates

**Require tests to pass before merging**:

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    branches: [main]

jobs:
  quality-gate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm test -- --coverage --coverageReporters=json-summary

      - name: Check coverage threshold
        run: |
          COVERAGE=$(node -pe "require('./coverage/coverage-summary.json').total.lines.pct")
          echo "Coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "❌ Coverage below 80%"
            exit 1
          fi
          echo "✅ Coverage above 80%"

      - name: Require all tests passing
        run: npm test -- --passWithNoTests false
```

---

## Performance Testing

### Load Testing with k6

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users
    { duration: '3m', target: 10 },   // Stay at 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)&lt;500'], // 95% of requests must complete in 500ms
    http_req_failed: ['rate&lt;0.01'],   // Error rate < 1%
  },
};

export default function () {
  // Test login endpoint
  let loginResponse = http.post('https://api.example.com/auth/login', {
    email: 'test@example.com',
    password: 'password123',
  });

  check(loginResponse, {
    'login succeeded': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test API with auth token
  let token = loginResponse.json('token');
  let apiResponse = http.get('https://api.example.com/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(apiResponse, {
    'API request succeeded': (r) => r.status === 200,
  });

  sleep(1);
}
```

**Run load test**:

```bash
k6 run load-test.js

# Output:
#   ✓ login succeeded
#   ✓ response time < 500ms
#   ✓ API request succeeded
#
# http_req_duration..............: avg=245ms min=120ms med=230ms max=480ms p(95)=450ms
# http_req_failed................: 0.23% ✓ 5 ✗ 2145
```

### Benchmarking

```typescript
// Benchmark password hashing
import bcrypt from 'bcrypt';

async function benchmark() {
  const password = 'SecurePassword123';
  const rounds = [8, 10, 12, 14];

  for (const round of rounds) {
    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      await bcrypt.hash(password, round);
    }

    const duration = performance.now() - start;
    const avgTime = duration / 100;

    console.log(`Rounds: ${round}, Avg time: ${avgTime.toFixed(2)}ms`);
  }
}

// Output:
// Rounds: 8, Avg time: 45.32ms
// Rounds: 10, Avg time: 95.45ms  ← Good balance
// Rounds: 12, Avg time: 215.67ms
// Rounds: 14, Avg time: 512.89ms ← Too slow
```

---

## Accessibility Testing

### Manual Accessibility Checklist

✅ **Keyboard Navigation**:
- Tab through all interactive elements
- Enter/Space activate buttons
- Escape closes dialogs
- Arrow keys navigate lists/menus

✅ **Screen Reader**:
- Install NVDA (Windows) or VoiceOver (Mac)
- Navigate page with screen reader only
- All content must be announced correctly
- Form labels must be associated with inputs

✅ **Color Contrast**:
- Text: Minimum 4.5:1 contrast ratio
- Large text (18pt+): Minimum 3:1 contrast ratio
- Use browser DevTools to check contrast

✅ **Focus Management**:
- Focus visible (outline around focused element)
- Focus moves logically (top to bottom, left to right)
- Focus returns to trigger after modal closes

### Automated Accessibility Testing

```typescript
// tests/a11y/login.test.ts
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LoginForm } from './LoginForm';

expect.extend(toHaveNoViolations);

describe('LoginForm Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<LoginForm />);

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('should have proper labels', () => {
    const { getByLabelText } = render(<LoginForm />);

    // Labels must be associated with inputs
    expect(getByLabelText('Email')).toBeInTheDocument();
    expect(getByLabelText('Password')).toBeInTheDocument();
  });

  it('should have proper ARIA roles', () => {
    const { getByRole } = render(<LoginForm />);

    expect(getByRole('form')).toBeInTheDocument();
    expect(getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });
});
```

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build app
        run: npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/login
            http://localhost:3000/dashboard
          uploadArtifacts: true
```

---

## Visual Regression Testing

### How Visual Regression Works

```mermaid
graph LR
    A[Baseline<br/>Screenshot] --> B[Code Change]
    B --> C[New<br/>Screenshot]
    C --> D{Compare<br/>Pixel by Pixel}
    D -->|Match| E[✅ Pass]
    D -->|Differ| F[⚠️ Review Changes]
    F --> G{Intentional?}
    G -->|Yes| H[Update Baseline]
    G -->|No| I[Fix Bug]

    style E fill:#c8e6c9
    style F fill:#fff9c4
    style I fill:#ef9a9a
```

### Playwright Visual Testing

```typescript
// tests/visual/homepage.spec.ts
import { test, expect } from '@playwright/test';

test('homepage matches baseline', async ({ page }) => {
  await page.goto('/');

  // Wait for page to fully load
  await page.waitForLoadState('networkidle');

  // Take screenshot and compare to baseline
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixels: 100 // Allow up to 100 pixels difference
  });
});

test('login form matches baseline', async ({ page }) => {
  await page.goto('/login');

  // Screenshot specific element
  const loginForm = page.locator('form[aria-label="Login"]');
  await expect(loginForm).toHaveScreenshot('login-form.png');
});

test('responsive design at different viewports', async ({ page }) => {
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1920, height: 1080, name: 'desktop' }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`);
  }
});
```

**First run**: Creates baseline screenshots
**Subsequent runs**: Compares against baseline
**If different**: Shows diff image for review

---

## How SpecWeave Enforces Testing

### Test-Aware Planning (v0.7.0+)

**SpecWeave embeds tests directly in tasks**:

```markdown
---
increment: 0008-user-authentication
total_tasks: 5
test_mode: TDD
coverage_target: 85%
---

# Tasks for Increment 0008: User Authentication

## T-001: Implement Authentication Service

**AC**: AC-US1-01, AC-US1-02 (User can log in with valid credentials)

**Test Plan** (BDD format):
- **Given** user with valid email and password → **When** login → **Then** receive JWT token + update lastLoginAt timestamp
- **Given** user with invalid password → **When** login → **Then** throw "Invalid credentials" error
- **Given** user with 5 failed attempts → **When** 6th attempt → **Then** lock account for 15 minutes

**Test Cases**:
- Unit (`auth.test.ts`): validLogin, invalidPassword, nonexistentUser, accountLocking, tokenGeneration → 90% coverage
- Integration (`auth-flow.test.ts`): loginEndpoint, sessionPersistence, rateLimiting → 85% coverage
- **Overall: 87% coverage**

**Implementation**: AuthService.ts, password hashing (bcrypt), JWT generation, rate limiting (Redis)

**Dependencies**: None
```

### Quality Gates

**`/specweave:validate` command checks**:
- ✅ All AC-IDs from spec.md covered in tasks.md
- ✅ Test plans exist for each task
- ✅ Coverage targets met (80-90%)
- ✅ BDD format used (Given/When/Then)

**`/specweave:check-tests` command validates**:
- ✅ Test files exist (unit, integration, E2E)
- ✅ Tests reference AC-IDs
- ✅ Coverage reports meet targets

**`/specweave:done` requires**:
- ✅ All tests passing
- ✅ Coverage targets met
- ✅ No failing validation

---

## Best Practices Summary

### 15 Testing Best Practices

1. **Write Tests First (TDD)**: Design through tests
2. **Test Behavior, Not Implementation**: Don't test private methods
3. **Use Descriptive Test Names**: `should [expected] when [condition]`
4. **One Assertion per Test**: Focus on single outcome (when possible)
5. **Avoid Test Interdependence**: Each test should be independent
6. **Use Factories/Fixtures**: Reusable, consistent test data
7. **Mock External Dependencies**: Isolate unit under test
8. **Test Edge Cases**: Empty, null, boundary values, errors
9. **Keep Tests Fast**: Unit tests < 100ms, full suite < 5 minutes
10. **Run Tests in CI/CD**: Automated, every commit
11. **Review Test Code**: Same standards as production code
12. **Delete Obsolete Tests**: Remove tests for removed features
13. **Coverage as Guide**: 80%+ overall, not 100% obsession
14. **Test Error Cases**: Not just happy path
15. **Maintain Test Data**: Keep fixtures updated

---

## Common Pitfalls to Avoid

### 10 Testing Mistakes

1. **Testing Implementation Details**
   ```typescript
   // ❌ Bad: Tests internal method
   expect(authService['hashPassword']('pass')).toBeDefined();

   // ✅ Good: Tests public behavior
   const user = await authService.register('user@example.com', 'pass');
   expect(user.password).not.toBe('pass');
   ```

2. **Brittle Tests (Too Many Mocks)**
   ```typescript
   // ❌ Bad: Mocking everything
   jest.mock('./userService');
   jest.mock('./emailService');
   jest.mock('./logService');
   jest.mock('./analyticsService');

   // ✅ Good: Mock only external dependencies
   jest.mock('./emailService'); // External API
   // Test real userService, logService, analyticsService
   ```

3. **Slow Test Suites**
   - ❌ Running E2E tests for every commit (too slow)
   - ✅ Run E2E on PR only, unit tests on every commit

4. **Flaky Tests**
   - ❌ Tests that randomly fail (timing issues, race conditions)
   - ✅ Use explicit waits, deterministic test data

5. **100% Coverage Obsession**
   - ❌ Wasting time testing trivial code
   - ✅ Focus on 80%+ overall, 95%+ critical paths

6. **No E2E Tests**
   - ❌ Only unit tests (miss integration bugs)
   - ✅ Follow testing pyramid (70% unit, 20% integration, 10% E2E)

7. **Too Many E2E Tests (Ice Cream Cone)**
   - ❌ 100 E2E tests (slow, brittle)
   - ✅ 5-10 E2E tests for critical paths

8. **Hardcoded Test Data**
   - ❌ `const userId = '12345'` (fragile)
   - ✅ Use factories: `const user = UserFactory.create()`

9. **Skipping Edge Cases**
   - ❌ Only testing happy path
   - ✅ Test empty, null, boundary values, errors

10. **Not Running Tests Locally**
    - ❌ Relying on CI to catch failures
    - ✅ Run tests before committing: `npm test`

---

## Real-World Example: E-Commerce Checkout

Let's apply all testing concepts to a real-world feature.

### Complete Testing Strategy

```mermaid
graph TD
    A[Checkout Feature] --> B[Unit Tests<br/>30 tests]
    A --> C[Integration Tests<br/>15 tests]
    A --> D[E2E Tests<br/>5 tests]

    B --> B1[Cart calculations<br/>Price, tax, discount]
    B --> B2[Inventory checks<br/>Stock validation]
    B --> B3[Payment validation<br/>Card format]

    C --> C1[API + DB<br/>Order creation]
    C --> C2[Payment gateway<br/>Stripe integration]
    C --> C3[Email service<br/>Order confirmation]

    D --> D1[Happy path<br/>Complete checkout]
    D --> D2[Error path<br/>Payment failure]
    D --> D3[Edge cases<br/>Sold out, expired cart]
```

### Unit Tests (30 tests)

```typescript
// tests/unit/cart/calculations.test.ts
describe('Cart Calculations', () => {
  describe('calculateSubtotal', () => {
    it('should sum item prices', () => {
      const items = [
        { price: 100, quantity: 2 },
        { price: 50, quantity: 1 }
      ];

      expect(calculateSubtotal(items)).toBe(250);
    });

    it('should handle empty cart', () => {
      expect(calculateSubtotal([])).toBe(0);
    });
  });

  describe('calculateTax', () => {
    it('should apply 10% tax', () => {
      expect(calculateTax(100, 0.1)).toBe(10);
    });

    it('should round to 2 decimals', () => {
      expect(calculateTax(33.33, 0.1)).toBe(3.33);
    });
  });

  describe('applyDiscount', () => {
    it('should apply percentage discount', () => {
      expect(applyDiscount(100, { type: 'percentage', value: 20 })).toBe(80);
    });

    it('should apply fixed discount', () => {
      expect(applyDiscount(100, { type: 'fixed', value: 15 })).toBe(85);
    });

    it('should not exceed 100% discount', () => {
      expect(applyDiscount(100, { type: 'percentage', value: 120 })).toBe(0);
    });
  });
});

// tests/unit/inventory/stock.test.ts
describe('Inventory Checks', () => {
  it('should validate sufficient stock', () => {
    const product = { stock: 10 };

    expect(hasStock(product, 5)).toBe(true);
  });

  it('should reject insufficient stock', () => {
    const product = { stock: 2 };

    expect(hasStock(product, 5)).toBe(false);
  });
});

// tests/unit/payment/validation.test.ts
describe('Payment Validation', () => {
  it('should validate Visa card format', () => {
    expect(validateCardNumber('4242424242424242')).toBe(true);
  });

  it('should reject invalid card number', () => {
    expect(validateCardNumber('1234')).toBe(false);
  });

  it('should validate expiry date', () => {
    expect(validateExpiry('12/25')).toBe(true);
  });

  it('should reject past expiry', () => {
    expect(validateExpiry('01/20')).toBe(false);
  });
});
```

### Integration Tests (15 tests)

```typescript
// tests/integration/checkout.test.ts
describe('Checkout API Integration', () => {
  it('should create order and reduce inventory', async () => {
    // Setup: Product with stock
    await db.products.create({ id: 'laptop', stock: 10 });

    // Act: Create order
    const response = await request(app)
      .post('/api/checkout')
      .send({
        items: [{ productId: 'laptop', quantity: 2 }],
        paymentMethod: { /* ... */ }
      });

    // Assert: Order created
    expect(response.status).toBe(201);
    expect(response.body.orderId).toBeDefined();

    // Assert: Inventory reduced
    const product = await db.products.findById('laptop');
    expect(product.stock).toBe(8);
  });

  it('should process payment via Stripe', async () => {
    // Setup: Mock Stripe API
    nock('https://api.stripe.com')
      .post('/v1/charges')
      .reply(200, { id: 'ch_123', status: 'succeeded' });

    // Act: Checkout with payment
    const response = await request(app)
      .post('/api/checkout')
      .send({
        items: [{ productId: 'laptop', quantity: 1 }],
        paymentMethod: {
          cardNumber: '4242424242424242',
          expiry: '12/25',
          cvc: '123'
        }
      });

    // Assert: Payment successful
    expect(response.status).toBe(201);
    expect(response.body.payment.status).toBe('succeeded');
  });

  it('should send order confirmation email', async () => {
    // Setup: Mock email service
    const emailSpy = jest.spyOn(emailService, 'send');

    // Act: Complete checkout
    await request(app)
      .post('/api/checkout')
      .send({ /* ... */ });

    // Assert: Email sent
    expect(emailSpy).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Order Confirmation',
      body: expect.stringContaining('Order #')
    });
  });
});
```

### E2E Tests (5 tests)

```typescript
// tests/e2e/checkout.spec.ts
test('User can complete full checkout', async ({ page }) => {
  // Login
  await loginUser(page, 'test@example.com', 'password');

  // Add product to cart
  await page.goto('/products');
  await page.click('[data-product="laptop"]');
  await page.click('button:has-text("Add to Cart")');

  // Go to cart
  await page.goto('/cart');
  await expect(page.locator('.cart-item')).toHaveCount(1);

  // Proceed to checkout
  await page.click('button:has-text("Checkout")');

  // Fill payment details
  await page.fill('[name="cardNumber"]', '4242424242424242');
  await page.fill('[name="expiry"]', '12/25');
  await page.fill('[name="cvc"]', '123');

  // Submit order
  await page.click('button:has-text("Place Order")');

  // Verify success
  await expect(page.locator('h1')).toHaveText('Order Confirmed!');
  await expect(page.locator('.order-number')).toBeVisible();
});

test('Should handle payment failure gracefully', async ({ page }) => {
  await loginAndAddToCart(page);

  // Use Stripe test card that fails
  await page.goto('/checkout');
  await page.fill('[name="cardNumber"]', '4000000000000002');
  await page.fill('[name="expiry"]', '12/25');
  await page.fill('[name="cvc"]', '123');

  await page.click('button:has-text("Place Order")');

  // Verify error shown
  await expect(page.locator('.error')).toHaveText('Payment failed');

  // Verify cart unchanged
  await page.goto('/cart');
  await expect(page.locator('.cart-item')).toHaveCount(1);
});
```

### Coverage Results

```
---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
All files                  |   87.45 |    82.33 |   91.67 |   87.12 |
 cart/                     |   92.50 |    88.88 |  100.00 |   92.30 |
  calculations.ts          |   95.00 |    90.00 |  100.00 |   94.73 |
  validation.ts            |   88.88 |    87.50 |  100.00 |   88.88 |
 inventory/                |   85.71 |    80.00 |   88.88 |   85.18 |
  stock-checker.ts         |   87.50 |    83.33 |   90.00 |   87.09 |
 payment/                  |   90.00 |    85.71 |   92.85 |   89.47 |
  stripe-integration.ts    |   92.30 |    88.88 |   93.75 |   91.66 |
  validation.ts            |   87.50 |    81.81 |   91.66 |   87.09 |
---------------------------|---------|----------|---------|---------|
```

✅ **Overall coverage: 87.45%** (above 80% target)
✅ **Critical paths: 90%+** (payment, cart calculations)
✅ **All E2E tests passing**

---

## Next Steps

### Learn More

- **[TDD Guide](/docs/glossary/terms/tdd)** - Test-Driven Development in depth
- **[BDD Guide](/docs/glossary/terms/bdd)** - Behavior-Driven Development
- **[Unit Testing](/docs/glossary/terms/unit-testing)** - Testing individual functions
- **[Integration Testing](/docs/glossary/terms/integration-testing)** - Testing component interactions
- **[E2E Testing](/docs/glossary/terms/e2e)** - Testing complete user flows
- **[Test Pyramid](/docs/glossary/terms/test-pyramid)** - Optimal test distribution
- **[Test Coverage](/docs/glossary/terms/test-coverage)** - Measuring what's tested

### SpecWeave Testing Resources

- **Test-Aware Planning**: v0.7.0+ embeds tests in tasks.md
- **BDD Format**: Given/When/Then for test plans
- **AC-ID Traceability**: spec.md → tasks.md → tests
- **Coverage Targets**: 80-90% per task, validated via `/specweave:check-tests`
- **Quality Gates**: `/specweave:validate`, `/specweave:done` enforce testing

### Testing Tools

**Unit/Integration**:
- **Jest**: JavaScript/TypeScript testing framework
- **Vitest**: Modern Jest alternative (faster)
- **Mocha + Chai**: Flexible test framework

**E2E**:
- **Playwright**: Modern E2E framework (SpecWeave recommended)
- **Cypress**: Alternative E2E framework

**BDD**:
- **Cucumber**: Gherkin syntax, step definitions
- **Jest-Cucumber**: BDD for Jest

**Mocking**:
- **Jest mocks**: Built-in mocking
- **MSW (Mock Service Worker)**: API mocking
- **Nock**: HTTP request mocking

**Coverage**:
- **Istanbul (c8)**: Code coverage tool
- **Codecov**: Coverage reporting service

---

## Summary

**Key Takeaways**:

1. **Testing Saves Money**: Bugs cost 10x-1000x more in production
2. **Follow the Pyramid**: 70% unit, 20% integration, 10% E2E
3. **TDD Improves Design**: Write tests first, better code follows
4. **BDD Enables Collaboration**: Given-When-Then bridges technical and business
5. **80% Coverage is Enough**: Focus on critical paths, not 100%
6. **Mock External Dependencies**: Isolate units for fast, reliable tests
7. **E2E Tests are Expensive**: Test critical paths only
8. **Run Tests in CI/CD**: Automate, every commit
9. **Test Behavior, Not Implementation**: Focus on outcomes
10. **SpecWeave Enforces Testing**: Embedded in tasks.md, validated at every step

**Testing is not optional**—it's how you build confidence, prevent bugs, and ship quality software.
