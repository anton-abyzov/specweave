# Playbook: Slow API Response

## Symptoms

- API response time >1 second (degraded)
- API response time >5 seconds (critical)
- Users reporting slow loading
- Timeout errors (504 Gateway Timeout)
- Monitoring alert: "p95 response time >1s"

## Severity

- **SEV3** if response time 1-3 seconds
- **SEV2** if response time 3-5 seconds
- **SEV1** if response time >5 seconds or timeouts

## Diagnosis

### Step 1: Check Application Logs

```bash
# Find slow requests
grep "duration" /var/log/application.log | awk '{if ($5 > 1000) print}'

# Identify slow endpoint
awk '/duration/ {print $3, $5}' /var/log/application.log | sort -nk2 | tail -20

# Example output:
# /api/dashboard 8200ms  ← SLOW
# /api/users 50ms
# /api/posts 120ms
```

---

### Step 2: Measure Response Time Breakdown

**Total response time = Database + Application + Network**

```bash
# Use curl with timing
curl -w "@curl-format.txt" -o /dev/null -s http://api.example.com/endpoint

# curl-format.txt:
# time_namelookup:  %{time_namelookup}\n
# time_connect:  %{time_connect}\n
# time_starttransfer:  %{time_starttransfer}\n
# time_total:  %{time_total}\n
```

**Example breakdown**:
```
time_namelookup:    0.005s  (DNS)
time_connect:       0.010s  (TCP connect)
time_starttransfer: 8.200s  (Time to first byte) ← SLOW HERE
time_total:         8.250s

→ Problem is backend processing, not network
```

---

### Step 3: Check Database Query Time

```bash
# Check application logs for query time
grep "query.*duration" /var/log/application.log

# Example:
# query: SELECT * FROM users... duration: 7800ms  ← SLOW
```

**If database is slow** → See [database-diagnostics.md](../modules/database-diagnostics.md)

---

### Step 4: Check External API Calls

```bash
# Check logs for external API calls
grep "http.request" /var/log/application.log

# Example:
# http.request: GET https://api.external.com/data duration: 5000ms ← SLOW
```

---

## Mitigation

### Immediate (Now - 5 min)

**Option A: Add Database Index** (if DB is bottleneck)
```sql
-- Example: Missing index on last_login_at
CREATE INDEX CONCURRENTLY idx_users_last_login_at
ON users(last_login_at);

-- Impact: 7.8s → 50ms query time
-- Risk: Low (CONCURRENTLY = no table lock)
```

**Option B: Enable Caching** (if same data requested frequently)
```javascript
// Add Redis cache
const redis = require('redis').createClient();

app.get('/api/dashboard', async (req, res) => {
  // Check cache first
  const cached = await redis.get('dashboard:' + req.user.id);
  if (cached) return res.json(JSON.parse(cached));

  // Generate data
  const data = await generateDashboard(req.user.id);

  // Cache for 5 minutes
  await redis.setex('dashboard:' + req.user.id, 300, JSON.stringify(data));

  res.json(data);
});

// Impact: 8s → 10ms (cache hit)
// Risk: Low (data staleness acceptable for dashboard)
```

**Option C: Optimize Query** (if N+1 query)
```javascript
// BAD: N+1 queries
const users = await db.query('SELECT * FROM users');
for (const user of users) {
  const posts = await db.query('SELECT * FROM posts WHERE user_id = ?', [user.id]);
  user.posts = posts;
}

// GOOD: Single query with JOIN
const users = await db.query(`
  SELECT users.*, posts.*
  FROM users
  LEFT JOIN posts ON posts.user_id = users.id
`);
```

---

### Short-term (5 min - 1 hour)

**Option A: Add Timeout** (if external API is slow)
```javascript
// Add timeout to external API call
const response = await fetch('https://api.external.com/data', {
  timeout: 2000, // 2 second timeout
});

// If timeout, use fallback data
if (!response.ok) {
  return fallbackData;
}

// Impact: Prevents slow external API from blocking response
// Risk: Low (fallback data acceptable)
```

**Option B: Async Processing** (if computation is heavy)
```javascript
// BAD: Synchronous heavy computation
app.post('/api/process', async (req, res) => {
  const result = await heavyComputation(req.body); // 10 seconds
  res.json(result);
});

// GOOD: Async processing with job queue
app.post('/api/process', async (req, res) => {
  const jobId = await queue.add('process', req.body);
  res.status(202).json({ jobId, status: 'processing' });
});

// Client polls for result
app.get('/api/job/:id', async (req, res) => {
  const job = await queue.getJob(req.params.id);
  res.json({ status: job.status, result: job.result });
});

// Impact: API responds immediately (202 Accepted)
// Risk: Low (client needs to handle async pattern)
```

**Option C: Pagination** (if returning large dataset)
```javascript
// BAD: Return all 10,000 records
app.get('/api/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users');
  res.json(users); // Huge payload
});

// GOOD: Pagination
app.get('/api/users', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const users = await db.query('SELECT * FROM users LIMIT ? OFFSET ?', [limit, offset]);
  res.json({ data: users, page, limit });
});

// Impact: 8s → 200ms (smaller dataset)
// Risk: Low (clients usually want pagination anyway)
```

---

### Long-term (1 hour+)

- [ ] Add response time monitoring (p95, p99)
- [ ] Add APM (Application Performance Monitoring)
- [ ] Optimize database queries (add indexes, reduce JOINs)
- [ ] Add caching layer (Redis, Memcached)
- [ ] Implement pagination for large datasets
- [ ] Move heavy computation to background jobs
- [ ] Add timeout for external APIs
- [ ] Add E2E test: API response <1s
- [ ] Review and optimize N+1 queries

---

## Common Root Causes

| Symptom | Root Cause | Solution |
|---------|------------|----------|
| 7.8s query time | Missing database index | CREATE INDEX |
| 10,000 records returned | No pagination | Add LIMIT/OFFSET |
| 50 queries for 1 request | N+1 query problem | Use JOIN or DataLoader |
| 5s external API call | No timeout | Add timeout + fallback |
| Heavy computation | Sync processing | Async job queue |
| Same data fetched repeatedly | No caching | Add Redis cache |

---

## Escalation

**Escalate to developer if**:
- Application code needs optimization
- N+1 query problem

**Escalate to DBA if**:
- Database performance issue
- Need help with query optimization

**Escalate to external team if**:
- External API consistently slow
- Need to negotiate SLA

---

## Related Runbooks

- [02-database-deadlock.md](02-database-deadlock.md) - If database locked
- [../modules/database-diagnostics.md](../modules/database-diagnostics.md) - Database troubleshooting
- [../modules/backend-diagnostics.md](../modules/backend-diagnostics.md) - Backend troubleshooting

---

## Post-Incident

After resolving:
- [ ] Create post-mortem
- [ ] Identify root cause (DB, external API, N+1, etc.)
- [ ] Add performance test (response time <1s)
- [ ] Add monitoring alert
- [ ] Update this runbook if needed
