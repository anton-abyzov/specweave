# ADR-0016: Multi-Project External Sync Architecture

**Status**: Proposed
**Date**: 2025-11-04
**Decision Makers**: SpecWeave Core Team
**Affected Components**: specweave-github, specweave-ado, specweave-jira

---

## Context

### The Problem

Current external sync plugins (GitHub, Azure DevOps, JIRA) support only **ONE project per tool**:

```typescript
// GitHub: Single repo
class GitHubClient {
  private repo: string;  // ← Only ONE repo
}

// ADO: Single organization + project
interface AdoConfig {
  organization: string;
  project: string;  // ← Only ONE project
}

// JIRA: (Presumed) Single domain + project
```

**This breaks in real-world scenarios**:

1. **Multi-Product Development**
   - Company has 3 products, each with own JIRA project
   - SpecWeave increments sync to different projects
   - Current: All go to ONE project (wrong!)

2. **Consulting/Agency Work**
   - Developer works with 3 clients
   - Client A: JIRA + ADO
   - Client B: GitHub + JIRA
   - Personal: GitHub
   - Current: Can only configure ONE per tool

3. **Hybrid Team Structure**
   - Core team uses GitHub
   - Product team uses JIRA
   - Infrastructure team uses ADO
   - Current: Pick one tool only

### Additional Problems

4. **Time Range Filtering**
   - Syncing ALL work items = 1000s of items
   - Rate limiting: GitHub (5000/hour), JIRA (100/min), ADO (200/min)
   - Slow: 10+ minutes for large projects
   - Unnecessary: Only recent work matters

5. **User Experience**
   - No warnings about rate limits
   - No estimates (time, API calls, impact)
   - Confusing questions without context

---

## Decision

We will implement **Sync Profiles** - a three-layer architecture enabling:
- ✅ Multiple projects per tool (unlimited)
- ✅ Per-increment sync configuration
- ✅ Time range filtering with rate limit protection
- ✅ Smart UX with estimates and warnings

---

## Solution Architecture

### Layer 1: Credentials (.env)

**What**: Secrets only (tokens, passwords)
**Location**: `.env` (gitignored)
**Scope**: Global (all projects)

```env
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# JIRA
JIRA_API_TOKEN=ATATTxxxxxxxxxxxxx
JIRA_EMAIL=anton.abyzov@gmail.com

# Azure DevOps
AZURE_DEVOPS_PAT=xxxxxxxxxxxxx
```

**Why separate credentials?**
- ✅ Security (never commit tokens)
- ✅ Reusable across all sync profiles
- ✅ Standard practice (.env pattern)

---

### Layer 2: Sync Profiles (.specweave/config.json)

**What**: Project/repo configurations (public metadata)
**Location**: `.specweave/config.json` (committed)
**Scope**: All available sync targets

```json
{
  "sync": {
    "activeProfile": "specweave-dev",
    "profiles": {

      "specweave-dev": {
        "provider": "github",
        "displayName": "SpecWeave Development",
        "description": "Main SpecWeave repository",
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

      "client-a-product": {
        "provider": "jira",
        "displayName": "Client A - Product Work",
        "description": "Client A JIRA project",
        "config": {
          "domain": "clienta.atlassian.net",
          "projectKey": "CLIENTA",
          "issueType": "Epic"
        },
        "timeRange": {
          "default": "2W",
          "max": "3M"
        },
        "rateLimits": {
          "maxItemsPerSync": 200,
          "warnThreshold": 50
        }
      },

      "internal-infrastructure": {
        "provider": "ado",
        "displayName": "Internal Infrastructure",
        "description": "Azure DevOps infrastructure project",
        "config": {
          "organization": "easychamp",
          "project": "Infrastructure",
          "workItemType": "Epic",
          "areaPath": "Infrastructure\\SpecWeave"
        },
        "timeRange": {
          "default": "1M",
          "max": "12M"
        },
        "rateLimits": {
          "maxItemsPerSync": 500,
          "warnThreshold": 100
        }
      },

      "another-github-repo": {
        "provider": "github",
        "displayName": "Another Project",
        "description": "Different GitHub repository",
        "config": {
          "owner": "my-org",
          "repo": "another-project"
        },
        "timeRange": {
          "default": "1M",
          "max": "6M"
        }
      }

    }
  }
}
```

