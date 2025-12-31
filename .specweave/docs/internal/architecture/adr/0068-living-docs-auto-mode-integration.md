# ADR-0068: Living Docs Auto Mode Integration

**Status**: Proposed
**Date**: 2025-12-31
**Decision Makers**: SpecWeave Core Team

---

## Context

Currently, `/sw:living-docs` runs as a **detached background process** that:
- Spawns once, completes all phases (A-H), then exits
- Doesn't integrate with auto mode's stop hook mechanism
- Can't be controlled by the Ralph Wiggum auto-execution loop

**User Request**: Make living docs updates run in "auto mode" where they:
1. Run continuously for extended periods (hours/days)
2. Respect Claude Code stop hooks for controlled execution
3. Allow incremental progress with checkpoint/resume across iterations

---

## Problem Statement

### Current Limitations

```
┌─────────────────────────────────────────────────────────────┐
│ CURRENT: Detached Background Process                        │
├─────────────────────────────────────────────────────────────┤
│ /sw:living-docs --full-scan                                 │
│          │                                                    │
│          ▼                                                    │
│   Spawn detached worker (PID 12345)                         │
│          │                                                    │
│          ├─→ Phase A: Discovery (30s)                        │
│          ├─→ Phase B: Deep Analysis (2hrs)                   │
│          ├─→ Phase C: Org Synthesis (1hr)                    │
│          ├─→ Phase D: Architecture (45min)                   │
│          ├─→ Phase E: Inconsistencies (30min)                │
│          ├─→ Phase F: Strategy (20min)                       │
│          ├─→ Phase G: Enterprise (1hr)                       │
│          ├─→ Phase H: Diagrams (15min)                       │
│          │                                                    │
│          ▼                                                    │
│   EXIT (job complete, no more updates)                      │
└─────────────────────────────────────────────────────────────┘

❌ ISSUES:
- No integration with auto mode's stop hook
- Runs to completion then exits (one-shot)
- Can't be controlled by Ralph Wiggum loop
- Doesn't participate in auto mode's iteration tracking
```

### Desired Behavior (Auto Mode Integration)

```
┌─────────────────────────────────────────────────────────────┐
│ DESIRED: Auto Mode Loop with Stop Hook Integration          │
├─────────────────────────────────────────────────────────────┤
│ /sw:auto                                                     │
│   └─→ Task: "Update living docs continuously"               │
│          │                                                    │
│          ▼                                                    │
│   Execute phase chunk (2 hours max)                         │
│          │                                                    │
│          ▼                                                    │
│   Stop Hook: stop-auto.sh checks:                           │
│   ├─ Phase complete?         → Block exit, continue          │
│   ├─ Max iterations reached? → Approve exit                  │
│   └─ All phases done?        → Approve exit                  │
│          │                                                    │
│          ▼                                                    │
│   Re-feed prompt with next chunk                             │
│          │                                                    │
│          ▼                                                    │
│   Execute next phase chunk...                                │
│          │                                                    │
│   (LOOP continues for hours/days)                            │
└─────────────────────────────────────────────────────────────┘

✅ BENEFITS:
- Integrates with auto mode's Ralph Wiggum loop
- Respects stop hooks for controlled execution
- Incremental progress across iterations
- Can run for extended periods (days/weeks)
- Checkpoint/resume across auto sessions
```

---

## Decision

**Implement living docs as an auto-mode-aware task** with the following architecture:

### Option A: Living Docs as Auto Mode Task (RECOMMENDED)

**Architecture**:
```typescript
// In /sw:auto, detect living docs task
if (task.includes('living docs') || task.includes('update docs')) {
  // Launch living docs in CHUNKED mode
  await executeLivingDocsChunk({
    maxDuration: 30 * 60 * 1000, // 30 minutes max per iteration
    checkpoint: getLastCheckpoint(),
    stopOnPhaseComplete: true,    // Yield control back to auto mode
  });
}
```

