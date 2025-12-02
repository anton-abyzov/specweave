# Implementation Plan: ADO Init Flow V2

## Overview

Fix 5 critical bugs in the ADO init flow to make it production-ready for enterprise users.

## Architecture Decisions

### AD-01: Validate-Only Mode for Area Paths
**Decision**: Area path validator should ONLY check existence via GET, never create via POST
**Rationale**: Users select EXISTING area paths from ADO - we should verify, not create

### AD-02: Leaf-Only Storage for Area Paths
**Decision**: Store area path leaf names only (e.g., `Platform-Engineering`), not full paths
**Rationale**: Prevents double-prefix bugs and simplifies folder creation

### AD-03: Remove Teams from Init
**Decision**: Remove team selection entirely - 2-level hierarchy is Project -> Area Path
**Rationale**: Teams are organizational units, not folder structure. Simplifies UX.

### AD-04: Multi-Project Support
**Decision**: Allow selecting multiple ADO projects during init
**Rationale**: Enterprise users manage multiple projects from single SpecWeave instance

## Implementation Steps

### Phase 1: Fix Area Path Validation (T-001, T-002)
1. Change `ado-validator.ts` to use GET-only validation
2. Add `checkAreaPathExists()` method instead of `createAreaPath()`
3. Strip project prefix from stored area paths to get leaf names

### Phase 2: Simplify Init Flow (T-003)
1. Remove team selection from `promptAzureDevOpsCredentials()`
2. Remove team-related caching and config
3. Keep only Project + Area Path prompts

### Phase 3: Fix Import Organization (T-004, T-005)
1. Ensure ADO importer populates `adoAreaPath` on items
2. Change fallback from "parent" to "_default"
3. Verify items land in correct area path folders

### Phase 4: Multi-Project Selection (T-006)
1. After org input, fetch all accessible projects
2. Show multi-select for projects
3. Loop area path selection for each project
4. Store multiple profiles in config.json

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/validators/ado-validator.ts` | Add `checkAreaPathExists()`, remove create logic |
| `src/cli/helpers/issue-tracker/ado.ts` | Remove team selection, add multi-project |
| `src/cli/helpers/ado-area-selector.ts` | Store leaf names only |
| `src/cli/helpers/init/external-import.ts` | Change "parent" to "_default" |
| `plugins/specweave-ado/lib/ado-board-resolver.js` | Ensure `adoAreaPath` populated |

## Testing Strategy

1. Manual test with acme-org/Acme
2. Verify no area path creation attempts (only GET requests)
3. Verify items organized by area path folders
4. Verify multi-project selection works
