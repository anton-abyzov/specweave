---
id: US-003
feature: FS-073
title: "Support Task IDs Beyond 999"
status: not_started
priority: P1
created: 2025-11-26
---

# US-003: Support Task IDs Beyond 999

**Feature**: [FS-073](./FEATURE.md)

**As a** SpecWeave user with large increments
**I want** task IDs (T-XXX) to work beyond T-999
**So that** I can have 1000+ tasks in large increments

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Task ID validation accepts T-001 through T-9999+
- [ ] **AC-US3-02**: Task header parsing works for T-1000, T-1234
- [ ] **AC-US3-03**: Task dependency parsing accepts T-1000+ references
- [ ] **AC-US3-04**: Three-file validator correctly identifies T-1000+ tasks

---

## Implementation

**Increment**: [0073-fix-y2k-id-limit-bug](../../../../../../increments/_archive/0073-fix-y2k-id-limit-bug/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Fix task-parser.ts patterns for T-XXX and US-XXX
- [x] **T-008**: Fix three-file-validator.ts patterns for T-XXX
