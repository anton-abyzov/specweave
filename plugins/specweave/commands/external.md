---
name: external
description: View external items dashboard - open issues from GitHub, JIRA, and Azure DevOps
usage: /sw:external [--refresh]
---

# External Items Dashboard

**Usage**: `/sw:external [--refresh]`

---

## Purpose

Display a comprehensive dashboard of open external items from all configured providers:
- **GitHub Issues** - Open issues in linked repository
- **JIRA Tickets** - Open issues in configured project
- **Azure DevOps Work Items** - Open work items in configured project

Helps you stay aware of pending work and unaddressed items across all tools.

---

## Output Format

```
═══════════════════════════════════════════════════════════════
                    External Items Dashboard
═══════════════════════════════════════════════════════════════

GitHub Issues (4 open, 2 stale)
───────────────────────────────────────────────────────────────
  #779     DORA Metrics Workflow Failed                  10h ago
  #778     DORA Metrics Workflow Failed                  1d ago
  #777     DORA Metrics Workflow Failed                  1d ago   ⚠️ stale
  #776     DORA Metrics Workflow Failed                  3d ago   ⚠️ stale

JIRA: not configured

ADO: not configured

───────────────────────────────────────────────────────────────
Total: 4 open (2 stale >7d)
Last updated: 2 minutes ago (use --refresh to update)
```

---

## Options

### --refresh

Force refresh the cache and fetch latest data from all providers.

```bash
/sw:external --refresh
```

---

## Implementation

When this command is invoked, execute the following:

```typescript
import { ExternalItemsCounter, displayDetailedDashboard } from '../src/core/external-tools/index';

// Parse options
const refresh = args.includes('--refresh');

// Create counter
const counter = new ExternalItemsCounter({
  projectRoot: process.cwd(),
  forceRefresh: refresh,
});

// Get summary
const summary = await counter.getSummary();

// Display dashboard
displayDetailedDashboard(summary);
```

---

## Stale Detection

Items older than 7 days are marked as "stale" with ⚠️ indicator:

- **Stale** = created more than 7 days ago and still open
- Review stale items regularly to avoid accumulating technical debt
- Close or address items promptly

---

## Caching

- Default TTL: 15 minutes
- Uses `.specweave/cache/external-items-summary.json`
- Use `--refresh` to force update from APIs
- Stale cache is used as fallback when rate limited

---

## Provider Configuration

### GitHub

Auto-detected from git remote. Requires:
- GitHub CLI (`gh`) installed
- Authenticated: `gh auth login`

### JIRA

Set environment variables:
- `JIRA_BASE_URL` - JIRA instance URL
- `JIRA_EMAIL` - Your email
- `JIRA_API_TOKEN` - API token
- `JIRA_PROJECT_KEY` - Project key (optional)

### Azure DevOps

Set environment variables:
- `ADO_ORG_URL` or `AZURE_DEVOPS_ORG_URL` - Organization URL
- `ADO_PROJECT` or `AZURE_DEVOPS_PROJECT` - Project name
- `ADO_PAT` or `AZURE_DEVOPS_PAT` - Personal Access Token

---

## Integration Points

External items are also shown in:
- `/sw:status` - Summary section at bottom
- `/sw:increment` - Notification after planning
- `/sw:progress` - Footer line

---

## Related Commands

- `/sw:status` - Show increment status with external items summary
- `/sw:progress` - Show detailed progress with external items footer
- `/sw:import-external` - Import external items as increments

---

**Command**: `/sw:external`
**Plugin**: specweave (core)
**Version**: v0.31.0
**Part of**: Increment 0109 - External Items Dashboard
