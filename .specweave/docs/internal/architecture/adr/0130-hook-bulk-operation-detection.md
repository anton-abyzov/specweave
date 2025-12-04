# ADR-0130: Hook Bulk Operation Detection and Batching

**Status**: Accepted
**Date**: 2025-11-24
**Context**: v0.26.0 - Hook Performance Optimization Phase 2
**Supersedes**: ADR-0070 (Hook Consolidation - Phase 1)

---

## Context

### Problem Statement

Claude Code crashes during bulk edit operations (10+ files) due to hook process storms:

```
Bulk operation (12 user story file edits):
  12 Edit operations
  × 4 hooks per Edit (v0.25.0 consolidated)
  × 2-3 Node.js subprocesses per hook
  = 48 hooks + 96-144 subprocesses
  = 144-192 total processes in `<5 seconds`
  → Process exhaustion → Circuit breaker → CRASH
```

**Incidents**:
- 2025-11-22: Multiple crashes during multi-file sync operations
- 2025-11-23: Hook process storm (300 processes/min)
- **2025-11-24**: Claude Code crash during increment 0053 completion (56-84 processes in `<5s`)

### Current Architecture (v0.25.0)

**Consolidated Hooks** (ADR-0070):
- Reduced from 6 → 4 hooks per Edit/Write
- 33% reduction in hook overhead
- Still triggers **individually** for every Edit operation

**Why consolidation alone isn't enough**:
- Single edit (1 AC update): 4 hooks = 6-7 processes ✅ Acceptable
- Bulk operation (12 user stories): 48 hooks = 144-192 processes ❌ Crash

**The fundamental issue**: Hooks can't distinguish between single edits and bulk operations.

---

## Decision

Implement **automatic bulk operation detection** with **intelligent batching** in hooks.

### Core Principle

**Detect operation bursts, batch hook execution until idle period.**

```
Operation Pattern Analysis:
─────────────────────────────────────────────────────────
Timeline:    0s    1s    2s    3s    4s    5s    6s    7s
─────────────────────────────────────────────────────────
Single Edit: [E]                               (1 op)
             ↓
             Run hook immediately ✅

Bulk Edit:   [E][E][E][E][E][E][E][E][E]       (9 ops in 3s)
             ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓
             Skip individual hooks...
                                    [idle 5s]
                                         ↓
                                    Run 1 batched hook ✅
```

### Architecture Components

#### 1. Bulk Operation Detector

**Location**: `plugins/specweave/hooks/shared/bulk-operation-detector.sh`

**Mechanism**: Sliding window counter with threshold detection

```bash
BULK_THRESHOLD=5      # 5+ operations in window = bulk mode
BULK_WINDOW=10        # seconds
OPERATION_COUNTER="$PROJECT_ROOT/.specweave/state/.hook-operation-counter"
OPERATION_TIMESTAMP="$PROJECT_ROOT/.specweave/state/.hook-operation-timestamp"

# Increment operation counter
CURRENT_TIME=$(date +%s)
RECENT_OPS=$(cat "$OPERATION_COUNTER" 2>/dev/null || echo 0)
LAST_OP_TIME=$(cat "$OPERATION_TIMESTAMP" 2>/dev/null || echo 0)

# Reset counter if outside window
if (( CURRENT_TIME - LAST_OP_TIME > BULK_WINDOW )); then
  RECENT_OPS=0
fi

RECENT_OPS=$((RECENT_OPS + 1))
echo "$RECENT_OPS" > "$OPERATION_COUNTER"
echo "$CURRENT_TIME" > "$OPERATION_TIMESTAMP"

# Bulk operation detected?
if [ "$RECENT_OPS" -ge "$BULK_THRESHOLD" ]; then
  echo "BULK_MODE_DETECTED"
  exit 0
fi

echo "SINGLE_OPERATION"
```

