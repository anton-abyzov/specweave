---
id: US-001
feature: FS-060
title: "Fix Interactive Prompts"
status: completed
priority: critical
created: 2025-11-26
---

# US-001: Fix Interactive Prompts

**Feature**: [FS-060](./FEATURE.md)

**As a** SpecWeave user
**I want** interactive selection prompts to work correctly
**So that** I can initialize projects and configure settings properly

---

## Acceptance Criteria

- [x] **AC-US1-01**: All selection prompts display as arrow-key selectable lists
- [x] **AC-US1-02**: All text input prompts work correctly
- [x] **AC-US1-03**: All confirm (yes/no) prompts work correctly
- [x] **AC-US1-04**: No regression in any interactive flow

---

## Implementation

**Increment**: [0060-migrate-inquirer-to-modular-api](../../../../../../increments/_archive/0060-migrate-inquirer-to-modular-api/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Migrate src/cli/commands/init.ts (8 occurrences)
- [x] **T-003**: Migrate src/core/repo-structure/repo-structure-manager.ts (10 occurrences)
- [x] **T-004**: Migrate src/utils/external-resource-validator.ts (4 occurrences)
- [x] **T-005**: Migrate src/cli/helpers/github-repo-selector.ts (3 occurrences)
- [x] **T-006**: Migrate src/cli/helpers/issue-tracker/github.ts (3 occurrences)
- [x] **T-007**: Migrate src/cli/helpers/ado-area-path-mapper.ts (3 occurrences)
- [x] **T-008**: Migrate remaining 11 files (11 occurrences)
- [x] **T-010**: Build and test
- [x] **T-011**: Update CHANGELOG and version
