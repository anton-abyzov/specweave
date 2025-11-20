# ULTRATHINK: Increment Status Management Analysis

**Date**: 2025-11-16
**Increment**: 0039-ultra-smart-next-command
**Analysis Type**: Architectural Contradiction Detection
**Severity**: 🔴 **CRITICAL**

---

## Executive Summary

**CRITICAL ARCHITECTURAL CONTRADICTION DETECTED**: The SpecWeave codebase has a fundamental mismatch between:
1. **TypeScript type system** (defines 5 states: active, backlog, paused, completed, abandoned)
2. **Runtime metadata files** (uses 2 additional undocumented states: "planning", "planned")
3. **External sync configurations** (defines "planning" as a valid status)

This contradiction causes:
- ❌ Increments with significant work (spec.md, plan.md, tasks.md) remaining in "planned"/"planning" status
- ❌ Type safety violations (metadata.json contains values not in TypeScript enum)
- ❌ Inconsistent state machine behavior
- ❌ Test coverage gaps (tests only cover enum states, not runtime states)

---

## Evidence

### 1. TypeScript Enum Definition

**Source**: `src/core/types/increment-metadata.ts:12-27`

```typescript
export enum IncrementStatus {
  /** Currently being worked on */
  ACTIVE = 'active',

  /** Planned but not ready to start yet (does NOT count towards WIP limits) */
  BACKLOG = 'backlog',

  /** Temporarily stopped (blocked by external dependency, deprioritized) */
  PAUSED = 'paused',

  /** All tasks complete, increment finished */
  COMPLETED = 'completed',

  /** Work abandoned (requirements changed, obsolete, etc.) */
  ABANDONED = 'abandoned'
}
```

**Key Finding**: NO "planning" or "planned" states exist in the enum!

---

### 2. Runtime Metadata Files

**Current increment statuses** (checked 2025-11-16):

| Increment ID | Status | Spec.md | Plan.md | Tasks.md | Reports | Valid? |
|-------------|--------|---------|---------|----------|---------|--------|
| 0037-project-specific-tasks | **"planned"** ❌ | 53KB ✅ | 51KB ✅ | 50KB ✅ | 24 files ✅ | **NO** - Not in enum |
| 0038-serverless-architecture-intelligence | **"active"** ✅ | 8KB ✅ | 16KB ✅ | 69KB ✅ | 4 files ✅ | **YES** - In enum |
| 0039-ultra-smart-next-command | **"planning"** ❌ | 15KB ✅ | 32KB ✅ | 64KB ✅ | 6 files ✅ | **NO** - Not in enum |

**Key Finding**: 2 out of 3 active/recent increments have INVALID statuses!

---

### 3. Contradiction Analysis

#### Increment 0037: "planned" Status
- **Current Status**: "planned" (NOT in enum)
- **Evidence of Work**:
  - ✅ spec.md: 53,884 bytes (comprehensive spec)
  - ✅ plan.md: 52,521 bytes (detailed plan)
  - ✅ tasks.md: 51,370 bytes (85 tasks defined)
  - ✅ reports/: 24 files (extensive planning artifacts)
- **Expected Status**: "active" (work has clearly started)
- **Last Activity**: 2025-11-16T03:45:00Z
- **Metadata**:
  ```json
  {
    "id": "0037-project-specific-tasks",
    "status": "planned",  // ❌ INVALID
    "type": "feature",
    "created": "2025-11-15T22:29:54Z",
    "planned": "2025-11-16T03:45:00Z",
    "totalTasks": 85
  }
  ```

#### Increment 0039: "planning" Status
- **Current Status**: "planning" (NOT in enum)
- **Evidence of Work**:
  - ✅ spec.md: 15,468 bytes (comprehensive spec)
  - ✅ plan.md: 32,398 bytes (detailed plan)
  - ✅ tasks.md: 65,172 bytes (tasks defined)
  - ✅ reports/: 6 files (planning artifacts)
  - ✅ tests/: Test directory created
- **Expected Status**: "active" (work has clearly started)
- **Last Activity**: 2025-11-16T10:00:00Z
- **Metadata**:
  ```json
  {
    "id": "0039-ultra-smart-next-command",
    "status": "planning",  // ❌ INVALID
    "type": "feature",
    "created": "2025-11-16T10:00:00Z"
  }
  ```

---

### 4. Configuration Contradiction

**Source**: `.specweave/config.json:56-63`

```json
"statusSync": {
  "enabled": true,
  "autoSync": true,
  "mappings": {
    "github": {
      "planning": { "state": "open", "labels": ["status:planning", "phase:design"] },
      "active": { "state": "open", "labels": ["status:active", "in-progress"] },
      ...
    }
  }
}
```

