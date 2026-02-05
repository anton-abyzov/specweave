---
description: Synchronize SpecWeave increment with GitHub issue (Multi-Project Support). Select profile, configure time range, and sync with rate limit protection.
---

# Sync Increment with GitHub Issue (Multi-Project)

## ⚠️ CRITICAL: Pre-Sync Requirements (Read First!)

### ⛔ MANDATORY: Sync Living Docs BEFORE GitHub Sync

**GitHub sync reads FROM living docs.** If living docs are stale, GitHub issues will have outdated content.

**You MUST run `/sw:sync-specs` (or ensure it ran) BEFORE this command:**

```bash
# STEP 1: Ensure living docs are current (MANDATORY)
/sw:sync-specs <increment-id>

# STEP 2: Then sync to GitHub
/sw-github:sync <increment-id>
```

**Why?**
- GitHub issues are generated FROM `.specweave/docs/internal/specs/FS-XXX/`
- If you skip sync-specs, GitHub will show stale user stories/ACs
- `/sw:sync-progress` calls sync-specs automatically, but `/sw-github:sync` does NOT

**If you're calling this directly (not via /sw:sync-progress), run sync-specs first!**

---

### Step 0: Detect Project Structure

```bash
# Check for living docs structure
if [ -d ".specweave/docs/internal/specs" ] && [ -n "$(ls -A .specweave/docs/internal/specs/*/FEATURE.md 2>/dev/null)" ]; then
    echo "✅ Living docs found → Use Feature Sync"
else
    echo "⚠️ No living docs → Use Increment Sync (brownfield)"
fi
```

### Sync Path Decision:

| Structure | Command | Issue Format |
|-----------|---------|--------------|
| **Living docs exist** (`.specweave/docs/internal/specs/FS-XXX/`) | Use `github-feature-sync-cli.ts` | `[FS-XXX][US-YYY] Title` |
| **Increment only** (brownfield, no living docs) | Use `github-increment-sync-cli.ts` | `[FS-XXX] Title` with ACs |

### For Brownfield Projects (No Living Docs):

Use the Increment Sync CLI directly:

```bash
# Set token (read from .env without displaying value)
export GITHUB_TOKEN=$(grep -oP '(?<=^GITHUB_TOKEN=).+' .env 2>/dev/null || grep '^GITHUB_TOKEN=' .env | cut -d'=' -f2-)

# Run increment sync
node dist/plugins/specweave-github/lib/github-increment-sync-cli.js <increment-id>

# Example
node dist/plugins/specweave-github/lib/github-increment-sync-cli.js 0002
```

This creates issues with:
- ✅ Proper format: `[FS-002] Increment Title`
- ✅ User Stories listed with checkbox headers
- ✅ All ACs as checkable items
- ✅ Links to increment files

### For Projects with Living Docs:

Use the Feature Sync CLI:

```bash
# Run feature sync
node dist/plugins/specweave-github/lib/github-feature-sync-cli.js <feature-id>

# Example
node dist/plugins/specweave-github/lib/github-feature-sync-cli.js FS-062
```

---

Synchronize the current state of a SpecWeave increment with its GitHub issue across multiple repositories. Supports multi-profile management, time range filtering, and rate limit protection.

## Usage

```bash
/sw-github:sync <increment-id> [options]
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
- `--direction`: Sync direction (`to-github`, `from-github`, `two-way` - **default: two-way**)
- `--all`: Sync all active increments

### Safety Options
- `--dry-run`: Preview changes without applying
- `--skip-rate-check`: Skip rate limit validation (not recommended)

## Sync Direction

**Default: Two-way** (both directions)

SpecWeave syncs changes in **both directions** by default:

| Direction | What It Does | Use When |
|-----------|-------------|----------|
| **`two-way`** (default) | SpecWeave ↔ GitHub<br>• Pull changes FROM GitHub (status, labels, comments)<br>• Push changes TO GitHub (tasks, progress, metadata) | **Always** (recommended for keeping both systems in sync) |
| `to-github` | SpecWeave → GitHub only<br>• Push increment progress to GitHub<br>• Don't pull GitHub changes back | Read-only GitHub usage, or when GitHub is downstream |
| `from-github` | GitHub → SpecWeave only<br>• Pull GitHub issue updates<br>• Don't push SpecWeave changes | Importing GitHub issues, or when SpecWeave is downstream |

**Why Two-way?**
- ✅ Keep both systems synchronized automatically
- ✅ GitHub status changes update SpecWeave (closed issue → completed increment)
- ✅ SpecWeave task completion updates GitHub (task done → checklist updated)
- ✅ Team members can work in either tool
- ✅ No data loss from changes in either system

**Override if needed:**
```bash
# Push only (one-way to GitHub)
/sw-github:sync 0004 --direction to-github