**Key properties**:
- **Stateless**: No inter-hook communication needed
- **Automatic**: Works without user intervention
- **Adaptive**: Resets after idle period

#### 2. Batch Job Scheduler

**Location**: `plugins/specweave/hooks/shared/batch-job-scheduler.sh`

**Mechanism**: Background timer with operation coalescing

```bash
# Schedule batch job (runs after idle period)
schedule_batch_job() {
  local INCREMENT_ID="$1"
  local IDLE_WINDOW=5  # seconds
  local BATCH_LOCK="$PROJECT_ROOT/.specweave/state/.batch-job-$INCREMENT_ID.lock"

  # Cancel existing batch job (if any)
  if [ -f "$BATCH_LOCK" ]; then
    local OLD_PID=$(cat "$BATCH_LOCK")
    kill "$OLD_PID" 2>/dev/null || true
  fi

  # Schedule new batch job
  (
    sleep "$IDLE_WINDOW"

    # If operation counter still exists → run batched hook
    if [ -f "$OPERATION_COUNTER" ]; then
      rm -f "$OPERATION_COUNTER" "$OPERATION_TIMESTAMP"

      # Run consolidated sync (single process)
      bash "$PROJECT_ROOT/plugins/specweave/hooks/post-task-completion.sh" \
        --batch-mode \
        --increment "$INCREMENT_ID" \
        >> "$PROJECT_ROOT/.specweave/logs/batch-jobs.log" 2>&1
    fi

    # Cleanup
    rm -f "$BATCH_LOCK"
  ) &

  # Save PID for cancellation
  echo $! > "$BATCH_LOCK"
}
```

**Key properties**:
- **Self-canceling**: Each new operation resets the timer
- **Idle detection**: Only runs after 5s of no activity
- **Lock-based**: Prevents duplicate batch jobs

#### 3. Batch Mode Hook Execution

**Location**: `plugins/specweave/hooks/post-task-completion.sh` (enhanced)

**New flag**: `--batch-mode`

```bash
# Detect batch mode
BATCH_MODE=false
if [[ "$1" == "--batch-mode" ]]; then
  BATCH_MODE=true
  shift
fi

# Batch mode: Run consolidated sync for ALL active increments
if [ "$BATCH_MODE" = "true" ]; then
  echo "[BATCH] Running consolidated sync for all active increments"

  # Read active increments
  mapfile -t ACTIVE_INCREMENTS < <(jq -r '.ids[]' "$ACTIVE_STATE_FILE")

  for INCREMENT_ID in "${ACTIVE_INCREMENTS[@]}"; do
    echo "[BATCH] Processing $INCREMENT_ID..."

    # Run all sync operations in single process
    sync_acs_batch "$INCREMENT_ID"
    sync_living_docs_batch "$INCREMENT_ID"
    sync_github_batch "$INCREMENT_ID"  # (if configured)

    echo "[BATCH] ✅ Completed $INCREMENT_ID"
  done

  exit 0
fi

# Normal mode: Single increment sync (existing logic)
...
```

**Key properties**:
- **Single process**: Replaces N individual hook processes
- **Consolidated**: All sync operations run sequentially in one process
- **Increment-aware**: Batches by increment, not globally

---

## Consequences

### Performance Impact

#### Before (v0.25.0 - Consolidation Only)

```
Single Edit (1 file):
  4 hooks × 1.5 processes/hook = 6 processes
  Execution time: 200-500ms
  Result: ✅ Acceptable

Bulk Edit (12 files):
  4 hooks × 12 files = 48 hooks
  48 hooks × 2.5 processes/hook = 120 processes
  Execution time: 5-10s → CRASH
  Result: ❌ Unacceptable
```

#### After (v0.26.0 - Bulk Detection + Batching)

