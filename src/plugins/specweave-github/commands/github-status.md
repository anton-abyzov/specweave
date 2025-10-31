---
name: specweave.github.status
description: Check GitHub sync status for SpecWeave increment. Shows issue number, sync state, progress, last update, and any sync issues. Useful for troubleshooting and monitoring.
---

# Check GitHub Sync Status

Display the current GitHub sync status for a SpecWeave increment.

## Usage

```bash
/specweave.github.status [increment-id] [options]
```

## Arguments

- `increment-id`: Increment ID (optional, defaults to current increment)

## Options

- `--all`: Show status for all increments
- `--verbose`: Show detailed sync information
- `--json`: Output in JSON format
- `--check-health`: Run health check on sync connection

## Examples

```bash
# Check current increment
/specweave.github.status

# Check specific increment
/specweave.github.status 0004

# Check all increments
/specweave.github.status --all

# Verbose output with full details
/specweave.github.status 0004 --verbose

# JSON output for scripting
/specweave.github.status 0004 --json

# Health check
/specweave.github.status --check-health
```

## Output Format

### Basic Status

```
📊 GitHub Sync Status: Increment 0004

Increment: 0004-plugin-architecture
Status: In Progress
Priority: P1

GitHub Issue: #130
URL: https://github.com/owner/repo/issues/130
State: Open
Labels: specweave, increment, P1, in-progress

Sync Status: ✅ Up-to-date
Last Synced: 5 minutes ago (2025-10-30 16:55:00)
Sync Count: 7
Auto-Sync: Enabled (every-task)

Progress:
- Tasks: 7/48 completed (15%)
- Week: 1 of 4 (Foundation)
- Current Task: T-008 - Implement Cursor compiler

GitHub vs Local:
✅ Progress matches
✅ Labels match
✅ Status matches
✅ No conflicts detected
```

### Verbose Status

```
📊 GitHub Sync Status: Increment 0004 (Detailed)

═══════════════════════════════════════════
BASIC INFO
═══════════════════════════════════════════

Increment ID: 0004
Full Name: 0004-plugin-architecture
Title: Plugin Architecture
Status: in_progress
Priority: P1
Created: 2025-10-01 10:00:00
Duration: 29 days

═══════════════════════════════════════════
GITHUB ISSUE
═══════════════════════════════════════════

Issue Number: #130
Issue URL: https://github.com/owner/repo/issues/130
Issue State: open
Issue Created: 2025-10-01 10:15:00
Issue Updated: 2025-10-30 16:55:00

Labels:
- specweave
- increment
- P1
- in-progress

Milestone: v0.4.0 (due: 2025-11-30)
Assignees: @developer1, @developer2

Comments: 12
- 7 auto-sync comments
- 5 manual comments

Last Comment:
  By: @developer2
  At: 2025-10-30 16:00:00
  Text: "Cursor adapter completed, moving to testing..."

═══════════════════════════════════════════
SYNC STATUS
═══════════════════════════════════════════

Sync State: ✅ Up-to-date
Last Synced: 5 minutes ago (2025-10-30 16:55:00)
Sync Method: Auto (post-task hook)
Sync Count: 7
Failed Syncs: 0

Auto-Sync Settings:
- Enabled: Yes
- Frequency: every-task
- Post Comments: Yes
- Update Checklist: Yes
- Update Labels: Yes
- Include Files: Yes
- Include Time: Yes

═══════════════════════════════════════════
PROGRESS
═══════════════════════════════════════════

Tasks: 7/48 completed (15%)

Week 1: Foundation (7/12 tasks, 58%)
  ✅ T-001: Plugin types
  ✅ T-002: Manifest schema
  ✅ T-003: PluginLoader
  ✅ T-004: PluginManager
  ✅ T-005: PluginDetector
  ✅ T-006: Adapter interface
  ✅ T-007: Claude installer
  ⏳ T-008: Cursor compiler (in progress)
  ⏸️ T-009: Copilot compiler
  ⏸️ T-010: Generic compiler
  ⏸️ T-011: Config schema
  ⏸️ T-012: Update .gitignore

Week 2: GitHub Plugin (0/10 tasks, 0%)
Week 3: Additional Plugins (0/15 tasks, 0%)
Week 4: Documentation (0/11 tasks, 0%)

Current Task: T-008
Estimated: 6 hours
Started: 2025-10-30 15:00:00
Duration: 2 hours (33% of estimate)

═══════════════════════════════════════════
COMPARISON (GitHub vs Local)
═══════════════════════════════════════════

✅ Progress: 7/48 (both sides match)
✅ Labels: All 4 labels match
✅ Status: in_progress (both sides)
✅ Comments: All synced (no missing)

No conflicts detected.
Last comparison: Just now

═══════════════════════════════════════════
METADATA
═══════════════════════════════════════════

Metadata File: .specweave/increments/0004/.metadata.yaml
GitHub Section:
  issue_number: 130
  issue_url: https://github.com/owner/repo/issues/130
  created_at: 2025-10-01T10:15:00Z
  last_synced_at: 2025-10-30T16:55:00Z
  sync_count: 7
  closing_comment_ids: []

Repository: owner/repo
Remote URL: https://github.com/owner/repo.git
Branch: features/0004-plugin-architecture

═══════════════════════════════════════════
HEALTH
═══════════════════════════════════════════

✅ GitHub CLI: Authenticated
✅ Repository Access: Write
✅ Issue Exists: Yes
✅ Network: Connected
✅ Rate Limit: 4,823 / 5,000 remaining
✅ Sync Hook: Installed and working

All systems operational.
```

