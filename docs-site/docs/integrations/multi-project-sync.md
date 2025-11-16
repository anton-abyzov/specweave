---
id: multi-project-sync
title: Multi-Project Sync Architecture
sidebar_label: Multi-Project Sync
---

# Multi-Project Sync Architecture

:::warning Important Update
This document describes the multi-project sync architecture. Note that **spec-level sync commands** (`sync-spec`, `sync-epic`) are deprecated. Spec syncing now happens **automatically via living docs** (triggered by `/specweave:done`).

For **increments**, use:
- `/specweave-github:sync` - Sync increment to GitHub issue
- `/specweave-jira:sync` - Sync increment to JIRA epic
- `/specweave-ado:sync` - Sync increment to ADO work item
:::

:::tip Key Capability
Sync increments to unlimited external repositories (GitHub, JIRA, Azure DevOps) with intelligent rate limiting and time range filtering.
:::

SpecWeave supports sophisticated multi-project synchronization patterns for teams working across multiple repositories or external tools.

---

## 🎯 CRITICAL: Source of Truth Architecture

**The Hub is LOCAL**, not external!

```
✅ CORRECT Architecture:
.specweave/docs/specs/  ↔  GitHub Issues       (Local ↔ External)
.specweave/docs/specs/  ↔  Jira Epics          (Local ↔ External)
.specweave/docs/specs/  ↔  Azure DevOps Items  (Local ↔ External)

❌ WRONG (External-to-External):
GitHub  ↔  Jira                                 (External ↔ External - NO!)
GitHub PRs  ↔  Jira Features                    (External ↔ External - NO!)
```

**Key Principle**: `.specweave/` is the **permanent source of truth**. External tools (GitHub, Jira, ADO) are **MIRRORS** of this truth.

### Sync Direction

- **Bidirectional** (default): Local ↔ External (changes sync both ways)
- **Export only**: Local → External (push changes from Local to External)
- **Import only**: External → Local (pull changes from External to Local)

---

## Core Concepts

### 3-Layer Architecture

```
Layer 1: Credentials (.env)
├── GITHUB_TOKEN=...
├── JIRA_API_TOKEN=...
└── AZURE_DEVOPS_PAT=...

Layer 2: Sync Profiles (config.json)
├── specweave-dev (GitHub: anton-abyzov/specweave)
├── client-mobile (GitHub: client-org/mobile-app)
├── internal-jira (JIRA: company.atlassian.net/PROJ)
└── ado-backend (ADO: myorg/backend-services)

Layer 3: Per-Increment Metadata (metadata.json)
└── 0004-plugin-architecture
    ├── profile: specweave-dev
    ├── issueNumber: 130
    └── timeRange: 1M
```

---

## Sync Profiles

**Profiles** define how to connect to external systems:

```json
{
  "sync": {
    "profiles": {
      "specweave-dev": {
        "provider": "github",
        "displayName": "SpecWeave Development",
        "config": {
          "owner": "anton-abyzov",
          "repo": "specweave"
        },
        "timeRange": {
          "default": "1M",
          "max": "6M"
        },
        "rateLimits": {
          "maxItemsPerSync": 500,
          "warnThreshold": 100
        }
      }
    }
  }
}
```

### Benefits

- ✅ Unlimited profiles per provider (3+, 5+, 10+ repos)
- ✅ Different increments sync to different repos
- ✅ Team-based organization (Frontend → repo-A, Backend → repo-B)
- ✅ Multi-client support (Client-A, Client-B, Client-C)

---

## Project Contexts

**Projects** organize work into logical groups:

```json
{
  "sync": {
    "projects": {
      "specweave-core": {
        "id": "specweave-core",
        "name": "SpecWeave Core",
        "description": "Core framework development",
        "keywords": ["framework", "cli", "plugin"],
        "team": "Core Team",
        "defaultSyncProfile": "specweave-dev",
        "specsFolder": ".specweave/docs/internal/specs/specweave-core",
        "increments": ["0001-core-framework", "0002-core-enhancements"]
      }
    }
  }
}
```

### Smart Project Detection

- Project name match: +10 points
- Team name match: +5 points
- Keyword match: +3 points per keyword
- Auto-select if confidence > 0.7

**Example**:
```
Increment: "Add React Native dark mode for mobile app"
→ Detects project "mobile-app" (keywords: mobile, react-native)
→ Uses profile "client-mobile" automatically
→ Syncs to client-org/mobile-app repo
```

