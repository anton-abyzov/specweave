# Root Cause Analysis: Duplicate `/specweave:sync-docs` Invocations

**Date**: 2025-11-15
**Incident**: Duplicate slash command invocations observed
**Severity**: Medium (affects user experience, no data loss)
**Status**: Root cause identified, fix pending

---

## Executive Summary

The `/specweave:sync-docs` command was invoked twice in quick succession, showing duplicate "is running..." messages. Investigation revealed that the **command deduplication system is non-functional** due to build failures, allowing duplicate invocations to proceed unchecked.

---

## Observed Behavior

```
> /specweave:sync-docs is running…
> /specweave:sync-docs is running…

⏺ I'll help you sync the living specs for your completed
   increments. Let me start by analyzing the completed
  increments and then proceed with the sync.
  ⎿  PostToolUse:TodoWrite hook error
```

**Key observations**:
1. Two "is running..." messages (command invoked twice)
2. Single assistant response begins after both invocations
3. PostToolUse:TodoWrite hook error suggests task completion event

---

## Investigation Timeline

### Phase 1: Ruled Out Hook-Based Invocation

**Hypothesis**: Post-task-completion hook auto-invokes `/specweave:sync-docs`

**Evidence Checked**:
- `plugins/specweave/hooks/post-task-completion.sh` (lines 198-230)
  - ✅ Calls `node sync-living-docs.js` (Node script, NOT slash command)
  - ❌ Does NOT invoke `/specweave:sync-docs`

- `plugins/specweave-github/hooks/post-task-completion.sh` (lines 204-232)
  - ✅ Calls `update-epic-github-issue.sh` (bash script)
  - ❌ Does NOT invoke `/specweave:sync-docs`

**Conclusion**: Hooks are NOT the source of duplication.

---

### Phase 2: Ruled Out Agent/Skill-Based Invocation

**Hypothesis**: Agent or skill programmatically invokes command twice

**Evidence Checked**:
- Searched all agents: No `SlashCommand` tool invocations found
- Searched all skills: Only documentation references, no programmatic calls
- Command files (`specweave-do.md`, `specweave-increment.md`):
  - ✅ Contain INSTRUCTIONS to run `/specweave:sync-docs update`
  - ❌ Do NOT programmatically invoke the command

**Conclusion**: No agents or skills are auto-invoking the command.

---

### Phase 3: Discovered Deduplication System Failure ✅

**Hypothesis**: Deduplication system exists but is not functioning

**Evidence Found**:

#### 1. Hook Exists
**File**: `plugins/specweave/hooks/pre-command-deduplication.sh`

```bash
# ==============================================================================
# DEDUPLICATION CHECK: Block duplicate commands within 1 second
# ==============================================================================

# Check if deduplication module is available
if command -v node >/dev/null 2>&1 && [[ -f "dist/src/core/deduplication/command-deduplicator.js" ]]; then
  # Use dedicated wrapper script for ES module compatibility
  DEDUP_RESULT=$(echo "$INPUT" | node scripts/check-deduplication.js 2>/dev/null || echo "OK")

  # Parse result
  STATUS=$(echo "$DEDUP_RESULT" | head -1)

  if [[ "$STATUS" == "DUPLICATE" ]]; then
    # BLOCK the duplicate command
    cat <<EOF
{
  "decision": "block",
  "reason": "🚫 DUPLICATE COMMAND DETECTED..."
}
EOF
    exit 0
  fi
fi
```

**Purpose**: Block duplicate commands invoked within 1 second window

#### 2. Wrapper Script Exists
**File**: `scripts/check-deduplication.js`

```javascript
// Dynamic import of CommandDeduplicator
const { CommandDeduplicator } = await import('../dist/src/core/deduplication/command-deduplicator.js');
const dedup = new CommandDeduplicator({ debug: false });

// Check for duplicate
const isDuplicate = await dedup.checkDuplicate(command, args);
```

#### 3. Source Module Exists
**File**: `src/core/deduplication/command-deduplicator.ts`

✅ Source file exists in repository

#### 4. Compiled Module MISSING ❌
**Expected**: `dist/src/core/deduplication/command-deduplicator.js`
**Actual**: **DOES NOT EXIST**

```bash
$ ls -la /home/user/specweave/dist/src/core/deduplication/
# Deduplication module not compiled
```

#### 5. Build Failures Prevent Compilation

```bash
$ npm run build
# 150+ TypeScript errors across multiple plugins:
plugins/specweave-ado/lib/ado-client-v2.ts(11,19): error TS2307: Cannot find module 'https'
plugins/specweave-ado/lib/ado-client-v2.ts(116,18): error TS2580: Cannot find name 'Buffer'
... [148 more errors]
```

**Root Cause**: TypeScript build errors prevent compilation of deduplication module

---

## Root Cause Statement

**The deduplication system is architecturally sound but non-functional due to build failures:**

1. ✅ **Hook registered**: `pre-command-deduplication.sh` in `hooks.json` (UserPromptSubmit event)
2. ✅ **Logic correct**: Hook checks for duplicate commands within 1-second window
3. ✅ **Source exists**: `src/core/deduplication/command-deduplicator.ts`
4. ❌ **Module not compiled**: `dist/` folder missing deduplication module
5. ❌ **Build blocked**: 150+ TypeScript errors prevent compilation
6. ❌ **Fail-open behavior**: Hook approves command when module is missing

**Result**: Duplicate commands proceed unchecked because the deduplication module doesn't exist in compiled form.

---

## Why Duplication Occurred

**Most likely scenario**: Assistant invoked `SlashCommand` tool twice

