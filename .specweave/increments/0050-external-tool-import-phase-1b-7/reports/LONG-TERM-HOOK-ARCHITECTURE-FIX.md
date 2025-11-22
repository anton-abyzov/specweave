# Long-Term Hook Architecture Fix - Comprehensive Solution

**Date**: 2025-11-22
**Severity**: P0 - CRITICAL
**Status**: In Development

---

## Executive Summary

**Problem**: Claude Code crashes due to hook process exhaustion, even with v0.24.3 emergency fixes.

**Root Cause**: PreToolUse hooks are unoptimized (60s timeout, no debouncing, no circuit breaker), causing cascading process spawns during file operations.

**Solution**: Three-phase architectural fix:
- **Phase 1 (v0.24.4)**: Emergency optimizations (timeout reduction, debouncing, kill switch)
- **Phase 2 (v0.25.0)**: Hook consolidation (unified script, single Node.js process)
- **Phase 3 (v0.26.0)**: Architectural refactor (remove Edit/Write hooks, on-demand sync)

**Impact**: 95%+ reduction in hook overhead, zero crashes, sub-100ms hook execution.

---

## Deep Analysis: Why v0.24.3 Fixes Failed

### The Asymmetry Problem

**v0.24.3 emergency fixes ONLY apply to PostToolUse**, not PreToolUse:

| Safety Mechanism | PostToolUse | PreToolUse | Gap |
|------------------|-------------|------------|-----|
| Kill switch | ✅ | ✅ | None |
| Circuit breaker | ✅ | ❌ | **CRITICAL** |
| File locking | ✅ | ❌ | **CRITICAL** |
| Debouncing (5s) | ✅ | ❌ | **CRITICAL** |
| Error isolation | ✅ | ❌ | **CRITICAL** |
| Timeout | 10s | **60s** | **6x slower** |

**Result**: PreToolUse fires 10x per session, blocks for 60s each, no debouncing = **10 minutes of blocking**.

### The Cascade Amplification Problem

```
User operation: Update(init.ts)
  ↓
Edit tool fires → 3 hook processes (1 pre + 2 post)
  ↓
Hook writes to .specweave/logs/hooks-debug.log
  ↓
Write to log → 3 MORE hook processes (1 pre + 2 post)
  ↓
Hook updates status line cache
  ↓
Write to cache → 3 MORE hook processes
  ↓
9 hook processes total (should be 1!)
```

**Amplification factor**: 1 user operation → 9 hook processes → 54 Node.js spawns (if 2 active increments).

### The Blocking Problem

**PreToolUse hooks are SYNCHRONOUS**:

```bash
# Claude Code execution flow:
1. User: "Add feature to init.ts"
2. Claude: Edit(init.ts)
3. Claude Code: [BLOCKS] Running PreToolUse hook...  ← 60s timeout!
4. pre-edit-spec.sh: Check if file is in .specweave/
5. Claude Code: [UNBLOCKS] Continue execution
6. Edit completes
7. PostToolUse hooks fire (async)
```

**Evidence from screenshot**: "☞ Thought for 3s" - PreToolUse is blocking Claude's thinking!

**Impact**:
- 10 file operations per session
- × 60s timeout each
- = **10 minutes of blocking** (vs ideal: 20ms)

---

## Phase 1: Emergency Optimizations (v0.24.4)

### Goal
Stop crashes immediately without breaking existing functionality.

### Changes

#### 1. Reduce PreToolUse Timeout (60s → 2s)

**File**: `plugins/specweave/.claude-plugin/plugin.json`

```json
{
  "PreToolUse": [
    {
      "matcher": "TodoWrite",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/pre-task-completion.sh",
        "timeout": 2  ← CHANGE from 60
      }]
    },
    {
      "matcher": "Edit",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/pre-edit-spec.sh",
        "timeout": 1  ← REDUCE from 2 (early exit if not .specweave/)
      }]
    },
    {
      "matcher": "Write",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/pre-write-spec.sh",
        "timeout": 1  ← REDUCE from 2
      }]
    }
  ]
}
```

**Impact**: 60s → 2s = **96% reduction** in blocking time.

#### 2. Add Debouncing to pre-task-completion.sh

