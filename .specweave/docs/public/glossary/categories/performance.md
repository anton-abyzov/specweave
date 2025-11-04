---
id: performance-category
title: Performance & Scalability
sidebar_label: Performance & Scalability
---

# Performance & Scalability

Understanding how to build fast, scalable systems that handle growth.

---

## Overview

Performance and scalability terms cover the practices, patterns, and technologies for building systems that respond quickly and handle increasing load. These concepts enable teams to deliver excellent user experiences while managing costs and complexity as the system grows.

## Core Concepts

### Caching Strategies

**[Caching](/docs/glossary/terms/caching)**
- Store frequently accessed data in fast storage
- Levels: Browser, CDN, Application, Database
- Types: In-memory (Redis), HTTP, Query result
- Benefits: Faster response, reduced database load

**[Redis](/docs/glossary/terms/redis)**
- In-memory data store (key-value)
- Use cases: caching, session storage, rate limiting
- Fast: microsecond latency
- SpecWeave uses Redis for hook debouncing

**[CDN (Content Delivery Network)](/docs/glossary/terms/cdn)**
- Distributed network of servers for static content
- Benefits: faster load times, reduced server load
- Providers: CloudFront, Cloudflare, Fastly
- Use for: images, CSS, JavaScript, videos

### Scaling Patterns

**[Horizontal Scaling](/docs/glossary/terms/horizontal-scaling)**
- Add more servers (scale out)
- Benefits: handle more traffic, fault tolerance
- Requires: load balancer, stateless design
- Example: 1 server → 10 servers

**[Vertical Scaling](/docs/glossary/terms/vertical-scaling)**
- Increase server resources (scale up)
- Benefits: simpler, no code changes
- Limits: hardware ceiling, single point of failure
- Example: 2 CPU → 16 CPU

**[Load Balancing](/docs/glossary/terms/load-balancing)**
- Distribute traffic across multiple servers
- Algorithms: Round Robin, Least Connections, IP Hash
- Tools: Nginx, HAProxy, AWS ELB
- Benefits: high availability, better performance

### Database Optimization

**[Database Indexing](/docs/glossary/terms/database-indexing)**
- Speed up queries by creating indexes
- Trade-off: faster reads, slower writes
- Types: B-tree, Hash, Full-text
- When to use: frequently queried columns (WHERE, JOIN)

**[Query Optimization](/docs/glossary/terms/query-optimization)**
- Improve database query performance
- Techniques: EXPLAIN plan, avoid N+1, use indexes
- Tools: pg_stat_statements (PostgreSQL), slow query log
- Target: &lt;100ms for most queries

**[Connection Pooling](/docs/glossary/terms/connection-pooling)**
- Reuse database connections
- Benefits: faster queries, lower overhead
- Tools: PgBouncer (PostgreSQL), HikariCP (Java)
- Typical pool size: 10-100 connections

### Performance Monitoring

**[APM (Application Performance Monitoring)](/docs/glossary/terms/apm)**
- Monitor application performance in production
- Metrics: response time, error rate, throughput
- Tools: Datadog, New Relic, AppDynamics
- Benefits: identify bottlenecks, track SLOs

**[Profiling](/docs/glossary/terms/profiling)**
- Analyze code performance (CPU, memory)
- Identify hotspots (slow functions)
- Tools: Chrome DevTools, Node.js profiler, py-spy
- When to use: performance issues, optimization

**[Metrics](/docs/glossary/terms/metrics)**
- Quantitative measurements of system behavior
- Types: RED (Rate, Errors, Duration), USE (Utilization, Saturation, Errors)
- Storage: Prometheus, InfluxDB, CloudWatch
- Visualization: Grafana, Datadog

---

## When to Use These Terms

| Term | Use When | Don't Use When |
|------|----------|----------------|
| **Caching** | Frequently accessed data, expensive queries | Real-time data, frequently changing data |
| **Redis** | Session storage, rate limiting, caching | Primary data store, complex queries |
| **CDN** | Static content, global users | Dynamic content, single region |
| **Horizontal Scaling** | Need high availability, traffic spikes | Simple apps, state management hard |
| **Vertical Scaling** | Quick fix, stateful apps | Long-term growth, cost optimization |
| **Load Balancing** | Multiple servers, high availability | Single server, low traffic |
| **Database Indexing** | Slow queries, large tables | Small tables, write-heavy workloads |
| **APM** | Production monitoring, debugging | Local development only |

