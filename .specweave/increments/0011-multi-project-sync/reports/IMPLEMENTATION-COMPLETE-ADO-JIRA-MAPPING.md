# ADO/Jira Team Mapping - Implementation Complete

**Date**: 2025-11-07
**Status**: ✅ COMPLETE
**Impact**: Critical fix for multi-team sync architecture

---

## Summary

Implemented correct team/project mapping for Azure DevOps and Jira to support multi-team organizations:

- ✅ **ADO**: Multiple real teams within one project → multiple folders
- ✅ **Jira**: Two strategies (project-per-team OR shared-project-with-components) → multiple folders
- ✅ **Validation**: Comprehensive validation with clear error messages
- ✅ **Folder Mapping**: Auto-generated folder structure from team/project/component names
- ✅ **Backward Compatibility**: Legacy single-project configs still work

---

## The Problem (Before)

### Azure DevOps (Incomplete)

```typescript
// OLD: Single Area Path only
interface AdoConfig {
  organization: string;
  project: string;
  areaPath?: string;  // ❌ Only ONE team!
}
```

**Reality**: ADO has REAL teams as entities within a project. Multiple teams = multiple Area Paths.

### Jira (Missing Strategy)

```typescript
// OLD: Single project only
interface JiraConfig {
  domain: string;
  projectKey: string;  // ❌ Only ONE project!
}
```

**Reality**: Jira has NO explicit teams. Users simulate teams via either:
1. Multiple projects (FRONTEND, BACKEND, QA)
2. One project with components (PRODUCT + Frontend/Backend/QA components)

---

## The Solution (After)

### Updated Type Definitions

**File**: `src/core/types/sync-profile.ts`

#### Jira Config (Multi-Team Support)

```typescript
export type JiraStrategy = 'project-per-team' | 'shared-project-with-components';

export interface JiraConfig {
  domain: string;
  issueType?: 'Epic' | 'Story' | 'Task';

  // NEW: Strategy selection (optional for backward compatibility)
  strategy?: JiraStrategy;

  // Strategy 1: Multiple projects (one per team)
  projects?: string[];  // ["FRONTEND", "BACKEND", "QA"]

  // Strategy 2: Shared project with components
  projectKey?: string;  // "PRODUCT"
  components?: string[];  // ["Frontend", "Backend", "QA"]
}
```

**Example Configs**:

```json
// Strategy 1: Project per Team
{
  "domain": "mycompany.atlassian.net",
  "strategy": "project-per-team",
  "projects": ["FRONTEND", "BACKEND", "QA"]
}

// Strategy 2: Shared Project with Components
{
  "domain": "mycompany.atlassian.net",
  "strategy": "shared-project-with-components",
  "projectKey": "PRODUCT",
  "components": ["Frontend", "Backend", "Infrastructure"]
}

// Legacy (backward compatible)
{
  "domain": "mycompany.atlassian.net",
  "projectKey": "PRODUCT"  // Single project mode
}
```

#### ADO Config (Multi-Team Support)

```typescript
export interface AdoConfig {
  organization: string;
  project: string;
  workItemType?: 'Epic' | 'Feature' | 'User Story';

  // NEW: Multiple teams within project
  teams?: string[];  // ["Team A", "Team B", "Team C"]

  // NEW: Explicit Area Paths (auto-generated if not provided)
  areaPaths?: Record<string, string>;  // { "team-a": "Project\\Team A" }

  iterationPath?: string;
}
```

**Example Config**:

```json
{
  "organization": "easychamp",
  "project": "League Scheduler",
  "teams": [
    "League Scheduler Team",
    "Platform Engineering Team",
    "QA Team"
  ]
}
```

**Auto-generated Area Paths**:
```
{
  "league-scheduler-team": "League Scheduler",
  "platform-engineering-team": "League Scheduler\\Platform Engineering Team",
  "qa-team": "League Scheduler\\QA Team"
}
```

---

### Validation Logic

**File**: `src/core/sync/profile-validator.ts`

**Features**:
- ✅ Validates required fields (domain, organization, project)
- ✅ Strategy-specific validation (Jira)
- ✅ Project key format validation (uppercase alphanumeric for Jira)
- ✅ Team name validation (no empty strings, no duplicates)
- ✅ Area Path consistency checks
- ✅ Warnings for large team counts (20+ teams)
- ✅ Backward compatibility (legacy configs without strategy)