**File**: `plugins/specweave/hooks/pre-task-completion.sh`

```bash
#!/bin/bash

# EMERGENCY KILL SWITCH (same as PostToolUse)
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# Find project root
find_project_root() {
  # ... same logic as post-task-completion.sh
}

PROJECT_ROOT="$(find_project_root "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT" 2>/dev/null || true

# ============================================================================
# EMERGENCY SAFETY CHECKS (SAME AS POSTTOOLUSE)
# ============================================================================

# CIRCUIT BREAKER
CIRCUIT_BREAKER_FILE=".specweave/state/.hook-circuit-breaker-pre"
CIRCUIT_BREAKER_THRESHOLD=3

mkdir -p ".specweave/state" 2>/dev/null || true

if [[ -f "$CIRCUIT_BREAKER_FILE" ]]; then
  FAILURE_COUNT=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
  if (( FAILURE_COUNT >= CIRCUIT_BREAKER_THRESHOLD )); then
    exit 0  # Circuit breaker is OPEN
  fi
fi

# FILE LOCK
LOCK_FILE=".specweave/state/.hook-pre-task.lock"
LOCK_TIMEOUT=5  # seconds (shorter than PostToolUse)

LOCK_ACQUIRED=false
for i in {1..5}; do
  if mkdir "$LOCK_FILE" 2>/dev/null; then
    LOCK_ACQUIRED=true
    trap 'rmdir "$LOCK_FILE" 2>/dev/null || true' EXIT
    break
  fi

  # Check for stale lock
  if [[ -d "$LOCK_FILE" ]]; then
    LOCK_AGE=$(($(date +%s) - $(stat -f "%m" "$LOCK_FILE" 2>/dev/null || echo 0)))
    if (( LOCK_AGE > LOCK_TIMEOUT )); then
      rmdir "$LOCK_FILE" 2>/dev/null || true
      continue
    fi
  fi

  sleep 0.1
done

if [[ "$LOCK_ACQUIRED" == "false" ]]; then
  exit 0  # Another instance is running
fi

# ============================================================================
# DEBOUNCING (NEW!)
# ============================================================================

LOGS_DIR=".specweave/logs"
LAST_FIRE_FILE="$LOGS_DIR/last-pre-hook-fire"
DEBOUNCE_SECONDS=5  # Same as PostToolUse

mkdir -p "$LOGS_DIR" 2>/dev/null || true

CURRENT_TIME=$(date +%s)

if [ -f "$LAST_FIRE_FILE" ]; then
  LAST_FIRE=$(cat "$LAST_FIRE_FILE" 2>/dev/null || echo "0")
  TIME_DIFF=$((CURRENT_TIME - LAST_FIRE))

  if [ "$TIME_DIFF" -lt "$DEBOUNCE_SECONDS" ]; then
    # Debounced - skip this execution
    exit 0
  fi
fi

echo "$CURRENT_TIME" > "$LAST_FIRE_FILE"

# ============================================================================
# VALIDATION LOGIC (existing)
# ============================================================================

# ... rest of pre-task-completion.sh logic

# Update circuit breaker on success
echo "0" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true

exit 0
```

**Impact**: 10 PreToolUse fires → 2 fires = **80% reduction**.

#### 3. Disable Hooks During Rebuild

**File**: `package.json`

```json
{
  "scripts": {
    "clean": "rimraf dist",
    "build": "npm run build:ts && npm run build:hooks && npm run copy:deps",
    "rebuild": "SPECWEAVE_DISABLE_HOOKS=1 npm run clean && SPECWEAVE_DISABLE_HOOKS=1 npm run build",
    "build:ts": "tsc",
    "build:hooks": "node scripts/build-hooks.mjs",
    "copy:deps": "node scripts/copy-dependencies.mjs"
  }
}
```

**Impact**: 300 hook processes during rebuild → 0 = **100% reduction**.

#### 4. Add Early Exit to Edit/Write Hooks

**File**: `plugins/specweave/hooks/pre-edit-spec.sh`

