# Performance Tuning Guide

**Purpose**: Optimize system performance through profiling, benchmarking, and targeted improvements.

**Last Updated**: 2025-11-04
**Owner**: Engineering Team + DevOps

---

## Performance Targets

| Metric | Target | Method |
|--------|--------|--------|
| **API Response Time (p95)** | < 200ms | APM (Application Performance Monitoring) |
| **Database Query Time (p95)** | < 50ms | Slow query log |
| **Page Load Time (p95)** | < 2s | Lighthouse, WebPageTest |
| **Time to Interactive (TTI)** | < 3s | Lighthouse |
| **First Contentful Paint (FCP)** | < 1s | Lighthouse |
| **CPU Usage** | < 70% | CloudWatch, DataDog |
| **Memory Usage** | < 80% | CloudWatch, DataDog |
| **Error Rate** | < 0.1% | Error tracking (Sentry) |

**Tool**: Lighthouse (frontend), APM (backend), CloudWatch (infrastructure)

---

## Performance Profiling

### Backend (Node.js/TypeScript)

**Tool**: Node.js built-in profiler, Clinic.js

**Steps**:
```bash
# 1. Profile CPU usage
node --prof app.js

# 2. Generate report
node --prof-process isolate-*.log > profile.txt

# 3. Analyze report
# Look for hot paths (functions taking most time)
```

**Clinic.js** (better visualization):
```bash
# Install
npm install -g clinic

# Profile CPU
clinic doctor -- node app.js

# Profile memory
clinic heapprofiler -- node app.js

# Profile event loop
clinic bubbleprof -- node app.js
```

**What to Look For**:
- ⚠️  Functions taking > 10% of total time
- ⚠️  Long-running synchronous operations
- ⚠️  Memory leaks (heap size growing unbounded)

### Frontend (React/JavaScript)

**Tool**: Chrome DevTools, React Profiler

**Steps**:
```bash
# 1. Open Chrome DevTools (F12)
# 2. Go to Performance tab
# 3. Click Record
# 4. Perform slow actions
# 5. Stop recording

# Analyze:
# - Long Tasks (> 50ms, blocks UI)
# - Excessive re-renders
# - Large bundle sizes
```

**React Profiler**:
```jsx
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  if (actualDuration > 16) {  // > 16ms = dropped frame
    console.warn(`Slow render: ${id} took ${actualDuration}ms`);
  }
}

<Profiler id="MyComponent" onRender={onRenderCallback}>
  <MyComponent />
</Profiler>
```

### Database (PostgreSQL/MySQL)

**Tool**: Slow query log, EXPLAIN

**Steps**:
```bash
# 1. Enable slow query log (PostgreSQL)
# postgresql.conf:
log_min_duration_statement = 50  # Log queries > 50ms

# 2. Analyze slow queries
tail -f /var/log/postgresql/postgresql.log

# 3. Use EXPLAIN to understand query plan
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';
```

**What to Look For**:
- ⚠️  Sequential scans (should be index scans)
- ⚠️  High cost estimates
- ⚠️  Nested loops on large tables
- ⚠️  Missing indexes

---

## Common Performance Issues

### 1. N+1 Query Problem

**Problem**: Fetching related data in a loop

**Example (Bad)**:
```typescript
// ❌ Bad - N+1 query (1 query for orders, N queries for users)
const orders = await db.query('SELECT * FROM orders');
for (const order of orders) {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [order.userId]);
  console.log(user.name);
}
```

**Solution (Good)**:
```typescript
// ✅ Good - Single query with JOIN
const orders = await db.query(`
  SELECT orders.*, users.name
  FROM orders
  JOIN users ON orders.user_id = users.id
`);
```

**Impact**: 100 orders = 101 queries → 1 query (100x faster!)

### 2. Missing Database Indexes

**Problem**: Queries scanning entire table instead of using index

**Identify**:
```sql
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
-- If you see "Seq Scan" → missing index
```

**Solution**:
```sql
-- ✅ Good - Add index
CREATE INDEX idx_users_email ON users(email);

-- Verify
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
-- Now shows "Index Scan"
```

**Impact**: Query time: 500ms → 5ms (100x faster!)

### 3. Large API Responses

**Problem**: Returning entire dataset instead of paginated results

**Example (Bad)**:
```typescript
// ❌ Bad - Return all 10,000 users
app.get('/api/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users');
  res.json(users);  // 10MB response!
});
```

**Solution (Good)**:
```typescript
// ✅ Good - Paginate
app.get('/api/users', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const users = await db.query('SELECT * FROM users LIMIT $1 OFFSET $2', [limit, offset]);
  res.json({
    users,
    page,
    total: await db.query('SELECT COUNT(*) FROM users')
  });
});
```

**Impact**: Response size: 10MB → 100KB (100x smaller!)

### 4. Synchronous Operations Blocking Event Loop

**Problem**: CPU-intensive operations blocking Node.js event loop

**Example (Bad)**:
```typescript
// ❌ Bad - Blocks event loop
app.post('/api/process', (req, res) => {
  const result = expensiveComputation(req.body);  // 1 second sync operation
  res.json(result);
});
```

**Solution (Good)**:
```typescript
// ✅ Good - Use worker threads
import { Worker } from 'worker_threads';

app.post('/api/process', async (req, res) => {
  const worker = new Worker('./worker.js', {
    workerData: req.body
  });

  worker.on('message', result => res.json(result));
  worker.on('error', err => res.status(500).json({ error: err.message }));
});
```

**Impact**: Server can handle other requests while processing

### 5. Excessive Re-renders (React)

**Problem**: Component re-rendering unnecessarily

