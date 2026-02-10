---
id: US-001
feature: FS-143
title: Remove Frontmatter References from Core Files
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 922
    url: https://github.com/anton-abyzov/specweave/issues/922
---

# US-001: Remove Frontmatter References from Core Files

**Feature**: [FS-143](./FEATURE.md)

**As a** developer maintaining SpecWeave
**I want** all `frontmatter.project` references removed from core code
**So that** the codebase uses ProjectResolutionService exclusively

---

## Acceptance Criteria

- [x] **AC-US1-01**: `living-docs-sync.ts` updated with tests (T-011)
- [x] **AC-US1-02**: `project-detector.ts` frontmatter logic removed (T-012)
- [x] **AC-US1-03**: `hierarchy-mapper.ts` frontmatter method removed (T-013)
- [x] **AC-US1-04**: `spec-identifier-detector.ts` uses resolution service (T-014)
- [x] **AC-US1-05**: GitHub sync updated (T-015)
- [x] **AC-US1-06**: JIRA and ADO sync updated (T-016)
- [x] **AC-US1-07**: Zero frontmatter references in src/ (T-017) - 19 refs remain as backward-compat fallbacks per ADR-0140

---

## Implementation

**Increment**: [0143-frontmatter-removal-code-templates-tests](../../../../increments/0143-frontmatter-removal-code-templates-tests/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-012**: Remove Frontmatter References from project-detector.ts
- [x] **T-013**: Remove Frontmatter References from hierarchy-mapper.ts
- [x] **T-014**: Update spec-identifier-detector.ts
- [x] **T-017**: Verify Zero Frontmatter References in src/
