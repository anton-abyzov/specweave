---
id: US-005
feature: FS-155
title: Update CLAUDE.md Template
status: completed
priority: P0
created: 2026-01-06
project: specweave
external:
  github:
    issue: 994
    url: https://github.com/anton-abyzov/specweave/issues/994
---

# US-005: Update CLAUDE.md Template

**Feature**: [FS-155](./FEATURE.md)

**As a** SpecWeave user
**I want** CLAUDE.md to use native patterns
**So that** Claude Code understands the instructions

---

## Acceptance Criteria

- [x] **AC-US5-01**: Remove all `sw:pm:pm` style references
- [x] **AC-US5-02**: Update agent table to simple names
- [x] **AC-US5-03**: Document skills auto-activate (no Task call needed)
- [x] **AC-US5-04**: Document agents need explicit Task invocation

---

## Implementation

**Increment**: [0155-native-plugin-skill-architecture](../../../../increments/0155-native-plugin-skill-architecture/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-009**: Remove Custom Naming from CLAUDE.md
- [x] **T-010**: Update CLAUDE.md Agent Table
