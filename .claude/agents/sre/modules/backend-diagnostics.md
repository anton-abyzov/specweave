# Backend/API Diagnostics

**Purpose**: Troubleshoot backend services, APIs, and application-level performance issues.

## Common Backend Issues

### 1. Slow API Response

**Symptoms**:
- API response time >1 second
- Users report slow loading
- Timeout errors

**Diagnosis**:

#### Check Application Logs
```bash
# Check for slow requests
grep "duration" /var/log/application.log | awk '{if ($5 > 1000) print}'

# Check error rate
grep "ERROR" /var/log/application.log | wc -l

# Check recent errors
tail -f /var/log/application.log | grep "ERROR"
```

**Red flags**:
- Repeated errors for same endpoint
- Increasing response times
- Timeout errors

---

#### Check Application Metrics
```bash
# CPU usage
top -bn1 | grep "node\|java\|python"

# Memory usage
ps aux | grep "node\|java\|python" | awk '{print $4, $11}'

# Thread count
ps -eLf | grep "node\|java\|python" | wc -l

# Open file descriptors
lsof -p <PID> | wc -l
```

**Red flags**:
- CPU >80%
- Memory increasing over time
- Thread count increasing (thread leak)
- File descriptors increasing (connection leak)

---

#### Check Database Query Time
```bash
# If slow, likely database issue
# See database-diagnostics.md

# Check if query time matches API response time
# API response time = Query time + Application processing
```

---

#### Check External API Calls
```bash
# Check if calling external APIs
grep "http.request" /var/log/application.log

# Check external API response time
# Use APM tools or custom instrumentation
```

**Red flags**:
- External API taking >500ms
- External API rate limiting (429 errors)
- External API errors (5xx errors)

