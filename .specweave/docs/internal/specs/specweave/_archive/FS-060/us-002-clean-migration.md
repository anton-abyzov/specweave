---
id: US-002
feature: FS-060
title: "Clean Migration"
status: completed
priority: critical
created: 2025-11-26
---

# US-002: Clean Migration

**Feature**: [FS-060](./FEATURE.md)

**As a** developer
**I want** consistent use of the modular inquirer API
**So that** the codebase is maintainable and type-safe

---

## Acceptance Criteria

- [x] **AC-US2-01**: All files use `@inquirer/prompts` imports
- [x] **AC-US2-02**: Legacy `inquirer` import removed from all files
- [x] **AC-US2-03**: TypeScript types work correctly with new API
- [x] **AC-US2-04**: All 18 affected files migrated (actually 20+ including plugins)

---

## Implementation

**Increment**: [0060-migrate-inquirer-to-modular-api](../../../../../../increments/_archive/0060-migrate-inquirer-to-modular-api/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Install @inquirer/prompts package
- [x] **T-002**: Migrate src/cli/commands/init.ts (8 occurrences)
- [x] **T-003**: Migrate src/core/repo-structure/repo-structure-manager.ts (10 occurrences)
- [x] **T-004**: Migrate src/utils/external-resource-validator.ts (4 occurrences)
- [x] **T-005**: Migrate src/cli/helpers/github-repo-selector.ts (3 occurrences)
- [x] **T-006**: Migrate src/cli/helpers/issue-tracker/github.ts (3 occurrences)
- [x] **T-007**: Migrate src/cli/helpers/ado-area-path-mapper.ts (3 occurrences)
- [x] **T-008**: Migrate remaining 11 files (11 occurrences)
- [x] **T-009**: Remove legacy inquirer imports
- [x] **T-010**: Build and test
