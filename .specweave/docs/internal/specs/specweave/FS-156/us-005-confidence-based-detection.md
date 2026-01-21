---
id: US-005
feature: FS-156
title: Confidence-Based Detection
status: completed
priority: P1
created: 2026-01-06
project: specweave
external:
  github:
    issue: 975
    url: https://github.com/anton-abyzov/specweave/issues/975
---

# US-005: Confidence-Based Detection

**Feature**: [FS-156](./FEATURE.md)

**As a** SpecWeave user
**I want** reflection to detect confidence levels automatically
**So that** strong corrections are learned immediately

---

## Acceptance Criteria

- [x] **AC-US5-01**: HIGH confidence: Explicit corrections ("No, use X", "Never do Y")
- [x] **AC-US5-02**: HIGH confidence: Explicit rules ("Always do X")
- [x] **AC-US5-03**: MEDIUM confidence: Approvals ("Perfect!", "That's right")
- [x] **AC-US5-04**: LOW confidence: Observations (patterns that worked)
- [x] **AC-US5-05**: Confidence calculation based on keyword matching

---

## Implementation

**Increment**: [0156-per-skill-reflection-memory-override](../../../../increments/0156-per-skill-reflection-memory-override/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-026**: Create /sw:reflect-status command
