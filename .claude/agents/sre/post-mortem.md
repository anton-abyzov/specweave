# Post-Mortem: [Incident Title]

**Date of Incident**: YYYY-MM-DD
**Date of Post-Mortem**: YYYY-MM-DD
**Author**: [Name]
**Reviewers**: [Names]
**Severity**: SEV1 / SEV2 / SEV3

---

## Executive Summary

**What Happened**: [One-paragraph summary of incident]

**Impact**: [Brief impact summary - users, duration, business]

**Root Cause**: [Root cause in one sentence]

**Resolution**: [How it was fixed]

**Example**:
```
What Happened: On October 26, 2025, the application became unavailable for 30 minutes due to database connection pool exhaustion.

Impact: All users were unable to access the application from 14:00-14:30 UTC. Approximately 10,000 users affected.

Root Cause: Payment service had a connection leak (connections not properly closed in error handling path), which exhausted the database connection pool during high traffic.

Resolution: Application was restarted to release connections (immediate fix), and the connection leak was fixed in code (permanent fix).
```

---

## Incident Details

### Timeline

| Time (UTC) | Event | Actor |
|------------|-------|-------|
| 14:00 | Alert: "Database Connection Pool Exhausted" | Monitoring |
| 14:02 | On-call engineer paged | PagerDuty |
| 14:02 | Jane acknowledged alert | SRE (Jane) |
| 14:05 | Confirmed database connections at max (100/100) | SRE (Jane) |
| 14:08 | Checked application logs for connection usage | SRE (Jane) |
| 14:10 | Identified connection leak in payment service | SRE (Jane) |
| 14:12 | Decision: Restart payment service to free connections | SRE (Jane) |
| 14:15 | Payment service restarted | SRE (Jane) |
| 14:17 | Database connections dropped to 20/100 | SRE (Jane) |
| 14:20 | Health checks passing, traffic restored | SRE (Jane) |
| 14:25 | Monitoring for stability | SRE (Jane) |
| 14:30 | Incident declared resolved | SRE (Jane) |
| 15:00 | Developer identified code fix | Dev (Mike) |
| 16:00 | Code fix deployed to production | Dev (Mike) |
| 16:30 | Verified no recurrence after 1 hour | SRE (Jane) |

**Total Duration**: 30 minutes (outage) + 2.5 hours (full resolution)

---

### Impact

**Users Affected**:
- **Scope**: All users (100%)
- **Count**: ~10,000 active users
- **Duration**: 30 minutes complete outage

**Services Affected**:
- ✅ Frontend (down - unable to reach backend)
- ✅ Backend API (degraded - connection pool exhausted)
- ✅ Database (saturated - all connections in use)
- ❌ Authentication (not affected - separate service)
- ❌ Payment processing (not affected - queued transactions)

**Business Impact**:
- **Revenue Lost**: $5,000 (estimated, based on 30 min downtime)
- **SLA Breach**: No (30 min < 43.2 min monthly budget for 99.9%)
- **Customer Complaints**: 47 support tickets, 12 social media mentions
- **Reputation**: Minor (quickly resolved, transparent communication)

---

## Root Cause Analysis

### The Five Whys

**1. Why did the application become unavailable?**
→ Database connection pool was exhausted (100/100 connections in use)

**2. Why was the connection pool exhausted?**
→ Payment service had a connection leak (connections not being released)

**3. Why were connections not being released?**
→ Error handling path in payment service missing `conn.close()` in `finally` block

**4. Why was the error path missing `conn.close()`?**
→ Developer oversight during code review

**5. Why didn't code review catch this?**
→ No automated test or linter to check connection cleanup

**Root Cause**: Connection leak in payment service error handling path, compounded by lack of automated testing for connection cleanup.

---

### Contributing Factors

**Technical Factors**:
1. Connection pool size too small (100 connections) for Black Friday traffic
2. No connection timeout configured (connections held indefinitely)
3. No monitoring alert for connection pool usage (only alerted at 100%)
4. No circuit breaker to prevent cascade failures

**Process Factors**:
1. Code review missed connection leak
2. No automated test for connection cleanup
3. No load testing before high-traffic event (Black Friday)
4. No runbook for connection pool exhaustion

**Human Factors**:
1. Developer unfamiliar with connection pool best practices
2. Time pressure during feature development (rushed code review)

---

## Detection and Response

### Detection

**How Detected**: Automated monitoring alert

