# Multi-Project Sync Implementation Progress

**Date**: 2025-11-05
**Status**: In Progress (Phase 1 Complete, Phase 2-4 Remaining)

---

## Overview

Implementing ADR-0016: Multi-Project External Sync Architecture - a comprehensive solution for managing multiple projects/teams with external sync (GitHub, JIRA, ADO).

**Key Features**:
- ✅ Multiple projects per provider (unlimited)
- ✅ Per-increment sync configuration
- ✅ Time range filtering with rate limit protection
- ✅ Smart project detection from increment descriptions
- ✅ Organized specs per project/team

---

## Phase 1: Core Infrastructure ✅ COMPLETE

### 1. Types & Schemas ✅

**Created**:
- `src/core/types/sync-profile.ts` (432 lines)
  - SyncProvider, SyncProfile, ProjectContext types
  - TimeRangePreset, RateLimitStatus types
  - ProjectDetectionResult for smart detection

- `src/core/schemas/specweave-config.schema.json` (updated)
  - Added `sync` section with profiles, projects, settings
  - JSON schema validation for all sync configuration

### 2. Profile Manager ✅

**Created**:
- `src/core/sync/profile-manager.ts` (463 lines)
  - CRUD operations for sync profiles
  - Profile validation
  - Query by provider, project name
  - Statistics and active profile management

**Features**:
- Load/save from `.specweave/config.json`
- Validate profile structure
- Get profiles by provider (all GitHub repos, all JIRA projects, etc.)
- Get profiles for a project (keyword matching)

### 3. Rate Limiter ✅

**Created**:
- `src/core/sync/rate-limiter.ts` (365 lines)
  - Time range estimation (items, API calls, duration)
  - Rate limit impact calculation (low/medium/high/critical)
  - Rate limit status checking (GitHub, JIRA, ADO)
  - Sync validation (safe to proceed?)
  - Exponential backoff strategy

**Features**:
- Provider-specific rate limits (GitHub: 5000/hour, JIRA: 100/min, ADO: 200/5min)
- Pre-flight estimation before sync
- Real-time rate limit checking
- Validation with warnings and blockers

### 4. Project Context Manager ✅

**Created**:
- `src/core/sync/project-context.ts` (379 lines)
  - CRUD operations for project contexts
  - Smart project detection from descriptions (keyword matching, confidence scoring)
  - Specs folder management (per project/team)
  - Increment-to-project linking
  - Auto-generate project README files

**Features**:
- Detect project from increment description (confidence 0-1)
- Organize specs: `.specweave/docs/internal/specs/{project-id}/`
- Link increments to projects
- Suggest sync profiles based on project

### 5. GitHub Client V2 ✅

**Created**:
- `plugins/specweave-github/lib/github-client-v2.ts` (466 lines)
  - Profile-based GitHub client (owner/repo from profile)
  - Secure command execution (execFileNoThrow, not execSync)
  - Time range filtering (list issues by date range)
  - Rate limit checking
  - Batch operations with protection

**Migration**:
- Old: `GitHubClient(repo?)` → single repo
- New: `GitHubClientV2(profile)` → multi-repo via profiles

---

## Phase 2: Plugin Updates (IN PROGRESS)

### 6. JIRA Client V2 (PENDING)

**Tasks**:
- [ ] Create `plugins/specweave-jira/lib/jira-client-v2.ts`
  - Profile-based (domain/projectKey from profile)
  - Time range filtering (JQL queries)
  - Rate limit protection
  - Secure execution

**Implementation Notes**:
- JIRA REST API v3: `https://{domain}/rest/api/3/`
- Authentication: Basic Auth (email + API token from `.env`)
- Time range: `created >= "{since}" AND created <= "{until}"`
- Rate limiting: 100 requests/minute (estimated, no official API)

### 7. ADO Client V2 (PENDING)

**Tasks**:
- [ ] Update `plugins/specweave-ado/lib/ado-client.ts`
  - Profile-based (organization/project from profile)
  - Time range filtering (WIQL queries)
  - Rate limit protection
  - Secure execution

**Implementation Notes**:
- ADO REST API v7.1: `https://dev.azure.com/{org}/{project}/`
- Authentication: PAT token from `.env`
- Time range: WIQL `WHERE [System.CreatedDate] >= '{since}' AND [System.CreatedDate] <= '{until}'`
- Rate limiting: 200 requests/5 minutes

### 8. Plugin Commands Updates (PENDING)

**Tasks**:
- [ ] Update `/specweave-github:sync` command
  - Prompt for profile selection
  - Prompt for time range
  - Show estimates before sync
  - Validate rate limits

- [ ] Update `/specweave-jira:sync` command
- [ ] Update `/specweave-ado:sync` command

---

## Phase 3: User Experience (PENDING)

### 9. Interactive Profile Configuration (PENDING)

