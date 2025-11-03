# Incident Report: [Incident Title]

**Date**: YYYY-MM-DD
**Time Started**: HH:MM UTC
**Time Resolved**: HH:MM UTC (or "Ongoing")
**Duration**: X hours Y minutes
**Severity**: SEV1 / SEV2 / SEV3
**Status**: Investigating / Mitigating / Resolved

---

## Summary

Brief one-paragraph description of what happened, impact, and current status.

**Example**:
```
On 2025-10-26 at 14:00 UTC, the API service became unavailable due to database connection pool exhaustion. All users were unable to access the application. The issue was resolved at 14:30 UTC by restarting the database and fixing a connection leak in the payment service. Total downtime: 30 minutes.
```

---

## Impact

### Users Affected
- **Scope**: All users / Partial / Specific region / Specific feature
- **Count**: X,XXX users (or percentage)
- **Duration**: HH:MM (how long were they affected)

### Services Affected
- [ ] Frontend/UI
- [ ] Backend API
- [ ] Database
- [ ] Payment processing
- [ ] Authentication
- [ ] [Other service]

### Business Impact
- **Revenue Lost**: $X,XXX (if calculable)
- **SLA Breach**: Yes / No (if applicable)
- **Customer Complaints**: X tickets/emails
- **Reputation**: Social media mentions, press coverage

---

## Timeline

Detailed chronological timeline of events with timestamps.

| Time (UTC) | Event | Action Taken | By Whom |
|------------|-------|--------------|---------|
| 14:00 | First alert: "Database connection pool exhausted" | Alert triggered | Monitoring |
| 14:02 | On-call engineer paged | Acknowledged alert | SRE (Jane) |
| 14:05 | Confirmed database connections at max (100/100) | Checked pg_stat_activity | SRE (Jane) |
| 14:10 | Identified connection leak in payment service | Reviewed application logs | SRE (Jane) |
| 14:15 | Restarted payment service | systemctl restart payment | SRE (Jane) |
| 14:20 | Database connections normalized (20/100) | Monitored connections | SRE (Jane) |
| 14:25 | Health checks passing | Verified /health endpoint | SRE (Jane) |
| 14:30 | Incident resolved | Declared incident resolved | SRE (Jane) |

---

## Root Cause

**What broke**: Payment service had connection leak (connections not released after query)

**Why it broke**: Missing `conn.close()` in error handling path

**What triggered it**: High payment volume (Black Friday sale)

**Contributing factors**:
- Database connection pool size too small (100 connections)
- No connection timeout configured
- No monitoring alert for connection pool usage

---

## Detection

### How We Detected
- [X] Automated monitoring alert
- [ ] User report
- [ ] Internal team noticed
- [ ] External vendor notification

**Alert Details**:
- Alert name: "Database Connection Pool Exhausted"
- Alert triggered at: 14:00 UTC
- Time to detection: <1 minute (automated)
- Time to acknowledgment: 2 minutes

### Detection Quality
- **Good**: Alert fired quickly (<1 min)
- **To Improve**: Need alert BEFORE pool exhausted (at 80% usage)

---

## Response

### Immediate Actions Taken
1. ✅ Acknowledged alert (14:02)
2. ✅ Checked database connection pool (14:05)
3. ✅ Identified connection leak (14:10)
4. ✅ Restarted payment service (14:15)
5. ✅ Verified resolution (14:30)

### What Worked Well
- Monitoring detected issue quickly
- Clear runbook for connection pool issues
- SRE responded within 2 minutes
- Root cause identified in 10 minutes

### What Could Be Improved
- Connection leak should have been caught in code review
- No automated tests for connection cleanup
- Connection pool too small for Black Friday traffic
- No early warning alert (only alerted when 100% full)

---

## Resolution

### Short-term Fix (Immediate)
- Restarted payment service to release connections
- Manually monitored connection pool for 30 minutes

### Long-term Fix (To Prevent Recurrence)
- [ ] Fix connection leak in payment service code (PRIORITY 1)
- [ ] Add automated test for connection cleanup (PRIORITY 1)
- [ ] Increase connection pool size (100 → 200) (PRIORITY 2)
- [ ] Add connection pool monitoring alert (>80%) (PRIORITY 2)
- [ ] Add connection timeout (30 seconds) (PRIORITY 3)
- [ ] Review all database queries for connection leaks (PRIORITY 3)