**Alert**: "Database Connection Pool Exhausted"
- **Trigger**: `SELECT count(*) FROM pg_stat_activity >= 100`
- **Alert latency**: <1 minute (excellent)
- **False positive rate**: 0% (first time this alert fired)

**Detection Quality**:
- ✅ **Good**: Alert fired quickly (<1 min after issue started)
- ❌ **To Improve**: No early warning (should alert at 80%, not 100%)

---

### Response

**Response Timeline**:
- **Time to acknowledge**: 2 minutes (target: <5 min) ✅
- **Time to triage**: 5 minutes (target: <10 min) ✅
- **Time to identify root cause**: 10 minutes (target: <30 min) ✅
- **Time to mitigate**: 15 minutes (target: <30 min) ✅
- **Time to resolve**: 30 minutes (target: <60 min) ✅

**What Worked Well**:
- ✅ Monitoring detected issue immediately
- ✅ Clear escalation path (on-call responded in 2 min)
- ✅ Good communication (updates every 10 min)
- ✅ Quick diagnosis (root cause found in 10 min)

**What Could Be Improved**:
- ❌ No runbook for this scenario (had to figure out on the spot)
- ❌ No early warning alert (only alerted when 100% full)
- ❌ Connection pool too small (should have been sized for traffic)

---

## Resolution

### Short-term Fix

**Immediate** (Restore service):
1. Restarted payment service to release connections
   - `systemctl restart payment-service`
   - Impact: Service restored in 2 minutes

2. Monitored connection pool for 30 minutes
   - Verified connections stayed <50%
   - No recurrence

**Short-term** (Prevent immediate recurrence):
1. Fixed connection leak in payment service code
   - Added `finally` block with `conn.close()`
   - Deployed hotfix at 16:00 UTC
   - Verified no leak with load test

2. Increased connection pool size
   - Changed `max_connections` from 100 to 200
   - Provides headroom for traffic spikes

3. Added connection pool monitoring alert
   - Alert at 80% usage (early warning)
   - Prevents exhaustion

---

### Long-term Prevention

**Action Items** (with owners and deadlines):

| # | Action | Priority | Owner | Due Date | Status |
|---|--------|----------|-------|----------|--------|
| 1 | Add automated test for connection cleanup | P1 | Lisa (QA) | 2025-10-27 | ✅ Done |
| 2 | Add linter rule to check connection cleanup | P1 | Mike (Dev) | 2025-10-27 | ✅ Done |
| 3 | Add connection timeout (30s) | P2 | Tom (DBA) | 2025-10-28 | ⏳ In Progress |
| 4 | Review all DB queries for connection leaks | P2 | Mike (Dev) | 2025-11-02 | 📅 Planned |
| 5 | Load test before high-traffic events | P3 | John (DevOps) | 2025-11-10 | 📅 Planned |
| 6 | Create runbook: Connection Pool Issues | P3 | Jane (SRE) | 2025-10-28 | ✅ Done |
| 7 | Add circuit breaker to prevent cascades | P3 | Mike (Dev) | 2025-11-15 | 📅 Planned |

---

## Lessons Learned

### What Went Well

1. **Monitoring was effective**
   - Alert fired within 1 minute of issue
   - Clear symptoms (connection pool full)

2. **Response was fast**
   - On-call responded in 2 minutes
   - Root cause identified in 10 minutes
   - Service restored in 15 minutes

3. **Communication was clear**
   - Updates every 10 minutes
   - Status page updated promptly
   - Customer support informed

4. **Team collaboration**
   - SRE diagnosed, Developer fixed, DBA scaled
   - Clear roles and responsibilities

---

### What Went Wrong

1. **Connection leak in production**
   - Code review missed the leak
   - No automated test or linter
   - Developer unfamiliar with best practices

2. **No early warning**
   - Alert only fired at 100% (too late)
   - Should alert at 80% for early action

3. **Capacity planning gap**
   - Connection pool too small for Black Friday
   - No load testing before high-traffic event

4. **No runbook**
   - Had to figure out diagnosis on the fly
   - Runbook would have saved 5-10 minutes

5. **No circuit breaker**
   - Could have prevented full outage
   - Should fail gracefully, not cascade

---

### Preventable?

**YES** - This incident was preventable.