**Key Features**:
- ✅ **Multiple profiles per provider** (e.g., 2 GitHub repos, 3 JIRA projects)
- ✅ **Mixed providers** (GitHub + JIRA + ADO simultaneously)
- ✅ **Per-profile time ranges** (different limits for different projects)
- ✅ **Per-profile rate limits** (protect smaller projects)
- ✅ **Active profile** (default selection)
- ✅ **Committed to git** (shared across team)

---

### Layer 3: Per-Increment Sync (metadata.json)

**What**: Which profile each increment uses
**Location**: `.specweave/increments/{id}/metadata.json`
**Scope**: Single increment

```json
{
  "id": "0001-core-framework",
  "status": "active",
  "sync": {
    "profile": "specweave-dev",
    "issueNumber": 123,
    "issueUrl": "https://github.com/anton-abyzov/specweave/issues/123",
    "timeRange": "1M",
    "createdAt": "2025-10-15T10:00:00Z",
    "lastSyncAt": "2025-11-04T14:30:00Z"
  }
}
```

```json
{
  "id": "0002-client-feature",
  "status": "active",
  "sync": {
    "profile": "client-a-product",
    "epicKey": "CLIENTA-456",
    "epicUrl": "https://clienta.atlassian.net/browse/CLIENTA-456",
    "timeRange": "2W",
    "createdAt": "2025-11-01T10:00:00Z",
    "lastSyncAt": "2025-11-04T15:00:00Z"
  }
}
```

**Key Features**:
- ✅ **Different profiles per increment** (0001 → GitHub, 0002 → JIRA)
- ✅ **Custom time ranges** (override profile default)
- ✅ **Sync history** (created, last sync)
- ✅ **External links** (direct links to issues/epics)

---

## Time Range Filtering

### Problem Statement

**Without filtering**:
- Large projects: 5000+ work items
- API calls: 7500+ requests (1.5x multiplier)
- Duration: 10-30 minutes
- Rate limits: GitHub (5000/hour) → EXHAUSTED
- Cost: Some APIs charge per request

**Real example**:
```
Project: 2 years old, 10 developers
Work items: 5,247 total
Time to sync ALL: ~25 minutes
API calls: 7,870
GitHub rate limit: 5000/hour → BLOCKED!
```

### Solution: Smart Time Ranges

```typescript
interface TimeRangeConfig {
  // Preset options
  preset: '1W' | '2W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

  // Custom range
  custom?: {
    start: string;  // ISO date: "2025-10-01"
    end?: string;   // ISO date or null (ongoing)
  };

  // Estimated impact
  estimate: {
    items: number;          // Estimated work items to sync
    apiCalls: number;       // Estimated API requests
    durationMinutes: number; // Estimated sync time
    rateLimitImpact: 'low' | 'medium' | 'high' | 'critical';
  };

  // Protection
  maxItems: number;         // Hard cap (default: 500)
  warnThreshold: number;    // Warn user (default: 100)
}
```

### Recommended Defaults

| Time Range | Typical Items | API Calls | Duration | Rate Limit | Recommended For |
|------------|--------------|-----------|----------|------------|-----------------|
| **1 Week** | ~50 | ~75 | 30 sec | Low (1.5%) | Active sprint |
| **2 Weeks** | ~100 | ~150 | 1 min | Low (3%) | Current sprint |
| **1 Month** | ~200 | ~300 | 2 min | Low (6%) | **Recommended default** |
| **3 Months** | ~600 | ~900 | 5 min | Medium (18%) | Quarter planning |
| **6 Months** | ~1200 | ~1800 | 10 min | High (36%) | Half-year review |
| **1 Year** | ~2400 | ~3600 | 20 min | High (72%) | Annual review |
| **ALL** | ~5000 | ~7500 | 30+ min | **CRITICAL (150%)** | ❌ Not recommended |

