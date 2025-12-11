---
id: US-008
feature: FS-138
title: Living Docs Sync Respects Mode (P1)
status: completed
priority: P0
created: 2025-12-10
project: specweave
external:
  github:
    issue: 897
    url: https://github.com/anton-abyzov/specweave/issues/897
---

# US-008: Living Docs Sync Respects Mode (P1)

**Feature**: [FS-138](./FEATURE.md)

**As a** developer
**I want** living docs sync to use correct folder structure
**So that** files go to right location based on mode

---

## Acceptance Criteria

- [x] **AC-US8-01**: Single-project: all features go to `{project.name}/` folder
- [x] **AC-US8-02**: Multi-project: features distributed by spec.md `project:` field
- [x] **AC-US8-03**: No `project:` field validation in single-project mode
- [x] **AC-US8-04**: Automatic project resolution in single-project mode
- [x] **AC-US8-05**: Update [living-docs-sync.ts:625](../../../../../../../src/core/living-docs/living-docs-sync.ts#L625) to check mode

---

## Implementation

**Increment**: [0138-single-project-first-architecture](../../../../increments/0138-single-project-first-architecture/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-010**: Update living-docs-sync.ts resolveProjectPath()
