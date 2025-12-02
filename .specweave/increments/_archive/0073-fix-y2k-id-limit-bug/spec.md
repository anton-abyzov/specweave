---
increment: 0073-fix-y2k-id-limit-bug
title: "Fix Y2K-Style 3-Digit ID Limit Bug"
type: bug
priority: P1
status: completed
created: 2025-11-26
dependencies: []
structure: user-stories
---

# Fix Y2K-Style 3-Digit ID Limit Bug

## Problem Statement

The codebase has **inconsistent digit handling** for IDs (FS-XXX, US-XXX, T-XXX):

- **Generation**: Uses `padStart(3, '0')` → correctly produces FS-1000, US-1000, T-1000
- **Some parsing**: Uses `\d{3,}` (3+ digits) → correctly accepts FS-1000+
- **Other parsing**: Uses `\d{3}` (exactly 3 digits) → **REJECTS** FS-1000+

This is a **Y2K-style time bomb** that will cause system-wide failures when any ID type reaches 1000.

## Impact Analysis

**12 patterns in 7 production files** will break:

| File | Line(s) | Pattern | Impact |
|------|---------|---------|--------|
| `delete-feature.ts` | 18 | `/^FS-\d{3}$/` | Cannot delete FS-1000+ |
| `feature-id-manager.ts` | 253, 324 | `/^FS-\d{3}$/` | Greenfield detection fails |
| `hierarchy-mapper.ts` | 525, 718, 772 | `/^FS-\d{3}E?$/` | Mapping/scanning breaks |
| `fs-id-allocator.ts` | 231, 308 | `/^FS-\d{3}E?$/` | ID allocation breaks |
| `user-story-issue-builder.ts` | 69, 118 | `/^FS-\d{3}$/`, title pattern | GitHub issues rejected |
| `living-docs-sync.ts` | 353 | `/^FS-\d{3}$/` | Sync logic fails |
| `github-service.ts` | 45 | `\[US-\d{3}\]` | Can't find US-1000+ issues |

**Additional affected patterns** (US-XXX, T-XXX):
- `task-parser.ts`: T-XXX and US-XXX patterns (lines 91, 92, 184, 268, 349)
- `spec-parser.ts`: US-XXX patterns (lines 216, 331)
- `three-file-validator.ts`: T-XXX validation (lines 122+)

---

## User Stories

### US-001: Support Feature IDs Beyond 999

**As a** SpecWeave user with large projects
**I want** feature IDs (FS-XXX) to work beyond FS-999
**So that** I can scale to 1000+ features without system failures

**Acceptance Criteria:**

- [ ] **AC-US1-01**: Feature ID validation accepts FS-001 through FS-9999+
- [ ] **AC-US1-02**: `delete-feature` command works for FS-1000, FS-1234, FS-9999
- [ ] **AC-US1-03**: Feature ID generation produces valid IDs at 1000+ (already works)
- [ ] **AC-US1-04**: Greenfield/brownfield detection works for FS-1000+
- [ ] **AC-US1-05**: Living docs sync accepts FS-1000+ feature IDs
- [ ] **AC-US1-06**: All hierarchy mapping/scanning works for FS-1000+ folders

### US-002: Support User Story IDs Beyond 999

**As a** SpecWeave user with large projects
**I want** user story IDs (US-XXX) to work beyond US-999
**So that** I can have 1000+ user stories without parsing failures

**Acceptance Criteria:**

- [ ] **AC-US2-01**: User story ID validation accepts US-001 through US-9999+
- [ ] **AC-US2-02**: Task parser correctly parses US-1000, US-1234, US-9999
- [ ] **AC-US2-03**: Spec parser correctly parses US-XXX headers at 1000+
- [ ] **AC-US2-04**: GitHub issue title pattern accepts `[FS-XXX][US-1000]` format
- [ ] **AC-US2-05**: GitHub service can find issues with US-1000+ in title

### US-003: Support Task IDs Beyond 999

**As a** SpecWeave user with large increments
**I want** task IDs (T-XXX) to work beyond T-999
**So that** I can have 1000+ tasks in large increments

**Acceptance Criteria:**

- [ ] **AC-US3-01**: Task ID validation accepts T-001 through T-9999+
- [ ] **AC-US3-02**: Task header parsing works for T-1000, T-1234
- [ ] **AC-US3-03**: Task dependency parsing accepts T-1000+ references
- [ ] **AC-US3-04**: Three-file validator correctly identifies T-1000+ tasks

### US-004: Maintain Backward Compatibility

**As a** SpecWeave user with existing projects
**I want** existing 3-digit IDs to continue working
**So that** the fix doesn't break any current functionality

**Acceptance Criteria:**

- [ ] **AC-US4-01**: All existing tests pass without modification
- [ ] **AC-US4-02**: FS-001 through FS-999 continue to work
- [ ] **AC-US4-03**: US-001 through US-999 continue to work
- [ ] **AC-US4-04**: T-001 through T-999 continue to work
- [ ] **AC-US4-05**: Error messages updated to reflect new limits (not "exactly 3 digits")

---

## Out of Scope

- Changing the minimum digit count (still requires at least 3 digits)
- Changing ID prefixes (FS-, US-, T-)
- Adding new ID types
- Migration of existing IDs

## Success Criteria

1. All 12+ patterns updated from `\d{3}` to `\d{3,}`
2. All existing tests pass
3. New tests verify 4+ digit IDs work
4. Error messages updated where they mention "exactly 3 digits"
5. No regressions in ID generation or collision detection

## Technical Notes

The fix is simple: change `\d{3}` (exactly 3 digits) to `\d{3,}` (3 or more digits) in all regex patterns. The generation code already handles this correctly via `padStart(3, '0')`.
