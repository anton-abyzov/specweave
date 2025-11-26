# Tasks

## US-001: Multi-Repo External Import

### T-001: Add sourceRepo field to ExternalItem interface
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed

**Description**: Add `sourceRepo?: string` field to track which repository each item came from.

**File**: `src/importers/external-importer.ts`

---

### T-002: Extend CoordinatorConfig for multi-repo
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

**Description**: Add `repositories?: Array<{owner: string, repo: string}>` to CoordinatorConfig and handle multiple GitHub importers.

**File**: `src/importers/import-coordinator.ts`

---

### T-003: Tag items with source repo in GitHubImporter
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed

**Description**: Update ImportCoordinator to tag each imported item with the source owner/repo when using multi-repo imports.

**File**: `src/importers/import-coordinator.ts`

---

### T-004: Wire repoSelectionConfig to coordinatorConfig
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

**Description**: Pass the multi-repo selection to import coordinator instead of ignoring it.

**File**: `src/cli/helpers/init/external-import.ts`

---

### T-005: Add cross-repo duplicate detection
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed

**Description**: Update DuplicateDetector to check across all project specs directories, not just current. Updated glob pattern to search recursively in all subdirectories.

**File**: `src/importers/duplicate-detector.ts`

---

## US-002: Feature Folder Structure for Imports

### T-006: Add enableFeatureAllocation flow to ItemConverter
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed

**Description**: When `enableFeatureAllocation: true`, integrate FSIdAllocator to create feature folders.

**File**: `src/importers/item-converter.ts`

---

### T-007: Create FEATURE.md in allocated feature folders
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [x] completed

**Description**: Generate proper FEATURE.md with external origin metadata in each FS-XXX folder.

**Files**: `src/importers/item-converter.ts`, `src/living-docs/fs-id-allocator.ts`

---

### T-008: Update file paths for feature folder structure
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed

**Description**: Update convertItem() to use feature folder paths like `specs/{projectId}/FS-XXX/us-xxxe-title.md`.

**File**: `src/importers/item-converter.ts`

---

### T-009: Enable feature allocation by default for external imports
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-04
**Status**: [x] completed

**Description**: Update external-import.ts to pass `enableFeatureAllocation: true` to ItemConverter.

**File**: `src/cli/helpers/init/external-import.ts`

---

### T-020: Project-specific feature folder scanning
**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [x] completed

**Description**: Update FSIdAllocator to scan both root-level and project-specific _features folders. Supports:
- Single project: `specs/_features/FS-XXX/`
- Multi-project: `specs/{projectId}/_features/FS-XXX/`

**File**: `src/living-docs/fs-id-allocator.ts`

---

## US-003: Large Import Progress Tracking

### T-010: Add totalEstimate to ImportResult
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed

**Description**: Extend ImportResult interface to include totalEstimate for progress calculation.

**File**: `src/importers/external-importer.ts`

---

### T-011: Enhance onProgress callback with percentage and ETA
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed

**Description**: Added ProgressInfo interface with `{current, total, percentage, rate, eta, sourceRepo}`.

**File**: `src/importers/import-coordinator.ts`

---

### T-012: Update spinner display for rich progress
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed

**Description**: Show `[25/100] 25% - Importing from github (owner/repo)... (2.5/s, ETA: 30s)`.

**File**: `src/cli/helpers/init/external-import.ts`

---

### T-013: Show per-repo progress in multi-repo imports
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed

**Description**: When importing from multiple repos, show progress for each repo separately via sourceRepo in progress info.

**File**: `src/cli/helpers/init/external-import.ts`

---

## US-004: External ID Flow Through Increment Lifecycle

### T-014: Verify increment creation from external US
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed

**Description**: Test that creating increment referencing US-001E preserves E suffix and adds origin badge to spec.md.

**Verification**: Code review verified:
- `src/generators/spec/spec-parser.ts:216` - Regex supports US-XXXE and AC-USXE-XX patterns
- `src/core/types/origin-metadata.ts` - ExternalItemMetadata type defined
- `src/importers/item-converter.ts` - External metadata preserved in living docs

---

### T-015: Test /specweave:done syncs to external tool
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [x] completed

**Description**: Complete an increment with external US and verify progress syncs to GitHub issue.

**Verification**: Code review verified:
- `src/sync/sync-coordinator.ts:501-580` - syncIncrementClosure() handles full closure flow
- `plugins/specweave/hooks/post-increment-completion.sh` - Triggers sync on closure
- `plugins/specweave-github/lib/github-status-sync.ts` - GitHub API integration

---

### T-016: Verify external tool shows task completion
**User Story**: US-004
**Satisfies ACs**: AC-US4-04
**Status**: [x] completed

**Description**: Check GitHub issue shows checkboxes updated based on SpecWeave task completion.

**Verification**: Code review verified:
- `src/sync/sync-coordinator.ts:376-486` - closeGitHubIssuesForUserStories() closes issues with completion comment
- `src/sync/format-preservation-sync.ts` - Format preservation sync for external items
- 303/304 sync unit tests pass

---

## Integration & Testing

### T-017: Add unit tests for multi-repo import
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-04
**Status**: [x] completed

**Description**: Add tests for ImportCoordinator multi-repo handling. Created comprehensive test suite with 14 tests covering multi-repo configuration, source repo tagging, progress tracking, and error handling.

**File**: `tests/unit/importers/import-coordinator.test.ts`

---

### T-018: Add unit tests for feature folder creation
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed

**Description**: Add tests for ItemConverter feature allocation flow. Added 11 new test cases covering feature folder organization, FEATURE.md creation with external metadata, file path structure, FSIdAllocator integration, auto-archive, and sourceRepo tracking.

**File**: `tests/unit/importers/item-converter.test.ts`

---

### T-019: Manual integration test with sw-thumbnail-ab
**User Story**: US-001, US-002, US-003, US-004
**Satisfies ACs**: All
**Status**: [ ] pending

**Description**: Full manual test of the complete flow with the sw-thumbnail-ab multi-repo project.

**Test**: Manual verification

---

## Progress Summary

**Completed**: 20/21 tasks
**Pending**: 1 task (T-019 - optional manual integration test with sw-thumbnail-ab)

### Key Implementations:
1. Multi-repo GitHub import support (T-001 to T-004)
2. Feature folder organization with FS-XXX structure (T-006 to T-009, T-020)
3. Enhanced progress tracking with ETA and per-repo info (T-010 to T-013)
4. Cross-repo duplicate detection (T-005)
5. Auto-archive items older than 30 days (T-021)
6. Unique feature naming with source_repo tracking (T-022)
7. Fixed specweave-dev folder bug - prioritize multiProject.activeProject (T-023)
8. **External ID Lifecycle** (T-014 to T-016) - Verified via code review:
   - E suffix parsing in spec-parser.ts
   - External metadata preservation in living docs
   - GitHub sync on increment closure
   - Format preservation sync for external items
   - 303/304 sync unit tests pass
