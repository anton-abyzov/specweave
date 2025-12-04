---
id: US-002
feature: FS-073
title: "Support User Story IDs Beyond 999"
status: not_started
priority: P1
created: 2025-11-26
---

# US-002: Support User Story IDs Beyond 999

**Feature**: [FS-073](./FEATURE.md)

**As a** SpecWeave user with large projects
**I want** user story IDs (US-XXX) to work beyond US-999
**So that** I can have 1000+ user stories without parsing failures

---

## Acceptance Criteria

- [ ] **AC-US2-01**: User story ID validation accepts US-001 through US-9999+
- [ ] **AC-US2-02**: Task parser correctly parses US-1000, US-1234, US-9999
- [ ] **AC-US2-03**: Spec parser correctly parses US-XXX headers at 1000+
- [ ] **AC-US2-04**: GitHub issue title pattern accepts `[FS-XXX][US-1000]` format
- [ ] **AC-US2-05**: GitHub service can find issues with US-1000+ in title

---

## Implementation

**Increment**: [0073-fix-y2k-id-limit-bug](../../../../../../increments/_archive/0073-fix-y2k-id-limit-bug/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Fix task-parser.ts patterns for T-XXX and US-XXX
- [x] **T-007**: Fix spec-parser.ts patterns for US-XXX
- [x] **T-009**: Fix github-service.ts US-XXX pattern
- [x] **T-010**: Fix user-story-issue-builder.ts patterns
