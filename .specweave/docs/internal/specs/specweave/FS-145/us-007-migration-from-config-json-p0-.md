---
id: US-007
feature: FS-145
title: Migration from config.json (P0)
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 936
    url: https://github.com/anton-abyzov/specweave/issues/936
---

# US-007: Migration from config.json (P0)

**Feature**: [FS-145](./FEATURE.md)

**As a** SpecWeave user with existing projects in config.json
**I want** my projects automatically migrated to the new registry
**So that** I don't lose my project configuration

---

## Acceptance Criteria

- [x] **AC-US7-01**: On first run, detect `config.json` projects (single or multi-project)
- [x] **AC-US7-02**: Create `projects.json` with migrated data
- [x] **AC-US7-03**: Preserve backward compatibility: read from both sources during transition
- [x] **AC-US7-04**: Log migration: "Migrated N projects to registry"
- [x] **AC-US7-05**: Don't delete config.json projects (read-only migration)

---

## Implementation

**Increment**: [0145-project-registry-eda-sync](../../../../increments/0145-project-registry-eda-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Implement Migration from config.json
