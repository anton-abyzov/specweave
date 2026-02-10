---
id: US-006
feature: FS-145
title: JIRA Sync Adapter (P1)
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 935
    url: https://github.com/anton-abyzov/specweave/issues/935
---

# US-006: JIRA Sync Adapter (P1)

**Feature**: [FS-145](./FEATURE.md)

**As a** SpecWeave user with JIRA integration
**I want** project registry to map to JIRA projects
**So that** I can track which JIRA projects correspond to SpecWeave projects

---

## Acceptance Criteria

- [x] **AC-US6-01**: Create `JiraProjectAdapter` that subscribes to project events
- [x] **AC-US6-02**: Store JIRA project key mapping in registry
- [x] **AC-US6-03**: Validate JIRA project exists on sync
- [x] **AC-US6-04**: Note: JIRA projects can't be created via API (read-only mapping)
- [x] **AC-US6-05**: On `ProjectSyncRequested`: Verify mapping is still valid

---

## Implementation

**Increment**: [0145-project-registry-eda-sync](../../../../increments/0145-project-registry-eda-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-011**: Implement JIRA Project Adapter
- [x] **T-012**: Unit Tests for Adapters