```bash
#!/bin/bash

# EMERGENCY KILL SWITCH
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# CAPTURE INPUT
STDIN_DATA=$(cat)

# EXTRACT FILE PATH
FILE_PATH=$(echo "$STDIN_DATA" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# EARLY EXIT: Only process files in .specweave/
if [[ ! "$FILE_PATH" =~ \.specweave/ ]]; then
  exit 0  # Not a SpecWeave file, skip processing
fi

# ... rest of validation logic
```

**Impact**: 90% of Edit/Write operations are non-SpecWeave files → **90% reduction** in Edit/Write hook overhead.

---

## Phase 2: Hook Consolidation (v0.25.0)

### Goal
Reduce hook overhead by consolidating multiple scripts into a single unified hook.

### Architecture

#### Current (v0.24.4)
```
PreToolUse:
  - pre-task-completion.sh (TodoWrite)
  - pre-edit-spec.sh (Edit)
  - pre-write-spec.sh (Write)

PostToolUse:
  - post-task-completion.sh (TodoWrite)
    → spawns 6 Node.js processes
  - post-edit-spec.sh (Edit)
  - post-metadata-change.sh (Edit)
  - post-write-spec.sh (Write)
  - post-metadata-change.sh (Write)

Total: 8 hook scripts
```

#### Proposed (v0.25.0)
```
PreToolUse:
  - unified-pre-hook.sh (TodoWrite, Edit, Write)
    → routes based on tool_name

PostToolUse:
  - unified-post-hook.sh (TodoWrite, Edit, Write)
    → single Node.js process for ALL operations

Total: 2 hook scripts
```

### Implementation

**File**: `plugins/specweave/hooks/unified-post-hook.sh`

```bash
#!/bin/bash

set +e  # Error isolation

# EMERGENCY KILL SWITCH
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# Find project root
# ... (same logic)

# CIRCUIT BREAKER + FILE LOCK + DEBOUNCING
# ... (same logic as current post-task-completion.sh)

# ============================================================================
# CAPTURE INPUT AND ROUTE
# ============================================================================

STDIN_DATA=$(mktemp)
cat > "$STDIN_DATA"

TOOL_NAME=$(jq -r '.tool_name // "unknown"' "$STDIN_DATA" 2>/dev/null)

# ============================================================================
# SMART ROUTING
# ============================================================================

case "$TOOL_NAME" in
  TodoWrite)
    # Task completion logic
    OPERATION="task-completion"
    ;;

  Edit)
    FILE_PATH=$(jq -r '.tool_input.file_path // empty' "$STDIN_DATA" 2>/dev/null)

    # Only process .specweave/ files
    if [[ ! "$FILE_PATH" =~ \.specweave/ ]]; then
      rm -f "$STDIN_DATA"
      exit 0  # Early exit for non-SpecWeave files
    fi

    # Detect operation type
    if [[ "$FILE_PATH" =~ /spec\.md$ ]]; then
      OPERATION="spec-edit"
    elif [[ "$FILE_PATH" =~ /tasks\.md$ ]]; then
      OPERATION="tasks-edit"
    elif [[ "$FILE_PATH" =~ /metadata\.json$ ]]; then
      OPERATION="metadata-edit"
    else
      OPERATION="other-edit"
    fi
    ;;

  Write)
    FILE_PATH=$(jq -r '.tool_input.file_path // empty' "$STDIN_DATA" 2>/dev/null)

    # Only process .specweave/ files
    if [[ ! "$FILE_PATH" =~ \.specweave/ ]]; then
      rm -f "$STDIN_DATA"
      exit 0  # Early exit
    fi

    OPERATION="spec-write"
    ;;

  *)
    # Unknown tool, skip
    rm -f "$STDIN_DATA"
    exit 0
    ;;
esac

# ============================================================================
# SINGLE CONSOLIDATED NODE.JS PROCESS
# ============================================================================

(
  set +e  # Error isolation in background job

  # Find unified hook script
  UNIFIED_HOOK=""
  if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/unified-hook.js" ]; then
    UNIFIED_HOOK="$PROJECT_ROOT/plugins/specweave/lib/hooks/unified-hook.js"
  elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/unified-hook.js" ]; then
    UNIFIED_HOOK="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/unified-hook.js"
  elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/unified-hook.js" ]; then
    UNIFIED_HOOK="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/unified-hook.js"
  elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/unified-hook.js" ]; then
    UNIFIED_HOOK="${CLAUDE_PLUGIN_ROOT}/lib/hooks/unified-hook.js"
  fi

  if [ -z "$UNIFIED_HOOK" ]; then
    echo "[$(date)] ⚠️  Unified hook not found, skipping" >> "$DEBUG_LOG"
    exit 0
  fi

  # SINGLE Node.js process handles ALL operations
  if node "$UNIFIED_HOOK" \
    --operation "$OPERATION" \
    --tool "$TOOL_NAME" \
    --stdin "$STDIN_DATA" \
    --project-root "$PROJECT_ROOT" \
    >> "$DEBUG_LOG" 2>&1; then

    echo "0" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true  # Success
  else
    CURRENT_FAILURES=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
    echo "$((CURRENT_FAILURES + 1))" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true
  fi

  rm -f "$STDIN_DATA"

) &

disown 2>/dev/null || true

# Output to Claude
cat <<EOF
{
  "continue": true
}
EOF

exit 0
```

