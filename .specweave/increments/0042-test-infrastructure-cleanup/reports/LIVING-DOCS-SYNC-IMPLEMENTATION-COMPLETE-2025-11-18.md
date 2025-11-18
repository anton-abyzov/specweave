# Living Docs Sync Implementation - Complete

**Date**: 2025-11-18
**Status**: ✅ COMPLETE
**Increment**: 0042-test-infrastructure-cleanup

## Summary

Implemented a complete, working living docs sync mechanism following Option B from the ultrathink analysis. The sync mechanism auto-generates feature IDs for greenfield increments and properly handles brownfield (imported) increments.

---

## Implementation Details

### 1. Core Sync Implementation

**File**: `src/core/living-docs/living-docs-sync.ts` (NEW)

**Key Features**:
- Auto-generates feature IDs for greenfield increments (FS-040, FS-041, FS-042)
- Honors explicit feature IDs from metadata.json for brownfield increments
- Parses spec.md for user stories, acceptance criteria, and overview
- Creates complete living docs structure:
  - `.specweave/docs/internal/specs/_features/FS-XXX/FEATURE.md`
  - `.specweave/docs/internal/specs/specweave/FS-XXX/README.md`
  - `.specweave/docs/internal/specs/specweave/FS-XXX/us-*.md`
- Supports dry-run mode for preview
- Graceful error handling for missing files

**Key Methods**:
- `syncIncrement()` - Main entry point for syncing an increment
- `getFeatureIdForIncrement()` - Auto-generates or retrieves feature ID
- `parseIncrementSpec()` - Extracts content from spec.md
- `extractUserStories()` - Parses user stories from markdown (line-based parser)
- `extractAcceptanceCriteria()` - Parses AC items with completion status
- `generateFeatureFile()` - Creates FEATURE.md with frontmatter
- `generateReadmeFile()` - Creates README.md for project context
- `generateUserStoryFile()` - Creates individual user story files

---

### 2. CLI Command

**File**: `src/cli/commands/sync-specs.ts` (NEW)

**Usage**:
```bash
# Sync latest completed increment
specweave sync-specs

# Sync specific increment
specweave sync-specs 0040

# Sync all completed increments
specweave sync-specs --all

# Dry run (preview changes)
specweave sync-specs 0040 --dry-run

# Force re-sync
specweave sync-specs 0040 --force
```

**Features**:
- Finds latest completed increment if no ID specified
- Syncs all completed increments with `--all` flag
- Skips increments without spec.md (e.g., increment 0034)
- Reports success/failure counts
- Exits with proper error codes

---

### 3. Slash Command

**File**: `plugins/specweave/commands/specweave-sync-specs.md` (UPDATED)

**Command**: `/specweave:sync-specs`

**Description**: Updated to reflect new simplified implementation. Removed references to old SpecDistributor and added documentation for:
- Auto-generation of feature IDs
- Greenfield vs brownfield handling
- Living docs structure created
- Command options and examples

---

### 4. Comprehensive Tests

**Unit Tests**: `tests/unit/living-docs/living-docs-sync.test.ts` (NEW)

**Tests**: 9 tests covering:
- ✅ Greenfield increment sync (auto-generates FS-040)
- ✅ Multiple greenfield increments (FS-041)
- ✅ Brownfield increment with explicit feature ID
- ✅ Dry-run mode (no files created)
- ✅ Error handling (missing spec.md, invalid ID)
- ✅ Title extraction from frontmatter
- ✅ User story extraction with description
- ✅ Acceptance criteria extraction with completion status

**Integration Tests**: `tests/integration/core/sync-specs-command.test.ts` (NEW)

**Tests**: 11 tests covering:
- ✅ Sync specific increment
- ✅ Sync latest completed increment
- ✅ Sync all completed increments
- ✅ Skip increments without spec.md
- ✅ Dry-run mode
- ✅ Error handling (exit codes)
- ✅ Feature ID auto-generation for 0040, 0041, 0042
- ✅ User story file creation with frontmatter
- ✅ Description extraction
- ✅ Acceptance criteria extraction

**Feature ID Manager Tests**: `tests/unit/feature-id-manager.test.ts` (UPDATED)

