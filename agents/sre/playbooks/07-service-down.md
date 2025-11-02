# Playbook: Service Down

## Symptoms

- Service not responding
- Health check failures
- 502 Bad Gateway or 503 Service Unavailable
- Users can't access application
- Monitoring alert: "Service down", "Health check failed"

## Severity

- **SEV1** - Production service completely unavailable

## Diagnosis

### Step 1: Check Service Status

```bash
# Check if service is running (systemd)
systemctl status nginx
systemctl status application
systemctl status postgresql

# Check process
ps aux | grep nginx
pidof nginx

# Example output:
# nginx.service - nginx web server
# Active: inactive (dead)  ← SERVICE IS DOWN
```

---

### Step 2: Check Why Service Stopped

**Check Service Logs** (systemd):
```bash
# Last 50 lines of service logs
journalctl -u nginx -n 50

# Tail logs in real-time
journalctl -u nginx -f

# Look for:
# - Exit code (0 = normal, non-zero = error)
# - Error messages
# - Crash reason
```

**Check Application Logs**:
```bash
# Check application error log
tail -100 /var/log/application/error.log

# Look for:
# - Exception/error before crash
# - Stack trace
# - "Fatal error", "Segmentation fault"
```

**Check System Logs**:
```bash
# Check for OOM (Out of Memory) killer
dmesg | grep -i "out of memory\|oom\|killed process"

# Example:
# Out of memory: Killed process 1234 (node) total-vm:8GB
# ↑ OOM Killer terminated application

# Check kernel errors
dmesg | tail -50

# Check syslog
grep "error\|segfault" /var/log/syslog
```

---

### Step 3: Identify Root Cause

**Common causes**:

| Symptom | Root Cause |
|---------|------------|
| "Out of memory" in dmesg | OOM Killer (memory leak, insufficient memory) |
| "Segmentation fault" | Application bug (crash) |
| "Address already in use" | Port already bound |
| "Connection refused" to database | Database down |
| "No such file or directory" | Missing config file |
| "Permission denied" | Wrong file permissions |
| Exit code 137 | Killed by OOM Killer |
| Exit code 139 | Segmentation fault |

---

## Mitigation

### Immediate (Now - 5 min)

**Option A: Restart Service**
```bash
# Restart service
systemctl restart nginx

# Check if started successfully
systemctl status nginx

# Test endpoint
curl http://localhost

# Impact: Service restored
# Risk: Low (if root cause not addressed, may crash again)
```

**Option B: Fix Configuration Error** (if config issue)
```bash
# Test configuration
nginx -t             # nginx
postgresql --help    # postgres

# If config error, check recent changes
git diff HEAD~1 /etc/nginx/nginx.conf

# Revert to working config
git checkout HEAD~1 /etc/nginx/nginx.conf

# Restart
systemctl restart nginx
```

**Option C: Free Up Resources** (if OOM)
```bash
# Check memory usage
free -h

# Kill memory-heavy processes (non-critical)
kill -9 <PID>

# Free page cache
sync && echo 3 > /proc/sys/vm/drop_caches

# Restart service
systemctl restart application
```

**Option D: Change Port** (if port conflict)
```bash
# Check what's using port
lsof -i :80

# Example:
# apache2  1234  root    4u  IPv4  12345  0t0  TCP *:80 (LISTEN)
# ↑ Apache using port 80

# Stop conflicting service
systemctl stop apache2

# Start intended service
systemctl start nginx
```

---

### Short-term (5 min - 1 hour)

**Option A: Fix Crash Bug** (if application bug)
```bash
# Check stack trace in logs
tail -100 /var/log/application/error.log

# Identify line causing crash
# Example: NullPointerException at PaymentService.java:42

# Deploy hotfix OR revert to previous version
git checkout <previous-working-commit>
npm run build && pm2 restart all

# Impact: Bug fixed, service stable
# Risk: Medium (need proper testing)
```

