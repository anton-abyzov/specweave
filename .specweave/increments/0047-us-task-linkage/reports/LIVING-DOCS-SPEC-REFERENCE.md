# Living Docs Spec Reference for FS-047

**IMPORTANT**: This document shows what SHOULD be created via `/specweave:sync-docs update`.
Do NOT manually create living docs files - the sync command will generate them automatically.

---

## Expected Living Docs Structure

After running `/specweave:sync-docs update`, the following files will be created:

### Feature Overview
**Path**: `.specweave/docs/internal/specs/_features/FS-047/FEATURE.md`

```markdown
---
id: FS-047
title: "US-Task Linkage Architecture"
type: feature
status: active
priority: P0
created: 2025-11-19
lastUpdated: 2025-11-19
---

# US-Task Linkage Architecture

## Overview

Implement explicit traceability between User Stories, Acceptance Criteria, and Tasks to enable automatic living docs sync and AC validation. This feature addresses a critical gap in SpecWeave's traceability infrastructure where tasks in tasks.md have no explicit connection to their parent User Stories.

**Problem Statement**:
Current broken state:
```
Feature (FS-047)
  ↓
User Stories (US-001, US-002, US-003, US-004, US-005, US-006)
  ↓
Acceptance Criteria (AC-US1-01, AC-US1-02...)
  ↓
  ??? ← NO LINK
  ↓
Tasks (T-001, T-002, T-003...)
```

**Symptoms**:
- Living docs US files show "No tasks defined"
- Can't automatically determine US completion from task status
- Can't trace which tasks implement which ACs
- Manual sync required between tasks.md and living docs
- `/specweave:sync-docs` can't update US task lists

**Business Impact**: Core framework integrity - enables automatic documentation sync, bidirectional traceability (US ↔ Task ↔ AC), and comprehensive quality validation.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md) | 🔄 active | - |

## User Stories

- [US-001: Explicit US-Task Linkage in tasks.md](../../specweave/FS-047/us-001-explicit-us-task-linkage-in-tasks-md.md)
- [US-002: AC-Task Mapping](../../specweave/FS-047/us-002-ac-task-mapping.md)
- [US-003: Automatic Living Docs Sync](../../specweave/FS-047/us-003-automatic-living-docs-sync.md)
- [US-004: AC Coverage Validation](../../specweave/FS-047/us-004-ac-coverage-validation.md)
- [US-005: Progress Tracking by User Story](../../specweave/FS-047/us-005-progress-tracking-by-user-story.md)
- [US-006: Migration Tooling](../../specweave/FS-047/us-006-migration-tooling.md)

## Functional Requirements

### FR-001: Task Format Specification
Tasks MUST have **User Story** field linking to parent US and **Satisfies ACs** field listing covered AC-IDs.
- **Priority**: P0 (Critical)
- **Testable**: Yes

### FR-002: Parser Extensions
`task-parser.ts` MUST extract `userStory` and `satisfiesACs` fields with format validation.
- **Priority**: P0 (Critical)
- **Testable**: Yes

### FR-003: Living Docs Sync Enhancement
`sync-living-docs.js` MUST use userStory field for grouping and update AC checkboxes.
- **Priority**: P0 (Critical)
- **Testable**: Yes

### FR-004: Validation Enhancement
`/specweave:validate` MUST detect uncovered ACs and `/specweave:done` MUST block closure if validation fails.
- **Priority**: P0 (Critical)
- **Testable**: Yes

### FR-005: Progress Tracking Enhancement
`/specweave:progress` MUST display per-US task completion.
- **Priority**: P1 (Important)
- **Testable**: Yes

### FR-006: Backward Compatibility
Parser MUST support both old format (no US linkage) and new format.
- **Priority**: P1 (Important)
- **Testable**: Yes

## Non-Functional Requirements

### NFR-001: Performance
- Parser overhead < 10ms per increment
- Living docs sync < 500ms (p95)
- Validation scans all increments within 2 seconds
- **Priority**: P1 (Important)

### NFR-002: Data Integrity
- Atomic updates: tasks.md and living docs sync or both rollback
- No partial sync states
- **Priority**: P0 (Critical)

### NFR-003: Usability
- Clear validation error messages with suggested fixes
- Interactive migration prompts for ambiguous cases
- **Priority**: P1 (Important)

### NFR-004: Test Coverage
- Parser: 95%+
- Hooks: 85%+
- Validation: 90%+
- **Priority**: P0 (Critical)

## Success Criteria

1. **Living Docs Accuracy**: 100% of US files show actual task lists
2. **AC Coverage Validation**: 100% detection of uncovered ACs
3. **Sync Accuracy**: 100% task completion updates within 1 second
4. **Migration Success**: 90%+ of increments 0001-0046 migrated
5. **Developer Adoption**: 100% of new increments use linkage format

## Dependencies

- ADR-0043: spec.md as Source of Truth
- ADR-0047: Three-File Structure Canonical Definition
- ADR-0030: Intelligent Living Docs Sync
- Increment 0043: Spec-metadata sync infrastructure
- Increment 0046: Console elimination (migration pattern)

## Files Affected (Estimate)

**Core System** (~5 files):
- `src/generators/spec/task-parser.ts`
- `src/generators/spec/spec-generator.ts`
- `plugins/specweave/skills/spec-generator/templates/tasks.md.mustache`
- `src/core/validation/coverage-analyzer.ts` (new)
- `src/core/validation/task-validator.ts` (new)

**Hooks** (~2 files):
- `plugins/specweave/lib/hooks/sync-living-docs.js`
- `plugins/specweave/hooks/post-task-completion.sh`

**Commands** (~2 files):
- `plugins/specweave/commands/specweave-validate.md`
- `plugins/specweave/commands/specweave-done.md`

**Documentation** (~3 files):
- `.specweave/docs/internal/architecture/hld-system.md`
- `CLAUDE.md`
- `.github/CONTRIBUTING.md`

**Migration** (~1 file):
- `scripts/migrate-task-linkage.ts` (new)

**Tests** (~5 files):
- `tests/unit/task-parser.test.ts`
- `tests/unit/coverage-analyzer.test.ts`
- `tests/integration/sync-living-docs.test.ts`
- `tests/integration/validate-command.test.ts`
- `tests/e2e/increment-lifecycle.test.ts`

**Total**: ~18 files impacted
```

