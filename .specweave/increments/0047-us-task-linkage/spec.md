---
increment: 0047-us-task-linkage
title: "US-Task Linkage Architecture"
type: feature
priority: P0
status: completed
created: 2025-11-19
epic: FS-047
test_mode: test-after
coverage_target: 90
---

# Feature: US-Task Linkage Architecture

## Overview

Implement explicit traceability between User Stories, Acceptance Criteria, and Tasks to enable automatic living docs sync and AC validation. This feature addresses a critical gap in SpecWeave's traceability infrastructure where tasks in `tasks.md` have no explicit connection to their parent User Stories, causing broken living docs sync and preventing automatic AC coverage validation.

**Business Impact**: Core framework integrity - enables automatic documentation sync, bidirectional traceability (US ↔ Task ↔ AC), and comprehensive quality validation across ALL increments (past, present, future).

**Complete Requirements**: See [FS-047](../../docs/internal/specs/_features/FS-047/FEATURE.md) (living docs)

---

## User Stories

### US-001: Explicit US-Task Linkage in tasks.md

**As a** developer implementing an increment
**I want** tasks to explicitly declare which User Story they belong to
**So that** I can trace implementation back to requirements without manual inference

**Acceptance Criteria**:
- [x] **AC-US1-01**: Every task in tasks.md has **User Story** field linking to parent US (format: `**User Story**: US-001`)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (parser validates field presence)
  - **Completed by**: T-001 (parser implementation)

- [x] **AC-US1-02**: Tasks grouped by User Story in tasks.md (section headers: `## User Story: US-001 - Title`)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (structure validation)
  - **Completed by**: increment 0047 tasks.md (uses hierarchical format)

- [x] **AC-US1-03**: Task parser extracts `userStory` field and validates format (US-XXX)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (unit tests)
  - **Completed by**: T-001 (parser with validation)

- [x] **AC-US1-04**: Invalid US references detected and reported (non-existent US-XXX)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (validation tests)
  - **Completed by**: T-002 (validateTaskLinkage function)

### US-002: AC-Task Mapping

**As a** PM validating increment quality
**I want** tasks to declare which Acceptance Criteria they satisfy
**So that** I can verify all ACs are covered by at least one task

**Acceptance Criteria**:
- [x] **AC-US2-01**: Every task has **Satisfies ACs** field listing AC-IDs (format: `**Satisfies ACs**: AC-US1-01, AC-US1-02`)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (parser validates field)
  - **Completed by**: T-005 (satisfiesACs parser)

- [x] **AC-US2-02**: Parser validates AC-IDs exist in spec.md
  - **Priority**: P1 (Important)
  - **Testable**: Yes (cross-reference validation)
  - **Completed by**: T-006 (spec-parser with getAllACIds, validateACBelongsToUS)

- [x] **AC-US2-03**: Multiple tasks can satisfy the same AC (shared coverage)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (coverage aggregation tests)
  - **Completed by**: T-013 (AC coverage validator handles multiple tasks per AC)

- [x] **AC-US2-04**: System detects orphan tasks (no satisfiesACs field)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (validation reports orphans)
  - **Completed by**: T-007, T-013 (orphan detection in validator)

### US-003: Automatic Living Docs Sync

**As a** developer completing tasks
**I want** living docs User Story files to automatically update from increment
**So that** I don't manually sync tasks.md and living docs

**Acceptance Criteria**:
- [x] **AC-US3-01**: When task marked completed, `post-task-completion.sh` hook updates living docs US file task section
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (hook integration test)
  - **Completed by**: T-008, T-010 (sync hook integration)

- [x] **AC-US3-02**: Living docs US file shows actual task list with links to tasks.md (not "No tasks defined")
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (sync validation)
  - **Completed by**: T-008 (sync-us-tasks.js module)

- [x] **AC-US3-03**: Task completion updates AC checkboxes in living docs based on satisfiesACs field
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (AC checkbox sync test)
  - **Completed by**: T-009 (updateACCheckboxes function)

- [x] **AC-US3-04**: `sync-living-docs.js` hook uses userStory field for grouping tasks by US
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (hook unit test)
  - **Completed by**: T-008 (parseTasksWithUSLinks integration)

- [x] **AC-US3-05**: Increment → Living Docs sync is ALWAYS one-way (external tools cannot write back to active increments)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (sync direction validation test)
  - **Notes**: Increment is source of truth during active work, living docs is archival. This direction is IMMUTABLE - external tools can only READ from living docs, never WRITE to active increments.
  - **Completed by**: T-011 (sync direction validation)

### US-004: AC Coverage Validation

**As a** PM approving increment closure
**I want** `/specweave:validate` to detect uncovered Acceptance Criteria
**So that** I know all requirements are implemented before closing increment

**Acceptance Criteria**:
- [x] **AC-US4-01**: `/specweave:validate <increment-id>` reports all ACs with zero tasks assigned
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (validation command test)
  - **Completed by**: T-013 (AC coverage validator)

- [x] **AC-US4-02**: Validation shows which tasks cover each AC (traceability matrix)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (report format validation)
  - **Completed by**: T-013 (AC coverage validator with acToTasksMap)

- [x] **AC-US4-03**: `/specweave:done` blocks closure if uncovered ACs found (unless --force flag)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (closure validation test)
  - **Completed by**: T-015 (Gate 0 AC coverage validation)

- [x] **AC-US4-04**: Validation detects orphan tasks (tasks with no satisfiesACs field or invalid AC-IDs)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (orphan detection test)
  - **Completed by**: T-013 (AC coverage validator with orphan detection)

### US-005: Progress Tracking by User Story

