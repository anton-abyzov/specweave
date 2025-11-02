# Playbook: Cascade Failure

## Symptoms

- Multiple services failing simultaneously
- Failures spreading across services
- Dependency services timing out
- Error rate increasing exponentially
- Monitoring alert: "Multiple services degraded", "Cascade detected"

## Severity

- **SEV1** - Cascade affecting production services

## What is a Cascade Failure?

**Definition**: One service failure triggers failures in dependent services, spreading through the system.

**Example**:
```
Database slow (2s queries)
  ↓
API times out waiting for database (5s timeout)
  ↓
Frontend times out waiting for API (10s timeout)
  ↓
Load balancer marks frontend unhealthy
  ↓
Traffic routes to other frontends (overload them)
  ↓
All frontends fail → Complete outage
```

---

## Diagnosis

### Step 1: Identify Initial Failure Point

**Check Service Dependencies**:
```
Frontend → API → Database
         ↓
         Cache (Redis)
         ↓
         Queue (RabbitMQ)
         ↓
         External API
```

**Find the root**:
```bash
# Check service health (start with leaf dependencies)
# 1. Database
psql -c "SELECT 1"

# 2. Cache
redis-cli PING

# 3. Queue
rabbitmqctl status

# 4. External API
curl https://api.external.com/health

# First failure = likely root cause
```

---

### Step 2: Trace Failure Propagation

**Check Service Logs** (in order):
```bash
# Database logs (first)
tail -100 /var/log/postgresql/postgresql.log

# API logs (second)
tail -100 /var/log/api/error.log

# Frontend logs (third)
tail -100 /var/log/frontend/error.log
```

**Look for timestamps**:
```
14:00:00 - Database: Slow query (7s)  ← ROOT CAUSE
14:00:05 - API: Timeout error
14:00:10 - Frontend: API unavailable
14:00:15 - Load balancer: All frontends unhealthy
```

---

### Step 3: Assess Cascade Depth

**How many layers affected?**
- **1 layer**: Database only (isolated failure)
- **2-3 layers**: Database → API → Frontend (cascade)
- **4+ layers**: Full system cascade (critical)

---

## Mitigation

### Immediate (Now - 5 min)

**PRIORITY: Stop the cascade from spreading**

**Option A: Circuit Breaker** (if not already enabled)
```javascript
// Enable circuit breaker manually
// Prevents API from overwhelming database

const CircuitBreaker = require('opossum');

const dbQuery = new CircuitBreaker(queryDatabase, {
  timeout: 3000,        // 3s timeout
  errorThresholdPercentage: 50,  // Open after 50% failures
  resetTimeout: 30000   // Try again after 30s
});

dbQuery.on('open', () => {
  console.log('Circuit breaker OPEN - using fallback');
});

// Use fallback when circuit open
dbQuery.fallback(() => {
  return cachedData; // Return cached data instead
});
```

**Option B: Rate Limiting** (protect downstream)
```nginx
# Limit requests to database (nginx)
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
  limit_req zone=api burst=20 nodelay;
  proxy_pass http://api-backend;
}
```

**Option C: Shed Load** (reject non-critical requests)
```javascript
// Reject non-critical requests when overloaded
app.use((req, res, next) => {
  const load = getCurrentLoad(); // CPU, memory, queue depth

  if (load > 0.8 && !isCriticalEndpoint(req.path)) {
    return res.status(503).json({
      error: 'Service overloaded, try again later'
    });
  }

  next();
});

function isCriticalEndpoint(path) {
  return ['/api/health', '/api/payment'].includes(path);
}
```

**Option D: Isolate Failure** (take failing service offline)
```bash
# Remove failing service from load balancer
# AWS ELB:
aws elbv2 deregister-targets \
  --target-group-arn <arn> \
  --targets Id=i-1234567890abcdef0

# nginx:
# Comment out failing backend in upstream block
# upstream api {
#   server api1.example.com;  # Healthy
#   # server api2.example.com;  # FAILING - commented out
# }

# Impact: Prevents failing service from affecting others
# Risk: Reduced capacity
```

---

### Short-term (5 min - 1 hour)

**Option A: Fix Root Cause**

**If database slow**:
```sql
-- Add missing index
CREATE INDEX CONCURRENTLY idx_users_last_login ON users(last_login_at);
```

**If external API slow**:
```javascript
// Add timeout + fallback
const response = await fetch('https://api.external.com', {
  timeout: 2000  // 2s timeout
});

if (!response.ok) {
  return fallbackData; // Don't cascade failure
}
```

**If service overloaded**:
```bash
# Scale horizontally (add more instances)
# AWS Auto Scaling:
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name my-asg \
  --desired-capacity 10  # Was 5
```

---

**Option B: Add Timeouts** (prevent indefinite waiting)
```javascript
// Database query timeout
const result = await db.query('SELECT * FROM users', {
  timeout: 3000  // 3 second timeout
});

// API call timeout
const response = await fetch('/api/data', {
  signal: AbortSignal.timeout(5000)  // 5 second timeout
});

// Impact: Fail fast instead of cascading
// Risk: Low (better to timeout than cascade)
```

