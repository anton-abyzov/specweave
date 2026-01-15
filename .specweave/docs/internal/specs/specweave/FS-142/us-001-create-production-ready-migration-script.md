---
id: US-001
feature: FS-142
title: "Simplify JIRA Folder Structure"
status: completed
priority: P1
created: 2025-12-13
project: specweave
---

# US-001: Simplify JIRA Folder Structure

**Feature**: [FS-142](./FEATURE.md)

**As a** SpecWeave contributor
**I want** JIRA imports to use project-based folders (not board-based)
**So that** parent-child relationships work correctly and orphans are eliminated

---

## Acceptance Criteria

- [x] **AC-US1-01**: Init flow removes board selection prompt
- [x] **AC-US1-02**: Sync config stores no board mappings
- [x] **AC-US1-03**: Import coordinator creates one importer per project (not per board)
- [x] **AC-US1-04**: JiraImporter constructor simplified (no board parameters)
- [x] **AC-US1-05**: Board API pagination logic removed
- [x] **AC-US1-06**: Generated items contain no board metadata

---

## Implementation

**Increment**: [0142-jira-folder-structure-fix](../../../../increments/0142-jira-folder-structure-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.
