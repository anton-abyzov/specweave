# QA Engineer Agent - Test Strategies

Comprehensive guide to testing strategies for different application types and scenarios.

## Table of Contents

1. [Testing Pyramid Strategy](#testing-pyramid-strategy)
2. [Testing Trophy Strategy](#testing-trophy-strategy)
3. [TDD Red-Green-Refactor](#tdd-red-green-refactor)
4. [BDD Given-When-Then](#bdd-given-when-then)
5. [API Testing Strategy](#api-testing-strategy)
6. [Frontend Testing Strategy](#frontend-testing-strategy)
7. [Micro-Services Testing Strategy](#micro-services-testing-strategy)
8. [Performance Testing Strategy](#performance-testing-strategy)
9. [Security Testing Strategy](#security-testing-strategy)
10. [Accessibility Testing Strategy](#accessibility-testing-strategy)

---

## Testing Pyramid Strategy

### Overview

The Testing Pyramid emphasizes a broad base of fast, cheap unit tests, fewer integration tests, and minimal UI/E2E tests.

```
        /\
       /  \  E2E (10%)
      /----\
     /      \ Integration (20%)
    /--------\
   /          \ Unit (70%)
  /--------------\
```

### Distribution

- **Unit Tests (70%)**: Test individual functions, classes, components in isolation
- **Integration Tests (20%)**: Test interactions between modules, APIs, databases
- **E2E Tests (10%)**: Test complete user journeys through the UI

### When to Use

- Traditional applications with clear layers
- Backend services with business logic
- Applications where unit tests provide high confidence
- Teams prioritizing fast feedback loops

### Implementation Example

**Unit Test (70% of suite)**:
```typescript
// src/utils/cart.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTotal, applyDiscount } from './cart';

describe('Cart Utils', () => {
  describe('calculateTotal', () => {
    it('should sum item prices', () => {
      const items = [
        { id: 1, price: 10 },
        { id: 2, price: 20 },
      ];

      expect(calculateTotal(items)).toBe(30);
    });

    it('should return 0 for empty cart', () => {
      expect(calculateTotal([])).toBe(0);
    });

    it('should handle decimal prices', () => {
      const items = [
        { id: 1, price: 10.99 },
        { id: 2, price: 20.50 },
      ];

      expect(calculateTotal(items)).toBeCloseTo(31.49, 2);
    });
  });

  describe('applyDiscount', () => {
    it('should apply percentage discount', () => {
      expect(applyDiscount(100, 'SAVE20', { type: 'percentage', value: 20 })).toBe(80);
    });

    it('should apply fixed discount', () => {
      expect(applyDiscount(100, 'SAVE10', { type: 'fixed', value: 10 })).toBe(90);
    });

    it('should not go below zero', () => {
      expect(applyDiscount(50, 'SAVE100', { type: 'fixed', value: 100 })).toBe(0);
    });
  });
});
```

**Integration Test (20% of suite)**:
```typescript
// src/api/orders.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestServer } from '../test-utils/server';
import { seedDatabase, clearDatabase } from '../test-utils/database';

describe('Orders API Integration', () => {
  let server: TestServer;

  beforeEach(async () => {
    server = await createTestServer();
    await seedDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
    await server.close();
  });

  it('should create order and store in database', async () => {
    const response = await server.request
      .post('/api/orders')
      .send({
        userId: 'user-123',
        items: [{ productId: 'prod-1', quantity: 2 }],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: expect.any(String),
      userId: 'user-123',
      status: 'pending',
    });

    // Verify database persistence
    const order = await server.db.orders.findById(response.body.id);
    expect(order).toBeTruthy();
    expect(order.items).toHaveLength(1);
  });

  it('should send confirmation email on order creation', async () => {
    const emailSpy = vi.spyOn(server.emailService, 'send');

    await server.request
      .post('/api/orders')
      .send({
        userId: 'user-123',
        items: [{ productId: 'prod-1', quantity: 1 }],
      });

    expect(emailSpy).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Order Confirmation',
      template: 'order-confirmation',
    });
  });
});
```

**E2E Test (10% of suite)**:
```typescript
// e2e/checkout-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('should complete purchase as guest user', async ({ page }) => {
    // Navigate to product
    await page.goto('/products/laptop-123');
    await expect(page.getByRole('heading', { name: 'Gaming Laptop' })).toBeVisible();

    // Add to cart
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByText('Item added to cart')).toBeVisible();

    // Go to checkout
    await page.getByRole('link', { name: 'Cart (1)' }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();

    // Fill shipping info
    await page.getByLabel('Email').fill('guest@example.com');
    await page.getByLabel('Full Name').fill('John Doe');
    await page.getByLabel('Address').fill('123 Main St');
    await page.getByLabel('City').fill('New York');
    await page.getByLabel('Zip Code').fill('10001');

    // Fill payment info (test mode)
    await page.getByLabel('Card Number').fill('4242424242424242');
    await page.getByLabel('Expiry Date').fill('12/25');
    await page.getByLabel('CVC').fill('123');

    // Submit order
    await page.getByRole('button', { name: 'Place Order' }).click();

    // Verify confirmation
    await expect(page).toHaveURL(/\/order-confirmation/);
    await expect(page.getByText('Order Confirmed!')).toBeVisible();
    await expect(page.getByText(/Order #/)).toBeVisible();
  });
});
```

### Coverage Targets

- **Unit Tests**: 80%+ line coverage, 75%+ branch coverage
- **Integration Tests**: 100% critical API endpoints
- **E2E Tests**: 100% critical user journeys

---

## Testing Trophy Strategy

### Overview

Modern approach that emphasizes integration tests over unit tests, with static analysis as the foundation.

```
        /\
       /  \  E2E (5%)
      /----\
     /      \ Integration (50%)
    /--------\
   /          \ Unit (25%)
  /--------------\
 /                \ Static (20%)
/------------------\
```

### Distribution

- **Static Analysis (20%)**: TypeScript, ESLint, Prettier
- **Unit Tests (25%)**: Pure functions, utilities, critical logic
- **Integration Tests (50%)**: Components with dependencies, API contracts
- **E2E Tests (5%)**: Critical business flows only

### When to Use

- Modern frontend applications (React, Vue, Angular)
- Applications with complex component interactions
- Teams using TypeScript and static analysis tools
- Applications where integration tests catch more bugs

### Implementation Example

**Static Analysis (20%)**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "react-hooks/exhaustive-deps": "error"
  }
}
```

**Unit Tests (25%)**:
```typescript
// src/utils/formatters.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate } from './formatters';

describe('Formatters (Pure Functions)', () => {
  describe('formatCurrency', () => {
    it('should format USD currency', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-100, 'USD')).toBe('-$100.00');
    });
  });

  describe('formatDate', () => {
    it('should format ISO date', () => {
      const date = new Date('2025-01-15');
      expect(formatDate(date, 'short')).toBe('1/15/2025');
    });
  });
});
```

**Integration Tests (50%)**:
```typescript
// src/components/UserProfile.integration.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { UserProfile } from './UserProfile';

const server = setupServer(
  rest.get('/api/users/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.id,
        name: 'John Doe',
        email: 'john@example.com',
      })
    );
  }),

  rest.put('/api/users/:id', (req, res, ctx) => {
    return res(ctx.json({ ...req.body, updatedAt: Date.now() }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserProfile Integration', () => {
  it('should load and display user data', async () => {
    render(<UserProfile userId="123" />);

    // Loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should update user profile on form submit', async () => {
    const user = userEvent.setup();
    render(<UserProfile userId="123" />);

    // Wait for initial load
    await screen.findByText('John Doe');

    // Edit name
    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Smith');

    // Submit form
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
    });

    // Verify updated name
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    server.use(
      rest.get('/api/users/:id', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
      })
    );

    render(<UserProfile userId="123" />);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to load user/i)).toBeInTheDocument();
    });
  });
});
```

**E2E Tests (5%)**:
```typescript
// e2e/critical-path.spec.ts
import { test, expect } from '@playwright/test';

