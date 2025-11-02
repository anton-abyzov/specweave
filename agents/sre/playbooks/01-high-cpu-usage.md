# Playbook: High CPU Usage

## Symptoms

- CPU usage at 80-100%
- Applications slow or unresponsive
- Server lag, SSH slow
- Monitoring alert: "CPU usage >80% for 5 minutes"

## Severity

- **SEV2** if application degraded but functional
- **SEV1** if application unresponsive

## Diagnosis

### Step 1: Identify Top CPU Process

```bash
# Current CPU usage
top -bn1 | head -20

# Top CPU processes
ps aux | sort -nrk 3,3 | head -10

# CPU per thread
top -H -p <PID>
```

**What to look for**:
- Single process using >80% CPU
- Multiple processes all high (system-wide issue)
- System CPU vs user CPU (iowait = disk issue)

---

### Step 2: Identify Process Type

**Application process** (node, java, python):
```bash
# Check application logs
tail -100 /var/log/application.log

# Check for infinite loops, heavy computation
# Check APM for slow endpoints
```

**System process** (kernel, systemd):
```bash
# Check system logs
dmesg | tail -50
journalctl -xe

# Check for hardware issues
```

**Unknown/suspicious process**:
```bash
# Check process details
ps aux | grep <PID>
lsof -p <PID>

# Could be malware (crypto mining)
# See security-incidents.md
```

---

### Step 3: Check If Disk-Related

```bash
# Check iowait
iostat -x 1 5

# If iowait >20%, disk is bottleneck
# See infrastructure.md for disk I/O troubleshooting
```

---

## Mitigation

### Immediate (Now - 5 min)

**Option A: Lower Process Priority**
```bash
# Reduce CPU priority
renice +10 <PID>

# Impact: Process gets less CPU time
# Risk: Low (process still runs, just slower)
```

**Option B: Kill Process** (if application)
```bash
# Graceful shutdown
kill -TERM <PID>

# Force kill (last resort)
kill -KILL <PID>

# Restart service
systemctl restart <service>

# Impact: Process restarts, CPU normalizes
# Risk: Medium (brief downtime)
```

**Option C: Scale Horizontally** (cloud)
```bash
# Add more instances to distribute load
# AWS: Auto Scaling Group
# Azure: Scale Set
# Kubernetes: Horizontal Pod Autoscaler

# Impact: Load distributed across instances
# Risk: Low (no downtime)
```

---

### Short-term (5 min - 1 hour)

**Option A: Optimize Code** (if application bug)
```bash
# Profile application
# Node.js: node --prof
# Java: jstack, jvisualvm
# Python: py-spy

# Identify hot path
# Fix infinite loop, heavy computation
```

**Option B: Add Caching**
```javascript
// Cache expensive computation
const cache = new Map();

function expensiveOperation(input) {
  if (cache.has(input)) {
    return cache.get(input);
  }

  const result = /* heavy computation */;
  cache.set(input, result);
  return result;
}
```

**Option C: Scale Vertically** (cloud)
```bash
# Resize to larger instance type
# AWS: Change instance type (t3.medium → t3.large)
# Azure: Resize VM
# Impact: More CPU capacity
# Risk: Medium (brief downtime during resize)
```

---

### Long-term (1 hour+)

- [ ] Add CPU monitoring alert (>70% for 5 min)
- [ ] Optimize application code (reduce computation)
- [ ] Use worker threads for heavy tasks (Node.js)
- [ ] Implement auto-scaling (cloud)
- [ ] Add APM for performance profiling
- [ ] Review architecture (async processing, job queues)

---

## Escalation

**Escalate to developer if**:
- Application code causing issue
- Requires code fix or optimization

**Escalate to security-agent if**:
- Unknown/suspicious process
- Potential malware or crypto mining

**Escalate to infrastructure if**:
- Hardware issue (kernel errors)
- Cloud infrastructure problem

---

## Related Runbooks

- [03-memory-leak.md](03-memory-leak.md) - If memory also high
- [04-slow-api-response.md](04-slow-api-response.md) - If API slow due to CPU
- [../modules/infrastructure.md](../modules/infrastructure.md) - Infrastructure diagnostics

---

## Post-Incident

After resolving:
- [ ] Create post-mortem (if SEV1/SEV2)
- [ ] Identify root cause
- [ ] Add monitoring/alerting
- [ ] Update this runbook if needed
- [ ] Add regression test (if code bug)
