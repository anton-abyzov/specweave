---
name: software-architecture
description: Expert software architecture covering architectural patterns (microservices, monolith, event-driven, CQRS), scalability, distributed systems, CAP theorem, database architecture, API design, system design, domain-driven design (DDD), hexagonal architecture, and architecture decision records (ADRs). Activates for software architecture, system design, microservices, monolith, event-driven, CQRS, scalability, distributed systems, CAP theorem, DDD, hexagonal architecture, ADR.
---

# Software Architecture Expert

Master of architectural patterns, system design, and scalability.

## Architectural Patterns

**Layered Architecture**:
```
Presentation Layer (UI)
  ↓
Business Logic Layer (Services)
  ↓
Data Access Layer (Repositories)
  ↓
Database
```

**Hexagonal Architecture (Ports & Adapters)**:
```typescript
// Core Domain (business logic, no dependencies)
interface PaymentPort {
  process(amount: number): Promise<void>;
}

// Adapter (infrastructure)
class StripeAdapter implements PaymentPort {
  async process(amount: number) { /* Stripe API */ }
}

// Application uses port, not concrete implementation
class CheckoutService {
  constructor(private payment: PaymentPort) {}
}
```

**Event-Driven Architecture**:
```typescript
// Producer
eventBus.publish({ type: 'OrderPlaced', orderId: '123' });

// Consumers (decoupled)
eventBus.subscribe('OrderPlaced', inventoryService.reserve);
eventBus.subscribe('OrderPlaced', emailService.notify);
```

**CQRS** (Command Query Responsibility Segregation):
- Commands: Write operations, change state
- Queries: Read operations, no side effects
- Separate models for read/write optimization

## Scalability Patterns

**Horizontal Scaling**: Add more servers
**Vertical Scaling**: Bigger server
**Caching**: Redis, CDN, application cache
**Database Sharding**: Partition by key (user_id, region)
**Read Replicas**: Offload read traffic
**Load Balancing**: Distribute traffic evenly

## CAP Theorem

**Consistency**: All nodes see same data
**Availability**: Every request gets response
**Partition Tolerance**: System works despite network failures

Can only guarantee 2 of 3:
- **CP**: Consistent + Partition-tolerant (sacrifice availability)
- **AP**: Available + Partition-tolerant (eventual consistency)
- **CA**: Consistent + Available (no partition tolerance, single node)

## Domain-Driven Design

**Ubiquitous Language**: Shared vocabulary
**Bounded Contexts**: Explicit boundaries
**Aggregates**: Consistency boundaries
**Entities**: Objects with identity
**Value Objects**: Immutable, no identity
**Domain Events**: Business occurrences