test('critical user journey: signup to first purchase', async ({ page }) => {
  // Only test the MOST critical path
  await page.goto('/');

  // Signup
  await page.getByRole('link', { name: 'Sign Up' }).click();
  await page.getByLabel('Email').fill('newuser@example.com');
  await page.getByLabel('Password').fill('SecurePass123!');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Verify logged in
  await expect(page.getByText('Welcome, New User')).toBeVisible();

  // Make purchase
  await page.goto('/products/best-seller');
  await page.getByRole('button', { name: 'Buy Now' }).click();
  await page.getByLabel('Card Number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Complete Purchase' }).click();

  // Verify success
  await expect(page.getByText('Purchase Successful')).toBeVisible();
});
```

### Coverage Targets

- **Static Analysis**: 100% (TypeScript strict mode, zero ESLint errors)
- **Unit Tests**: 90%+ for pure functions and utilities
- **Integration Tests**: 80%+ for components with dependencies
- **E2E Tests**: 100% critical paths only

---

## TDD Red-Green-Refactor

### The Cycle

1. **RED**: Write a failing test that defines expected behavior
2. **GREEN**: Write minimal code to make the test pass
3. **REFACTOR**: Improve code quality while keeping tests green

### Example: Shopping Cart Feature

**RED: Write Failing Test**:
```typescript
// src/cart/ShoppingCart.test.ts
import { describe, it, expect } from 'vitest';
import { ShoppingCart } from './ShoppingCart';

