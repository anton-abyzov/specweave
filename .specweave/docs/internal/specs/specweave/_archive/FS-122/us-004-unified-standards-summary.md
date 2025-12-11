---
id: US-004
feature: FS-122
title: Unified Standards Summary
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 861
    url: https://github.com/anton-abyzov/specweave/issues/861
---

# US-004: Unified Standards Summary

**Feature**: [FS-122](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US4-01**: Generate `governance/coding-standards.md` as entry point
- [x] **AC-US4-02**: Summary includes detected technologies with confidence levels
- [x] **AC-US4-03**: Summary links to each `governance/standards/{tech}.md`
- [x] **AC-US4-04**: Summary includes shared conventions from `.editorconfig`
- [x] **AC-US4-05**: Summary includes generation timestamp and re-run instructions

---

## Implementation

**Increment**: [0122-multi-technology-governance](../../../../increments/0122-multi-technology-governance/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Create Standards Markdown Generator
- [x] **T-007**: Create Unified Summary Generator
- [x] **T-008**: Integrate with code-standards-detective Agent
