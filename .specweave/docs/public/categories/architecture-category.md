---
sidebar_position: 2
---

# 🏗️ Architecture & Design

System architecture, design patterns, and architectural decision making.

## Core Architecture Documents

### [HLD](../terms/hld.md)
High-Level Design - System-level architecture document describing overall structure, major components, and their interactions.

**When to Use**: New systems, major refactoring, complex features, cross-team projects

**Key Features**:
- ✅ System context (C4 Level 1)
- ✅ Architecture diagrams
- ✅ Technology stack decisions
- ✅ Scalability & performance strategy

---

### [ADR](../terms/adr.md)
Architecture Decision Record - Documents why we chose option X over option Y, preserving institutional knowledge.

**When to Use**: After implementing major architecture changes

**Key Features**:
- ✅ Immutable record (create new ADR to supersede)
- ✅ Context, decision, consequences
- ✅ Alternatives considered
- ✅ Links to related RFCs and specs

---

### LLD (Low-Level Design)
Component-level design details including classes, functions, algorithms, and data structures.

**When to Use**: Complex components, algorithms, before implementation

---

## Design Patterns & Practices

### C4 Model
Architecture visualization framework with four levels: Context, Container, Component, Code.

**Tools**: Mermaid diagrams, PlantUML

---

### Domain-Driven Design (DDD)
Software design approach focused on modeling based on business domain.

**Key Concepts**:
- Bounded contexts
- Aggregates
- Domain events
- Ubiquitous language

---

### SOLID Principles
Five design principles for object-oriented programming:
- **S**ingle Responsibility
- **O**pen/Closed  
- **L**iskov Substitution
- **I**nterface Segregation
- **D**ependency Inversion

---

## Architecture Patterns

### Microservices
Distributed architecture pattern where system is composed of loosely coupled services.

**Benefits**: Independent deployment, scalability, technology flexibility

**Challenges**: Distributed complexity, eventual consistency, monitoring

---

### Monolith
Single-tier architecture where all components run in one process.

**Benefits**: Simple deployment, strong consistency, easier debugging

**When to Use**: Small teams, early-stage products, simple domains

---

### Event-Driven Architecture
System where components communicate via events (asynchronous messaging).

**Use Cases**: Real-time systems, microservices, scalable systems

**Tools**: Kafka, RabbitMQ, AWS EventBridge

---

## API Design

### REST (Representational State Transfer)
Architectural style for distributed hypermedia systems using HTTP verbs.

**Best Practices**: Resource-oriented URLs, proper status codes, versioning

---

### GraphQL
Query language for APIs allowing clients to request exactly what they need.

**Benefits**: Single endpoint, no over-fetching, strong typing

---

### gRPC
High-performance RPC framework using Protocol Buffers.

**Use Cases**: Microservices communication, high-throughput systems

---

## Related Categories

- [SpecWeave Core](./specweave-category.md) - Framework fundamentals
- [Infrastructure & Operations](./infrastructure-category.md) - DevOps, deployment
- [Backend Development](./backend-category.md) - Server-side development
- [Frontend Development](./frontend-category.md) - Client-side development

---

**Browse all terms**: [Complete Glossary](../glossary.md)
