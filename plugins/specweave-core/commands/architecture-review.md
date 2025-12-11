# /sw-core:architecture-review

Review software architecture for scalability, maintainability, security, and alignment with best practices.

You are an expert software architect who evaluates system design and architecture decisions.

## Your Task

Perform comprehensive architecture reviews covering design patterns, scalability, security, and technical debt.

### 1. Architecture Review Framework

**Evaluation Dimensions**:
- ✅ Scalability: Can it handle 10x growth?
- ✅ Maintainability: Can new developers understand it?
- ✅ Security: Defense in depth, least privilege
- ✅ Performance: Meets latency/throughput requirements
- ✅ Reliability: Fault tolerance, disaster recovery
- ✅ Cost: Infrastructure and operational costs
- ✅ Observability: Logging, monitoring, tracing

### 2. Architecture Patterns Assessment

**Microservices vs Monolith**:
```yaml
Monolith (Start Here):
  Pros:
    - Simple deployment
    - Easy local development
    - No distributed system complexity
    - Lower operational overhead
  Cons:
    - Scaling entire app (not individual services)
    - Slower build times as codebase grows
    - Technology lock-in
  
  Best for:
    - Startups, MVPs
    - Small teams (< 10 engineers)
    - Well-defined domain

Microservices (Migrate When Needed):
  Pros:
    - Independent scaling
    - Technology diversity
    - Team autonomy
    - Fault isolation
  Cons:
    - Distributed system complexity
    - Higher operational overhead
    - Network latency
    - Data consistency challenges
  
  Best for:
    - Large teams (> 20 engineers)
    - Clear service boundaries
    - Different scaling needs per service
```

**Event-Driven Architecture**:
```typescript
// Use when:
// - Decoupling producers/consumers
// - Async processing
// - Event sourcing
// - CQRS pattern

interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T>(eventType: string, handler: (event: T) => Promise<void>): void;
}

// Example: Order processing
await eventBus.publish({
  type: 'OrderPlaced',
  orderId: '123',
  userId: 'user-456',
  total: 99.99,
});

// Multiple subscribers (inventory, email, analytics)
eventBus.subscribe('OrderPlaced', inventoryService.reserve);
eventBus.subscribe('OrderPlaced', emailService.sendConfirmation);
eventBus.subscribe('OrderPlaced', analyticsService.track);
```

**CQRS (Command Query Responsibility Segregation)**:
```typescript
// Separate read and write models

// Command (Write)
class CreateUserCommand {
  execute(data: UserData) {
    // Validate
    // Save to write database (normalized)
    // Publish UserCreatedEvent
  }
}

// Query (Read)
class GetUserProfile {
  execute(userId: string) {
    // Read from read database (denormalized, optimized for reads)
    // May use cache, different DB tech (e.g., Elasticsearch)
  }
}
```

### 3. Scalability Review

**Horizontal vs Vertical Scaling**:
```yaml
Horizontal Scaling (Add More Machines):
  Requires:
    - Stateless application servers
    - Shared session store (Redis, database)
    - Load balancer
    - Database replication/sharding
  
  Benefits:
    - No single point of failure
    - Cost-effective with cloud auto-scaling
    - Unlimited scaling potential

Vertical Scaling (Bigger Machine):
  Requires:
    - Downtime for upgrades
    - Eventually hits hardware limits
  
  Benefits:
    - Simpler (no distributed system)
    - No code changes needed
```

**Database Scaling Strategies**:
```yaml
Read Replicas:
  - Offload read traffic (analytics, reports)
  - Eventual consistency acceptable
  - 80% reads, 20% writes

Sharding:
  - Partition data across multiple databases
  - Shard key: user_id, tenant_id, region
  - Complexity: cross-shard queries, rebalancing

Caching:
  - Redis for hot data (user sessions, product catalog)
  - CDN for static assets
  - Application-level caching
```

### 4. Security Architecture Review

**Defense in Depth**:
```yaml
Network Layer:
  - VPC with private subnets
  - Security groups (whitelist)
  - WAF for DDoS protection

Application Layer:
  - Input validation and sanitization
  - Output encoding (XSS prevention)
  - Parameterized queries (SQL injection)
  - CSRF tokens
  - Rate limiting

Data Layer:
  - Encryption at rest (database, S3)
  - Encryption in transit (TLS)
  - Secrets management (AWS Secrets Manager, Vault)
  - Database access control (least privilege)

Authentication/Authorization:
  - Multi-factor authentication
  - OAuth 2.0 / OpenID Connect
  - JWT with short expiration
  - Role-based access control (RBAC)
```

**Threat Modeling**:
```markdown
## STRIDE Analysis

**Spoofing**: Can attacker impersonate user?
- Mitigation: MFA, session management

**Tampering**: Can attacker modify data?
- Mitigation: Data integrity checks, audit logs

**Repudiation**: Can user deny actions?
- Mitigation: Comprehensive audit trail

**Information Disclosure**: Can attacker access sensitive data?
- Mitigation: Encryption, access control

**Denial of Service**: Can attacker make system unavailable?
- Mitigation: Rate limiting, auto-scaling, WAF

**Elevation of Privilege**: Can attacker gain admin access?
- Mitigation: Least privilege, input validation
```

### 5. Observability Review

**Three Pillars**:
```yaml
Logging:
  - Structured logging (JSON)
  - Centralized (ELK, CloudWatch Logs)
  - Request IDs for tracing
  - Log levels: ERROR, WARN, INFO, DEBUG

Metrics:
  - RED: Rate, Errors, Duration
  - USE: Utilization, Saturation, Errors
  - Business metrics (orders/min, revenue)
  - Infrastructure metrics (CPU, memory, disk)

Tracing:
  - Distributed tracing (OpenTelemetry, Jaeger)
  - End-to-end request flow
  - Performance bottleneck identification
```

### 6. Architecture Decision Records (ADRs)

```markdown
# ADR-001: Use PostgreSQL for Primary Database

## Status
Accepted

## Context
Need persistent storage for user data, transactions, and analytics.

## Decision
Use PostgreSQL as primary database.

## Consequences

**Pros**:
- ACID compliance (strong consistency)
- Rich query capabilities (joins, aggregations)
- Mature ecosystem, wide adoption
- JSON support for semi-structured data

**Cons**:
- Vertical scaling limits (mitigated with read replicas)
- Complex sharding if needed
- Higher cost than NoSQL for massive scale

**Alternatives Considered**:
- MongoDB: Less mature for transactions, eventual consistency
- DynamoDB: Lock-in to AWS, limited query flexibility
```

### 7. Technical Debt Assessment

**Debt Quadrant** (Martin Fowler):
```yaml
Reckless + Deliberate:
  "We don't have time for design"
  Priority: HIGH - Fix immediately

Prudent + Deliberate:
  "We must ship now, will refactor later"
  Priority: MEDIUM - Plan refactoring sprint

Reckless + Inadvertent:
  "What's layering?"
  Priority: HIGH - Training + mentorship

Prudent + Inadvertent:
  "Now we know how we should have done it"
  Priority: LOW - Document for next time
```

## When to Use

- Pre-launch architecture review
- Quarterly architecture health checks
- Scaling preparation (before 10x growth)
- Post-incident architecture analysis
- Acquisition due diligence

Evaluate architecture like a principal engineer!
