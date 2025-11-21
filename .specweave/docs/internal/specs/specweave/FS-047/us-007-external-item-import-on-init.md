---
id: US-007
feature: FS-047
title: "External Item Import on Init"
status: completed
priority: P0
created: 2025-11-19
---

# US-007: External Item Import on Init

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/694

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** team adopting SpecWeave in a brownfield project
**I want** to import existing external items (GitHub/JIRA/ADO) during initialization into living docs
**So that** I don't lose historical context and can manually create increments when ready to work

---

## Acceptance Criteria

- [x] **AC-US7-01**: After `specweave init`, CLI prompts to import from detected external tools
- [x] **AC-US7-02**: Import pulls items from configurable time range (default: 1 month)
- [x] **AC-US7-03**: Pagination support for large imports (100+ items)
- [x] **AC-US7-04**: Imported items get E suffix (US-001E, T-001E)
- [x] **AC-US7-05**: Import creates external US files in living docs (NOT increments)
- [x] **AC-US7-06**: Import preserves external metadata (ID, URL, creation date)
- [x] **AC-US7-07**: Interactive confirmation before importing large datasets
- [x] **AC-US7-08**: Support GitHub, JIRA, and Azure DevOps imports
- [x] **AC-US7-09**: NEVER auto-create increments for imported external items

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-023**: Create external importer interface and GitHub implementation
- [x] **T-024**: Implement JIRA and ADO importers
- [x] **T-025**: Integrate external import into specweave init command
- [x] **T-026**: Convert imported items to living docs User Stories (NO increment creation)
- [x] **T-027**: Add import configuration and environment variables
