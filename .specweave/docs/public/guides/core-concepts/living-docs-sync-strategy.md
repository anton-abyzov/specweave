# Living Docs Sync Strategy

**Version**: 0.28.65+
**Last Updated**: 2025-12-01

This guide explains **when**, **why**, and **how** living documentation stays synchronized in SpecWeave.

## Quick Reference: When Does Sync Happen?

| Scenario | Trigger | Automatic? | Consistency |
|----------|---------|------------|-------------|
| Task Completion | TodoWrite hook | Yes | Eventually (60s) |
| Increment Creation | IncrementCreated hook | Yes | Immediate |
| Increment Completion | `/specweave:done` | Yes | Immediate |
| Bulk Import (ADO/JIRA) | Job completion | Yes | Eventually |
| Manual Changes | Drift detection | No | On-demand |
| Brownfield Import | `/import-docs` | Yes | One-time |

## Why Documentation Consistency Matters

### Business Analytics
- **Feature completion rates**: Accurate velocity metrics for ROI reporting
- **Roadmap tracking**: Real status of deliverables for stakeholder updates
- **Resource planning**: Actual vs estimated effort for future planning

### Architecture & Security Reviews
- **System state**: Architects need current diagrams for design decisions
- **Audit trails**: Security audits require complete documentation (SOC 2, HIPAA)
- **Compliance**: Regulatory requirements demand up-to-date records

### Technical Planning
- **Sprint planning**: Tech leads need accurate specs for estimation
- **Dependency mapping**: Current architecture docs for impact analysis
- **Onboarding**: New team members need trustworthy documentation

**Bottom line**: Stale docs lead to bad decisions, rework, and compliance failures.

## Sync Scenarios Explained

### 1. Task Completion (Automatic)

**Trigger**: Every time you complete a task with TodoWrite

```bash
# You complete a task
/specweave:do

# Behind the scenes:
# 1. TodoWrite marks task complete
# 2. Post-task-completion hook fires
# 3. Living docs sync runs (background)
# 4. External tools update (GitHub issues, etc.)
```

**Consistency**: Eventually consistent (60-second throttle window)

**What syncs**:
- AC checkboxes in spec.md
- User story status in living docs
- Progress percentage in feature files
- GitHub/JIRA issue checkboxes

### 2. Increment Creation (Automatic)

**Trigger**: Creating a new increment with `/specweave:increment`

```bash
/specweave:increment "Add user authentication"

# Behind the scenes:
# 1. PM agent creates spec.md
# 2. Architect agent creates plan.md
# 3. Test-aware planner creates tasks.md
# 4. IncrementCreated event fires
# 5. Living docs sync creates feature structure
# 6. External tools create milestone + issues
```

**Consistency**: Immediate (syncs before returning control)

**What syncs**:
- Feature folder created in `.specweave/docs/internal/specs/`
- User story files generated
- GitHub milestone created (if configured)
- GitHub issues created for each user story

### 3. Increment Completion (Automatic)

**Trigger**: Closing an increment with `/specweave:done`

```bash
/specweave:done 0057

# Behind the scenes:
# 1. Validates all ACs complete
# 2. Final living docs sync
# 3. Status updated to "completed"
# 4. GitHub issues closed
# 5. Completion report generated
```

**Consistency**: Immediate (blocking, validates before closing)

**What syncs**:
- Final status in living docs
- All AC checkboxes verified
- GitHub issues closed with summary
- Completion timestamp recorded

### 4. Bulk Import (10K+ Items)

**Trigger**: Importing from ADO/JIRA/GitHub

```bash
# During init or via command
/specweave:import-external --source ado --since 2024-01-01

# Behind the scenes (background job):
# 1. Fetches items in batches (200 per request)
# 2. Paginates through 10K+ items
# 3. Converts to living docs format
# 4. Batch-writes to living docs (100 items per batch)
# 5. Reports progress via /specweave:jobs
```

**Consistency**: Eventually consistent (background processing)

**What syncs**:
- External items stored in `.specweave/docs/external/`
- Feature structure created for each epic/capability
- User stories organized by hierarchy
- README files generated per project

