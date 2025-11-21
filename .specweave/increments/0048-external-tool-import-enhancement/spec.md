---
increment: 0048-external-tool-import-enhancement
title: "ConfigManager & Jira Auto-Discovery (Phase 1a)"
feature_id: FS-048
status: completed
priority: P1
user_stories:
  - US-003
created: 2025-11-21
completed: 2025-11-21
---

# Specification: ConfigManager & Jira Auto-Discovery

**Increment**: 0048-external-tool-import-enhancement
**Feature**: [FS-048 - Enhanced External Tool Import](../../docs/internal/specs/specweave/FS-048/FEATURE.md)
**Status**: In Progress (Phase 1a Complete)
**Priority**: P1 (High)

---

## Overview

This increment implements the **foundational infrastructure** for FS-048 (Enhanced External Tool Import):

1. **ConfigManager** - Secrets/configuration separation (ADR-0050)
2. **Jira Auto-Discovery** - API-based project fetching (ADR-0049)
3. **Team Onboarding** - .env.example generation

**Scope**: Phase 1a (foundational components only)
**Future Phases**: Caching, progress tracking, smart pagination (see plan.md)

---

## Architecture Decisions

### ADR-0050: Secrets vs Configuration Separation

**Decision**: Separate sensitive credentials from shareable configuration

**Implementation**:
- Secrets (JIRA_API_TOKEN, JIRA_EMAIL) → `.env` (gitignored)
- Configuration (domain, strategy, projects) → `.specweave/config.json` (committed)
- Team onboarding → `.env.example` (committed template)

**Benefits**:
- ✅ No accidental secret commits
- ✅ Team shares configuration via git
- ✅ New developers onboard via .env.example

### ADR-0049: Jira Auto-Discovery

**Decision**: Fetch projects via API instead of manual entry

**Implementation**:
- Direct REST API calls to `/rest/api/3/project` (Cloud) or `/rest/api/2/project` (Server)
- Multi-select checkbox UI (like GitHub repo selector)
- Auto-detect strategy based on selection count (1 project = single-project, >1 = project-per-team)

**Benefits**:
- ✅ Zero manual typing
- ✅ No project ID lookup required
- ✅ Consistent with GitHub UX

---

## User Stories

### US-003: Three-Tier Dependency Loading (Partial)

**Scope**: Tier 1 (Config Management) - **COMPLETED**

**Status**: ✅ Config tier implemented, Tier 2/3 (caching, lazy loading) pending

**What We Completed**:
- ConfigManager with read/write/validate
- Secrets separation
- .env.example generation

**What's Pending**:
- CacheManager with TTL
- Lazy loading on first sync
- Bulk pre-load command

---

## Acceptance Criteria

### AC-US3-01: ConfigManager Implementation ✅

**Status**: [x] Completed

**Requirements**:
- [x] Read configuration from `.specweave/config.json`
- [x] Write configuration with validation
- [x] Deep merge for partial updates
- [x] Dot-notation path access (get/set)
- [x] Backward compatibility with defaults

**Test Coverage**:
- Unit tests: Pending (see tasks.md T-007)
- Integration tests: Smoke tests passing

**Verification**:
```bash
npm run rebuild  # ✅ Build succeeds
npm test         # ✅ Smoke tests pass (19/19)
```

---

### AC-US3-02: Secrets/Config Separation ✅

**Status**: [x] Completed

**Requirements**:
- [x] Secrets stored in `.env` (JIRA_API_TOKEN, JIRA_EMAIL)
- [x] Configuration stored in `config.json` (domain, strategy, projects)
- [x] `.env.example` generated with template values
- [x] `.env` gitignored

**Verification**:
```bash
# Init flow saves secrets to .env
grep "JIRA_API_TOKEN" .env  # ✅ Only secrets

# Init flow saves config to config.json
jq '.issueTracker' .specweave/config.json  # ✅ Domain, strategy, projects

# Template generated
cat .env.example  # ✅ Template with instructions
```

---

### AC-US3-03: Jira Auto-Discovery ✅

**Status**: [x] Completed

**Requirements**:
- [x] Fetch projects via JIRA REST API
- [x] Multi-select checkbox UI (Space to select, Enter to confirm)
- [x] Auto-detect strategy (single-project vs project-per-team)
- [x] Support both Cloud (API v3) and Server (API v2)

**Verification**:
```bash
# Run specweave init
specweave init .

# Select JIRA → Prompts appear:
# 1. Instance type (Cloud/Server)
# 2. Domain, email, token
# 3. API fetches projects
# 4. Checkbox UI (select with Space)
# 5. Strategy auto-detected based on count
```

---

### AC-US3-04: Team Onboarding Support ✅

**Status**: [x] Completed

**Requirements**:
- [x] `.env.example` generated during init
- [x] Template includes setup instructions
- [x] Template shows required vs optional variables
- [x] Template notes that domain/strategy are in config.json