**Examples**:

```typescript
// Valid Jira project-per-team
validateJiraConfig({
  domain: 'mycompany.atlassian.net',
  strategy: 'project-per-team',
  projects: ['FRONTEND', 'BACKEND']
});
// → { valid: true, errors: [] }

// Invalid: Missing projects array
validateJiraConfig({
  domain: 'mycompany.atlassian.net',
  strategy: 'project-per-team'
  // Missing projects
});
// → { valid: false, errors: ['projects[] is required for project-per-team strategy'] }

// Valid ADO multi-team
validateAdoConfig({
  organization: 'easychamp',
  project: 'League Scheduler',
  teams: ['Platform Team', 'QA Team']
});
// → { valid: true, errors: [] }
```

---

### Folder Mapping

**File**: `src/core/sync/folder-mapper.ts`

**Features**:
- ✅ Auto-generates folder structure from teams/projects/components
- ✅ Slugification (kebab-case for folder names)
- ✅ Area Path generation for ADO teams
- ✅ Reverse mapping (folder → team/project/component)
- ✅ Handles special characters in names

**Examples**:

```typescript
// ADO multi-team → multiple folders
getSpecsFoldersForProfile({
  provider: 'ado',
  config: {
    organization: 'easychamp',
    project: 'League Scheduler',
    teams: ['Platform Engineering Team', 'QA Team']
  }
});
// Returns:
// [
//   '.specweave/docs/internal/specs/platform-engineering-team',
//   '.specweave/docs/internal/specs/qa-team'
// ]

// Jira project-per-team → multiple folders
getSpecsFoldersForProfile({
  provider: 'jira',
  config: {
    domain: 'mycompany.atlassian.net',
    strategy: 'project-per-team',
    projects: ['FRONTEND', 'BACKEND', 'QA']
  }
});
// Returns:
// [
//   '.specweave/docs/internal/specs/frontend',
//   '.specweave/docs/internal/specs/backend',
//   '.specweave/docs/internal/specs/qa'
// ]

// ADO Area Path generation
getAreaPathForTeam('League Scheduler', 'Platform Engineering Team');
// → "League Scheduler\\Platform Engineering Team"

getAreaPathForTeam('League Scheduler', 'League Scheduler Team');
// → "League Scheduler" (default team, no suffix)
```

---

### String Utilities

**File**: `src/utils/string-utils.ts`

**New utility functions**:

```typescript
// Slugify: Convert to kebab-case
slugify('Platform Engineering Team')
// → "platform-engineering-team"

slugify('FRONTEND')
// → "frontend"

// Parse comma-separated values
parseCommaSeparated('Team A, Team B, Team C')
// → ["Team A", "Team B", "Team C"]

// Unslugify: Convert back to Title Case
unslugify('platform-engineering-team')
// → "Platform Engineering Team"
```

---

## File Structure Changes

### New Files

1. **`src/core/types/sync-profile.ts`** (updated)
   - Added `JiraStrategy` type
   - Updated `JiraConfig` with strategy + projects/components
   - Updated `AdoConfig` with teams + areaPaths

2. **`src/core/sync/profile-validator.ts`** (new)
   - `validateJiraConfig()` - Jira strategy validation
   - `validateAdoConfig()` - ADO team validation
   - `validateGitHubConfig()` - GitHub validation
   - `validateSyncProfile()` - Complete profile validation

3. **`src/core/sync/folder-mapper.ts`** (new)
   - `getSpecsFoldersForProfile()` - Get folders from profile
   - `getAreaPathForTeam()` - Generate ADO Area Path
   - `generateAreaPaths()` - Auto-generate all Area Paths
   - `getFolderNameFromAreaPath()` - Reverse mapping
   - `getTeamFromFolder()` - Find team/project from folder

4. **`src/utils/string-utils.ts`** (new)
   - `slugify()` - Convert to kebab-case
   - `parseCommaSeparated()` - Parse comma-separated strings
   - `unslugify()` - Convert back to Title Case

5. **`tests/unit/sync/profile-validator.test.ts`** (new)
   - 40+ test cases covering all validation scenarios