**Stop Hook Integration** (`stop-auto.sh`):
```bash
# Check if living docs task is active
LIVING_DOCS_CHECKPOINT="$STATE_DIR/living-docs-checkpoint.json"

if [ -f "$LIVING_DOCS_CHECKPOINT" ]; then
  CURRENT_PHASE=$(jq -r '.currentPhase // "unknown"' "$LIVING_DOCS_CHECKPOINT")
  COMPLETED_PHASES=$(jq -r '.completedPhases | length' "$LIVING_DOCS_CHECKPOINT")
  TOTAL_PHASES=8

  if [ "$COMPLETED_PHASES" -lt "$TOTAL_PHASES" ]; then
    # More phases to complete
    block "Living docs update in progress" "Continue with /sw:do to update docs (phase $CURRENT_PHASE, $COMPLETED_PHASES/$TOTAL_PHASES complete)"
  else
    # All phases complete
    approve "Living docs update complete"
  fi
fi
```

**Execution Flow**:
1. User runs `/sw:auto` with living docs task
2. Auto mode executes living docs in 30-minute chunks
3. After each chunk, stop hook checks progress
4. If incomplete → block exit, re-feed prompt
5. If complete → approve exit
6. Checkpoint saved after each phase for resume

### Option B: Hybrid Approach (Background + Auto Mode Control)

Keep background process but add control signals:

```bash
# Living docs worker checks for stop signal
while true; do
  # Execute phase chunk
  execute_phase_chunk

  # Check for stop signal from auto mode
  if [ -f "$STOP_SIGNAL_FILE" ]; then
    save_checkpoint
    exit 0
  fi

  # Check if all phases complete
  if [ "$COMPLETED_PHASES" -eq "$TOTAL_PHASES" ]; then
    exit 0
  fi
done
```

**Stop hook sends signals**:
```bash
# In stop-auto.sh
if [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
  # Signal living docs to stop gracefully
  touch "$PROJECT_ROOT/.specweave/state/living-docs-stop-signal"
  approve "Max iterations reached, stopping living docs"
fi
```

---

## Implementation Plan

### Phase 1: Add Chunked Execution Mode

**File**: `src/core/background/living-docs-executor.ts` (NEW)

```typescript
export interface ChunkedExecutionOptions {
  maxDuration: number;        // Max ms per chunk
  checkpoint?: Checkpoint;    // Resume from checkpoint
  stopOnPhaseComplete: boolean; // Yield after phase
}

export async function executeLivingDocsChunk(
  options: ChunkedExecutionOptions
): Promise<ChunkResult> {
  const startTime = Date.now();
  const checkpoint = options.checkpoint || loadCheckpoint();

  let currentPhase = checkpoint.currentPhase || 'A';
  let phaseProgress = checkpoint.phaseProgress || {};

  while (Date.now() - startTime < options.maxDuration) {
    // Execute current phase
    const phaseResult = await executePhase(currentPhase, phaseProgress);

    if (phaseResult.complete) {
      // Save checkpoint
      saveCheckpoint({ currentPhase, completedPhases: [...checkpoint.completedPhases, currentPhase] });

      if (options.stopOnPhaseComplete) {
        // Yield control back to auto mode
        return { status: 'phase_complete', nextPhase: getNextPhase(currentPhase) };
      }

      currentPhase = getNextPhase(currentPhase);
      if (!currentPhase) {
        // All phases complete
        return { status: 'all_complete' };
      }
    } else {
      // Phase still in progress
      phaseProgress = phaseResult.progress;
      saveCheckpoint({ currentPhase, phaseProgress });
    }
  }

  // Time limit reached
  return { status: 'time_limit', currentPhase, progress: phaseProgress };
}
```

### Phase 2: Update Stop Hook

**File**: `plugins/specweave/hooks/stop-auto.sh`

Add after line 530 (before human gate check):