---

## Real-World Examples

### Scaling a Web Application (0 → 1M Users)

**Phase 1: Single Server (0-1K users)**

```
Architecture:
┌─────────────────────────────────┐
│  EC2 Instance (t3.medium)       │
│  - Node.js App                  │
│  - PostgreSQL                   │
│  - Static files                 │
└─────────────────────────────────┘

Performance:
- Response time: 50ms
- Requests/sec: 100
- Database queries: 1000/sec
- Cost: $50/month

Problems at scale: None yet (MVP)
```

**Phase 2: Separate Database (1K-10K users)**

```
Architecture:
┌─────────────────────┐      ┌──────────────────┐
│  EC2 (t3.large)     │ ───> │  RDS PostgreSQL  │
│  - Node.js App      │      │  (db.t3.medium)  │
│  - Static files     │      └──────────────────┘
└─────────────────────┘

Improvements:
✅ Database on separate server (vertical scaling)
✅ Independent scaling (app vs database)
✅ Automated backups (RDS)

Performance:
- Response time: 40ms (faster queries)
- Requests/sec: 500
- Cost: $200/month

Problems: Database becoming bottleneck
```

**Phase 3: Add Caching + CDN (10K-100K users)**

```
Architecture:
                     ┌──────────────┐
                     │  CloudFront  │ (CDN)
                     │  Static files│
                     └──────────────┘
                            │
┌─────────────┐      ┌─────▼──────┐      ┌────────────┐
│  Redis      │ <──> │  App       │ ───> │ PostgreSQL │
│  (Cache)    │      │  (3 servers)│      │  (RDS)     │
└─────────────┘      └────────────┘      └────────────┘

Improvements:
✅ Redis cache (frequently accessed data)
✅ CDN for static files (images, CSS, JS)
✅ Horizontal scaling (3 app servers)
✅ Load balancer (distribute traffic)

Performance:
- Response time: 20ms (cache hits)
- Cache hit rate: 85% (fewer DB queries)
- Requests/sec: 5,000
- Cost: $800/month

Cache strategy:
// Check cache first
const user = await redis.get(`user:${id}`);
if (user) return JSON.parse(user);

// Cache miss → fetch from DB
const userFromDb = await db.users.findById(id);

// Store in cache (TTL: 5 minutes)
await redis.setex(`user:${id}`, 300, JSON.stringify(userFromDb));

return userFromDb;
```

**Phase 4: Database Optimization (100K-500K users)**

```
Architecture:
                     ┌──────────────┐
                     │  CloudFront  │
                     └──────────────┘
                            │
┌─────────────┐      ┌─────▼──────┐      ┌────────────────────┐
│  Redis      │ <──> │  App       │ ───> │ PostgreSQL Primary │
│  (Cache)    │      │  (10 servers)│     │  (write)           │
└─────────────┘      └────────────┘      └───────┬────────────┘
                            │                     │
                            │              ┌──────▼──────────────┐
                            └────────────> │ PostgreSQL Replica  │
                                           │ (read)              │
                                           └─────────────────────┘

Improvements:
✅ Read replica (separate read/write)
✅ Database indexes (faster queries)
✅ Connection pooling (PgBouncer)
✅ Query optimization (EXPLAIN plans)

Performance:
- Response time: 15ms
- Database queries: 100,000/sec
- Cache hit rate: 90%
- Cost: $3,000/month

Database optimizations:
-- Add index on frequently queried column
CREATE INDEX idx_users_email ON users(email);

-- Use connection pooling
PgBouncer: 100 connections → PostgreSQL: 10 connections

-- Read/write split
const user = await readDb.users.findById(id); // Read replica
await writeDb.users.update(id, data);         // Primary
```

**Phase 5: Microservices + Multi-Region (500K-1M+ users)**

