# Tasks for 0071-smart-ado-init

## T-001: Fix writeSyncConfig org bug
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [ ] pending
**File**: `src/cli/helpers/issue-tracker/index.ts`
**Change**: Line 674: `organization = adoCreds.org` (not `adoCreds.organization`)

---

## T-002: Reorder ADO prompt flow - PAT before teams
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [ ] pending
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Move PAT prompt after org/project, before team selection

---

## T-003: Add auto-fetch teams after PAT validation
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [ ] pending
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Import and call `fetchTeamsForProject()` after PAT validates

---

## T-004: Add auto-fetch area paths after PAT validation
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [ ] pending
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Import and call `fetchAreaPathsForProject()` after PAT validates

---

## T-005: Add multi-select prompt for area paths
**User Story**: US-002, US-003
**Satisfies ACs**: AC-US2-03, AC-US2-04, AC-US3-01
**Status**: [ ] pending
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Use `checkbox` from `@inquirer/prompts` for area path selection

---

## T-006: Add multi-select prompt for teams
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [ ] pending
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Use `checkbox` from `@inquirer/prompts` for team selection

---

## T-007: Update credentials return to include areaPaths
**User Story**: US-003, US-004
**Satisfies ACs**: AC-US3-03, AC-US4-03
**Status**: [ ] pending
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Add `areaPaths: string[]` to returned credentials object

---

## T-008: Save area paths in writeSyncConfig
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [ ] pending
**File**: `src/cli/helpers/issue-tracker/index.ts`
**Change**: Add areaPaths to ADO profile config at lines 795-806

---

## T-009: Fix detectAllConfigs for ADO
**User Story**: US-005
**Satisfies ACs**: AC-US5-01
**Status**: [ ] pending
**File**: `src/cli/helpers/init/config-detection.ts`
**Change**: Read org from config.json sync profiles, build proper ado object

---

## T-010: Add fallback to manual input if API fails
**User Story**: US-002
**Satisfies ACs**: AC-US2-05
**Status**: [ ] pending
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Wrap API calls in try-catch, fallback to text input

---

## T-011: Test full init flow with real ADO project
**User Story**: All
**Satisfies ACs**: All
**Status**: [ ] pending
**Test**: Manual integration test with olympusnova/OlySense