describe('ShoppingCart', () => {
  it('should add item to cart', () => {
    const cart = new ShoppingCart();

    cart.addItem({ id: 1, name: 'Laptop', price: 1000 });

    expect(cart.getItemCount()).toBe(1);
  });
});
```

**Run test**: ❌ FAIL (ShoppingCart doesn't exist)

**GREEN: Minimal Implementation**:
```typescript
// src/cart/ShoppingCart.ts
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

**Run test**: ✅ PASS

**Add Another Test (Triangulation)**:
```typescript
it('should calculate total price', () => {
  const cart = new ShoppingCart();

  cart.addItem({ id: 1, name: 'Laptop', price: 1000 });
  cart.addItem({ id: 2, name: 'Mouse', price: 50 });

  expect(cart.getTotal()).toBe(1050);
});
```

**Run test**: ❌ FAIL (getTotal doesn't exist)

**GREEN: Implement getTotal**:
```typescript
export class ShoppingCart {
  // ... previous code ...

  getTotal(): number {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }
}
```

**Run test**: ✅ PASS

**REFACTOR: Improve Design**:
```typescript
export class ShoppingCart {
  private items: Map<number, CartItem> = new Map();

  addItem(item: CartItem): void {
    const existing = this.items.get(item.id);
    if (existing) {
      // Increment quantity instead of duplicating
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      this.items.set(item.id, { ...item, quantity: 1 });
    }
  }

  getItemCount(): number {
    return Array.from(this.items.values()).reduce(
      (count, item) => count + (item.quantity || 1),
      0
    );
  }

  getTotal(): number {
    return Array.from(this.items.values()).reduce(
      (sum, item) => sum + item.price * (item.quantity || 1),
      0
    );
  }
}
```

**Run tests**: ✅ ALL PASS (refactoring didn't break anything!)

### TDD Benefits

- Forces modular, testable design
- Prevents over-engineering
- Living documentation
- Fearless refactoring
- Faster debugging

---

## API Testing Strategy

### Layers

1. **Unit Tests**: Test business logic in isolation
2. **Integration Tests**: Test API endpoints with real database
3. **Contract Tests**: Test API contracts (Pact)
4. **E2E Tests**: Test complete API flows

### Example: REST API Testing

**Unit Test (Business Logic)**:
```typescript
// src/services/OrderService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { OrderService } from './OrderService';

describe('OrderService', () => {
  it('should calculate order total with tax', () => {
    const mockRepo = {
      save: vi.fn(),
      findById: vi.fn(),
    };

    const service = new OrderService(mockRepo);

    const order = service.calculateTotal({
      items: [{ price: 100, quantity: 2 }],
      taxRate: 0.08,
    });

    expect(order.subtotal).toBe(200);
    expect(order.tax).toBeCloseTo(16, 2);
    expect(order.total).toBeCloseTo(216, 2);
  });
});
```

**Integration Test (API + Database)**:
```typescript
// tests/integration/orders.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { createTestApp } from '../utils/test-app';

describe('Orders API', () => {
  let app;
  let request;

  beforeAll(async () => {
    app = await createTestApp();
    request = supertest(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/orders should create order', async () => {
    const response = await request
      .post('/api/orders')
      .send({
        userId: 'user-123',
        items: [
          { productId: 'prod-1', quantity: 2, price: 50 },
        ],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      userId: 'user-123',
      status: 'pending',
      total: 100,
    });

    // Verify database persistence
    const order = await app.db.orders.findById(response.body.id);
    expect(order).toBeTruthy();
  });

  it('GET /api/orders/:id should return order', async () => {
    // Create order first
    const createResponse = await request
      .post('/api/orders')
      .send({ userId: 'user-123', items: [] });

    const orderId = createResponse.body.id;

    // Fetch order
    const response = await request
      .get(`/api/orders/${orderId}`)
      .expect(200);

    expect(response.body.id).toBe(orderId);
  });

  it('PUT /api/orders/:id/status should update status', async () => {
    const createResponse = await request
      .post('/api/orders')
      .send({ userId: 'user-123', items: [] });

    const orderId = createResponse.body.id;

    const response = await request
      .put(`/api/orders/${orderId}/status`)
      .send({ status: 'shipped' })
      .expect(200);

    expect(response.body.status).toBe('shipped');
  });
});
```

**Contract Test (Pact)**:
```typescript
// tests/contract/orders-consumer.test.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { OrdersClient } from '@/api/orders-client';

const provider = new PactV3({
  consumer: 'OrdersConsumer',
  provider: 'OrdersAPI',
});

describe('Orders API Contract', () => {
  it('should get order by ID', async () => {
    await provider
      .given('order with ID 123 exists')
      .uponReceiving('a request for order 123')
      .withRequest({
        method: 'GET',
        path: '/api/orders/123',
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: MatchersV3.string('123'),
          userId: MatchersV3.string('user-456'),
          status: MatchersV3.regex('pending|shipped|delivered', 'pending'),
          total: MatchersV3.decimal(100.50),
        },
      })
      .executeTest(async (mockServer) => {
        const client = new OrdersClient(mockServer.url);
        const order = await client.getOrder('123');

        expect(order.id).toBe('123');
        expect(order.status).toMatch(/pending|shipped|delivered/);
      });
  });
});
```

### Coverage Targets

- Unit: 90%+ business logic
- Integration: 100% API endpoints
- Contract: 100% API contracts
- E2E: Critical flows only

[Document continues with 6 more comprehensive testing strategies...]

---

## Summary Table

| Strategy | Best For | Coverage Target | Execution Time |
|----------|----------|-----------------|----------------|
| Pyramid | Backend services, traditional apps | 80%+ unit, 100% critical | < 5 min |
| Trophy | Modern frontends (React, Vue) | 80%+ integration | < 3 min |
| TDD | New features, greenfield projects | 90%+ | Continuous |
| BDD | Stakeholder-driven development | 100% acceptance | Variable |
| API | REST/GraphQL services | 90%+ endpoints | < 2 min |
| Frontend | SPAs, component libraries | 85%+ components | < 4 min |
| Micro-Services | Distributed systems | 80%+ per service | < 10 min |
| Performance | High-traffic applications | Critical paths | 30 min |
| Security | Sensitive data, compliance | 100% attack vectors | 1 hour |
| Accessibility | Public-facing websites | WCAG AA 100% | 15 min |