**Option B: Increase Memory** (if OOM)
```bash
# Short-term: Increase swap
dd if=/dev/zero of=/swapfile bs=1M count=2048
mkswap /swapfile
swapon /swapfile

# Long-term: Resize instance
# AWS: Change instance type (t3.medium → t3.large)
# Azure: Resize VM

# Impact: More memory available
# Risk: Medium (swap is slow, instance resize has downtime)
```

**Option C: Enable Auto-Restart** (systemd)
```bash
# Edit service file
# /etc/systemd/system/application.service

[Service]
Restart=always             # Auto-restart on failure
RestartSec=10              # Wait 10s before restart
StartLimitBurst=5          # Max 5 restarts
StartLimitIntervalSec=60   # In 60 seconds

# Reload systemd
systemctl daemon-reload

# Impact: Service auto-restarts on crash
# Risk: Low (but doesn't fix root cause)
```

**Option D: Route Traffic to Backup** (if multi-instance)
```bash
# If using load balancer:
# 1. Remove failed instance from LB
# 2. Traffic goes to healthy instances

# AWS:
aws elbv2 deregister-targets \
  --target-group-arn <arn> \
  --targets Id=i-1234567890abcdef0

# Impact: Users see working instance
# Risk: Low (other instances handle load)
```

---

### Long-term (1 hour+)

- [ ] Fix root cause (memory leak, bug, etc.)
- [ ] Add health check monitoring
- [ ] Enable auto-restart (systemd)
- [ ] Set up redundancy (multiple instances)
- [ ] Add load balancer (distribute traffic)
- [ ] Increase memory/CPU (if resource issue)
- [ ] Add alerting (service down, health check fail)
- [ ] Add E2E test (smoke test after deploy)
- [ ] Review deployment process (how did bug reach prod?)

---

## Root Cause Analysis

**For each incident, determine**:

1. **What failed?** (nginx, application, database)
2. **Why did it fail?** (OOM, bug, config error)
3. **What triggered it?** (deploy, traffic spike, external event)
4. **How to prevent?** (fix bug, add monitoring, increase capacity)

---

## Escalation

**Escalate to developer if**:
- Application crash due to bug
- Need code fix

**Escalate to platform team if**:
- Platform/framework issue
- Infrastructure problem

**Escalate to on-call manager if**:
- Can't restore service in 30 min
- Need additional resources

---

## Prevention Checklist

- [ ] Health check monitoring (alert on failure)
- [ ] Auto-restart (systemd Restart=always)
- [ ] Redundancy (multiple instances behind LB)
- [ ] Resource monitoring (CPU, memory alerts)
- [ ] Graceful degradation (circuit breakers, fallbacks)
- [ ] Smoke tests after deploy
- [ ] Rollback plan (blue-green, canary)
- [ ] Chaos engineering (test failure scenarios)

---

## Related Runbooks

- [03-memory-leak.md](03-memory-leak.md) - If OOM caused crash
- [../modules/infrastructure.md](../modules/infrastructure.md) - Infrastructure troubleshooting
- [../modules/backend-diagnostics.md](../modules/backend-diagnostics.md) - Application diagnostics

---

## Post-Incident

After resolving:
- [ ] Create post-mortem (MANDATORY for SEV1)
- [ ] Timeline with all events
- [ ] Root cause analysis
- [ ] Action items (prevent recurrence)
- [ ] Update runbook if needed
- [ ] Share learnings with team

---

## Useful Commands Reference

```bash
# Service status
systemctl status <service>
systemctl restart <service>
journalctl -u <service> -n 50

# Process check
ps aux | grep <process>
pidof <process>

# Check OOM
dmesg | grep -i "out of memory\|oom"

# Check port usage
lsof -i :<port>
netstat -tlnp | grep <port>

# Test config
nginx -t
postgresql --help

# Health check
curl http://localhost/health
```