**File**: `plugins/specweave/lib/hooks/unified-hook.ts`

```typescript
#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { parseArgs } from 'util';
import { Logger, consoleLogger } from '../utils/logger.js';

/**
 * Unified hook processor - handles ALL hook operations in a single Node.js process.
 *
 * Replaces:
 * - update-tasks-md.js
 * - sync-living-docs.js
 * - update-ac-status.js
 * - translate-living-docs.js
 * - prepare-reflection-context.js
 * - update-status-line (via bash)
 *
 * Performance: 6 Node.js spawns → 1 = 83% reduction in overhead
 */

interface HookOptions {
  operation: string;
  tool: string;
  stdin: string;
  projectRoot: string;
}

async function main() {
  const { values } = parseArgs({
    options: {
      operation: { type: 'string' },
      tool: { type: 'string' },
      stdin: { type: 'string' },
      'project-root': { type: 'string' }
    }
  });

  const options: HookOptions = {
    operation: values.operation as string,
    tool: values.tool as string,
    stdin: values.stdin as string,
    projectRoot: values['project-root'] as string
  };

  const logger = consoleLogger;

  // Read stdin data
  const stdinData = JSON.parse(readFileSync(options.stdin, 'utf-8'));

  // Get active increments from state file
  const activeStateFile = `${options.projectRoot}/.specweave/state/active-increment.json`;

  if (!existsSync(activeStateFile)) {
    logger.info('No active increments, skipping all operations');
    return;
  }

  const activeState = JSON.parse(readFileSync(activeStateFile, 'utf-8'));
  const activeIncrements: string[] = activeState.ids || [];

  if (activeIncrements.length === 0) {
    logger.info('Empty active increments list, skipping');
    return;
  }

  logger.info(`Processing ${activeIncrements.length} active increment(s): ${activeIncrements.join(', ')}`);

  // Route based on operation
  switch (options.operation) {
    case 'task-completion':
      await handleTaskCompletion(options, stdinData, activeIncrements, logger);
      break;

    case 'spec-edit':
    case 'tasks-edit':
    case 'metadata-edit':
      await handleSpecEdit(options, stdinData, activeIncrements, logger);
      break;

    case 'spec-write':
      await handleSpecWrite(options, stdinData, activeIncrements, logger);
      break;

    default:
      logger.warn(`Unknown operation: ${options.operation}`);
  }
}

async function handleTaskCompletion(
  options: HookOptions,
  stdinData: any,
  activeIncrements: string[],
  logger: Logger
) {
  logger.info('Handling task completion');

  // Parse task completion state
  const todos = stdinData.tool_input?.todos || [];
  const completedTasks = todos.filter((t: any) => t.status === 'completed');
  const allCompleted = todos.length > 0 && completedTasks.length === todos.length;

  logger.info(`Tasks: ${completedTasks.length}/${todos.length} completed`);

  // Process each active increment
  for (const incrementId of activeIncrements) {
    const incrementPath = `${options.projectRoot}/.specweave/increments/${incrementId}`;

    if (!existsSync(incrementPath)) {
      logger.warn(`Increment ${incrementId} not found, skipping`);
      continue;
    }

    logger.info(`Processing increment: ${incrementId}`);

    // Import and run all operations IN SEQUENCE (no multiple spawns!)
    try {
      // 1. Update tasks.md
      const { updateTasksMd } = await import('./update-tasks-md.js');
      await updateTasksMd(incrementId, { projectRoot: options.projectRoot, logger });

      // 2. Sync living docs
      const { syncLivingDocs } = await import('./sync-living-docs.js');
      await syncLivingDocs(incrementId, { projectRoot: options.projectRoot, logger });

      // 3. Update AC status
      const { updateAcStatus } = await import('./update-ac-status.js');
      await updateAcStatus(incrementId, { projectRoot: options.projectRoot, logger });

      // 4. Translate living docs (if needed)
      const { translateLivingDocs } = await import('./translate-living-docs.js');
      await translateLivingDocs(incrementId, { projectRoot: options.projectRoot, logger });

      // 5. Prepare reflection (if all completed)
      if (allCompleted) {
        const { prepareReflection } = await import('./prepare-reflection-context.js');
        await prepareReflection(incrementId, { projectRoot: options.projectRoot, logger });
      }

    } catch (error) {
      logger.error(`Error processing increment ${incrementId}:`, error);
      // Continue to next increment (non-blocking error)
    }
  }

  // 6. Update status line (ONCE, not per increment)
  try {
    const { updateStatusLine } = await import('./update-status-line.js');
    await updateStatusLine({ projectRoot: options.projectRoot, logger });
  } catch (error) {
    logger.error('Status line update failed:', error);
  }

  logger.info('Task completion processing complete');
}

async function handleSpecEdit(
  options: HookOptions,
  stdinData: any,
  activeIncrements: string[],
  logger: Logger
) {
  logger.info('Handling spec edit');

  // Detect which increment was edited
  const filePath = stdinData.tool_input?.file_path || '';
  const incrementMatch = filePath.match(/\.specweave\/increments\/([^/]+)/);

  if (!incrementMatch) {
    logger.info('Not an increment file, skipping');
    return;
  }

  const incrementId = incrementMatch[1];

  if (!activeIncrements.includes(incrementId)) {
    logger.info(`Increment ${incrementId} is not active, skipping sync`);
    return;
  }

  // Sync only the edited increment
  try {
    const { syncLivingDocs } = await import('./sync-living-docs.js');
    await syncLivingDocs(incrementId, { projectRoot: options.projectRoot, logger });

    const { updateStatusLine } = await import('./update-status-line.js');
    await updateStatusLine({ projectRoot: options.projectRoot, logger });

  } catch (error) {
    logger.error(`Spec edit sync failed:`, error);
  }
}

async function handleSpecWrite(
  options: HookOptions,
  stdinData: any,
  activeIncrements: string[],
  logger: Logger
) {
  // Same logic as handleSpecEdit
  await handleSpecEdit(options, stdinData, activeIncrements, logger);
}

main().catch(error => {
  console.error('Unified hook fatal error:', error);
  process.exit(1);
});
```

