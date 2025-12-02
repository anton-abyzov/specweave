# Implementation Plan: ADO Init Validation Critical Fixes

## Overview

Fix 4 critical bugs in ADO init flow discovered during real-world testing.

---

## Phase 1: Fix Validator to Respect Permissions (Bug 1)

**Files**:
- `src/utils/validators/ado-validator.ts`
- `src/cli/helpers/issue-tracker/index.ts`

**Changes**:
1. Pass `syncPermissions` to `validateAzureDevOpsResources()`
2. In validator, check permissions BEFORE any create operations
3. If `canUpsertInternalItems=false`, skip `createAreaPath()` calls
4. Replace create with existence check (GET instead of POST)

---

## Phase 2: Fix Folder Naming (Bug 2)

**Files**:
- `src/cli/helpers/issue-tracker/ado.ts`
- `src/cli/helpers/init/external-import.ts`

**Changes**:
1. Remove `ADO-` prefix from folder creation
2. Use project name directly: `specs/{projectName}/`
3. Update import to match folder naming

---

## Phase 3: Fix Item Sorting by Area Path (Bug 3)

**Files**:
- `src/cli/helpers/init/external-import.ts`
- `src/importers/item-converter.ts`

**Changes**:
1. Ensure `groupItemsByExternalContainer` extracts area path correctly
2. Pass area path to `ItemConverter`
3. Create subfolders per area path during conversion

---

## Phase 4: Add Repo Cloning for Multi-Repo (Bug 4)

**Files**:
- `src/cli/helpers/init/repository-setup.ts`
- `src/cli/helpers/issue-tracker/ado.ts`

**Changes**:
1. After multi-repo selection, prompt for clone strategy
2. Add ADO Repos API call to list available repos
3. Pattern matching (e.g., `sw-*`) for repo selection
4. Save clone config to config.json

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing ADO users | Only change behavior when permissions are read-only |
| Folder naming change | Document migration path for existing users |
| Import slowdown | Area path grouping is already done, just needs subfolder creation |
