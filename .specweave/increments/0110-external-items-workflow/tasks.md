# Tasks: External Items Workflow

## Task Overview

| Task | Title | Status | User Story |
|------|-------|--------|------------|
| T-001 | Wire up import-external CLI command | pending | US-001 |
| T-002 | Ensure proper FS-XXXE folder structure | pending | US-001 |
| T-003 | Add external_ref to increment metadata | pending | US-002 |
| T-004 | Detect existing increment for reopen | pending | US-003 |
| T-005 | Implement auto-close on completion | pending | US-004 |
| T-006 | Update living docs status on close | pending | US-004 |
| T-007 | Fix duplicate FS-XXXE folder creation | completed | US-001 |
| T-008 | Implement E-suffix for external increment IDs | completed | US-002 |

---

### T-001: Wire Up import-external CLI Command
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-05
**Status**: [ ] pending

**Description**:
Register the import-external command in the CLI so it's accessible via `specweave import-external`.

**Implementation**:
1. Add command to `src/cli/specweave-cli.ts`
2. Wire up options: `--github-only`, `--since`, `--dry-run`
3. Export function for slash command invocation

**Files**:
- MODIFY: `src/cli/specweave-cli.ts`

---

### T-002: Ensure Proper FS-XXXE Folder Structure
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [ ] pending

**Description**:
Ensure imported items create FS-XXXE folders with proper structure including 2-level support.

**Implementation**:
1. ItemConverter creates `specs/{project}/FS-XXXE/` or `specs/{project}/{board}/FS-XXXE/`
2. Include frontmatter: external_id, external_platform, external_url
3. Preserve labels, description from source

**Files**:
- MODIFY: `src/importers/item-converter.ts`

---

### T-003: Add external_ref to Increment Metadata
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [ ] pending

**Description**:
Add external_ref field to increment metadata schema for linking to external items.

**Implementation**:
1. Add `external_ref?: { id: string; platform: string; url: string; fs_id: string }` to metadata type
2. `/specweave:increment --external FS-042E` populates this field
3. Spec.md includes source link section

**Files**:
- MODIFY: `src/core/types/increment-metadata.ts`
- MODIFY: `src/core/increment/metadata-manager.ts`

---

### T-004: Detect Existing Increment for Reopen
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [ ] pending

**Description**:
Before creating new increment, check if one already exists for the external item.

**Implementation**:
1. Query all increments' external_ref.id
2. If match found, prompt for reopen
3. If reopen, set status to active
4. If new, create with warning about existing

**Files**:
- NEW: `src/core/increment/external-item-detector.ts`
- MODIFY: `plugins/specweave/skills/increment-planner/SKILL.md`

---

### T-005: Implement Auto-Close on Completion
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-05
**Status**: [ ] pending

**Description**:
Auto-close GitHub issues when linked increment completes via /specweave:done.

**Implementation**:
1. In done command, check if increment has external_ref
2. If yes, post completion summary to GitHub issue
3. Close issue with `gh issue close`
4. Respect config option `auto_close_external: true/false`

**Files**:
- MODIFY: `src/cli/commands/done.ts`
- NEW: `src/sync/external-item-closer.ts`

---

### T-006: Update Living Docs Status on Close
**User Story**: US-004
**Satisfies ACs**: AC-US4-04
**Status**: [ ] pending

**Description**:
Update the external item's status in living docs when GitHub issue is closed.

**Implementation**:
1. Find FS-XXXE file in living docs
2. Update frontmatter: `status: closed`, `closed_at: <timestamp>`
3. Update badge/indicator in README

**Files**:
- MODIFY: `src/core/living-docs/living-docs-sync.ts`

---

### T-007: Fix Duplicate FS-XXXE Folder Creation
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed

**Description**:
Fixed bug where multiple empty FS-XXXE folders were created on re-import when all items are duplicates.

**Root Cause**:
Feature folders were allocated BEFORE duplicate detection, causing empty folders to be created when all items in a group were already imported.

**Implementation**:
1. Added `findExistingFeatureFolders()` to scan existing FS-XXXE folders by source_repo
2. Added `groupHasNonDuplicates()` to check if any item in a group is NOT a duplicate
3. Modified `convertItems()` to skip folder creation when all items are duplicates
4. Reuses existing feature folder when source_repo matches

**Files**:
- MODIFIED: `src/importers/item-converter.ts`

**Tests**:
- All 36 item-converter tests pass
- All 19 duplicate-detector tests pass
- All 31 fs-id-allocator tests pass

---

### T-008: Implement E-Suffix for External Increment IDs
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed

**Description**:
Increments working on external items (imported from GitHub/JIRA/ADO) must use E suffix in their ID to maintain consistency with FS-XXXE and US-XXXE conventions.

**Implementation**:
1. Updated `IncrementNumberManager` regex patterns to recognize E suffix: `/^(\d{3,4})E?-/`
2. Added `getNextExternalIncrementNumber()` method returning "XXXXE" format
3. Added `generateIncrementId(name, { isExternal: true })` helper
4. Added `isExternalIncrement(id)` detection utility
5. Added `extractNumber(id)` utility for both internal/external IDs
6. Updated CLAUDE.md with E-suffix convention documentation

**Example**:
```
✅ CORRECT: 0111E-dora-metrics-fix (external GitHub issue)
❌ WRONG:   0111-dora-metrics-fix  (missing E for external)
```

**Files**:
- MODIFIED: `src/core/increment/increment-utils.ts`
- MODIFIED: `tests/unit/increment-utils.test.ts` (13 new tests)
- MODIFIED: `CLAUDE.md` (documented convention)

**Tests**:
- All 40 increment-utils tests pass (including 13 new E-suffix tests)
