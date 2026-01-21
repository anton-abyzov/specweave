---
id: US-012
feature: FS-148
title: "2-Level Structure Support (Projects/Boards)"
status: completed
priority: P1
created: 2025-12-29
project: specweave
---

# US-012: 2-Level Structure Support (Projects/Boards)

**Feature**: [FS-148](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US12-01**: Detect 2-level structure from config (`multiProject`, `umbrella`, ADO area paths)
- [x] **AC-US12-02**: When splitting increments, auto-assign to appropriate project based on keywords
- [x] **AC-US12-03**: Auth/login/JWT → backend-api project
- [x] **AC-US12-04**: React/component/UI → frontend-web project
- [x] **AC-US12-05**: Mobile/iOS/Android → mobile-app project
- [x] **AC-US12-06**: When multi-project increment detected, split user stories across projects
- [x] **AC-US12-07**: Each US in spec.md has explicit `**Project**:` field
- [x] **AC-US12-08**: Sync to correct GitHub repo / JIRA project / ADO area path per project

---

## Implementation

**Increment**: [0148-autonomous-execution-auto](../../../../increments/0148-autonomous-execution-auto/spec.md)

**Tasks**: See increment tasks.md for implementation details.
