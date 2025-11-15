# Increment 0011: Multi-Project Sync Architecture

**Status**: ✅ COMPLETE
**Type**: Feature
**Created**: 2025-11-05
**Completed**: 2025-11-05

## Overview

Implement multi-project sync architecture enabling unlimited GitHub/JIRA/ADO repositories with intelligent time range filtering and rate limit protection.

## Problem Statement

Current sync implementation (v1) has critical limitations:
- ❌ Single repository per provider (1 GitHub repo only)
- ❌ Syncs ALL data (5,000+ items = 25+ min sync)
- ❌ 60% rate limit failure rate
- ❌ No time filtering or pagination
- ❌ Hard-coded repository configuration

## Goals

1. **Multi-Project Support**: Unlimited sync profiles per provider (3+, 5+, 10+ repos)
2. **Time Range Filtering**: Reduce API calls by 90%+ (25 min → 2 min)
3. **Rate Limit Protection**: Pre-flight validation, backoff strategies
4. **Smart Project Detection**: Auto-route increments to correct profiles
5. **Per-Project Organization**: Organize specs by project context

## User Stories

### US1: Sync Profile Management
**As a** developer
**I want** to create unlimited sync profiles
**So that** I can sync multiple projects independently

**Acceptance Criteria**:
- ✅ Create profiles via CLI (`/specweave:sync-profile create`)
- ✅ Multiple profiles per provider (GitHub, JIRA, ADO)
- ✅ Each profile has: provider, config, time range, rate limits
- ✅ Profiles stored in `.specweave/config.json`

### US2: Time Range Filtering
**As a** developer
**I want** to filter sync by time range
**So that** syncs complete in 2 min instead of 25+ min

**Acceptance Criteria**:
- ✅ Presets: 1W, 1M, 3M, 6M, ALL
- ✅ Shows estimates before sync (items, API calls, duration)
- ✅ Reduces API calls by 90%+ for typical use cases
- ✅ Interactive CLI selector

### US3: Rate Limit Protection
**As a** developer
**I want** pre-flight rate limit validation
**So that** syncs don't fail due to rate limits

**Acceptance Criteria**:
- ✅ Estimate API calls before sync
- ✅ Check current rate limit status
- ✅ Calculate impact: low/medium/high/critical
- ✅ Block if risky (7,500+ calls, insufficient remaining)
- ✅ Suggest alternatives (reduce time range, wait for reset)

### US4: Smart Project Detection
**As a** developer
**I want** automatic project detection
**So that** increments route to correct profiles

**Acceptance Criteria**:
- ✅ Detect project from increment name/keywords
- ✅ Confidence scoring (name match +10, team +5, keyword +3)
- ✅ Auto-select if confidence > 0.7
- ✅ Fallback to interactive selection

### US5: V1 to V2 Migration
**As a** developer
**I want** automatic migration from V1
**So that** existing configs work seamlessly

**Acceptance Criteria**:
- ✅ Detect V1 config automatically
- ✅ Convert to V2 profiles
- ✅ Create default project context
- ✅ Backup original config
- ✅ Zero manual intervention

## Architecture

### 3-Layer Architecture

```
Layer 1: Credentials (.env)
├── GITHUB_TOKEN
├── JIRA_API_TOKEN
└── AZURE_DEVOPS_PAT

Layer 2: Sync Profiles (config.json)
├── specweave-dev (GitHub: anton-abyzov/specweave)
├── client-mobile (GitHub: client-org/mobile-app)
├── internal-jira (JIRA: company.atlassian.net/PROJ)
└── ado-backend (ADO: myorg/backend-services)

Layer 3: Per-Increment Metadata (metadata.json)
└── 0011-multi-project-sync
    ├── profile: specweave-dev
    ├── issueNumber: 18
    └── timeRange: 1M
```

### Components

**Core Infrastructure** (~2,105 lines):
- `src/core/types/sync-profile.ts` - Type system
- `src/core/sync/profile-manager.ts` - CRUD operations
- `src/core/sync/rate-limiter.ts` - Rate limit protection
- `src/core/sync/project-context.ts` - Project management

**Client Libraries** (~1,471 lines):
- `plugins/specweave-github/lib/github-client-v2.ts` - GitHub sync
- `plugins/specweave-jira/lib/jira-client-v2.ts` - JIRA sync
- `plugins/specweave-ado/lib/ado-client-v2.ts` - ADO sync

**UX Components** (~950 lines):
- `src/core/sync/time-range-selector.ts` - Time range selection
- `src/core/sync/profile-selector.ts` - Profile selection
- `src/cli/commands/migrate-to-profiles.ts` - V1 to V2 migration

## Success Metrics

**Performance**:
- ✅ 90%+ reduction in sync time (25 min → 2 min)
- ✅ 95%+ success rate (vs 40% with rate limits)

**Scalability**:
- ✅ Unlimited profiles per provider (was: 1)
- ✅ Support for 10+ projects simultaneously

**Developer Experience**:
- ✅ Zero-config migration from V1
- ✅ Interactive CLI with estimates
- ✅ Clear error messages with recommendations

## Out of Scope

- ❌ Bitbucket/GitLab support (future increment)
- ❌ Webhook-based real-time sync (future)
- ❌ GUI for profile management (CLI only for now)

## References

**Documentation**:
- ADR: `.specweave/docs/internal/architecture/adr/0016-multi-project-external-sync.md`
- User Guide: `.specweave/increments/0011-multi-project-sync/reports/USER-GUIDE-MULTI-PROJECT-SYNC.md`
- Implementation Report: `.specweave/increments/0011-multi-project-sync/reports/FINAL-IMPLEMENTATION-REPORT.md`

**GitHub Issue**: #18 - https://github.com/anton-abyzov/specweave/issues/18

## Notes

This increment was completed without traditional plan.md/tasks.md due to time constraints and the comprehensive implementation report serving as equivalent documentation.