```
Architecture:
                   ┌───────────────────┐
                   │  CloudFront       │
                   │  (Multi-region)   │
                   └─────────┬─────────┘
                             │
      ┌──────────────────────┼──────────────────────┐
      │                      │                      │
┌─────▼─────┐         ┌──────▼──────┐        ┌─────▼─────┐
│  US-East  │         │  US-West    │        │  EU       │
│  Region   │         │  Region     │        │  Region   │
└───────────┘         └─────────────┘        └───────────┘

Each region:
- 20+ app servers (Kubernetes auto-scaling)
- Redis cluster (high availability)
- PostgreSQL Aurora (multi-AZ)
- Separate microservices (User, Order, Payment)

Improvements:
✅ Multi-region (low latency globally)
✅ Microservices (independent scaling)
✅ Auto-scaling (handle traffic spikes)
✅ Database sharding (horizontal partitioning)

Performance:
- Response time: 10ms (regional)
- Requests/sec: 100,000+
- Availability: 99.99%
- Cost: $50,000/month
```

### Performance Optimization Example

```typescript
// ❌ SLOW - N+1 Query Problem
async function getUsersWithPosts() {
  const users = await db.users.findMany(); // 1 query

  for (const user of users) {
    user.posts = await db.posts.findMany({ userId: user.id }); // N queries!
  }

  return users;
}
// Total queries: 1 + N (if 100 users → 101 queries!)
// Response time: 5000ms (5 seconds!)

// ✅ FAST - Single Query with JOIN
async function getUsersWithPosts() {
  const users = await db.users.findMany({
    include: { posts: true } // JOIN in single query
  });

  return users;
}
// Total queries: 1
// Response time: 50ms (100x faster!)

// ✅ FASTER - Add Caching
async function getUsersWithPosts() {
  // Check cache first
  const cached = await redis.get('users:with-posts');
  if (cached) return JSON.parse(cached);

  // Cache miss → fetch from database
  const users = await db.users.findMany({
    include: { posts: true }
  });

  // Store in cache (5 minutes)
  await redis.setex('users:with-posts', 300, JSON.stringify(users));

  return users;
}
// Cache hit: 2ms (25x faster!)
// Cache miss: 50ms (same as before)
// Cache hit rate: 90% (most requests are 2ms)
```

### SpecWeave Performance Example

```markdown
# Increment 0050: Performance Optimization

## Acceptance Criteria
- **AC-US1-01**: API response time &lt;100ms (P95) (P1)
- **AC-US1-02**: Database queries &lt;50ms (P1)
- **AC-US1-03**: Cache hit rate >80% (P2)
- **AC-US1-04**: Handle 10K requests/sec (P2)

## Performance Baselines (Before)
- API response: 500ms (P95) ❌
- Database queries: 200ms (avg) ❌
- Cache hit rate: 0% (no caching) ❌
- Max throughput: 500 req/sec ❌

## Architecture Decisions

**ADR-050**: Implement Redis caching
- **Rationale**: 85% of requests are for same data, database bottleneck
- **Alternatives**: Memcached (less features), none (too slow)
- **Trade-offs**: Cache invalidation complexity vs performance

**ADR-051**: Add database read replica
- **Rationale**: 90% of queries are reads, primary DB overloaded
- **Alternatives**: Vertical scaling (expensive), none (too slow)
- **Trade-offs**: Replication lag vs cost

## Implementation Plan

**T-001**: Add Redis caching layer
- Install Redis (ElastiCache)
- Implement cache-aside pattern
- Cache: user data, product catalog, sessions
- TTL: 5 minutes (user data), 1 hour (products)
- Test: cache hits/misses, invalidation

**T-002**: Database query optimization
- Run EXPLAIN on slow queries
- Add indexes on: email, product_id, user_id
- Fix N+1 queries (use JOIN)
- Enable connection pooling (PgBouncer)
- Test: query times before/after

**T-003**: Add database read replica
- Create RDS read replica
- Configure read/write split
- Route: reads → replica, writes → primary
- Monitor: replication lag
- Test: load distribution

**T-004**: Performance testing
- Load test: 10K req/sec (k6)
- Stress test: find breaking point
- Measure: P50, P95, P99 latency
- Monitor: CPU, memory, database connections

**T-005**: Set up monitoring
- APM: Datadog (trace requests)
- Metrics: Prometheus + Grafana
- Alerts: response time >200ms, error rate >1%
- Dashboard: performance metrics

## Test Plan

**Given** 10K concurrent users → **When** load test → **Then** P95 latency &lt;100ms

**Test Cases**:
- Unit: Cache logic, connection pooling (85% coverage)
- Integration: Redis caching, database queries (80% coverage)
- Performance: Load testing, stress testing (100% critical endpoints)

## Performance Targets (After)
- API response: 50ms (P95) ✅
- Database queries: 20ms (avg) ✅
- Cache hit rate: 85% ✅
- Max throughput: 15K req/sec ✅

## Cost Impact
- Before: $500/month (database overloaded)
- After: $1,200/month (Redis + replica)
- Cost per user: $0.0012 (reduced by 60%!)
```

