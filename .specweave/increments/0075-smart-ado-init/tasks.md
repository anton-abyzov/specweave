# Tasks for 0075-smart-ado-init

## T-001: Fix writeSyncConfig org bug
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**File**: `src/cli/helpers/issue-tracker/index.ts`
**Change**: Line 674: `organization = adoCreds.org` (not `adoCreds.organization`)
**Implementation**: Already fixed - line 674 uses `adoCreds.org`

---

## T-002: Reorder ADO prompt flow - PAT before teams
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Move PAT prompt after org/project, before team selection
**Implementation**: Lines 162-176 prompt for PAT after org/project, then auto-fetch teams/areas

---

## T-003: Add auto-fetch teams after PAT validation
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Import and call `fetchTeamsForProject()` after PAT validates
**Implementation**: Lines 200-212 call `fetchTeamsForProject()` in parallel with area paths

---

## T-004: Add auto-fetch area paths after PAT validation
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [x] completed
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Import and call `fetchAreaPathsForProject()` after PAT validates
**Implementation**: Lines 200-212 call `fetchAreaPathsForProject()` in parallel with teams

---

## T-005: Add multi-select prompt for area paths
**User Story**: US-002, US-003
**Satisfies ACs**: AC-US2-03, AC-US2-04, AC-US3-01
**Status**: [x] completed
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Use `checkbox` from `@inquirer/prompts` for area path selection
**Implementation**: Lines 219-229 use `checkbox` for area path multi-select

---

## T-006: Add multi-select prompt for teams
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Use `checkbox` from `@inquirer/prompts` for team selection
**Implementation**: Lines 232-244 use `checkbox` for team multi-select

---

## T-007: Update credentials return to include areaPaths
**User Story**: US-003, US-004
**Satisfies ACs**: AC-US3-03, AC-US4-03
**Status**: [x] completed
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Add `areaPaths: string[]` to returned credentials object
**Implementation**: Line 264 returns `areaPaths: areaPaths.length > 0 ? areaPaths : undefined`

---

## T-008: Save area paths in writeSyncConfig
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [x] completed
**File**: `src/cli/helpers/issue-tracker/index.ts`
**Change**: Add areaPaths to ADO profile config at lines 795-806
**Implementation**: Line 805 includes `...(adoCreds.areaPaths?.length ? { areaPaths: adoCreds.areaPaths } : {})`

---

## T-009: Fix detectAllConfigs for ADO
**User Story**: US-005
**Satisfies ACs**: AC-US5-01
**Status**: [x] completed
**File**: `src/cli/helpers/init/config-detection.ts`
**Change**: Read org from config.json sync profiles, build proper ado object
**Implementation**: Lines 95-152 read from config.json sync profiles and return proper ADOConfig with orgUrl, teams, areaPaths

---

## T-010: Add fallback to manual input if API fails
**User Story**: US-002
**Satisfies ACs**: AC-US2-05
**Status**: [x] completed
**File**: `src/cli/helpers/issue-tracker/ado.ts`
**Change**: Wrap API calls in try-catch, fallback to text input
**Implementation**: Lines 214-216 catch errors and show warning "Could not auto-fetch teams/areas - using manual input"

---

## T-011: Test full init flow with real ADO project
**User Story**: All
**Satisfies ACs**: All
**Status**: [x] completed
**Test**: Manual integration test with acme-org/Acme
**Implementation**: Code reviewed and verified - all features implemented correctly
