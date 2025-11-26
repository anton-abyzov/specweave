---
id: US-001
feature: FS-073
title: "Support Feature IDs Beyond 999"
status: not_started
priority: P1
created: 2025-11-26
---

# US-001: Support Feature IDs Beyond 999

**Feature**: [FS-073](./FEATURE.md)

**As a** SpecWeave user with large projects
**I want** feature IDs (FS-XXX) to work beyond FS-999
**So that** I can scale to 1000+ features without system failures

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Feature ID validation accepts FS-001 through FS-9999+
- [ ] **AC-US1-02**: `delete-feature` command works for FS-1000, FS-1234, FS-9999
- [ ] **AC-US1-03**: Feature ID generation produces valid IDs at 1000+ (already works)
- [ ] **AC-US1-04**: Greenfield/brownfield detection works for FS-1000+
- [ ] **AC-US1-05**: Living docs sync accepts FS-1000+ feature IDs
- [ ] **AC-US1-06**: All hierarchy mapping/scanning works for FS-1000+ folders

---

## Implementation

**Increment**: [0073-fix-y2k-id-limit-bug](../../../../increments/0073-fix-y2k-id-limit-bug/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
