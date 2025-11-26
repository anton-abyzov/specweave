---
increment: 0063-fix-external-import-multi-repo
feature_id: FS-063
type: hotfix
status: completed
created: 2025-11-25T11:40:00Z
completed: 2025-11-26T13:55:00Z
---

# Fix External Import for Multi-Repo Setup

## Problem Statement

External work item import is broken for multi-repo/umbrella setups:

1. **Multi-repo selection not used**: User selects multiple repositories during init, but import only runs against the parent repo
2. **Implementation repos don't get imports**: sw-thumbnail-ab-be, sw-thumbnail-ab-fe, sw-thumbnail-ab-shared repos never get their issues imported
3. **Wrong folder structure**: Imported items go to `specs/us-001e-*.md` instead of `specs/FS-001/us-001e-*.md`
4. **Feature allocation disabled**: `enableFeatureAllocation` option exists but is never used in the flow
5. **No progress tracking**: For 1000+ items, users have no visibility into import progress
6. **Cross-repo duplicate detection missing**: Same external item can get different IDs across repos

## User Stories

### US-001: Multi-Repo External Import
**As a** user with an umbrella/multi-repo setup,
**I want** external items imported from ALL configured repositories,
**So that** I can see work items from frontend, backend, and shared repos in my living docs.

**Acceptance Criteria:**
- [x] **AC-US1-01**: When multi-repo selection is made during init, items are imported from each selected repository
- [x] **AC-US1-02**: Items from different repos are tagged with their source repository
- [x] **AC-US1-03**: Progress shows which repo is being imported and item count
- [x] **AC-US1-04**: Duplicate detection works across all repos (same GitHub issue = same US-XXXE ID)

### US-002: Feature Folder Structure for Imports
**As a** SpecWeave user,
**I want** imported items placed in proper feature folder structure (FS-XXX/US-XXXE),
**So that** my living docs are organized consistently with internal items.

**Acceptance Criteria:**
- [x] **AC-US2-01**: When feature allocation is enabled, items go to `specs/FS-XXX/` folders
- [x] **AC-US2-02**: Feature folders have proper FEATURE.md with external origin metadata
- [x] **AC-US2-03**: User stories are placed inside feature folders with correct naming
- [x] **AC-US2-04**: FSIdAllocator is used for chronological feature ID placement

### US-003: Large Import Progress Tracking
**As a** user importing from large projects (1000+ items),
**I want** real-time progress tracking with ETA,
**So that** I know how long the import will take and can track progress.

**Acceptance Criteria:**
- [x] **AC-US3-01**: Progress shows current/total count with percentage
- [x] **AC-US3-02**: Progress shows estimated time remaining
- [x] **AC-US3-03**: Progress shows items per second rate
- [x] **AC-US3-04**: Each repository import shows its own progress when multi-repo

### US-004: External ID Flow Through Increment Lifecycle
**As a** SpecWeave user,
**I want** external item IDs (E suffix) to flow properly through increment creation and closure,
**So that** bidirectional sync works correctly with external tools.

**Acceptance Criteria:**
- [x] **AC-US4-01**: Creating increment from external US preserves E suffix and external metadata
- [x] **AC-US4-02**: Increment spec.md contains external origin link
- [x] **AC-US4-03**: On /specweave:done, progress syncs back to external tool
- [x] **AC-US4-04**: External tool shows task completion status from SpecWeave

## Out of Scope

- JIRA/ADO multi-project import (GitHub only for this increment)
- Automatic merge of duplicate external items
- Complex conflict resolution for bidirectional sync