---

## Time Range Filtering

**Problem**: Syncing ALL data takes 25+ minutes and hits rate limits.

**Solution**: Time range presets filter data by creation date.

### Time Range Presets

| Preset | Duration | Items | API Calls | Duration | Impact |
|--------|----------|-------|-----------|----------|--------|
| **1W** | 1 week | ~50 | 75 | 30 sec | Low |
| **1M** | 1 month | ~200 | 300 | 2 min | Medium (✅ Recommended) |
| **3M** | 3 months | ~600 | 900 | 5 min | Medium |
| **6M** | 6 months | ~1,200 | 1,800 | 10 min | High |
| **ALL** | All time | ~5,000+ | 7,500+ | 30+ min | Critical (❌ Avoid) |

### Usage

```bash
# Interactive (select time range)
/specweave-github:sync 0004

# Specify time range
/specweave-github:sync 0004 --time-range 1M

# Preview before executing
/specweave-github:sync 0004 --dry-run
```

---

## Rate Limiting Protection

### Pre-Flight Validation

1. Estimate API calls based on time range
2. Check current rate limit status
   - GitHub: 5000/hour
   - JIRA: 100/min
   - ADO: 200/5min
3. Calculate impact: low (&lt;250 calls), medium (250-1000), high (1000-2500), critical (2500+)
4. Warn or block if risky

### Example: Critical Impact Blocked

```
❌ This sync may FAIL due to:

Blockers:
   • CRITICAL rate limit impact: 7,500 API calls exceeds safe threshold
   • Not enough rate limit remaining (need 7,500, only 4,850 remaining)

Recommendations:
   1. Reduce time range to 1 month (~300 API calls, SAFE)
   2. Wait for rate limit reset (25 minutes)
   3. Split sync across multiple time periods
```

---

## File Organization

Specs organized by project:

```
.specweave/docs/internal/specs/
├── specweave-core/
│   ├── spec-001-core-framework.md
│   └── spec-002-plugin-architecture.md
├── client-mobile/
│   ├── spec-001-mvp.md
│   └── spec-002-dark-mode.md
└── internal-backend/
    └── spec-001-api-v2.md
```

---

## Common Commands

### Profile Management

```bash
/specweave:sync-profile create
/specweave:sync-profile list
/specweave:sync-profile get <id>
/specweave:sync-profile update <id>
/specweave:sync-profile delete <id>
```

### Project Management

```bash
/specweave:project create
/specweave:project list
/specweave:project link <project-id> <increment-id>
/specweave:project stats
```

### Syncing (GitHub Example)

```bash
/specweave-github:sync <increment-id>
/specweave-github:sync <increment-id> --profile <id>
/specweave-github:sync <increment-id> --time-range 1M
/specweave-github:sync <increment-id> --dry-run
```

### Migration from V1

```bash
specweave migrate-to-profiles
```

**Output**:
```
✅ Created GitHub profile: default-github
   Repository: anton-abyzov/specweave

✅ Created default project context
   Name: specweave
   Default profile: default-github

📊 Migration Summary:
   Profiles created: 1
   Projects created: 1
```

---

## Implementation Details

### Core Infrastructure

- `src/core/types/sync-profile.ts` - Type definitions
- `src/core/sync/profile-manager.ts` - CRUD for profiles
- `src/core/sync/rate-limiter.ts` - Rate limiting logic
- `src/core/sync/project-context.ts` - Project management

### Client Libraries (Profile-Based)

- `plugins/specweave-github/lib/github-client-v2.ts` - GitHub sync
- `plugins/specweave-jira/lib/jira-client-v2.ts` - JIRA sync
- `plugins/specweave-ado/lib/ado-client-v2.ts` - ADO sync

### UX Components

- `src/core/sync/time-range-selector.ts` - Interactive time range selection
- `src/core/sync/profile-selector.ts` - Interactive profile selection

### Migration

- `src/cli/commands/migrate-to-profiles.ts` - Automatic migration from V1

---

## Cross-Platform Migration

:::tip Universal Migration Capability
SpecWeave's universal mapping template enables seamless migration **between** external tools (GitHub ↔ JIRA ↔ Azure DevOps) without data loss.
:::

### The Power of `.specweave/` as Hub