### Status for All Increments

```
📊 GitHub Sync Status: All Increments

┌──────┬────────────────┬────────┬────────┬──────────┬─────────────┐
│ ID   │ Title          │ Issue  │ State  │ Progress │ Last Synced │
├──────┼────────────────┼────────┼────────┼──────────┼─────────────┤
│ 0001 │ Core Framework │ #100   │ Closed │ 100%     │ 30 days ago │
│ 0002 │ Enhancements   │ #110   │ Closed │ 100%     │ 15 days ago │
│ 0003 │ Model Select   │ #120   │ Closed │ 100%     │ 5 days ago  │
│ 0004 │ Plugins        │ #130   │ Open   │ 15%      │ 5 mins ago  │
│ 0005 │ Auth           │ #135   │ Open   │ 0%       │ Never       │
└──────┴────────────────┴────────┴────────┴──────────┴─────────────┘

Summary:
- Total Increments: 5
- Synced: 4
- Not Synced: 1 (0005)
- Open Issues: 2
- Closed Issues: 2

Issues:
⚠️  Increment 0005: Not synced to GitHub (run /specweave.github.create-issue 0005)
```

### JSON Output

```json
{
  "increment": {
    "id": "0004",
    "name": "0004-plugin-architecture",
    "title": "Plugin Architecture",
    "status": "in_progress",
    "priority": "P1",
    "created_at": "2025-10-01T10:00:00Z",
    "duration_days": 29
  },
  "github": {
    "issue_number": 130,
    "issue_url": "https://github.com/owner/repo/issues/130",
    "state": "open",
    "labels": ["specweave", "increment", "P1", "in-progress"],
    "milestone": "v0.4.0",
    "assignees": ["developer1", "developer2"],
    "comments_count": 12,
    "created_at": "2025-10-01T10:15:00Z",
    "updated_at": "2025-10-30T16:55:00Z"
  },
  "sync": {
    "status": "up-to-date",
    "last_synced_at": "2025-10-30T16:55:00Z",
    "sync_count": 7,
    "failed_syncs": 0,
    "auto_sync_enabled": true,
    "sync_frequency": "every-task",
    "conflicts": []
  },
  "progress": {
    "tasks_completed": 7,
    "tasks_total": 48,
    "percentage": 15,
    "current_task": "T-008",
    "current_week": 1
  },
  "health": {
    "github_cli_authenticated": true,
    "repository_access": "write",
    "issue_exists": true,
    "network_connected": true,
    "rate_limit_remaining": 4823,
    "rate_limit_total": 5000,
    "sync_hook_working": true
  }
}
```

### Health Check

```
🏥 GitHub Sync Health Check

Checking system components...

✅ GitHub CLI
   Version: 2.38.0
   Authenticated: Yes
   User: developer1

✅ Repository Access
   Repository: owner/repo
   Access Level: Write
   Remote: https://github.com/owner/repo.git

✅ Network Connectivity
   GitHub API: Reachable
   Latency: 45ms
   Status: All systems operational

✅ Rate Limits
   Remaining: 4,823 / 5,000
   Resets at: 2025-10-30 17:00:00 (5 minutes)
   Status: Healthy

✅ Sync Configuration
   Config file: .specweave/config.yaml
   Plugin enabled: Yes
   Auto-sync: Enabled
   Frequency: every-task

✅ Hooks
   Post-task hook: Installed
   Last fired: 5 minutes ago
   Status: Working

✅ Metadata Integrity
   Metadata file: Exists
   Issue number: 130 (valid)
   Timestamps: Consistent

All systems healthy! ✅
```

