---
id: US-003
feature: FS-115
title: Confidence-Based Decisions (P1)
status: completed
priority: P1
created: 2025-12-06
project: specweave
external:
  github:
    issue: 840
    url: https://github.com/anton-abyzov/specweave/issues/840
---

# US-003: Confidence-Based Decisions (P1)

**Feature**: [FS-115](./FEATURE.md)

**As a** developer
**I want** confidence-based decision making
**So that** high-confidence auto-selects, low-confidence asks

---

## Acceptance Criteria

- [x] **AC-US3-01**: >80% → auto-select, 50-80% → suggest, <50% → ask
- [x] **AC-US3-02**: Within 15% → auto-split across projects

---

## Implementation

**Increment**: [0115-ultra-smart-project-selection](../../../../increments/0115-ultra-smart-project-selection/spec.md)

**Tasks**: See increment tasks.md for implementation details.
