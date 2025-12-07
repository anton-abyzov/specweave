---
id: US-004
feature: FS-090
title: "Smart Sampling Strategy"
status: completed
priority: P1
created: 2025-12-02
---

# US-004: Smart Sampling Strategy

**Feature**: [FS-090](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US4-01**: Tier-based sampling: small="all," medium="5/dir," large="3/dir," massive="1/dir"
- [x] **AC-US4-02**: Priority files always read regardless of tier (index.*, main.*, *.config.*, types.*)
- [x] **AC-US4-03**: Skip patterns exclude node_modules, dist, build, tests, minified files
- [x] **AC-US4-04**: Representative file selection uses heuristics (size, imports, exports, name match)
- [x] **AC-US4-05**: Sampling config is logged for transparency
- [x] **AC-US4-06**: SUGGESTIONS.md notes which directories were sampled vs fully analyzed

---

## Implementation

**Increment**: [0090-living-docs-builder](../../../../../increments/0090-living-docs-builder/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Implement Discovery Phase (File Scanning)