**Monitor progress**:
```bash
/specweave:jobs                    # List active jobs
/specweave:jobs --follow <jobId>   # Real-time progress
```

### 5. Brownfield Doc Import (Notion, Confluence)

**Trigger**: Importing existing docs from external sources

```bash
/specweave:import-docs --source ~/notion-export/

# Behind the scenes:
# 1. Scans folder for markdown files
# 2. Classifies each file (spec, module, team, legacy)
# 3. Moves to appropriate living docs folder
# 4. Generates cross-links
```

**Consistency**: One-time operation

**What syncs**:
- Specs go to `.specweave/docs/internal/specs/`
- Modules go to `.specweave/docs/internal/modules/`
- Team docs go to `.specweave/docs/internal/team/`
- Unclassified go to `.specweave/docs/internal/legacy/`

### 6. Manual Changes (Drift Detection)

**Scenario**: You fix a bug or implement a feature without creating an increment.

```bash
# Example: You push a hotfix directly
git commit -m "fix: critical auth bug"
git push

# Problem: Living docs don't know about this change!
```

**Solution**: Drift detection and reconciliation

```bash
# Check for drift
/specweave:detect-drift

# Output:
# Unmatched Commits (last 30 days):
# - abc123: "fix: critical auth bug" (2 files)
#   → Suggested: Update FS-AUTH status
#
# Run `/specweave:reconcile` to fix

# Auto-reconcile
/specweave:reconcile --auto

# Or interactive
/specweave:reconcile --interactive
```

**Best practice**: Always create increments, but use drift detection as a safety net.

## Sync Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      YOUR ACTIONS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    /specweave:increment     /specweave:do      /specweave:done  │
│           │                      │                   │          │
│           ▼                      ▼                   ▼          │
│    ┌────────────┐         ┌──────────┐        ┌──────────┐     │
│    │ INCREMENT  │         │   TASK   │        │INCREMENT │     │
│    │  CREATED   │         │ COMPLETE │        │  DONE    │     │
│    └─────┬──────┘         └────┬─────┘        └────┬─────┘     │
│          │                     │                   │           │
└──────────┼─────────────────────┼───────────────────┼───────────┘
           │                     │                   │
           ▼                     ▼                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SYNC COORDINATOR                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│    │  GATE 1:     │    │  GATE 2:     │    │  GATE 3:     │     │
│    │  Internal    │───▶│  External    │───▶│  Auto-Sync   │     │
│    │  Items OK?   │    │  Items OK?   │    │  Enabled?    │     │
│    └──────────────┘    └──────────────┘    └──────────────┘     │
│                                                                   │
│    [All gates pass] ──────────────────────────────────────────▶  │
│                                                                   │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                      LIVING DOCS SYNC                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│    ┌────────────────┐    ┌────────────────┐                      │
│    │  Parse Spec    │───▶│  Update Living │                      │
│    │  (User Stories,│    │  Docs Files    │                      │
│    │   ACs, Status) │    │                │                      │
│    └────────────────┘    └───────┬────────┘                      │
│                                  │                                │
│                                  ▼                                │
│    ┌────────────────┐    ┌────────────────┐                      │
│    │  GitHub Sync   │    │  JIRA/ADO Sync │                      │
│    │  (if enabled)  │    │  (if enabled)  │                      │
│    └────────────────┘    └────────────────┘                      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Configuration Options

### Basic Configuration

```json
// .specweave/config.json
{
  "hooks": {
    "post_task_completion": {
      "sync_living_docs": true
    }
  },
  "livingDocs": {
    "intelligent": {
      "enabled": true
    }
  }
}
```