## Configuration

Settings from `.specweave/config.yaml`:

```yaml
plugins:
  settings:
    specweave-github:
      # Display settings
      status_display:
        default_format: "basic"  # or "verbose", "json"
        show_health: true
        show_comparison: true
```

## Use Cases

### 1. Quick Progress Check

```bash
/specweave.github.status 0004
```

See current sync state, progress, and last update time.

### 2. Troubleshooting Sync Issues

```bash
/specweave.github.status 0004 --verbose
```

Get detailed sync information to diagnose problems.

### 3. Monitoring All Increments

```bash
/specweave.github.status --all
```

Dashboard view of all increments and their sync state.

### 4. CI/CD Integration

```bash
/specweave.github.status 0004 --json | jq '.sync.status'
```

Check sync status in scripts/automation.

### 5. Health Monitoring

```bash
/specweave.github.status --check-health
```

Verify all sync components are working correctly.

## Interpreting Status

### Sync States

| State | Meaning |
|-------|---------|
| ✅ Up-to-date | Local and GitHub match |
| ⚠️ Out of sync | Changes not yet synced |
| 🔄 Syncing | Sync in progress |
| ❌ Failed | Last sync failed |
| ⏸️ Paused | Auto-sync disabled |
| ❓ Unknown | Cannot determine state |

### Common Issues

**Out of Sync**:
```
⚠️ Sync Status: Out of sync (2 changes pending)

Local changes not synced to GitHub:
- Task T-008 completed (1 hour ago)
- Task T-009 started (30 minutes ago)

Action: Run /specweave.github.sync 0004
```

**Sync Failed**:
```
❌ Sync Status: Failed (last attempt 10 minutes ago)

Error: Rate limit exceeded
Rate limit resets at: 2025-10-30 17:00:00

Action: Wait for rate limit reset, then retry
```

**No GitHub Issue**:
```
⚠️ Sync Status: Not synced

No GitHub issue found for increment 0004.

Action: Create issue first
  /specweave.github.create-issue 0004
```

## Requirements

- GitHub CLI (`gh`) installed
- Valid increment directory
- Network connectivity (for GitHub API checks)

## Related Commands

- `/specweave.github.create-issue`: Create GitHub issue
- `/specweave.github.sync`: Sync increment with GitHub
- `/specweave.github.close-issue`: Close GitHub issue
- `/specweave.progress`: Check increment progress (local only)

## Tips

1. **Quick Check**: Run `/specweave.github.status` before syncing to see if sync is needed

2. **Verbose Mode**: Use `--verbose` when troubleshooting sync issues

3. **JSON Output**: Use `--json` for automation and scripting

4. **Health Check**: Run `--check-health` if syncs are failing

5. **Monitor All**: Use `--all` to get a dashboard of all increments

## Advanced

### Watch Mode

Monitor sync status in real-time:

```bash
# Refresh every 30 seconds
watch -n 30 '/specweave.github.status 0004'
```

### Custom Health Checks

Define custom health checks:

```yaml
plugins:
  settings:
    specweave-github:
      health_checks:
        - name: "Rate Limit"
          threshold: 100  # Warn if < 100 remaining
          critical: 10    # Error if < 10

        - name: "Sync Lag"
          threshold: 3600  # Warn if not synced in 1 hour
          critical: 86400  # Error if not synced in 24 hours
```

### Status Notifications

Get notified of status changes:

```yaml
plugins:
  settings:
    specweave-github:
      notifications:
        - event: "sync_failed"
          action: "slack"
          channel: "#dev-alerts"

        - event: "rate_limit_low"
          threshold: 100
          action: "email"
          recipients: ["admin@example.com"]
```

### Status Dashboard

Generate HTML dashboard:

```bash
/specweave.github.status --all --format html > status.html
open status.html
```

---

**Command**: `/specweave.github.status`
**Plugin**: specweave-github
**Agent**: github-manager
**Version**: 1.0.0
**Last Updated**: 2025-10-30