**Tasks**:
- [ ] Create `src/cli/commands/sync-profile.ts`
  - `/specweave:sync-profile create` - Interactive profile creation
  - `/specweave:sync-profile list` - List all profiles
  - `/specweave:sync-profile edit <id>` - Update profile
  - `/specweave:sync-profile delete <id>` - Delete profile
  - `/specweave:sync-profile set-active <id>` - Set active profile

**UX Flow**:
```
/specweave:sync-profile create

Step 1: Select provider
  1. GitHub
  2. JIRA
  3. Azure DevOps

Step 2: Enter configuration
  GitHub:
    • Owner: anton-abyzov
    • Repo: specweave

Step 3: Time range defaults
  • Default: 1 month
  • Max: 6 months

Step 4: Project context (optional)
  • Project name: SpecWeave
  • Keywords: specweave, framework, CLI
  • Team: SpecWeave Team

✅ Profile 'specweave-dev' created!
```

### 10. Interactive Time Range Selection (PENDING)

**Tasks**:
- [ ] Create `src/core/sync/time-range-selector.ts`
  - Interactive CLI for time range selection
  - Show estimates for each option
  - Show current rate limit status
  - Warn on high/critical impact
  - Allow custom range input

**UX Flow** (see ADR-0016 for complete mockup):
```
📅 Select time range:

  1. Last 1 week     (~50 items | ⚡ 30 sec | Rate: Low 1.5%)
  2. Last 1 month    (~200 items | ⚡ 2 min | Rate: Low 6%)   ← Recommended
  3. Last 3 months   (~600 items | ⚠️ 5 min | Rate: Medium 18%)
  ...

GitHub Rate Limit:
  • Current: 4,850/5,000 (97% available)
  • After sync: ~4,570/5,000 (91% available)

✅ This sync is SAFE to proceed
```

### 11. Smart Project Detection Integration (PENDING)

**Tasks**:
- [ ] Update `increment-planner` skill (STEP 0A)
  - Call ProjectContextManager.detectProject(description)
  - If confidence > 0.7, suggest project + profile
  - If confidence < 0.5, ask user to clarify
  - Link increment to detected project

**Integration Point**:
```typescript
// In increment-planner skill STEP 0A
const projectMgr = new ProjectContextManager(projectRoot);
const detection = await projectMgr.detectProject(incrementDescription);

if (detection.confidence > 0.7) {
  console.log(`✅ Detected project: ${detection.project.name}`);
  console.log(`   Suggested profile: ${detection.suggestedProfile}`);
  // Auto-link increment to project
} else if (detection.confidence > 0.3) {
  // Ask user: "Did you mean project X?"
} else {
  // Ask user to select project manually
}
```

---

## Phase 4: Testing & Polish (PENDING)

### 12. Migration Script (PENDING)

**Tasks**:
- [ ] Create `scripts/migrate-to-multi-project.ts`
  - Detect old config format (single project per provider)
  - Convert to profile-based format
  - Preserve existing metadata
  - Create default project context

**Migration Example**:
```typescript
// OLD (.env)
AZURE_DEVOPS_ORG=easychamp
AZURE_DEVOPS_PROJECT=SpecWeaveSync

// NEW (config.json + .env)
// .env: Only credentials
AZURE_DEVOPS_PAT=xxx

// config.json: Profiles
{
  "sync": {
    "profiles": {
      "specweave-ado": {
        "provider": "ado",
        "config": {
          "organization": "easychamp",
          "project": "SpecWeaveSync"
        }
      }
    }
  }
}
```

### 13. Integration Tests (PENDING)

**Tasks**:
- [ ] `tests/integration/sync/profile-manager.test.ts`
  - CRUD operations
  - Validation
  - Query by provider/project

- [ ] `tests/integration/sync/rate-limiter.test.ts`
  - Estimation accuracy
  - Impact calculation
  - Validation logic

- [ ] `tests/integration/sync/project-context.test.ts`
  - Project detection accuracy
  - Specs folder creation
  - Increment linking

- [ ] `tests/integration/sync/github-v2.test.ts`
  - Profile-based operations
  - Time range filtering
  - Rate limit handling

### 14. Documentation (PENDING)

**Tasks**:
- [ ] `.specweave/docs/public/guides/multi-project-sync-guide.md`
  - Getting started
  - Creating profiles
  - Managing projects
  - Time range best practices
  - Troubleshooting

- [ ] Update CLAUDE.md
  - Multi-project architecture
  - Specs organization per project

- [ ] Update README.md
  - Multi-project support feature
  - Link to guide

---

## Configuration Examples

