# JIRA Board-to-Project Validation

**Issue**: Critical oversight in initial implementation
**Discovered**: 2025-11-11
**Fixed**: 2025-11-11
**Severity**: High (prevents incorrect board assignments)

---

## Problem Statement

### Initial Implementation Flaw

The per-project JIRA boards configuration had a **critical validation gap**:

```bash
JIRA_PROJECTS=BACKEND,FRONTEND
JIRA_BOARDS_BACKEND=123,456
JIRA_BOARDS_FRONTEND=789,012
```

**What was missing**: Nothing prevented board 123 (which might actually belong to FRONTEND) from being assigned to BACKEND!

**Why this matters**:
- ❌ Board 123 could be a "Frontend Sprint" board but assigned to BACKEND project
- ❌ No validation that boards belong to the correct project
- ❌ Configuration errors would go undetected
- ❌ Sync would fail mysteriously when trying to create issues in wrong project

### Comparison with ADO

**ADO Area Paths** (✅ No problem):
```bash
# Area paths are project-scoped by design
POST /wit/classificationnodes/areas
# Creates: Backend\API, Backend\Database

# The project name is IN the path!
# Validation is implicit - you can't create Backend\API in Frontend project
```

**JIRA Boards** (❌ Problem):
```bash
# Boards are global resources with a project association
# Board 123 could belong to ANY project
# No implicit validation!
```

---

## The Fix

### 1. Updated JiraBoard Interface

**File**: `src/utils/external-resource-validator.ts` (lines 34-42)

**Change**:
```typescript
export interface JiraBoard {
  id: number;
  name: string;
  type: string;
  location?: {          // NEW!
    projectKey?: string;
    projectId?: string;
  };
}
```

**Why**: Store which project the board belongs to for validation.

### 2. Enhanced checkBoard() Method

**File**: `src/utils/external-resource-validator.ts` (lines 258-286)

**Change**:
```typescript
async checkBoard(boardId: number): Promise<JiraBoard | null> {
  try {
    const board = await this.callJiraApi(`board/${boardId}`);

    // NEW: Fetch board configuration to get project information
    let location: { projectKey?: string; projectId?: string } | undefined;
    try {
      const config = await this.callJiraApi(`board/${boardId}/configuration`);
      if (config.location) {
        location = {
          projectKey: config.location.projectKey,
          projectId: config.location.projectId,
        };
      }
    } catch (error) {
      // Configuration fetch failed, board exists but we don't know which project
      // This is OK for backward compatibility
    }

    return {
      id: board.id,
      name: board.name,
      type: board.type,
      location,  // NEW!
    };
  } catch (error) {
    return null;
  }
}
```

**What it does**:
1. Fetches board details (existing)
2. **NEW**: Fetches board configuration to get `location.projectKey`
3. Returns board with project information

**Graceful degradation**: If configuration fetch fails, board still validates (backward compatibility).

### 3. Added Validation Logic

**File**: `src/utils/external-resource-validator.ts` (lines 565-591)

**Change**:
```typescript
if (isNumeric) {
  // Entry is a board ID - validate it exists AND belongs to this project
  const boardId = parseInt(entry, 10);
  const board = await this.checkBoard(boardId);

  if (board) {
    // NEW: Validate board belongs to the correct project
    if (board.location?.projectKey && board.location.projectKey !== projectKey) {
      console.log(chalk.yellow(`    ⚠️  Board ${boardId}: ${board.name} belongs to project ${board.location.projectKey}, not ${projectKey}`));
      console.log(chalk.gray(`       Expected: ${projectKey}, Found: ${board.location.projectKey}`));
      result.boards.missing.push(entry);
      result.boards.valid = false;
    } else {
      // Board exists and belongs to correct project (or project unknown - backward compat)
      if (board.location?.projectKey) {
        console.log(chalk.green(`    ✅ Board ${boardId}: ${board.name} (project: ${board.location.projectKey})`));
      } else {
        console.log(chalk.green(`    ✅ Board ${boardId}: ${board.name} (project verification skipped)`));
      }
      result.boards.existing.push(board.id);
      finalBoardIds.push(board.id);
    }
  } else {
    // Board not found...
  }
}
```

