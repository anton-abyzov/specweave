---
name: sync-monitor
description: Show sync orchestration dashboard - scheduled jobs status, pending notifications, and recent sync activity across GitHub, JIRA, and ADO.
---

# Sync Monitor Dashboard

Show sync orchestration status at a glance - jobs, notifications, and recent activity.

## Usage

```bash
/sw:sync-monitor           # Show dashboard
/sw:sync-monitor --json    # JSON output for scripting
```

## Arguments

- `--json`: Output machine-readable JSON instead of formatted dashboard

## Workflow

1. **Fetch dashboard data** from DashboardDataProvider:
   - Get all scheduled job statuses (real-time)
   - Get notification summary (5s cache)
   - Get last 24h sync activity (1m cache)

2. **Display formatted dashboard**:
   ```
   ╔══════════════════════════════════════════════════════════════╗
   ║                    SYNC MONITOR DASHBOARD                     ║
   ╠══════════════════════════════════════════════════════════════╣
   ║ SCHEDULED JOBS                                                ║
   ╟──────────────────────────────────────────────────────────────╢
   ║ external-sync      │ ✅ idle    │ Last: 5m ago │ Next: 10m   ║
   ║ discrepancy-check  │ 🔄 running │ Started: 2m ago            ║
   ║ living-docs-sync   │ ⏸️ disabled                             ║
   ╠══════════════════════════════════════════════════════════════╣
   ║ PENDING NOTIFICATIONS (3)                                     ║
   ╟──────────────────────────────────────────────────────────────╢
   ║ ❗ CRITICAL: GitHub sync failed (rate limited)                ║
   ║ ⚠️ WARNING: 2 discrepancies detected in FS-045               ║
   ║ ℹ️ INFO: 107 items imported from JIRA (project CORE)         ║
   ╠══════════════════════════════════════════════════════════════╣
   ║ RECENT SYNC ACTIVITY (last 24h)                               ║
   ╟──────────────────────────────────────────────────────────────╢
   ║ GitHub: 45 synced │ JIRA: 12 synced │ ADO: 0 synced          ║
   ║ Success: 55 │ Failed: 2 │ Skipped (no permission): 8         ║
   ╚══════════════════════════════════════════════════════════════╝
   ```

## Output

- **Jobs Section**: Shows each scheduled job with status emoji, last run, next run
- **Notifications Section**: Shows pending notification count and recent items
- **Activity Section**: Shows last 24h sync stats by platform and result

## Related

- `/sw:notifications`: Manage notifications
- `/sw:discrepancies`: View and act on discrepancies
- `/sw:sync-logs`: Query sync audit logs
