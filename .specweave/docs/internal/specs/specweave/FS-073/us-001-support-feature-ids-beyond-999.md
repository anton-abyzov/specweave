---
id: US-001
feature: FS-073
title: "Support Feature IDs Beyond 999"
status: not_started
priority: P1
created: 2025-11-26
---

**Origin**: 🏠 **Internal**


# US-001: Support Feature IDs Beyond 999

**Feature**: [FS-073](./FEATURE.md)

**As a** SpecWeave user with large projects
**I want** feature IDs (FS-XXX) to work beyond FS-999
**So that** I can scale to 1000+ features without system failures

---

## Acceptance Criteria

- [x] **AC-US1-01**: Feature ID validation accepts FS-001 through FS-9999+
- [x] **AC-US1-02**: `delete-feature` command works for FS-1000, FS-1234, FS-9999
- [ ] **AC-US1-03**: Feature ID generation produces valid IDs at 1000+ (already works)
- [x] **AC-US1-04**: Greenfield/brownfield detection works for FS-1000+
- [x] **AC-US1-05**: Living docs sync accepts FS-1000+ feature IDs
- [x] **AC-US1-06**: All hierarchy mapping/scanning works for FS-1000+ folders

---

## Implementation

**Increment**: [0073-fix-y2k-id-limit-bug](../../../../increments/0073-fix-y2k-id-limit-bug/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../increments/0073-fix-y2k-id-limit-bug/tasks.md#T-001): Fix delete-feature.ts validation pattern
- [x] [T-002](../../../../increments/0073-fix-y2k-id-limit-bug/tasks.md#T-002): Fix feature-id-manager.ts greenfield detection
- [x] [T-003](../../../../increments/0073-fix-y2k-id-limit-bug/tasks.md#T-003): Fix hierarchy-mapper.ts patterns
- [x] [T-004](../../../../increments/0073-fix-y2k-id-limit-bug/tasks.md#T-004): Fix fs-id-allocator.ts scanning patterns
- [x] [T-005](../../../../increments/0073-fix-y2k-id-limit-bug/tasks.md#T-005): Fix living-docs-sync.ts increment format check
- [x] [T-010](../../../../increments/0073-fix-y2k-id-limit-bug/tasks.md#T-010): Fix user-story-issue-builder.ts patterns