# Mitigation Plan: [Incident Title]

**Date**: YYYY-MM-DD HH:MM UTC
**Incident**: [Brief description]
**Root Cause**: [Root cause if known, or "Under investigation"]
**Severity**: SEV1 / SEV2 / SEV3
**Created By**: [Name]

---

## Executive Summary

**Problem**: [What's broken in one sentence]

**Impact**: [Who's affected and how]

**Solution**: [High-level approach]

**ETA**: [Estimated time to resolution]

**Example**:
```
Problem: Database connection pool exhausted due to connection leak
Impact: All users unable to access application (100% downtime)
Solution: Restart application + fix connection leak in code
ETA: 30 minutes (service restored in 5 min, permanent fix in 30 min)
```

---

## Three-Horizon Mitigation

### Immediate (Now - 5 minutes)

**Goal**: Stop the bleeding, restore service immediately

**Actions**:
- [ ] [Action 1]
  - **What**: [Detailed description]
  - **How**: [Commands/steps]
  - **Impact**: [Expected improvement]
  - **Risk**: [Low/Medium/High + explanation]
  - **Rollback**: [How to undo if it fails]
  - **ETA**: [Time to execute]
  - **Owner**: [Who will do this]

**Example**:
```
- [ ] Restart payment service to release connections
  - What: Restart payment service to release database connections
  - How: `systemctl restart payment-service`
  - Impact: All 100 connections released, service restored
  - Risk: Low (stateless service, graceful restart)
  - Rollback: N/A (restart is safe)
  - ETA: 2 minutes
  - Owner: Jane (SRE)

- [ ] Monitor connection pool for 5 minutes
  - What: Verify connections stay below 80%
  - How: `watch -n 5 'psql -c "SELECT count(*) FROM pg_stat_activity"'`
  - Impact: Early detection if issue recurs
  - Risk: None (monitoring only)
  - Rollback: N/A
  - ETA: 5 minutes
  - Owner: Jane (SRE)
```

**Success Criteria**:
- [ ] Service health check passing
- [ ] Users able to access application
- [ ] Connection pool <80% of max
- [ ] No active alerts

---

### Short-term (5 minutes - 1 hour)

**Goal**: Tactical fix to prevent immediate recurrence

**Actions**:
- [ ] [Action 1]
  - **What**: [Detailed description]
  - **How**: [Commands/steps]
  - **Impact**: [Expected improvement]
  - **Risk**: [Low/Medium/High + explanation]
  - **Rollback**: [How to undo if it fails]
  - **ETA**: [Time to execute]
  - **Owner**: [Who will do this]

**Example**:
```
- [ ] Fix connection leak in payment service code
  - What: Add `finally` block to close connection in error path
  - How: Deploy hotfix branch `fix/connection-leak`
  - Impact: Connections properly closed, no leak
  - Risk: Medium (code change requires testing)
  - Rollback: `git revert <commit>` + redeploy
  - ETA: 30 minutes (test + deploy)
  - Owner: Mike (Developer)

- [ ] Increase connection pool size
  - What: Increase max_connections from 100 to 200
  - How: ALTER SYSTEM SET max_connections = 200; SELECT pg_reload_conf();
  - Impact: More headroom for traffic spikes
  - Risk: Low (more connections = more memory, but server has capacity)
  - Rollback: ALTER SYSTEM SET max_connections = 100; SELECT pg_reload_conf();
  - ETA: 5 minutes
  - Owner: Tom (DBA)

- [ ] Add connection pool monitoring alert
  - What: Alert when connections >80% of max
  - How: Create CloudWatch/Grafana alert
  - Impact: Early warning before exhaustion
  - Risk: None (monitoring only)
  - Rollback: Disable alert
  - ETA: 15 minutes
  - Owner: Jane (SRE)
```

**Success Criteria**:
- [ ] Code fix deployed and verified
- [ ] Connection pool increased
- [ ] Monitoring alert configured
- [ ] No recurrence in 1 hour
- [ ] Load test passed (if applicable)

---

### Long-term (1 hour - days/weeks)

**Goal**: Permanent fix and prevention

**Actions**:
- [ ] [Action 1]
  - **What**: [Detailed description]
  - **Priority**: P1 / P2 / P3
  - **Due Date**: [YYYY-MM-DD]
  - **Owner**: [Who will do this]

**Example**:
```
- [ ] Add automated test for connection cleanup
  - What: Integration test that verifies connections are closed in error paths
  - Priority: P1
  - Due Date: 2025-10-27
  - Owner: Lisa (QA)

- [ ] Add connection timeout configuration
  - What: Set connection_timeout = 30s in database config
  - Priority: P2
  - Due Date: 2025-10-28
  - Owner: Tom (DBA)

- [ ] Review all database queries for connection leaks
  - What: Audit all DB queries to ensure proper cleanup
  - Priority: P3
  - Due Date: 2025-11-02
  - Owner: Mike (Developer)

- [ ] Load test for high-traffic events
  - What: Load test with 10x normal traffic to find bottlenecks
  - Priority: P3
  - Due Date: 2025-11-10
  - Owner: John (DevOps)

- [ ] Update runbook with new findings
  - What: Document connection leak troubleshooting steps
  - Priority: P3
  - Due Date: 2025-10-28
  - Owner: Jane (SRE)
```

**Success Criteria**:
- [ ] All P1 actions completed
- [ ] Regression test added (prevents future occurrences)
- [ ] Monitoring improved (detect earlier)
- [ ] Runbook updated
- [ ] Post-mortem published

---

## Risk Assessment

### Risks of Mitigation Actions

| Action | Risk Level | Risk Description | Mitigation |
|--------|------------|------------------|------------|
| [Action 1] | Low/Med/High | [What could go wrong] | [How to reduce risk] |

**Example**:
```
| Restart service | Low | Brief downtime (5s) | Use graceful restart, off-peak time |
| Deploy code fix | Medium | Bug in fix could worsen issue | Test in staging first, have rollback ready |
| Increase connection pool | Low | More memory usage | Server has capacity, monitor memory |
```

### Risks of NOT Mitigating

| Risk | Impact | Probability |
|------|--------|-------------|
| [Risk 1] | [Impact if we do nothing] | High/Med/Low |

**Example**:
```
| Service remains down | All users affected, revenue loss | High (will recur) |
| Connection leak worsens | Database crashes | High |
| SLA breach | Customer refunds, reputation damage | Medium |
```

---

## Communication Plan

### Internal Communication

**Incident Channel**: #incident-YYYYMMDD-title

**Update Frequency**: Every [X] minutes

**Stakeholders to Notify**:
- [ ] Engineering team (#engineering)
- [ ] Customer support (#support)
- [ ] Management (#management)
- [ ] [Other teams]

**Update Template**:
```markdown
[HH:MM] Update:
- Status: [Investigating / Mitigating / Resolved]
- Root Cause: [Known / Under investigation]
- Current Action: [What we're doing now]
- Next Steps: [What's next]
- ETA: [Estimated resolution time]
```

---

### External Communication

**Status Page**: [URL]

**Update Frequency**: Every [X] minutes or when status changes

**Status Page Template**:
```markdown
[HH:MM] Investigating: We are currently investigating [issue description]. Our team is actively working on a resolution.

[HH:MM] Identified: We have identified the issue as [root cause]. We are implementing a fix. ETA: [time].

[HH:MM] Monitoring: The fix has been deployed. We are monitoring to ensure stability.

[HH:MM] Resolved: The issue has been fully resolved. All services are operating normally. We apologize for the inconvenience.
```

**Customer Email** (if needed):
- [ ] Draft email
- [ ] Approve with management
- [ ] Send to affected customers

---

## Validation

### Before Declaring Resolved

Verify all of the following:

- [ ] Root cause identified
- [ ] Immediate fix deployed and verified
- [ ] Service health check passing for >30 minutes
- [ ] Users able to access application
- [ ] Metrics returned to normal (response time, error rate, etc.)
- [ ] No active alerts
- [ ] Load test passed (if applicable)
- [ ] Customer support confirms no ongoing issues

### Monitoring After Resolution

Monitor for [X] hours after declaring resolved:

- [ ] [Metric 1] within normal range
- [ ] [Metric 2] within normal range
- [ ] [Metric 3] within normal range
- [ ] No error spikes
- [ ] No user complaints

**Example**:
```
- [ ] Connection pool <50% of max
- [ ] API response time <200ms (p95)
- [ ] Error rate <0.1%
- [ ] Database CPU <70%
```

---

## Rollback Plan

If mitigation actions fail or make things worse:

### Immediate Rollback

```bash
# Rollback code deployment
git revert <commit>
npm run deploy

# Rollback database config
ALTER SYSTEM SET max_connections = 100;
SELECT pg_reload_conf();

# Verify rollback
curl http://localhost/health
```

### When to Rollback

Rollback if:
- [ ] Issue worsens after mitigation
- [ ] New errors appear
- [ ] Service remains down >X minutes after mitigation
- [ ] Metrics worsen (response time, error rate)

---

## Next Steps

After incident is resolved:

1. [ ] Create post-mortem (within 24 hours)
   - Owner: [Name]
   - Due: [Date]

2. [ ] Schedule post-mortem review meeting
   - Date: [Date]
   - Attendees: [List]

3. [ ] Track action items to completion
   - Use: [JIRA/GitHub/etc.]
   - Review: Weekly in team meeting

4. [ ] Update runbooks based on learnings
   - Owner: [Name]
   - Due: [Date]

5. [ ] Share learnings with organization
   - Format: All-hands presentation / Email / Wiki
   - Owner: [Name]
   - Due: [Date]

---

## Appendix

### Commands Reference

```bash
# Useful commands for this incident
<command1>
<command2>
<command3>
```

### Links

- **Monitoring Dashboard**: [URL]
- **Runbook**: [URL]
- **Related Incidents**: [URL]
- **Incident Channel**: [Slack/Teams URL]

---

**Plan Created**: YYYY-MM-DD HH:MM UTC
**Plan Updated**: YYYY-MM-DD HH:MM UTC
**Status**: Active / Executed / Superseded
