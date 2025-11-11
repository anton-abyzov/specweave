---
increment: 0020
title: "Tasks: Enhanced Multi-Repository GitHub Support"
total_tasks: 20
test_mode: TDD
coverage_target: 90%
created: 2025-01-13
---

# Tasks for Increment 0020: Enhanced Multi-Repository GitHub Support

## T-001: Add Plugin Detection Utility

**AC**: Fix duplicate installation issue

**Test Plan** (BDD format):
- **Given** specweave-github plugin is installed → **When** checking installation → **Then** returns true
- **Given** plugin not installed → **When** checking → **Then** returns false

**Test Cases**:
- Unit (`utils.test.ts`): `isPluginInstalled()` with mock responses → 100% coverage
- Integration: Check actual Claude CLI → 90% coverage

**Implementation**:
- Add `isPluginInstalled()` to `src/cli/helpers/issue-tracker/utils.ts`
- Handle Claude CLI not available case
- Parse JSON output correctly

---

## T-002: Fix Duplicate Plugin Installation

**AC**: AC-US1-01

**Test Plan**:
- **Given** plugin already installed → **When** `installPlugin()` called → **Then** skip installation
- **Given** plugin not installed → **When** called → **Then** attempt installation

**Test Cases**:
- Unit: Mock plugin check → 95% coverage
- E2E: Full init flow → 85% coverage

**Implementation**:
- Update `installPlugin()` in `index.ts`
- Add early return if already installed
- Show appropriate message

---

## T-003: Create Git Remote Detector

**AC**: AC-US3-01, AC-US3-02

**Test Plan**:
- **Given** git repo with remotes → **When** detecting → **Then** parse all remotes correctly
- **Given** GitHub URLs → **When** parsing → **Then** extract owner/repo

**Test Cases**:
- Unit (`git-detector.test.ts`): Parse various URL formats → 95% coverage
- Integration: Test with real git repos → 85% coverage

**Implementation**:
- Create `src/utils/git-detector.ts`
- Support https and ssh URLs
- Handle edge cases (no git, no remotes)

---

## T-004: Design New Setup Type Selection

**AC**: AC-US1-01, AC-US2-01

**Test Plan**:
- **Given** setup flow → **When** prompted → **Then** show 5 clear options
- **Given** user selection → **When** chosen → **Then** route to correct flow

**Test Cases**:
- Unit: Test prompt generation → 90% coverage
- E2E: Test each option → 100% coverage

**Implementation**:
- Create `promptSetupType()` function
- Clear option descriptions
- Return setup type enum

---

## T-005: Implement "No Repository" Flow

**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan**:
- **Given** no repo option → **When** selected → **Then** save credentials only
- **Given** saved credentials → **When** later config → **Then** can add repos

**Test Cases**:
- Integration: Test credential saving → 90% coverage
- E2E: Test deferred setup → 85% coverage

**Implementation**:
- Skip repo configuration
- Save token to .env
- Create minimal config.json

---

## T-006: Implement Single Repository Flow

**AC**: Standard single-repo setup

**Test Plan**:
- **Given** single repo option → **When** configured → **Then** create one profile
- **Given** git remote exists → **When** detecting → **Then** auto-fill values

**Test Cases**:
- Unit: Profile creation → 95% coverage
- E2E: Full flow with auto-detect → 90% coverage

**Implementation**:
- Auto-detect from git remote
- Prompt for owner/repo
- Create default profile

---

## T-007: Implement Multiple Repositories Flow

**AC**: AC-US2-01, AC-US2-02

**Test Plan**:
- **Given** multi-repo option → **When** adding repos → **Then** create multiple profiles
- **Given** profiles → **When** saved → **Then** proper config structure

**Test Cases**:
- Unit: Multi-profile creation → 95% coverage
- Integration: Config persistence → 90% coverage

**Implementation**:
- Prompt for repo count
- Loop to collect each repo
- Create named profiles

---

## T-008: Implement Monorepo Flow

**AC**: Support monorepo with projects

**Test Plan**:
- **Given** monorepo option → **When** configured → **Then** single repo, multiple projects
- **Given** projects → **When** creating increment → **Then** tag with project

**Test Cases**:
- Unit: Monorepo config → 90% coverage
- Integration: Project tagging → 85% coverage

**Implementation**:
- Single repo configuration
- Collect project names
- Store in special format

---

## T-009: Implement Auto-Detection Flow

**AC**: AC-US3-01, AC-US3-02, AC-US3-03

**Test Plan**:
- **Given** git remotes → **When** auto-detecting → **Then** present for confirmation
- **Given** confirmation → **When** accepted → **Then** create profiles

