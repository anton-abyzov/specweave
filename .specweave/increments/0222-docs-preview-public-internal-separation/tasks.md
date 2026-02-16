---
increment: 0222-docs-preview-public-internal-separation
---

# Tasks

### T-001: Add DocScope type and scope constants
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Test**: Given types.ts → When DocScope type added → Then SCOPE_PORTS, SCOPE_SITE_DIRS, SCOPE_DOC_DIRS exported
**File**: `src/utils/docs-preview/types.ts`

### T-002: Update docusaurus-setup.ts with scope parameter
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04 | **Status**: [x] completed
**Test**: Given quickSetup/launchPreview → When scope='public' → Then uses port 3016 and docs-site-public dir
**File**: `src/utils/docs-preview/docusaurus-setup.ts`

### T-003: Update CLI commands with scope option
**User Story**: US-001, US-002 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [x] completed
**Test**: Given docsPreviewCommand → When scope='public' → Then passes scope to launchPreview with port 3016
**File**: `src/cli/commands/docs.ts`

### T-004: Update CLI registration with --scope flag
**User Story**: US-001, US-002 | **Satisfies ACs**: AC-US1-02, AC-US2-01, AC-US2-02 | **Status**: [x] completed
**Test**: Given CLI → When --scope public passed → Then scope='public' forwarded to command handler
**File**: `bin/specweave.js`

### T-005: Update index.ts re-exports
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**File**: `src/utils/docs-preview/index.ts`

### T-006: Update docsStatusCommand for both scopes
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed
**Test**: Given docsStatusCommand → When called → Then shows both internal and public docs info
**File**: `src/cli/commands/docs.ts`

### T-007: Update tests for scope functionality
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02 | **Status**: [x] completed
**Test**: Given existing tests → When run → Then all pass; new scope=public tests pass
**File**: `tests/unit/cli/commands/docs.test.ts`

### T-008: Update plugin skill docs
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [x] completed
**File**: `plugins/specweave-docs/skills/preview/SKILL.md`

### T-009: Build and verify
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01 | **Status**: [x] completed
**Test**: Given all changes → When npm run rebuild && npm test → Then build succeeds and all tests pass