**Default**: `1M` (1 month) - Balanced between completeness and performance

---

## Rate Limiting Protection

### Rate Limits by Provider

| Provider | Limit | Window | Reset | Penalty |
|----------|-------|--------|-------|---------|
| **GitHub** | 5,000 req | 1 hour | Hourly | 403 error, 1h wait |
| **JIRA** | 100 req | 1 minute | Rolling | 429 error, exponential backoff |
| **Azure DevOps** | 200 req | 5 minutes | Rolling | 429 error, retry after |

### Protection Strategy

```typescript
class SyncRateLimiter {

  // 1. Pre-flight check (BEFORE sync)
  async estimateSync(config: SyncConfig): Promise<SyncEstimate> {
    // Quick API call to count items in time range
    const count = await this.countItems(config);

    return {
      items: count,
      apiCalls: Math.ceil(count * 1.5),  // 1.5x multiplier for overhead
      durationMinutes: Math.ceil(count / 100),  // 100 items/min throughput
      rateLimitImpact: this.calculateImpact(count, config.provider)
    };
  }

  // 2. Check current rate limit status
  async checkRateLimitStatus(provider: string): Promise<RateLimitStatus> {
    // GitHub example
    if (provider === 'github') {
      const status = await githubClient.getRateLimitStatus();
      return {
        remaining: status.remaining,
        limit: status.limit,
        resetAt: status.reset,
        percentUsed: ((status.limit - status.remaining) / status.limit) * 100
      };
    }
  }

  // 3. Sync with backoff (DURING sync)
  async syncWithProtection(config: SyncConfig) {
    const estimate = await this.estimateSync(config);

    // Warn if large sync
    if (estimate.rateLimitImpact === 'high' || estimate.rateLimitImpact === 'critical') {
      console.warn(`⚠️  Large sync detected: ${estimate.items} items`);
      console.warn(`   Duration: ~${estimate.durationMinutes} minutes`);
      console.warn(`   Rate limit impact: ${estimate.rateLimitImpact.toUpperCase()}`);

      const confirmed = await this.askUser('Continue with sync?');
      if (!confirmed) {
        console.log('❌ Sync cancelled by user');
        return;
      }
    }

    // Sync with rate-limited batching
    const limiter = this.getRateLimiter(config.provider);
    await limiter.syncWithBackoff(config, estimate);
  }

  // 4. Calculate impact level
  private calculateImpact(itemCount: number, provider: string): string {
    const limits = {
      github: { low: 250, medium: 1000, high: 2500 },  // 5000 total
      jira: { low: 25, medium: 50, high: 75 },         // 100/min
      ado: { low: 50, medium: 100, high: 150 }         // 200/5min
    };

    const threshold = limits[provider];
    const apiCalls = itemCount * 1.5;

    if (apiCalls < threshold.low) return 'low';
    if (apiCalls < threshold.medium) return 'medium';
    if (apiCalls < threshold.high) return 'high';
    return 'critical';
  }
}
```

---

## User Experience Flow

### Interactive Sync Configuration