### Advanced Configuration

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,    // Create/update living docs
      "canUpdateExternalItems": false,   // Update GitHub/JIRA items
      "autoSyncOnCompletion": true       // Auto-sync when done
    },
    "consistency": {
      "mode": "eventual",                // "eventual" | "immediate" | "strong"
      "throttleWindow": 60               // Seconds between syncs
    }
  }
}
```

### Consistency Modes

| Mode | Latency | Guarantee | Use Case |
|------|---------|-----------|----------|
| `eventual` | Low | Syncs within 60s | Development (default) |
| `immediate` | Medium | Syncs before returning | Gate operations |
| `strong` | High | All syncs synchronous | Compliance-critical |

## Best Practices

### Always Create Increments

Even for "quick" changes, create an increment:

```bash
# Instead of:
git commit -m "fix: auth bug"

# Do:
/specweave:increment "Fix auth token expiry"
# ... fix the bug ...
/specweave:done
```

**Why**: Automatic docs sync, audit trail, velocity tracking.

### Use Background Jobs for Large Imports

```bash
# 10K+ items? Use background import
/specweave:import-external --background

# Monitor progress
/specweave:jobs --follow <jobId>
```

**Why**: Doesn't block your terminal, survives disconnects.

### Check Drift Periodically

```bash
# Weekly drift check
/specweave:detect-drift --since "-7d"
```

**Why**: Catches manual changes that bypassed increments.

### Configure Sync for Your Team

**Startup (fast iteration)**:
```json
{
  "sync": {
    "consistency": { "mode": "eventual" }
  }
}
```

**Enterprise (compliance)**:
```json
{
  "sync": {
    "consistency": { "mode": "strong" }
  }
}
```

## Troubleshooting

### Sync Not Happening

1. Check hooks are enabled:
```bash
cat .specweave/config.json | grep sync_living_docs
# Should show: true
```

2. Check hook logs:
```bash
cat .specweave/logs/hooks-debug.log | tail -20
```

3. Check for throttling:
```bash
# If synced within 60s, new sync is throttled
grep "throttled" .specweave/logs/hooks-debug.log
```

**Fix**: Wait 60s or run manual sync:
```bash
/specweave:sync-progress <incrementId>
```

### External Tools Not Updating

1. Check external sync is enabled:
```bash
cat .specweave/config.json | grep canUpdateExternalItems
# Should show: true
```

2. Check tool-specific config:
```bash
cat .specweave/config.json | grep -A5 '"github"'
```

3. Check token validity:
```bash
gh auth status  # GitHub
```

### Bulk Import Stuck

1. Check job status:
```bash
/specweave:jobs
```

2. Check for rate limits:
```bash
/specweave:jobs --id <jobId>
# Look for "paused" status
```

3. Resume if paused:
```bash
/specweave:jobs --resume <jobId>
```

## FAQ

**Q: Can I disable automatic sync?**

A: Yes, set `autoSyncOnCompletion: false` in config. You'll need to run `/specweave:sync-docs` manually.

**Q: What happens if sync fails?**

A: Sync failures are logged but never block your workflow. Living docs may be temporarily stale. Check logs and retry.

**Q: How do I sync to multiple external tools?**

A: Configure each tool in `config.json`:
```json
{
  "sync": {
    "github": { "enabled": true },
    "jira": { "enabled": true },
    "ado": { "enabled": false }
  }
}
```

**Q: Can I customize what gets synced?**

A: Yes, use permission gates:
- `canUpsertInternalItems`: Living docs
- `canUpdateExternalItems`: GitHub/JIRA/ADO
- `canUpdateStatus`: Status field specifically

**Q: What about conflicts during import?**

A: SpecWeave detects conflicts and prompts for resolution:
- `TITLE_COLLISION`: Same title, different content
- `SEMANTIC_DUPLICATE`: AI-detected duplicate
- `VERSION_MISMATCH`: Older version imported

## Related Guides

- [Living Documentation](/docs/guides/core-concepts/living-documentation)
- [Background Jobs](/docs/guides/core-concepts/background-jobs)
- [Intelligent Living Docs Sync](/docs/guides/intelligent-living-docs-sync)
- [Sync Configuration](/docs/guides/sync-configuration)

---

**Next Steps**:
- [Configure external tool sync](/docs/guides/sync-configuration)
- [Set up GitHub integration](/docs/guides/github-integration)
- [Understanding increments](/docs/guides/core-concepts/what-is-an-increment)
