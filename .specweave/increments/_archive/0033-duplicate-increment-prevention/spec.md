---
title: Duplicate Increment Prevention System
increment: "0033"
type: feature
priority: P1
status: completed
created: "2025-11-14"
completed: "2025-11-14"
---

# Increment 0033: Duplicate Increment Prevention System

## Quick Overview

Implement comprehensive validation system to prevent increments from existing in multiple locations (active, archive, abandoned) or having duplicate increment numbers with different names. This addresses critical data integrity issues discovered in increments 0031 and 0032.

## Background

### Problems Discovered

1. **Increment 0031**: Existed in BOTH active and archive folders simultaneously
   - Active: `.specweave/increments/0031-external-tool-status-sync` (status: "active")
   - Archive: `.specweave/increments/_archive/0031-external-tool-status-sync` (status: "completed")

2. **Increment 0032**: Had TWO different names with same increment number
   - `.specweave/increments/0032-increment-number-gap-prevention` (newer)
   - `.specweave/increments/0032-prevent-increment-number-gaps` (older)

### Root Causes

- ❌ No validation when creating new increments
- ❌ No validation when reopening archived increments
- ❌ No validation when archiving completed increments
- ❌ No conflict detection for duplicate increment numbers
- ❌ No auto-resolution based on recency/status

## User Stories

### US-001: Prevent Duplicate Locations

**As a** developer
**I want** the system to prevent increments from existing in multiple locations
**So that** I don't have data inconsistency and confusion about which version is authoritative

**Acceptance Criteria:**

**AC-US1-01**: System validates increment uniqueness before creating new increment
- Check: increment number not already used in active, archive, or abandoned folders
- Reject: if duplicate found with different name
- Warn: if exact match found in archive (offer to restore instead of create)

**AC-US1-02**: System validates uniqueness before archiving increment
- Check: increment doesn't already exist in archive folder
- Reject: if duplicate found
- Offer: delete from archive first, then retry

**AC-US1-03**: System validates uniqueness when reopening archived increment
- Check: increment doesn't already exist in active folder
- Reject: if duplicate found
- Offer: delete from active first, or merge content

**AC-US1-04**: System provides clear error messages with resolution steps
- Error format: "Increment 0031 exists in both active and archive locations"
- Resolution: "Run `fix-duplicates` command or manually remove one version"
- Auto-detect: most recent activity, active status, completeness

### US-002: Auto-Detect and Resolve Conflicts

**As a** developer
**I want** the system to automatically detect and resolve duplicate conflicts
**So that** I don't have to manually investigate and clean up

**Acceptance Criteria:**

**AC-US2-01**: Conflict detection algorithm prioritizes based on:
- 1st: Active status > Completed > Paused > Backlog > Abandoned
- 2nd: Most recent lastActivity timestamp
- 3rd: Most complete (more files, larger size, more tasks)
- 4th: Location preference: active > paused > archive > abandoned

**AC-US2-02**: Auto-resolution command merges valuable content
- Copy reports/ folder from losing version to winning version
- Preserve completion summaries, session notes
- Merge metadata (take union of GitHub/JIRA links)
- Log merge operation in reports/DUPLICATE-RESOLUTION-{timestamp}.md

**AC-US2-03**: Dry-run mode shows what would be done without making changes
- Flag: `--dry-run`
- Output: shows winning version, losing version, merge plan, deletion plan
- User can review before confirming

**AC-US2-04**: Safe mode requires user confirmation before deletion
- Default: safe mode ON
- Prompt: "Delete {path}? This will permanently remove {N} files. [y/N]"
- Force flag: `--force` skips prompts (for CI/automated scripts)

### US-003: Manual Archive with Configurable Threshold

**As a** developer
**I want** to manually archive completed increments when I'm ready
**So that** I can keep ~10 completed increments visible for reference

**Acceptance Criteria:**

**AC-US3-01**: Completed increments stay in active folder by default
- No auto-archiving on `/specweave:done`
- User decides when to archive (typically after 10+ completed increments accumulate)

**AC-US3-02**: Manual archive command with configurable threshold
- Command: `/specweave:archive --keep-last 10`
- Default: keep last 10 increments (configurable)
- Archives oldest completed increments first
- Never archives active, paused, or backlog increments

**AC-US3-03**: Archive command respects external sync status
- Skip: increments with open GitHub issues
- Skip: increments with JIRA status != "Done"
- Skip: increments with Azure DevOps state != "Closed"
- Warn: user about skipped increments

**AC-US3-04**: Bulk archive with filtering
- Filter by: age (--older-than 90d), status (--status completed), pattern (--pattern "feature-*")
- Example: `specweave:archive --older-than 90d --keep-last 5`
- Dry-run: `specweave:archive --dry-run --older-than 90d`

### US-004: Comprehensive Test Coverage

**As a** contributor
**I want** comprehensive tests for duplicate prevention
**So that** this bug never happens again

**Acceptance Criteria:**

**AC-US4-01**: Unit tests for duplicate detection logic
- Test: detectDuplicates() finds increments in multiple locations
- Test: conflictResolution() picks correct winner based on priority
- Test: mergeDuplicates() preserves valuable content
- Coverage: >90%

