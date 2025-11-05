---
id: backend-category
title: Backend Development
sidebar_label: Backend Development
---

# Backend Development

Understanding server-side application development, APIs, and data management.

---

## Overview

Backend development terms cover server-side logic, API design, database management, and business logic implementation. These concepts enable teams to build scalable, maintainable server applications that power modern web and mobile experiences.

## Core Concepts

### API Design

**REST API**
- Architectural style for web services
- Uses HTTP methods (GET, POST, PUT, DELETE)
- Stateless, cacheable, uniform interface
- SpecWeave generates REST API specs in increment planning

**[GraphQL](/docs/glossary/terms/graphql)**
- Query language for APIs
- Client specifies exactly what data it needs
- Single endpoint, strongly typed
- When to use: complex data relationships, mobile apps

**API Gateway**
- Single entry point for all client requests
- Handles: routing, authentication, rate limiting
- Tools: Kong, AWS API Gateway, Nginx
- SpecWeave documents gateway configuration in architecture docs

### Backend Frameworks

**[Node.js](/docs/glossary/terms/nodejs)**
- JavaScript runtime for server-side development
- Event-driven, non-blocking I/O
- Frameworks: Express, Fastify, NestJS
- SpecWeave plugin: `specweave-nodejs-backend` (planned)

**Express.js**
- Minimal Node.js web framework
- Middleware-based architecture
- Most popular Node.js framework
- Quick to set up, flexible

**[NestJS](/docs/glossary/terms/nestjs)**
- Progressive Node.js framework
- TypeScript-first, modular architecture
- Built-in dependency injection
- Best for: enterprise applications, complex systems

### Database Management

**[PostgreSQL](/docs/glossary/terms/postgresql)**
- Relational database (SQL)
- ACID transactions, complex queries
- Extensions: PostGIS, full-text search
- SpecWeave default recommendation for transactional systems

**[MongoDB](/docs/glossary/terms/mongodb)**
- NoSQL document database
- Flexible schema, horizontal scaling
- Best for: rapid development, unstructured data
- Trade-off: No ACID transactions across documents

**[Redis](/docs/glossary/terms/redis)**
- In-memory data store
- Use cases: caching, session storage, rate limiting
- Fast reads/writes (microsecond latency)
- SpecWeave uses Redis for hook debouncing

### Architecture Patterns

**[Microservices](/docs/glossary/terms/microservices)**
- Architecture with independent, deployable services
- Each service owns its database
- Benefits: scalability, team autonomy, fault isolation
- Challenges: complexity, distributed systems

**[Monolith](/docs/glossary/terms/monolith)**
- Single-tier application
- All code in one codebase
- Benefits: simplicity, easier debugging
- When to use: small teams, early-stage products

**[Event-Driven Architecture](/docs/glossary/terms/event-driven)**
- Systems communicate via events
- Tools: Kafka, RabbitMQ, AWS SNS/SQS
- Benefits: loose coupling, scalability
- Use cases: real-time systems, microservices

---

## When to Use These Terms

| Term | Use When | Don't Use When |
|------|----------|----------------|
| **REST API** | Standard CRUD operations, simple resources | Real-time updates, complex data fetching |
| **GraphQL** | Complex data relationships, mobile apps | Simple APIs, caching is critical |
| **Node.js** | JavaScript stack, real-time features, I/O-heavy | CPU-intensive tasks, scientific computing |
| **PostgreSQL** | Transactional systems, complex queries | Rapid prototyping, unstructured data |
| **MongoDB** | Rapid development, flexible schema | Financial systems, strict consistency needed |
| **Microservices** | Large teams, independent scaling | Small teams, early-stage startups |

---

## Real-World Examples

### Building an E-Commerce Backend

**Phase 1: MVP (0-3 months)** - Monolith + REST API

```typescript
// Simple Express.js monolith
import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// Product API
app.get('/api/products', async (req, res) => {
  const products = await prisma.product.findMany({
    include: { category: true }
  });
  res.json(products);
});

app.post('/api/orders', async (req, res) => {
  const { userId, items } = req.body;

  // Create order in transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: { userId, status: 'pending' }
    });

    for (const item of items) {
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity
        }
      });
    }

    return newOrder;
  });

  res.json(order);
});

app.listen(3000);
```

**Why this works for MVP**:
- ✅ Fast development (single codebase)
- ✅ Simple deployment (one service)
- ✅ Easy debugging (all code in one place)

**Phase 2: Growth (6-12 months)** - Still Monolith, Add Caching

```typescript
// Add Redis for caching
import Redis from 'ioredis';
const redis = new Redis();

app.get('/api/products', async (req, res) => {
  // Check cache first
  const cached = await redis.get('products');
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Fetch from database
  const products = await prisma.product.findMany();

  // Cache for 5 minutes
  await redis.setex('products', 300, JSON.stringify(products));

  res.json(products);
});
```

**Phase 3: Scale (12+ months)** - Microservices

```typescript
// Service 1: Product Service
// products-service/src/index.ts
app.get('/api/products', async (req, res) => {
  const products = await productDb.findMany();
  res.json(products);
});

// Service 2: Order Service
// orders-service/src/index.ts
app.post('/api/orders', async (req, res) => {
  // Call Product Service to verify inventory
  const response = await fetch('http://products-service/api/products/check');

  // Create order in local database
  const order = await orderDb.create(req.body);

  // Publish event to message queue
  await eventBus.publish('order.created', order);

  res.json(order);
});

// Service 3: Notification Service
// notifications-service/src/index.ts
eventBus.subscribe('order.created', async (order) => {
  // Send confirmation email
  await sendEmail(order.userId, 'Order confirmed');
});
```

