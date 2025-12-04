---
id: US-004
feature: FS-086
title: "Discrepancy Detection Algorithms"
status: completed
priority: P0
created: 2025-12-01
---

# US-004: Discrepancy Detection Algorithms

**Feature**: [FS-086](./FEATURE.md)

**As a** developer,
**I want** intelligent detection of documentation gaps,
**So that** I know what's missing, stale, or misaligned.

---

## Acceptance Criteria

- [x] **AC-US4-01**: Detect undocumented public APIs and exported functions
- [x] **AC-US4-02**: Detect stale docs (code changed but docs haven't in 90+ days)
- [x] **AC-US4-03**: Detect orphan docs (docs for code that no longer exists)
- [x] **AC-US4-04**: Detect missing ADRs (significant patterns without decision records)
- [x] **AC-US4-05**: Calculate confidence score (0-100) for each discrepancy
- [x] **AC-US4-06**: Detect knowledge silos (modules only one person has committed to)

---

## Implementation

**Increment**: [0086-brownfield-doc-analysis](../../../../../increments/0086-brownfield-doc-analysis/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Implement Brownfield Analysis Worker