**Example (Bad)**:
```jsx
// ❌ Bad - Re-renders on every parent update
function UserList({ users }) {
  return users.map(user => <User key={user.id} user={user} />);
}

function User({ user }) {
  return <div>{user.name}</div>;
}
```

**Solution (Good)**:
```jsx
// ✅ Good - Memoize to prevent unnecessary re-renders
import { memo } from 'react';

const User = memo(({ user }) => {
  return <div>{user.name}</div>;
});

function UserList({ users }) {
  return users.map(user => <User key={user.id} user={user} />);
}
```

**Impact**: Re-renders: 100/sec → 1/sec (100x fewer!)

### 6. Large Bundle Size (Frontend)

**Problem**: Shipping too much JavaScript

**Analyze**:
```bash
# Analyze bundle size
npm run build
npx webpack-bundle-analyzer dist/stats.json
```

**Solution**:
```typescript
// ✅ Good - Code splitting with dynamic imports
import React, { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

**Impact**: Initial bundle: 2MB → 200KB (10x smaller!)

---

## Optimization Techniques

### Caching

**In-Memory Cache (Redis)**:
```typescript
// ✅ Good - Cache expensive queries
import Redis from 'ioredis';
const redis = new Redis();

async function getUserById(id: string): Promise<User> {
  // Check cache first
  const cached = await redis.get(`user:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss - query database
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);  // Cache for 1 hour
  return user;
}
```

**HTTP Cache (CDN)**:
```typescript
// ✅ Good - Cache static assets
app.get('/api/public/stats', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');  // Cache for 1 hour
  res.json(stats);
});
```

### Database Query Optimization

**Use Indexes**:
```sql
-- ✅ Good - Composite index for common query
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

SELECT * FROM orders WHERE user_id = 123 AND status = 'pending';
```

**Avoid SELECT \***:
```sql
-- ❌ Bad - Fetch all columns
SELECT * FROM users WHERE id = 123;

-- ✅ Good - Fetch only needed columns
SELECT id, name, email FROM users WHERE id = 123;
```

**Use Connection Pooling**:
```typescript
// ✅ Good - Connection pool
import { Pool } from 'pg';
const pool = new Pool({
  max: 20,  // Max 20 connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Lazy Loading

**Images**:
```jsx
// ✅ Good - Lazy load images
<img src="image.jpg" loading="lazy" alt="Description" />
```

**Components**:
```typescript
// ✅ Good - Lazy load routes
const Dashboard = lazy(() => import('./Dashboard'));
```

### Compression

**API Responses**:
```typescript
// ✅ Good - Gzip compression
import compression from 'compression';
app.use(compression());
```

**Static Assets**:
```bash
# ✅ Good - Compress assets at build time
gzip -9 dist/*.js
gzip -9 dist/*.css
```

---

## Monitoring & Alerts

### Key Metrics

**APM (Application Performance Monitoring)**:
- API response time (p50, p95, p99)
- Database query time
- Error rate
- Throughput (requests/sec)

**Infrastructure**:
- CPU usage (% utilization)
- Memory usage (% utilization)
- Disk I/O (read/write MB/s)
- Network I/O (bandwidth)

**Alerts**:
- ⚠️  API response time p95 > 500ms
- ⚠️  Database query time p95 > 100ms
- ⚠️  CPU usage > 80% for 5 minutes
- ⚠️  Memory usage > 90%
- ⚠️  Error rate > 1%

**Tools**:
- DataDog, New Relic (APM)
- AWS CloudWatch (infrastructure)
- Sentry (error tracking)

---

## Performance Testing

### Load Testing

**Tool**: k6, Artillery

**Example (k6)**:
```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)\<500'],  // 95% of requests < 500ms
  },
};

export default function () {
  let res = http.get('https://api.example.com/users');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

**Run**:
```bash
k6 run load-test.js
```

### Stress Testing

**Goal**: Find breaking point (max capacity)

**Example**:
```javascript
export let options = {
  stages: [
    { duration: '10m', target: 1000 },  // Ramp up to 1000 users
    { duration: '30m', target: 1000 },  // Sustain 1000 users
  ],
};
```

---

## Performance Checklist

**Backend**:
- [ ] Database indexes on frequently queried columns
- [ ] Connection pooling configured
- [ ] N+1 queries eliminated
- [ ] Expensive queries cached (Redis)
- [ ] API responses paginated
- [ ] Compression enabled (gzip)
- [ ] Rate limiting to prevent abuse

**Frontend**:
- [ ] Code splitting (lazy loading)
- [ ] Images optimized (WebP, lazy loading)
- [ ] Bundle size < 500KB (initial load)
- [ ] Memoization for expensive components
- [ ] Service worker for offline caching
- [ ] Lighthouse score > 90

**Database**:
- [ ] Indexes on foreign keys
- [ ] Slow query log enabled (> 50ms)
- [ ] Connection pooling
- [ ] Query result caching

**Infrastructure**:
- [ ] CDN for static assets
- [ ] Auto-scaling configured
- [ ] Horizontal scaling ready (stateless)
- [ ] Load balancer configured

---

## Related Documentation

- [DORA Metrics](../delivery/dora-metrics.md) - Lead time, deployment frequency
- **Monitoring & Alerting** - *Coming soon* - Observability and monitoring setup
- **SLO Definitions** - *Coming soon* - Service level objectives and performance targets
- **Incident Response** - *Coming soon* - Performance incident handling procedures

---

## References

- [Google Web Vitals](https://web.dev/vitals/) - Frontend performance metrics
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/) - Backend optimization
- [Database Indexing Guide](https://use-the-index-luke.com/) - SQL optimization
- [k6 Documentation](https://k6.io/docs/) - Load testing