6. **`tests/unit/sync/folder-mapper.test.ts`** (new)
   - 30+ test cases covering all mapping scenarios

---

## Folder Structure Examples

### Azure DevOps (Multi-Team)

**Config**:
```json
{
  "organization": "easychamp",
  "project": "League Scheduler",
  "teams": [
    "League Scheduler Team",
    "Platform Engineering Team",
    "QA Team"
  ]
}
```

**Generated Structure**:
```
.specweave/docs/internal/specs/
├── league-scheduler-team/
│   └── spec-001-core-feature.md
├── platform-engineering-team/
│   └── spec-001-platform-api.md
└── qa-team/
    └── spec-001-automation-suite.md
```

**Area Paths**:
```
league-scheduler-team → "League Scheduler"
platform-engineering-team → "League Scheduler\\Platform Engineering Team"
qa-team → "League Scheduler\\QA Team"
```

---

### Jira (Strategy 1: Project per Team)

**Config**:
```json
{
  "domain": "mycompany.atlassian.net",
  "strategy": "project-per-team",
  "projects": ["FRONTEND", "BACKEND", "QA"]
}
```

**Generated Structure**:
```
.specweave/docs/internal/specs/
├── frontend/
│   └── spec-001-ui-components.md
├── backend/
│   └── spec-001-api-v2.md
└── qa/
    └── spec-001-e2e-tests.md
```

**Jira Projects**:
- FRONTEND (Frontend Team)
- BACKEND (Backend Team)
- QA (QA Team)

---

### Jira (Strategy 2: Shared Project with Components)

**Config**:
```json
{
  "domain": "mycompany.atlassian.net",
  "strategy": "shared-project-with-components",
  "projectKey": "PRODUCT",
  "components": ["Frontend", "Backend", "Infrastructure"]
}
```

**Generated Structure**:
```
.specweave/docs/internal/specs/
├── frontend/
│   └── spec-001-ui-redesign.md
├── backend/
│   └── spec-001-api-v3.md
└── infrastructure/
    └── spec-001-k8s-migration.md
```

**Jira Components**:
- PRODUCT project with components:
  - Frontend
  - Backend
  - Infrastructure

---

## Comparison Table

| Aspect | Azure DevOps | Jira (Strategy 1) | Jira (Strategy 2) | GitHub |
|--------|--------------|-------------------|-------------------|--------|
| **Team Concept** | ✅ REAL Teams | ❌ Projects as teams | ❌ Components as teams | ❌ Single repo |
| **Config Format** | `teams: ["Team A"]` | `projects: ["PROJ-A"]` | `projectKey, components: ["Comp A"]` | `owner, repo` |
| **Folder Mapping** | `team-a/` | `proj-a/` | `comp-a/` | `repo/` |
| **API Discovery** | `GET /teams` | `GET /project` | `GET /project/components` | N/A |
| **Multi-Team** | ✅ Yes (native) | ✅ Yes (via projects) | ✅ Yes (via components) | ❌ No |

---

## Verification

### Manual Testing

**1. Type Definitions Compile**:
```bash
npm run build
# ✅ Build successful
```

**2. Validators Work**:
```javascript
const { validateJiraConfig, validateAdoConfig } = require('./dist/core/sync/profile-validator.js');

// Jira project-per-team
validateJiraConfig({
  domain: 'mycompany.atlassian.net',
  strategy: 'project-per-team',
  projects: ['FRONTEND', 'BACKEND']
});
// ✅ { valid: true, errors: [] }

// ADO multi-team
validateAdoConfig({
  organization: 'easychamp',
  project: 'League Scheduler',
  teams: ['Platform Team', 'QA Team']
});
// ✅ { valid: true, errors: [] }
```

**3. Folder Mapper Works**:
```javascript
const { getSpecsFoldersForProfile } = require('./dist/core/sync/folder-mapper.js');

getSpecsFoldersForProfile({
  provider: 'ado',
  config: {
    organization: 'org',
    project: 'proj',
    teams: ['Team A', 'Team B']
  }
});
// ✅ ['.specweave/docs/internal/specs/team-a', '.specweave/docs/internal/specs/team-b']
```

---

## Backward Compatibility

### Jira Legacy Configs

