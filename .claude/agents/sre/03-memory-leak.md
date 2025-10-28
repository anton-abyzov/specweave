# Playbook: Memory Leak

## Symptoms

- Memory usage increasing continuously over time
- Application crashes with OutOfMemoryError (Java) or "JavaScript heap out of memory" (Node.js)
- Performance degrades over time
- High swap usage
- Monitoring alert: "Memory usage >90%"

## Severity

- **SEV2** if memory increasing but not yet critical
- **SEV1** if application crashed or unresponsive

## Diagnosis

### Step 1: Confirm Memory Leak

```bash
# Monitor memory over time (5 minute intervals)
watch -n 300 'ps aux | grep <process> | awk "{print \$4, \$5, \$6}"'

# Check if memory continuously increasing
# Leak: 20% → 30% → 40% → 50% (linear growth)
# Normal: 30% → 32% → 31% → 30% (stable)
```

---

### Step 2: Get Memory Snapshot

**Java (Heap Dump)**:
```bash
# Get heap dump
jmap -dump:format=b,file=heap.bin <PID>

# Analyze with jhat or VisualVM
jhat heap.bin
# Open http://localhost:7000

# Or use Eclipse Memory Analyzer
```

**Node.js (Heap Snapshot)**:
```bash
# Start with --inspect
node --inspect index.js

# Chrome DevTools → Memory → Take heap snapshot

# Or use heapdump module
const heapdump = require('heapdump');
heapdump.writeSnapshot('/tmp/heap-' + Date.now() + '.heapsnapshot');
```

**Python (Memory Profiler)**:
```bash
# Install memory_profiler
pip install memory_profiler

# Profile function
python -m memory_profiler script.py
```

---

### Step 3: Identify Leak Source

**Look for**:
- Large arrays/objects growing over time
- Detached DOM nodes (if browser/UI)
- Event listeners not removed
- Timers/intervals not cleared
- Closures holding references
- Cache without eviction policy

**Common patterns**:
```javascript
// 1. Global cache growing forever
global.cache = {}; // Never cleared

// 2. Event listeners not removed
emitter.on('event', handler); // Never removed

// 3. Timers not cleared
setInterval(() => { /* ... */ }, 1000); // Never cleared

// 4. Closures
function createHandler() {
  const largeData = new Array(1000000);
  return () => {
    // Closure keeps largeData in memory
  };
}
```

---

## Mitigation

### Immediate (Now - 5 min)

**Option A: Restart Application**
```bash
# Restart to free memory
systemctl restart application

# Impact: Memory usage returns to baseline
# Risk: Low (brief downtime)
# NOTE: This is temporary, leak will recur!
```

**Option B: Increase Memory Limit** (temporary)
```bash
# Java
java -Xmx4G -jar application.jar  # Was 2G

# Node.js
node --max-old-space-size=4096 index.js  # Was 2048

# Impact: Buys time to find root cause
# Risk: Low (but doesn't fix leak)
```

**Option C: Scale Horizontally** (cloud)
```bash
# Add more instances
# Use load balancer to rotate traffic
# Restart instances on schedule (e.g., every 6 hours)

# Impact: Distributes load, restarts prevent OOM
# Risk: Low (but doesn't fix root cause)
```

---

### Short-term (5 min - 1 hour)

**Analyze heap dump** and identify leak source

**Common Fixes**:

**1. Add LRU Cache**
```javascript
// BAD: Unbounded cache
const cache = {};

// GOOD: LRU cache with size limit
const LRU = require('lru-cache');
const cache = new LRU({ max: 1000 });
```

**2. Remove Event Listeners**
```javascript
// Add listener
const handler = () => { /* ... */ };
emitter.on('event', handler);

// CRITICAL: Remove later
emitter.off('event', handler);

// React/Vue: cleanup in componentWillUnmount/onUnmounted
```

**3. Clear Timers**
```javascript
// Set timer
const intervalId = setInterval(() => { /* ... */ }, 1000);

// CRITICAL: Clear later
clearInterval(intervalId);

// React: cleanup in useEffect return
useEffect(() => {
  const id = setInterval(() => { /* ... */ }, 1000);
  return () => clearInterval(id);
}, []);
```

**4. Close Connections**
```javascript
// BAD: Connection leak
const conn = await db.connect();
await conn.query(/* ... */);
// Connection never closed!

// GOOD: Always close
const conn = await db.connect();
try {
  await conn.query(/* ... */);
} finally {
  await conn.close(); // CRITICAL
}
```

---

### Long-term (1 hour+)

- [ ] Add memory monitoring (alert if >80% and increasing)
- [ ] Add memory profiling to CI/CD (detect leaks early)
- [ ] Use WeakMap for caches (auto garbage collected)
- [ ] Review closure usage (avoid holding large data)
- [ ] Add automated restart (every N hours, if leak can't be fixed immediately)
- [ ] Load test to reproduce leak in test environment
- [ ] Fix root cause in code

---

## Escalation

**Escalate to developer if**:
- Application code causing leak
- Requires code fix

**Escalate to platform team if**:
- Platform/framework bug
- Requires upgrade or workaround

---

## Prevention Checklist

- [ ] Use LRU cache (not unbounded)
- [ ] Remove event listeners in cleanup
- [ ] Clear timers/intervals
- [ ] Close database connections (use `finally`)
- [ ] Avoid closures holding large data
- [ ] Use WeakMap for temporary caches
- [ ] Profile memory in development
- [ ] Load test before production

---

## Related Runbooks

- [01-high-cpu-usage.md](01-high-cpu-usage.md) - If CPU also high
- [07-service-down.md](07-service-down.md) - If OOM crashed service
- [../modules/backend-diagnostics.md](../modules/backend-diagnostics.md) - Backend troubleshooting

---

## Post-Incident

After resolving:
- [ ] Create post-mortem
- [ ] Identify leak source from heap dump
- [ ] Fix code
- [ ] Add regression test (memory profiling)
- [ ] Add monitoring alert
- [ ] Update this runbook if needed