**Evidence**:
- Two "is running..." messages (command lifecycle started twice)
- Single assistant response after both invocations
- No hooks or agents programmatically invoke the command
- Deduplication system non-functional (would have blocked second invocation)

**Possible causes**:
1. **Assistant error**: Created two `<invoke name="SlashCommand">` blocks in one response
2. **Claude Code bug**: Retry mechanism or race condition
3. **User action**: Manually invoked command twice quickly (<1 second)

---

## Impact Assessment

### Current Impact
- ⚠️ **User Experience**: Confusing duplicate "is running..." messages
- ⚠️ **Performance**: Duplicate work executed (2x living docs sync operations)
- ✅ **Data Integrity**: No corruption (idempotent operations)
- ⚠️ **Cost**: 2x AI costs for duplicate sync operations

### Risk If Unfixed
- Duplicate GitHub issue creation
- Duplicate external tool syncs (GitHub, JIRA, ADO)
- User confusion and lost productivity
- Increased AI costs

---

## Fix Strategy

### Option 1: Fix Build Errors (Recommended)

**Pros**:
- ✅ Enables full deduplication system
- ✅ Fixes root cause completely
- ✅ Unblocks other TypeScript features

**Cons**:
- ⚠️ Time-consuming (150+ errors to fix)
- ⚠️ May require dependency updates

**Implementation**:
1. Fix missing type declarations (`@types/node`, etc.)
2. Add missing imports (`https`, `fs`, `path`)
3. Fix TypeScript configuration (`lib`, `types`)
4. Test deduplication module
5. Verify hook functionality

**Estimated Effort**: 2-4 hours

### Option 2: Graceful Degradation (Quick Fix)

**Pros**:
- ✅ Quick to implement (15 minutes)
- ✅ Provides user feedback
- ✅ Documents the issue

**Cons**:
- ⚠️ Doesn't fix root cause
- ⚠️ Duplicates still allowed

**Implementation**:
Update `pre-command-deduplication.sh`:

```bash
if command -v node >/dev/null 2>&1 && [[ -f "dist/src/core/deduplication/command-deduplicator.js" ]]; then
  # Deduplication logic...
else
  # Log warning about missing module
  echo "[WARNING] Deduplication module not compiled - duplicates not prevented" >&2

  # Optional: Add to system message
  cat <<EOF
{
  "decision": "approve",
  "systemMessage": "⚠️ Command deduplication disabled (build required)\nDuplicate commands may execute. Run 'npm run build' to enable."
}
EOF
  exit 0
fi
```

**Estimated Effort**: 15 minutes

### Option 3: Hybrid Approach (Balanced)

1. **Immediate**: Implement Option 2 (graceful degradation) ← **Next PR**
2. **Short-term**: Fix critical build errors (deduplication module only) ← **Follow-up PR**
3. **Long-term**: Fix all build errors ← **Separate increment**

---

## Recommended Actions

### Immediate (This PR)
1. ✅ Document root cause (this file)
2. ✅ Implement graceful degradation in hook
3. ✅ Add warning message when deduplication unavailable
4. ✅ Add debug logging to track duplicate invocations

### Short-term (Next Sprint)
1. Create increment: `0035-fix-deduplication-build`
2. Fix TypeScript errors in `src/core/deduplication/`
3. Test deduplication module independently
4. Enable deduplication in production

### Long-term (Technical Debt)
1. Fix all 150+ TypeScript build errors
2. Add CI/CD check for build failures
3. Add integration tests for deduplication
4. Monitor duplicate invocation metrics

---

## Lessons Learned

1. **Silent Failures Are Dangerous**: Hook falls through silently when module missing
2. **Build Health Critical**: Unbuildable code creates security/functionality gaps
3. **Integration Testing Needed**: Deduplication system was never tested end-to-end
4. **Documentation Incomplete**: No mention of deduplication system in CLAUDE.md

---

## Related Files

**Source Code**:
- `src/core/deduplication/command-deduplicator.ts` - Deduplication logic (source)
- `scripts/check-deduplication.js` - Wrapper script for bash integration
- `plugins/specweave/hooks/pre-command-deduplication.sh` - UserPromptSubmit hook
- `plugins/specweave/hooks/hooks.json` - Hook registration

**Tests** (exist but can't run due to build failures):
- `tests/unit/deduplication/command-deduplicator.test.ts`
- `tests/integration/deduplication/`

**Documentation**:
- `CLAUDE.md` - Missing deduplication system documentation
- `plugins/specweave/hooks/README.md` - Hook documentation

---

## Appendix: Deduplication System Architecture

### Design
```
User submits command → UserPromptSubmit event fires
                     ↓
           pre-command-deduplication.sh
                     ↓
          check-deduplication.js (wrapper)
                     ↓
      CommandDeduplicator.checkDuplicate()
                     ↓
           ┌────────┴────────┐
           │                 │
       DUPLICATE            OK
           │                 │
     Block command    Record invocation
     (decision: block) (decision: approve)
```

### Time Window
- **Default**: 1 second
- **Configurable**: Via constructor options
- **Storage**: In-memory cache (LRU, max 100 commands)

### Invocation Tracking
```typescript
interface CommandInvocation {
  command: string;      // e.g., "/specweave:sync-docs"
  args: string[];       // e.g., ["update", "0034"]
  timestamp: number;    // Unix timestamp (ms)
  fingerprint: string;  // MD5 hash of command + args
}
```

### Deduplication Logic
1. Extract command and args from prompt
2. Generate fingerprint (MD5 hash)
3. Check cache for matching fingerprint
4. If found and within time window (1s) → DUPLICATE
5. If not found or expired → OK, record invocation

---

**Status**: Analysis complete, fix pending review
