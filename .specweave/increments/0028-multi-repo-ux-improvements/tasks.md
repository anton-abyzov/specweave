# Tasks for Increment 0028: Multi-Repository Setup UX Improvements

---
increment: 0028-multi-repo-ux-improvements
total_tasks: 11
completed_tasks: 11
test_mode: standard
coverage_target: 85%
---

## T-001: Update Repository Count Clarification (US-001)

**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Priority**: P0
**Status**: [x] Completed

**Test Plan** (BDD format):
- **Given** user selects multi-repo with parent → **When** prompted for count → **Then** see clarification BEFORE prompt
- **Given** clarification shown → **When** reading prompt → **Then** see "IMPLEMENTATION repositories (not counting parent)"
- **Given** user enters 2 → **When** confirmation shown → **Then** see "Total: 3 (1 parent + 2 implementation)"

**Implementation**:
- File: `src/core/repo-structure/repo-structure-manager.ts`
- Lines: 288-419 (configureMultiRepo method)
- Add clarification console output BEFORE inquirer.prompt
- Update prompt message text
- Add summary console output AFTER user input
- Change default from 3 to 2
- Update validation messages

**Manual Test**: Run `specweave init` → Select multi-repo → Verify clarification

---

## T-002: Fix Repository ID Single-Value Validation (US-002)

**AC**: AC-US2-01, AC-US2-02, AC-US2-03
**Priority**: P0
**Status**: [x] Completed

**Test Plan** (BDD format):
- **Given** repository ID prompt → **When** viewing examples → **Then** see single value only
- **Given** user enters "frontend,backend" → **When** validated → **Then** see error "One ID at a time (no commas)"
- **Given** user enters "frontend" → **When** validated → **Then** accepted

**Implementation**:
- File: `src/cli/helpers/issue-tracker/github-multi-repo.ts`
- Lines: 285-300 (Repository ID prompt)
- Update prompt message (remove comma-separated example)
- Add comma validation check
- Update error message

**Manual Test**: Enter comma-separated value → Verify error

---

## T-003: Create Folder Detection Module (US-004)

**AC**: AC-US4-01
**Priority**: P2
**Status**: [x] Completed

