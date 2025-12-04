---
id: US-001
feature: FS-049
title: "Smart Pagination During Init (50-Project Limit)"
status: completed
priority: P1
created: 2025-11-21
---

# US-001: Smart Pagination During Init (50-Project Limit)

**Feature**: [FS-049](./FEATURE.md)

**As a** DevOps engineer configuring SpecWeave for a large organization
**I want** initialization to complete in < 30 seconds even with 500+ projects
**So that** I can get started immediately without waiting 5 minutes

---

## Acceptance Criteria

- [x] **AC-US1-01**: Fetch project count ONLY during init (lightweight API call)
- [x] **AC-US1-02**: Show total project count to user upfront
- [x] **AC-US1-03**: Limit initial load to 50 projects maximum
- [x] **AC-US1-04**: "Import all" option fetches remaining projects asynchronously
- [x] **AC-US1-05**: Init completes < 30 seconds for 100+ project instances
- [x] **AC-US1-06**: Cancelation support (Ctrl+C) saves partial progress

---

## Implementation

**Increment**: [0049-cli-first-init-flow](../../../../../../increments/_archive/0049-cli-first-init-flow/spec.md)

**Tasks**: See increment tasks.md for implementation details.