```
Single Edit (1 file):
  4 hooks × 1.5 processes/hook = 6 processes
  Execution time: 200-500ms
  Result: ✅ Acceptable (unchanged)

Bulk Edit (12 files):
  - First 4 edits: Run normally (16 hooks)
  - Edit 5: Bulk mode detected
  - Edits 5-12: Individual hooks skipped (0 processes)
  - After 5s idle: 1 batch job (2-3 processes)

  Total: 16 hooks + 1 batch = ~22 processes (vs 120)
  Execution time: 2-3s (vs 5-10s crash)
  Result: ✅ Acceptable

  Reduction: 82% fewer processes
```

### Trade-offs

#### Advantages

1. **Automatic detection**: No user intervention required
2. **Graceful degradation**: Single edits unaffected
3. **Significant reduction**: 82-98% fewer processes for bulk operations
4. **Prevents crashes**: Keeps process count under system limits
5. **Transparent**: User workflow unchanged

#### Disadvantages

1. **Delayed sync**: 5-second delay for batch operations (vs immediate)
2. **Complexity**: More moving parts (counter, scheduler, batch mode)
3. **Potential race conditions**: Counter updates must be atomic
4. **Debugging difficulty**: Batch jobs run in background

### Acceptable Trade-offs

**5-second delay is acceptable** because:
- Alternative is **complete crash** (unacceptable)
- User doesn't notice during bulk operations (already takes 5-10s)
- Individual edits are still immediate (no delay)
- Delay only applies to hook execution, not file writes (writes are instant)

---

## Implementation Plan

### Phase 1: Core Components (Week 1)

- [x] Create bulk operation detector script
- [x] Create batch job scheduler script
- [x] Add batch mode to post-task-completion hook
- [ ] Integrate detector into all consolidated hooks:
  - `pre-edit-write-consolidated.sh`
  - `post-edit-write-consolidated.sh`
  - `post-metadata-change.sh`

### Phase 2: Testing (Week 1)

- [ ] Unit tests: Bulk operation detector
  - Test threshold detection (4 ops = normal, 5+ = bulk)
  - Test window reset (10s idle → counter reset)
  - Test atomic counter updates
- [ ] Integration tests: End-to-end bulk edit simulation
  - Simulate 12 Edit operations in 3 seconds
  - Verify batch job scheduled
  - Verify batch job runs after 5s idle
  - Verify process count < 30 (vs 120+ without batching)
- [ ] Stress tests: 50+ AC increment
  - Test with real-world large increments
  - Monitor process count
  - Verify no crashes

### Phase 3: Rollout (Week 2)

- [ ] Update CLAUDE.md with new architecture
- [ ] Add monitoring/telemetry:
  - Batch mode activation count
  - Average batch size
  - Process count reduction metrics
- [ ] Document troubleshooting:
  - How to detect if batching is working
  - How to disable batching (emergency)
  - How to adjust thresholds

---

## Validation

### Success Criteria

1. **No crashes** during bulk operations (10+ files)
2. **Process count < 30** for 12-file bulk edit (vs 120+ without batching)
3. **Single edits unaffected** (still run immediately, `<500ms`)
4. **User workflow unchanged** (no manual intervention required)

### Monitoring Metrics

```bash
# Hook performance dashboard
cat .specweave/logs/hook-metrics.jsonl | jq -r '
  select(.bulk_mode_detected == true) |
  {
    timestamp,
    operation_count,
    batch_delay_ms,
    process_count,
    sync_duration_ms
  }
'

# Expected output (successful batching):
{
  "timestamp": "2025-11-24T03:00:00Z",
  "operation_count": 12,
  "batch_delay_ms": 5000,
  "process_count": 22,
  "sync_duration_ms": 2400
}

# vs. without batching (would crash):
{
  "timestamp": "2025-11-24T02:06:00Z",
  "operation_count": 12,
  "batch_delay_ms": 0,
  "process_count": 120,  # ← Would crash here
  "sync_duration_ms": null
}
```

---

## Alternative Approaches Considered

### Alternative 1: Disable Hooks During Bulk Operations

