---
id: US-003
feature: FS-137
title: "Smart Project Resolution Utility (P1)"
status: completed
priority: P0
created: 2025-12-09
project: specweave
related_projects: []
---

# US-003: Smart Project Resolution Utility (P1)

**Feature**: [FS-137](./FEATURE.md)

**As a** Claude agent generating user stories
**I want** a utility that auto-resolves project/board from US content
**So that** I can suggest projects without always asking the user

---

## Acceptance Criteria

- [x] **AC-US3-01**: Single project → auto-selects silently (no question)
- [x] **AC-US3-02**: Keyword matching → suggests project with confidence level
- [x] **AC-US3-03**: Cross-cutting detection → splits USs across projects
- [x] **AC-US3-04**: Resolution includes `confidence` (high/medium/low) and `reason`
- [x] **AC-US3-05**: Low confidence → prompts user with all options
- [x] **AC-US3-06**: Existing spec patterns learned from `.specweave/increments/*/spec.md`

---

## Implementation

**Increment**: [0137-per-us-project-board-enforcement](../../../../increments/0137-per-us-project-board-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Create ProjectResolver Class
- [x] **T-009**: Implement Keyword Learning from Existing Specs
- [x] **T-010**: Integrate CrossCuttingDetector
