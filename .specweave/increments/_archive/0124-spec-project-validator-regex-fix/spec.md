---
increment: 0124-spec-project-validator-regex-fix
title: "Fix spec-project-validator Hook Regex to Match All Increment Patterns"
type: bug
priority: P1
status: completed
created: 2025-12-08
structure: user-stories
testMode: test-after
coverageTarget: 80
---

# Fix spec-project-validator Hook Regex

## Problem Statement

The `spec-project-validator.sh` hook is not being triggered for some increment spec.md files because the `matcher_content` regex in `hooks.json` is too restrictive.

### Current Regex (BROKEN)
```
\\.specweave/increments/\\d{4}-[^/]+/spec\\.md
```

This regex:
- ❌ Does NOT match E-suffixed increments: `0001E-feature-name/spec.md`
- ❌ Does NOT match 3-digit increments: `001-feature-name/spec.md` (edge case)
- ✅ Only matches exactly 4 digits: `0001-feature-name/spec.md`

### Evidence

User reported increments created without `project:` and `board:` fields even though:
1. The project has 2-level structure (ADO area paths configured)
2. The `spec-project-validator.sh` hook has correct validation logic
3. The hook just wasn't being triggered due to regex mismatch

### Fix Required

Update `matcher_content` regex to:
```
\\.specweave/increments/\\d{3,4}E?-[^/]+/spec\\.md
```

This regex:
- ✅ Matches 3-4 digit increments: `001-xxx`, `0001-xxx`
- ✅ Matches E-suffixed increments: `0001E-xxx`, `001E-xxx`
- ✅ Still requires spec.md in increment folder

## User Stories

### US-001: Fix Regex to Match All Increment Patterns (P1)
**Project**: specweave

**As a** user creating increments via `/specweave:increment`
**I want** the spec-project-validator hook to trigger for ALL increment patterns
**So that** project/board validation always runs regardless of increment naming

#### Acceptance Criteria

- [x] **AC-US1-01**: Regex matches `0001-feature-name/spec.md` (standard)
- [x] **AC-US1-02**: Regex matches `0001E-external-fix/spec.md` (E-suffix)
- [x] **AC-US1-03**: Regex matches `001-legacy-feature/spec.md` (3-digit edge case)
- [x] **AC-US1-04**: Hook correctly validates project field for 1-level structures
- [x] **AC-US1-05**: Hook correctly validates both project AND board for 2-level structures

---

### US-002: Ensure JIRA Board Detection Works for 2-Level (P1)
**Project**: specweave

**As a** user with JIRA board configuration
**I want** the structure-level-detector to correctly identify 2-level structure for JIRA
**So that** the spec-project-validator enforces both project AND board fields

#### Acceptance Criteria

- [x] **AC-US2-01**: JIRA with multiple boards per project detects as 2-level
- [x] **AC-US2-02**: JIRA with single board per project detects as 1-level (fallback)
- [x] **AC-US2-03**: JIRA boardMapping.boards array properly maps to boardsByProject

---

## Technical Analysis

### Files to Modify

1. **`plugins/specweave/hooks/hooks.json`** - Fix matcher_content regex
2. **`plugins/specweave/hooks/spec-project-validator.sh`** - Already correct, no changes needed
3. **`src/utils/structure-level-detector.ts`** - Verify JIRA 2-level detection logic

### Root Cause

The regex was added in a previous increment but didn't account for:
1. E-suffix convention for external items (added in v0.32.0)
2. Potential 3-digit increments from edge cases

### Test Plan

```bash
# Test regex patterns
echo ".specweave/increments/0001-feature/spec.md" | grep -E '\.specweave/increments/\d{3,4}E?-[^/]+/spec\.md'
echo ".specweave/increments/0001E-external/spec.md" | grep -E '\.specweave/increments/\d{3,4}E?-[^/]+/spec\.md'
echo ".specweave/increments/001-legacy/spec.md" | grep -E '\.specweave/increments/\d{3,4}E?-[^/]+/spec\.md'
```