**Approach**: Set `SPECWEAVE_DISABLE_HOOKS=1` in CLI commands

**Pros**:
- Simple implementation
- Zero hook overhead

**Cons**:
- Requires CLI code changes
- Doesn't help manual bulk edits
- All-or-nothing (no incremental sync)

**Decision**: Rejected - doesn't solve the root problem

### Alternative 2: Centralized Hook Orchestrator (v0.27.0)

**Approach**: TypeScript-based hook scheduler with operation queue

**Pros**:
- More sophisticated batching
- Better error handling
- Comprehensive telemetry

**Cons**:
- Much more complex (8-week implementation)
- Requires Node.js process running continuously
- Higher resource overhead

**Decision**: Deferred to v0.27.0 - bulk detector is good enough for v0.26.0

### Alternative 3: Rate Limiting (Fixed Delay Between Hooks)

**Approach**: Add `sleep 0.5` between hook executions

**Pros**:
- Simple implementation
- Reduces burst load

**Cons**:
- Doesn't prevent process storms (just slows them down)
- Adds delay to ALL operations (even single edits)
- Doesn't batch operations (still N separate processes)

**Decision**: Rejected - doesn't solve the root problem

---

## Migration Guide

### For Users

**No migration needed!** The bulk operation detector works automatically.

**Optional: Adjust thresholds** (if needed)

```bash
# In plugins/specweave/hooks/shared/bulk-operation-detector.sh

# Default (recommended for most users)
BULK_THRESHOLD=5      # 5+ operations = bulk mode
BULK_WINDOW=10        # seconds
IDLE_DELAY=5          # seconds

# For very large increments (50+ ACs)
BULK_THRESHOLD=3      # More aggressive batching
IDLE_DELAY=3          # Faster batch execution

# For small increments (disable batching)
BULK_THRESHOLD=999    # Effectively disable batching
```

### For Developers

**Hook integration pattern**:

```bash
#!/bin/bash
# my-hook.sh

# 1. Source bulk operation detector
source "$PROJECT_ROOT/plugins/specweave/hooks/shared/bulk-operation-detector.sh"

# 2. Check for bulk operation
BULK_STATUS=$(detect_bulk_operation "$INCREMENT_ID")

if [ "$BULK_STATUS" = "BULK_MODE_DETECTED" ]; then
  echo "[BULK] Skipping individual hook, batch job scheduled"
  exit 0
fi

# 3. Run normal hook logic
echo "[NORMAL] Running hook for single operation"
# ... existing hook code ...
```

---

## Related Decisions

- **ADR-0060**: Three-tier Hook Optimization (Context)
- **ADR-0070**: Hook Consolidation (Phase 1 - 6 → 4 hooks)
- **ADR-0072**: Active Increment Filtering (95% overhead reduction)
- **ADR-0128**: Hierarchical Hook Early Exit (Prevents infinite recursion)
- **ADR-0129**: US Sync Guard Rails (External tool cascade prevention)

---

## References

- Incident Analysis: `.specweave/increments/_archive/0053-safe-feature-deletion/reports/HOOK-PROCESS-STORM-CRASH-2025-11-24.md`
- Emergency Procedures: `.specweave/docs/internal/../operations/hook-crash-recovery.md`
- Circuit Breaker Design: `.specweave/docs/internal/emergency-procedures/CIRCUIT-BREAKER-MONITORING.md`

---

**Decision**: Implement bulk operation detection with 5-operation threshold and 5-second idle delay.

**Rationale**: Provides 82-98% reduction in hook overhead for bulk operations while maintaining immediate execution for single edits. Simple enough to implement in 1 week, sophisticated enough to prevent crashes.

**Next Steps**:
1. Implement core components (bulk detector, batch scheduler)
2. Integrate into consolidated hooks
3. Test with 50+ AC increment
4. Deploy to v0.26.0

**Status**: ✅ Accepted and ready for implementation