---

## How SpecWeave Uses Performance Terms

### 1. Performance-Focused Plugins

**specweave-observability plugin** (planned):
- Performance monitoring setup
- APM integration (Datadog, New Relic)
- Metric collection (Prometheus)
- Dashboard templates (Grafana)

### 2. Increment Planning for Performance

When creating performance increments:

```bash
/specweave:inc "API Performance Optimization"
```

The Architect agent:
- Identifies bottlenecks (profiling, metrics)
- Suggests optimizations (caching, indexing)
- Plans load testing strategy
- Includes monitoring setup

### 3. Living Documentation for Performance

Performance documentation in:
```
.specweave/docs/internal/
├── operations/
│   ├── performance-tuning.md   # Optimization guide
│   ├── monitoring-setup.md     # APM configuration
│   └── capacity-planning.md    # Scaling strategy
├── architecture/
│   ├── caching-strategy.md     # Cache design
│   └── adr/
│       └── 0050-redis-caching.md
└── delivery/
    └── load-testing.md         # Testing strategy
```

### 4. Performance Validation

```bash
/specweave:validate 0050 --performance

# Checks:
# ✅ Load tests pass (10K req/sec)
# ✅ P95 latency &lt;100ms
# ✅ Cache hit rate >80%
# ✅ Database queries indexed
# ✅ APM monitoring enabled
# ✅ Alerts configured
```

### 5. SpecWeave's Own Performance

SpecWeave optimizes its own performance:

```typescript
// Redis debouncing for hooks (prevents duplicate fires)
const lastFire = await redis.get('hook:post-task-completion:last-fire');
const now = Date.now();

if (lastFire && (now - parseInt(lastFire)) < 2000) {
  console.log('Debouncing: Hook fired &lt;2s ago, skipping');
  process.exit(0);
}

await redis.setex('hook:post-task-completion:last-fire', 10, now.toString());
```

---

## Related Categories

- **[Infrastructure & Operations](/docs/glossary/categories/infrastructure)** - Scaling infrastructure
- **[Backend Development](/docs/glossary/categories/backend)** - API optimization
- **[Testing & Quality](/docs/glossary/categories/testing)** - Performance testing

---

## Learn More

### Guides
- [Performance Tuning](/docs/operations/performance-tuning)
- [Caching Strategies (coming soon)](/docs/learn/foundations/caching)
- [Database Optimization (coming soon)](/docs/learn/foundations/database-optimization)

### Books
- "High Performance Browser Networking" by Ilya Grigorik
- "Designing Data-Intensive Applications" by Martin Kleppmann
- "Systems Performance" by Brendan Gregg
- "Database Internals" by Alex Petrov

### External Resources
- [Web.dev Performance](https://web.dev/performance/)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Redis Documentation](https://redis.io/docs/)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [AWS Well-Architected Framework (Performance)](https://aws.amazon.com/architecture/well-architected/)

---

**Navigation**:
- [← Back to Glossary](/docs/glossary/)
- [Browse by Category](/docs/glossary/index-by-category)
- [Alphabetical Index](/docs/glossary/README)
