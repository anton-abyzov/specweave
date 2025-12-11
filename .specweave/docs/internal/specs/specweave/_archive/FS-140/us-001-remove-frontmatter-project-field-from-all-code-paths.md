---
id: US-001
feature: FS-140
title: Remove Frontmatter Project Field from All Code Paths
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 898
    url: https://github.com/anton-abyzov/specweave/issues/898
---

# US-001: Remove Frontmatter Project Field from All Code Paths

**Feature**: [FS-140](./FEATURE.md)

**As a** developer maintaining SpecWeave
**I want** the frontmatter `project:` field removed from all code paths
**So that** there's a single source of truth (per-US fields) and no confusion

---

## Acceptance Criteria

- [x] **AC-US1-01**: `living-docs-sync.ts:182` no longer references `parsed.frontmatter.project`
- [x] **AC-US1-02**: `living-docs-sync.ts:1188` no longer uses `frontmatter.project` as fallback
- [x] **AC-US1-03**: `resolveProjectPath()` never reads frontmatter, always uses config/detection
- [x] **AC-US1-04**: `project-detector.ts:199-206` removes frontmatter scoring logic
- [x] **AC-US1-05**: `hierarchy-mapper.ts:603-611` removes frontmatter project detection
- [x] **AC-US1-06**: All 17 files that access `frontmatter.project` updated
- [x] **AC-US1-07**: Zero references to `frontmatter.project` remain in `src/` directory

---

## Implementation

**Increment**: [0140-remove-frontmatter-project-field](../../../../increments/0140-remove-frontmatter-project-field/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-012**: Remove Frontmatter References from project-detector.ts
- [x] **T-013**: Remove Frontmatter References from hierarchy-mapper.ts
- [x] **T-014**: Update spec-identifier-detector.ts
- [x] **T-017**: Verify Zero Frontmatter References in src/
- [x] **T-043**: Remove Deprecated Code