**Test Cases**:
- Integration: Git detection → 90% coverage
- E2E: Full auto flow → 85% coverage

**Implementation**:
- Call git detector
- Present findings
- Allow editing before save

---

## T-010: Create GitHub Profile Manager

**AC**: AC-US2-01

**Test Plan**:
- **Given** profiles → **When** CRUD operations → **Then** manage correctly
- **Given** default profile → **When** getting → **Then** return correct one

**Test Cases**:
- Unit (`profile-manager.test.ts`): All CRUD ops → 95% coverage
- Integration: File persistence → 90% coverage

**Implementation**:
- Create `src/cli/helpers/github/profile-manager.ts`
- CRUD operations
- Default profile handling

---

## T-011: Update Config Schema

**AC**: Support multiple profiles

**Test Plan**:
- **Given** new config → **When** validating → **Then** accept profile structure
- **Given** old config → **When** validating → **Then** still accept (backward compat)

**Test Cases**:
- Unit: Schema validation → 100% coverage
- Integration: Config loading → 90% coverage

**Implementation**:
- Update `specweave-config.schema.json`
- Add profiles object
- Maintain backward compatibility

---

## T-012: Integrate Profile Selection in Increment Creation

**AC**: AC-US2-03

**Test Plan**:
- **Given** multiple profiles → **When** creating increment → **Then** prompt for selection
- **Given** single profile → **When** creating → **Then** use automatically

**Test Cases**:
- Integration: Profile selection → 90% coverage
- E2E: Increment with profile → 85% coverage

**Implementation**:
- Update increment creation flow
- Add profile selector
- Store in metadata.json

---

## T-013: Create Migration Script

**AC**: Backward compatibility

**Test Plan**:
- **Given** old format → **When** migrating → **Then** convert to profiles
- **Given** new format → **When** checking → **Then** skip migration

**Test Cases**:
- Unit: Format detection and conversion → 95% coverage
- Integration: File migration → 90% coverage

**Implementation**:
- Detect old format
- Convert to profile structure
- Create backup

---

## T-014: Update Post-Increment-Planning Hook

**AC**: Multi-repo support in hooks

**Test Plan**:
- **Given** increment with profile → **When** hook fires → **Then** use correct repo
- **Given** no profile → **When** hook fires → **Then** use default

**Test Cases**:
- Integration: Hook execution → 85% coverage
- E2E: Issue creation → 80% coverage

**Implementation**:
- Read profile from metadata
- Use profile config for API calls
- Handle missing profile

---

## T-015: Create Unit Tests

**AC**: 90% coverage target

**Test Plan**:
- **Given** all new functions → **When** testing → **Then** achieve 90% coverage

**Test Cases**:
- Unit: Complete test suite → 90% coverage target

**Implementation**:
- `tests/unit/github/multi-repo.test.ts`
- `tests/unit/utils/git-detector.test.ts`
- `tests/unit/github/profile-manager.test.ts`

---

## T-016: Create Integration Tests

**AC**: Test component interactions

**Test Plan**:
- **Given** components → **When** integrating → **Then** work together correctly

**Test Cases**:
- Integration: Full flows → 85% coverage

**Implementation**:
- Test setup flows
- Test profile management
- Test config updates

---

## T-017: Create E2E Tests

**AC**: Test complete user journeys

**Test Plan**:
- **Given** user scenarios → **When** executing → **Then** complete successfully

**Test Cases**:
- E2E (`setup-flow.spec.ts`): All 5 scenarios → 100% scenario coverage

**Implementation**:
- `tests/e2e/github/setup-flow.spec.ts`
- Test each setup option
- Test migration

---

## T-018: Update Documentation

**AC**: Clear user guidance

**Test Plan**:
- **Given** documentation → **When** reviewing → **Then** covers all scenarios

**Implementation**:
- Update CLAUDE.md
- Create migration guide
- Update user docs

---

## T-019: Manual Testing

**AC**: Verify all scenarios work

**Test Plan**:
- Test fresh install
- Test with existing repos
- Test migration

**Implementation**:
- Create test checklist
- Execute all scenarios
- Document issues

---

## T-020: Create Completion Report

**AC**: Document implementation

**Test Plan**:
- **Given** implementation → **When** complete → **Then** document outcomes

**Implementation**:
- Summary of changes
- Breaking changes (if any)
- Migration instructions
- Known issues

---

## Summary

- **Total Tasks**: 20
- **Test Coverage Target**: 90%
- **Critical Path**: T-001 → T-002 → T-003 → T-004 → T-005/6/7/8/9 (parallel) → T-010 → T-012
- **Dependencies**: T-002 depends on T-001, T-009 depends on T-003