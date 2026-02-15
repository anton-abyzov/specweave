---
id: US-003
title: Consistent project root detection
status: completed
priority: P2
---

# US-003: Consistent project root detection

**As a** SpecWeave developer
**I want** all project root detection to require `config.json`
**So that** stale folders are never mistaken for valid projects

## Acceptance Criteria

- [x] **AC-US3-01**: `src/utils/find-project-root.ts` checks for `config.json`
- [x] **AC-US3-02**: `update.ts` `isSpecWeaveProject` check uses `config.json`
- [x] **AC-US3-03**: Tests cover stale folder scenarios including stale parent + valid child
