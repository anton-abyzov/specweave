---
id: US-009
feature: FS-125
title: "Hooks Support Per-US Context (P2)"
status: in_progress
priority: P1
created: 2025-12-08
project: specweave
related_projects: [frontend-app]
---

# US-009: Hooks Support Per-US Context (P2)

**Feature**: [FS-125](./FEATURE.md)

**As a** hook developer
**I want** post-task-completion hooks to receive US project context
**So that** hooks can perform project-specific actions

---

## Acceptance Criteria

- [x] **AC-US9-01**: `post_task_completion` hook receives `us.project` in context
- [x] **AC-US9-02**: Hook can trigger project-specific pipelines (e.g., deploy frontend)
- [x] **AC-US9-03**: Hook context includes `increment.crossProjectMode: true` flag
- [ ] **AC-US9-04**: Example hook: "Notify Slack channel per project team" [DEFERRED - optional example]

---

## Implementation

**Increment**: [0125-cross-project-user-story-targeting](../../../../increments/0125-cross-project-user-story-targeting/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-024**: Add US Project Context to Hooks
