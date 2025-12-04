---
id: US-003
feature: FS-101
title: "Validation Modes"
status: completed
priority: P2
created: 2025-12-03
---

# US-003: Validation Modes

**Feature**: [FS-101](./FEATURE.md)

**As a** developer
**I want** different validation depths
**So that** I can balance thoroughness vs speed/cost

---

## Acceptance Criteria

- [x] **AC-US3-01**: `--quick` mode for fast validation (~10 seconds)
- [x] **AC-US3-02**: `--deep` mode uses extended thinking (default for Opus)
- [x] **AC-US3-03**: `--strict` mode fails on any concern
- [x] **AC-US3-04**: Default mode auto-selects based on model capability

---

## Implementation

**Increment**: [0101-judge-llm-command](../../../../increments/0101-judge-llm-command/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Implement judge LLM evaluation logic
