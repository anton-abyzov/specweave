---
increment: 0064-fix-external-sync-tags-status-types
type: bug
status: completed
created: 2024-11-26
completed: 2024-11-26
---

# Fix External Sync: Tags, Status, and Work Item Types

## Problem Statement

External tool synchronization (GitHub, JIRA, Azure DevOps) has critical gaps in how tags, statuses, priority fields, and work item types are synced. This results in:

1. **ADO status tags never applied** - Config defines tags but code ignores them
2. **Native priority fields not set** - JIRA/ADO only use labels/tags, not native fields
3. **No Bug type support** - All platforms hardcode to non-bug types
4. **GitHub labels replaced** - Status sync replaces all labels instead of merging
5. **Missing priority on increment issues** - GitHub increment issues lack priority labels

## User Stories

### US-001: ADO Status Tags Applied

**As a** developer using Azure DevOps,
**I want** status tags to be applied when increment status changes,
**So that** I can filter work items by status tags in ADO.

#### Acceptance Criteria

- [x] **AC-US1-01**: Status tags from config.json are applied to ADO work items
- [x] **AC-US1-02**: Tags are appended, not replaced (preserve existing tags)
- [x] **AC-US1-03**: Status change updates both System.State and System.Tags

### US-002: Native Priority Fields Set

**As a** project manager,
**I want** priority to be set in native JIRA/ADO fields,
**So that** I can sort and filter by priority in external tools.

#### Acceptance Criteria

- [x] **AC-US2-01**: JIRA issues have Priority field set (Highest/High/Medium/Low)
- [x] **AC-US2-02**: ADO work items have Microsoft.VSTS.Common.Priority set (1-4)
- [x] **AC-US2-03**: Priority mapping is configurable (P0→1, P1→2, etc.)

### US-003: Bug Work Item Type Support

**As a** developer,
**I want** to sync bug-type increments as Bug work items,
**So that** bug tracking is accurate in external tools.

#### Acceptance Criteria

- [x] **AC-US3-01**: JIRA supports Bug issue type when increment type is "bug"
- [x] **AC-US3-02**: ADO supports Bug work item type when increment type is "bug"
- [x] **AC-US3-03**: GitHub adds "bug" label when increment type is "bug"
- [x] **AC-US3-04**: Type mapping is consistent across all platforms

### US-004: GitHub Label Preservation

**As a** developer,
**I want** status sync to preserve my custom GitHub labels,
**So that** I don't lose important categorization.

#### Acceptance Criteria

- [x] **AC-US4-01**: Status sync only updates status-related labels
- [x] **AC-US4-02**: Custom labels (not starting with status:) are preserved
- [x] **AC-US4-03**: Priority and type labels are preserved during status sync

### US-005: Complete GitHub Increment Issue Labels

**As a** developer,
**I want** increment issues to have priority labels,
**So that** I can see priority at a glance in GitHub.

#### Acceptance Criteria

- [x] **AC-US5-01**: Increment issues include priority label (p0, p1, p2, p3)
- [x] **AC-US5-02**: Increment issues include type label when available
- [x] **AC-US5-03**: Labels match user story issue label conventions

## Out of Scope

- Bidirectional label/tag sync (external → SpecWeave)
- Custom label mapping configuration
- Webhook-based real-time sync