Since `.specweave/` is the **permanent source of truth**, you can easily migrate between external tools:

```
Step 1: Import          Step 2: Export
GitHub → .specweave/ → JIRA
JIRA → .specweave/ → Azure DevOps
ADO → .specweave/ → GitHub
```

**Key Insight**: You're not migrating GitHub-to-JIRA directly. You're importing from GitHub into SpecWeave's canonical format, then exporting to JIRA.

### How It Works

#### 1. Universal Data Model

All external tools map to SpecWeave's standard hierarchy:

| SpecWeave | GitHub | JIRA | Azure DevOps |
|-----------|--------|------|--------------|
| **Epic** | Milestone | Epic | Epic |
| **User Story** | Issue | Story | User Story |
| **Task** | Checkbox | Sub-task | Task |
| **Status** | Open/Closed | To Do/Done | New/Active/Closed |
| **Priority** | Labels | Priority | Priority |
| **Assignee** | Assignee | Assignee | Assigned To |

#### 2. Status Mapping Configuration

Define how statuses translate between tools:

```json
{
  "sync": {
    "statusMapping": {
      "github": {
        "open": "To Do",
        "in_progress": "In Development",
        "in_review": "Code Review",
        "done": "Closed"
      },
      "jira": {
        "To Do": "Open",
        "In Development": "In Progress",
        "Code Review": "In Review",
        "Closed": "Done"
      },
      "ado": {
        "New": "To Do",
        "Active": "In Development",
        "Resolved": "In Review",
        "Closed": "Done"
      }
    },
    "priorityMapping": {
      "github": {
        "critical": "Highest",
        "high": "High",
        "medium": "Medium",
        "low": "Low"
      },
      "jira": {
        "Highest": "P0",
        "High": "P1",
        "Medium": "P2",
        "Low": "P3"
      }
    }
  }
}
```

#### 3. Migration Process

**Example: GitHub to JIRA Migration**

```bash
# Step 1: Import all GitHub issues to SpecWeave
/specweave-github:sync-spec spec-001-user-auth --direction import

# Step 2: Review imported spec
# .specweave/docs/internal/specs/default/FS-001-user-auth/
# ├── README.md (Epic overview)
# ├── us-001-login.md (User Story)
# ├── us-002-oauth.md (User Story)
# └── us-003-password-reset.md (User Story)

# Step 3: Export to JIRA with status mapping
/specweave-jira:sync-spec spec-001-user-auth --direction export

# Result:
# ✅ JIRA Epic created: AUTH-123 "User Authentication"
# ✅ JIRA Stories created: AUTH-124, AUTH-125, AUTH-126
# ✅ All metadata preserved (priority, assignees, comments)
# ✅ Links between stories maintained
# ✅ Attachments migrated
```

### What Gets Migrated

| Data | Preserved | Notes |
|------|-----------|-------|
| **Hierarchy** | ✅ Yes | Epic → Stories → Tasks |
| **Title & Description** | ✅ Yes | Full markdown content |
| **Status** | ✅ Yes | Via status mapping config |
| **Priority** | ✅ Yes | Via priority mapping config |
| **Assignees** | ✅ Yes | Requires user mapping |
| **Labels/Tags** | ✅ Yes | Converted to target format |
| **Comments** | ✅ Yes | Full discussion history |
| **Attachments** | ✅ Yes | Files and screenshots |
| **Links** | ✅ Yes | Cross-references maintained |
| **Custom Fields** | ⚠️ Partial | Via field mapping config |
| **Time Tracking** | ⚠️ Partial | If supported by target |

### User Mapping

Map users between systems:

```json
{
  "sync": {
    "userMapping": {
      "github_user1": "jira.user1@company.com",
      "github_user2": "jira.user2@company.com"
    }
  }
}
```

**Auto-detection**: SpecWeave tries to match users by email when possible.

### Common Migration Scenarios

#### Scenario 1: Switching Project Management Tools

**Context**: Your company is migrating from GitHub Issues to JIRA.

**Process**:
1. Import all GitHub issues: `/specweave-github:sync-spec --all --direction import`
2. Review and organize in `.specweave/docs/internal/specs/`
3. Export to JIRA: `/specweave-jira:sync-spec --all --direction export`
4. Validate: Compare counts, check critical issues
5. Deactivate GitHub sync, activate JIRA sync

#### Scenario 2: Multi-Tool Team Workflow