```
🔗 Configure External Sync for Increment 0008

Step 1: Select sync profile
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Available profiles:

  1. specweave-dev
     └─ GitHub: anton-abyzov/specweave
     └─ Description: Main SpecWeave repository
     └─ Default time range: 1 month

  2. client-a-product
     └─ JIRA: clienta.atlassian.net (CLIENTA)
     └─ Description: Client A JIRA project
     └─ Default time range: 2 weeks

  3. internal-infrastructure
     └─ Azure DevOps: easychamp/Infrastructure
     └─ Description: Azure DevOps infrastructure project
     └─ Default time range: 1 month

  4. ✨ Configure new profile
  5. ❌ Skip sync (no external integration)

Your choice: [1] █

✅ Selected: specweave-dev (GitHub)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 2: Select time range for sync
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPORTANT: Time range affects sync performance and rate limits

📅 GitHub Rate Limits:
   • Limit: 5,000 requests per hour
   • Current: 4,850 remaining (97%)
   • Resets: 2025-11-04 15:00 UTC (25 minutes)

Select time range:

  1. Last 1 week
     └─ ~50 items | ~75 API calls | ⚡ 30 sec | Rate: Low (1.5%)

  2. Last 2 weeks
     └─ ~100 items | ~150 API calls | ⚡ 1 min | Rate: Low (3%)

  3. Last 1 month  ← Recommended
     └─ ~200 items | ~300 API calls | ⚡ 2 min | Rate: Low (6%)

  4. Last 3 months
     └─ ~600 items | ~900 API calls | ⚠️  5 min | Rate: Medium (18%)

  5. Last 6 months
     └─ ~1,200 items | ~1,800 API calls | ⚠️  10 min | Rate: High (36%)

  6. Last 1 year
     └─ ~2,400 items | ~3,600 API calls | ⚠️  20 min | Rate: High (72%)

  7. All time
     └─ ~5,000 items | ~7,500 API calls | ❌ 30+ min | Rate: CRITICAL (150%)
     └─ ⚠️  WARNING: Will exceed rate limit! Not recommended.

  8. Custom range (advanced)

Your choice: [3] █

✅ Selected: Last 1 month (2025-10-04 to 2025-11-04)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 3: Review and confirm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
   └─ Reset: 2025-11-04 15:00 UTC (25 min)

✅ This sync is SAFE to proceed

Continue with sync? [Y/n]: █
```

### Error Handling with Context

