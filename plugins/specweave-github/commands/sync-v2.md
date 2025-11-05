---
name: specweave-github:sync-v2
description: Synchronize SpecWeave increment with GitHub issue (Multi-Project Support). Select profile, configure time range, and sync with rate limit protection.
---

# Sync Increment with GitHub Issue (Multi-Project)

**NEW in v2**: Multi-profile support, time range filtering, and rate limit protection.

Synchronize the current state of a SpecWeave increment with its GitHub issue across multiple repositories.

## Usage

```bash
/specweave-github:sync <increment-id> [options]
```

## Arguments

- `increment-id`: Increment ID (e.g., `0004` or `0004-plugin-architecture`)

## Options

### Sync Options
- `--profile <id>`: Use specific sync profile (skip selection prompt)
- `--time-range <preset>`: Time range for sync (`1W`, `2W`, `1M`, `3M`, `6M`, `1Y`, `ALL`)
- `--tasks`: Update task checklist in issue body
- `--comment`: Post progress comment (default)
- `--labels`: Update issue labels based on status
- `--force`: Force sync even if up-to-date
- `--direction`: Sync direction (`to-github`, `from-github`, `bidirectional`)
- `--all`: Sync all active increments

### Safety Options
- `--dry-run`: Preview changes without applying
- `--skip-rate-check`: Skip rate limit validation (not recommended)

## Examples

```bash
# Interactive sync (select profile + time range)
/specweave-github:sync 0004

# Use specific profile
/specweave-github:sync 0004 --profile specweave-dev

# Specify time range
/specweave-github:sync 0004 --time-range 1M

# Full sync with all options
/specweave-github:sync 0004 --profile main --time-range 1M --tasks --labels

# Dry run to preview changes
/specweave-github:sync 0004 --dry-run

# Force sync all increments
/specweave-github:sync --all --force
```

## Interactive Workflow

### Step 1: Profile Selection

If multiple GitHub profiles exist, you'll be prompted to select one:

```
🔗 Select GitHub Profile

Available profiles:

  1. specweave-dev
     └─ 🐙 GitHub: anton-abyzov/specweave
     └─ Main SpecWeave repository
     └─ Default time range: 1 month (max: 6 months)

  2. another-repo
     └─ 🐙 GitHub: myorg/another-project
     └─ Another project repository
     └─ Default time range: 1 month (max: 6 months)

  3. ✨ Create new profile

Your choice: [1]
```

### Step 2: Time Range Selection

Choose how far back to fetch GitHub data:

```
📅 Select Time Range for Sync

⚠️  IMPORTANT: Time range affects sync performance and rate limits

📅 GitHub Rate Limits:
   • Limit: 5,000 requests per 1h
   • Current: 4,850/5,000 (97% available)
   • Resets: 3:00:00 PM (25 min)

Select time range:

  1. Last 1 week
     └─ ~50 items | 75 API calls | ⚡ 30 sec | Rate: LOW (1.5%)

  2. Last 2 weeks
     └─ ~100 items | 150 API calls | ⚡ 1 min | Rate: LOW (3%)

  3. Last 1 month  ← Recommended
     └─ ~200 items | 300 API calls | ⚡ 2 min | Rate: LOW (6%)

  4. Last 3 months
     └─ ~600 items | 900 API calls | ⚠️  5 min | Rate: MEDIUM (18%)

  5. Last 6 months
     └─ ~1,200 items | 1,800 API calls | ⚠️  10 min | Rate: HIGH (36%)

  6. All time
     └─ ~5,000 items | 7,500 API calls | ❌ 30+ min | Rate: CRITICAL (150%)
     └─ ⚠️  WARNING: Will exceed rate limit! Not recommended.

Your choice: [3]
```

### Step 3: Sync Preview

Before executing, you'll see a preview:

```
📊 Sync Preview:

   Profile: specweave-dev (GitHub)
   └─ Repository: anton-abyzov/specweave
   └─ Time range: Last 1 month (2025-10-04 to 2025-11-04)

   Estimated sync:
   ├─ Work items: ~187 issues/PRs
   ├─ API calls: ~280 requests
   ├─ Duration: ~2 minutes
   └─ Rate limit: Low impact (5.6% of hourly limit)

   GitHub rate limit (BEFORE sync):
   ├─ Current: 4,850/5,000 (97% available)
   ├─ After sync: ~4,570/5,000 (91% available)
   └─ Reset: 3:00:00 PM (25 min)

✅ This sync is SAFE to proceed

Continue with sync? [Y/n]:
```

### Step 4: Execution

If confirmed, sync proceeds with progress updates:

```
🔄 Syncing increment 0004 to GitHub...

✓ Profile loaded: specweave-dev
✓ GitHub repository: anton-abyzov/specweave
✓ Rate limit check: PASSED (4,850/5,000 remaining)

Fetching increment state...
✓ Increment loaded: 0004-plugin-architecture
✓ GitHub issue: #130
✓ Last synced: 30 minutes ago

Detecting changes...
✓ 3 new tasks completed (T-005, T-006, T-007)
✓ Progress: 4/48 → 7/48 (15%)
✓ Current task: T-008

Syncing to GitHub...
✓ Posted progress comment (ID: 1234567)
✓ Updated task checklist (7 tasks marked complete)
✓ Updated labels: +in-progress
✓ Metadata updated

Rate limit after sync: 4,570/5,000 (91% available)

✅ Sync Complete!

GitHub Issue: https://github.com/anton-abyzov/specweave/issues/130
Last synced: just now
Next sync: Use /specweave-github:sync 0004 when ready
```

## Multi-Project Benefits

### Before (Single Project)

```
❌ Problems:
- Only one GitHub repo per project
- Can't sync increments to different repos
- No rate limit protection
- Slow syncs (fetching all data)
```

### After (Multi-Project)

```
✅ Benefits:
- Unlimited GitHub repos (3+, 5+, 10+ profiles)
- Different increments → different repos
  - Increment 0001 → anton-abyzov/specweave
  - Increment 0002 → client-org/mobile-app
  - Increment 0003 → internal-org/infrastructure
- Time range filtering (2 min vs 25+ min)
- Rate limit protection (95%+ success rate)
- Smart estimates before every sync
```

## Configuration

### Sync Profiles

