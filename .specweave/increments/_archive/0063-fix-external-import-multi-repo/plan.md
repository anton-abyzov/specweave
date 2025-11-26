# Implementation Plan

## Overview

Fix the external work item import flow to properly support multi-repo setups, feature folder organization, and progress tracking.

## Technical Analysis

### Root Cause Analysis

**Bug 1: Multi-repo selection ignored**
- Location: `src/cli/helpers/init/external-import.ts` lines 67-131
- `promptMultiRepoSelection()` saves repos to config.json
- But `coordinatorConfig` only uses single `github.owner`/`github.repo`
- The `repoSelectionConfig.repositories` array is never used

**Bug 2: Feature folders not created**
- Location: `src/importers/item-converter.ts` line 135
- Files written directly to `specsDir` without FS-XXX structure
- `enableFeatureAllocation` option exists but never used
- `FSIdAllocator.createFeatureFolder()` exists but not integrated

**Bug 3: No progress tracking**
- Location: `src/cli/helpers/init/external-import.ts` line 196-198
- Spinner only shows current count, no total/percentage/ETA

## Implementation Plan

### Phase 1: Multi-Repo Import Support

1. **Extend ImportCoordinator config** (import-coordinator.ts)
   - Add `repositories?: Array<{owner: string, repo: string}>` to CoordinatorConfig
   - Create multiple GitHubImporter instances when repositories array provided
   - Aggregate results from all repos with source tagging

2. **Wire multi-repo selection to import** (external-import.ts)
   - Pass `repoSelectionConfig.repositories` to coordinatorConfig
   - Handle single-repo fallback for non-multi-repo setup

3. **Add source tagging to ExternalItem**
   - Add `sourceRepo?: string` field to ExternalItem interface
   - GitHubImporter tags items with owner/repo

### Phase 2: Feature Folder Organization

1. **Integrate FSIdAllocator with ItemConverter**
   - When `enableFeatureAllocation: true`, use FSIdAllocator
   - Create FS-XXXE folders for external items
   - Place user stories inside feature folders

2. **Update ItemConverter.convertItems()**
   - Add optional `featureGrouping` parameter
   - Group items by external feature/epic (labels or parent issue)
   - Create FEATURE.md in each FS-XXX folder

3. **Update file paths in converted items**
   - Files go to `specs/default/FS-XXX/us-xxxe-title.md`

### Phase 3: Progress Tracking

1. **Add pagination metadata to Importer**
   - Extend ImportResult with `totalEstimate?: number`
   - GitHub API provides total_count in search responses

2. **Enhance progress callback**
   - Add `total`, `percentage`, `rate`, `eta` to onProgress
   - Track items per second for ETA calculation

3. **Update spinner display**
   - Show `[25/100] 25% - Importing from github... (2.5/s, ETA: 30s)`

### Phase 4: External ID Lifecycle

1. **Verify increment creation from external US**
   - Test creating increment that references US-001E
   - Ensure spec.md gets external origin badge

2. **Test /specweave:done sync**
   - Complete increment with external US
   - Verify progress syncs to GitHub issue

## File Changes Summary

| File | Changes |
|------|---------|
| `src/importers/external-importer.ts` | Add sourceRepo to ExternalItem |
| `src/importers/import-coordinator.ts` | Add multi-repo support |
| `src/importers/github-importer.ts` | Tag items with source repo |
| `src/importers/item-converter.ts` | Integrate FSIdAllocator |
| `src/cli/helpers/init/external-import.ts` | Wire multi-repo config, progress |
| `src/living-docs/fs-id-allocator.ts` | Minor fixes for external grouping |

## Testing Strategy

1. Unit tests for multi-repo import
2. Integration test with mock GitHub responses
3. Manual test with sw-thumbnail-ab project
4. Verify folder structure created correctly