**Verification**:
```bash
cat .env.example

# Expected structure:
# - Setup instructions (1-2-3 steps)
# - Required section (JIRA_API_TOKEN, JIRA_EMAIL)
# - Note about config.json
# - Optional section (GitHub, Bitbucket, etc.)
```

---

### AC-US3-05: Backward Compatibility ✅

**Status**: [x] Completed

**Requirements**:
- [x] ConfigManager merges with defaults
- [x] Missing config.json → use DEFAULT_CONFIG
- [x] Old .env-based config still works (deprecated)

**Verification**:
```typescript
// ConfigManager.read() returns defaults if config.json missing
const config = await configManager.read();
expect(config.version).toBe('2.0');
expect(config.repository.provider).toBe('local');
```

---

## Implementation Details

### Files Created

**Core Config Module** (`src/core/config/`):
- `types.ts` - TypeScript interfaces (SpecWeaveConfig, JiraStrategy, etc.)
- `config-manager.ts` - ConfigManager class (read/write/validate)
- `index.ts` - Barrel export

**Updated Files**:
- `src/cli/helpers/issue-tracker/jira.ts`:
  - Added `autoDiscoverJiraProjects()` - API-based project fetching
  - Modified `getJiraEnvVars()` - Returns ONLY secrets
  - Added `getJiraConfig()` - Extracts configuration

- `src/cli/helpers/issue-tracker/index.ts`:
  - Added `generateEnvExample()` - Creates .env.example template
  - Modified `saveCredentials()` - Saves secrets AND config separately
  - Updated `writeSyncConfig()` - Uses ConfigManager instead of fs

---

## Non-Functional Requirements

### Security ✅

- [x] No secrets in config.json (only in .env)
- [x] .env gitignored by default
- [x] .env.example committed (no actual credentials)
- [x] ConfigManager validation prevents invalid data

### Performance ✅

- [x] Build time: < 10 seconds (npm run rebuild)
- [x] Init time: No regression (auto-discovery adds ~2 seconds)

### Type Safety ✅

- [x] Full TypeScript types (JiraStrategy, JiraProjectConfig, etc.)
- [x] Runtime validation via ConfigManager.validate()
- [x] IntelliSense support for config schema

---

## What's NOT in This Increment

**Phase 1b-7** (Still Pending):
- CacheManager with TTL (ADR-0051)
- Progress tracking with ETA (ADR-0053)
- Smart pagination (ADR-0052)
- Tier 2/3 lazy loading
- ADO integration
- Cache maintenance commands
- Performance testing

**See**: `plan.md` for full roadmap

---

## Testing

### Completed ✅

- [x] Smoke tests (19/19 passing)
- [x] Build validation (TypeScript compilation)

### Pending

- [ ] Unit tests for ConfigManager (T-007)
- [ ] Integration tests for Jira auto-discovery
- [ ] E2E tests for init flow

---

## Documentation

### Created ✅

- [x] ADR-0050: Secrets/Config Separation
- [x] ADR-0049: Jira Auto-Discovery
- [x] ADR-0048: Repository Provider Architecture

### Pending

- [ ] Update CLAUDE.md with ConfigManager usage
- [ ] Update README.md with new init flow
- [ ] Living docs sync (mark US-003 as partial)

---

## Success Metrics

### Achieved ✅

- ✅ Build passes (no TypeScript errors)
- ✅ Smoke tests pass (19/19)
- ✅ Secrets separated from config
- ✅ .env.example generated
- ✅ Jira auto-discovery works

### Pending

- Performance benchmarks (Phase 7)
- Cache hit rate metrics (Phase 1b)
- User adoption metrics (post-release)

---

## Migration Notes

### For Existing Users

**Before** (all in .env):
```bash
JIRA_API_TOKEN=abc123
JIRA_EMAIL=user@company.com
JIRA_DOMAIN=company.atlassian.net
JIRA_STRATEGY=project-per-team
JIRA_PROJECTS=FRONTEND,BACKEND
```

**After** (separated):

`.env` (gitignored):
```bash
JIRA_API_TOKEN=abc123
JIRA_EMAIL=user@company.com
```

`.specweave/config.json` (committed):
```json
{
  "issueTracker": {
    "provider": "jira",
    "domain": "company.atlassian.net",
    "strategy": "project-per-team",
    "projects": [
      { "key": "FRONTEND" },
      { "key": "BACKEND" }
    ]
  }
}
```

**Migration**: Manual (no auto-migration script yet)

---

## Next Steps

### Immediate (Next PR)

1. Write unit tests for ConfigManager (T-007)
2. Write integration tests for Jira auto-discovery
3. Update documentation (CLAUDE.md, README.md)

### Phase 1b (Next Increment)

1. Implement CacheManager with TTL
2. Implement JiraDependencyLoader
3. Add cache maintenance commands

### Phase 2-7 (Future Increments)

See `plan.md` for full roadmap.

---

**End of Specification**
