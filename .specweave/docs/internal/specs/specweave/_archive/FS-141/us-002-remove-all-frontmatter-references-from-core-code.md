---
id: US-002
feature: FS-141
title: Remove All Frontmatter References from Core Code
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 915
    url: https://github.com/anton-abyzov/specweave/issues/915
---

# US-002: Remove All Frontmatter References from Core Code

**Feature**: [FS-141](./FEATURE.md)

**As a** developer maintaining the codebase
**I want** zero references to `frontmatter.project` in `src/` directory
**So that** there's no confusion about the source of truth

---

## Acceptance Criteria

- [x] **AC-US2-01**: `project-detector.ts` removes frontmatter scoring logic (lines 199-206)
- [x] **AC-US2-02**: `hierarchy-mapper.ts` removes `detectProjectsFromFrontmatter()` method
- [x] **AC-US2-03**: `spec-identifier-detector.ts` uses ProjectResolutionService instead of frontmatter
- [x] **AC-US2-04**: GitHub sync (`user-story-issue-builder.ts`) removes frontmatter project labels
- [x] **AC-US2-05**: JIRA and ADO sync use ProjectResolutionService
- [x] **AC-US2-06**: `grep -r "frontmatter\.project" src/` returns zero matches
- [x] **AC-US2-07**: All related tests updated and passing

---

## Implementation

**Increment**: [0141-frontmatter-removal-part1-implementation](../../../../increments/0141-frontmatter-removal-part1-implementation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-012**: Remove Frontmatter References from project-detector.ts
- [x] **T-013**: Remove Frontmatter References from hierarchy-mapper.ts
- [x] **T-014**: Update spec-identifier-detector.ts
- [x] **T-015**: Update GitHub Sync (user-story-issue-builder.ts)
- [x] **T-016**: Update JIRA and ADO Sync
- [x] **T-017**: Verify Zero Frontmatter References in src/
