---
title: LivingSpec Sync Monitoring
status: draft
created: 2025-12-06
---

# LivingSpec Sync Monitoring

## Overview

Monitoring sync operations between LivingSpec and external tools (GitHub, JIRA, ADO).

## Key Metrics

### Sync Health

| Metric | Description | Target |
|--------|-------------|--------|
| Sync Success Rate | % of successful sync operations | > 99% |
| Sync Latency | Time from external change to local update | < 5 min |
| Conflict Rate | % of syncs with conflicts | < 1% |
| E-Suffix Consistency | % of external items with valid E-suffix | 100% |

### Error Categories

| Error Type | Severity | Action |
|------------|----------|--------|
| API Rate Limit | Warning | Implement backoff |
| Auth Failure | Critical | Alert immediately |
| Schema Mismatch | Error | Block sync, notify |
| E-Suffix Violation | Critical | Block sync, auto-fix |

## Monitoring Dashboard

```yaml
# prometheus/rules.yml
groups:
  - name: livingspec_sync
    rules:
      - alert: SyncFailureRate
        expr: sum(rate(livingspec_sync_failures_total[5m])) / sum(rate(livingspec_sync_total[5m])) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High sync failure rate"

      - alert: ESuffixViolation
        expr: livingspec_esuffix_violations > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "E-suffix validation failure detected"
```

## Runbook: Sync Failure

### Symptoms
- Sync operations timing out
- External items not appearing in LivingSpec
- Stale data in documentation

### Diagnosis

1. Check sync logs:
   ```bash
   livingspec sync --status
   ```

2. Verify API connectivity:
   ```bash
   livingspec sync --test-connection github
   livingspec sync --test-connection jira
   livingspec sync --test-connection ado
   ```

3. Check for conflicts:
   ```bash
   livingspec sync --show-conflicts
   ```

### Resolution

1. **Rate Limit**: Wait for reset, implement caching
2. **Auth Failure**: Refresh tokens, verify permissions
3. **Schema Mismatch**: Update to latest schema version
4. **E-Suffix Violation**: Run auto-fix or manual correction

## E-Suffix Monitoring

### Validation Checks

```bash
# Check all E-suffix items are valid
livingspec validate --check-esuffix

# Report E-suffix statistics
livingspec report --esuffix-stats
```

### Expected Output

```
E-Suffix Statistics:
  Total External Items: 142
  - Epics (EP-*E): 12
  - Features (FS-*E): 28
  - User Stories (US-*E): 89
  - Tasks (T-*E): 13

  Propagation Compliance: 100%
  Invalid Patterns: 0
```

## Alerting

### PagerDuty Integration

```yaml
# alertmanager.yml
receivers:
  - name: livingspec-team
    pagerduty_configs:
      - service_key: <key>
        severity: critical

route:
  receiver: livingspec-team
  group_by: [alertname]
  routes:
    - match:
        severity: critical
      receiver: livingspec-team
```
