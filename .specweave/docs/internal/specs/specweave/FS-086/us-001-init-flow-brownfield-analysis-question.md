---
id: US-001
feature: FS-086
title: "Init Flow Brownfield Analysis Question"
status: completed
priority: P0
created: 2025-12-01
---

**Origin**: 🏠 **Internal**


# US-001: Init Flow Brownfield Analysis Question

**Feature**: [FS-086](./FEATURE.md)

**As a** developer setting up SpecWeave on an existing project,
**I want** to be asked if I want to analyze my codebase for documentation gaps,
**So that** I can bootstrap living docs from existing code and documentation.

---

## Acceptance Criteria

- [x] **AC-US1-01**: After testing configuration questions, prompt asks about brownfield analysis
- [x] **AC-US1-02**: User can choose analysis depth: Quick (5-10min), Standard (30-60min), Deep (hours)
- [x] **AC-US1-03**: User can specify existing documentation location (auto-detect common paths)
- [ ] **AC-US1-04**: Analysis starts as background job (non-blocking init)
- [x] **AC-US1-05**: Skip option available with clear explanation of what's missed

---

## Implementation

**Increment**: [0086-brownfield-doc-analysis](../../../../../increments/0086-brownfield-doc-analysis/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-003](../../../../../increments/0086-brownfield-doc-analysis/tasks.md#T-003): Add Brownfield Analysis Prompt to Init