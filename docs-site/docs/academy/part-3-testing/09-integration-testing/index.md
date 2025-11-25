---
sidebar_position: 1
title: "Module 09: Integration Testing"
description: "Test how components work together - APIs, databases, services"
---

# Module 09: Integration Testing

**Duration**: 2-3 hours | **Difficulty**: Intermediate

Integration tests verify that different parts of your application work together correctly. They catch bugs that unit tests miss.

---

## What You'll Learn

- Setting up test databases
- Testing API endpoints
- Testing service interactions
- Database transaction testing
- CI/CD integration

---

## Module Lessons

| Lesson | Topic | Duration |
|--------|-------|----------|
| [09.1 Test Databases](./01-test-databases) | Setting up isolated test databases | 45 min |
| [09.2 API Testing](./02-api-testing) | Testing REST endpoints | 45 min |
| [09.3 Service Integration](./03-service-integration) | Testing component interactions | 45 min |
| [09.4 CI Integration](./04-ci-integration) | Running tests in CI/CD | 30 min |

---

## Integration Test Characteristics

```
Speed:        🏃 Moderate (seconds)
Count:        📊 Some (dozens/hundreds)
Scope:        🔗 Multiple components
Dependencies: ✅ Real (test instances)
Cost:         💵 Moderate
```

---

## Example Integration Test

```typescript
describe('POST /api/orders', () => {
  beforeEach(async () => {
    await testDb.truncate();
  });

  it('should create order and update inventory', async () => {
    // Setup: Create product with stock
    await testDb.products.create({
      id: 'laptop',
      stock: 10
    });

    // Act: Create order via API
    const response = await request(app)
      .post('/api/orders')
      .send({ productId: 'laptop', quantity: 2 });

    // Assert: Order created
    expect(response.status).toBe(201);

    // Assert: Inventory updated
    const product = await testDb.products.findById('laptop');
    expect(product.stock).toBe(8);
  });
});
```

---

## Prerequisites

Before starting:
- ✅ Completed Module 08
- ✅ Basic database knowledge
- ✅ Understanding of REST APIs

---

## Let's Begin

Ready to test component interactions?

→ [Start Lesson 09.1: Test Databases](./01-test-databases)
