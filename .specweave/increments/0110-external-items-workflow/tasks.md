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