```
❌ Sync Failed: Rate Limit Exceeded

GitHub API rate limit exceeded during sync.

Details:
├─ Synced: 127/187 items (68%)
├─ Remaining: 60 items
├─ Rate limit reset: 2025-11-04 15:00 UTC (12 minutes)

What would you like to do?

  1. Wait and resume (auto-resume in 12 min)
  2. Resume manually later (run /specweave-github:sync --resume)
  3. Cancel sync (partial data saved)

Your choice: [1]

⏳ Waiting for rate limit reset...
   └─ Reset time: 2025-11-04 15:00 UTC (12 minutes)
   └─ Will auto-resume sync at that time
   └─ Press Ctrl+C to cancel and resume manually later
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

1. **Schema Updates**
   - Update `.specweave/config.json` schema (sync profiles)
   - Update `metadata.json` schema (per-increment sync)
   - Migration script (convert old config → new profiles)

2. **Config Manager**
   - Load/save sync profiles
   - Validate profile configurations
   - Profile CRUD operations

3. **Rate Limiter**
   - Pre-flight estimation
   - Rate limit status checking
   - Backoff/retry logic

### Phase 2: Plugin Updates (Week 2-3)

4. **GitHub Plugin** (`specweave-github`)
   - Multi-repo support
   - Profile-based config
   - Time range filtering
   - Rate limit integration

5. **JIRA Plugin** (`specweave-jira`)
   - Multi-project support
   - Profile-based config
   - Time range filtering
   - Rate limit integration

6. **ADO Plugin** (`specweave-ado`)
   - Multi-project support
   - Profile-based config
   - Time range filtering
   - Rate limit integration

### Phase 3: User Experience (Week 4)

7. **Interactive Setup**
   - Profile selection UI
   - Time range selection UI
   - Preview/confirm flow
   - Error handling with context

8. **Documentation**
   - User guide (setup profiles)
   - Rate limiting guide
   - Troubleshooting guide
   - Migration guide (v0.x → v1.0)

### Phase 4: Testing & Polish (Week 5)

9. **Integration Tests**
   - Multi-profile scenarios
   - Rate limit protection
   - Time range filtering
   - Error recovery

10. **E2E Tests**
    - Full sync flows
    - Profile management
    - Error scenarios

---

## Benefits

### For Users

1. **Multiple Projects**
   - ✅ Work with unlimited external projects simultaneously
   - ✅ Each increment syncs to appropriate project
   - ✅ No more manual config switching

2. **Fast & Reliable**
   - ✅ Smart time ranges (only sync what matters)
   - ✅ Rate limit protection (never get blocked)
   - ✅ Clear estimates (know what to expect)

3. **Great UX**
   - ✅ Interactive setup (guided, not overwhelming)
   - ✅ Clear warnings (understand implications)
   - ✅ Helpful errors (context + recovery options)

### For SpecWeave

1. **Architecture**
   - ✅ Clean separation (credentials vs config vs metadata)
   - ✅ Reusable patterns (same structure for all plugins)
   - ✅ Extensible (easy to add new providers)

2. **Quality**
   - ✅ No rate limit surprises
   - ✅ Predictable performance
   - ✅ Professional UX

---

## Open Questions

1. **Profile Sharing**
   - Q: Should profiles be committed to git?
   - A: YES - Team shares profiles, credentials stay in .env

2. **Profile Inheritance**
   - Q: Can profiles inherit from each other?
   - A: MAYBE - Nice-to-have for v2.0

3. **Auto-Detection**
   - Q: Should we auto-detect available projects?
   - A: YES - Scan on first setup, save as profiles

4. **Profile Templates**
   - Q: Provide common profile templates?
   - A: YES - GitHub, JIRA, ADO templates in docs

---

## Success Metrics

1. **Functional**
   - ✅ Users can configure 3+ profiles per provider
   - ✅ Users can sync increments to different projects
   - ✅ Zero rate limit errors in normal usage

2. **Performance**
   - ✅ 1-month sync: <2 minutes (vs 25+ minutes for "ALL")
   - ✅ Rate limit impact: <10% per sync
   - ✅ 95% of syncs complete on first try

3. **UX**
   - ✅ <5 minutes to set up first profile
   - ✅ <30 seconds to select profile for increment
   - ✅ 100% of users understand time range implications

---

## Related ADRs

- **ADR-0007**: GitHub-First Task Sync
- **ADR-0015**: Hybrid Plugin System

---

## Appendix A: Migration Example

### Before (Single Project)

```env
# .env
AZURE_DEVOPS_PAT=xxx
AZURE_DEVOPS_ORG=easychamp
AZURE_DEVOPS_PROJECT=SpecWeaveSync  # ← Single project!
```

### After (Multi-Project)

```env
# .env (credentials only)
AZURE_DEVOPS_PAT=xxx
```

```json
// .specweave/config.json (profiles)
{
  "sync": {
    "profiles": {
      "specweave-ado": {
        "provider": "ado",
        "config": {
          "organization": "easychamp",
          "project": "SpecWeaveSync"
        }
      },
      "mobile-ado": {
        "provider": "ado",
        "config": {
          "organization": "easychamp",
          "project": "MobileApp"
        }
      }
    }
  }
}
```

---

## Appendix B: Example Code Changes

### Before: Single Project

```typescript
// plugins/specweave-ado/lib/ado-client.ts
interface AdoConfig {
  organization: string;
  project: string;  // ← Single project
  personalAccessToken: string;
}

class AdoClient {
  constructor(config: AdoConfig) {
    this.baseUrl = `https://dev.azure.com/${config.organization}/${config.project}`;
  }
}
```

### After: Profile-Based

```typescript
// plugins/specweave-ado/lib/ado-client.ts
interface AdoProfile {
  organization: string;
  project: string;
  displayName: string;
  timeRange: { default: string; max: string };
}

class AdoClient {
  constructor(
    profile: AdoProfile,
    personalAccessToken: string
  ) {
    this.baseUrl = `https://dev.azure.com/${profile.organization}/${profile.project}`;
  }
}

// Usage
const profileManager = new ProfileManager();
const profile = profileManager.getProfile('mobile-ado');
const client = new AdoClient(profile, process.env.AZURE_DEVOPS_PAT);
```

---

**Decision**: Approved ✅
**Next Steps**: Implement Phase 1 (Core Infrastructure)
