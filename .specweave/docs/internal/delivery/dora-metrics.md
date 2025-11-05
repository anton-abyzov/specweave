# DORA Metrics - Engineering Performance Tracking

**Purpose**: Track DORA (DevOps Research and Assessment) metrics to measure engineering excellence and continuous improvement.

**Last Updated**: 2025-11-04
**Owner**: Engineering Leadership

---

## What are DORA Metrics?

DORA metrics are four key metrics that indicate the performance of software delivery and operational stability:

1. **Deployment Frequency** - How often we deploy to production
2. **Lead Time for Changes** - Time from code commit to production deployment
3. **Change Failure Rate** - Percentage of deployments causing production failures
4. **Time to Restore Service** - How quickly we recover from production incidents

**Source**: [DORA State of DevOps Research](https://dora.dev/)

---

## Performance Levels

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| **Deployment Frequency** | On-demand (multiple/day) | Weekly - Monthly | Monthly - 6 months | < 6 months |
| **Lead Time for Changes** | < 1 hour | 1 day - 1 week | 1 week - 1 month | 1-6 months |
| **Change Failure Rate** | 0-15% | 16-30% | 31-45% | > 45% |
| **Time to Restore Service** | < 1 hour | < 1 day | 1 day - 1 week | > 1 week |

**Goal**: Achieve **High** performance across all metrics (Elite is aspirational).

---

## Current Performance (Example)

| Metric | Current | Goal | Status |
|--------|---------|------|--------|
| **Deployment Frequency** | Weekly | Weekly | ✅ High |
| **Lead Time for Changes** | 3 days | < 1 week | ✅ High |
| **Change Failure Rate** | 12% | < 15% | ✅ Elite |
| **Time to Restore Service** | 2 hours | < 1 day | ✅ High |

**Overall Rating**: **High** (3/4 metrics at High or Elite)

---

## How We Measure

### 1. Deployment Frequency
**Data Source**: CI/CD logs, GitHub Actions workflow runs

**Calculation**:
```sql
SELECT
  COUNT(*) / DATE_DIFF(MAX(deployed_at), MIN(deployed_at), DAY) AS deploys_per_day
FROM deployments
WHERE deployed_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND environment = 'production'
  AND status = 'success'
```

**Tracking**: Automated via CI/CD pipeline (post-deployment hook logs to metrics DB)

---

### 2. Lead Time for Changes
**Data Source**: Git commits, CI/CD pipeline timestamps

**Calculation**:
```sql
SELECT
  AVG(TIMESTAMP_DIFF(deployed_at, commit_timestamp, HOUR)) AS avg_lead_time_hours
FROM deployments d
JOIN commits c ON d.commit_sha = c.sha
WHERE deployed_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND environment = 'production'
```

**Tracking**: Git commit → CI/CD pipeline → production deployment (tracked automatically)

---

### 3. Change Failure Rate
**Data Source**: Deployments, rollbacks, incident logs

**Calculation**:
```sql
SELECT
  COUNT(CASE WHEN rollback = TRUE OR incident_count > 0 THEN 1 END) * 100.0 / COUNT(*) AS failure_rate_pct
FROM deployments
WHERE deployed_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND environment = 'production'
```

**Tracking**: Manual incident tagging + automated rollback detection

---

### 4. Time to Restore Service
**Data Source**: Incident management system (PagerDuty, Opsgenie, or manual logs)

**Calculation**:
```sql
SELECT
  AVG(TIMESTAMP_DIFF(resolved_at, detected_at, MINUTE)) AS avg_mttr_minutes
FROM incidents
WHERE detected_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND severity IN ('P1', 'P2')  -- Critical and high severity
  AND status = 'resolved'
```

**Tracking**: Incident logs → MTTR calculation (updated after incident resolution)

---

## Action Items to Improve

### Deployment Frequency
- ✅ **Implemented**: CI/CD pipeline with automated testing
- 🔄 **In Progress**: Feature flags for gradual rollouts
- 📅 **Planned**: Blue-green deployments for zero-downtime

### Lead Time for Changes
- ✅ **Implemented**: Branch protection rules, fast PR reviews (< 4 hours SLA)
- 🔄 **In Progress**: Automated E2E test suite (reduce manual QA time)
- 📅 **Planned**: Pre-merge integration testing environments

### Change Failure Rate
- ✅ **Implemented**: Pre-commit hooks, PR code review checklists
- 🔄 **In Progress**: Automated smoke tests post-deployment
- 📅 **Planned**: Canary deployments for high-risk changes

### Time to Restore Service
- ✅ **Implemented**: On-call rotation, runbooks for common incidents
- 🔄 **In Progress**: Automated rollback procedures
- 📅 **Planned**: Chaos engineering for failure testing

---

## Dashboard

**Tool**: Grafana / DataDog / Custom Dashboard

**Panels**:
1. Deployment Frequency (line chart, last 90 days)
2. Lead Time for Changes (histogram, p50/p90/p95)
3. Change Failure Rate (line chart, last 90 days)
4. Time to Restore Service (histogram, p50/p90/p95)

**Access**: [Internal Dashboard Link] (replace with actual link)

---

## Quarterly Review

**Schedule**: Every quarter (end of Q1, Q2, Q3, Q4)

**Participants**: Engineering leads, DevOps, product managers

**Agenda**:
1. Review current DORA metrics vs. goals
2. Identify trends (improving/declining metrics)
3. Root cause analysis for degraded metrics
4. Action items for next quarter
5. Update goals if needed

**Next Review**: End of Q1 2026

---

## Related Documentation

- [Release Process](./release-process.md) - Links to deployment frequency
- [Testing Strategy](./guides/testing-strategy.md) - Links to change failure rate
- **Incident Response** - *Coming soon* - Performance incident handling and MTTR tracking
- **CI/CD Pipeline** - *Coming soon* - Automated deployment and lead time tracking
- [Branching Strategy](./branch-strategy.md) - Links to lead time

---

## References

- [DORA Research](https://dora.dev/) - Source of DORA metrics
- [Accelerate Book](https://www.amazon.com/Accelerate-Software-Performing-Technology-Organizations/dp/1942788339) - DORA metrics background
- [Google Cloud DORA Metrics](https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance) - Implementation guide
