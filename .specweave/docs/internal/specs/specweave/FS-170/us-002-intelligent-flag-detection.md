---
id: US-002
feature: FS-170
title: "Intelligent Flag Detection"
status: completed
priority: P0
created: 2026-01-20
project: specweave-dev
---

# US-002: Intelligent Flag Detection

**Feature**: [FS-170](./FEATURE.md)

**As a** developer,
**I want** auto mode to suggest flags based on my prompt,
**So that** I don't need to memorize all options.

---

## Acceptance Criteria

- [x] **AC-US2-01**: System analyzes prompts for domain keywords
- [x] **AC-US2-02**: Suggests `--parallel` when 2+ domains detected
- [x] **AC-US2-03**: Suggests `--frontend` for React/Vue/CSS keywords
- [x] **AC-US2-04**: Suggests `--backend` for API/server keywords
- [x] **AC-US2-05**: Suggests `--database` for schema/migration keywords
- [x] **AC-US2-06**: Suggests `--pr` for "pull request" mentions
- [x] **AC-US2-07**: Confidence scores: high (3+ keywords), medium (2), low (1)
- [x] **AC-US2-08**: Suggestions displayed before execution, user can accept/modify
- [x] **AC-US2-09**: Test coverage for prompt analyzer ≥90%

---

## Implementation

**Increment**: [0170-parallel-auto-mode](../../../../increments/0170-parallel-auto-mode/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-009**: Create Prompt Analyzer
- [x] **T-010**: Create Prompt Analyzer Tests (90%+ coverage)
- [x] **T-026**: Update Auto Command Documentation
