---
id: US-002
feature: FS-051
title: "PM Agent Uses Progressive Disclosure (Priority: P0)"
status: completed
priority: P0
created: 2025-11-21T00:00:00.000Z
---

**Origin**: 🏠 **Internal**


# US-002: PM Agent Uses Progressive Disclosure (Priority: P0)

**Feature**: [FS-051](../../_features/FS-051/FEATURE.md)

**As a** developer using SpecWeave PM agent
**I want** the PM agent to load only relevant workflows
**So that** increment planning doesn't crash

---

## Acceptance Criteria

- [x] **AC-US2-01**: PM agent prompt reduced from 60KB → ≤50KB
- [x] **AC-US2-02**: External sync wizard extracted to skill
- [x] **AC-US2-03**: Closure validation extracted to skill

---

## Implementation

**Increment**: [0051-progressive-disclosure-refactoring](../../../../increments/0051-progressive-disclosure-refactoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-027](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-027): Extract External Sync Wizard from PM Agent
- [x] [T-028](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-028): Extract PM Closure Validation from PM Agent
- [x] [T-029](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-029): Add Response Token Limit to PM Agent
- [x] [T-030](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-030): Document PM Progressive Disclosure Pattern
- [x] [T-031](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-031): Document PM Chunked Execution Pattern
- [x] [T-032](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-032): Create PM Agent Integration Tests