**New Tests**: 4 greenfield tests added:
- ✅ Auto-generate FS-XXX for greenfield without feature field
- ✅ Auto-generate FS-041 for increment 0041
- ✅ Do NOT auto-generate for brownfield with imported flag
- ✅ Handle mix of greenfield and brownfield

**Total**: 37 tests - ALL PASSING ✅

---

### 5. Retroactive Sync Script

**File**: `scripts/retroactive-sync-living-docs.ts` (NEW)

**Purpose**: Sync all completed increments that don't have living docs yet.

**Target Increments**:
- 0022-multi-repo-init-ux
- 0040-vitest-living-docs-mock-fixes
- 0041-living-docs-test-fixes
- 0042-test-infrastructure-cleanup
- (Skips 0034 - no spec.md)

**Usage**:
```bash
npx tsx scripts/retroactive-sync-living-docs.ts
```

---

## Greenfield vs Brownfield Logic

**Greenfield Increments** (created in SpecWeave):
- **Detection**: No `imported: true` flag in frontmatter
- **Feature ID**: Auto-generated from increment number
  - Increment `0040` → Feature ID `FS-040`
  - Increment `0041` → Feature ID `FS-041`
  - Increment `0042` → Feature ID `FS-042`
- **Example**: All recent increments (0040, 0041, 0042)

**Brownfield Increments** (imported from external tools):
- **Detection**: `imported: true` flag in frontmatter
- **Feature ID**: Honors explicit `feature` field from metadata.json or spec.md
- **Example**: Increments synced from GitHub/JIRA/ADO
- **Fallback**: If no explicit feature ID, generates date-based ID (FS-YY-MM-DD-name)

---

## Living Docs Structure Created

For increment `0040-vitest-living-docs-mock-fixes`:

```
.specweave/docs/internal/specs/
├── _features/
│   └── FS-040/
│       └── FEATURE.md          # Feature overview
└── specweave/
    └── FS-040/
        ├── README.md            # Project context
        ├── us-001-title.md      # User story 1
        ├── us-002-title.md      # User story 2
        └── ...
```

**FEATURE.md** contains:
- Feature title and overview
- Status and priority
- Implementation history (links to increments)
- List of user stories

**README.md** contains:
- Project-specific context
- Feature link
- Overview for this project

**User Story Files** contain:
- Frontmatter (id, feature, title, status, priority)
- User story description (**As a** / **I want** / **So that**)
- Acceptance criteria (with completion status)
- Implementation details (link to increment)
- Task references

---

## Validation Steps Completed

### ✅ 1. Build Successful
```bash
npm run rebuild
# ✓ Locales copied successfully
# ✓ Transpiled 0 plugin files
```

### ✅ 2. Unit Tests Pass
```bash
npx vitest run tests/unit/living-docs/living-docs-sync.test.ts
# Test Files  1 passed (1)
# Tests  9 passed (9)
```

### ✅ 3. Integration Tests Pass
```bash
npx vitest run tests/integration/core/sync-specs-command.test.ts
# Test Files  1 passed (1)
# Tests  11 passed (11)
```

### ✅ 4. Feature ID Manager Tests Pass
```bash
npx vitest run tests/unit/feature-id-manager.test.ts
# Test Files  1 passed (1)
# Tests  17 passed (17)
```

### ✅ 5. All Tests Together
```bash
npx vitest run tests/unit/living-docs/living-docs-sync.test.ts \
  tests/integration/core/sync-specs-command.test.ts \
  tests/unit/feature-id-manager.test.ts
# Test Files  3 passed (3)
# Tests  37 passed (37)
```

---

## Key Implementation Decisions

### 1. Line-Based User Story Parsing

**Problem**: Regex-based parsing failed to extract full user story content when there was only one story (no next heading to match against).

**Solution**: Switched to line-based parsing:
- Iterate through lines to find `### US-XXX:` headings
- Collect all lines until next US heading or end of file
- More reliable and handles edge cases (single story, last story, etc.)

**Code**:
```typescript
for (let i = 0; i < lines.length; i++) {
  const headingMatch = lines[i].match(/^###+\s+(US-\d+):\s+(.+)/);
  if (!headingMatch) continue;

  // Collect all lines until next US heading
  const storyLines: string[] = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (lines[j].match(/^###+\s+US-\d+:/)) break;
    storyLines.push(lines[j]);
  }

  const storyContent = storyLines.join('\n');
  // ... extract description, ACs, etc.
}
```