**As a** developer checking increment status
**I want** `/specweave:progress` to show per-US task completion
**So that** I know which User Stories are complete vs in-progress

**Acceptance Criteria**:
- [x] **AC-US5-01**: `/specweave:progress` displays task completion grouped by User Story
  - **Priority**: P1 (Important)
  - **Testable**: Yes (progress command test)

- [x] **AC-US5-02**: Progress output shows: `US-001: [8/11 tasks completed] 73%`
  - **Priority**: P1 (Important)
  - **Testable**: Yes (output format validation)

- [x] **AC-US5-03**: Progress summary includes total tasks by US (metadata.json frontmatter: `by_user_story`)
  - **Priority**: P2 (Nice-to-have)
  - **Testable**: Yes (frontmatter generation test)

### US-006: Migration Tooling

**As a** contributor maintaining existing increments
**I want** migration script to auto-link tasks to User Stories
**So that** I don't manually update 40+ existing increments

**Acceptance Criteria**:
- [x] **AC-US6-01**: Migration script analyzes spec.md and tasks.md to infer US linkage
  - **Priority**: P1 (Important)
  - **Testable**: Yes (migration script test)
  - **Completed by**: T-020, T-022

- [x] **AC-US6-02**: Script suggests linkage based on task descriptions and AC keywords
  - **Priority**: P1 (Important)
  - **Testable**: Yes (inference algorithm test)
  - **Completed by**: T-020, T-022

- [x] **AC-US6-03**: Script applies linkage with dry-run preview before actual update
  - **Priority**: P1 (Important)
  - **Testable**: Yes (dry-run mode test)
  - **Completed by**: T-021, T-022

- [x] **AC-US6-04**: Migration supports batch processing (all increments in one run)
  - **Priority**: P2 (Nice-to-have)
  - **Testable**: Yes (batch migration test)
  - **Completed by**: T-022

### US-007: External Item Import on Init

**As a** team adopting SpecWeave in a brownfield project
**I want** to import existing external items (GitHub/JIRA/ADO) during initialization into living docs
**So that** I don't lose historical context and can manually create increments when ready to work

**Acceptance Criteria**:
- [x] **AC-US7-01**: After `specweave init`, CLI prompts to import from detected external tools
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (init command integration test)
  - **Notes**: Auto-detect GitHub remote, JIRA/ADO config from environment

- [x] **AC-US7-02**: Import pulls items from configurable time range (default: 1 month)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (time range filter test)
  - **Notes**: Environment variable SPECWEAVE_IMPORT_TIME_RANGE_MONTHS

- [x] **AC-US7-03**: Pagination support for large imports (100+ items)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (pagination test with 500 items)
  - **Notes**: GitHub: 100/page, JIRA: 50/page, ADO: continuationToken
  - **Completed by**: T-023 (GitHub AsyncGenerator pagination)

- [x] **AC-US7-04**: Imported items get E suffix (US-001E, T-001E)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (ID assignment test)
  - **Notes**: E suffix permanently indicates external origin

- [x] **AC-US7-05**: Import creates external US files in living docs (NOT increments)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (living docs creation test)
  - **Notes**: Create us-001e-title.md in living docs, NO automatic increment creation

- [x] **AC-US7-06**: Import preserves external metadata (ID, URL, creation date)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (metadata preservation test)
  - **Notes**: Store in living docs frontmatter: externalId, externalUrl, importedAt

- [x] **AC-US7-07**: Interactive confirmation before importing large datasets
  - **Priority**: P1 (Important)
  - **Testable**: Yes (interactive prompt test)
  - **Notes**: Warn if import > 100 items, require explicit confirmation

- [x] **AC-US7-08**: Support GitHub, JIRA, and Azure DevOps imports
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (multi-platform import test)
  - **Notes**: Shared importer interface, platform-specific adapters

- [x] **AC-US7-09**: NEVER auto-create increments for imported external items
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (validation test ensures no auto-increment creation)
  - **Notes**: External US lives in living docs ONLY. User MUST manually create increment when ready to work on it. Config validation prevents autoIncrementCreation=true.

### US-008: ID Collision Resolution

**As a** developer creating mixed internal/external items
**I want** ID generation to avoid collisions between internal and external IDs
**So that** every item has a unique identifier with clear origin

**Acceptance Criteria**:
- [x] **AC-US8-01**: ID generator detects highest sequential number (ignoring suffix)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (ID generation test)
  - **Notes**: Extract numeric part from US-001, US-002E, US-003, find max
  - **Completed by**: T-028 (ID generator with origin suffix support)

- [x] **AC-US8-02**: New internal items use next sequential number (no suffix)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (internal ID generation test)
  - **Notes**: Given [US-001, US-002E, US-003], next internal = US-004
  - **Completed by**: T-028 (ID generator with origin suffix support)

- [x] **AC-US8-03**: New external items use next sequential number + E suffix
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (external ID generation test)
  - **Notes**: Given [US-001, US-002E, US-003], next external = US-004E
  - **Completed by**: T-028 (ID generator with origin suffix support)

- [x] **AC-US8-04**: Mixed IDs allowed in same increment (US-001, US-002E, US-003, US-004E)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (mixed ID validation test)
  - **Completed by**: T-029 (Updated parsers to handle E suffix)
  - **Notes**: Spec.md and tasks.md support both formats simultaneously

- [x] **AC-US8-05**: ID uniqueness validation before assignment
  - **Priority**: P1 (Important)
  - **Testable**: Yes (collision detection test)
  - **Notes**: Abort ID generation if duplicate detected, log error

