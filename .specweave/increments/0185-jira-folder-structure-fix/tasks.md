---
increment: 0185-jira-folder-structure-fix
total_tasks: 6
completed_tasks: 6
---

# Tasks

## Implementation Tasks

### T-001: Remove Board Selection from Init Flow
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
**Priority**: P1
**Model**: opus

**Description**: Remove board selection prompt from JIRA init flow

**Implementation**:
- Modified [src/cli/helpers/issue-tracker/jira.ts:463-483](src/cli/helpers/issue-tracker/jira.ts#L463-L483)
- Removed `selectBoards()` call
- Updated projectConfigs to exclude boards field
- Added architectural comments explaining the decision

**Test**: Init flow prompts for project only, no board selection

---

### T-002: Update Sync Config Writer
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed
**Priority**: P1
**Model**: opus

**Description**: Remove board mappings from sync config

**Implementation**:
- Modified [src/cli/helpers/issue-tracker/sync-config-writer.ts:247-261](src/cli/helpers/issue-tracker/sync-config-writer.ts#L247-L261)
- Removed `boards` field from config
- Removed `strategy` field (legacy)
- Config now only has: domain, projectKey

**Test**: Generated config contains no board references

---

### T-003: Simplify Import Coordinator
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed
**Priority**: P1
**Model**: opus

**Description**: Create one importer per project instead of per board

**Implementation**:
- Modified [src/importers/import-coordinator.ts:208-249](src/importers/import-coordinator.ts#L208-L249)
- Changed from iterating `boardMappings` to `projectMappings`
- Each project gets one JiraImporter instance
- Pass only projectKey (no board parameters)

**Test**: Import creates one importer per JIRA project

---

### T-004: Simplify JiraImporter Constructor
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**Priority**: P1
**Model**: opus

**Description**: Remove board-related parameters from JiraImporter

**Implementation**:
- Modified [src/importers/jira-importer.ts:68-94](src/importers/jira-importer.ts#L68-L94)
- Removed `boardId`, `boardName`, `boardMappings` parameters
- Constructor now only takes: host, email, apiToken, projectKey
- Removed board-related private fields

**Test**: JiraImporter instantiation requires only project info

---

### T-005: Remove Board API Pagination
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Priority**: P1
**Model**: opus

**Description**: Delete Board API pagination logic, use JQL only

**Implementation**:
- Modified [src/importers/jira-importer.ts:229-231](src/importers/jira-importer.ts#L229-L231)
- Removed board API routing logic
- Deleted entire `paginateByBoard()` method (~100 lines)
- All pagination now uses JQL search

**Test**: Import uses JQL search for all projects

---

### T-006: Remove Board Metadata from Items
**User Story**: US-001
**Satisfies ACs**: AC-US1-06
**Status**: [x] completed
**Priority**: P1
**Model**: opus

**Description**: Stop adding jiraBoardId/jiraBoardName to imported items

**Implementation**:
- Modified [src/importers/jira-importer.ts:568-574](src/importers/jira-importer.ts#L568-L574)
- Removed `jiraBoardId` and `jiraBoardName` fields
- Items now only have: jiraIssueKey, jiraIssueType, jiraProjectKey
- Cleaner metadata aligned with 1-level structure

**Test**: Imported items contain no board references
