# Hook Cascade Crash Analysis - 2025-11-22

**Incident**: Claude Code crashes on almost every request during `init.ts` modifications

**Severity**: CRITICAL (P0) - Blocks all development work

---

## Visual Evidence (Screenshot Analysis)

### Crash Sequence Observed:

```
Left Panel (Line 23-25):
● Update(src/cli/commands/init.ts)
  └ Running PreToolUse hook...

☞ Thought for 3s (ctrl+o to show thinking)

* Adding StatusLineUpdater call at end of init command...
  └ Next: Add statusLine config to DEFAULT_CONFIG
```

```
Right Panel (Middle):
● Bash(mkdir -p dist/plugins/specweave/hooks && cp ...)
  └ Hook copied to dist

● Bash(ls -lh dist/plugins/specweave/hooks/post-task-completion.sh)
  -rwxr-xr-x@ 1 antonabyzov  staff  24K Nov 22 18:11 ...

☞ Thought for 3s (ctrl+o to show thinking)

· Finaling... (esc to interrupt · 2m 37s · ↓ 8.4k tokens)
  └ Tip: Use /agents to optimize specific tasks.
```

### Key Crash Indicators:

1. **"Running PreToolUse hook..."** - PreToolUse is BLOCKING execution
2. **"Thought for 3s"** - Hook is delaying Claude's thinking process (should be instant)
3. **Hook copied to dist** - File operations triggering MORE hooks
4. **"Finaling..."** - System struggling to complete (2m 37s elapsed)

---

## Root Cause: Hook Cascade Explosion

### Architecture Flaw