- [x] **AC-US8-06**: Legacy IDs preserved during migration (no renumbering)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (migration preservation test)
  - **Notes**: Existing increments (0001-0046) keep internal IDs, first external import starts at US-201E
  - **Completed by**: T-031 (MIGRATION_GUIDE.md + tests)

### US-009: Origin Tracking and Sync Direction Configuration

**As a** PM managing mixed internal/external items
**I want** clear origin indicators and configurable sync direction between living docs and external tools
**So that** I can control how changes flow between SpecWeave and external tools

**Acceptance Criteria**:
- [x] **AC-US9-01**: Every US/Task has origin field in metadata (internal | external)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (metadata validation test)
  - **Notes**: Living docs frontmatter `origin`, `externalId`, `externalUrl`
  - **Completed by**: T-032 (origin-metadata.ts + 44 passing tests)

- [x] **AC-US9-02**: Three independent permission settings in config.json control external tool sync behavior
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (permission validation test)
  - **Notes**: config.json `sync.settings`: canUpsertInternalItems, canUpdateExternalItems, canUpdateStatus (all default: false for safety). Source of truth is config.json ONLY.

- [x] **AC-US9-03**: When canUpsertInternalItems=true, internal US creates external item AND syncs ongoing content updates
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (upsert permission test)
  - **Notes**: UPSERT = CREATE initially + UPDATE as work progresses. Controls: title, description, ACs. Flow: increment → living spec → CREATE external item → UPDATE on task completion. If false, stops before external item creation (local-only workflow).

- [x] **AC-US9-04**: When canUpdateExternalItems=true, external US content updates sync back to external tool (full content updates)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (external update permission test)
  - **Notes**: Controls: full content updates of externally-originated items (title, description, ACs, tasks/subtasks, success criteria, comments). Flow: increment progress → living spec → UPDATE external tool. If false, no sync to external tool (read-only snapshot).

- [x] **AC-US9-05**: When canUpdateStatus=true, status updates sync to external tool (for BOTH internal AND external items)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (status permission test)
  - **Notes**: Controls: status field ONLY. Works for both internal and external items. If false, no status updates regardless of item origin (manual status management in external tool).

