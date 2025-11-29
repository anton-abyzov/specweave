# 0071: Smart Azure DevOps Init Flow

## Overview

Fix and enhance the Azure DevOps (ADO) initialization flow in `specweave init` to be "ultra smart":
1. Ask PAT first (before teams/areas) to enable API calls
2. Auto-fetch teams and area paths from ADO API
3. Let user SELECT from fetched options (multi-select)
4. Fix config saving bugs (organization field empty)
5. Fix external import to properly detect ADO config

## Problem Statement

Current ADO init flow has critical issues:

1. **Wrong prompt order**: Asks for org → project → teams → PAT
   - Can't auto-fetch teams without PAT!
   - User has to manually type team names

2. **Organization not saved**: Bug in `writeSyncConfig()` line 674
   - Code: `organization = adoCreds.organization || ''`
   - Credentials return `org`, not `organization`
   - Results in empty organization in config.json

3. **Area paths ignored**: ADO uses Area Paths for work organization
   - More granular than teams (hierarchical: `Project\Team\SubArea`)
   - Functions exist but not called during init

4. **Import fails**: "No importers configured" error
   - Because organization is empty, `detectAllConfigs` returns null
   - Import coordinator can't initialize ADOImporter

## User Stories

### US-001: Smart PAT-First Authentication

**As a** developer setting up SpecWeave with Azure DevOps
**I want** to enter my PAT early in the flow
**So that** SpecWeave can auto-fetch my teams and area paths

**Acceptance Criteria:**
- [x] **AC-US1-01**: Ask org, project, then PAT (before teams)
- [x] **AC-US1-02**: Validate PAT immediately after entry
- [x] **AC-US1-03**: Show helpful error if PAT validation fails
- [x] **AC-US1-04**: Cache org/project for re-init (existing behavior)

### US-002: Auto-Fetch Teams and Area Paths

**As a** developer
**I want** SpecWeave to fetch my ADO teams and area paths automatically
**So that** I don't have to manually type team names

**Acceptance Criteria:**
- [x] **AC-US2-01**: After PAT validation, fetch teams using `fetchTeamsForProject()`
- [x] **AC-US2-02**: Fetch area paths using `fetchAreaPathsForProject()`
- [x] **AC-US2-03**: Display fetched teams/areas in multi-select prompt
- [x] **AC-US2-04**: Allow selecting multiple area paths (primary use case)
- [x] **AC-US2-05**: Fallback to manual input if API fails

### US-003: Smart Area Path Selection

**As a** developer with multiple area paths
**I want** to select which area paths to sync
**So that** only relevant work items are imported

**Acceptance Criteria:**
- [x] **AC-US3-01**: Show hierarchical area paths (e.g., `Acme\Digital-Service-Operations`)
- [x] **AC-US3-02**: Default to root area path if none selected
- [x] **AC-US3-03**: Store selected area paths in config.json
- [x] **AC-US3-04**: Support area path filtering in import queries

### US-004: Fix Config Saving Bugs

**As a** developer
**I want** my ADO configuration saved correctly
**So that** import and sync work properly

**Acceptance Criteria:**
- [x] **AC-US4-01**: Fix `writeSyncConfig()` to use `adoCreds.org` not `adoCreds.organization`
- [x] **AC-US4-02**: Save selected teams in config.json
- [x] **AC-US4-03**: Save selected area paths in config.json
- [x] **AC-US4-04**: Build orgUrl correctly: `https://dev.azure.com/{org}`

### US-005: Fix External Import Detection

**As a** developer
**I want** external import to detect my ADO configuration
**So that** work items are imported during init

**Acceptance Criteria:**
- [x] **AC-US5-01**: `detectAllConfigs()` properly detects ADO from config.json
- [x] **AC-US5-02**: Import coordinator builds valid ADO config
- [x] **AC-US5-03**: ADOImporter initializes with correct orgUrl and PAT
- [x] **AC-US5-04**: Import successfully fetches work items from selected area paths

## Technical Design

### New Prompt Flow

```
1. Azure DevOps organization name: acme-org
2. Project name: Acme
3. Paste your Personal Access Token: ****
4. Testing connection... ✓ Connected to Acme

🔍 Fetching teams and area paths...

5. Select area paths to sync (use space to select):
   ◉ Acme\Digital-Service-Operations
   ◯ Acme\Dev-Sec-Ops
   ◯ Acme\Platform-Engineering
   ◯ Acme\AI-Platform
   ◯ Acme\Clinical-Data-Platform

6. Select teams (optional):
   ◯ Core-Operations
   ◯ Platform-Team
   ◯ [Skip - use area paths only]

✓ Configuration complete!
```

### Config.json Structure

```json
{
  "sync": {
    "profiles": {
      "ado-default": {
        "provider": "ado",
        "config": {
          "organization": "acme-org",
          "project": "Acme",
          "areaPaths": [
            "Acme\\Digital-Service-Operations"
          ],
          "teams": ["Core-Operations"]
        }
      }
    }
  }
}
```

### Files to Modify

1. `src/cli/helpers/issue-tracker/ado.ts` - Smart prompt flow
2. `src/cli/helpers/issue-tracker/index.ts` - Fix writeSyncConfig bug (line 674)
3. `src/cli/helpers/init/config-detection.ts` - Improve ADO detection
4. `src/cli/helpers/init/external-import.ts` - Fix ADO config building

## Out of Scope

- ADO iteration paths (sprints) - future enhancement
- Board-based organization (ADO boards are team-specific)
- Multi-project ADO setup (covered by existing init-multiproject)

## Dependencies

- `plugins/specweave-ado/lib/ado-board-resolver.ts` - Existing API functions
- `@inquirer/prompts` - Multi-select checkbox prompt
