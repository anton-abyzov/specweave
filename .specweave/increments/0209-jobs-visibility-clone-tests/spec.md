# 0209: Restore /sw:jobs Visibility + Clone Flow Test Coverage

## Problem

`/sw:jobs` was removed as a skill in commit bcc65072 ("remove bloat skills/commands"). The hook interception and scripts still work, but Claude Code can't discover or tab-complete the command. Additionally, the clone job flow has zero test coverage.

## User Stories

### US-001: Restore /sw:jobs command visibility
As a developer, I want `/sw:jobs` to appear in Claude Code's skill list so I can discover and tab-complete it.

#### Acceptance Criteria
- [x] AC-US1-01: Skill file exists at `plugins/specweave/skills/jobs/SKILL.md` with description and argument-hint
- [x] AC-US1-02: Skill file does NOT have `name:` field in frontmatter
- [x] AC-US1-03: `/sw:jobs` appears in Claude Code skill list after restart
- [x] AC-US1-04: Hook interception still works (backward compatible)

### US-002: Test coverage for job dependency system
As a developer, I want unit tests for `job-dependency.ts` so dependency waiting is verified.

#### Acceptance Criteria
- [x] AC-US2-01: Unit tests for `checkDependencies` covering completed, failed, and missing deps
- [x] AC-US2-02: Unit tests for `waitForDependencies` polling behavior

### US-003: Test coverage for clone worker
As a developer, I want unit tests for `clone-worker.ts` so clone behavior is verified.

#### Acceptance Criteria
- [x] AC-US3-01: Tests verify skip behavior for already-cloned repos
- [x] AC-US3-02: Tests verify `completed_with_warnings` status on partial failures
- [x] AC-US3-03: Tests verify job never marks as `failed` unless total crash

### US-004: Test coverage for GitHub repo cloning
As a developer, I want unit tests for `github-repo-cloning.ts` covering repo fetching and pattern filtering.

#### Acceptance Criteria
- [x] AC-US4-01: Tests for fetchGitHubRepos with mocked fetch API
- [x] AC-US4-02: Tests for repository pattern filtering (glob/regex)
- [x] AC-US4-03: Tests for PAT authentication in clone URLs

### US-005: Test coverage for ADO repo cloning
As a developer, I want unit tests for `ado-repo-cloning.ts` covering project sanitization and clone URL construction.

#### Acceptance Criteria
- [x] AC-US5-01: Tests for ADO clone URL construction with PAT
- [x] AC-US5-02: Tests for project name sanitization

### US-006: Integration test for /sw:jobs hook
As a developer, I want an integration test verifying the hook intercepts `/sw:jobs` and returns output.

#### Acceptance Criteria
- [x] AC-US6-01: Integration test verifies hook intercepts `/sw:jobs` pattern
- [x] AC-US6-02: Test verifies output via `additionalContext`
