---
id: US-008
feature: FS-140
title: Update Documentation and Best Practices
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 905
    url: https://github.com/anton-abyzov/specweave/issues/905
---

# US-008: Update Documentation and Best Practices

**Feature**: [FS-140](./FEATURE.md)

**As a** SpecWeave user reading documentation
**I want** updated docs that reflect the new architecture
**So that** I understand how to create and manage increments correctly

---

## Acceptance Criteria

- [x] **AC-US8-01**: CLAUDE.md section 2c completely rewritten to remove frontmatter references
- [x] **AC-US8-02**: `increment-planner/SKILL.md` updated with new best practices
- [x] **AC-US8-03**: `specweave-framework/SKILL.md` updated to explain resolution service
- [x] **AC-US8-04**: ADR created explaining architectural decision
- [x] **AC-US8-05**: Migration guide added to docs
- [x] **AC-US8-06**: FAQ added explaining per-US vs frontmatter

---

## Implementation

**Increment**: [0140-remove-frontmatter-project-field](../../../../increments/0140-remove-frontmatter-project-field/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-029**: Rewrite CLAUDE.md Section 2c
- [x] **T-030**: Update Skill Documentation
- [x] **T-031**: Create ADR for Architectural Decision
- [x] **T-032**: Add Migration Guide
- [x] **T-033**: Add FAQ
- [x] **T-044**: Final Documentation Review