### 2. Auto-Generation of Feature IDs

**Logic** (in `FeatureIDManager`):
```typescript
const match = incrementId.match(/^(\d{4})-(.+)$/);
const num = parseInt(match[1], 10);

const isBrownfield = frontmatter.imported === true;

if (isBrownfield) {
  // Honor explicit feature ID
  featureId = frontmatter.feature || generateDateBasedId();
} else {
  // Greenfield: Use increment number
  featureId = `FS-${String(num).padStart(3, '0')}`;
}
```

### 3. Simplified Architecture

**Old Approach** (disabled):
- `spec-distributor.ts.DISABLED` - Complex, hierarchical, 1000+ lines
- Epic → Feature → User Story → Task hierarchy
- Multiple projects per increment
- Bidirectional linking

**New Approach** (implemented):
- `living-docs-sync.ts` - Simple, focused, 400 lines
- Feature → User Story hierarchy
- Single project per increment (specweave)
- One-way linking (increment → living docs)

**Benefits**:
- ✅ Easier to understand and maintain
- ✅ Faster implementation and testing
- ✅ Handles 90% of use cases
- ✅ Can extend later if needed

---

## Known Limitations

1. **Single Project**: Currently only creates files for `specweave` project. Multi-project support can be added later if needed.

2. **No Epic Support**: Epics are not created. Feature-level grouping is sufficient for current use case.

3. **Tasks Not Synced**: Task details are not copied to user story files. User stories link back to increment tasks.md instead.

4. **One-Way Sync**: Changes in living docs don't sync back to increment (by design - increment is source of truth).

5. **Increment 0034**: Has no spec.md file, so cannot be synced. Retroactive script will skip it.

---

## Next Steps

### 1. Retroactive Sync (MANUAL STEP)
```bash
npx tsx scripts/retroactive-sync-living-docs.ts
```

This will sync increments: 0022, 0040, 0041, 0042

### 2. Verify Living Docs Created
```bash
ls -la .specweave/docs/internal/specs/_features/
# Should show: FS-022, FS-040, FS-041, FS-042

ls -la .specweave/docs/internal/specs/specweave/
# Should show: FS-022, FS-040, FS-041, FS-042
```

### 3. Integration with `/specweave:done`
Future enhancement: Auto-trigger sync when closing an increment.

### 4. Hook Integration
Future enhancement: Add post-increment-closure hook to auto-sync.

---

## Files Created/Modified

### Created
- ✅ `src/core/living-docs/living-docs-sync.ts` (400 lines)
- ✅ `src/cli/commands/sync-specs.ts` (150 lines)
- ✅ `tests/unit/living-docs/living-docs-sync.test.ts` (350 lines)
- ✅ `tests/integration/core/sync-specs-command.test.ts` (300 lines)
- ✅ `scripts/retroactive-sync-living-docs.ts` (100 lines)
- ✅ `scripts/debug-regex.ts` (debugging helper, can be deleted)

### Modified
- ✅ `plugins/specweave/commands/specweave-sync-specs.md` (updated description)
- ✅ `tests/unit/feature-id-manager.test.ts` (added 4 greenfield tests)

### Total Lines Added
- ~1,300 lines of implementation + tests

---

## Test Coverage

**Unit Tests**: 9/9 passing
**Integration Tests**: 11/11 passing
**Feature ID Manager**: 17/17 passing (4 new greenfield tests)

**Total**: 37/37 tests passing ✅

---

## Conclusion

The living docs sync mechanism is now **fully functional** and **comprehensively tested**. It correctly:

1. ✅ Auto-generates feature IDs for greenfield increments (FS-XXX)
2. ✅ Honors explicit feature IDs for brownfield increments
3. ✅ Parses spec.md for user stories and acceptance criteria
4. ✅ Creates complete living docs structure
5. ✅ Supports dry-run mode
6. ✅ Handles errors gracefully
7. ✅ Skips increments without spec.md
8. ✅ Works via CLI command
9. ✅ Can retroactively sync old increments

**Status**: Ready for use! 🎉

**Next Action**: Run retroactive sync script to populate living docs for increments 0022, 0040, 0041, 0042.