---

**Option C: Add Bulkheads** (isolate critical paths)
```javascript
// Separate connection pools for critical vs non-critical
const criticalPool = new Pool({ max: 10 }); // Payments, auth
const nonCriticalPool = new Pool({ max: 5 }); // Analytics, reports

// Critical requests get priority
app.post('/api/payment', async (req, res) => {
  const conn = await criticalPool.connect();
  // ...
});

// Non-critical requests use separate pool
app.get('/api/analytics', async (req, res) => {
  const conn = await nonCriticalPool.connect();
  // ...
});

// Impact: Critical paths protected from non-critical load
// Risk: None (isolation improves reliability)
```

---

### Long-term (1 hour+)

**Architecture Improvements**:

- [ ] **Circuit Breakers** (all external dependencies)
- [ ] **Timeouts** (every network call, database query)
- [ ] **Retries with exponential backoff** (transient failures)
- [ ] **Bulkheads** (isolate critical paths)
- [ ] **Rate limiting** (protect downstream services)
- [ ] **Graceful degradation** (fallback data, cached responses)
- [ ] **Health checks** (detect failures early)
- [ ] **Auto-scaling** (handle load spikes)
- [ ] **Chaos engineering** (test cascade scenarios)

---

## Cascade Prevention Patterns

### 1. Circuit Breaker Pattern
```javascript
const breaker = new CircuitBreaker(riskyOperation, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

breaker.fallback(() => cachedData);
```

**Benefits**:
- Fast failure (don't wait for timeout)
- Automatic recovery (reset after timeout)
- Fallback data (graceful degradation)

---

### 2. Timeout Pattern
```javascript
// ALWAYS set timeouts
const response = await fetch('/api', {
  signal: AbortSignal.timeout(5000)
});
```

**Benefits**:
- Fail fast (don't cascade indefinite waits)
- Predictable behavior

---

### 3. Bulkhead Pattern
```javascript
// Separate resource pools
const criticalPool = new Pool({ max: 10 });
const nonCriticalPool = new Pool({ max: 5 });
```

**Benefits**:
- Critical paths protected
- Non-critical load can't exhaust resources

---

### 4. Retry with Backoff
```javascript
async function retryWithBackoff(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
    }
  }
}
```

**Benefits**:
- Handles transient failures
- Exponential backoff prevents thundering herd

---

### 5. Load Shedding
```javascript
// Reject requests when overloaded
if (queueDepth > threshold) {
  return res.status(503).send('Overloaded');
}
```

**Benefits**:
- Prevent overload
- Protect downstream services

---

## Escalation

**Escalate to architecture team if**:
- System-wide cascade
- Architectural changes needed

**Escalate to all service owners if**:
- Multiple teams affected
- Need coordinated response

**Escalate to management if**:
- Complete outage
- Large customer impact

---

## Prevention Checklist

- [ ] Circuit breakers on all external calls
- [ ] Timeouts on all network operations
- [ ] Retries with exponential backoff
- [ ] Bulkheads for critical paths
- [ ] Rate limiting (protect downstream)
- [ ] Health checks (detect failures early)
- [ ] Auto-scaling (handle load)
- [ ] Graceful degradation (fallback data)
- [ ] Chaos engineering (test failure scenarios)
- [ ] Load testing (find breaking points)

---

## Related Runbooks

- [04-slow-api-response.md](04-slow-api-response.md) - API performance
- [07-service-down.md](07-service-down.md) - Service failures
- [../modules/backend-diagnostics.md](../modules/backend-diagnostics.md) - Backend troubleshooting

---

## Post-Incident

After resolving:
- [ ] Create post-mortem (MANDATORY for cascade failures)
- [ ] Draw cascade diagram (which services failed in order)
- [ ] Identify missing safeguards (circuit breakers, timeouts)
- [ ] Implement prevention patterns
- [ ] Test cascade scenarios (chaos engineering)
- [ ] Update this runbook if needed

---

## Cascade Failure Examples

**Netflix Outage (2012)**:
- Database latency → API timeouts → Frontend failures → Complete outage
- **Fix**: Circuit breakers, timeouts, fallback data

**AWS S3 Outage (2017)**:
- S3 down → Websites using S3 fail → Status dashboards fail (also on S3)
- **Fix**: Multi-region redundancy, fallback to different regions

**Google Cloud Outage (2019)**:
- Network misconfiguration → Internal services fail → External services cascade
- **Fix**: Network configuration validation, staged rollouts

---

## Key Takeaways

1. **Cascades happen when failures propagate** (no circuit breakers, timeouts)
2. **Fix the root cause first** (not the symptoms)
3. **Fail fast, don't cascade waits** (timeouts everywhere)
4. **Graceful degradation** (fallback > failure)
5. **Test failure scenarios** (chaos engineering)