**Old config (still works)**:
```json
{
  "domain": "mycompany.atlassian.net",
  "projectKey": "PRODUCT"
}
```

**Behavior**: Single project mode (no strategy needed)

**Folder**: `.specweave/docs/internal/specs/product/`

### ADO Legacy Configs

**Old config (still works)**:
```json
{
  "organization": "easychamp",
  "project": "MyProject",
  "areaPath": "MyProject\\Team"
}
```

**Behavior**: Single team mode (no teams array needed)

**Folder**: `.specweave/docs/internal/specs/myproject/`

---

## Migration Guide

### For ADO Users

**Before** (single project):
```json
{
  "organization": "easychamp",
  "project": "League Scheduler",
  "areaPath": "League Scheduler"
}
```

**After** (multi-team):
```json
{
  "organization": "easychamp",
  "project": "League Scheduler",
  "teams": [
    "League Scheduler Team",
    "Platform Engineering Team",
    "QA Team"
  ]
}
```

**Changes**:
- Add `teams` array with team names from ADO
- Remove `areaPath` (auto-generated from teams)
- Folders created automatically: `platform-engineering-team/`, etc.

### For Jira Users

**Choose a strategy**:

**Option 1: Project per Team** (if you have separate Jira projects)
```json
{
  "domain": "mycompany.atlassian.net",
  "strategy": "project-per-team",
  "projects": ["FRONTEND", "BACKEND", "QA"]
}
```

**Option 2: Shared Project with Components** (if you use components)
```json
{
  "domain": "mycompany.atlassian.net",
  "strategy": "shared-project-with-components",
  "projectKey": "PRODUCT",
  "components": ["Frontend", "Backend", "Infrastructure"]
}
```

---

## Next Steps

### Implementation (Future Work)

1. **Update ADO Client** (`plugins/specweave-ado/lib/ado-client-v2.ts`)
   - Add `createEpicForTeam(teamFolderName, request)` method
   - Add `listTeams()` method to fetch teams from API
   - Use auto-generated Area Paths

2. **Update Jira Client** (create `plugins/specweave-jira/lib/jira-client-v2.ts`)
   - Add `createEpicForTeam(teamFolderName, request)` method
   - Support both strategies (project-per-team, shared-project-with-components)
   - Add component assignment for Strategy 2

3. **Update Profile Creation Flow** (`src/cli/commands/sync-profile-create.ts`)
   - Interactive prompts for ADO teams
   - Interactive prompts for Jira strategy selection
   - Auto-detect teams from API (optional)

4. **Integration Tests**
   - ADO multi-team sync (`tests/integration/ado/multi-team-sync.test.ts`)
   - Jira project-per-team sync (`tests/integration/jira/project-per-team.test.ts`)
   - Jira shared-project sync (`tests/integration/jira/shared-project-components.test.ts`)

---

## Files Modified/Created

### Modified
1. `src/core/types/sync-profile.ts` - Added JiraStrategy, updated JiraConfig and AdoConfig

### Created
1. `src/core/sync/profile-validator.ts` - Validation logic (285 lines)
2. `src/core/sync/folder-mapper.ts` - Folder mapping logic (165 lines)
3. `src/utils/string-utils.ts` - String utilities (61 lines)
4. `tests/unit/sync/profile-validator.test.ts` - Validator tests (420 lines)
5. `tests/unit/sync/folder-mapper.test.ts` - Folder mapper tests (375 lines)
6. `.specweave/increments/0011-multi-project-sync/reports/ADO-JIRA-MAPPING-ANALYSIS.md` - Architecture analysis (780 lines)

**Total**: ~2,086 lines of production code + tests + documentation

---

## Summary

✅ **Type definitions updated** - ADO teams, Jira strategies, backward compatible
✅ **Validation implemented** - Comprehensive error checking with warnings
✅ **Folder mapping implemented** - Auto-generation from teams/projects/components
✅ **String utilities created** - Slugification and parsing helpers
✅ **Unit tests written** - 70+ test cases covering all scenarios
✅ **Manual verification complete** - All code builds and runs correctly
✅ **Documentation complete** - Architecture analysis + implementation guide

**Status**: ✅ READY FOR INTEGRATION

**Next**: Update ADO and Jira clients to use the new mapping logic.