# Pull only (one-way from GitHub)
/sw-github:sync 0004 --direction from-github
```

## Examples

```bash
# Interactive two-way sync (default - both directions)
/sw-github:sync 0004

# Use specific profile (still two-way by default)
/sw-github:sync 0004 --profile specweave-dev

# Specify time range (two-way)
/sw-github:sync 0004 --time-range 1M

# Full two-way sync with all options
/sw-github:sync 0004 --profile main --time-range 1M --tasks --labels

# One-way sync examples (override default)
/sw-github:sync 0004 --direction to-github     # Push only
/sw-github:sync 0004 --direction from-github   # Pull only

# Dry run to preview changes
/sw-github:sync 0004 --dry-run

# Force sync all increments (two-way)
/sw-github:sync --all --force
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
🔄 Two-way sync for increment 0004...

✓ Profile loaded: specweave-dev
✓ GitHub repository: anton-abyzov/specweave
✓ Rate limit check: PASSED (4,850/5,000 remaining)
✓ Sync direction: Two-way (push & pull)

Fetching increment state...
✓ Increment loaded: 0004-plugin-architecture
✓ GitHub issue: #130
✓ Last synced: 30 minutes ago

Detecting changes (both directions)...

FROM GitHub:
✓ Issue status changed: open → closed
✓ Label added: ready-for-release
✓ 2 new comments from team

FROM SpecWeave:
✓ 3 new tasks completed (T-005, T-006, T-007)
✓ Progress: 4/48 → 7/48 (15%)
✓ Current task: T-008

Syncing TO GitHub...
✓ Posted progress comment (ID: 1234567)
✓ Updated task checklist (7 tasks marked complete)
✓ Updated labels: +in-progress
✓ Metadata updated

Syncing FROM GitHub...
✓ Updated increment status: active → completed
✓ Applied label: ready-for-release
✓ Imported 2 team comments to increment notes

Rate limit after sync: 4,570/5,000 (91% available)

✅ Two-way Sync Complete!

   SpecWeave ↔ GitHub synchronized
   • Pushed: 3 task updates, progress comment
   • Pulled: Status change, label, 2 comments

GitHub Issue: https://github.com/anton-abyzov/specweave/issues/130
Last synced: just now
Next sync: Automatic (hook-based) or manual when ready
```

## Key Features

- **Multi-Profile Support**: Unlimited GitHub repos (3+, 5+, 10+ profiles)
- **Flexible Syncing**: Different increments can sync to different repos
  - Increment 0001 → anton-abyzov/specweave
  - Increment 0002 → client-org/mobile-app
  - Increment 0003 → internal-org/infrastructure
- **Time Range Filtering**: Fast syncs (2 min vs 25+ min)
- **Rate Limit Protection**: 95%+ success rate with smart estimates
- **Smart Estimates**: Preview impact before every sync

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

Create profile: /sw:sync-profile create
List profiles: /sw:sync-profile list
```

### No Profiles Configured

```
❌ Error: No GitHub sync profiles configured

Create your first profile:
  /sw:sync-profile create

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
  2. Resume manually later (/sw-github:sync 0004 --resume)
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

## First-Time Setup

### Automatic Profile Creation

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
  1. Review profiles: /sw:sync-profile list
  2. Test sync: /sw-github:sync 0004
  3. Keep backup: .specweave/config.json.backup (until confirmed working)
```

### Manual Setup

If automatic profile creation fails:

1. Create profile manually:
   ```bash
   /sw:sync-profile create
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
   /sw-github:sync 0004
   ```

## Simpler Alternatives

For most use cases, use the git-style commands:

| Command | Purpose |
|---------|---------|
| `/sw-github:pull` | Pull changes from GitHub (read-only) |
| `/sw-github:push` | Push progress to GitHub |

Use `/sw-github:sync` for advanced operations with time ranges and rate limit control.

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw-github:pull` | Pull from GitHub (git-style) |
| `/sw-github:push` | Push to GitHub (git-style) |
| `/sw-github:create` | Create GitHub issue |
| `/sw-github:close` | Close GitHub issue |
| `/sw-github:status` | Check sync status |
| `/sw:sync-profile create` | Create new sync profile |

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
/sw-github:sync 0004 --dry-run --time-range 6M
```

This shows what would happen without actually executing.

## Advanced

### Batch Sync Multiple Increments

```bash
# Sync all active increments (respects rate limits)
/sw-github:sync --all --time-range 1M

# Sync specific increments
/sw-github:sync 0001,0002,0003 --time-range 2W
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
/sw-github:sync 0004 --resume
```

System will:
1. Load sync state from metadata
2. Skip already-synced items
3. Continue from last checkpoint

---

**Command**: `/sw-github:sync`
**Plugin**: specweave-github
**Version**: 1.0.0 (Multi-Project)
**Last Updated**: 2025-11-05
**Requires**: SpecWeave Core v0.8.0+