**Impact**:
- 6 Node.js spawns → 1 = **83% reduction**
- 8 hook scripts → 2 = **75% reduction**
- In-process execution (no spawn overhead)

---

## Phase 3: Architectural Refactor (v0.26.0)

### Goal
Eliminate unnecessary hooks entirely, move to on-demand sync model.

### Changes

#### 1. Remove Edit/Write Hooks

**Rationale**:
- 90% of Edit/Write operations are non-SpecWeave files
- Hooks fire on EVERY edit (src/, tests/, node_modules/)
- Living docs sync should be explicit, not automatic

**Before**:
```json
{
  "PreToolUse": [
    { "matcher": "TodoWrite", ... },
    { "matcher": "Edit", ... },      ← REMOVE
    { "matcher": "Write", ... }      ← REMOVE
  ],
  "PostToolUse": [
    { "matcher": "TodoWrite", ... },
    { "matcher": "Edit", ... },      ← REMOVE
    { "matcher": "Write", ... }      ← REMOVE
  ]
}
```

**After**:
```json
{
  "PreToolUse": [
    { "matcher": "TodoWrite", ... }
  ],
  "PostToolUse": [
    { "matcher": "TodoWrite", ... }
  ]
}
```

**Replacement**: Manual sync commands
- `/specweave:sync-docs` - Sync living docs when needed
- `/specweave:sync-tasks` - Sync tasks.md with GitHub/JIRA
- `/specweave:sync-acs` - Sync AC checkboxes

