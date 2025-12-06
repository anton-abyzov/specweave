---
increment: 0110-external-items-workflow
project: specweave
type: feature
priority: P1
status: active
---

# External Items Workflow Enhancement

## Overview

Complete the external items lifecycle: import GitHub/JIRA/ADO issues → create FS-XXXE in living docs → create/reopen increment → work → complete → auto-close external issue.

## User Stories

### US-001: Import External Items to Living Docs
**As a** developer
**I want** to import open GitHub issues into SpecWeave
**So that** I can track and work on them within SpecWeave

**Acceptance Criteria:**
- [ ] **AC-US1-01**: `/specweave:import-external` imports GitHub issues with E suffix
- [ ] **AC-US1-02**: Creates `FS-XXXE/` folder in `internal/specs/{project}/`
- [ ] **AC-US1-03**: Preserves issue labels, title, description, URL
- [ ] **AC-US1-04**: Respects 2-level structure (project + board) when applicable
- [ ] **AC-US1-05**: Skips already-imported items (duplicate detection)

### US-002: Create Increment from External Item
**As a** developer
**I want** to create an increment that references an external item
**So that** I can work on it and track progress

**Acceptance Criteria:**
- [ ] **AC-US2-01**: `/specweave:increment --external FS-042E` creates increment linked to external item
- [ ] **AC-US2-02**: Increment metadata includes `external_ref: { id: "GH-#779", platform: "github", url: "..." }`
- [ ] **AC-US2-03**: Spec.md includes link to original issue
- [ ] **AC-US2-04**: Progress updates sync to external issue comments

### US-003: Reopen Existing Increment for External Item
**As a** developer
**I want** to reopen an existing increment if one already exists for an external item
**So that** I don't create duplicates

**Acceptance Criteria:**
- [ ] **AC-US3-01**: System detects existing increment referencing same external ID
- [ ] **AC-US3-02**: Prompts "Increment 0050 exists for GH-#779. Reopen? [Y/n]"
- [ ] **AC-US3-03**: If yes, reopens increment and sets status to active
- [ ] **AC-US3-04**: If no, creates new increment (with warning)

### US-004: Auto-Close External Issue on Completion
**As a** developer
**I want** GitHub issues to auto-close when I complete the linked increment
**So that** external tracking stays in sync

**Acceptance Criteria:**
- [ ] **AC-US4-01**: `/specweave:done` checks for external_ref in metadata
- [ ] **AC-US4-02**: Posts completion summary to GitHub issue as comment
- [ ] **AC-US4-03**: Closes GitHub issue automatically
- [ ] **AC-US4-04**: Updates living docs status from "open" to "closed"
- [ ] **AC-US4-05**: Config option to disable auto-close (manual control)

## Out of Scope

- JIRA/ADO bidirectional sync (GitHub first, others in future increment)
- Bulk close all completed increments
- External item prioritization

## Technical Notes

- Uses existing `ImportCoordinator` and `ItemConverter`
- Extends `MetadataManager` with `external_ref` field
- Integrates with `specweave-github` plugin for closing
- Living docs structure: `.specweave/docs/internal/specs/{project}/FS-XXXE/`

## Dependencies

- 0109-external-items-dashboard (completed) - provides external items display