**How it could have been prevented**:
1. ✅ Automated test for connection cleanup → Would have caught leak
2. ✅ Linter rule for connection cleanup → Would have caught in CI
3. ✅ Load testing before Black Friday → Would have found pool too small
4. ✅ Connection pool monitoring at 80% → Would have given early warning
5. ✅ Code review focus on error paths → Would have caught missing `finally`

---

## Prevention Strategies

### Technical Improvements

1. **Automated Testing**
   - ✅ Add integration test for connection cleanup
   - ✅ Add linter rule: `require-connection-cleanup`
   - ✅ Test error paths (not just happy path)

2. **Monitoring & Alerting**
   - ✅ Alert at 80% connection pool usage (early warning)
   - ✅ Alert on increasing connection count (detect leaks early)
   - ✅ Dashboard for connection pool metrics

3. **Capacity Planning**
   - ✅ Load test before high-traffic events
   - ✅ Review connection pool size quarterly
   - ✅ Auto-scaling for application (not just database)

4. **Resilience Patterns**
   - ⏳ Circuit breaker (prevent cascade failures)
   - ⏳ Connection timeout (30s)
   - ⏳ Graceful degradation (fallback data)

---

### Process Improvements

1. **Code Review**
   - ✅ Checklist: Connection cleanup in error paths
   - ✅ Required reviewer: Someone familiar with DB best practices
   - ✅ Automated checks (linter, tests)

2. **Runbooks**
   - ✅ Create runbook: Connection Pool Exhaustion
   - ⏳ Create runbook: Database Performance Issues
   - ⏳ Quarterly runbook review/update

3. **Training**
   - ⏳ Database best practices training for developers
   - ⏳ Connection pool management workshop
   - ⏳ Incident response training

4. **Capacity Planning**
   - ✅ Load test before high-traffic events (Black Friday, launch days)
   - ⏳ Quarterly capacity review
   - ⏳ Traffic forecasting for events

---

### Cultural Improvements

1. **Blameless Culture**
   - This post-mortem focuses on systems, not individuals
   - Goal: Learn and improve, not blame

2. **Psychological Safety**
   - Encourage raising concerns (e.g., "I'm not sure about error handling")
   - No punishment for mistakes

3. **Continuous Learning**
   - Share post-mortems org-wide
   - Regular incident review meetings
   - Learn from other teams' incidents

---

## Recommendations

### Immediate (This Week)

- [x] Fix connection leak in code (DONE)
- [x] Add connection pool monitoring at 80% (DONE)
- [x] Create runbook for connection pool issues (DONE)
- [ ] Add automated test for connection cleanup
- [ ] Add linter rule for connection cleanup

### Short-term (This Month)

- [ ] Add connection timeout configuration
- [ ] Review all database queries for leaks
- [ ] Load test with 10x traffic
- [ ] Database best practices training

### Long-term (This Quarter)

- [ ] Implement circuit breakers
- [ ] Quarterly capacity planning process
- [ ] Add auto-scaling for application tier
- [ ] Regular runbook review/update process

---

## Supporting Information

### Related Incidents

- **2025-09-15**: Database connection pool exhausted (similar issue)
  - Same root cause (connection leak)
  - Should have prevented this incident!

- **2025-08-10**: Payment service OOM crash
  - Memory leak, different symptom

### Related Documentation

- [Database Architecture](https://wiki.example.com/db-arch)
- [Connection Pool Best Practices](https://wiki.example.com/db-pool)
- [Incident Response Process](https://wiki.example.com/incident-response)

### Metrics

**Availability**:
- Monthly uptime target: 99.9% (43.2 min downtime allowed)
- This month actual: 99.93% (30 min downtime)
- Status: ✅ Within SLA

**MTTR** (Mean Time To Resolution):
- This incident: 30 minutes
- Team average: 45 minutes
- Status: ✅ Better than average

---

## Acknowledgments

**Thanks to**:
- Jane (SRE) - Quick diagnosis and mitigation
- Mike (Developer) - Fast code fix
- Tom (DBA) - Connection pool scaling
- Customer Support team - Handling user complaints

---

## Sign-off

This post-mortem has been reviewed and approved:

- [x] Author: Jane (SRE) - YYYY-MM-DD
- [x] Engineering Lead: Mike - YYYY-MM-DD
- [x] Manager: Sarah - YYYY-MM-DD
- [x] Action items tracked in: [JIRA-1234](link)

**Next Review**: [Date] - Check action item progress

---

**Remember**: Incidents are learning opportunities. The goal is not to find fault, but to improve our systems and processes.
