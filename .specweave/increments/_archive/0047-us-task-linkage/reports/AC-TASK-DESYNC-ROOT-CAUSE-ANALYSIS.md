# AC-Task Desync: Root Cause Analysis & Prevention Strategy

**Date**: 2025-11-20
**Incident**: Increment 0047 claimed 100% complete but has 3 uncompleted ACs (97.1% actual)
**Severity**: CRITICAL (Violates SpecWeave Rule #7: Source of Truth)

---

## Executive Summary

Increment 0047 was incorrectly claimed as "100% complete" when:
- **tasks.md**: 52/52 tasks = 100% ✅
- **spec.md**: 100/103 ACs = 97.1% ❌ **SOURCE OF TRUTH**

This desync violated SpecWeave's core principle that **spec.md is the source of truth** and exposed gaps in our validation layer.

---

## The 3 Uncompleted ACs

### AC-US9-06 (P0 - CRITICAL) ⚠️
- **Title**: External items preserve original external ID for reference
- **Priority**: P0 (Critical)
- **Status**: `[ ]` Uncompleted
- **Tasks implementing it**: **ZERO** (orphaned AC)
- **Impact**: Missing critical feature - external items won't preserve original IDs

### AC-US9-09 (P2 - Nice-to-have)
- **Title**: Sync logs track origin-based update conflicts
- **Priority**: P2 (Nice-to-have)
- **Status**: `[ ]` Uncompleted
- **Tasks implementing it**: **ZERO** (orphaned AC)
- **Impact**: Low - logging feature, can be deferred

### AC-US13-07 (P2 - Nice-to-have)
- **Title**: Support optional reason parameter for audit trail
- **Priority**: P2 (Nice-to-have)
- **Status**: `[ ]` Uncompleted
- **Tasks implementing it**: **ZERO** (orphaned AC)
- **Impact**: Low - optional parameter, can be deferred

---

## Root Cause Analysis

### Primary Cause: Orphaned ACs (No Tasks Implementing Them)

All 3 uncompleted ACs have **zero tasks** referencing them via `**Satisfies ACs**:` field.

**Evidence**:
```bash
# Search for tasks implementing AC-US9-06
grep "**Satisfies ACs**:.*AC-US9-06" tasks.md
# Result: No matches found

# Search for tasks implementing AC-US9-09
grep "**Satisfies ACs**:.*AC-US9-09" tasks.md
# Result: No matches found

# Search for tasks implementing AC-US13-07
grep "**Satisfies ACs**:.*AC-US13-07" tasks.md
# Result: No matches found
```

**Why this happened**:
1. **AC-US9-06 (P0)**: Critical AC was **forgotten during planning**
   - PM agent should have created T-035 to implement external ID preservation
   - But increment 0047 tasks jump from T-034E to T-034F without covering AC-US9-06
   - This is a **planning failure** - P0 ACs MUST have implementing tasks

2. **AC-US9-09, AC-US13-07 (P2)**: Nice-to-have ACs were **intentionally deferred**
   - These are P2 priority, OK to defer
   - But deferral was **never documented** or formalized
   - Increment should have been marked "97% complete (deferred 2 P2 ACs)"

---

## Secondary Cause: Hook System Works BUT Only Checks Tasks with AC References

### Hook Chain (VERIFIED WORKING)

1. **TodoWrite** called → Triggers `PostToolUse` hook
2. **post-task-completion.sh** (line 307-347) → Calls `update-ac-status.js`
3. **update-ac-status.js** → Calls `ACStatusManager.syncACStatus()`
4. **ACStatusManager** (lines 234-324) → Syncs AC checkboxes

**The hook chain IS working correctly**, but:

### ACStatusManager Logic (Correct but Incomplete)

```typescript
// src/core/increment/ac-status-manager.ts

parseTasksForACStatus(tasksContent: string) {
  // Line 121-132: Looks for "**AC**: AC-US1-01" pattern
  const acMatch = line.match(/\*\*AC\*\*:\s*(.+)/);

  // ❌ DOES NOT match "**Satisfies ACs**: AC-US1-01" (new format)
  // ❌ ONLY checks ACs that have tasks referencing them
  // ❌ ORPHANED ACs (no tasks) are logged as warnings but NOT blocked
}

syncACStatus(incrementId: string) {
  // Line 300-309: Detect orphaned ACs
  for (const [acId, specAC] of specACs.entries()) {
    if (!taskACStatuses.has(acId)) {
      if (specAC.checked) {
        result.warnings.push(`${acId}: [x] but no tasks found`);
      } else {
        result.warnings.push(`${acId}: has no tasks mapped`);
        // ⚠️ WARNING ONLY - NOT BLOCKING!
      }
    }
  }
}
```

**What the hook did**:
- ✅ Detected 3 orphaned ACs (AC-US9-06, AC-US9-09, AC-US13-07)
- ✅ Logged warnings: `"AC-US9-06: has no tasks mapped"`
- ❌ Did NOT block completion (warnings are non-blocking)
- ❌ Did NOT update checkboxes (because there are no tasks to check)

---

## Tertiary Cause: Parser Recognizes OLD Format, Not NEW Format

**Old format** (recognized by parser):
```markdown
### T-001: Task Title
**AC**: AC-US1-01, AC-US1-02
```

**New format** (NOT recognized by parser):
```markdown
### T-001: Task Title
**Satisfies ACs**: AC-US1-01, AC-US1-02
```

**Impact**: Even if tasks existed for the 3 ACs, the parser would NOT find them because it's looking for `**AC**:`, not `**Satisfies ACs**:`.

**Fix needed**: Update parser regex:
```typescript
// OLD (line 121)
const acMatch = line.match(/\*\*AC\*\*:\s*(.+)/);

// NEW (supports both formats)
const acMatch = line.match(/\*\*(?:AC|Satisfies ACs)\*\*:\s*(.+)/);
```

---

## Why This Wasn't Caught Earlier

### 1. `/specweave:validate` Was Not Run
- Command exists: `src/cli/commands/validate.ts`
- Has orphan AC detection: `ACStatusManager.validateACMapping()`
- But was **never called** before claiming completion

### 2. `/specweave:done` Validation Is Incomplete
- Pre-closure validation exists (Gate 0, Gate 1, Gate 2)
- But does NOT check for orphaned P0 ACs
- Should block closure if any P0 AC has zero tasks

### 3. No Pre-Commit Validation
- Git hooks check for console.log, .specweave deletion
- But do NOT validate AC-Task coverage before commits
- Should run `/specweave:validate` before allowing commits

---

## Prevention Strategy: 3-Layer Defense

### Layer 1: Planning-Time Prevention (PM Agent)

**When**: During `/specweave:increment` (increment planning)

**What**: PM agent MUST create tasks for ALL P0/P1 ACs

**Validation**:
```
For each AC in spec.md:
  If AC priority = P0 or P1:
    REQUIRE at least one task with "Satisfies ACs: <AC-ID>"
  If AC priority = P2:
    Optional (can be deferred, but MUST document deferral)
```

**Action**: Update PM agent prompt:
```
CRITICAL RULE: Every P0 and P1 AC MUST have at least one implementing task.
Before generating tasks.md, verify:
- All P0 ACs have tasks
- All P1 ACs have tasks
- If P2 ACs deferred, add comment in spec.md: "**Status**: Deferred to future increment"
```

---

### Layer 2: Execution-Time Monitoring (Hooks)

**When**: After every TodoWrite call (post-task-completion.sh)

**What**: Enhanced AC status sync with blocking warnings

**Current behavior** (non-blocking):
```bash
[2025-11-20] ⚠️ AC-US9-06: has no tasks mapped
```

**New behavior** (blocking for P0):
```bash
[2025-11-20] 🚨 CRITICAL: AC-US9-06 (P0) has no tasks mapped!
[2025-11-20] ❌ Cannot mark increment complete until AC-US9-06 is covered.
```

**Implementation**:
1. Update `ACStatusManager.validateACMapping()` to check AC priority
2. Return `result.valid = false` if any P0 AC is orphaned
3. Hook outputs system message to Claude:
   ```json
   {
     "continue": true,
     "systemMessage": "⚠️ CRITICAL: AC-US9-06 (P0) has no tasks. Create a task or update AC priority before closure."
   }
   ```

---

### Layer 3: Closure-Time Validation (Gate 0 Enhancement)

**When**: Before `/specweave:done` allows closure

**What**: Mandatory AC coverage validation

**Current Gate 0** (tasks.md completeness):
```typescript
// Verify all tasks completed
const pendingTasks = tasks.filter(t => t.status !== 'completed');
if (pendingTasks.length > 0) {
  throw new Error('Cannot close: pending tasks exist');
}
```

**Enhanced Gate 0** (AC coverage + task completion):
```typescript
// Step 1: Verify all tasks completed (existing)
const pendingTasks = tasks.filter(t => t.status !== 'completed');
if (pendingTasks.length > 0) {
  throw new Error('Cannot close: pending tasks exist');
}

// Step 2: NEW - Validate AC coverage
const acValidator = new ACStatusManager(projectRoot);
const validation = acValidator.validateACMapping(incrementId);

if (!validation.valid) {
  const orphanedP0 = validation.orphanedACs.filter(acId => {
    const ac = getACFromSpec(acId);
    return ac.priority === 'P0';
  });

  if (orphanedP0.length > 0) {
    throw new Error(
      `Cannot close: ${orphanedP0.length} P0 ACs have no tasks:\n` +
      orphanedP0.map(id => `  - ${id}`).join('\n') +
      `\n\nCreate tasks or defer ACs before closure.`
    );
  }

  // P2 orphans are warnings only
  if (validation.orphanedACs.length > orphanedP0.length) {
    console.warn('⚠️ Some P2 ACs are not implemented (deferred)');
  }
}

// Step 3: Check spec.md checkboxes
const specContent = fs.readFileSync('spec.md', 'utf-8');
const uncheckedP0 = parseSpecForUncheckedP0ACs(specContent);

if (uncheckedP0.length > 0) {
  throw new Error(
    `Cannot close: ${uncheckedP0.length} P0 ACs are unchecked in spec.md:\n` +
    uncheckedP0.map(ac => `  - ${ac.acId}: ${ac.description}`).join('\n')
  );
}
```

---

## Immediate Actions

### 1. Fix Increment 0047 (This Increment)

**Option A: Complete missing AC**
```bash
# Create T-053: Implement AC-US9-06 (External ID preservation)
# Implement external_id field in living docs frontmatter
# Update spec.md: - [x] AC-US9-06
```

**Option B: Defer P2 ACs and update spec**
```bash
# Update spec.md:
- [ ] **AC-US9-06**: External items preserve original external ID
  - **Status**: ⚠️ CRITICAL - Missing task! Must implement.

- [ ] **AC-US9-09**: Sync logs track conflicts
  - **Status**: Deferred to future increment (P2)

- [ ] **AC-US13-07**: Support reason parameter
  - **Status**: Deferred to future increment (P2)
```

**Recommendation**: **Option A** - AC-US9-06 is P0 and blocks external item sync

---

### 2. Update ACStatusManager Parser (Immediate)

**File**: `src/core/increment/ac-status-manager.ts`

**Line 121** - Support both `**AC**:` and `**Satisfies ACs**:`:
```typescript
// OLD
const acMatch = line.match(/\*\*AC\*\*:\s*(.+)/);

// NEW
const acMatch = line.match(/\*\*(?:AC|Satisfies ACs)\*\*:\s*(.+)/);
```

---

### 3. Enhance /specweave:done Validation (High Priority)

**File**: `src/cli/commands/done.ts`

**Add to Gate 0** (before allowing closure):
```typescript
// Import AC coverage validator
import { ACStatusManager } from '../../core/increment/ac-status-manager.js';

// In closure validation:
const acManager = new ACStatusManager(projectRoot);
const acValidation = acManager.validateACMapping(incrementId);

// Block closure if P0 ACs are orphaned or unchecked
if (acValidation.orphanedACs.length > 0) {
  // Parse spec.md to get AC priorities
  const p0Orphans = await filterP0Orphans(acValidation.orphanedACs);

  if (p0Orphans.length > 0) {
    throw new Error(
      `❌ Cannot close increment: ${p0Orphans.length} P0 ACs have no implementing tasks:\n` +
      p0Orphans.map(ac => `  - ${ac.id}: ${ac.description}`).join('\n')
    );
  }
}
```

---

### 4. Add Pre-Commit Hook for AC Validation (Medium Priority)

**File**: `.git/hooks/pre-commit` or `scripts/pre-commit-ac-validation.sh`

**Runs before every commit**:
```bash
#!/bin/bash
# AC Coverage Pre-Commit Hook

# Find current increment
CURRENT_INCREMENT=$(ls -t .specweave/increments/ | grep -v "_" | head -1)

if [ -n "$CURRENT_INCREMENT" ]; then
  echo "🔍 Validating AC coverage for $CURRENT_INCREMENT..."

  # Run AC validation
  node dist/src/core/increment/ac-status-manager.js "$CURRENT_INCREMENT"

  if [ $? -ne 0 ]; then
    echo "❌ Pre-commit blocked: AC validation failed"
    echo "Run: npx tsx scripts/validate-ac-coverage.ts $CURRENT_INCREMENT"
    exit 1
  fi
fi
```

---

## Testing Strategy

### Test Case 1: Orphaned P0 AC Detection
```typescript
describe('AC Coverage Validation', () => {
  it('should block closure if P0 AC has no tasks', async () => {
    // Setup: Create spec.md with P0 AC, no implementing tasks
    const spec = `
    - [ ] **AC-US1-01**: Critical feature
      - **Priority**: P0 (Critical)
    `;

    const tasks = `
    ### T-001: Some other task
    **Satisfies ACs**: AC-US1-02
    `;

    // Expect: Validation fails
    const validator = new ACStatusManager(projectRoot);
    const result = await validator.validateACMapping('test-increment');

    expect(result.valid).toBe(false);
    expect(result.orphanedACs).toContain('AC-US1-01');
  });
});
```

### Test Case 2: Parser Recognizes Both Formats
```typescript
it('should parse both **AC**: and **Satisfies ACs**: formats', () => {
  const tasksContent = `
  ### T-001: Old format
  **AC**: AC-US1-01, AC-US1-02

  ### T-002: New format
  **Satisfies ACs**: AC-US1-03, AC-US1-04
  `;

  const manager = new ACStatusManager(projectRoot);
  const acMap = manager.parseTasksForACStatus(tasksContent);

  expect(acMap.has('AC-US1-01')).toBe(true);
  expect(acMap.has('AC-US1-03')).toBe(true);
});
```

---

## Incident Timeline

| Time | Event | Impact |
|------|-------|--------|
| 2025-11-19 | Increment 0047 planning | AC-US9-06 (P0) not assigned to any task |
| 2025-11-19 | Tasks T-001 to T-052 implemented | All tasks marked complete in tasks.md |
| 2025-11-19 | Claimed "100% complete" | False claim - 3 ACs still unchecked |
| 2025-11-20 | User noticed desync | Detected via screenshot review |
| 2025-11-20 | Root cause analysis | This document created |

---

## Lessons Learned

### What Worked
1. ✅ Hook infrastructure is solid (all hooks fire correctly)
2. ✅ ACStatusManager detects orphaned ACs (logs warnings)
3. ✅ User spotted the issue via visual inspection (good UX)

### What Failed
1. ❌ No planning-time validation for orphaned P0 ACs
2. ❌ No closure-time blocking for orphaned P0 ACs
3. ❌ Parser doesn't recognize new `**Satisfies ACs**:` format
4. ❌ Warnings are non-blocking (P0 issues should block)

### Process Improvements
1. **Never claim 100% complete** without running `/specweave:validate`
2. **Always check spec.md** (source of truth), not just tasks.md
3. **P0 ACs MUST have tasks** - enforce via validation gates
4. **Document deferrals** explicitly (add "Deferred" status to P2 ACs)

---

## Related Documentation

- **SpecWeave Rule #7**: Source of Truth (CLAUDE.md)
- **ADR-0043**: spec.md as Source of Truth
- **Incident 0044**: Similar desync (tasks.md vs metadata.json)
- **AC Coverage Validator**: `src/core/increment/ac-status-manager.ts`

---

## Conclusion

This desync was caused by **three failures**:
1. **Planning failure**: P0 AC (AC-US9-06) had no implementing task
2. **Parser limitation**: Doesn't recognize new `**Satisfies ACs**:` format
3. **Validation gap**: No blocking validation for orphaned P0 ACs

**Fix priority**:
1. 🔴 **P0**: Complete AC-US9-06 (external ID preservation) - CRITICAL
2. 🔴 **P0**: Update parser to recognize new AC format
3. 🟡 **P1**: Add blocking validation to `/specweave:done`
4. 🟡 **P1**: Add pre-commit hook for AC coverage
5. 🟢 **P2**: Document deferral of AC-US9-09, AC-US13-07

**Next steps**: Implement fixes in order, then test with edge cases.

---

**Author**: Claude (SpecWeave AI)
**Reviewed by**: Anton Abyzov
**Status**: ⚠️ ACTIVE - Fixes in progress
