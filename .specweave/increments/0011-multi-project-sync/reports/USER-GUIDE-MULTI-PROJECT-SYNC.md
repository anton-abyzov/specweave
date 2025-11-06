# Multi-Project Sync - User Guide

**Version**: 2.0.0
**Last Updated**: 2025-11-05
**Status**: Complete Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [Configuration](#configuration)
5. [Workflows](#workflows)
6. [Time Range Filtering](#time-range-filtering)
7. [Rate Limiting Protection](#rate-limiting-protection)
8. [Project Detection](#project-detection)
9. [Migration Guide](#migration-guide)
10. [Troubleshooting](#troubleshooting)
11. [Examples](#examples)

---

## Overview

SpecWeave's multi-project sync architecture enables you to sync increments across **unlimited repositories** for GitHub, JIRA, and Azure DevOps, with intelligent time range filtering and rate limit protection.

### What's New in V2?

**Before (Single Project)**:
- ❌ One repository per provider
- ❌ No time range filtering → slow syncs (25+ minutes)
- ❌ No rate limit protection → failures
- ❌ Can't work with multiple teams/projects

**After (Multi-Project)**:
- ✅ Unlimited profiles per provider
- ✅ Time range filtering (2 min vs 25+ min syncs)
- ✅ Rate limit protection (95%+ success rate)
- ✅ Smart project detection
- ✅ Per-project specs organization

---

## Quick Start

### 1. Install SpecWeave

```bash
npm install -g specweave
specweave init
```

### 2. Create Your First Sync Profile

```bash
/specweave:sync-profile create
```

**Interactive prompts**:
```
Select provider: GitHub
Profile ID: my-main-repo
Display name: My Main Repository
Owner: myorg
Repo: my-repo
Default time range: 1M (1 month)
Max time range: 6M (6 months)
```

### 3. Sync an Increment

```bash
/specweave-github:sync 0001
```

**That's it!** The system will:
1. Ask you to select a profile (or auto-detect)
2. Ask you to select a time range (default: 1M)
3. Show you a preview with estimates
4. Sync to GitHub

---

## Core Concepts

### 1. Sync Profiles

**Profiles** define how to connect to external systems (GitHub, JIRA, ADO).

**Key properties**:
- `provider`: `github`, `jira`, or `ado`
- `displayName`: Human-readable name
- `config`: Provider-specific settings (owner/repo, domain/projectKey, etc.)
- `timeRange`: Default and max time ranges for syncs
- `rateLimits`: Optional custom rate limit thresholds

**Example GitHub Profile**:
```json
{
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
```

### 2. Project Contexts

**Projects** organize your work into logical groups (teams, repos, products).

**Key properties**:
- `name`: Project name
- `description`: What is this project?
- `keywords`: Keywords for auto-detection
- `team`: Team name (optional)
- `defaultSyncProfile`: Default sync profile for this project
- `specsFolder`: Where specs are stored (`.specweave/docs/internal/specs/{project-id}/`)
- `increments`: List of increments linked to this project

**Example Project**:
```json
{
  "id": "specweave-core",
  "name": "SpecWeave Core",
  "description": "Core framework development",
  "keywords": ["framework", "cli", "plugin"],
  "team": "Core Team",
  "defaultSyncProfile": "specweave-dev",
  "specsFolder": ".specweave/docs/internal/specs/specweave-core",
  "increments": ["0001-core-framework", "0002-core-enhancements"]
}
```

### 3. Time Range Presets

**Time ranges** control how far back to fetch data during syncs.

| Preset | Duration | Typical Items | API Calls | Duration | Impact |
|--------|----------|--------------|-----------|----------|--------|
| **1W** | 1 week | ~50 | 75 | 30 sec | Low |
| **2W** | 2 weeks | ~100 | 150 | 1 min | Low |
| **1M** | 1 month | ~200 | 300 | 2 min | Medium (Recommended) |
| **3M** | 3 months | ~600 | 900 | 5 min | Medium |
| **6M** | 6 months | ~1,200 | 1,800 | 10 min | High |
| **1Y** | 1 year | ~2,400 | 3,600 | 20 min | High |
| **ALL** | All time | ~5,000+ | 7,500+ | 30+ min | Critical (⚠️ Not recommended) |

**Recommendation**: Use **1M** (1 month) for active projects, **1W** for daily syncs.

---

## Configuration

### File Structure

```
my-project/
├── .env                          # Credentials (never committed)
├── .specweave/
│   ├── config.json               # Profiles + projects
│   ├── docs/internal/specs/      # Organized by project
│   │   ├── project-a/
│   │   │   ├── spec-001-feature.md
│   │   │   └── spec-002-bugfix.md
│   │   └── project-b/
│   │       └── spec-001-mvp.md
│   └── increments/
│       └── 0001-feature/
│           └── metadata.json     # Per-increment sync metadata
```

### .env File (Credentials)

**GitHub**:
```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

**JIRA**:
```env
JIRA_API_TOKEN=xxxxxxxxxxxxxxxxxxxx
JIRA_EMAIL=your.email@company.com
```

**Azure DevOps**:
```env
AZURE_DEVOPS_PAT=xxxxxxxxxxxxxxxxxxxx
```

**Security**: Never commit `.env` files! Add to `.gitignore`.

### config.json (Profiles & Projects)

```json
{
  "sync": {
    "activeProfile": "specweave-dev",
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
        }
      },
      "client-mobile": {
        "provider": "github",
        "displayName": "Client Mobile App",
        "config": {
          "owner": "client-org",
          "repo": "mobile-app"
        },
        "timeRange": {
          "default": "2W",
          "max": "3M"
        }
      }
    },
    "projects": {
      "specweave-core": {
        "id": "specweave-core",
        "name": "SpecWeave Core",
        "description": "Core framework",
        "keywords": ["framework", "cli"],
        "team": "Core Team",
        "defaultSyncProfile": "specweave-dev",
        "specsFolder": ".specweave/docs/internal/specs/specweave-core",
        "increments": []
      },
      "client-mobile": {
        "id": "client-mobile",
        "name": "Client Mobile App",
        "description": "E-commerce mobile app",
        "keywords": ["mobile", "ecommerce", "react-native"],
        "team": "Mobile Team",
        "defaultSyncProfile": "client-mobile",
        "specsFolder": ".specweave/docs/internal/specs/client-mobile",
        "increments": []
      }
    },
    "settings": {
      "autoDetectProject": true,
      "defaultTimeRange": "1M",
      "rateLimitProtection": true
    }
  }
}
```

### metadata.json (Per-Increment)

```json
{
  "id": "0004-plugin-architecture",
  "sync": {
    "profile": "specweave-dev",
    "issueNumber": 130,
    "issueUrl": "https://github.com/anton-abyzov/specweave/issues/130",
    "timeRange": "1M",
    "createdAt": "2025-10-15T10:00:00Z",
    "lastSyncAt": "2025-11-04T14:30:00Z",
    "status": "active"
  }
}
```

---

## Workflows

### Workflow 1: Creating a Sync Profile

```bash
# Interactive creation
/specweave:sync-profile create

# Or specify manually
/specweave:sync-profile create \
  --provider github \
  --id my-repo \
  --display-name "My Repository" \
  --owner myorg \
  --repo myrepo \
  --default-time-range 1M \
  --max-time-range 6M
```

### Workflow 2: Syncing an Increment

```bash
# Interactive sync (profile + time range selection)
/specweave-github:sync 0004

# Use specific profile
/specweave-github:sync 0004 --profile specweave-dev

# Use specific time range
/specweave-github:sync 0004 --time-range 1M

# Dry run (preview only)
/specweave-github:sync 0004 --dry-run

# Force sync even if up-to-date
/specweave-github:sync 0004 --force
```

### Workflow 3: Managing Profiles

```bash
# List all profiles
/specweave:sync-profile list

# Get profile details
/specweave:sync-profile get my-repo

# Update profile
/specweave:sync-profile update my-repo \
  --display-name "Updated Name" \
  --default-time-range 2W

# Delete profile
/specweave:sync-profile delete my-repo
```

### Workflow 4: Managing Projects

```bash
# Create project context
/specweave:project create \
  --id my-project \
  --name "My Project" \
  --description "Project description" \
  --keywords mobile,react-native,ecommerce \
  --team "Mobile Team" \
  --default-profile my-repo

# List all projects
/specweave:project list

# Link increment to project
/specweave:project link my-project 0004-feature

# Get project stats
/specweave:project stats
```

---

## Time Range Filtering

### How It Works

Time range filtering limits the data fetched during syncs:

1. **Select time range**: `1W`, `2W`, `1M`, `3M`, `6M`, `1Y`, or `ALL`
2. **Calculate dates**: System calculates start/end dates (e.g., 1M = last 30 days)
3. **Filter queries**: Provider-specific queries filter by creation date
4. **Fetch data**: Only items within the time range are fetched

**Example**: Syncing with `1M` time range:
- **GitHub**: `created:2025-10-05..2025-11-04`
- **JIRA**: JQL `created >= "2025-10-05" AND created <= "2025-11-04"`
- **ADO**: WIQL `[System.CreatedDate] >= '2025-10-05'`

### Benefits

**Performance**:
- ✅ 2 min syncs (1M) vs 25+ min syncs (ALL)
- ✅ Reduces API calls by 90%+
- ✅ Lower memory usage

**Rate Limiting**:
- ✅ Stays well below rate limits
- ✅ Predictable sync duration
- ✅ Higher success rate (95%+)

**Usability**:
- ✅ Faster feedback loops
- ✅ More frequent syncs possible
- ✅ Better user experience

### Best Practices

**For Active Development**:
- Use `1M` (1 month) for ongoing work
- Use `1W` for daily syncs
- Avoid `ALL` unless necessary

**For Historical Analysis**:
- Use `3M` or `6M` for trend analysis
- Check rate limits first
- Consider splitting into multiple syncs

**For New Projects**:
- Start with `1M` (recommended default)
- Adjust based on project velocity
- Monitor rate limit usage

---

## Rate Limiting Protection

### What Is Rate Limiting?

**Rate limits** are restrictions imposed by external APIs to prevent abuse:

- **GitHub**: 5,000 requests per hour
- **JIRA**: 100 requests per minute
- **Azure DevOps**: 200 requests per 5 minutes

### How Protection Works

**Pre-Flight Validation**:
1. **Estimate** API calls based on time range
2. **Check** current rate limit status
3. **Calculate** impact (low/medium/high/critical)
4. **Validate** if sync is safe to proceed
5. **Warn** or **block** if risky

**Impact Levels**:

| Impact | API Calls | Duration | Action |
|--------|-----------|----------|--------|
| **Low** | <250 | <2 min | ✅ Proceed |
| **Medium** | 250-1000 | 2-5 min | ⚠️  Warn, proceed |
| **High** | 1000-2500 | 5-15 min | ⚠️  Warn, require confirmation |
| **Critical** | 2500+ | 15+ min | ❌ Block, show recommendations |

### Example: Critical Impact Blocked

```
❌ This sync may FAIL due to:

Blockers:
   • CRITICAL rate limit impact: 7,500 API calls exceeds safe threshold for github
   • Not enough rate limit remaining. Need 7,500 calls, only 4,850 remaining.
     Reset at 2025-11-04 15:00:00

Recommendations:
   1. Reduce time range to 1 month (~300 API calls, SAFE)
   2. Wait for rate limit reset (25 minutes)
   3. Split sync across multiple time periods

Sync cancelled. Please adjust and try again.
```

### Manual Rate Limit Check

```bash
# GitHub
gh api rate_limit

# Output shows:
# {
#   "resources": {
#     "core": {
#       "limit": 5000,
#       "remaining": 4850,
#       "reset": 1699027200
#     }
#   }
# }
```

---

## Project Detection

### How It Works

**Smart project detection** automatically maps increments to projects based on keywords.

**Detection algorithm**:
1. Extract keywords from increment description
2. Score each project based on matches:
   - Project name match: +10 points
   - Team name match: +5 points
   - Keyword match: +3 points per keyword
3. Calculate confidence: `min(score / 10, 1.0)`
4. Auto-select if confidence > 0.7, suggest if 0.3-0.7, ask user if < 0.3

**Example**:

```
Increment description: "Add React Native dark mode for mobile app"

Project 1: specweave-core
   Keywords: [framework, cli, plugin]
   Score: 0 (no matches)

Project 2: mobile-app
   Name: "Mobile App"
   Keywords: [mobile, react-native, ecommerce]
   Matches: "Mobile" (+10), "react-native" (+3), "mobile" (+3)
   Score: 16 → Confidence: 1.0 ✅ Auto-selected!
```

### Configuration

```json
{
  "projects": {
    "mobile-app": {
      "name": "Mobile App",
      "keywords": ["mobile", "react-native", "ios", "android", "ecommerce"],
      "team": "Mobile Team",
      "defaultSyncProfile": "mobile-repo"
    }
  },
  "settings": {
    "autoDetectProject": true  // Enable/disable auto-detection
  }
}
```

---

## Migration Guide

### Migrating from V1 (Single Project)

**Automatic Migration**:

```bash
specweave migrate-to-profiles
```

**Output**:
```
🔍 Detected old configuration:
   GitHub: Yes

✅ Backed up old configuration to .specweave/config.json.backup

✅ Created GitHub profile: default-github
   Repository: anton-abyzov/specweave

✅ Created default project context
   Name: specweave
   Default profile: default-github

📊 Migration Summary:
   Profiles created: 1
   Projects created: 1
   Warnings: 0
   Errors: 0

✅ Migration completed successfully!

Next steps:
  1. Review profiles: /specweave:sync-profile list
  2. Test sync: /specweave-github:sync 0004
  3. Keep backup: .specweave/config.json.backup (until confirmed working)
```

**Manual Migration** (if automatic fails):

1. Create profile:
   ```bash
   /specweave:sync-profile create
   ```

2. Update increment metadata:
   ```json
   {
     "sync": {
       "profile": "default-github",
       "issueNumber": 130
     }
   }
   ```

3. Test sync:
   ```bash
   /specweave-github:sync 0004
   ```

---

## Troubleshooting

### Profile Not Found

**Error**:
```
❌ Error: Sync profile 'unknown-profile' not found
```

**Solution**:
```bash
# List available profiles
/specweave:sync-profile list

# Create profile if missing
/specweave:sync-profile create
```

### No Profiles Configured

**Error**:
```
❌ Error: No GitHub sync profiles configured
```

**Solution**:
```bash
# Create your first profile
/specweave:sync-profile create

# Or migrate from old config
specweave migrate-to-profiles
```

### Rate Limit Exceeded During Sync

**Error**:
```
⚠️  GitHub API rate limit exceeded during sync

Synced: 127/187 items (68%)
Remaining: 60 items
Rate limit resets: 2025-11-04 15:00:00 (12 minutes)
```

**Solution**:
```
What would you like to do?

  1. Wait and resume (auto-resume in 12 min)
  2. Resume manually later (/specweave-github:sync 0004 --resume)
  3. Cancel sync (partial data saved)

Your choice: [1]
```

### Network Error

**Error**:
```
❌ Error: Network error while syncing to GitHub

Failed to connect to GitHub API.
Synced: 45/187 items before error
```

**Solution**:
- Retry immediately
- Retry with exponential backoff (recommended)
- Cancel and retry manually later

---

## Examples

### Example 1: Multi-Repo Workflow

```bash
# Scenario: Working on 3 different client projects

# 1. Create profiles for each client
/specweave:sync-profile create \
  --provider github \
  --id client-a \
  --owner client-a-org \
  --repo mobile-app

/specweave:sync-profile create \
  --provider github \
  --id client-b \
  --owner client-b-org \
  --repo web-app

/specweave:sync-profile create \
  --provider github \
  --id client-c \
  --owner client-c-org \
  --repo api-backend

# 2. Create project contexts
/specweave:project create \
  --id client-a \
  --name "Client A Mobile" \
  --keywords mobile,ios,android \
  --default-profile client-a

# 3. Create increments (auto-detects project)
/specweave:increment "Client A: Add dark mode to mobile app"
# → Auto-detects project "client-a"
# → Suggests profile "client-a"

# 4. Sync to correct repo
/specweave-github:sync 0001
# → Uses "client-a" profile automatically
```

### Example 2: Team-Based Organization

```bash
# Scenario: Multiple teams in same org

# Frontend Team
/specweave:sync-profile create \
  --id frontend \
  --owner myorg \
  --repo frontend

/specweave:project create \
  --id frontend \
  --team "Frontend Team" \
  --keywords react,nextjs,ui \
  --default-profile frontend

# Backend Team
/specweave:sync-profile create \
  --id backend \
  --owner myorg \
  --repo backend

/specweave:project create \
  --id backend \
  --team "Backend Team" \
  --keywords api,nodejs,database \
  --default-profile backend

# Increments auto-route to correct team
/specweave:increment "Backend Team: Add GraphQL endpoint"
# → Auto-detects project "backend"
# → Syncs to backend repo
```

### Example 3: Time Range Optimization

```bash
# Daily standup sync (fast)
/specweave-github:sync 0004 --time-range 1W
# → ~50 items, 1 min, LOW impact

# Weekly sprint review (detailed)
/specweave-github:sync 0004 --time-range 1M
# → ~200 items, 2 min, MEDIUM impact

# Quarterly retrospective (comprehensive)
/specweave-github:sync 0004 --time-range 3M
# → ~600 items, 5 min, MEDIUM impact
# ⚠️  Check rate limits first!

# Full project history (careful!)
/specweave-github:sync 0004 --time-range ALL --dry-run
# → Preview impact BEFORE executing
# → May be blocked if CRITICAL impact
```

---

## Summary

**Multi-project sync architecture** enables:

✅ **Unlimited repositories** per provider
✅ **Time range filtering** for fast syncs (2 min vs 25+ min)
✅ **Rate limit protection** for reliable syncs (95%+ success)
✅ **Smart project detection** for automatic routing
✅ **Per-project specs** for organized documentation

**Quick Commands**:
- Create profile: `/specweave:sync-profile create`
- List profiles: `/specweave:sync-profile list`
- Sync increment: `/specweave-github:sync 0004`
- Create project: `/specweave:project create`
- Migrate from V1: `specweave migrate-to-profiles`

**Need Help?**
- GitHub Issues: https://github.com/anton-abyzov/specweave/issues
- Documentation: https://spec-weave.com
- Slash command docs: `plugins/specweave-github/commands/specweave-github-sync.md`

---

**Version**: 2.0.0
**Command**: `/specweave-github:sync`
**Plugin**: specweave-github
**Last Updated**: 2025-11-05
