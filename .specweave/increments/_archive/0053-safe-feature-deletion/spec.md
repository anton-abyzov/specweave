---
increment: 0053-safe-feature-deletion
title: Safe Feature Deletion Command
feature_id: FS-053
priority: P1
status: completed
type: feature
created: 2025-11-23T00:00:00.000Z
started: 2025-11-24T00:00:00.000Z
test_mode: TDD
coverage_target: 85
tech_stack:
  language: typescript
  runtime: nodejs
  framework: commander
  testing: vitest
structure: user-stories
---

# Feature: Safe Feature Deletion Command (/specweave:delete-feature)

## Overview

**Complete Requirements**: Living docs will be created via `/specweave:sync-docs update` after increment planning.

**Problem Statement**:
Currently, manually deleting features with `rm -rf` fails because:
1. Files may be tracked in git and keep coming back after checkout/merge
2. Hooks might recreate missing features based on stale state files
3. No validation for orphaned increment references (increments still pointing to deleted feature)
4. GitHub issues must be deleted separately (manual cleanup)
5. No audit trail of deletions (can't track who deleted what and why)
6. Risk of data loss (accidental deletion of important features)

**Target Users**:
- Framework maintainers cleaning up duplicate/obsolete features
- Project teams refactoring feature hierarchy
- Developers resolving feature naming conflicts
- QA teams removing test features after validation

**Business Value**:
- Prevents duplicate feature confusion (e.g., FS-050 vs FS-051 duplicates)
- Reduces manual cleanup effort (git rm + GitHub + state updates)
- Improves data integrity (validates orphaned references)
- Provides audit trail (who deleted what, when, why)
- Reduces risk (dry-run mode prevents accidents)

**Dependencies**:
- Existing git integration (git rm command)
- GitHub CLI (gh) for issue deletion
- Living docs structure (`.specweave/docs/internal/specs/`)
- Increment metadata system (metadata.json with feature_id)

---

## Acceptance Criteria

<!-- Auto-synced from living docs -->

### US-001: Safe Deletion with Validation

- [x] **AC-US1-01**: Command validates no active increments reference the feature
- [x] **AC-US1-02**: Command validates no completed increments reference the feature (warns, doesn't block)
- [x] **AC-US1-03**: Command shows detailed validation report before deletion
- [x] **AC-US1-04**: Validation report includes file paths, increment IDs, git status
- [x] **AC-US1-05**: Command requires explicit confirmation before deletion (interactive prompt)
- [x] **AC-US1-06**: Deletion is blocked if active increments found (safe mode)

### US-002: Force Deletion Mode

- [x] **AC-US2-01**: `--force` flag bypasses active increment validation
- [x] **AC-US2-02**: Force deletion logs warning about orphaned increments
- [x] **AC-US2-03**: Force deletion updates orphaned increment metadata (removes feature_id field)
- [x] **AC-US2-04**: Force deletion still requires explicit confirmation
- [x] **AC-US2-05**: Force deletion report shows which increments will be orphaned

### US-003: Dry-Run Mode

- [x] **AC-US3-01**: `--dry-run` flag shows deletion plan without executing
- [x] **AC-US3-02**: Dry-run report includes file list (living docs, user stories, etc.)
- [x] **AC-US3-03**: Dry-run report includes git status (tracked vs untracked files)
- [x] **AC-US3-04**: Dry-run report includes increment references (active/completed/archived)
- [x] **AC-US3-05**: Dry-run can be combined with --force to preview force deletion
- [x] **AC-US3-06**: Dry-run exits with code 0 (no error)

### US-004: Git Integration

- [x] **AC-US4-01**: Command uses `git rm` for tracked files
- [x] **AC-US4-02**: Command uses regular `rm` for untracked files
- [x] **AC-US4-03**: Command commits deletion with descriptive message
- [x] **AC-US4-04**: Commit message includes feature ID, user, timestamp, reason
- [x] **AC-US4-05**: Command handles git errors gracefully (e.g., merge conflicts)
- [x] **AC-US4-06**: Git operations can be skipped with `--no-git` flag

### US-005: GitHub Issue Deletion

- [x] **AC-US5-01**: Command finds all GitHub issues linked to feature's user stories
- [x] **AC-US5-02**: Command shows list of issues to be deleted (with titles)
- [x] **AC-US5-03**: Command requires separate confirmation for GitHub deletion
- [x] **AC-US5-04**: GitHub deletion can be skipped with `--no-github` flag
- [x] **AC-US5-05**: GitHub deletion handles API errors gracefully (e.g., rate limits)
- [x] **AC-US5-06**: Command logs GitHub API responses (issue IDs deleted)

### US-006: Audit Trail

- [x] **AC-US6-01**: Deletion event logged to `.specweave/logs/feature-deletions.log`
- [x] **AC-US6-02**: Log entry includes feature ID, timestamp, user, reason, mode (safe/force)
- [x] **AC-US6-03**: Log entry includes file count (living docs, user stories, etc.)
- [x] **AC-US6-04**: Log entry includes orphaned increment IDs (if any)
- [x] **AC-US6-05**: Log entry includes git commit SHA (if committed)
- [x] **AC-US6-06**: Deletion history can be viewed with `/specweave:audit-deletions`

---

## User Stories

### US-001: Safe Deletion with Validation (Priority: P1)

**As a** framework maintainer
**I want** to delete a feature with automatic validation for orphaned references
**So that** I can safely clean up duplicate or obsolete features without breaking increments

**Acceptance Criteria**:

- [x] **AC-US1-01**: Command validates no active increments reference the feature
  - **Tests**: Unit test with mock increment metadata
  - **Tasks**: T-001
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US1-02**: Command validates no completed increments reference the feature (warns, doesn't block)
  - **Tests**: Unit test with completed increment
  - **Tasks**: T-002
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US1-03**: Command shows detailed validation report before deletion
  - **Tests**: Integration test checking console output
  - **Tasks**: T-003
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US1-04**: Validation report includes file paths, increment IDs, git status
  - **Tests**: Snapshot test for report format
  - **Tasks**: T-003
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US1-05**: Command requires explicit confirmation before deletion (interactive prompt)
  - **Tests**: E2E test with mock stdin
  - **Tasks**: T-004
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US1-06**: Deletion is blocked if active increments found (safe mode)
  - **Tests**: Unit test with active increment
  - **Tasks**: T-001
  - **Priority**: P1
  - **Testable**: Yes

---

### US-002: Force Deletion Mode (Priority: P1)

**As a** framework maintainer with orphaned increments
**I want** to force-delete a feature even if references exist
**So that** I can clean up stale features after manually updating increments

**Acceptance Criteria**:

- [x] **AC-US2-01**: `--force` flag bypasses active increment validation
  - **Tests**: Unit test with --force flag
  - **Tasks**: T-005
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US2-02**: Force deletion logs warning about orphaned increments
  - **Tests**: Integration test checking log output
  - **Tasks**: T-005
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US2-03**: Force deletion updates orphaned increment metadata (removes feature_id field)
  - **Tests**: Unit test checking metadata update
  - **Tasks**: T-006
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US2-04**: Force deletion still requires explicit confirmation
  - **Tests**: E2E test with --force + confirmation
  - **Tasks**: T-005
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US2-05**: Force deletion report shows which increments will be orphaned
  - **Tests**: Snapshot test for force report
  - **Tasks**: T-005
  - **Priority**: P1
  - **Testable**: Yes

---

### US-003: Dry-Run Mode (Priority: P1)

**As a** developer planning feature cleanup
**I want** to preview what will be deleted without actually deleting
**So that** I can verify I'm deleting the correct feature

**Acceptance Criteria**:

- [x] **AC-US3-01**: `--dry-run` flag shows deletion plan without executing
  - **Tests**: Unit test checking no file deletion
  - **Tasks**: T-007
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US3-02**: Dry-run report includes file list (living docs, user stories, etc.)
  - **Tests**: Snapshot test for dry-run output
  - **Tasks**: T-007
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US3-03**: Dry-run report includes git status (tracked vs untracked files)
  - **Tests**: Integration test with git mock
  - **Tasks**: T-008
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US3-04**: Dry-run report includes increment references (active/completed/archived)
  - **Tests**: Unit test with multiple increments
  - **Tasks**: T-007
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US3-05**: Dry-run can be combined with --force to preview force deletion
  - **Tests**: Unit test with --dry-run --force
  - **Tasks**: T-007
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US3-06**: Dry-run exits with code 0 (no error)
  - **Tests**: E2E test checking exit code
  - **Tasks**: T-007
  - **Priority**: P1
  - **Testable**: Yes

---

### US-004: Git Integration (Priority: P1)

**As a** developer using version control
**I want** feature deletion to properly handle git-tracked files
**So that** deleted features don't reappear after git operations

**Acceptance Criteria**:

- [x] **AC-US4-01**: Command uses `git rm` for tracked files
  - **Tests**: Integration test with git repository
  - **Tasks**: T-009
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US4-02**: Command uses regular `rm` for untracked files
  - **Tests**: Unit test with untracked files
  - **Tasks**: T-009
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US4-03**: Command commits deletion with descriptive message
  - **Tests**: Integration test checking git log
  - **Tasks**: T-010
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US4-04**: Commit message includes feature ID, user, timestamp, reason
  - **Tests**: Snapshot test for commit message
  - **Tasks**: T-010
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US4-05**: Command handles git errors gracefully (e.g., merge conflicts)
  - **Tests**: Unit test with git error simulation
  - **Tasks**: T-011
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US4-06**: Git operations can be skipped with `--no-git` flag
  - **Tests**: Unit test with --no-git
  - **Tasks**: T-012
  - **Priority**: P2
  - **Testable**: Yes

---

### US-005: GitHub Issue Deletion (Priority: P1)

**As a** maintainer syncing with GitHub
**I want** feature deletion to also delete related GitHub issues
**So that** GitHub issues don't become orphaned

**Acceptance Criteria**:

- [x] **AC-US5-01**: Command finds all GitHub issues linked to feature's user stories
  - **Tests**: Integration test with GitHub API mock
  - **Tasks**: T-013
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US5-02**: Command shows list of issues to be deleted (with titles)
  - **Tests**: Snapshot test for issue list
  - **Tasks**: T-013
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US5-03**: Command requires separate confirmation for GitHub deletion
  - **Tests**: E2E test with two confirmations
  - **Tasks**: T-014
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US5-04**: GitHub deletion can be skipped with `--no-github` flag
  - **Tests**: Unit test with --no-github
  - **Tasks**: T-015
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US5-05**: GitHub deletion handles API errors gracefully (e.g., rate limits)
  - **Tests**: Unit test with GitHub API error
  - **Tasks**: T-016
  - **Priority**: P1
  - **Testable**: Yes

- [x] **AC-US5-06**: Command logs GitHub API responses (issue IDs deleted)
  - **Tests**: Integration test checking logs
  - **Tasks**: T-014
  - **Priority**: P1
  - **Testable**: Yes

---

### US-006: Audit Trail (Priority: P2)

**As a** team lead reviewing changes
**I want** feature deletions to be logged with full context
**So that** I can track who deleted what and why

**Acceptance Criteria**:

- [x] **AC-US6-01**: Deletion event logged to `.specweave/logs/feature-deletions.log`
  - **Tests**: Unit test checking log file
  - **Tasks**: T-017
  - **Priority**: P2
  - **Testable**: Yes

- [x] **AC-US6-02**: Log entry includes feature ID, timestamp, user, reason, mode (safe/force)
  - **Tests**: Snapshot test for log format
  - **Tasks**: T-017
  - **Priority**: P2
  - **Testable**: Yes

- [x] **AC-US6-03**: Log entry includes file count (living docs, user stories, etc.)
  - **Tests**: Unit test checking log content
  - **Tasks**: T-017
  - **Priority**: P2
  - **Testable**: Yes

- [x] **AC-US6-04**: Log entry includes orphaned increment IDs (if any)
  - **Tests**: Unit test with orphaned increment
  - **Tasks**: T-017
  - **Priority**: P2
  - **Testable**: Yes

- [x] **AC-US6-05**: Log entry includes git commit SHA (if committed)
  - **Tests**: Integration test with git
  - **Tasks**: T-018
  - **Priority**: P2
  - **Testable**: Yes

- [x] **AC-US6-06**: Deletion history can be viewed with `/specweave:audit-deletions`
  - **Tests**: E2E test checking audit output
  - **Tasks**: T-019
  - **Priority**: P3
  - **Testable**: Yes

---

## Functional Requirements

### FR-001: Feature Detection and Validation
**Priority**: P1

The system shall:
- Detect all files belonging to a feature (living docs folder, user story files)
- Validate git status (tracked vs untracked)
- Scan all increment metadata.json files for feature_id references
- Categorize references as active, completed, or archived
- Report validation results before deletion

**Testable Conditions**:
- Given feature FS-052 with 3 user stories and 1 living docs folder
- When validation runs
- Then report shows 4 files, git status, and 0 references

### FR-002: Safe Deletion Mode (Default)
**Priority**: P1

The system shall:
- Block deletion if ANY active increments reference the feature
- Warn (but allow) if completed/archived increments reference
- Require explicit user confirmation before proceeding
- Delete living docs folder (`.specweave/docs/internal/specs/_features/FS-###/`)
- Delete user story files (`.specweave/docs/internal/specs/{project}/FS-###/us-*.md`)
- Use `git rm` for tracked files
- Create git commit with deletion details

**Testable Conditions**:
- Given feature FS-052 with no active references
- When safe deletion runs with user confirmation
- Then files deleted via git rm and commit created

### FR-003: Force Deletion Mode
**Priority**: P1

The system shall:
- Accept `--force` flag to override active increment validation
- Log warning about orphaned increments
- Update orphaned increment metadata (remove feature_id field)
- Still require user confirmation
- Proceed with deletion even if references exist

**Testable Conditions**:
- Given feature FS-052 referenced by active increment 0053
- When force deletion runs with --force flag and confirmation
- Then feature deleted and increment 0053 metadata updated

### FR-004: Dry-Run Mode
**Priority**: P1

The system shall:
- Accept `--dry-run` flag to preview deletion
- Show complete deletion plan (files, git operations, confirmations)
- NOT execute any file deletions
- NOT execute any git operations
- NOT execute any GitHub API calls
- Exit with code 0 (success)

**Testable Conditions**:
- Given feature FS-052 with 10 files
- When dry-run mode executes
- Then deletion plan shown but no files deleted

### FR-005: Git Integration
**Priority**: P1

The system shall:
- Detect if repository is a git repository (check for .git folder)
- Use `git rm` for tracked files
- Use `rm` for untracked files
- Create commit with message: `feat: delete feature FS-### - [reason]`
- Include deletion metadata in commit message (file count, user, timestamp)
- Handle git errors gracefully (show error, don't crash)
- Support `--no-git` flag to skip git operations

**Testable Conditions**:
- Given git repository with tracked feature files
- When deletion executes
- Then git rm executed and commit created with correct message

### FR-006: GitHub Issue Deletion
**Priority**: P1

The system shall:
- Query GitHub API for issues with `[FS-###][US-###]` pattern in title
- Parse issue metadata to find feature-related issues
- Show list of issues to be deleted (issue #, title)
- Require separate confirmation for GitHub deletion
- Delete issues via GitHub API (gh CLI or REST API)
- Log GitHub API responses
- Support `--no-github` flag to skip GitHub deletion
- Handle API errors gracefully (rate limits, auth errors)

**Testable Conditions**:
- Given feature FS-052 with 3 GitHub issues (#101, #102, #103)
- When GitHub deletion executes with confirmation
- Then 3 issues deleted via API

### FR-007: Audit Logging
**Priority**: P2

The system shall:
- Create `.specweave/logs/feature-deletions.log` if not exists
- Append deletion event with JSON format
- Include: timestamp, user, feature_id, reason, mode, file_count, orphaned_increments, git_commit_sha
- Rotate log file if size exceeds 10MB
- Provide `/specweave:audit-deletions` command to view history

**Testable Conditions**:
- Given successful feature deletion
- When audit log is checked
- Then JSON entry exists with all required fields

---

## Non-Functional Requirements

### NFR-001: Performance
**Priority**: P1

**Requirement**: Deletion operation completes in < 5 seconds for typical feature (10 files, 2 increments)

**Testable Conditions**:
- Feature with 10 files
- 2 increment metadata scans
- Execution time measured
- Must be < 5000ms

### NFR-002: Data Safety
**Priority**: P1

**Requirement**:
- No silent deletions (always require confirmation)
- Dry-run mode available for preview
- Audit trail for all deletions
- Git commit creates recovery point

**Testable Conditions**:
- Deletion cannot proceed without confirmation
- Dry-run executes without side effects
- Audit log entry created
- Git commit exists after deletion

### NFR-003: Error Handling
**Priority**: P1

**Requirement**:
- Graceful handling of git errors (merge conflicts, permissions)
- Graceful handling of GitHub API errors (rate limits, auth)
- Clear error messages with recovery suggestions
- No partial deletions (rollback on error)

**Testable Conditions**:
- Simulate git error during deletion
- System shows error, suggests fix
- No files partially deleted

### NFR-004: User Experience
**Priority**: P1

**Requirement**:
- Clear validation report before deletion
- Color-coded output (red for warnings, green for success)
- Progress indicators for long operations (GitHub API calls)
- Helpful error messages with examples

**Testable Conditions**:
- Validation report is readable
- Output uses ANSI color codes
- Progress shown during GitHub deletion

### NFR-005: Test Coverage
**Priority**: P1

**Requirement**: 85% minimum test coverage (unit + integration)

**Coverage Breakdown**:
- Unit tests: 90%+ (validation, git operations, audit logging)
- Integration tests: 80%+ (end-to-end deletion flow)
- E2E tests: 70%+ (CLI interface, confirmations)

---

## Success Criteria

### Metric 1: Adoption Rate
**Target**: 80%+ maintainers use `/specweave:delete-feature` instead of manual `rm -rf`
**Measurement**: Track command usage via telemetry (opt-in)

### Metric 2: Error Rate
**Target**: < 5% deletion operations result in errors or rollbacks
**Measurement**: Monitor audit logs for error events

### Metric 3: Data Integrity
**Target**: 0 orphaned increments after 1 month of usage
**Measurement**: Scan all increment metadata for invalid feature_id references

### Metric 4: User Satisfaction
**Target**: 4.5/5 average rating in user feedback
**Measurement**: Post-deletion satisfaction survey (optional prompt)

---

## Test Strategy

**Test-Driven Development (TDD)**:
1. Write failing test (RED)
2. Implement minimal code to pass (GREEN)
3. Refactor for quality (REFACTOR)

**Test Layers**:

### Unit Tests (90%+ coverage)
- Feature detection logic
- Git status parsing
- Increment metadata scanning
- Validation rule engine
- Audit logging

**Tools**: Vitest, mock fs, mock git, mock GitHub API

### Integration Tests (80%+ coverage)
- End-to-end deletion flow (safe mode)
- Force deletion flow
- Dry-run flow
- Git integration (real git operations in temp repo)
- GitHub API integration (mocked API responses)

**Tools**: Vitest, temp git repo, GitHub API mock

### E2E Tests (70%+ coverage)
- CLI command execution
- User confirmation prompts
- Multi-feature deletion
- Error recovery scenarios

**Tools**: Vitest, spawn CLI process, mock stdin

**Coverage Target**: 85% minimum (enforced by CI)

---

## Implementation Notes

**Estimated Effort**: 16 hours (2 days)

**Phase Breakdown**:
- Phase 1: Feature detection & validation (4 hours)
- Phase 2: Safe deletion & git integration (4 hours)
- Phase 3: Force mode & orphan handling (3 hours)
- Phase 4: GitHub issue deletion (3 hours)
- Phase 5: Audit logging & dry-run mode (2 hours)

**Dependencies**:
- Git CLI installed
- GitHub CLI (`gh`) installed (for issue deletion)
- Living docs structure exists
- Increment metadata format stable

**Risk Mitigation**:
- Extensive testing prevents data loss
- Dry-run mode allows preview
- Git commits provide recovery point
- Audit trail tracks all deletions