**Context**: Developers use GitHub, Product team uses JIRA.

**Setup**:
```json
{
  "sync": {
    "settings": {
      "syncDirection": "bidirectional"
    },
    "profiles": {
      "github-dev": {
        "provider": "github",
        "config": { "owner": "myorg", "repo": "product" }
      },
      "jira-product": {
        "provider": "jira",
        "config": { "domain": "myorg.atlassian.net", "project": "PROD" }
      }
    }
  }
}
```

**Workflow**:
- Developers create increments in SpecWeave
- Auto-sync to GitHub (for dev tracking)
- Auto-sync to JIRA (for product visibility)
- Changes in either tool sync back to SpecWeave

#### Scenario 3: Client Deliverables

**Context**: Internal work in GitHub, deliver to client's Azure DevOps.

**Process**:
1. Develop internally with GitHub sync enabled
2. Before client delivery: `/specweave-ado:sync-spec spec-002-mobile-app --direction export`
3. Client sees work items in their ADO instance
4. Continue development in GitHub, sync updates to ADO periodically

### Field Mapping Configuration

Map custom fields between tools:

```json
{
  "sync": {
    "fieldMapping": {
      "github": {
        "story_points": "labels.story-points",
        "sprint": "milestone"
      },
      "jira": {
        "story_points": "customfield_10016",
        "sprint": "customfield_10020"
      },
      "ado": {
        "story_points": "Microsoft.VSTS.Scheduling.StoryPoints",
        "sprint": "System.IterationPath"
      }
    }
  }
}
```

### Migration Commands

```bash
# Import from external tool
/specweave-github:sync-spec <spec-id> --direction import
/specweave-jira:sync-spec <spec-id> --direction import
/specweave-ado:sync-spec <spec-id> --direction import

# Export to external tool
/specweave-github:sync-spec <spec-id> --direction export
/specweave-jira:sync-spec <spec-id> --direction export
/specweave-ado:sync-spec <spec-id> --direction export

# Bidirectional sync (default)
/specweave-github:sync-spec <spec-id>
/specweave-jira:sync-spec <spec-id>
/specweave-ado:sync-spec <spec-id>

# Dry run (preview changes)
/specweave-github:sync-spec <spec-id> --dry-run
```

### Migration Validation

After migration, validate the transfer:

```bash
# Check item counts
specweave sync-stats spec-001

# Output:
# Source (GitHub): 1 Epic, 15 Stories, 73 Tasks
# Target (JIRA): 1 Epic, 15 Stories, 73 Tasks
# ✅ All items migrated successfully

# Compare critical fields
specweave sync-diff spec-001 --fields priority,status,assignee

# Check for orphaned items
specweave sync-verify spec-001
```

### Best Practices

1. **Test with Small Spec First**
   - Migrate one spec/epic before doing bulk migration
   - Validate status mapping works correctly
   - Check user mapping is accurate

2. **Use Dry Run**
   - Preview changes before executing: `--dry-run`
   - Review generated report
   - Fix any mapping issues

3. **Backup Before Migration**
   - Export current state from source tool
   - Keep `.specweave/` in version control
   - Take snapshots of target tool

4. **Incremental Migration**
   - Migrate specs in batches
   - Validate each batch before proceeding
   - Don't migrate everything at once

5. **Maintain History**
   - Keep original tool read-only for reference
   - Document migration date and reason
   - Preserve links to old system

### Troubleshooting

**Issue**: Users not mapped correctly

**Solution**: Update `userMapping` config:
```json
{
  "sync": {
    "userMapping": {
      "github.user": "jira.user@company.com"
    }
  }
}
```

**Issue**: Custom fields missing

**Solution**: Add field mapping:
```json
{
  "sync": {
    "fieldMapping": {
      "github": { "sprint": "milestone" },
      "jira": { "sprint": "customfield_10020" }
    }
  }
}
```

**Issue**: Status mapping incorrect

**Solution**: Review and update status mapping:
```json
{
  "sync": {
    "statusMapping": {
      "github": { "open": "To Do", "closed": "Done" },
      "jira": { "To Do": "Open", "Done": "Closed" }
    }
  }
}
```

---

## Related

- [GitHub Integration](./github.md)
- [JIRA Integration](./jira.md)
- [Azure DevOps Integration](./azure-devops.md)
- [Configuration Reference](../reference/configuration.md)
