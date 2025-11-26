---
sidebar_position: 1
title: "09.1 API Testing"
description: "Test your REST APIs with real HTTP requests"
---

# Lesson 09.1: API Integration Testing

**Duration**: 45 minutes | **Difficulty**: Intermediate

---

## Learning Objectives

By the end of this lesson, you will be able to:
- Set up API testing with Supertest
- Test REST endpoints (GET, POST, PUT, DELETE)
- Validate response structure and status codes
- Test authentication and authorization

---

## What is Integration Testing?

**Integration tests** verify that components work together correctly:

```
Unit Tests:        [Function A] ✓  [Function B] ✓  [Database] ✓
Integration Tests: [Function A] → [Function B] → [Database] ✓
```

For APIs, we test the full request-response cycle.

---

## Setting Up Supertest

### Installation

```bash
npm install -D supertest @types/supertest
```

### Basic Setup

```typescript
// tests/api/setup.ts
import { beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app';
import { createServer } from 'http';

let server: ReturnType<typeof createServer>;

beforeAll(() => {
  server = createServer(app);
  server.listen(0); // Random available port
});

afterAll(() => {
  server.close();
});

export { app };
```

---

## Testing GET Endpoints

### Basic GET Request

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './setup';

describe('GET /api/users', () => {
  it('should return list of users', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('should return user by ID', async () => {
    const response = await request(app)
      .get('/api/users/1')
      .expect(200);

    expect(response.body).toMatchObject({
      id: 1,
      name: expect.any(String),
      email: expect.stringMatching(/@/)
    });
  });

  it('should return 404 for non-existent user', async () => {
    const response = await request(app)
      .get('/api/users/99999')
      .expect(404);

    expect(response.body).toMatchObject({
      error: 'User not found'
    });
  });
});
```

---

## Testing POST Endpoints

### Creating Resources

```typescript
describe('POST /api/users', () => {
  it('should create a new user', async () => {
    const newUser = {
      name: 'Alice Smith',
      email: 'alice@example.com',
      password: 'SecurePass123!'
    };

    const response = await request(app)
      .post('/api/users')
      .send(newUser)
      .set('Content-Type', 'application/json')
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: 'Alice Smith',
      email: 'alice@example.com'
    });

    // Password should NOT be returned
    expect(response.body.password).toBeUndefined();
  });

  it('should reject invalid email', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        name: 'Test User',
        email: 'not-an-email',
        password: 'password123'
      })
      .expect(400);

    expect(response.body.errors).toContainEqual(
      expect.objectContaining({ field: 'email' })
    );
  });

  it('should reject duplicate email', async () => {
    // First create a user
    await request(app)
      .post('/api/users')
      .send({
        name: 'First User',
        email: 'duplicate@example.com',
        password: 'password123'
      });

    // Try to create another with same email
    const response = await request(app)
      .post('/api/users')
      .send({
        name: 'Second User',
        email: 'duplicate@example.com',
        password: 'password456'
      })
      .expect(409);

    expect(response.body.error).toContain('already exists');
  });
});
```

---

## Testing PUT/PATCH Endpoints

```typescript
describe('PUT /api/users/:id', () => {
  it('should update user details', async () => {
    const response = await request(app)
      .put('/api/users/1')
      .send({
        name: 'Updated Name',
        email: 'updated@example.com'
      })
      .expect(200);

    expect(response.body.name).toBe('Updated Name');
  });

  it('should return 404 for non-existent user', async () => {
    await request(app)
      .put('/api/users/99999')
      .send({ name: 'Test' })
      .expect(404);
  });
});

