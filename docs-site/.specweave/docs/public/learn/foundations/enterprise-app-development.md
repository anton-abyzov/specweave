---
id: enterprise-app-development
title: Enterprise Application Development
sidebar_label: Enterprise App Development
---

# Enterprise Application Development: A Complete Guide

Learn how to build production-grade enterprise applications from first principles, covering architecture, infrastructure, backend, frontend, testing, and operations.

---

## Table of Contents

1. [What is Enterprise Application Development?](#what-is-enterprise-application-development)
2. [The Software Development Lifecycle](#the-software-development-lifecycle)
3. [Architecture Foundations](#architecture-foundations)
4. [Infrastructure & DevOps](#infrastructure--devops)
5. [Backend Development](#backend-development)
6. [Frontend Development](#frontend-development)
7. [Testing Strategy](#testing-strategy)
8. [Production Operations](#production-operations)
9. [How SpecWeave Fits In](#how-specweave-fits-in)

---

## What is Enterprise Application Development?

**Enterprise applications** are large-scale software systems that serve business-critical functions for organizations. Unlike simple apps or prototypes, enterprise applications must:

- **Scale** to thousands/millions of users
- **Stay reliable** (99.9%+ uptime)
- **Maintain security** (protect sensitive data, comply with regulations)
- **Evolve rapidly** (respond to business needs)
- **Integrate** with multiple systems (APIs, databases, third-party services)

### Examples of Enterprise Applications

| Type | Examples | Key Requirements |
|------|----------|------------------|
| **E-commerce** | Amazon, Shopify | High traffic, payment security, inventory management |
| **FinTech** | Stripe, PayPal | ACID transactions, compliance (PCI-DSS), real-time processing |
| **HealthTech** | Epic, Cerner | [HIPAA](/docs/glossary/terms/hipaa) compliance, data privacy, integration with medical devices |
| **SaaS** | Salesforce, HubSpot | Multi-tenancy, API integrations, usage billing |
| **Enterprise Resource Planning (ERP)** | SAP, Oracle | Complex business logic, reporting, legacy integration |

---

## The Software Development Lifecycle

Enterprise development follows a structured lifecycle from idea to production:

\`\`\`mermaid
graph LR
    A[Requirements] --> B[Architecture]
    B --> C[Development]
    C --> D[Testing]
    D --> E[Deployment]
    E --> F[Operations]
    F --> A

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#e8f5e9
    style D fill:#fce4ec
    style E fill:#f3e5f5
    style F fill:#fff3e0
\`\`\`

### Phase 1: Requirements Gathering

**What**: Define WHAT the system should do and WHY.

**Documents**:
- **Product Requirements Document (PRD)**: Business case, user stories, success metrics
- **[RFC](/docs/glossary/terms/rfc)**: Feature specifications (WHAT + WHY)

**Example User Story**:
\`\`\`markdown
As a customer,
I want to reset my password via email,
So that I can regain access when I forget my credentials.

Acceptance Criteria:
- AC-US1-01: Click "Forgot Password" triggers email with reset link
- AC-US1-02: Reset link expires after 1 hour
- AC-US1-03: Old password no longer works after reset
\`\`\`

### Phase 2: Architecture Design

**What**: Define HOW the system will be built (technical decisions).

**Documents**:
- **High-Level Design (HLD)**: System architecture, component diagram, data flow
- **[ADR](/docs/glossary/terms/adr)**: Architecture Decision Records (WHY we chose technology X over Y)

**Key Decisions**:
- [Monolith](/docs/glossary/terms/monolith) vs [Microservices](/docs/glossary/terms/microservices)
- Database choice (PostgreSQL, MongoDB, DynamoDB)
- API style ([REST](/docs/glossary/terms/rest), [GraphQL](/docs/glossary/terms/graphql), gRPC)
- Deployment platform ([Kubernetes](/docs/glossary/terms/kubernetes), serverless)

\`\`\`mermaid
graph TB
    subgraph "Architecture Decision Flow"
        A[Business Requirements] --> B{Team Size?}
        B -->|Small| C[Monolith]
        B -->|Large| D[Microservices]

        C --> E{Database Needs?}
        D --> E

        E -->|ACID + Complex Queries| F[PostgreSQL]
        E -->|Flexible Schema| G[MongoDB]
        E -->|Extreme Scale| H[DynamoDB]
    end

    style A fill:#e1f5ff
    style C fill:#e8f5e9
    style D fill:#fff4e1
    style F fill:#fce4ec
    style G fill:#fce4ec
    style H fill:#fce4ec
\`\`\`

### Phase 3: Development

**What**: Write code, build features, integrate components.

**Activities**:
- Backend development ([Node.js](/docs/glossary/terms/nodejs), Python, .NET)
- Frontend development ([React](/docs/glossary/terms/react), [Next.js](/docs/glossary/terms/nextjs), [Angular](/docs/glossary/terms/angular))
- [API](/docs/glossary/terms/api) development (REST, GraphQL)
- Database schema design
- [Git](/docs/glossary/terms/git) version control

### Phase 4: Testing

**What**: Validate the system works as expected.

**Testing Levels** (see [Test Pyramid](/docs/glossary/terms/test-pyramid)):
- **[Unit Testing](/docs/glossary/terms/unit-testing)**: Test individual functions (70-80% of tests)
- **[Integration Testing](/docs/glossary/terms/integration-testing)**: Test API endpoints, database queries (15-20%)
- **[E2E Testing](/docs/glossary/terms/e2e)**: Test full user workflows with [Playwright](/docs/glossary/terms/playwright) (5-10%)

### Phase 5: Deployment

**What**: Move code from development to production.

**Key Practices**:
- **[CI/CD](/docs/glossary/terms/ci-cd)**: Automated testing and deployment ([GitHub Actions](/docs/glossary/terms/github-actions), GitLab CI)
- **[IaC](/docs/glossary/terms/iac)**: Infrastructure as code with [Terraform](/docs/glossary/terms/terraform)
- **Containerization**: Package apps with [Docker](/docs/glossary/terms/docker)
- **Orchestration**: Manage containers with Kubernetes

### Phase 6: Operations

**What**: Monitor, maintain, and improve production systems.

**Key Activities**:
- Monitoring (Prometheus, Datadog)
- Logging (ELK Stack, Splunk)
- Incident response (PagerDuty, on-call rotations)
- Performance optimization
- Security patching

---

## Architecture Foundations

### Choosing the Right Architecture

**Decision Criteria**:

| Factor | Monolith | Microservices |
|--------|----------|---------------|
| **Team Size** | ✅ 1-10 developers | ✅ 10+ developers |
| **Initial Development Speed** | ✅ Fast (3-6 months to MVP) | ⏳ Slower (6-12 months) |
| **Scaling** | ⚠️ Vertical only | ✅ Horizontal + independent |
| **Technology Diversity** | ❌ Single stack | ✅ Mix languages/frameworks |
| **Deployment Risk** | ⚠️ All-or-nothing | ✅ Independent deploys |
| **Operational Complexity** | ✅ Simple | ⚠️ High (distributed systems) |
| **Cost (Small Scale)** | ✅ Low | ⚠️ High (overhead) |
| **Cost (Large Scale)** | ⚠️ High (single DB) | ✅ Lower (optimize per service) |

### Real-World Architecture Evolution

\`\`\`mermaid
graph TD
    subgraph "Phase 1: MVP (0-6 months)"
        A[Rails Monolith<br/>3 developers<br/>1K users]
    end

    subgraph "Phase 2: Growth (6-18 months)"
        B[Same Monolith<br/>8 developers<br/>10K users<br/>$50K MRR]
    end

    subgraph "Phase 3: Scale (18+ months)"
        C[Microservices<br/>25 developers<br/>100K users<br/>$500K MRR]
    end

    A -->|Feature velocity high<br/>Complexity manageable| B
    B -->|Team coordination hard<br/>Database bottleneck| C

    style A fill:#e8f5e9
    style B fill:#fff4e1
    style C fill:#e1f5ff
\`\`\`

**Key Insight**: Start with a [monolith](/docs/glossary/terms/monolith), migrate to [microservices](/docs/glossary/terms/microservices) when you have:
1. Multiple teams (10+ developers)
2. Clear service boundaries (User, Product, Order, Payment)
3. Need for independent scaling (e.g., search service needs 10x more resources)

### Documenting Architecture Decisions

Use **[ADRs](/docs/glossary/terms/adr)** to capture the WHY behind technical choices:

\`\`\`markdown
# ADR-001: Use PostgreSQL for Primary Database

## Status
Accepted (2025-01-15)

## Context
Need database for user management, orders, and reporting.

Options: PostgreSQL, MongoDB, DynamoDB

Requirements:
- ACID transactions (money transfers)
- Complex queries (reporting)
- Team has SQL experience

## Decision
Use PostgreSQL

Rationale:
1. ACID guarantees prevent data loss (critical for money)
2. Mature ecosystem (pg_dump, Flyway migrations)
3. Team productivity (no learning curve)

## Consequences

✅ Benefits:
- Data integrity guaranteed
- Fast development

❌ Trade-offs:
- Harder to scale horizontally (vs NoSQL)
- Schema migrations required

✅ Mitigations:
- Use read replicas for scaling
- Use connection pooling (PgBouncer)
\`\`\`

---

## Infrastructure & DevOps

### What is Infrastructure?

**Infrastructure** = The foundation your application runs on (servers, networks, databases, load balancers).

**Traditional Approach** (❌ Slow, error-prone):
- Manually provision servers (click buttons in AWS console)
- SSH into servers, run commands
- No version control (can't reproduce)
- Configuration drift (servers become "special snowflakes")

**Modern Approach** (✅ [IaC](/docs/glossary/terms/iac) with [Terraform](/docs/glossary/terms/terraform)):
- Define infrastructure as code (\`main.tf\`)
- Version control infrastructure (Git)
- Reproducible (destroy and recreate identically)
- Automated (apply changes with one command)

### Infrastructure as Code Example

\`\`\`hcl
# main.tf (Terraform)

# Define provider
provider "aws" {
  region = "us-east-1"
}

# Create VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "production-vpc"
  }
}

# Create database
resource "aws_db_instance" "postgres" {
  identifier          = "production-db"
  engine             = "postgres"
  engine_version     = "15.4"
  instance_class     = "db.t3.medium"
  allocated_storage  = 100

  username = var.db_username
  password = var.db_password

  backup_retention_period = 7
  multi_az               = true  # High availability
}

# Create Kubernetes cluster
resource "aws_eks_cluster" "main" {
  name     = "production-cluster"
  role_arn = aws_iam_role.eks_cluster.arn

  vpc_config {
    subnet_ids = aws_subnet.private[*].id
  }
}
\`\`\`

**Benefits**:
- ✅ **Version control**: \`git log\` shows who changed what
- ✅ **Reproducible**: Run \`terraform apply\` on any machine → identical infrastructure
- ✅ **Testable**: Test infrastructure changes in staging before production
- ✅ **Documented**: Code IS the documentation

### CI/CD Pipeline

**[CI/CD](/docs/glossary/terms/ci-cd)** = Automate testing and deployment

\`\`\`mermaid
graph LR
    A[Developer<br/>Pushes Code] --> B[GitHub]
    B --> C[GitHub Actions<br/>Runs Tests]
    C --> D{Tests Pass?}
    D -->|Yes| E[Build Docker Image]
    D -->|No| F[❌ Block Deploy<br/>Notify Developer]
    E --> G[Push to Registry]
    G --> H[Deploy to Staging]
    H --> I[Run E2E Tests]
    I --> J{E2E Pass?}
    J -->|Yes| K[Deploy to Production]
    J -->|No| F

    style A fill:#e1f5ff
    style C fill:#fff4e1
    style E fill:#e8f5e9
    style K fill:#c8e6c9
    style F fill:#ffcdd2
\`\`\`

**Example GitHub Actions Workflow**:

\`\`\`yaml
# .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm test        # Unit tests
      - run: npm run test:e2e # E2E tests

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Push to registry
        run: docker push myapp:${{ github.sha }}

      - name: Deploy to Kubernetes
        run: kubectl set image deployment/myapp myapp=myapp:${{ github.sha }}
\`\`\`

---

## Backend Development

### What is a Backend?

**Backend** = Server-side logic that:
- Processes requests from frontend
- Manages database (CRUD operations)
- Implements business logic (e.g., calculate shipping cost)
- Integrates with third-party APIs (Stripe, Twilio)
- Handles authentication/authorization

### Common Backend Stacks

| Language | Framework | Use Case |
|----------|-----------|----------|
| **[Node.js](/docs/glossary/terms/nodejs)** | Express, NestJS | Real-time apps, fast I/O, JavaScript ecosystem |
| **Python** | FastAPI, Django | Data science integration, rapid development |
| **.NET** | ASP.NET Core | Enterprise (Microsoft shops), strong typing |
| **Go** | Gin, Echo | High performance, microservices |
| **Java** | Spring Boot | Large enterprises, legacy integration |

### API Design: REST vs GraphQL

**[REST](/docs/glossary/terms/rest)** (Representational State Transfer):

\`\`\`javascript
// GET /api/users/123 - Fetch user
// POST /api/users - Create user
// PUT /api/users/123 - Update user
// DELETE /api/users/123 - Delete user

// Example REST endpoint (Express.js)
app.get('/api/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id);
  res.json(user);
});
\`\`\`

**[GraphQL](/docs/glossary/terms/graphql)**:

\`\`\`graphql
# Single endpoint: POST /graphql
# Client specifies exactly what fields to return

query GetUser {
  user(id: "123") {
    id
    name
    email
    posts {
      title
      createdAt
    }
  }
}
\`\`\`

**When to Use**:
- **REST**: Simple CRUD, public APIs, caching-heavy workloads
- **GraphQL**: Complex data fetching, mobile apps (minimize requests), rapidly changing requirements

### Database Patterns

**ACID Transactions** (PostgreSQL, MySQL):

\`\`\`sql
-- Transfer money between accounts (ACID guarantees atomicity)
BEGIN TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1; -- Deduct
UPDATE accounts SET balance = balance + 100 WHERE id = 2; -- Credit

COMMIT; -- Both succeed or both fail (no partial state)
\`\`\`

**NoSQL** (MongoDB, DynamoDB):

\`\`\`javascript
// Flexible schema, horizontal scaling
await db.collection('users').insertOne({
  name: 'Alice',
  email: 'alice@example.com',
  preferences: {
    theme: 'dark',
    notifications: true
  },
  customFields: {
    favoriteColor: 'blue' // Schema-less!
  }
});
\`\`\`

---

## Frontend Development

### What is a Frontend?

**Frontend** = User interface (UI) that runs in the browser:
- Displays data to users
- Captures user input (forms, clicks)
- Communicates with backend ([API](/docs/glossary/terms/api) calls)
- Provides interactivity (real-time updates, animations)

### Modern Frontend Frameworks

| Framework | Best For | Key Features |
|-----------|----------|--------------|
| **[React](/docs/glossary/terms/react)** | [SPA](/docs/glossary/terms/spa), dynamic UIs | Component-based, large ecosystem, flexible |
| **[Next.js](/docs/glossary/terms/nextjs)** | Full-stack apps, SEO | [SSR](/docs/glossary/terms/ssr), [SSG](/docs/glossary/terms/ssg), API routes, file-based routing |
| **[Angular](/docs/glossary/terms/angular)** | Enterprise apps | Full framework, TypeScript-first, opinionated |
| **Vue.js** | Progressive adoption | Easy learning curve, flexible, good docs |

### SPA vs SSR vs SSG

\`\`\`mermaid
graph TB
    subgraph "SPA (Single-Page Application)"
        A[Browser requests index.html] --> B[Server sends empty HTML + JS bundle]
        B --> C[JavaScript renders entire UI<br/>Initial load: Slow<br/>Navigation: Fast]
    end

    subgraph "SSR (Server-Side Rendering)"
        D[Browser requests /about] --> E[Server renders HTML with data]
        E --> F[Browser displays content immediately<br/>Initial load: Fast<br/>SEO: Excellent]
    end

    subgraph "SSG (Static Site Generation)"
        G[Build time: Pre-render all pages] --> H[Server serves static HTML files]
        H --> I[Browser displays content instantly<br/>Initial load: Fastest<br/>SEO: Excellent]
    end

    style C fill:#fff4e1
    style F fill:#e8f5e9
    style I fill:#c8e6c9
\`\`\`

**When to Use**:
- **[SPA](/docs/glossary/terms/spa)**: Admin dashboards, internal tools (SEO not critical)
- **[SSR](/docs/glossary/terms/ssr)**: E-commerce, news sites (SEO critical, dynamic data)
- **[SSG](/docs/glossary/terms/ssg)**: Blogs, documentation (content rarely changes)

### Example: Next.js E-commerce Page

\`\`\`tsx
// pages/products/[id].tsx (Next.js with SSR)

import { GetServerSideProps } from 'next';

interface ProductPageProps {
  product: {
    id: string;
    name: string;
    price: number;
    description: string;
  };
}

export default function ProductPage({ product }: ProductPageProps) {
  return (
    <div>
      <h1>{product.name}</h1>
      <p>${product.price}</p>
      <p>{product.description}</p>
      <button onClick={() => addToCart(product.id)}>
        Add to Cart
      </button>
    </div>
  );
}

// Server-side: Fetch product data before rendering
export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const res = await fetch(\`https://api.example.com/products/\${params?.id}\`);
  const product = await res.json();

  return {
    props: { product } // Passed to component
  };
};
\`\`\`

---

## Testing Strategy

### The Test Pyramid

\`\`\`mermaid
graph TB
    subgraph "Test Pyramid (From Bottom to Top)"
        A[Unit Tests<br/>70-80% of tests<br/>Fast, Isolated, Many]
        B[Integration Tests<br/>15-20% of tests<br/>API + Database, Medium Speed]
        C[E2E Tests<br/>5-10% of tests<br/>Full User Flows, Slow, Few]
    end

    A --> B
    B --> C

    style A fill:#c8e6c9
    style B fill:#fff4e1
    style C fill:#ffcdd2
\`\`\`

### Unit Tests

**[Unit Testing](/docs/glossary/terms/unit-testing)**: Test individual functions in isolation.

\`\`\`javascript
// src/utils/calculateShipping.ts
export function calculateShipping(weight: number, distance: number): number {
  const baseRate = 5;
  const weightRate = 0.5;
  const distanceRate = 0.1;

  return baseRate + (weight * weightRate) + (distance * distanceRate);
}

// tests/unit/calculateShipping.test.ts
import { calculateShipping } from '@/utils/calculateShipping';

describe('calculateShipping', () => {
  it('calculates shipping for 10lb package, 100 miles', () => {
    expect(calculateShipping(10, 100)).toBe(20); // 5 + 5 + 10
  });

  it('handles zero weight', () => {
    expect(calculateShipping(0, 50)).toBe(10); // 5 + 0 + 5
  });
});
\`\`\`

### Integration Tests

**[Integration Testing](/docs/glossary/terms/integration-testing)**: Test API endpoints with real database.

\`\`\`javascript
// tests/integration/api/users.test.ts
import request from 'supertest';
import { app } from '@/app';
import { db } from '@/db';

describe('POST /api/users', () => {
  beforeEach(async () => {
    await db.users.deleteMany({}); // Clear test DB
  });

  it('creates a new user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        name: 'Alice',
        email: 'alice@example.com'
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();

    // Verify user in database
    const user = await db.users.findById(res.body.id);
    expect(user.email).toBe('alice@example.com');
  });
});
\`\`\`

### E2E Tests

**[E2E Testing](/docs/glossary/terms/e2e)**: Test full user workflows with [Playwright](/docs/glossary/terms/playwright).

\`\`\`typescript
// tests/e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('user can complete checkout', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'alice@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // 2. Add product to cart
  await page.goto('/products/123');
  await page.click('text=Add to Cart');
  await expect(page.locator('.cart-count')).toHaveText('1');

  // 3. Checkout
  await page.goto('/checkout');
  await page.fill('[name="cardNumber"]', '4242424242424242');
  await page.fill('[name="expiry"]', '12/25');
  await page.fill('[name="cvc"]', '123');
  await page.click('text=Place Order');

  // 4. Verify success
  await expect(page).toHaveURL('/order-confirmation');
  await expect(page.locator('h1')).toHaveText('Order Confirmed!');
});
\`\`\`

---

## Production Operations

### Monitoring & Observability

**Three Pillars**:
1. **Metrics**: Numbers (CPU, memory, request rate)
2. **Logs**: Text records of events
3. **Traces**: Request flow through distributed system

\`\`\`mermaid
graph LR
    A[Application] --> B[Prometheus<br/>Metrics]
    A --> C[ELK Stack<br/>Logs]
    A --> D[Jaeger<br/>Traces]

    B --> E[Grafana<br/>Dashboards]
    C --> E
    D --> E

    E --> F[Alerts<br/>PagerDuty]

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#e8f5e9
    style D fill:#fce4ec
    style E fill:#f3e5f5
    style F fill:#ffcdd2
\`\`\`

### Incident Response

**Runbooks** document how to respond to incidents:

\`\`\`markdown
# Runbook: High API Latency

## Symptoms
- API response time > 2 seconds
- PagerDuty alert: "API Latency High"

## Investigation Steps

1. Check dashboard: https://grafana.example.com/api-latency
2. Identify slow endpoint (e.g., \`/api/products\`)
3. Check database query time: SELECT * FROM pg_stat_statements

## Common Causes

1. **Database slow query**
   - Fix: Add index, optimize query
   - Example: \`CREATE INDEX idx_products_category ON products(category);\`

2. **High traffic spike**
   - Fix: Scale horizontally (add more pods)
   - Command: \`kubectl scale deployment api --replicas=10\`

3. **Third-party API slow**
   - Fix: Enable caching, add timeout
   - Example: \`cache.set('stripe_data', data, 300); // 5min TTL\`

## Escalation
- On-call engineer: @jane (Slack)
- Manager: @bob (if incident > 1 hour)
\`\`\`

---

## How SpecWeave Fits In

SpecWeave automates the entire enterprise development workflow:

\`\`\`mermaid
graph TD
    A[Requirements<br/>/specweave:inc] --> B[PM Agent<br/>Writes spec.md]
    B --> C[Architect Agent<br/>Creates plan.md + ADRs]
    C --> D[Implementation<br/>/specweave:do]
    D --> E[Testing<br/>Tasks with embedded tests]
    E --> F[Documentation<br/>Living docs auto-sync]
    F --> G[Production Ready<br/>/specweave:done]

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#ffe4e1
    style D fill:#e8f5e9
    style E fill:#fce4ec
    style F fill:#f3e5f5
    style G fill:#c8e6c9
\`\`\`

### Increment Planning

\`\`\`bash
/specweave:inc "Add user authentication with OAuth2 and 2FA"
\`\`\`

**What happens**:
1. **PM Agent** creates \`spec.md\`:
   - User stories with acceptance criteria
   - Success metrics (e.g., 99.9% uptime, <200ms login)
   - Links to compliance requirements ([HIPAA](/docs/glossary/terms/hipaa), [SOC 2](/docs/glossary/terms/soc2))

2. **Architect Agent** creates \`plan.md\`:
   - Architecture decisions (ADRs)
   - Database schema
   - API contracts
   - Security considerations
   - Diagrams (C4, sequence)

3. **Test-Aware Planner** creates \`tasks.md\`:
   - Implementation tasks
   - **Embedded test plans** (Given/When/Then)
   - Coverage targets (85% unit, 80% integration)

### Implementation

\`\`\`bash
/specweave:do
\`\`\`

**Autonomous execution**:
1. Reads \`spec.md\`, \`plan.md\`, \`tasks.md\`
2. Implements features (backend + frontend + infrastructure)
3. Writes tests ([TDD](/docs/glossary/terms/tdd) workflow)
4. Updates living docs automatically (via hooks)
5. Creates ADRs for technical decisions

### Quality Gates

\`\`\`bash
/specweave:validate 0008
\`\`\`

**Checks**:
- ✅ All acceptance criteria covered
- ✅ Test coverage targets met
- ✅ ADRs created for architecture decisions
- ✅ Documentation updated
- ✅ No security vulnerabilities

---

## Summary

**Enterprise application development** involves:

1. **Requirements** → Define what to build ([RFC](/docs/glossary/terms/rfc), user stories)
2. **Architecture** → Design the system ([ADR](/docs/glossary/terms/adr), [monolith](/docs/glossary/terms/monolith) vs [microservices](/docs/glossary/terms/microservices))
3. **Infrastructure** → Provision resources ([IaC](/docs/glossary/terms/iac) with [Terraform](/docs/glossary/terms/terraform), [Kubernetes](/docs/glossary/terms/kubernetes))
4. **Backend** → Build [APIs](/docs/glossary/terms/api) ([Node.js](/docs/glossary/terms/nodejs), [REST](/docs/glossary/terms/rest), [GraphQL](/docs/glossary/terms/graphql))
5. **Frontend** → Create UI ([React](/docs/glossary/terms/react), [Next.js](/docs/glossary/terms/nextjs), [SSR](/docs/glossary/terms/ssr))
6. **Testing** → Validate quality ([Unit](/docs/glossary/terms/unit-testing), [Integration](/docs/glossary/terms/integration-testing), [E2E](/docs/glossary/terms/e2e))
7. **Operations** → Monitor production (metrics, logs, traces)

**SpecWeave automates 80%+ of this workflow**, allowing teams to focus on business logic and innovation.

---

## Next Steps

### Learn More

- **Infrastructure**: [IaC Fundamentals](/docs/learn/infrastructure/iac-fundamentals) - Deep dive into Terraform, Kubernetes
- **Backend**: [Backend Development Guide](/docs/learn/backend/backend-fundamentals) - APIs, databases, authentication
- **Frontend**: [Frontend Development Guide](/docs/learn/frontend/frontend-fundamentals) - React, Next.js, state management
- **Testing**: [Testing Strategy Guide](/docs/learn/testing/testing-fundamentals) - TDD, E2E, test pyramid

### Glossary Terms

- [ADR](/docs/glossary/terms/adr), [API](/docs/glossary/terms/api), [CI/CD](/docs/glossary/terms/ci-cd), [Docker](/docs/glossary/terms/docker), [E2E](/docs/glossary/terms/e2e), [IaC](/docs/glossary/terms/iac), [Kubernetes](/docs/glossary/terms/kubernetes), [Microservices](/docs/glossary/terms/microservices), [Monolith](/docs/glossary/terms/monolith), [Next.js](/docs/glossary/terms/nextjs), [Node.js](/docs/glossary/terms/nodejs), [React](/docs/glossary/terms/react), [REST](/docs/glossary/terms/rest), [RFC](/docs/glossary/terms/rfc), [SSG](/docs/glossary/terms/ssg), [SSR](/docs/glossary/terms/ssr), [TDD](/docs/glossary/terms/tdd), [Terraform](/docs/glossary/terms/terraform)

---

**Questions?** See the [FAQ](/docs/faq) or join our [GitHub Discussions](https://github.com/anton-abyzov/specweave/discussions).