**Key Finding**: Config defines "planning" as a valid status for GitHub sync, but TypeScript enum does NOT include it!

---

### 5. Code References

#### External Sync Code (GitHub Plugin)

**Source**: `plugins/specweave-github/lib/github-sync-bidirectional.js:187-198`

```javascript
function mapSpecWeaveStatusToGitHub(status) {
  switch (status) {
    case "completed":
    case "abandoned":
      return "closed";
    case "active":
    case "paused":
    case "planning":  // ❌ NOT IN ENUM!
    default:
      return "open";
  }
}
```

**Source**: `plugins/specweave-github/lib/task-sync.js:322`

```javascript
status: "planning"  // ❌ NOT IN ENUM!
```

**Key Finding**: GitHub sync code explicitly handles "planning" status, but this violates TypeScript type system!

---

### 6. Test Coverage Gap

**All tests use enum values ONLY**:

```typescript
// tests/unit/increment/metadata-manager.test.ts:76
expect(result.status).toBe(IncrementStatus.ACTIVE);

// tests/e2e/metadata-provisioning.spec.ts:213
expect(metadata.status).toBe(IncrementStatus.ACTIVE);
```

**Key Finding**: Tests cover ONLY the 5 enum states. No tests for "planning"/"planned" states that exist in production!

---

## Root Cause Analysis

### How Did This Happen?

1. **Design Intent Mismatch**:
   - TypeScript enum designed with 5 states (active, backlog, paused, completed, abandoned)
   - Config.json added "planning" for external tool sync
   - No one noticed the contradiction

2. **Type Safety Bypass**:
   - Metadata.json is plain JSON (no runtime type checking)
   - TypeScript can't enforce enum values in JSON files
   - Invalid statuses silently persist

3. **Lazy Initialization Bug**:
   - `MetadataManager.read()` creates default metadata with `ACTIVE` status
   - But somewhere in the workflow, statuses are being set to "planned"/"planning" manually
   - This bypasses the type system

4. **External Sync Leakage**:
   - GitHub sync code uses "planning" status
   - This leaked into core increment metadata
   - No validation prevents invalid status writes

---

## Impact Assessment

### Current Issues

1. **Type Safety Violation**: Metadata contains values not in TypeScript enum
2. **State Machine Broken**: Transitions from "planning" → ? undefined
3. **Inconsistent Behavior**: Some increments use enum states, others use custom states
4. **Test Coverage Gap**: Production uses states not covered by tests
5. **Documentation Mismatch**: Enum docs don't mention "planning"/"planned"

### User-Visible Problems

1. ✅ **Increment 0037** has 85 tasks, comprehensive spec, but status = "planned"
   - **Problem**: Looks like no work started, but 50KB+ of artifacts exist
   - **Confusion**: Is this active? Should I start work? Is it in WIP limit?

2. ✅ **Increment 0039** has full spec/plan/tasks, but status = "planning"
   - **Problem**: Active work happening, but not tracked as "active"
   - **WIP Limit Issue**: May not count toward WIP limit (bypassing discipline!)

---

## Recommendations

### Option 1: Add "PLANNING" to Enum (Recommended)

**Rationale**: External sync needs "planning" status, acknowledge reality.

**Changes Required**:

1. **Update TypeScript Enum** (`src/core/types/increment-metadata.ts`):
   ```typescript
   export enum IncrementStatus {
     /** Planning phase - spec/plan/tasks being created */
     PLANNING = 'planning',

     /** Currently being worked on */
     ACTIVE = 'active',

     // ... rest of enum
   }
   ```

2. **Update Valid Transitions**:
   ```typescript
   export const VALID_TRANSITIONS: Record<IncrementStatus, IncrementStatus[]> = {
     [IncrementStatus.PLANNING]: [
       IncrementStatus.ACTIVE,     // Move to active when spec complete
       IncrementStatus.BACKLOG,    // Move to backlog if deprioritized
       IncrementStatus.ABANDONED   // Cancel planning
     ],
     // ... rest of transitions
   }
   ```

3. **Add Auto-Transition Logic**:
   - When `spec.md` created → status = "planning"
   - When `tasks.md` created → status = "active"
   - When first task started → ensure status = "active"

4. **Update Tests**:
   - Add tests for PLANNING status
   - Test transitions: planning → active, planning → backlog, planning → abandoned
   - Test WIP limits (should "planning" count? Probably NO)

5. **Fix Current Increments**:
   ```bash
   # Update 0037 and 0039 to proper status
   # Both have tasks, so should be "active"
   ```

---

### Option 2: Remove "planning"/"planned" (Alternative)

**Rationale**: Enforce strict type system, remove custom statuses.

**Changes Required**:

1. **Update Config**: Remove "planning" from status sync mappings
2. **Update GitHub Sync**: Map spec-only increments to "backlog" instead
3. **Update Metadata**: Change all "planning"/"planned" to "backlog" or "active"
4. **Document Rule**: "BACKLOG = planned but not started, ACTIVE = any work started"

**Downside**: Loses semantic distinction between "planning" and "backlog".

---

### Option 3: Two-Phase State Machine (Most Sophisticated)

**Rationale**: Separate "planning phase" from "execution phase" with sub-states.

**Changes Required**:

1. **Add Phase Field**:
   ```typescript
   interface IncrementMetadata {
     status: IncrementStatus;  // active, paused, completed, etc.
     phase?: 'planning' | 'execution' | 'validation' | 'closure';
   }
   ```

2. **Semantic Meaning**:
   - `status = "active", phase = "planning"` → Planning in progress
   - `status = "active", phase = "execution"` → Tasks being executed
   - `status = "backlog"` → No phase (not started)

3. **Transitions**:
   - spec.md created → `phase = "planning"`
   - tasks.md created → `phase = "execution"`
   - /specweave:validate → `phase = "validation"`
   - /specweave:done → `status = "completed"`

**Downside**: More complex, requires migration.

---

## Proposed Solution: Option 1 (Add PLANNING to Enum)

**Why**: Simplest fix that acknowledges current reality and maintains backward compatibility.

### Implementation Plan

#### Phase 1: Type System Update
1. ✅ Add `PLANNING = 'planning'` to `IncrementStatus` enum
2. ✅ Update `VALID_TRANSITIONS` to include planning transitions
3. ✅ Update `TYPE_LIMITS` - planning increments should NOT count toward WIP limit
4. ✅ Add planning-specific validation rules

#### Phase 2: Auto-Transition Logic
1. ✅ Hook: When `spec.md` created → set status = "planning"
2. ✅ Hook: When `tasks.md` created AND status = "planning" → set status = "active"
3. ✅ Hook: When first task marked in-progress → ensure status = "active"
4. ✅ Command: `/specweave:do` → auto-transition from "planning" to "active"

#### Phase 3: Fix Existing Increments
1. ✅ Scan all increments for "planned"/"planning" status
2. ✅ If tasks.md exists → transition to "active"
3. ✅ If only spec.md exists → keep as "planning"
4. ✅ Update metadata.json files

#### Phase 4: Tests
1. ✅ Add unit tests for PLANNING status
2. ✅ Add E2E tests for planning → active transition
3. ✅ Test WIP limits (planning should NOT count)
4. ✅ Test status transitions

#### Phase 5: Documentation
1. ✅ Update increment lifecycle docs
2. ✅ Update state machine diagram
3. ✅ Update command documentation
4. ✅ Add migration guide

---

## Immediate Actions Required

### 1. Fix Increment 0037
```bash
# Status should be "active" (has 85 tasks, extensive work done)
# Update metadata.json
```

### 2. Fix Increment 0039
```bash
# Status should be "active" (has full spec/plan/tasks, work started)
# Update metadata.json
```

### 3. Add Validation
```typescript
// Prevent future invalid statuses
function validateStatus(status: string): asserts status is IncrementStatus {
  const validStatuses = Object.values(IncrementStatus);
  if (!validStatuses.includes(status as IncrementStatus)) {
    throw new Error(`Invalid status: ${status}. Valid: ${validStatuses.join(', ')}`);
  }
}
```

---

## Conclusion

**Current State**: 🔴 CRITICAL - Type system and runtime are out of sync

**Root Cause**: "planning"/"planned" statuses used in practice but not defined in TypeScript enum

**Impact**: 2 increments with significant work stuck in invalid "planning"/"planned" status

**Solution**: Add PLANNING to enum, implement auto-transitions, fix existing increments

**Timeline**:
- ✅ **Phase 1**: Update type system (2 hours)
- ✅ **Phase 2**: Add auto-transitions (4 hours)
- ✅ **Phase 3**: Fix existing increments (1 hour)
- ✅ **Phase 4**: Tests (4 hours)
- ✅ **Phase 5**: Documentation (2 hours)
- **Total**: ~13 hours

**Priority**: P0 - Blocks increment discipline enforcement

---

## Appendix: File Locations

### Source Files
- `src/core/types/increment-metadata.ts` - Enum definition
- `src/core/increment/metadata-manager.ts` - CRUD operations
- `plugins/specweave-github/lib/github-sync-bidirectional.js` - External sync
- `.specweave/config.json` - Status mappings

### Test Files
- `tests/unit/increment/metadata-manager.test.ts`
- `tests/e2e/metadata-provisioning.spec.ts`

### Affected Increments
- `0037-project-specific-tasks` - Status: "planned" (INVALID)
- `0039-ultra-smart-next-command` - Status: "planning" (INVALID)