```bash
# ============================================================================
# LIVING DOCS UPDATE CHECK
# ============================================================================

LIVING_DOCS_CHECKPOINT="$STATE_DIR/living-docs-checkpoint.json"

if [ -f "$LIVING_DOCS_CHECKPOINT" ]; then
    CURRENT_PHASE=$(jq -r '.currentPhase // "unknown"' "$LIVING_DOCS_CHECKPOINT")
    COMPLETED_PHASES=$(jq -r '.completedPhases | length' "$LIVING_DOCS_CHECKPOINT")
    TOTAL_PHASES=8
    PHASE_NAMES=(
        "A:Discovery"
        "B:Deep Analysis"
        "C:Org Synthesis"
        "D:Architecture"
        "E:Inconsistencies"
        "F:Strategy"
        "G:Enterprise"
        "H:Diagrams"
    )

    if [ "$COMPLETED_PHASES" -lt "$TOTAL_PHASES" ]; then
        PHASE_NAME="${PHASE_NAMES[$COMPLETED_PHASES]}"
        PROGRESS_PCT=$((COMPLETED_PHASES * 100 / TOTAL_PHASES))

        block "Living docs update in progress" "📚 LIVING DOCS UPDATE ($PROGRESS_PCT% complete)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Phase: $PHASE_NAME
Completed: $COMPLETED_PHASES/$TOTAL_PHASES phases
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Continue with /sw:do to proceed with living docs update.
This will run for multiple iterations until all phases complete."
    fi

    # All phases complete - allow exit
    if [ "$COMPLETED_PHASES" -eq "$TOTAL_PHASES" ]; then
        rm -f "$LIVING_DOCS_CHECKPOINT"
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"living_docs_complete\",\"phases\":$TOTAL_PHASES}" >> "$LOGS_DIR/auto-iterations.log"
    fi
fi
```

### Phase 3: Add Auto Mode Detection

**File**: `src/cli/commands/living-docs.ts`

Add check for auto mode:

```typescript
// Check if running in auto mode
const autoSession = loadAutoSession(projectPath);
const isAutoMode = autoSession?.status === 'running';

if (isAutoMode) {
  // Use chunked execution for auto mode
  const result = await executeLivingDocsChunk({
    maxDuration: 30 * 60 * 1000, // 30 min chunks
    checkpoint: loadLivingDocsCheckpoint(projectPath),
    stopOnPhaseComplete: true,
  });

  console.log(chalk.green(`Phase ${result.nextPhase || 'complete'}: ${result.status}`));
} else {
  // Traditional background job
  await launchLivingDocsJob({
    projectPath,
    userInputs,
    dependsOn,
    foreground: options.foreground,
  });
}
```

---

## Usage Examples

### Example 1: Continuous Living Docs Update in Auto Mode

```bash
# Create task for living docs update
cat > .specweave/increments/0042-living-docs-update/tasks.md << 'EOF'
### T-001: Update Living Docs (All Phases)
**User Story**: MAINT-001
**Satisfies ACs**: AC-M1-01
**Status**: [ ] pending

**Description**: Run full living docs update through all 8 phases

**Phases**:
- [ ] A: Discovery
- [ ] B: Deep Analysis
- [ ] C: Org Synthesis
- [ ] D: Architecture
- [ ] E: Inconsistencies
- [ ] F: Strategy
- [ ] G: Enterprise
- [ ] H: Diagrams
EOF

# Start auto mode
/sw:auto 0042

# Auto mode will:
# 1. Execute living docs in 30-minute chunks
# 2. Stop hook checks progress after each chunk
# 3. Block exit until all 8 phases complete
# 4. Re-feed prompt to continue next phase
# 5. Loop continues for hours/days until done
```

### Example 2: Resume After Interruption

```bash
# Auto session interrupted (Ctrl+C, crash, etc.)

# Check status
/sw:auto-status
# Shows: Phase D complete (4/8), checkpoint saved

# Resume
/sw:auto
# Continues from Phase E
```

### Example 3: Priority Modules with Auto Mode

