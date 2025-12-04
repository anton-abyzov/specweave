---
id: US-002
feature: FS-069
title: "Project-Scoped User Story Generation"
status: in_progress
priority: P1
created: 2025-11-26
---

# US-002: Project-Scoped User Story Generation

**Feature**: [FS-069](./FEATURE.md)

**As a** PM planning an increment for multi-project setup
**I want** generated user stories to have project prefixes
**So that** each repo gets only its relevant user stories

---

## Acceptance Criteria

- [x] **AC-US2-01**: Multi-project specs generate `US-FE-001`, `US-BE-001` format
- [x] **AC-US2-02**: Multi-project specs generate `AC-FE-US1-01` format ACs
- [x] **AC-US2-03**: Single-project specs generate `US-001`, `AC-US1-01` format
- [x] **AC-US2-04**: Frontmatter includes `multi_project: true` and `projects:` array

---

## Implementation

**Increment**: [0069-multi-project-spec-generation](../../../../../../increments/_archive/0069-multi-project-spec-generation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Update initial-increment-generator
- [x] **T-004**: Update Spec Generator skill
- [x] **T-005**: Update Increment Planner skill