**Mitigation**:
- Cache external API responses
- Add timeout (don't wait >5s)
- Circuit breaker pattern
- Fallback data

---

### 2. 5xx Errors (500, 502, 503, 504)

**Symptoms**:
- Users getting error messages
- Monitoring alerts for error rate
- Some/all requests failing

**Diagnosis by Error Code**:

#### 500 Internal Server Error
**Cause**: Application code error

**Diagnosis**:
```bash
# Check application logs for exceptions
grep "Exception\|Error" /var/log/application.log | tail -20

# Check stack traces
tail -100 /var/log/application.log
```

**Common causes**:
- NullPointerException / TypeError
- Unhandled promise rejection
- Database connection error
- Missing environment variable

**Mitigation**:
- Fix bug in code
- Add error handling
- Add input validation
- Add monitoring for this error

---

#### 502 Bad Gateway
**Cause**: Reverse proxy can't reach backend

**Diagnosis**:
```bash
# Check if application is running
ps aux | grep "node\|java\|python"

# Check application port
netstat -tlnp | grep <PORT>

# Check reverse proxy logs (nginx, apache)
tail -f /var/log/nginx/error.log
```

**Common causes**:
- Application crashed
- Application not listening on expected port
- Firewall blocking connection
- Reverse proxy misconfigured

**Mitigation**:
- Restart application
- Check application logs for crash reason
- Verify port configuration
- Check reverse proxy config

---

#### 503 Service Unavailable
**Cause**: Application overloaded or unhealthy

**Diagnosis**:
```bash
# Check application health
curl http://localhost:<PORT>/health

# Check connection pool
# Database connections, HTTP connections

# Check queue depth
# Message queues, task queues
```

**Common causes**:
- Too many concurrent requests
- Database connection pool exhausted
- Dependency service down
- Health check failing

**Mitigation**:
- Scale horizontally (add more instances)
- Increase connection pool size
- Rate limiting
- Circuit breaker for dependencies

---

#### 504 Gateway Timeout
**Cause**: Application took too long to respond

**Diagnosis**:
```bash
# Check what's slow
# Database query? External API? Long computation?

# Check application logs for slow operations
grep "slow\|timeout" /var/log/application.log
```

**Common causes**:
- Slow database query
- Slow external API call
- Long-running computation
- Deadlock

**Mitigation**:
- Optimize slow operation
- Add timeout to prevent indefinite wait
- Async processing (return 202 Accepted)
- Increase timeout (last resort)

---

### 3. Memory Leak (Backend)

**Symptoms**:
- Memory usage increasing over time
- Application crashes with OutOfMemoryError
- Performance degrades over time

**Diagnosis**:

#### Monitor Memory Over Time
```bash
# Linux
watch -n 5 'ps aux | grep <PROCESS> | awk "{print \$4, \$5, \$6}"'

# Get heap dump (Java)
jmap -dump:format=b,file=heap.bin <PID>

# Get heap snapshot (Node.js)
node --inspect index.js
# Chrome DevTools → Memory → Take heap snapshot
```

**Red flags**:
- Memory increasing linearly
- Memory not released after GC
- Large arrays/objects in heap dump

---

#### Common Causes
```javascript
// 1. Event listeners not removed
emitter.on('event', handler); // Never removed

// 2. Timers not cleared
setInterval(() => { /* ... */ }, 1000); // Never cleared

// 3. Global variables growing
global.cache = {}; // Grows forever

// 4. Closures holding references
function createHandler() {
  const largeData = new Array(1000000);
  return () => {
    // Closure keeps largeData in memory
  };
}

// 5. Connection leaks
const conn = await db.connect();
// Never closed → connection pool exhausted
```

**Mitigation**:
```javascript
// 1. Remove event listeners
const handler = () => { /* ... */ };
emitter.on('event', handler);
// Later:
emitter.off('event', handler);

// 2. Clear timers
const intervalId = setInterval(() => { /* ... */ }, 1000);
// Later:
clearInterval(intervalId);

// 3. Use LRU cache
const LRU = require('lru-cache');
const cache = new LRU({ max: 1000 });

// 4. Be careful with closures
function createHandler() {
  return () => {
    const largeData = loadData(); // Load when needed
  };
}

// 5. Always close connections
const conn = await db.connect();
try {
  await conn.query(/* ... */);
} finally {
  await conn.close();
}
```

---

### 4. High CPU Usage

**Symptoms**:
- CPU at 100%
- Slow response times
- Server becomes unresponsive

**Diagnosis**:

#### Identify CPU-heavy Process
```bash
# Top CPU processes
top -bn1 | head -20

# CPU per thread (Java)
top -H -p <PID>

# Profile application (Node.js)
node --prof index.js
node --prof-process isolate-*.log
```

**Common causes**:
- Infinite loop
- Heavy computation (parsing, encryption)
- Regular expression catastrophic backtracking
- Large JSON parsing

**Mitigation**:
```javascript
// 1. Break up heavy computation
async function processLargeArray(items) {
  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]);

    // Yield to event loop
    if (i % 100 === 0) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }
}

// 2. Use worker threads (Node.js)
const { Worker } = require('worker_threads');
const worker = new Worker('./heavy-computation.js');

// 3. Cache results
const cache = new Map();
function expensiveOperation(input) {
  if (cache.has(input)) return cache.get(input);
  const result = /* heavy computation */;
  cache.set(input, result);
  return result;
}

// 4. Fix regex
// Bad: /(.+)*/ (catastrophic backtracking)
// Good: /(.+?)/ (non-greedy)
```

---

### 5. Connection Pool Exhausted

**Symptoms**:
- "Connection pool exhausted" errors
- "Too many connections" errors
- Requests timing out

**Diagnosis**:

#### Check Connection Pool
```bash
# Database connections
# PostgreSQL:
SELECT count(*) FROM pg_stat_activity;

# MySQL:
SHOW PROCESSLIST;

# Application connection pool
# Check application metrics/logs
```

**Red flags**:
- Connections = max pool size
- Idle connections in transaction
- Long-running queries holding connections

**Common causes**:
- Connections not released (missing .close())
- Connection leak in error path
- Pool size too small
- Long-running queries

**Mitigation**:
```javascript
// 1. Always close connections
async function queryDatabase() {
  const conn = await pool.connect();
  try {
    const result = await conn.query('SELECT * FROM users');
    return result;
  } finally {
    conn.release(); // CRITICAL
  }
}

// 2. Use connection pool wrapper
const pool = new Pool({
  max: 20, // max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 3. Monitor pool metrics
pool.on('error', (err) => {
  console.error('Pool error:', err);
});

// 4. Increase pool size (if needed)
// But investigate leaks first!
```

---

## Backend Performance Metrics

**Response Time**:
- p50: <100ms
- p95: <500ms
- p99: <1s

**Throughput**:
- Requests per second (RPS)
- Requests per minute (RPM)

**Error Rate**:
- Target: <0.1%
- 4xx errors: Client errors (validation)
- 5xx errors: Server errors (bugs, downtime)

**Resource Usage**:
- CPU: <70% average
- Memory: <80% of limit
- Connections: <80% of pool size

**Availability**:
- Target: 99.9% (8.76 hours downtime/year)
- 99.99%: 52.6 minutes downtime/year
- 99.999%: 5.26 minutes downtime/year

---

## Backend Diagnostic Checklist

**When diagnosing slow backend**:

- [ ] Check application logs for errors
- [ ] Check CPU usage (target: <70%)
- [ ] Check memory usage (target: <80%)
- [ ] Check database query time (see database-diagnostics.md)
- [ ] Check external API calls (timeout, errors)
- [ ] Check connection pool (target: <80% used)
- [ ] Check error rate (target: <0.1%)
- [ ] Check response time percentiles (p95, p99)
- [ ] Check for thread leaks (increasing thread count)
- [ ] Check for memory leaks (increasing memory over time)

**Tools**:
- Application logs
- APM tools (New Relic, DataDog, AppDynamics)
- `top`, `htop`, `ps`, `lsof`
- `curl` with timing
- Profilers (node --prof, jstack, py-spy)

---

## Related Documentation

- [SKILL.md](../SKILL.md) - Main SRE agent
- [database-diagnostics.md](database-diagnostics.md) - Database troubleshooting
- [infrastructure.md](infrastructure.md) - Server/network troubleshooting
- [monitoring.md](monitoring.md) - Observability tools