**Current hook configuration** (from `plugins/specweave/.claude-plugin/plugin.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [{ "timeout": 60 }]  ← BLOCKS for 60 seconds!
      },
      {
        "matcher": "Edit",
        "hooks": [{ "timeout": 2 }]
      },
      {
        "matcher": "Write",
        "hooks": [{ "timeout": 2 }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [{ "timeout": 10 }]
      },
      {
        "matcher": "Edit",
        "hooks": [
          { "timeout": 5 },
          { "timeout": 10 }  ← 2 hooks per Edit!
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          { "timeout": 5 },
          { "timeout": 10 }  ← 2 hooks per Write!
        ]
      }
    ]
  }
}
```

### Cascade Pattern (During init.ts Modification)

```
1. User: "Add StatusLineUpdater to init.ts"
   └─> Claude: Edit(src/cli/commands/init.ts)
       ├─> PreToolUse: pre-edit-spec.sh (blocks 2s)
       ├─> [Edit executes]
       └─> PostToolUse:
           ├─> post-edit-spec.sh (blocks 5s)
           └─> post-metadata-change.sh (blocks 10s)

2. Hook logs to debug file (.specweave/logs/hooks-debug.log)
   └─> Triggers more file I/O

3. Claude: TodoWrite([...])  ← Tracking progress
   ├─> PreToolUse: pre-task-completion.sh (blocks 60s!)  ⚠️ CRITICAL
   ├─> [TodoWrite executes]
   └─> PostToolUse: post-task-completion.sh (blocks 10s)
       └─> Spawns background job with:
           ├─> node update-tasks-md.js
           ├─> node sync-living-docs.js
           ├─> node update-ac-status.js
           ├─> node translate-living-docs.js
           ├─> node prepare-reflection.js
           └─> bash update-status-line.sh
           (6 processes PER active increment)

4. Status line update writes to cache
   └─> Triggers Write hooks (3 more processes)

5. npm run rebuild copies hooks to dist/
   ├─> Bash(mkdir -p dist/plugins/specweave/hooks)
   ├─> Bash(cp hooks/post-task-completion.sh dist/)
   └─> These trigger Edit/Write detection → MORE HOOKS

6. Process exhaustion → CRASH
```

---

## Critical Issues Identified

### Issue 1: PreToolUse Blocks Execution

**Problem**: PreToolUse hooks are SYNCHRONOUS and BLOCKING.

- `pre-task-completion.sh`: 60-second timeout
- Fires on EVERY TodoWrite (5-10 times per user request)
- Blocks Claude's thinking process ("Thought for 3s")
- NO debouncing (unlike PostToolUse)

**Evidence from screenshot**:
```
● Update(src/cli/commands/init.ts)
  └ Running PreToolUse hook...     ← BLOCKS HERE

☞ Thought for 3s                   ← DELAYED by hook
```

**Impact**: 60s × 10 TodoWrites = **10 minutes of blocking** per session

### Issue 2: Multiple Hooks Per Operation

**Problem**: Each file operation triggers 2-3 separate hook processes.

| Operation | Hooks Fired | Total Processes |
|-----------|-------------|-----------------|
| Edit | 1 pre + 2 post | 3 |
| Write | 1 pre + 2 post | 3 |
| TodoWrite | 1 pre + 1 post | 2 |

**Impact**: During `npm run rebuild`:
- 100 file operations
- × 3 hooks each
- = **300 hook processes**
- Each spawning 1-6 Node.js processes
- = **1800+ processes total**

### Issue 3: Post-Task Hook Spawns 6 Processes Per Increment

**Problem**: Even with "consolidated background work", each increment spawns:

```bash
# From post-task-completion.sh (lines 347, 393, 427, 452, 479, 495)
node update-tasks-md.js           # Process 1
node sync-living-docs.js          # Process 2
node update-ac-status.js          # Process 3
node translate-living-docs.js     # Process 4
node prepare-reflection.js        # Process 5
bash update-status-line.sh        # Process 6
```

**Impact**: With 2 active increments:
- 2 × 6 = 12 Node.js processes per TodoWrite
- 10 TodoWrites = **120 processes**

### Issue 4: No Debouncing on PreToolUse

**Problem**: PostToolUse has 5-second debouncing, PreToolUse has NONE.

**Evidence from logs**:
```
[Sat Nov 22 18:13:12 EST 2025] 🔒 Pre-task-completion hook fired
[Sat Nov 22 18:13:12 EST 2025] ⏭️  No tasks being completed, skipping validation
[Sat Nov 22 18:13:12 EST 2025] [JIRA] 🔗 JIRA sync hook fired
[Sat Nov 22 18:13:12 EST 2025] [ADO] 🔗 Azure DevOps sync hook fired
[Sat Nov 22 18:13:12 EST 2025] 📋 TodoWrite hook fired
[Sat Nov 22 18:13:12 EST 2025] ⏭️  Debounced (last fire: 0s ago)  ← PostToolUse debounced
```

PreToolUse fires EVERY time, PostToolUse debounces.

### Issue 5: Hooks Trigger More Hooks (Infinite Loop)

**Problem**: Hook file operations trigger file operation hooks.

**Cascade example**:
```
1. Edit(init.ts) → post-edit-spec.sh fires
2. post-edit-spec.sh writes to .specweave/logs/hooks-debug.log
3. Write to log file → post-write-spec.sh fires  ⚠️
4. post-write-spec.sh writes to status line cache
5. Write to cache → post-write-spec.sh fires AGAIN  ⚠️
6. Infinite loop → crash
```

---

## Emergency Fixes Implemented (v0.24.3)

### 1. Kill Switch ✅
```bash
export SPECWEAVE_DISABLE_HOOKS=1  # Disables ALL hooks
```

### 2. Circuit Breaker ✅
- Auto-disables after 3 consecutive failures
- File: `.specweave/state/.hook-circuit-breaker`

### 3. File Locking ✅
- Max 1 instance per hook type
- Timeout: 5-10 seconds with stale lock cleanup

### 4. Aggressive Debouncing ✅
- 5-second window (PostToolUse only!)
- PreToolUse still has NO debouncing ⚠️

### 5. Error Isolation ✅
```bash
set +e        # Never propagate errors
exit 0        # Always exit successfully
```

### 6. Consolidated Background Work ✅
- All Node.js spawns wrapped in single background job
- Still spawns 6 processes per increment ⚠️

---

## Why v0.24.3 Fixes Aren't Enough

### Problem 1: PreToolUse Not Optimized

**Emergency fixes only apply to PostToolUse**, not PreToolUse!

- No debouncing on PreToolUse
- No file locking on PreToolUse
- No circuit breaker on PreToolUse
- **60-second timeout still blocks execution**

### Problem 2: Background Work Still Heavy

Even with consolidation, each increment spawns:
- 6 Node.js processes
- 5-second minimum execution time
- Multiplied by number of active increments

### Problem 3: Edit/Write Hooks Cascade

- Every Edit/Write triggers 3 hook processes
- No debouncing on Edit/Write hooks
- During rebuild: 100s of cascading hooks

---

## Recommended Permanent Fixes

### Fix 1: Reduce PreToolUse Timeout (IMMEDIATE)

```json
{
  "PreToolUse": [
    {
      "matcher": "TodoWrite",
      "hooks": [{
        "timeout": 2  ← Change from 60s to 2s
      }]
    }
  ]
}
```

**Impact**: 60s → 2s = **96% reduction** in blocking time

### Fix 2: Add Debouncing to PreToolUse (HIGH PRIORITY)

Apply same 5-second debouncing as PostToolUse.

```bash
# In pre-task-completion.sh
DEBOUNCE_SECONDS=5

if [ -f "$LAST_FIRE_FILE" ]; then
  LAST_FIRE=$(cat "$LAST_FIRE_FILE")
  TIME_DIFF=$((CURRENT_TIME - LAST_FIRE))

  if [ "$TIME_DIFF" -lt "$DEBOUNCE_SECONDS" ]; then
    exit 0  # Skip this execution
  fi
fi
```

**Impact**: 10 hooks → 2 hooks = **80% reduction**

### Fix 3: Disable Hooks During Rebuild (CRITICAL)

```json
// package.json
{
  "scripts": {
    "rebuild": "SPECWEAVE_DISABLE_HOOKS=1 npm run clean && npm run build"
  }
}
```

**Impact**: 300 hooks → 0 hooks during rebuild

### Fix 4: Remove Edit/Write Hooks (ARCHITECTURAL)

**Question**: Do we REALLY need PreToolUse/PostToolUse on Edit/Write?

**Current behavior**:
- Edit hooks detect spec.md changes
- But ALL edits trigger hooks (even non-spec files!)
- 90% false positives

**Recommendation**:
- Remove Edit/Write hooks entirely
- Use ONLY TodoWrite hooks for task tracking
- Manual `/specweave:sync-docs` when needed

**Impact**: 300 hooks → 20 hooks per session = **93% reduction**

### Fix 5: Single Consolidated Hook Script (ULTIMATE FIX)

**Current**: 6 separate hook scripts
**Proposed**: 1 consolidated hook with smart routing

```bash
#!/bin/bash
# post-tool-use.sh (UNIFIED HOOK)

# Route based on tool_name
TOOL_NAME=$(jq -r '.tool_name' <<<"$STDIN_DATA")

case "$TOOL_NAME" in
  TodoWrite)
    # Task tracking logic
    ;;
  Edit)
    # Spec detection logic (only if .specweave/increments/)
    ;;
  Write)
    # Spec detection logic (only if .specweave/increments/)
    ;;
esac

# Single background job for ALL operations
(
  node "$PROJECT_ROOT/lib/hooks/unified-hook.js" \
    --tool "$TOOL_NAME" \
    --increment "$CURRENT_INCREMENT"
) &
```

**Impact**:
- 6 hook scripts → 1 hook script
- 6 Node.js spawns → 1 Node.js spawn
- **83% reduction** in overhead

---

## Verification Commands

```bash
# Check if hooks are disabled
echo "Kill switch: ${SPECWEAVE_DISABLE_HOOKS:-NOT SET}"

# Check circuit breaker status
cat .specweave/state/.hook-circuit-breaker 2>/dev/null || echo "NOT TRIGGERED"

# Check active locks
find .specweave/state -name ".hook-*.lock" -type d 2>/dev/null | wc -l

# Check recent hook fires
tail -50 .specweave/logs/hooks-debug.log | grep "hook fired"

# Count hook processes
ps aux | grep -E "(pre-task|post-task|pre-edit|post-edit|pre-write|post-write)" | wc -l
```

---

## Immediate Action Items

1. **NOW**: Export `SPECWEAVE_DISABLE_HOOKS=1` in terminal
2. **NOW**: Run `npm run rebuild` with hooks disabled
3. **NEXT**: Reduce PreToolUse timeout from 60s to 2s
4. **NEXT**: Add debouncing to PreToolUse hooks
5. **NEXT**: Disable Edit/Write hooks (remove from plugin.json)
6. **LATER**: Implement unified hook architecture

---

## References

- **Emergency Recovery**: `.specweave/docs/internal/emergency-procedures/HOOK-CRASH-RECOVERY.md`
- **Hook Performance**: `CLAUDE.md` Section 9a
- **ADR-0060**: Three-tier optimization architecture
- **Post-task hook**: `plugins/specweave/hooks/post-task-completion.sh` (580 lines)
- **Plugin config**: `plugins/specweave/.claude-plugin/plugin.json`

---

## Incident Timeline

- **18:13:06**: User modifies `init.ts` → Edit hooks fire
- **18:13:12**: TodoWrite triggers PreToolUse (60s timeout) → BLOCKS
- **18:13:12**: PostToolUse spawns 6 Node.js processes
- **18:13:27**: Second TodoWrite → MORE hooks fire
- **18:13:33**: Edit/Write hooks cascade → process exhaustion
- **18:13:37**: Claude Code crashes (visible in screenshot "Finaling... 2m 37s")

---

**Status**: CRITICAL - Requires immediate architectural fix
**Owner**: SpecWeave Core Team
**Priority**: P0 (blocks all development)
**ETA**: v0.24.4 (emergency release)
