---
id: US-004
feature: FS-172
title: CLAUDE.md Embedded Router Instructions
status: not_started
priority: critical
created: 2026-01-19
project: specweave
external:
  github:
    issue: 1026
    url: https://github.com/anton-abyzov/specweave/issues/1026
---

# US-004: CLAUDE.md Embedded Router Instructions

**Feature**: [FS-172](./FEATURE.md)

**As a** user whose hooks might miss something,
**I want** CLAUDE.md to contain fallback routing instructions,
**So that** Claude can install plugins when needed.

---

## Acceptance Criteria

- [ ] **AC-US4-01**: CLAUDE.md template includes "Auto-Loading Fallback" section
- [ ] **AC-US4-02**: Section lists keyword → plugin mappings
- [ ] **AC-US4-03**: Instructions tell Claude to run `specweave load-plugins X --silent` when keywords detected
- [ ] **AC-US4-04**: Instructions include the full command to execute after loading
- [ ] **AC-US4-05**: Template updated via `specweave update-instructions`

---

## Implementation

**Increment**: [0172-true-auto-plugin-loading](../../../../increments/0172-true-auto-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-018**: Add Auto-Loading Section to CLAUDE.md Template
- [ ] **T-019**: Add Plugin Installation Instructions to Template
- [ ] **T-020**: Update update-instructions Command