**Test Plan** (BDD format):
- **Given** folders frontend/, backend/, api/ exist → **When** detecting → **Then** return 3 folders
- **Given** no matching folders → **When** detecting → **Then** return empty array with default 2
- **Given** services/* pattern → **When** detecting → **Then** return matching service folders

**Test Cases**:
- Unit (`folder-detector.test.ts`): detectCommonPatterns, detectGlobPatterns, calculateConfidence, calculateSuggestedCount
- Coverage: 90% (critical auto-detection logic)

**Implementation**:
- File: `src/core/repo-structure/folder-detector.ts` (NEW)
- Function: `detectRepositoryHints(projectPath: string): Promise<RepositoryHints>`
- Common patterns: frontend, backend, api, mobile, web, admin
- Glob patterns: services/*, apps/*, packages/*
- Confidence: low/medium/high based on count
- Suggested count: Math.max(2, detectedCount)

---

## T-004: Integrate Auto-Detection in Repository Setup (US-004)

**AC**: AC-US4-02, AC-US4-03
**Priority**: P2
**Status**: [x] Completed
**Dependencies**: T-003

**Test Plan** (BDD format):
- **Given** 3 folders detected → **When** showing prompt → **Then** list detected folders
- **Given** 3 folders detected → **When** showing count prompt → **Then** default is 3

**Implementation**:
- File: `src/core/repo-structure/repo-structure-manager.ts`
- Location: Before repository count prompt (line ~400)
- Import detectRepositoryHints
- Call detectRepositoryHints(this.projectPath)
- Show detected folders if any found
- Use hints.suggestedCount as default in inquirer prompt

**Manual Test**: Create frontend/backend folders → Run init → Verify detection

---

## T-005: Create Project Validation Module (US-003)

**AC**: AC-US3-01
**Priority**: P1
**Status**: [x] Completed

**Test Plan** (BDD format):
- **Given** config.json has sync.projects → **When** validating → **Then** return valid=true
- **Given** config.json missing sync.projects → **When** validating → **Then** return valid=false
- **Given** sync.projects empty object → **When** validating → **Then** return valid=false

**Test Cases**:
- Unit (`project-validator.test.ts`): validateWithProjects, validateWithoutProjects, validateEmptyProjects, validateMissingConfig
- Coverage: 90% (critical validation logic)

**Implementation**:
- File: `src/utils/project-validator.ts` (NEW)
- Functions:
  - `validateProjectConfiguration(projectPath): Promise<ProjectValidationResult>`
  - `promptCreateProject(projectPath): Promise<boolean>`
- Read .specweave/config.json
- Check sync.projects exists and has keys
- Return validation result with project list

---

## T-006: Integrate Project Validation in GitHub Setup (US-003)

**AC**: AC-US3-02, AC-US3-03
**Priority**: P1
**Status**: [x] Completed
**Dependencies**: T-005

**Test Plan** (BDD format):
- **Given** GitHub setup starts → **When** no projects configured → **Then** show warning and prompt
- **Given** validation fails → **When** user confirms → **Then** invoke project creation flow
- **Given** validation passes → **When** continuing → **Then** show project count

**Implementation**:
- File: `src/cli/helpers/issue-tracker/github.ts`
- Location: After credential validation, before repository setup
- Import validateProjectConfiguration, promptCreateProject
- Call validation after credentials validated
- If invalid, show warning and prompt
- Optionally invoke project creation
- Show success/skip message

**Manual Test**: Delete sync.projects from config → Run init → Verify prompt

---

## T-007: Write Unit Tests for Folder Detection

**Priority**: P2
**Status**: [x] Completed
**Dependencies**: T-003

**Test Cases**:
- File: `tests/unit/repo-structure/folder-detector.test.ts` (NEW)
- Tests:
  - `detectCommonPatterns()`: frontend/, backend/, api/ → 3 folders
  - `detectGlobPatterns()`: services/a, services/b → 2 folders
  - `calculateConfidence()`: 0-1=low, 2=medium, 3+=high
  - `calculateSuggestedCount()`: Math.max(2, detected)
  - `emptyDirectory()`: no folders → default 2

**Implementation**: Jest tests with mock filesystem

---

## T-008: Write Unit Tests for Project Validation

**Priority**: P1
**Status**: [x] Completed
**Dependencies**: T-005

**Test Cases**:
- File: `tests/unit/utils/project-validator.test.ts` (NEW)
- Tests:
  - `validateWithProjects()`: sync.projects exists → valid=true
  - `validateWithoutProjects()`: no sync.projects → valid=false
  - `validateEmptyProjects()`: sync.projects={} → valid=false
  - `validateMissingConfig()`: no config.json → valid=false
  - `countProjects()`: 3 projects → projectCount=3

**Implementation**: Jest tests with mock config files

---

## T-009: Write Unit Tests for Repository ID Validation

**Priority**: P0
**Status**: [x] Completed
**Dependencies**: T-002

**Test Cases**:
- File: `tests/unit/cli/helpers/repository-id-validation.test.ts` (NEW)
- Tests:
  - `rejectCommas()`: "frontend,backend" → error
  - `acceptSingle()`: "frontend" → valid
  - `rejectEmpty()`: "" → error
  - `rejectUppercase()`: "Frontend" → error
  - `acceptHyphens()`: "my-frontend" → valid

**Implementation**: Jest tests with inquirer validation function

---

## T-010: Manual Testing (All User Stories)

**Priority**: P0
**Status**: [x] Completed
**Dependencies**: T-001, T-002, T-004, T-006

**Test Cases**:
1. **Test Case 1: Repository Count Clarity**
   - Run `specweave init test-project`
   - Select multi-repo with parent
   - Verify clarification shown BEFORE prompt
   - Verify prompt says "IMPLEMENTATION repositories"
   - Enter 2
   - Verify summary: "Total: 3 (1 parent + 2 implementation)"

2. **Test Case 2: Repository ID Single-Value**
   - Continue from Test Case 1
   - At Repository ID prompt
   - Verify example shows single value
   - Enter "frontend,backend"
   - Verify error: "One ID at a time (no commas)"
   - Enter "frontend"
   - Verify accepted

3. **Test Case 3: Project Validation**
   - Create test-project-2 folder
   - Run init with GitHub sync
   - Manually remove sync.projects from config (simulate)
   - Verify warning shown
   - Verify prompt to create project

4. **Test Case 4: Auto-Detection**
   - Create test-project-3 folder
   - Create folders: frontend/, backend/, api/
   - Run init with multi-repo
   - Verify detects 3 folders
   - Verify default is 3

**Implementation**: Manual execution + validation of output

---

## T-011: Documentation and Completion Report

**Priority**: P0
**Status**: [x] Completed
**Dependencies**: T-001 through T-010

**Deliverables**:
1. Update CLAUDE.md if architecture changed (unlikely)
2. Create `reports/COMPLETION-REPORT.md`:
   - Summary of changes
   - Before/After UX comparison
   - Test results
   - Known limitations (if any)
   - Future improvements

**Implementation**: Write documentation based on implementation

---

## Summary

**Total Tasks**: 11
- **P0 (Critical)**: 5 tasks (T-001, T-002, T-009, T-010, T-011)
- **P1 (High)**: 2 tasks (T-005, T-006)
- **P2 (Medium)**: 4 tasks (T-003, T-004, T-007, T-008)

**Estimated Time**: 4-5 hours
**Dependencies**:
- T-004 depends on T-003 (folder detection)
- T-006 depends on T-005 (project validation)
- T-010 depends on T-001, T-002, T-004, T-006

**Test Coverage**:
- Unit tests: 3 new test files (T-007, T-008, T-009)
- Manual tests: 4 test cases (T-010)
- Overall coverage: 85% target
