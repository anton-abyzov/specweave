---
id: multi-project-sync
title: Multi-Project Sync Architecture
sidebar_label: Multi-Project Sync
---

# Multi-Project Sync Architecture

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

## Related

- [GitHub Integration](./github.md)
- [JIRA Integration](./jira.md)
- [Azure DevOps Integration](./azure-devops.md)
- [Configuration Reference](../reference/configuration.md)
