---
id: architecture-category
title: Architecture & Design
sidebar_label: Architecture & Design
---

# Architecture & Design

Understanding how systems are structured and decisions are made.

---

## Overview

Architecture and design terms cover the foundational concepts of building well-structured, maintainable software systems. These concepts help teams make informed decisions and document the rationale behind technical choices.

## Core Concepts

### Decision Documentation

**[ADR (Architecture Decision Record)](/docs/glossary/terms/adr)**
- Document capturing architectural decisions with context and consequences
- Preserves WHY decisions were made
- Essential for long-term maintainability
- SpecWeave stores ADRs in `.specweave/docs/internal/architecture/adr/`

**[RFC (Request for Comments)](/docs/glossary/terms/rfc)**
- Feature specification document (WHAT + WHY)
- Used for planning new features
- Different from ADR (which focuses on architecture decisions)
- SpecWeave creates RFCs during increment planning

### Architecture Patterns

**[Microservices](/docs/glossary/terms/microservices)**
- Architecture with independent, deployable services
- Benefits: scalability, technology diversity, fault isolation
- Challenges: complexity, distributed systems, data consistency
- When to use: large teams, need for independent scaling

**[Monolith](/docs/glossary/terms/monolith)**
- Single-tier application (all code in one codebase)
- Benefits: simplicity, easier debugging, faster development (initially)
- Challenges: scaling, technology lock-in, deployment risk
- When to use: small teams, early-stage products, simpler requirements

### Design Principles

**SOLID Principles** (coming soon)
- Single Responsibility
- Open/Closed
- Liskov Substitution
- Interface Segregation
- Dependency Inversion

**Domain-Driven Design (DDD)** (coming soon)
- Business-focused software design
- Ubiquitous language
- Bounded contexts
- Aggregate roots

---

## When to Use These Terms

| Term | Use When | Don't Use When |
|------|----------|----------------|
| **ADR** | Making major architecture decisions (database choice, framework selection) | Minor implementation details, obvious choices |
| **RFC** | Planning new features, gathering requirements | Quick bug fixes, trivial changes |
| **Microservices** | Large systems, multiple teams, need for independent scaling | Small teams, early-stage startups, simple requirements |
| **Monolith** | Small teams, early-stage products, rapid iteration needed | Large teams, need for independent deployments |

---

## Real-World Examples

### Startup Journey: Monolith → Microservices

**Phase 1: MVP (0-6 months)** - Monolith
- Team: 3 developers
- Architecture: Rails monolith
- Why: Fast development, simple deployment
- Result: Ship MVP in 3 months

**Phase 2: Growth (6-18 months)** - Still Monolith
- Team: 8 developers
- Same codebase
- Why: Still manageable, avoid premature optimization
- Result: 10K users, $50K MRR

**Phase 3: Scale (18+ months)** - Migrate to Microservices
- Team: 25 developers
- Break into services: User, Product, Order, Payment
- Why: Independent scaling, team autonomy
- Result: 100K users, $500K MRR

### Documentation Example: ADR

```markdown
# ADR-005: Use PostgreSQL for Primary Database

## Status
Accepted (2025-10-15)

## Context
Need database for user management, transactions, reporting.

Options: PostgreSQL, MongoDB, DynamoDB

Requirements:
- ACID transactions (money transfers)
- Complex queries (reporting)
- Regulatory compliance (audit logs)

## Decision
Use PostgreSQL

Rationale:
1. ACID guarantees prevent data loss
2. Complex JOINs for reporting
3. Team has PostgreSQL experience
4. Mature tooling (pg_dump, Flyway)

## Consequences

✅ Benefits:
- Data integrity guaranteed
- Complex queries efficient
- Fast development (no learning curve)

❌ Trade-offs:
- Harder to scale horizontally (vs NoSQL)
- Schema migrations required (vs schemaless)

✅ Mitigations:
- Use read replicas for scaling
- Use connection pooling (PgBouncer)
```

---

## How SpecWeave Uses Architecture Terms

### 1. Increment Planning

When creating increments (`/specweave:inc`), the Architect agent:
- Creates ADRs for major decisions
- References existing architecture patterns
- Documents design rationale

### 2. Living Documentation

Architecture decisions are preserved in:
```
.specweave/docs/internal/architecture/
├── adr/                    # Architecture Decision Records
│   ├── 0001-use-typescript.md
│   ├── 0002-plugin-architecture.md
│   └── 0003-claude-code-first.md
├── diagrams/               # C4 diagrams, sequence diagrams
│   └── system-architecture.mmd
└── hld-system.md          # High-Level Design
```

### 3. Traceability

```
RFC-0005 (Feature Specification)
   ↓
ADR-0012 (Architecture Decision)
   ↓
Increment 0008 (Implementation)
   ↓
Living Docs (Documentation)
```

---

## Related Categories

- **[Infrastructure & Operations](/docs/glossary/categories/infrastructure)** - Deployment, scaling, operations
- **[Backend Development](/docs/glossary/categories/backend)** - Implementing architecture patterns
- **[Frontend Development](/docs/glossary/categories/frontend)** - UI architecture patterns

---

## Learn More

### Guides
- [Enterprise Application Development](/docs/learn/foundations/enterprise-app-development) - Complete architecture guide
- [Architecture Patterns (coming soon)](/docs/learn/foundations/architecture-patterns)

### Books
- "Clean Architecture" by Robert C. Martin
- "Building Microservices" by Sam Newman
- "Designing Data-Intensive Applications" by Martin Kleppmann
- "Domain-Driven Design" by Eric Evans

### External Resources
- [Architecture Decision Records (GitHub)](https://adr.github.io/)
- [C4 Model for Software Architecture](https://c4model.com/)
- [Martin Fowler's Architecture Blog](https://martinfowler.com/architecture/)

---

**Navigation**:
- [← Back to Glossary](/docs/glossary/)
- [Browse by Category](/docs/glossary/index-by-category)
- [Alphabetical Index](/docs/glossary/README)