**What it validates**:
1. ✅ Board exists (existing check)
2. **NEW**: Board belongs to the correct project
3. **NEW**: Clear error message if board belongs to wrong project

---

## Example Scenarios

### Scenario 1: Correct Configuration ✅

```bash
JIRA_PROJECTS=BACKEND,FRONTEND
JIRA_BOARDS_BACKEND=123,456
JIRA_BOARDS_FRONTEND=789,012
```

**Board 123 belongs to BACKEND**:
```
✅ Board 123: Backend Sprint (project: BACKEND)
```

**Result**: Validation passes ✅

### Scenario 2: Incorrect Configuration (Caught!) ❌

```bash
JIRA_PROJECTS=BACKEND,FRONTEND
JIRA_BOARDS_BACKEND=123,456   # But 123 actually belongs to FRONTEND!
```

**Board 123 belongs to FRONTEND**:
```
⚠️  Board 123: Frontend Sprint belongs to project FRONTEND, not BACKEND
    Expected: BACKEND, Found: FRONTEND
```

**Result**: Validation fails ❌ (prevents misconfiguration!)

### Scenario 3: Legacy Board (Backward Compat) ✅

```bash
JIRA_BOARDS=123,456  # Old config, no per-project validation
```

**Board configuration fetch fails** (old JIRA, permissions, etc.):
```
✅ Board 123: Some Board (project verification skipped)
```

**Result**: Validation passes ✅ (backward compatible)

---

## API Calls

### Before (1 API call per board)
```
GET /rest/api/3/board/123
```

### After (2 API calls per board)
```
GET /rest/api/3/board/123              # Board details
GET /rest/api/3/board/123/configuration # Project information
```

**Performance Impact**:
- 2x API calls per board
- Negligible for typical setups (3-10 boards per project)
- Critical for correctness!

---

## Backward Compatibility

**100% Backward Compatible** ✅

**Case 1: Old JIRA API** (no `/configuration` endpoint):
```
✅ Board 123: Some Board (project verification skipped)
```
→ Falls back to existing behavior

**Case 2: Insufficient Permissions** (can't read configuration):
```
✅ Board 123: Some Board (project verification skipped)
```
→ Falls back to existing behavior

**Case 3: New JIRA API** (has `/configuration` endpoint):
```
✅ Board 123: Backend Sprint (project: BACKEND)
```
→ Full validation!

---

## Why This Fix is Critical

### Without Validation
```bash
# User misconfigures:
JIRA_BOARDS_BACKEND=789  # Actually a FRONTEND board!

# Sync creates issues:
POST /rest/api/3/issue
{
  "fields": {
    "project": { "key": "BACKEND" },  # From config
    "board": 789                       # Actually belongs to FRONTEND!
  }
}

# JIRA rejects:
❌ 400 Bad Request: Board 789 does not belong to project BACKEND
```

### With Validation
```bash
# User misconfigures:
JIRA_BOARDS_BACKEND=789  # Actually a FRONTEND board!

# Validation catches error:
⚠️  Board 789: Frontend Sprint belongs to project FRONTEND, not BACKEND
    Expected: BACKEND, Found: FRONTEND

# Configuration invalid - prevents sync failures!
✅ Error caught during setup, not during sync
```

---

## Summary

**Problem**: No validation that JIRA boards belong to the correct project
**Impact**: Misconfiguration could cause sync failures
**Fix**: Fetch board configuration and validate `location.projectKey`
**Backward Compatibility**: 100% ✅
**Performance**: 2x API calls (acceptable trade-off)
**Status**: ✅ FIXED

**Critical Insight from User**: ADO area paths are implicitly validated (project name in path), but JIRA boards are global resources requiring explicit validation!

---

**Fixed**: 2025-11-11
**Build**: ✅ Successful
**Next**: Manual testing with live JIRA instance (recommended)