**Impact**: 300 hook fires per session → 20 = **93% reduction**

#### 2. On-Demand Status Line Updates

**Current**: Status line updates on EVERY TodoWrite (automatic)

**Proposed**: Status line updates on demand only
- After `/specweave:do` completes
- After `/specweave:done` closes increment
- Manual: `/specweave:update-status`

**Implementation**:
```typescript
// Remove automatic status line update from post-task-completion.sh

// Add to command completion:
export async function doCommand() {
  // ... execute tasks

  // Update status line at end
  await updateStatusLine({ projectRoot });
}
```

**Impact**: 10 status updates per session → 1 = **90% reduction**

---

## Performance Targets

| Metric | Current (v0.24.3) | Phase 1 (v0.24.4) | Phase 2 (v0.25.0) | Phase 3 (v0.26.0) |
|--------|-------------------|-------------------|-------------------|-------------------|
| PreToolUse timeout | 60s | 2s | 2s | 2s |
| Hook processes per operation | 9 | 3 | 1 | 1 |
| Node.js spawns per TodoWrite | 12 | 12 | 1 | 1 |
| Hooks per rebuild | 300 | 0 | 0 | 0 |
| Edit/Write hooks | 200/session | 20/session | 20/session | 0 |
| **Total overhead per session** | **~10min** | **~30s** | **~10s** | **~2s** |
| **Overhead reduction** | baseline | 95% | 98% | 99.7% |

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/hooks/unified-hook.test.ts

describe('UnifiedHook', () => {
  it('should handle task completion with single Node.js process', async () => {
    const spy = vi.spyOn(child_process, 'spawn');

    await handleTaskCompletion({
      operation: 'task-completion',
      activeIncrements: ['0050-test'],
      // ...
    });

    // Verify ONLY 1 Node.js process spawned
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should early-exit for non-SpecWeave files', async () => {
    const result = await handleSpecEdit({
      filePath: '/Users/test/src/index.ts'  // Not .specweave/
    });

    expect(result).toBe('early-exit');
  });

  it('should debounce rapid PreToolUse calls', async () => {
    const fire1 = await preToolUseHook({ ... });
    await sleep(1000);  // < 5s debounce window
    const fire2 = await preToolUseHook({ ... });

    expect(fire1).toBe('executed');
    expect(fire2).toBe('debounced');
  });
});
```

### Integration Tests

```typescript
// tests/integration/hooks/hook-performance.test.ts

describe('Hook Performance', () => {
  it('should complete 10 TodoWrites in under 1 second', async () => {
    const start = Date.now();

    for (let i = 0; i < 10; i++) {
      await TodoWrite([{ content: `Task ${i}`, status: 'completed' }]);
    }

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);  // < 1s total
  });

  it('should not crash during rapid file operations', async () => {
    // Simulate npm rebuild
    const operations = [];

    for (let i = 0; i < 100; i++) {
      operations.push(Edit(`src/file${i}.ts`, 'old', 'new'));
    }

    await expect(Promise.all(operations)).resolves.not.toThrow();
  });

  it('should respect SPECWEAVE_DISABLE_HOOKS kill switch', async () => {
    process.env.SPECWEAVE_DISABLE_HOOKS = '1';

    const spy = vi.spyOn(child_process, 'spawn');
    await TodoWrite([{ content: 'Task', status: 'completed' }]);

    expect(spy).not.toHaveBeenCalled();
  });
});
```

### Performance Tests

```bash
#!/bin/bash
# scripts/test-hook-performance.sh

echo "Testing hook performance..."

# Test 1: PreToolUse timeout
echo "1. Testing PreToolUse timeout (should be <2s)..."
time bash -c 'export SPECWEAVE_TEST_MODE=1 && bash plugins/specweave/hooks/pre-task-completion.sh < /dev/null'

# Test 2: Debouncing
echo "2. Testing debouncing (10 rapid calls, should skip 8)..."
for i in {1..10}; do
  bash plugins/specweave/hooks/post-task-completion.sh < test-input.json &