### Example 1: Single Project (Simple)

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
      }
    }
  }
}
```

### Example 2: Multi-Project (Complex)

```json
{
  "sync": {
    "activeProfile": "specweave-dev",
    "profiles": {
      "specweave-dev": {
        "provider": "github",
        "displayName": "SpecWeave Development",
        "config": {"owner": "anton-abyzov", "repo": "specweave"},
        "timeRange": {"default": "1M", "max": "6M"},
        "projectContext": {
          "name": "SpecWeave",
          "description": "Spec-driven development framework",
          "keywords": ["specweave", "framework", "cli", "typescript"],
          "team": "SpecWeave Team"
        }
      },
      "client-a-product": {
        "provider": "jira",
        "displayName": "Client A - Product Work",
        "config": {
          "domain": "clienta.atlassian.net",
          "projectKey": "CLIENTA",
          "issueType": "Epic"
        },
        "timeRange": {"default": "2W", "max": "3M"},
        "projectContext": {
          "name": "Client A Product",
          "keywords": ["client-a", "mobile", "ios", "android"],
          "team": "Client A Team"
        }
      },
      "internal-infra": {
        "provider": "ado",
        "displayName": "Internal Infrastructure",
        "config": {
          "organization": "easychamp",
          "project": "Infrastructure",
          "workItemType": "Epic"
        },
        "timeRange": {"default": "1M", "max": "12M"},
        "projectContext": {
          "name": "Infrastructure",
          "keywords": ["infrastructure", "devops", "kubernetes", "terraform"],
          "team": "DevOps Team"
        }
      }
    },
    "projects": {
      "specweave": {
        "id": "specweave",
        "name": "SpecWeave",
        "description": "Spec-driven development framework",
        "keywords": ["specweave", "framework", "cli"],
        "defaultSyncProfile": "specweave-dev",
        "specsFolder": ".specweave/docs/internal/specs/specweave",
        "increments": [
          "0001-core-framework",
          "0002-core-enhancements",
          "0003-intelligent-model-selection"
        ]
      },
      "client-a": {
        "id": "client-a",
        "name": "Client A Product",
        "description": "Mobile app for Client A",
        "keywords": ["client-a", "mobile"],
        "defaultSyncProfile": "client-a-product",
        "specsFolder": ".specweave/docs/internal/specs/client-a",
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

---

## Next Steps

### Immediate (Phase 2)
1. Create JIRA Client V2 with profile support
2. Update ADO Client for profiles
3. Update plugin commands for profile selection

### Near-term (Phase 3)
4. Build interactive profile configuration UI
5. Build time range selector with estimates
6. Integrate smart project detection into increment planning

### Testing (Phase 4)
7. Write integration tests
8. Create migration script
9. Update documentation

---

## Open Questions

1. **Specs Organization**:
   - ✅ DECIDED: `.specweave/docs/internal/specs/{project-id}/spec-NNN-feature.md`
   - Rationale: Clear project boundaries, easy to manage

2. **Auto-Detection Threshold**:
   - ✅ DECIDED: Confidence > 0.7 = auto-select, 0.3-0.7 = suggest, <0.3 = ask
   - Rationale: High confidence for auto-selection, medium for suggestions

3. **Migration Path**:
   - ✅ DECIDED: Auto-migrate on first run (detect old format → convert → save)
   - Backup old config before migration

---

## Success Metrics

**Functional**:
- [ ] Users can configure 3+ profiles per provider
- [ ] Users can sync increments to different projects
- [ ] Zero rate limit errors in normal usage (95%+ success rate)

**Performance**:
- [ ] 1-month sync: <2 minutes (vs 25+ minutes for "ALL")
- [ ] Rate limit impact: <10% per sync
- [ ] 95%+ of syncs complete on first try

**UX**:
- [ ] <5 minutes to set up first profile
- [ ] <30 seconds to select profile for increment
- [ ] 100% of users understand time range implications (clear messaging)

---

## Files Created

### Core Framework
1. `src/core/types/sync-profile.ts` (432 lines)
2. `src/core/sync/profile-manager.ts` (463 lines)
3. `src/core/sync/rate-limiter.ts` (365 lines)
4. `src/core/sync/project-context.ts` (379 lines)

### Plugins
5. `plugins/specweave-github/lib/github-client-v2.ts` (466 lines)

### Documentation
6. `.specweave/docs/internal/architecture/adr/0016-multi-project-external-sync.md`
7. `.specweave/increments/0011-multi-project-sync/IMPLEMENTATION-PROGRESS.md` (this file)

### Schemas (Updated)
8. `src/core/schemas/specweave-config.schema.json` (+205 lines)

**Total**: ~2,310 lines of production code + documentation

---

## Timeline Estimate

- **Phase 1** (Core): ✅ Complete (~4 hours)
- **Phase 2** (Plugins): ~6 hours
- **Phase 3** (UX): ~8 hours
- **Phase 4** (Testing): ~6 hours

**Total**: ~24 hours (3 working days)

---

**Status**: Phase 1 complete, moving to Phase 2 (Plugin Updates)

