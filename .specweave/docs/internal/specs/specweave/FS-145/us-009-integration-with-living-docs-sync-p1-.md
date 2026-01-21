---
id: US-009
feature: FS-145
title: Integration with Living Docs Sync (P1)
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 938
    url: https://github.com/anton-abyzov/specweave/issues/938
---

# US-009: Integration with Living Docs Sync (P1)

**Feature**: [FS-145](./FEATURE.md)

**As a** SpecWeave developer
**I want** living docs sync to validate against the project registry
**So that** only valid projects can be used in specs

---

## Acceptance Criteria

- [x] **AC-US9-01**: Before sync, validate `**Project**:` field exists in registry
- [x] **AC-US9-02**: If project not found, prompt to add it or fail sync
- [x] **AC-US9-03**: Update sync to read project metadata from registry (not just ID)
- [x] **AC-US9-04**: Add project techStack/team to generated us-*.md (optional enhancement)

---

## Implementation

**Increment**: [0145-project-registry-eda-sync](../../../../increments/0145-project-registry-eda-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-016**: Integrate with Living Docs Sync