- [x] **AC-US9-06**: External items preserve original external ID for reference
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (external ID preservation test)
  - **Notes**: Store externalId (GH-#638, JIRA-SPEC-789, ADO-12345) and externalUrl
  - **Completed by**: T-032 (ExternalItemMetadata interface with external_id and external_url fields, 44 tests passing)

- [x] **AC-US9-07**: Living docs show origin badge (🏠 Internal, 🔗 GitHub, 🎫 JIRA, 📋 ADO)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (origin badge rendering test)
  - **Notes**: us-001-title.md shows "**Origin**: 🏠 Internal"
  - **Completed by**: T-034 (origin badge sync in sync-us-tasks.js)

- [x] **AC-US9-08**: Origin immutable after creation (can't change internal ↔ external)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (immutability test)
  - **Notes**: Validation prevents changing origin field post-creation
  - **Completed by**: T-034 (immutability validation in updateOriginBadge)

- [x] **AC-US9-09**: Sync logs track origin-based update conflicts (when full sync enabled: all 3 permissions = true)
  - **Priority**: P2 (Nice-to-have)
  - **Testable**: Yes (conflict logging test)
  - **Notes**: Log file: .specweave/logs/sync-conflicts.log. Conflicts only possible when canUpsertInternalItems + canUpdateExternalItems + canUpdateStatus all enabled.
  - **Completed by**: Extended SyncEventLogger with loadConflicts() and dedicated sync-conflicts.log file (6 new tests, all passing)

### US-009A: External Item Format Preservation

**As a** developer implementing externally-originated work items
**I want** SpecWeave to preserve the original external format (title, description) when syncing completion updates
**So that** external stakeholders see their original content with non-invasive completion comments, not SpecWeave-formatted rewrites

**Acceptance Criteria**:
- [x] **AC-US9A-01**: External items preserve original title when syncing to external tool
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (format preservation test)
  - **Notes**: GitHub issue "My-Specific-Item" remains unchanged, NOT rewritten to "[FS-888][US-001]"

- [x] **AC-US9A-02**: External items preserve original description structure
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (description preservation test)
  - **Notes**: Original description preserved, NO AC/Task checklist injection

- [x] **AC-US9A-03**: Completion updates posted as comments ONLY (non-invasive)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (comment-only update test)
  - **Notes**: Add comment: "✅ [FS-888][T-042] Task completed", do NOT modify issue body

- [x] **AC-US9A-04**: Status updates ONLY if canUpdateStatus=true
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (status update conditional test)
  - **Notes**: canUpdateStatus=false → no status update, canUpdateStatus=true → update status via comment or API

- [x] **AC-US9A-05**: Internal items enforce standard [FS-XXX][US-YYY] format
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (internal format enforcement test)
  - **Notes**: Internal items CAN be fully rewritten (title, description, status)

- [x] **AC-US9A-06**: Format preservation flag in living docs frontmatter
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (metadata field test)
  - **Notes**: `format_preservation: true` for external items, `false` for internal

- [x] **AC-US9A-07**: Completion comment includes task, AC, and progress info
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (comment format test)
  - **Notes**: Comment format: Task completion, AC satisfaction, progress percentage, links to living docs

- [x] **AC-US9A-08**: Validation blocks format-breaking updates for external items
  - **Priority**: P1 (Important)
  - **Testable**: Yes (validation test)
  - **Notes**: Error if sync attempts to update title/description for external item

- [x] **AC-US9A-09**: Sync service routes to comment-only mode based on origin
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (routing logic test)
  - **Notes**: origin=external → comment-only, origin=internal → full sync

- [x] **AC-US9A-10**: External title stored in metadata for validation
  - **Priority**: P1 (Important)
  - **Testable**: Yes (metadata storage test)
  - **Notes**: Store `external_title` field for post-sync validation (ensure title unchanged)

### US-010: External Import Slash Command

**As a** developer managing brownfield project
**I want** dedicated slash command to manually pull external work items on-demand
**So that** I can import new external items created after initial setup

**Acceptance Criteria**:
- [x] **AC-US10-01**: `/specweave:import-external` command invokes external tool import coordinator
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (command execution test)
  - **Notes**: Separate from `specweave init` - for ongoing imports

- [x] **AC-US10-02**: Command detects configured external tools (GitHub, JIRA, ADO)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (tool detection test)
  - **Notes**: GitHub: .git/config remote, JIRA: JIRA_HOST env, ADO: ADO_ORG_URL env

- [x] **AC-US10-03**: Command supports time range filtering (since last import, 1 month, 3 months, all, custom)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (time range filter test)
  - **Notes**: Default: since last import (from .specweave/sync-metadata.json)

- [x] **AC-US10-04**: Command supports platform filtering (--github-only, --jira-only, --ado-only, or all)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (platform filter test)
  - **Notes**: `/specweave:import-external --github-only --since=1m`

- [x] **AC-US10-05**: Command creates living docs files with E suffix (NO increment creation)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (output validation test)
  - **Notes**: Same behavior as init import - living docs ONLY

- [x] **AC-US10-06**: Command shows progress indicator (spinner, item count, platform)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (progress output test)
  - **Notes**: "Importing from GitHub... [25/150] ⠋"

- [x] **AC-US10-07**: Command displays summary report (items imported, duplicates skipped, errors)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (summary output test)
  - **Notes**: "✅ Imported 42 items (GitHub: 30, JIRA: 12). Skipped 5 duplicates."

- [x] **AC-US10-08**: Command updates sync metadata (last import timestamp per platform)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (metadata update test)
  - **Notes**: .specweave/sync-metadata.json: `{"github": {"lastImport": "2025-11-19T10:30:00Z"}}`

- [x] **AC-US10-09**: Command handles rate limiting with retry suggestions
  - **Priority**: P1 (Important)
  - **Testable**: Yes (rate limit handling test)
  - **Notes**: GitHub: check X-RateLimit-Remaining header, suggest wait time

- [x] **AC-US10-10**: Command warns for large imports (> 100 items) with confirmation prompt
  - **Priority**: P2 (Nice-to-have)
  - **Testable**: Yes (confirmation prompt test)
  - **Notes**: "⚠️  Found 250 items. Continue? (Y/n)"

- [x] **AC-US10-11**: Command supports dry-run mode (--dry-run) showing what would be imported
  - **Priority**: P2 (Nice-to-have)
  - **Testable**: Yes (dry-run test)
  - **Notes**: `/specweave:import-external --dry-run --since=1m`

- [x] **AC-US10-12**: Command skips duplicates (checks existing US-IDs with E suffix)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (duplicate detection test)
  - **Notes**: If GH-#638 already imported as US-042E, skip with log message

### US-011: Multi-Repo Selection Strategy (GitHub Init)

**As a** team lead adopting SpecWeave in a multi-repo organization
**I want** intelligent repository selection during GitHub init (all org repos, personal repos, pattern matching, or explicit list)
**So that** I can connect the right set of repositories without manual configuration

**Acceptance Criteria**:
- [x] **AC-US11-01**: During `specweave init`, detect if user has access to multiple GitHub organizations
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (GitHub API integration test)
  - **Notes**: Query `/user/orgs` endpoint to detect organizations user belongs to
  - **Completed by**: T-037 (fetchUserOrganizations implementation)

- [x] **AC-US11-02**: Prompt user with multi-repo selection strategy options (4 modes)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (interactive prompt test)
  - **Notes**: Options: (1) All org repos, (2) All personal repos, (3) Pattern matching, (4) Explicit list
  - **Completed by**: T-037 (selectRepositories implementation)

- [x] **AC-US11-03**: Option 1: Connect all repos from specific organization
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (org repo listing test)
  - **Notes**: Show list of orgs user belongs to, let user select one, import all repos from that org
  - **Completed by**: T-037 (fetchOrgRepositories implementation)

- [x] **AC-US11-04**: Option 2: Connect all repos from user's personal account
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (personal repo listing test)
  - **Notes**: Query `/user/repos?affiliation=owner` to get repos owned by user
  - **Completed by**: T-037 (fetchPersonalRepositories implementation)

- [x] **AC-US11-05**: Option 3: Pattern matching for repository names (glob or regex)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (pattern matching test)
  - **Notes**: Support patterns like "ec-*", "*-backend", "microservice-*". Use minimatch or regex.
  - **Completed by**: T-038 (filterRepositoriesByPattern implementation)

- [x] **AC-US11-06**: Option 4: Explicit comma-separated list of repository names
  - **Priority**: P1 (Important)
  - **Testable**: Yes (explicit list parsing test)
  - **Notes**: User enters: "repo1, repo2, repo3". Validate repos exist before proceeding.
  - **Completed by**: T-038 (explicit strategy implementation)

- [x] **AC-US11-07**: Show preview of matched repositories before confirmation
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (preview rendering test)
  - **Notes**: Display table: Repo Name | Owner | Visibility | Last Updated. Ask "Connect these N repos? (Y/n)"
  - **Completed by**: T-039 (showRepositoryPreview implementation)

- [x] **AC-US11-08**: Handle pagination when listing organization/personal repos (100+ repos)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (pagination test with 250 repos)
  - **Notes**: GitHub API: 100 repos per page. Use Link header for pagination.
  - **Completed by**: T-037 (pagination in fetchOrgRepositories/fetchPersonalRepositories)

- [x] **AC-US11-09**: Save selected repos to `.specweave/config.json` under `github.repositories`
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (config persistence test)
  - **Notes**: Format: `{"github": {"repositories": ["owner/repo1", "owner/repo2"], "selectionStrategy": "pattern", "pattern": "ec-*"}}`
  - **Completed by**: T-040 (config.json save in init.ts)

- [x] **AC-US11-10**: Validate repository access before adding to config (check permissions)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (permission validation test)
  - **Notes**: Query `/repos/{owner}/{repo}` to verify user has at least read access. Warn if no access.
  - **Completed by**: T-038 (validateRepositoryAccess implementation)

- [x] **AC-US11-11**: Support mixed public/private repos (authenticate with PAT if private repos detected)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (authentication test)
  - **Notes**: Prompt for GitHub Personal Access Token if private repos in selection
  - **Completed by**: T-040 (Octokit authentication with GITHUB_TOKEN)

- [x] **AC-US11-12**: Allow editing repository selection after initial setup
  - **Priority**: P2 (Nice-to-have)
  - **Testable**: Yes (config update test)
  - **Notes**: `specweave config github --edit-repos` command to modify selection

### US-012: Intelligent FS-XXX Folder Creation with Chronological ID Allocation

**As a** developer syncing external work items to living docs
**I want** FS-XXX folders created with chronologically ordered IDs based on work item creation date
**So that** living docs structure reflects the actual timeline of work items and integrates seamlessly with existing increments

**Acceptance Criteria**:
- [x] **AC-US12-01**: Parse work item created date from external tool metadata (createdAt field)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (date parsing test)
  - **Notes**: Extract createdAt from GitHub issue, JIRA epic, ADO work item metadata
  - **Completed by**: T-041 (FS-ID allocator with chronological placement - 24/24 tests passing)

- [x] **AC-US12-02**: Scan existing living docs FS-XXX folders to determine occupied ID ranges
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (folder scanning test)
  - **Notes**: Scan `.specweave/docs/internal/specs/` for FS-001, FS-002, etc. Build ID map.
  - **Completed by**: T-041 (scanExistingIds() method scans active features)

- [x] **AC-US12-03**: Scan archived increments (_archive/) and consider their IDs as occupied
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (archive scanning test)
  - **Notes**: CRITICAL - archived IDs are still occupied, cannot reuse even with E suffix
  - **Completed by**: T-041 (scanExistingIds() scans both active and archived - TC-131 passing)

- [x] **AC-US12-04**: Allocate FS-XXX ID chronologically by comparing work item createdAt to existing increment/feature creation dates
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (chronological allocation test)
  - **Notes**: If external item created 2025-01-15 and FS-010 created 2025-01-10, FS-020 created 2025-01-20, then allocate FS-011E (insert between)
  - **Completed by**: T-041 (allocateId() with chronological-insert strategy - TC-128 passing)

- [x] **AC-US12-05**: Default behavior: append to end (increment max ID + 1) with E suffix if chronological insertion not feasible
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (append mode test)
  - **Notes**: Most common case: external item created after all existing work → allocate FS-{max+1}E
  - **Completed by**: T-041 (allocateId() with append strategy - TC-129 passing)

- [x] **AC-US12-06**: Prevent ID collision - validate no existing FS-XXX or FS-XXXE before allocation
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (collision detection test)
  - **Notes**: Check both active and archived folders. Error if FS-042 or FS-042E already exists.
  - **Completed by**: T-041 (hasCollision() method checks both variants - TC-130 passing)

- [x] **AC-US12-07**: Create folder structure: `.specweave/docs/internal/specs/FS-XXXE/` with US subfolders
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (folder creation test)
  - **Notes**: Create FS-042E/us-001e-title.md, FS-042E/us-002e-title.md
  - **Completed by**: T-042 (createFeatureFolder() method - TC-133, TC-134 passing)

- [x] **AC-US12-08**: Add origin metadata to feature README.md (external source, import date, original feature ID)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (metadata persistence test)
  - **Notes**: FS-042E/README.md frontmatter: `external_id: GH-Milestone-#42, imported_at: 2025-11-19`
  - **Completed by**: T-042 (README generation with frontmatter and origin badges - TC-133, TC-134 passing)

- [x] **AC-US12-09**: Update next available ID tracker after allocation (prevent race conditions)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (ID tracker test)
  - **Notes**: Atomic update to avoid collisions during concurrent imports
  - **Completed by**: T-042 (IDRegistry class with file-based locking - TC-135, TC-136 passing)

### US-013: Archive Command for Features and Epics

**As a** product manager cleaning up obsolete or completed work
**I want** dedicated command to archive entire features or epics with all related folders
**So that** living docs stay clean while preserving historical data in archive

**Acceptance Criteria**:
- [x] **AC-US13-01**: Create `/specweave:archive` slash command with feature and epic parameters
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (command invocation test)
  - **Notes**: Syntax: `/specweave:archive feature FS-042` or `/specweave:archive epic SP-FS-047-US-003`

- [x] **AC-US13-02**: When archiving feature, move entire FS-XXX folder to `.specweave/docs/_archive/specs/`
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (feature archive test)
  - **Notes**: Move `.specweave/docs/internal/specs/FS-042/` → `.specweave/docs/_archive/specs/FS-042/`

- [x] **AC-US13-03**: When archiving feature, archive ALL related User Stories (all US-XXX within FS-XXX folder)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (cascading archive test)
  - **Notes**: If FS-042 has 5 User Stories, all 5 US folders move to archive

- [x] **AC-US13-04**: When archiving epic (User Story), move only specific US-XXX folder to archive
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (epic archive test)
  - **Notes**: Move `FS-042/us-003e-title.md` → `.specweave/docs/_archive/specs/FS-042/us-003e-title.md`

- [x] **AC-US13-05**: Preserve folder structure in archive (maintain FS-XXX/US-XXX hierarchy)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (structure preservation test)
  - **Notes**: Archive maintains same structure: `_archive/specs/FS-042/us-001e-title.md`

- [x] **AC-US13-06**: Add archive metadata (archived_at timestamp, archived_by user, reason)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (metadata tracking test)
  - **Notes**: Create `.archive-metadata.json` in archived folder with timestamp, user, reason

- [x] **AC-US13-07**: Support optional reason parameter for audit trail
  - **Priority**: P2 (Nice-to-have)
  - **Testable**: Yes (reason tracking test)
  - **Notes**: `/specweave:archive-features --reason="Obsolete after pivot"`
  - **Completed by**: Extended FeatureArchiver with writeArchiveMetadata(), added --reason parameter to command, stores in .archive-metadata.json

- [x] **AC-US13-08**: Prevent archiving if feature/epic has active increments referencing it
  - **Priority**: P1 (Important)
  - **Testable**: Yes (active reference check test)
  - **Notes**: Block archive if increment 0050 still references FS-042. Warn user.

- [x] **AC-US13-09**: Support dry-run mode to preview what will be archived
  - **Priority**: P2 (Nice-to-have)
  - **Testable**: Yes (dry-run test)
  - **Notes**: `/specweave:archive feature FS-042 --dry-run` shows files to be moved

- [x] **AC-US13-10**: Create `/specweave:restore` command to unarchive features/epics
  - **Priority**: P2 (Nice-to-have)
  - **Testable**: Yes (restore test)
  - **Notes**: `/specweave:restore feature FS-042` moves back from archive to active

- [x] **AC-US13-11**: Maintain archived ID registry to prevent reuse (archived IDs remain occupied)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (ID registry test)
  - **Notes**: Even archived FS-042 occupies ID space. New features cannot use FS-042 or FS-042E.

- [x] **AC-US13-12**: Generate archive summary report (count of features/USs archived, storage size)
  - **Priority**: P2 (Nice-to-have)
  - **Testable**: Yes (summary report test)
  - **Notes**: Output: "✅ Archived FS-042 (5 User Stories, 42 KB). Total archived: 8 features."

---

## Functional Requirements

### FR-001: Task Format Specification
- Tasks MUST have **User Story** field linking to parent US
- Tasks MUST have **Satisfies ACs** field listing covered AC-IDs
- Parser MUST validate both fields are present and correctly formatted
- Priority: P0 (Critical)

### FR-002: Parser Extensions
- `task-parser.ts` MUST extract `userStory` and `satisfiesACs` fields
- Parser MUST validate US-XXX format for userStory
- Parser MUST validate AC-USXX-YY format for satisfiesACs
- Priority: P0 (Critical)

### FR-003: Living Docs Sync Enhancement
- `sync-living-docs.js` MUST use userStory field for grouping
- Hook MUST update living docs US file task sections automatically
- Hook MUST update AC checkboxes based on satisfiesACs field
- Priority: P0 (Critical)

### FR-004: Validation Enhancement
- `/specweave:validate` MUST detect uncovered ACs
- `/specweave:validate` MUST detect orphan tasks
- `/specweave:done` MUST block closure if validation fails
- Priority: P0 (Critical)

### FR-005: Progress Tracking Enhancement
- `/specweave:progress` MUST display per-US task completion
- Progress MUST show percentage and task counts per US
- Priority: P1 (Important)

### FR-006: Backward Compatibility
- Parser MUST support both old format (no US linkage) and new format
- Old increments MUST not break when validated
- Migration MUST be optional (not mandatory)
- Priority: P1 (Important)

### FR-007: External Import Infrastructure
- `specweave init` MUST detect and prompt for external tool import (GitHub/JIRA/ADO)
- Import service MUST support pagination (100+ items per tool)
- Imported items MUST get E suffix (US-001E, T-001E)
- Import MUST update living docs with external items
- Priority: P0 (Critical)

### FR-008: ID Generation with Origin Tracking
- ID generator MUST detect highest sequential number (ignoring suffix)
- Internal ID generation: Next sequential number, NO suffix
- External ID generation: Next sequential number + E suffix
- Mixed IDs allowed in same increment (US-001, US-002E, US-003)
- Priority: P0 (Critical)

### FR-009: External Tool Permission Configuration
- Increment → Living Docs sync MUST be one-way ALWAYS (immutable, not configurable)
- Living Docs → External Tool sync MUST respect 3 independent permission settings in config.json
- canUpsertInternalItems: Controls CREATE + UPDATE for internal items (default: false)
- canUpdateExternalItems: Controls content updates for external items via comments (default: false)
- canUpdateStatus: Controls status updates for ALL items (default: false)
- Permissions stored in .specweave/config.json under sync.settings (NOT .env)
- Init command MUST prompt user with 3 questions to set these permissions
- Config validation MUST prevent autoIncrementCreation=true (forbidden)
- Priority: P0 (Critical)

### FR-010: Origin Metadata Management
- Every US/Task MUST have origin field (internal | external)
- Origin determines default sync direction (push-only or pull-only)
- External items MUST preserve externalId, externalUrl, importedAt
- Living docs MUST show origin badges (🏠 Internal, 🔗 GitHub, 🎫 JIRA, 📋 ADO)
- Priority: P0 (Critical)

### FR-010A: External Item Format Preservation
- External items MUST preserve original title (NO rewrite to [FS-XXX][US-YYY] format)
- External items MUST preserve original description (NO AC/Task checklist injection)
- Completion updates MUST use comments ONLY (non-invasive updates)
- Status updates ONLY if canUpdateStatus=true (default: no status update)
- Content updates to external items ONLY if canUpdateExternalItems=true (default: skip sync)
- Internal items MUST enforce standard [FS-XXX][US-YYY] format (full rewrite allowed)
- Internal item upsert (CREATE + UPDATE) ONLY if canUpsertInternalItems=true (default: skip external item creation)
- Format preservation flag MUST be stored in living docs frontmatter
- Sync service MUST route to comment-only mode for external items based on origin
- Validation MUST block format-breaking updates (title/description changes) for external items
- External title MUST be stored in metadata for post-sync validation
- Priority: P0 (Critical)

### FR-011: External Import Slash Command
- `/specweave:import-external` MUST be available as dedicated command for ongoing imports
- Command MUST detect configured external tools (GitHub, JIRA, ADO) automatically
- Command MUST support time range filtering (since last import as default)
- Command MUST support platform filtering (--github-only, --jira-only, --ado-only)
- Command MUST create living docs files with E suffix ONLY (NO increment creation)
- Command MUST update sync metadata with last import timestamp per platform
- Command MUST display progress indicator and summary report
- Command MUST handle rate limiting with retry suggestions
- Command MUST skip duplicates (existing external IDs)
- Priority: P0 (Critical)

### FR-012: Multi-Repo Selection Strategy (GitHub Init)
- `specweave init` MUST detect user's GitHub organizations and personal repos
- Init MUST prompt for repository selection strategy (all org, all personal, pattern, explicit list)
- Pattern matching MUST support glob patterns (e.g., "ec-*", "*-backend")
- Init MUST show preview of matched repos before confirmation (name, owner, visibility, last updated)
- Init MUST handle GitHub API pagination for orgs/users with 100+ repos
- Init MUST save selected repos to `.specweave/config.json` under `github.repositories`
- Init MUST validate repository access before adding to config
- Init MUST support mixed public/private repos with PAT authentication
- Priority: P0 (Critical)

### FR-013: Intelligent FS-XXX Folder Creation with Chronological ID Allocation
- External import MUST parse work item createdAt timestamp from source metadata
- ID allocator MUST scan both active living docs and _archive/ folders for occupied IDs
- ID allocator MUST attempt chronological insertion based on work item creation date
- ID allocator MUST default to append mode (max ID + 1) if chronological insertion fails
- ID allocator MUST validate no FS-XXX or FS-XXXE collision before allocation
- Folder creator MUST create `.specweave/docs/internal/specs/FS-XXXE/` structure
- Folder creator MUST add origin metadata to feature README.md frontmatter
- ID tracker MUST update atomically to prevent race conditions
- Archived IDs MUST remain occupied indefinitely (cannot reuse)
- Priority: P0 (Critical)

### FR-014: Archive Command for Features and Epics
- `/specweave:archive` command MUST support both feature and epic targets
- Feature archiving MUST move entire FS-XXX folder to `.specweave/docs/_archive/specs/`
- Feature archiving MUST cascade to ALL User Stories within the feature
- Epic archiving MUST move only specific US-XXX folder to archive
- Archive MUST preserve folder structure (maintain FS-XXX/US-XXX hierarchy)
- Archive MUST add metadata (archived_at, archived_by, reason)
- Archive MUST block if active increments reference the feature/epic
- Archive MUST maintain ID registry (archived IDs remain occupied)
- `/specweave:restore` command MUST unarchive features/epics back to active
- Archive commands MUST support dry-run mode for preview
- Priority: P0 (Critical)

---

## Non-Functional Requirements

### NFR-001: Performance
- Parser overhead for new fields < 10ms per increment
- Living docs sync hook executes within 500ms (95th percentile)
- Validation scans all increments within 2 seconds
- Priority: P1 (Important)

### NFR-002: Data Integrity
- Atomic updates: tasks.md and living docs sync or both rollback on failure
- No partial sync states (either fully synced or rolled back)
- Priority: P0 (Critical)

### NFR-003: Usability
- Validation errors show clear error messages with suggested fixes
- Migration script provides interactive prompts for ambiguous cases
- Priority: P1 (Important)

### NFR-004: Test Coverage
- Parser: 95%+ coverage (critical path)
- Hooks: 85%+ coverage (integration)
- Validation: 90%+ coverage (quality gate)
- Priority: P0 (Critical)

---

## Success Criteria

### Metric 1: Living Docs Accuracy
- **Target**: 100% of living docs US files show actual task lists (not "No tasks defined")
- **Measurement**: Scan all living docs US files, verify task sections are populated
- **Validation**: Automated test suite

### Metric 2: AC Coverage Validation
- **Target**: `/specweave:validate` detects 100% of uncovered ACs
- **Measurement**: Create test increments with missing AC coverage, verify detection
- **Validation**: Automated test suite

### Metric 3: Sync Accuracy
- **Target**: 100% task completion updates propagate to living docs within 1 second
- **Measurement**: Hook execution time + sync verification
- **Validation**: Integration tests

### Metric 4: Migration Success
- **Target**: 90%+ of existing increments (0001-0046) successfully migrated
- **Measurement**: Migration script report + manual validation of 10% sample
- **Validation**: Manual review

### Metric 5: Developer Adoption
- **Target**: 100% of new increments (0048+) use US-Task linkage format
- **Measurement**: Validate new increments during PR review
- **Validation**: Pre-commit hooks + CI validation

---

## Dependencies

### Internal Dependencies
- **ADR-0043**: spec.md as Source of Truth (status sync pattern)
- **ADR-0047**: Three-File Structure Canonical Definition (task format rules)
- **ADR-0030**: Intelligent Living Docs Sync (sync architecture)
- **Increment 0043**: Spec-metadata sync infrastructure (reuse dual-write pattern)
- **Increment 0046**: Console elimination (migration pattern reference)

### External Dependencies
- None (internal framework enhancement)

---

## Constraints

### Technical Constraints
- Must maintain backward compatibility with old task format (40+ existing increments)
- Parser must handle both YAML frontmatter and Markdown body formats
- Hooks must remain performant (< 500ms execution time)

### Timeline Constraints
- Estimated effort: 5-8 days (proposal document estimate)
- Must complete before next major release (v0.23.0)

### Resource Constraints
- Single developer implementation (Anton)
- No external library dependencies (use existing parsers)

---

## Assumptions

1. **Increments 0001-0046 follow similar structure** (User Stories exist in spec.md)
2. **Migration can infer most linkage** from task descriptions and AC keywords
3. **Living docs structure is stable** (three-layer architecture from v0.18.0+)
4. **Gray-matter YAML parser is sufficient** for dual-write (proven in 0043)

---

## Out of Scope

### Deferred to Future Increments
- **Visual traceability matrix UI** (web-based dashboard) - Requires frontend implementation
- **Historical linkage inference** (analyzing git history) - Complex, low ROI
- **Multi-increment AC coverage** (same AC across multiple increments) - Edge case, defer
- **Webhook-based sync** (real-time external updates) - Requires webhook infrastructure
- **Conflict resolution UI** (interactive merge tool) - Defer to CLI prompts first

### Explicitly Not Included
- Task dependency graph visualization (out of scope)
- Automated AC generation from code (requires AI, separate feature)
- External tool write-back for external items (external items remain read-only in this increment)

---

## Test Strategy

### Unit Tests (95%+ coverage)
- `task-parser.ts`: Parse userStory and satisfiesACs fields
- `spec-frontmatter-updater.ts`: Validate AC-ID formats
- `coverage-analyzer.ts`: Detect uncovered ACs and orphan tasks
- Test fixtures: Valid/invalid task formats, edge cases

### Integration Tests (85%+ coverage)
- `sync-living-docs.js`: End-to-end task completion sync
- `post-task-completion.sh`: Hook execution with new fields
- `/specweave:validate` command: AC coverage validation
- `/specweave:done` command: Closure validation with linkage checks

### E2E Tests (90%+ coverage)
- Full increment lifecycle: Create → Execute → Validate → Close
- Migration workflow: Old increment → Migrate → Validate
- Bidirectional sync: tasks.md ↔ living docs ↔ GitHub issues

### Manual Testing
- Migrate increments 0043-0046 (proof of concept)
- Validate living docs accuracy after migration
- Test `/specweave:progress` output format
- Review generated traceability reports

---

## Migration Plan

### Phase 1: Parser & Generator (Days 1-2)
- Update `task-parser.ts` to extract new fields
- Update `tasks.md.mustache` template with new format
- Add validation for US and AC-ID formats
- Unit tests for parser extensions

### Phase 2: Living Docs Sync (Days 3-4)
- Update `sync-living-docs.js` to use userStory field
- Implement AC checkbox sync based on satisfiesACs
- Update `post-task-completion.sh` hook
- Integration tests for sync behavior

### Phase 3: Validation & Commands (Day 5)
- Extend `/specweave:validate` with AC coverage checks
- Update `/specweave:done` closure validation
- Enhance `/specweave:progress` with per-US grouping
- Command integration tests

### Phase 4: Migration Tooling (Days 6-7)
- Create `migrate-task-linkage.ts` script
- Implement inference algorithm (keyword matching)
- Add dry-run mode and interactive prompts
- Test migration on increments 0043-0046

### Phase 5: Documentation & Rollout (Day 8)
- Update CLAUDE.md with new task format
- Update CONTRIBUTING.md with examples
- Update PM Agent prompt with linkage requirements
- Run migration on all existing increments
- Create completion report

---

## Rollback Strategy

### If Migration Fails
1. Revert all tasks.md changes (git restore)
2. Rollback living docs updates (restore from backup)
3. Remove parser extensions (git revert)
4. Document failure reasons and defer to next increment

### If Performance Degrades
1. Add caching layer for US-Task mapping
2. Optimize parser (lazy evaluation)
3. Reduce sync frequency (debounce hook)
4. If still slow, revert and redesign

---

## Related Documentation

- **Proposal**: `.specweave/increments/0046-console-elimination/reports/US-TASK-LINKAGE-PROPOSAL.md`
- **ADR-0043**: Spec.md as Source of Truth
- **ADR-0047**: Three-File Structure Canonical Definition
- **Living Docs Spec**: `.specweave/docs/internal/specs/_features/FS-047/FEATURE.md` (created via `/specweave:sync-docs update`)

---

## Notes

This increment fixes a **critical traceability gap** that affects:
- Living docs accuracy (all existing increments show "No tasks defined")
- Quality validation (can't verify AC coverage before closure)
- Progress tracking (can't show per-US completion)
- External sync (GitHub issue task checkboxes lack AC context)

**Impact**: Affects 100% of future increments + enables migration of 40+ existing increments.

**Risk Level**: Medium (touches core parsers and hooks, but well-tested pattern from 0043)