### User Story Files
**Path**: `.specweave/docs/internal/specs/specweave/FS-047/us-001-explicit-us-task-linkage-in-tasks-md.md`

```markdown
---
id: US-001
feature: FS-047
title: "Explicit US-Task Linkage in tasks.md"
status: active
priority: P0
created: 2025-11-19
---

# US-001: Explicit US-Task Linkage in tasks.md

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** developer implementing an increment
**I want** tasks to explicitly declare which User Story they belong to
**So that** I can trace implementation back to requirements without manual inference

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Every task has **User Story** field (format: `**User Story**: US-001`)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (parser validates field presence)

- [ ] **AC-US1-02**: Tasks grouped by User Story (section headers: `## User Story: US-001 - Title`)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (structure validation)

- [ ] **AC-US1-03**: Parser extracts `userStory` field and validates format (US-XXX)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (unit tests)

- [ ] **AC-US1-04**: Invalid US references detected (non-existent US-XXX)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (validation tests)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.

## Tasks

(This section will be auto-populated by `/specweave:sync-docs update` after tasks.md is created)

- No tasks defined yet (awaiting task creation)
```

(Similar structure for US-002 through US-006)

---

## Sync Command Usage

To generate the actual living docs files, run:

```bash
/specweave:sync-docs update
```

This will:
1. Parse `.specweave/increments/0047-us-task-linkage/spec.md`
2. Extract User Stories, Acceptance Criteria, Requirements
3. Generate `.specweave/docs/internal/specs/_features/FS-047/FEATURE.md`
4. Generate `.specweave/docs/internal/specs/specweave/FS-047/us-*.md` files (one per User Story)
5. Create bidirectional links between increment and living docs

---

## Validation

After sync, verify:

```bash
# Check feature overview created
ls -la .specweave/docs/internal/specs/_features/FS-047/

# Check user story files created
ls -la .specweave/docs/internal/specs/specweave/FS-047/

# Verify content accuracy
cat .specweave/docs/internal/specs/_features/FS-047/FEATURE.md
```

Expected output:
- Feature overview with all 6 User Stories linked
- 6 individual US files with Acceptance Criteria
- Bidirectional links functional
- "No tasks defined" shown (until tasks.md created)