**AC-US4-02**: Integration tests for full lifecycle
- Test: create → complete → archive → reopen (no duplicates created)
- Test: manual archive with threshold (keeps last N)
- Test: bulk archive with filters (archives correct increments)
- Coverage: >85%

**AC-US4-03**: E2E tests for error scenarios
- Test: attempt to create increment with duplicate number (rejected)
- Test: attempt to archive increment that already exists in archive (rejected)
- Test: reopen increment that exists in both active and archive (conflict detected)
- Coverage: >80%

**AC-US4-04**: Test data setup and teardown
- Setup: create test increments in multiple locations
- Teardown: clean up test increments
- Isolation: tests don't affect real .specweave/ folder

## Technical Requirements

### TR-001: Duplicate Detection Utility

**File**: `src/core/increment/duplicate-detector.ts`

**Exports:**
- `detectDuplicateNumbers(incrementsDir: string): DuplicateReport`
- `detectDuplicateLocations(incrementId: string): LocationReport`
- `resolveConflict(duplicates: Duplicate[], strategy: ConflictStrategy): Resolution`

**Types:**
```typescript
interface DuplicateReport {
  duplicates: Duplicate[];
  totalChecked: number;
  duplicateCount: number;
}

interface Duplicate {
  incrementNumber: string;
  locations: IncrementLocation[];
  recommendedWinner: IncrementLocation;
  losingVersions: IncrementLocation[];
  resolutionReason: string;
}

interface IncrementLocation {
  path: string;
  name: string;
  status: IncrementStatus;
  lastActivity: string;
  fileCount: number;
  totalSize: number;
  hasReports: boolean;
  hasGitHubLink: boolean;
}

type ConflictStrategy = 'most-recent' | 'active-status' | 'most-complete' | 'manual';
```

### TR-002: Prevention in Key Operations

**Modified Files:**
- `src/core/increment/metadata-manager.ts` - Add validation in read/write
- `src/core/increment/increment-archiver.ts` - Add duplicate check before archiving
- `src/cli/commands/increment.ts` - Add duplicate check on creation
- `src/cli/commands/reopen.ts` - Add duplicate check on reopening

**Validation Points:**
1. **Before creating increment**: Check if number already used
2. **Before archiving**: Check if already exists in archive
3. **Before reopening**: Check if already exists in active
4. **On startup**: Scan for existing duplicates and warn

### TR-003: Manual Archive Command

**Command**: `/specweave:archive`

**Options:**
- `--keep-last N` - Keep last N increments (default: 10)
- `--older-than DAYS` - Archive increments older than N days
- `--status STATUS` - Archive only increments with specific status
- `--pattern PATTERN` - Archive increments matching pattern
- `--dry-run` - Show what would be archived without doing it
- `--force` - Skip confirmation prompts

**Example:**
```bash
# Archive completed increments, keeping last 10
/specweave:archive --keep-last 10

# Archive increments older than 90 days
/specweave:archive --older-than 90 --dry-run

# Archive specific pattern
/specweave:archive --pattern "hotfix-*" --force
```

### TR-004: Fix Duplicates Command

**Command**: `/specweave:fix-duplicates`

**Options:**
- `--strategy STRATEGY` - Conflict resolution strategy (default: most-recent)
- `--dry-run` - Show what would be fixed
- `--force` - Skip confirmation
- `--merge` - Merge valuable content before deletion

**Flow:**
1. Scan all increment folders (active, archive, abandoned)
2. Detect duplicates (same number, multiple locations)
3. Apply conflict resolution strategy
4. Merge valuable content (reports, summaries)
5. Delete losing versions
6. Log resolution in reports/

## Out of Scope

- ❌ Auto-archiving on completion (explicit requirement: MANUAL only)
- ❌ Cloud sync between multiple machines
- ❌ Version control integration (git-based duplicate detection)
- ❌ Automatic conflict resolution without user confirmation (default: safe mode)

## Dependencies

- Existing: `MetadataManager`, `IncrementArchiver`
- New: `DuplicateDetector`, `ConflictResolver`, `ContentMerger`

## Success Metrics

- ✅ Zero duplicates detected after implementation
- ✅ 100% of duplicate creation attempts rejected
- ✅ 90%+ test coverage
- ✅ <10ms duplicate detection performance
- ✅ User can manually archive with single command

## Risks

**Risk**: Performance degradation scanning 100+ increments
**Mitigation**: Cache increment metadata, only scan on demand

**Risk**: User accidentally deletes wrong version
**Mitigation**: Safe mode by default, dry-run option, confirmation prompts

**Risk**: Merge conflicts when combining content
**Mitigation**: Simple union merge for metadata, copy all reports (no conflict resolution)

## Timeline

- **Phase 1** (Day 1): Implement DuplicateDetector utility + unit tests
- **Phase 2** (Day 2): Add validation to create/archive/reopen operations + integration tests
- **Phase 3** (Day 3): Implement manual archive command + E2E tests
- **Phase 4** (Day 4): Implement fix-duplicates command + testing
- **Phase 5** (Day 5): Documentation, cleanup, final validation

**Total**: 5 days (T-shirt size: M)
