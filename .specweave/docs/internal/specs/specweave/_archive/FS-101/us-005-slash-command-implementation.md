---
id: US-005
feature: FS-101
title: "Slash Command Implementation"
status: completed
priority: P2
created: 2025-12-03
---

**Origin**: 🏠 **Internal**


# US-005: Slash Command Implementation

**Feature**: [FS-101](./FEATURE.md)

**As a** user
**I want** `/specweave:judge` as a slash command
**So that** I can invoke it easily from Claude Code

---

## Acceptance Criteria

- [x] **AC-US5-01**: Command registered in `plugins/specweave/commands/`
- [x] **AC-US5-02**: Command provides usage help when invoked without args
- [x] **AC-US5-03**: Command handles errors gracefully with clear messages

---

## Implementation

**Increment**: [0101-judge-llm-command](../../../../increments/0101-judge-llm-command/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../increments/0101-judge-llm-command/tasks.md#T-001): Create slash command file
- [x] [T-006](../../../../increments/0101-judge-llm-command/tasks.md#T-006): Integration and CLI wiring