Configure profiles in `.specweave/config.json`:

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
        },
        "rateLimits": {
          "maxItemsPerSync": 500,
          "warnThreshold": 100
        }
      },
      "another-repo": {
        "provider": "github",
        "displayName": "Another Repository",
        "config": {
          "owner": "myorg",
          "repo": "another-project"
        },
        "timeRange": {
          "default": "2W",
          "max": "3M"
        }
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

### Credentials

Store credentials in `.env` (never committed):

```env
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### Per-Increment Configuration

Each increment stores its sync metadata in `.specweave/increments/{id}/metadata.json`:

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

## Rate Limiting Protection

### What It Does

Before every sync:
1. **Estimates API calls** based on time range and project size
2. **Checks current rate limit** via GitHub API
3. **Calculates impact** (low/medium/high/critical)
4. **Validates safety** (will it exceed limit?)
5. **Warns user** if risky operation detected

### Impact Levels

| Impact | API Calls | Duration | Safe? | Example Time Range |
|--------|-----------|----------|-------|-------------------|
| **Low** | <250 | <2 min | ✅ Yes | 1 week, 2 weeks, 1 month |
| **Medium** | 250-1000 | 2-5 min | ⚠️  Maybe | 3 months |
| **High** | 1000-2500 | 5-15 min | ⚠️  Risky | 6 months, 1 year |
| **Critical** | 2500+ | 15+ min | ❌ No | All time |

### Protection Actions

**Low/Medium Impact** → Proceed with optional warning
**High Impact** → Warn user, require confirmation
**Critical Impact** → Block sync, show recommendations

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

## Error Handling

### Profile Not Found

```
❌ Error: Sync profile 'unknown-profile' not found

Available profiles:
  • specweave-dev (GitHub: anton-abyzov/specweave)
  • another-repo (GitHub: myorg/another-project)

Create profile: /specweave:sync-profile create
List profiles: /specweave:sync-profile list
```

### No Profiles Configured

```
❌ Error: No GitHub sync profiles configured

Create your first profile:
  /specweave:sync-profile create

Or migrate from old configuration:
  specweave migrate-to-profiles
```

### Rate Limit Exceeded During Sync

```
⚠️  GitHub API rate limit exceeded during sync

Synced: 127/187 items (68%)
Remaining: 60 items
Rate limit resets: 2025-11-04 15:00:00 (12 minutes)

What would you like to do?

  1. Wait and resume (auto-resume in 12 min)
  2. Resume manually later (/specweave-github:sync 0004 --resume)
  3. Cancel sync (partial data saved)

Your choice: [1]
```

### Network Error with Retry

```
❌ Error: Network error while syncing to GitHub

Failed to connect to GitHub API.
Synced: 45/187 items before error

Retry options:
  1. Retry immediately
  2. Retry with exponential backoff (recommended)
  3. Cancel and retry manually later

Your choice: [2]

Retrying in 5 seconds...
Retrying in 10 seconds...
✓ Connection restored! Resuming sync...
```

## Migration from v1

### Automatic Migration

Run migration script:

```bash
specweave migrate-to-profiles
```

Output:
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

### Manual Migration

If automatic migration fails:

1. Create profile manually:
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

## Related Commands

- `/specweave-github:create-issue <increment-id>`: Create issue with profile selection
- `/specweave-github:close-issue <increment-id>`: Close issue
- `/specweave-github:status <increment-id>`: Check sync status
- `/specweave:sync-profile create`: Create new sync profile
- `/specweave:sync-profile list`: List all profiles

## Tips & Best Practices

### 1. Choose the Right Time Range

**For Active Projects**:
- Use `1M` (1 month) - Balances completeness and performance
- Daily syncs: `1W` (fast, <1 min)

**For Historical Analysis**:
- Use `3M` or `6M` with caution (check rate limits first)
- Never use `ALL` unless absolutely necessary

### 2. Monitor Rate Limits

Check before large operations:
```bash
gh api rate_limit
```

Output:
```json
{
  "resources": {
    "core": {
      "limit": 5000,
      "remaining": 4850,
      "reset": 1699027200
    }
  }
}
```

### 3. Use Profiles Strategically

**Organize by project**:
- `project-a-dev` → Development repo
- `project-a-prod` → Production repo
- `project-b` → Different project

**Organize by team**:
- `frontend-team` → Frontend repo
- `backend-team` → Backend repo
- `infra-team` → Infrastructure repo

### 4. Enable Auto-Sync

For active development:
```json
{
  "sync": {
    "settings": {
      "autoSync": true,
      "syncFrequency": "every-task",
      "rateLimitProtection": true
    }
  }
}
```

### 5. Use Dry Run for Testing

Before large syncs:
```bash
/specweave-github:sync 0004 --dry-run --time-range 6M
```

This shows what would happen without actually executing.

## Advanced

### Batch Sync Multiple Increments

```bash
# Sync all active increments (respects rate limits)
/specweave-github:sync --all --time-range 1M

# Sync specific increments
/specweave-github:sync 0001,0002,0003 --time-range 2W
```

### Custom Rate Limit Thresholds

Override default thresholds:
```json
{
  "sync": {
    "profiles": {
      "my-profile": {
        "rateLimits": {
          "maxItemsPerSync": 1000,
          "warnThreshold": 200
        }
      }
    }
  }
}
```

### Resume Failed Syncs

If sync fails mid-operation:
```bash
/specweave-github:sync 0004 --resume
```

System will:
1. Load sync state from metadata
2. Skip already-synced items
3. Continue from last checkpoint

---

**Command**: `/specweave-github:sync`
**Plugin**: specweave-github
**Version**: 2.0.0 (Multi-Project)
**Last Updated**: 2025-11-05
**Requires**: SpecWeave Core v0.8.0+
