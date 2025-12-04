---
id: US-005
feature: FS-090
title: "Foundation Docs Generation"
status: completed
priority: P1
created: 2025-12-02
---

**Origin**: 🏠 **Internal**


# US-005: Foundation Docs Generation

**Feature**: [FS-090](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US5-01**: Reads only key files: README, configs, entry points, 1-2 samples per top-level dir
- [x] **AC-US5-02**: Generates `overview.md` with project summary, tech stack, main components
- [x] **AC-US5-03**: Generates `tech-stack.md` with detected technologies and versions
- [x] **AC-US5-04**: Generates `modules-skeleton.md` with module list and brief descriptions
- [x] **AC-US5-05**: Foundation docs saved to `.specweave/docs/internal/architecture/`
- [x] **AC-US5-06**: Completes within 1-2 hours for any codebase size

---

## Implementation

**Increment**: [0090-living-docs-builder](../../../../../increments/0090-living-docs-builder/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-004](../../../../../increments/0090-living-docs-builder/tasks.md#T-004): Implement Foundation Builder Phase