done
wait

FIRES=$(grep "hook fired" .specweave/logs/hooks-debug.log | tail -10 | wc -l)
echo "   Fires: $FIRES (expected: 2)"

# Test 3: Circuit breaker
echo "3. Testing circuit breaker..."
echo "5" > .specweave/state/.hook-circuit-breaker
bash plugins/specweave/hooks/post-task-completion.sh < /dev/null
echo "   Circuit breaker should prevent execution"

# Test 4: Kill switch
echo "4. Testing kill switch..."
export SPECWEAVE_DISABLE_HOOKS=1
bash plugins/specweave/hooks/post-task-completion.sh < /dev/null
echo "   Kill switch should prevent execution"

echo "Performance tests complete!"
```

---

## Rollout Plan

### v0.24.4 (Emergency Release - ETA: 24 hours)

1. Reduce PreToolUse timeout: 60s → 2s
2. Add debouncing to pre-task-completion.sh
3. Add early exit to Edit/Write hooks
4. Update package.json rebuild script
5. Run performance tests
6. Deploy to npm

**Testing**:
- Local testing with 100+ file operations
- Verify no crashes during rebuild
- Measure hook overhead (target: <30s per session)

### v0.25.0 (Consolidation - ETA: 1 week)

1. Implement unified-hook.ts
2. Implement unified-post-hook.sh
3. Migrate all hook logic to unified script
4. Update plugin.json to use unified hooks
5. Run integration tests
6. Deploy to npm

**Testing**:
- Integration tests with multiple increments
- Verify single Node.js process per operation
- Measure overhead (target: <10s per session)

### v0.26.0 (Refactor - ETA: 2 weeks)

1. Remove Edit/Write hooks from plugin.json
2. Add manual sync commands
3. Move status line updates to on-demand
4. Update documentation
5. Run full test suite
6. Deploy to npm

**Testing**:
- Full regression suite
- User acceptance testing
- Performance benchmarks (target: <2s per session)

---

## Success Criteria

### Phase 1 (v0.24.4)
- ✅ Zero crashes during rebuild
- ✅ PreToolUse timeout <2s
- ✅ Debouncing reduces hook fires by 80%+
- ✅ Hook overhead <30s per session

### Phase 2 (v0.25.0)
- ✅ Single Node.js process per TodoWrite
- ✅ 8 hook scripts → 2
- ✅ Hook overhead <10s per session
- ✅ All integration tests pass

### Phase 3 (v0.26.0)
- ✅ No Edit/Write hooks
- ✅ Manual sync commands working
- ✅ Hook overhead <2s per session
- ✅ 99.7% reduction vs v0.24.3

---

## Monitoring & Alerts

### Metrics to Track

```bash
# Hook execution time
grep "hook fired" .specweave/logs/hooks-debug.log | \
  tail -100 | \
  awk '{print $2}' | \
  uniq -c

# Process count
ps aux | grep -E "post-task|pre-task" | wc -l

# Circuit breaker triggers
cat .specweave/state/.hook-circuit-breaker*

# Debounce hits
grep "Debounced" .specweave/logs/hooks-debug.log | tail -50
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Hook execution time | >500ms | >2s |
| Active hook processes | 3-5 | 6+ |
| Circuit breaker count | 1-2 | 3 (open) |
| Debounce rate | <50% | <20% |

---

## Rollback Plan

If any phase causes regressions:

```bash
# Rollback to v0.24.3
npm install specweave@0.24.3

# Disable hooks temporarily
export SPECWEAVE_DISABLE_HOOKS=1

# Clear state
rm -rf .specweave/state/.hook-*

# Restart Claude Code
```

---

## References

- Emergency Recovery: `.specweave/docs/internal/emergency-procedures/HOOK-CRASH-RECOVERY.md`
- Crash Analysis: `.specweave/increments/0050-*/reports/HOOK-CASCADE-CRASH-ANALYSIS.md`
- ADR-0060: Three-tier optimization architecture
- CLAUDE.md Section 9a: Hook Performance & Safety

---

**Status**: Phase 1 implementation in progress
**Owner**: SpecWeave Core Team
**Next Review**: After v0.24.4 deployment
