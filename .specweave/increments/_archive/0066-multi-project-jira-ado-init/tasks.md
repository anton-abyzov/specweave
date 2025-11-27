# Tasks

## US-001: Multi-Project JIRA/ADO Import with Smart Auto-Detection

### T-001: Create jira-ado-auto-detect.ts module
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed

**Description**: New module with smart auto-detection: TeamPattern types, pattern keywords, structure analysis.

**File**: `src/cli/helpers/init/jira-ado-auto-detect.ts`

---

### T-002: Implement JIRA structure detection
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed

**Description**: `detectJiraStructure()` fetches all JIRA projects and boards from API, analyzes team patterns.

**File**: `src/cli/helpers/init/jira-ado-auto-detect.ts:143-220`

---

### T-003: Implement ADO structure detection
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed

**Description**: `detectAdoStructure()` fetches all ADO projects and area paths from API, analyzes team patterns.

**File**: `src/cli/helpers/init/jira-ado-auto-detect.ts:225-305`

---

### T-004: Implement team pattern detection algorithm
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed

**Description**: `detectTeamPattern()` analyzes board/area names for keywords (tech-stack, squad-based, domain-based, etc).

**File**: `src/cli/helpers/init/jira-ado-auto-detect.ts:310-380`

---

### T-005: Implement JIRA confirmation with analysis insight
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed

**Description**: `confirmJiraMapping()` shows detected structure, team pattern with emoji, reasoning, and folder preview.

**File**: `src/cli/helpers/init/jira-ado-auto-detect.ts:385-530`

---

### T-006: Implement ADO confirmation with analysis insight
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed

**Description**: `confirmAdoMapping()` shows detected structure, team pattern with emoji, reasoning, and folder preview.

**File**: `src/cli/helpers/init/jira-ado-auto-detect.ts:586-720`

---

### T-007: Build coordinator config from mappings
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed

**Description**: `buildJiraCoordinatorConfig()` and `buildAdoCoordinatorConfig()` create configs from user selections.

**File**: `src/cli/helpers/init/jira-ado-auto-detect.ts:535-580`

---

### T-008: Update external-import.ts to use auto-detect
**User Story**: US-001
**Satisfies ACs**: AC-US1-06
**Status**: [x] completed

**Description**: Replaced old hardcoded logic with calls to new auto-detect module.

**File**: `src/cli/helpers/init/external-import.ts:420-495`

---

### T-009: Simplify CoordinatorConfig types
**User Story**: US-001
**Satisfies ACs**: AC-US1-07
**Status**: [x] completed

**Description**: Removed backward compatibility cruft, added clean mode/projectMappings types.

**File**: `src/importers/import-coordinator.ts:50-82`

---

### T-010: Fix type errors
**User Story**: US-001
**Satisfies ACs**: AC-US1-08
**Status**: [x] completed

**Description**: Fixed mode union types and optional email/pat parameters.

**Files**: `jira-ado-auto-detect.ts`, `import-coordinator.ts`

---

## Progress Summary

**Completed**: 10/10 tasks
**Build**: ✅ Passes
**Tests**: ✅ 19/19 smoke tests pass

## Key Features Implemented

1. **Smart Team Pattern Detection**: Analyzes board/area names to detect organization patterns
   - tech-stack (Frontend/Backend/Mobile)
   - squad-based (Team Alpha, Pod A)
   - domain-based (Payments, Users, Orders)
   - service-based (Platform, DevOps, SRE)
   - feature-based (Feature teams)
   - mixed/unknown

2. **Confidence Levels**: High/Medium/Low based on keyword match strength

3. **Visual Feedback**: Emoji per pattern type, human-readable reasoning

4. **2-Level Folder Structure**: `specs/JIRA-{PROJECT}/{board}/` and `specs/ADO-{PROJECT}/{area}/`

5. **Mode Recommendations**: Based on project/board/area counts and detected patterns