```bash
# Create focused update task
cat > .specweave/increments/0043-auth-docs-update/tasks.md << 'EOF'
### T-001: Update Auth Module Documentation
**Priority**: auth,payments,api
**Depth**: deep-native
**Status**: [ ] pending
EOF

/sw:auto 0043 --max-hours 4

# Runs focused update on priority modules for max 4 hours
```

---

## Trade-offs

### Option A: Living Docs as Auto Mode Task

**Pros**:
- ✅ Full integration with stop hook mechanism
- ✅ Controlled execution with iteration limits
- ✅ Natural checkpoint/resume across auto sessions
- ✅ User visibility into progress via task tracking

**Cons**:
- ⚠️ Requires refactoring living docs to support chunked execution
- ⚠️ More complex state management (checkpoint format)
- ⚠️ May need multiple auto sessions for large projects

### Option B: Hybrid (Background + Control Signals)

**Pros**:
- ✅ Minimal changes to existing background job system
- ✅ Works with current detached process architecture

**Cons**:
- ⚠️ Less integration with auto mode's iteration tracking
- ⚠️ Signal-based control is more fragile
- ⚠️ Harder to debug and monitor progress

**DECISION**: Use **Option A** for better integration and user experience.

---

## Consequences

### Positive

1. **Long-running docs updates** - Can run for days/weeks with checkpoints
2. **Auto mode integration** - Living docs participates in Ralph Wiggum loop
3. **Controlled execution** - Stop hook prevents runaway processes
4. **Incremental progress** - Users see phase-by-phase updates
5. **Resume capability** - Interrupt and resume without losing work

### Negative

1. **Complexity** - Adds chunked execution mode to living docs
2. **State management** - Checkpoint format must be robust
3. **Testing** - Need to test multi-session execution
4. **Documentation** - Users need to understand auto mode integration

### Neutral

1. **Two execution modes** - Auto mode (chunked) vs standalone (background)
2. **Checkpoint compatibility** - Must work with existing resume mechanism

---

## References

- [stop-auto.sh](../../../../../../plugins/specweave/hooks/stop-auto.sh) - Auto mode stop hook
- [living-docs.md](../../../../../../plugins/specweave/commands/living-docs.md) - Living docs command docs
- [ADR-0042](./0042-ralph-wiggum-auto-execution.md) - Ralph Wiggum auto execution pattern
- [job-launcher.ts](../../../../../../src/core/background/job-launcher.ts) - Background job system

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `src/core/background/living-docs-executor.ts` with chunked execution
- [ ] Add checkpoint format with phase tracking
- [ ] Implement `executeLivingDocsChunk()` function
- [ ] Add phase detection and progress tracking

### Phase 2: Stop Hook Integration
- [ ] Update `stop-auto.sh` with living docs checkpoint check (line 530+)
- [ ] Add phase progress display in block message
- [ ] Log living docs events to `auto-iterations.log`
- [ ] Test stop hook with living docs checkpoint

### Phase 3: Command Integration
- [ ] Update `living-docs.ts` to detect auto mode
- [ ] Add chunked execution path for auto mode
- [ ] Maintain backward compatibility with standalone mode
- [ ] Update help text and examples

### Phase 4: Testing
- [ ] Test single-phase execution and checkpoint
- [ ] Test multi-phase execution across iterations
- [ ] Test resume after auto session interruption
- [ ] Test with --max-iterations limit
- [ ] Test with --max-hours limit

### Phase 5: Documentation
- [ ] Update `/sw:living-docs` command docs
- [ ] Update `/sw:auto` documentation with living docs example
- [ ] Add usage examples to CLAUDE.md
- [ ] Create user guide for long-running docs updates

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Long-running execution** | Run for 24+ hours without crash | Test on large project (247 repos) |
| **Checkpoint/resume** | Zero work loss on interruption | Interrupt at random phase, resume successfully |
| **Stop hook integration** | 100% controlled exit | Verify stop hook blocks/approves correctly |
| **User visibility** | Phase progress in /sw:auto-status | Check status shows current phase |

---

**Approved by**: Pending
**Implementation Start**: TBD
**Expected Completion**: TBD
