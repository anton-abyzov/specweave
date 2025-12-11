---
id: US-003
feature: FS-119
title: CLI Helper for Project Selection (P2)
status: completed
priority: P1
created: 2025-12-07
project: specweave
external:
  github:
    issue: 849
    url: https://github.com/anton-abyzov/specweave/issues/849
---

# US-003: CLI Helper for Project Selection (P2)

**Feature**: [FS-119](./FEATURE.md)

**As a** Claude Code agent following increment-planner skill
**I want** a CLI command that returns project/board context as JSON
**So that** I can inject correct values into spec.md template

---

## Acceptance Criteria

- [x] **AC-US3-01**: Command `specweave context projects` returns JSON with available projects
- [x] **AC-US3-02**: Command `specweave context boards --project=<id>` returns boards for project
- [x] **AC-US3-03**: Command `specweave context select` runs interactive selection
- [x] **AC-US3-04**: Output includes structure level (1 or 2)
- [x] **AC-US3-05**: Output includes detection reason for debugging

---

## Implementation

**Increment**: [0119-project-board-context-enforcement](../../../../increments/0119-project-board-context-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create CLI context command with projects subcommand ⚡
- [x] **T-002**: Add boards subcommand with project filter ⚡
- [x] **T-003**: Add interactive select subcommand 🧠
