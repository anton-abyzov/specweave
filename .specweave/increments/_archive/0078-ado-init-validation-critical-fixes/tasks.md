# Tasks for 0078-ado-init-validation-critical-fixes

## T-001: Pass sync permissions to ADO validator
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
**File**: `src/cli/helpers/issue-tracker/index.ts`
**Change**: Added syncPermissions param to validateResources(), pass to both callers

---

## T-002: Make validator read-only when permissions disabled
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Status**: [x] completed
**File**: `src/utils/validators/ado-validator.ts`
**Change**: Added readOnly property, skip createAreaPath/createTeam when readOnly=true

---

## T-003: Log message when skipping creates
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**File**: `src/utils/validators/ado-validator.ts`
**Change**: Added "Skipping area path/team validation (read-only mode)" log messages

---

## T-004: Remove ADO- prefix from folder creation
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Removed ADO- prefix, now uses projectName directly

---

## T-005: Update import to match folder naming
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed
**File**: `src/living-docs/fs-id-allocator.ts`
**Change**: Added is2LevelFolder() helper to detect 2-level structure without ADO- prefix

---

## T-006: Fix area path extraction in grouping
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed
**File**: `src/importers/ado-importer.ts`
**Change**: Added adoProjectName and adoAreaPath to returned ExternalItem

---

## T-007: Create subfolders per area path
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed
**File**: `src/importers/item-converter.ts`
**Change**: Fixed getBaseDirectory() to not add ADO- prefix (use project name directly)

---

## T-008: Add repo cloning prompt for ADO multi-repo
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed
**File**: `src/cli/helpers/init/repository-setup.ts`
**Change**: Added adoClonePattern prompt when ADO + multi-repo selected, i18n for 9 languages
