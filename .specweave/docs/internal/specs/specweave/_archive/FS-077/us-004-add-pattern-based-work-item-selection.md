---
id: US-004
feature: FS-077
title: "Add Pattern-Based Work Item Selection"
status: completed
priority: P1
created: 2025-11-27
---

# US-004: Add Pattern-Based Work Item Selection

**Feature**: [FS-077](./FEATURE.md)

**As a** developer with many area paths in ADO
**I want** to filter work items by pattern (like GitHub repos)
**So that** I can selectively import relevant items

---

## Acceptance Criteria

- [x] **AC-US4-01**: Add pattern matching for area paths (e.g., `*-Platform`, `*-Service`)
- [x] **AC-US4-02**: Similar UX to `github-repo-selector.ts` (all org, pattern, explicit list)
- [x] **AC-US4-03**: Show preview of matched area paths before confirmation
- [x] **AC-US4-04**: Save selection strategy to config.json

---

## Implementation

**Increment**: [0077-ado-init-flow-critical-fixes](../../../../../../increments/_archive/0077-ado-init-flow-critical-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Create ado-area-selector.ts with pattern matching
- [x] **T-009**: Integrate area selector into ADO init flow
