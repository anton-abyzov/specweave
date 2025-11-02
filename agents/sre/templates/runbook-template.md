# Runbook: [Incident Type Title]

**Last Updated**: YYYY-MM-DD
**Owner**: Team/Person Name
**Severity**: SEV1 / SEV2 / SEV3
**Expected Time to Resolve**: X minutes

---

## Purpose

Brief description of what this runbook covers and when to use it.

**Example**:
```
This runbook provides step-by-step instructions for diagnosing and resolving database connection pool exhaustion issues. Use this runbook when you receive alerts about database connections reaching the maximum limit or when applications are unable to connect to the database.
```

---

## Symptoms

List of symptoms that indicate this issue.

- [ ] Alert: "[Alert Name]" triggered
- [ ] Error message: "[Specific error message]"
- [ ] Users report: "[User-facing symptom]"
- [ ] Monitoring shows: "[Metric/graph pattern]"

**Example**:
```
- [ ] Alert: "Database Connection Pool Exhausted" triggered
- [ ] Error message: "FATAL: remaining connection slots are reserved"
- [ ] Users report: Unable to log in or load pages
- [ ] Monitoring shows: Connection count = max_connections
```

---

## Prerequisites

What you need before starting:

- [ ] Access to: [Systems/tools required]
- [ ] Permissions: [Required permissions]
- [ ] Tools installed: [Required tools]
- [ ] Contact info: [Who to escalate to]

**Example**:
```
- [ ] SSH access to database server
- [ ] sudo privileges
- [ ] Database admin credentials
- [ ] Access to monitoring dashboard
- [ ] Escalation: DBA team (#database-team)
```

---

## Quick Reference

**TL;DR** for experienced responders:

```bash
# 1. Check connection count
psql -c "SELECT count(*) FROM pg_stat_activity"

# 2. Identify connections
psql -c "SELECT * FROM pg_stat_activity WHERE state != 'idle'"

# 3. Kill idle connections
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction'"

# 4. Restart application
systemctl restart application

# 5. Monitor
watch -n 5 'psql -c "SELECT count(*) FROM pg_stat_activity"'
```

---

## Detailed Diagnosis

Step-by-step diagnostic process.

### Step 1: [First Diagnostic Step]

**What to do**:
```bash
# Commands to run
<command>
```

**What to look for**:
- [ ] Expected output: `<expected>`
- [ ] Problem indicator: `<problem>`

**Example**:
```bash
# Check current connection count
psql -c "SELECT count(*) FROM pg_stat_activity"
```

**What to look for**:
- [ ] Normal: count < 80 (if max = 100)
- [ ] Warning: count 80-95
- [ ] Critical: count >= 100

---

### Step 2: [Second Diagnostic Step]

**What to do**:
```bash
# Commands to run
<command>
```

**What to look for**:
- [ ] Expected output: `<expected>`
- [ ] Problem indicator: `<problem>`

**Example**:
```bash
# Identify idle connections
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction'"
```

**What to look for**:
- [ ] No results: No idle transactions (good)
- [ ] Many results: Connection leak (problem)

---

### Step 3: [Identify Root Cause]

Based on symptoms, identify likely root cause:

| Symptom | Root Cause |
|---------|------------|
| [Symptom 1] | [Likely cause 1] |
| [Symptom 2] | [Likely cause 2] |
| [Symptom 3] | [Likely cause 3] |

**Example**:
```
| Many idle transactions | Connection leak (connections not closed) |
| All connections active | High load (scale up) |
| Specific app connections | Application issue |
```

---

## Mitigation

### Immediate (Now - 5 min)

**Goal**: Stop the bleeding, restore service

**Option A: [Immediate Fix Option 1]**
```bash
# Commands
<command>
```

**Impact**: [What this does]
**Risk**: [Potential risks]
**When to use**: [When this option is appropriate]

---

**Option B: [Immediate Fix Option 2]**
```bash
# Commands
<command>
```

**Impact**: [What this does]
**Risk**: [Potential risks]
**When to use**: [When this option is appropriate]

---

### Short-term (5 min - 1 hour)

**Goal**: Tactical fix to prevent immediate recurrence

**Steps**:
1. [ ] [Action 1]
2. [ ] [Action 2]
3. [ ] [Action 3]

**Commands**:
```bash
# Step 1
<command>

# Step 2
<command>
```

---

### Long-term (1 hour+)

**Goal**: Permanent fix to prevent future occurrences

**Action Items**:
- [ ] [Long-term fix 1]
  - Owner: [Name/Team]
  - Due: [Date]

- [ ] [Long-term fix 2]
  - Owner: [Name/Team]
  - Due: [Date]