---

## Communication

### Internal Communication
- **Incident channel**: #incident-20251026-db-pool
- **Participants**: SRE (Jane), DevOps (John), Manager (Sarah)
- **Updates posted**: Every 10 minutes

### External Communication
- **Status page**: Updated at 14:05, 14:20, 14:30
- **Customer email**: Sent at 15:00 (post-incident)
- **Social media**: Tweet at 14:10 acknowledging issue

**Sample Status Page Update**:
```
[14:05] Investigating: We are currently investigating an issue affecting API availability. Our team is actively working on a resolution.

[14:20] Monitoring: We have identified the issue and implemented a fix. We are monitoring the situation to ensure stability.

[14:30] Resolved: The issue has been resolved. All services are now operating normally. We apologize for the inconvenience.
```

---

## Metrics

### Response Time
- **Time to detect**: <1 minute (excellent)
- **Time to acknowledge**: 2 minutes (good)
- **Time to triage**: 5 minutes (good)
- **Time to identify root cause**: 10 minutes (good)
- **Time to resolution**: 30 minutes (acceptable)

### Availability
- **Uptime target**: 99.9% (43.2 minutes downtime/month)
- **Actual downtime**: 30 minutes
- **SLA breach**: No (within monthly budget)

### Error Rate
- **Normal error rate**: 0.1%
- **During incident**: 100% (complete outage)
- **Peak error count**: 10,000 errors

---

## Action Items

| # | Action | Owner | Priority | Due Date | Status |
|---|--------|-------|----------|----------|--------|
| 1 | Fix connection leak in payment service | Dev (Mike) | P1 | 2025-10-27 | Pending |
| 2 | Add automated test for connection cleanup | QA (Lisa) | P1 | 2025-10-27 | Pending |
| 3 | Increase connection pool size (100 → 200) | DBA (Tom) | P2 | 2025-10-28 | Pending |
| 4 | Add connection pool monitoring (>80%) | SRE (Jane) | P2 | 2025-10-28 | Pending |
| 5 | Add connection timeout (30s) | DBA (Tom) | P3 | 2025-10-30 | Pending |
| 6 | Review all queries for connection leaks | Dev (Mike) | P3 | 2025-11-02 | Pending |
| 7 | Load test for Black Friday traffic | DevOps (John) | P3 | 2025-11-10 | Pending |

---

## Lessons Learned

### What Went Well
- ✅ Monitoring detected issue immediately
- ✅ Clear escalation path (on-call responded quickly)
- ✅ Runbook helped identify issue faster
- ✅ Communication was clear and timely

### What Went Wrong
- ❌ Connection leak made it to production (code review miss)
- ❌ No automated test for connection cleanup
- ❌ Connection pool too small for high-traffic event
- ❌ No early warning alert (only alerted at 100%)

### Action Items to Prevent Recurrence
1. **Code Quality**: Add linter rule to check connection cleanup
2. **Testing**: Add integration test for connection pool under load
3. **Monitoring**: Add alert at 80% connection pool usage
4. **Capacity Planning**: Review capacity before high-traffic events
5. **Runbook Update**: Document connection leak troubleshooting

---

## Appendices

### Related Incidents
- [2025-09-15] Database connection pool exhausted (similar issue)
- [2025-08-10] Payment service OOM crash

### Related Documentation
- Runbook: [Connection Pool Issues](../playbooks/connection-pool-exhausted.md)
- Post-mortem: [2025-09-15 Database Incident](../post-mortems/2025-09-15-db-pool.md)
- Code: [Payment Service](https://github.com/example/payment-service)

### Commands Run
```bash
# Check connection pool
SELECT count(*) FROM pg_stat_activity;

# Identify blocking queries
SELECT * FROM pg_stat_activity WHERE state != 'idle';

# Restart service
systemctl restart payment-service

# Monitor connections
watch -n 5 'psql -c "SELECT count(*) FROM pg_stat_activity"'
```

---

**Report Created By**: Jane (SRE)
**Report Date**: 2025-10-26
**Review Status**: Pending / Reviewed / Approved
**Reviewed By**: [Name, Date]
