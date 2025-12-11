---
id: US-004
feature: FS-119
title: Enhanced Skill Instructions with MANDATORY Detection (P1)
status: completed
priority: P1
created: 2025-12-07
project: specweave
external:
  github:
    issue: 850
    url: https://github.com/anton-abyzov/specweave/issues/850
---

# US-004: Enhanced Skill Instructions with MANDATORY Detection (P1)

**Feature**: [FS-119](./FEATURE.md)

**As a** user creating increments via Claude
**I want** the increment-planner skill to MANDATE project detection before spec generation
**So that** Claude always consults the config before generating specs

---

## Acceptance Criteria

- [x] **AC-US4-01**: SKILL.md Step 0B marked as MANDATORY with visual callout
- [x] **AC-US4-02**: Add example Bash command Claude MUST run before generating
- [x] **AC-US4-03**: Add validation that project/board came from detection (not invented)
- [x] **AC-US4-04**: Document error recovery if detection fails

---

## Implementation

**Increment**: [0119-project-board-context-enforcement](../../../../increments/0119-project-board-context-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Update increment-planner SKILL.md with MANDATORY detection 🧠