describe('PATCH /api/users/:id', () => {
  it('should partially update user', async () => {
    const response = await request(app)
      .patch('/api/users/1')
      .send({ name: 'Just Name Update' })
      .expect(200);

    expect(response.body.name).toBe('Just Name Update');
    // Email should remain unchanged
    expect(response.body.email).toBeDefined();
  });
});
```

---

## Testing DELETE Endpoints

```typescript
describe('DELETE /api/users/:id', () => {
  it('should delete user', async () => {
    // Create a user to delete
    const created = await request(app)
      .post('/api/users')
      .send({
        name: 'To Delete',
        email: 'delete@example.com',
        password: 'password123'
      });

    const userId = created.body.id;

    // Delete the user
    await request(app)
      .delete(`/api/users/${userId}`)
      .expect(204);

    // Verify deletion
    await request(app)
      .get(`/api/users/${userId}`)
      .expect(404);
  });

  it('should return 404 for non-existent user', async () => {
    await request(app)
      .delete('/api/users/99999')
      .expect(404);
  });
});
```

---

## Testing with Authentication

### Setting Up Auth Headers

```typescript
describe('Protected endpoints', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login to get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword'
      });

    authToken = response.body.token;
  });

  it('should access protected resource with token', async () => {
    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.email).toBe('test@example.com');
  });

  it('should reject request without token', async () => {
    await request(app)
      .get('/api/profile')
      .expect(401);
  });

  it('should reject invalid token', async () => {
    await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});
```

---

## Testing Query Parameters

```typescript
describe('GET /api/products', () => {
  it('should filter by category', async () => {
    const response = await request(app)
      .get('/api/products')
      .query({ category: 'electronics' })
      .expect(200);

    response.body.forEach((product: any) => {
      expect(product.category).toBe('electronics');
    });
  });

  it('should paginate results', async () => {
    const response = await request(app)
      .get('/api/products')
      .query({ page: 2, limit: 10 })
      .expect(200);

    expect(response.body.data).toHaveLength(10);
    expect(response.body.pagination).toMatchObject({
      page: 2,
      limit: 10,
      total: expect.any(Number)
    });
  });

  it('should sort by price', async () => {
    const response = await request(app)
      .get('/api/products')
      .query({ sort: 'price', order: 'asc' })
      .expect(200);

    const prices = response.body.map((p: any) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});
```

---

## Testing Response Headers

```typescript
describe('Response headers', () => {
  it('should include CORS headers', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should include rate limit headers', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect(200);

    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('should return correct content-type', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect('Content-Type', /application\/json/);
  });
});
```

---

## Database Setup and Teardown

```typescript
import { beforeEach, afterEach } from 'vitest';
import { db } from '../../src/database';
import { seedTestData } from '../fixtures/seeds';

describe('API with database', () => {
  beforeEach(async () => {
    // Start transaction
    await db.beginTransaction();
    // Seed test data
    await seedTestData();
  });

  afterEach(async () => {
    // Rollback changes
    await db.rollback();
  });

  it('should create user in database', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        name: 'New User',
        email: 'new@example.com',
        password: 'password123'
      })
      .expect(201);

    // Verify in database
    const user = await db.query('SELECT * FROM users WHERE id = ?', [response.body.id]);
    expect(user.name).toBe('New User');
  });
});
```

---

## Key Takeaways

1. **Test the full request cycle** — Request → Processing → Response
2. **Test all HTTP methods** — GET, POST, PUT, PATCH, DELETE
3. **Verify status codes and bodies** — Both success and error cases
4. **Test authentication** — Protected routes need auth headers
5. **Use database transactions** — Isolate test data

---

## Practice Exercise

Create integration tests for an order API:

```
POST /api/orders - Create order (requires auth)
GET /api/orders - List user's orders (requires auth)
GET /api/orders/:id - Get order details
PUT /api/orders/:id/status - Update order status (admin only)
```

Test cases:
1. Create order with valid items
2. Reject order with empty cart
3. List orders for authenticated user
4. Hide other users' orders
5. Only admin can update status

---

## Next Lesson

Learn to test database interactions effectively.

→ [Continue to Lesson 09.2: Database Testing](./02-database-testing)