**Why migrate to microservices**:
- ✅ Independent scaling (order service needs more resources)
- ✅ Team autonomy (separate teams own services)
- ✅ Technology diversity (Python for ML service)
- ✅ Fault isolation (product service down doesn't break orders)

### SpecWeave Backend Increment Example

```markdown
# Increment 0015: Order Management API

## Acceptance Criteria
- **AC-US1-01**: Create order endpoint (POST /api/orders) (P1)
- **AC-US1-02**: Get order by ID (GET /api/orders/:id) (P1)
- **AC-US1-03**: List user orders (GET /api/users/:id/orders) (P1)
- **AC-US1-04**: Cancel order (PATCH /api/orders/:id/cancel) (P2)

## Architecture Decisions

**ADR-015**: Use NestJS for Order Service
- **Rationale**: Need dependency injection, modular architecture
- **Alternatives**: Express (too simple), Fastify (no DI)
- **Trade-offs**: Learning curve vs long-term maintainability

**ADR-016**: Use PostgreSQL for Orders
- **Rationale**: Need ACID transactions (money involved)
- **Alternatives**: MongoDB (no transactions), DynamoDB (complex queries)
- **Trade-offs**: Scaling complexity vs data integrity

## API Specification

### POST /api/orders
Creates a new order.

**Request**:
```json
{
  "userId": "user-123",
  "items": [
    { "productId": "prod-456", "quantity": 2 },
    { "productId": "prod-789", "quantity": 1 }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105"
  }
}
```

**Response (201 Created)**:
```json
{
  "id": "order-abc123",
  "userId": "user-123",
  "status": "pending",
  "total": 99.99,
  "items": [...],
  "createdAt": "2025-11-04T10:30:00Z"
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "Insufficient inventory",
  "details": { "productId": "prod-456", "available": 1, "requested": 2 }
}
```

## Implementation Plan

**T-001**: Set up NestJS project structure
- Modules: OrderModule, ProductModule, UserModule
- Controllers: OrderController
- Services: OrderService, InventoryService
- Repositories: OrderRepository (TypeORM)

**T-002**: Implement order creation endpoint
- Validate user exists
- Check inventory availability
- Create order in transaction
- Deduct inventory
- Send confirmation event

**T-003**: Add API tests
- Unit: OrderService.createOrder()
- Integration: POST /api/orders endpoint
- E2E: Full order flow (create, verify, cancel)

## Test Plan (Embedded in tasks)

**Given** user with valid cart → **When** POST /api/orders → **Then** order created + inventory updated

**Test Cases**:
- Unit: OrderService.createOrder, validateInventory, calculateTotal
- Integration: POST /api/orders, GET /api/orders/:id
- E2E: Complete order flow
- Coverage: 90% (critical path)
```

---

## How SpecWeave Uses Backend Terms

### 1. Backend-Specific Plugins

**specweave-nodejs-backend plugin** (planned):
- Node.js best practices
- Express/NestJS boilerplate generation
- Database schema suggestions
- API endpoint templates

**specweave-python-backend plugin** (planned):
- FastAPI/Django/Flask expertise
- Python-specific testing (pytest)
- Virtual environment setup

### 2. Increment Planning for Backend Features

When creating backend increments:

```bash
/specweave:increment "User Authentication API"
```

The Architect agent:
- Suggests backend framework (Express vs NestJS)
- Recommends database (PostgreSQL vs MongoDB)
- Includes API specification
- Plans database schema
- Suggests authentication strategy (JWT vs sessions)

### 3. Living Documentation

Backend architecture is documented in:
```
.specweave/docs/internal/
├── architecture/
│   ├── api-design.md           # REST API conventions
│   ├── database-schema.md      # Database design
│   └── adr/
│       ├── 0010-use-nestjs.md
│       └── 0011-postgres-over-mongo.md
├── operations/
│   └── runbook-api.md          # API operational guide
└── delivery/
    └── database-migrations.md   # Schema change process
```

### 4. Test-Aware Planning

Backend increments include embedded tests:
```markdown
## T-003: Implement order creation endpoint

**Test Plan** (BDD):
- **Given** valid order data → **When** POST /api/orders → **Then** 201 + order ID

**Test Cases**:
- Unit: OrderService.create, validateInventory (85% coverage)
- Integration: POST endpoint, GET endpoint (80% coverage)
- E2E: Complete order flow (100% critical path)
```

---

## Related Categories

- **[Architecture & Design](/docs/glossary/categories/architecture-category)** - System architecture patterns
- **[Infrastructure & Operations](/docs/glossary/categories/infrastructure-category)** - Deployment and scaling
- **[Testing & Quality](/docs/glossary/categories/testing-category)** - API testing strategies

---

## Learn More

### Guides
- REST API Design Best Practices (coming soon)
- Database Schema Design (coming soon)
- Microservices Architecture (coming soon)

### Books
- "Designing Data-Intensive Applications" by Martin Kleppmann
- "Node.js Design Patterns" by Mario Casciaro
- "REST API Design Rulebook" by Mark Masse
- "Database Internals" by Alex Petrov
- "Building Microservices" by Sam Newman

### External Resources
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [REST API Tutorial](https://restfulapi.net/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Microservices.io Patterns](https://microservices.io/patterns/)

---

**Navigation**:
- [← Back to Glossary](/docs/glossary/)
- [Browse by Category](/docs/glossary/index-by-category)
- [Alphabetical Index](/docs/glossary/README)
