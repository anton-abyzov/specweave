---
id: US-001
feature: FS-059
title: "Reduced Template Size"
status: completed
priority: P0
created: 2025-11-26
---

# US-001: Reduced Template Size

**Feature**: [FS-059](./FEATURE.md)

**As a** SpecWeave user in non-Claude environments (Cursor, Copilot)
**I want** a concise AGENTS.md.template (~400 lines)
**So that** my AI tool doesn't crash from context overload

---

## Acceptance Criteria

- [x] **AC-US1-01**: Template reduced from 2402 to ~400 lines
- [x] **AC-US1-02**: All essential instructions preserved (hooks, sync, commands)
- [x] **AC-US1-03**: Non-Claude workflow instructions maintained
- [x] **AC-US1-04**: Section index with search patterns kept
- [x] **AC-US1-05**: Critical rules and file organization preserved

---

## Implementation

**Increment**: [0059-context-optimization-crash-prevention](../../../../../../increments/_archive/0059-context-optimization-crash-prevention/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Analyze current template structure
- [x] **T-002**: Create reduced AGENTS.md.template
- [x] **T-003**: Validate template with non-Claude tool
- [x] **T-012**: End-to-end crash prevention test