- [ ] [Long-term fix 3]
  - Owner: [Name/Team]
  - Due: [Date]

---

## Verification

How to verify the issue is resolved:

- [ ] [Verification step 1]
- [ ] [Verification step 2]
- [ ] [Verification step 3]
- [ ] [Verification step 4]

**Example**:
```
- [ ] Connection count < 80% of max
- [ ] No active alerts
- [ ] Application health check passing
- [ ] Users able to access application
- [ ] Monitor for 30 minutes (no recurrence)
```

**Commands**:
```bash
# Verify connection count
psql -c "SELECT count(*) FROM pg_stat_activity"

# Verify health check
curl http://localhost/health
```

---

## Communication

### Status Page Update Template

```markdown
[HH:MM] Investigating: We are currently investigating [issue description]. Our team is actively working on a resolution.

[HH:MM] Identified: We have identified the issue as [root cause]. We are implementing a fix.

[HH:MM] Monitoring: The fix has been deployed. We are monitoring to ensure stability.

[HH:MM] Resolved: The issue has been fully resolved. All services are operating normally.
```

### Internal Communication

**Slack Template**:
```
:rotating_light: Incident: [Incident Title]
Severity: SEV1/SEV2/SEV3
Impact: [Brief impact description]
Status: Investigating / Mitigating / Resolved
ETA: [Estimated resolution time]
Incident Channel: #incident-YYYYMMDD-name
```

---

## Escalation

### When to Escalate

Escalate if:
- [ ] Issue not resolved in [X] minutes
- [ ] Root cause unclear after [Y] attempts
- [ ] Impact spreading to other services
- [ ] Require permissions you don't have
- [ ] Need additional expertise

### Escalation Contacts

| Role | Contact | When to Escalate |
|------|---------|------------------|
| [Role 1] | [Name/Slack/Phone] | [Escalation criteria] |
| [Role 2] | [Name/Slack/Phone] | [Escalation criteria] |
| [Manager] | [Name/Slack/Phone] | [Escalation criteria] |

**Example**:
```
| DBA | @tom-dba / +1-555-0100 | Database configuration issue |
| Dev Lead | @mike-dev / +1-555-0200 | Application code issue |
| On-call Manager | @sarah-manager / +1-555-0300 | Cannot resolve in 30 minutes |
```

---

## Prevention

### Monitoring

Alerts to have in place:

- [ ] Alert: [Alert name] when [condition]
  - Threshold: [Value]
  - Action: [What to do]

**Example**:
```
- [ ] Alert: "Connection Pool Warning" when connections >80%
  - Threshold: 80 connections (max 100)
  - Action: Investigate connection usage
```

### Best Practices

To prevent this issue:
- [ ] [Best practice 1]
- [ ] [Best practice 2]
- [ ] [Best practice 3]

**Example**:
```
- [ ] Always close database connections in finally block
- [ ] Use connection pooling with timeout
- [ ] Monitor connection pool usage
- [ ] Load test before high-traffic events
```

---

## Related Incidents

Links to past incidents of this type:

- [YYYY-MM-DD] [Incident title] - [Brief description] - [Link to post-mortem]

**Example**:
```
- [2025-09-15] Database Connection Pool Exhausted - Payment service connection leak - [Post-mortem](../post-mortems/2025-09-15.md)
```

---

## Related Documentation

Links to related runbooks, documentation, architecture diagrams:

- [Link 1] - [Description]
- [Link 2] - [Description]
- [Link 3] - [Description]

**Example**:
```
- [Database Architecture](https://wiki.example.com/db-architecture) - Database setup and configuration
- [Application Deployment](https://wiki.example.com/deploy) - How to deploy application
- [Monitoring Dashboard](https://grafana.example.com/d/database) - Database metrics
```

---

## Appendix

### Useful Commands

```bash
# Command 1: [Description]
<command>

# Command 2: [Description]
<command>

# Command 3: [Description]
<command>
```

### Logs to Check

- **Application logs**: `/var/log/application/error.log`
- **System logs**: `/var/log/syslog`
- **Database logs**: `/var/log/postgresql/postgresql.log`

### Configuration Files

- **Application config**: `/etc/application/config.yaml`
- **Database config**: `/etc/postgresql/postgresql.conf`
- **Nginx config**: `/etc/nginx/nginx.conf`

---

## Changelog

| Date | Change | By Whom |
|------|--------|---------|
| YYYY-MM-DD | Initial creation | [Name] |
| YYYY-MM-DD | Added Step X based on incident | [Name] |
| YYYY-MM-DD | Updated escalation contacts | [Name] |

---

**Questions or updates?** Contact [Owner] or update this runbook directly.
