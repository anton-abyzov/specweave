# Living Docs Auto Mode Integration - Usage Guide

**Version**: 1.0
**Date**: 2025-12-31
**Status**: Production Ready ✅

---

## Overview

Living docs can now run in **auto mode** with chunked execution, enabling long-running documentation updates that:
- Run for hours/days across multiple iterations
- Respect Claude Code stop hooks for controlled execution
- Save checkpoints after each phase for safe interruption/resume
- Integrate seamlessly with the auto-execution loop

---

## Quick Start

### Option 1: Via Task in Increment

Create a task in your increment's `tasks.md`:

```markdown
### T-XXX: Update Living Docs (Full Scan)
**User Story**: DOCS-001
**Satisfies ACs**: AC-D1-01
**Status**: [ ] pending

**Description**: Run complete living docs update through all 8 phases (A-H)

**Acceptance**:
- [ ] All 8 phases complete
- [ ] Documentation generated in .specweave/docs/internal/
- [ ] Checkpoint cleaned up
```

Then run:
```bash
/sw:auto
```

Auto mode will detect the living docs task and use chunked execution automatically.

### Option 2: Direct Command (in Auto Mode)

If an auto session is already running:

```bash
/sw:living-docs --depth deep-native
```

The command automatically detects auto mode and uses chunked execution (2 hours/iteration).

---

## The 8 Phases

Living docs executes through 8 phases sequentially:

| Phase | Name | What It Does | Typical Duration |
|-------|------|--------------|------------------|
| **A** | Discovery | Scan file structure, detect repos, entry points | 5-15 min |
| **B** | Deep Analysis | Per-repo AI analysis: purpose, APIs, patterns | 30-120 min |
| **C** | Org Synthesis | Infer teams, microservices, domains | 20-60 min |
| **D** | Architecture | Detect ADRs, generate system diagrams | 15-45 min |
| **E** | Inconsistencies | Find broken links, spec-code gaps, duplicates | 10-30 min |
| **F** | Strategy | Generate recommendations, tech debt catalog | 15-30 min |
| **G** | Enterprise | Build knowledge base: history, catalog, delivery docs | 30-90 min |
| **H** | Diagrams | Generate Mermaid visualizations | 10-20 min |

**Total**: 2-7 hours for typical projects (varies by size and complexity)

---

## How It Works

### Chunked Execution Flow

```
┌──────────────────────────────────────────────────────────────┐
│ ITERATION 1: Execute Phase A (2 hours max)                  │
│   ↓                                                          │
│ Save checkpoint: {currentPhase: "A", completedPhases: []}   │
│   ↓                                                          │
│ Stop Hook: Detects checkpoint, blocks exit                  │
│   ↓                                                          │
│ "📚 LIVING DOCS UPDATE (12% complete)"                       │
│ "Continue with /sw:do to proceed..."                        │
├──────────────────────────────────────────────────────────────┤
│ ITERATION 2: Execute Phase B (2 hours max)                  │
│   ↓                                                          │
│ Update checkpoint: {currentPhase: "B", completedPhases:["A"]}│
│   ↓                                                          │
│ Stop Hook: Still incomplete, blocks exit                    │
│   ↓                                                          │
│ "📚 LIVING DOCS UPDATE (25% complete)"                       │
├──────────────────────────────────────────────────────────────┤
│ ... Phases C, D, E, F, G ...                                │
├──────────────────────────────────────────────────────────────┤
│ ITERATION 8: Execute Phase H (final phase)                  │
│   ↓                                                          │
│ Update checkpoint: {completedPhases: ["A".."H"]}            │
│   ↓                                                          │
│ Stop Hook: All 8 phases complete                            │
│   ↓                                                          │
│ Cleanup checkpoint file                                     │
│   ↓                                                          │
│ Allow normal task completion flow                           │
└──────────────────────────────────────────────────────────────┘
```

### Checkpoint Structure

Checkpoint file: `.specweave/state/living-docs-checkpoint.json`

```json
{
  "currentPhase": "C",
  "completedPhases": ["A", "B"],
  "phaseProgress": {
    "C": {
      "teamsAnalyzed": 2,
      "totalTeams": 5
    }
  },
  "startTime": "2025-12-31T08:00:00Z",
  "lastUpdate": "2025-12-31T08:45:00Z",
  "totalPhases": 8
}
```

---

## Stop Hook Integration

The stop hook (`plugins/specweave/hooks/stop-auto.sh`) checks for living docs checkpoints at **line 532**.

### Stop Hook Behavior

**When checkpoint exists and phases incomplete:**
- **Blocks** exit
- **Displays** rich progress UI
- **Logs** progress to `auto-iterations.log`
- **Re-feeds** prompt to continue

**When all 8 phases complete:**
- **Cleans up** checkpoint file
- **Allows** normal task completion flow
- **Logs** completion event

### Stop Hook Output Example

```
📚 LIVING DOCS UPDATE (37% complete)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Phase: Architecture
Progress: 3/8 phases complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase Status:
  ✅ Phase A: Discovery
  ✅ Phase B: Deep Analysis
  ✅ Phase C: Org Synthesis
  🔄 Phase D: Architecture (in progress)
  ⏳ Phase E: Inconsistencies
  ⏳ Phase F: Strategy
  ⏳ Phase G: Enterprise
  ⏳ Phase H: Diagrams
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Continue with /sw:do to proceed with living docs update.
This will run for multiple iterations until all phases complete.

💡 Living docs runs in chunked mode (2 hours/iteration) and saves
   checkpoints after each phase. Safe to interrupt anytime!
```

---

## Testing & Validation

### Test Results (2025-12-31)

**✅ All Tests Passing**

| Test | Status | Details |
|------|--------|---------|
| **TypeScript Build** | ✅ Pass | Zero errors, all types correct |
| **Checkpoint Load/Save** | ✅ Pass | Correctly persists and loads state |
| **Progress Summary** | ✅ Pass | Displays accurate phase status |
| **Stop Hook Detection** | ✅ Pass | Blocks exit when phases incomplete |
| **Stop Hook UI** | ✅ Pass | Rich progress display with emojis |
| **Checkpoint Cleanup** | ✅ Pass | Removes file after completion |
| **Auto Mode Detection** | ✅ Pass | Routes to chunked execution |

### Manual Test Scenarios

**Scenario 1: Early Phase (25% complete)**
```bash
# Setup test checkpoint
cat > .specweave/state/living-docs-checkpoint.json << 'EOF'
{
  "currentPhase": "C",
  "completedPhases": ["A", "B"],
  "phaseProgress": {},
  "startTime": "2025-12-31T08:00:00Z",
  "lastUpdate": "2025-12-31T08:45:00Z",
  "totalPhases": 8
}
EOF

# Test stop hook
cat .specweave/state/auto-session.json | bash plugins/specweave/hooks/stop-auto.sh

# Expected: Blocks with "📚 LIVING DOCS UPDATE (25% complete)"
# Result: ✅ PASS
```

**Scenario 2: Final Phase (87% complete)**
```bash
# Setup test checkpoint
cat > .specweave/state/living-docs-checkpoint.json << 'EOF'
{
  "currentPhase": "H",
  "completedPhases": ["A", "B", "C", "D", "E", "F", "G"],
  "phaseProgress": {},
  "startTime": "2025-12-31T08:00:00Z",
  "lastUpdate": "2025-12-31T11:30:00Z",
  "totalPhases": 8
}
EOF

# Test stop hook
cat .specweave/state/auto-session.json | bash plugins/specweave/hooks/stop-auto.sh

# Expected: Blocks with "📚 LIVING DOCS UPDATE (87% complete)"
# Result: ✅ PASS
```

**Scenario 3: All Complete (100%)**
```bash
# Setup test checkpoint
cat > .specweave/state/living-docs-checkpoint.json << 'EOF'
{
  "currentPhase": "H",
  "completedPhases": ["A", "B", "C", "D", "E", "F", "G", "H"],
  "phaseProgress": {},
  "startTime": "2025-12-31T08:00:00Z",
  "lastUpdate": "2025-12-31T12:00:00Z",
  "totalPhases": 8
}
EOF

# Test stop hook
cat .specweave/state/auto-session.json | bash plugins/specweave/hooks/stop-auto.sh

# Expected: Cleans up checkpoint, continues to normal task flow
# Result: ✅ PASS (checkpoint file removed)
```

---

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `src/core/background/living-docs-executor.ts` | Chunked execution engine |
| `plugins/specweave/hooks/stop-auto.sh` | Stop hook integration (lines 532-601) |
| `src/cli/commands/living-docs.ts` | Auto mode detection and routing |
| `.specweave/state/living-docs-checkpoint.json` | Checkpoint persistence |

### API Reference

**TypeScript Functions**:

```typescript
// Load checkpoint from filesystem
function loadLivingDocsCheckpoint(projectPath: string): LivingDocsCheckpoint | null

// Save checkpoint to filesystem
function saveLivingDocsCheckpoint(projectPath: string, checkpoint: LivingDocsCheckpoint): void

// Execute one chunk (30 min max)
async function executeLivingDocsChunk(options: ChunkedExecutionOptions): Promise<ChunkResult>

// Get progress summary for display
function getProgressSummary(checkpoint: LivingDocsCheckpoint): string

// Clean up checkpoint after completion
function cleanupCheckpoint(projectPath: string): void
```

**Bash Functions** (in `stop-auto.sh`):

```bash
# Lines 532-601: Living docs checkpoint check
# - Loads checkpoint from .specweave/state/
# - Calculates progress percentage
# - Builds phase status UI
# - Blocks exit if incomplete
# - Cleans up if complete
```

---

## Troubleshooting

### Issue: Living Docs Not Using Chunked Mode

**Symptom**: Living docs launches as background job instead of chunked execution

**Cause**: Auto session not detected

**Fix**:
```bash
# Check for auto session
cat .specweave/state/auto-session.json

# If missing, start auto mode first
/sw:auto
```

---

### Issue: Checkpoint Persists After Completion

**Symptom**: Checkpoint file remains after all 8 phases complete

**Cause**: Stop hook may not have cleaned up properly

**Fix**:
```bash
# Manually remove checkpoint
rm -f .specweave/state/living-docs-checkpoint.json

# Check logs for errors
cat .specweave/logs/auto-iterations.log | grep living_docs
```

---

### Issue: Stop Hook Not Blocking

**Symptom**: Auto mode exits even with incomplete living docs

**Cause**: Checkpoint file might be malformed or missing

**Fix**:
```bash
# Validate checkpoint JSON
jq . .specweave/state/living-docs-checkpoint.json

# Check phase count
jq '.completedPhases | length' .specweave/state/living-docs-checkpoint.json
```

---

## Best Practices

### 1. Run During Off-Hours

Living docs can take 2-7 hours for large projects. Use auto mode to run overnight:

```bash
# Start auto mode with time limit
/sw:auto --max-hours 8

# Let it run overnight, checkpoint saves progress
```

### 2. Monitor Progress

Check progress periodically:

```bash
# View current checkpoint
cat .specweave/state/living-docs-checkpoint.json | jq '.'

# Check logs
tail -f .specweave/logs/auto-iterations.log | grep living_docs
```

### 3. Safe to Interrupt

You can interrupt anytime:
- Ctrl+C to stop
- Checkpoint saves after each phase
- Resume automatically on next `/sw:do`

---

## Advanced Usage

### Custom Phase Duration

Modify chunk duration in `living-docs.ts`:

```typescript
const result = await executeLivingDocsChunk({
  projectPath,
  maxDuration: 4 * 60 * 60 * 1000, // 4 hours instead of 2
  checkpoint: checkpoint || undefined,
  stopOnPhaseComplete: true,
});
```

### Skip Specific Phases

Not recommended, but possible by modifying checkpoint:

```bash
# Skip Phase B (Deep Analysis)
jq '.completedPhases += ["B"]' checkpoint.json > tmp && mv tmp checkpoint.json
```

---

## Related Documentation

- [ADR-0068: Living Docs Auto Mode Integration](../architecture/adr/0068-living-docs-auto-mode-integration.md)
- [Living Docs Command Reference](../../../../../../plugins/specweave/commands/living-docs.md)
- [Auto Mode Documentation](../../../../../../plugins/specweave/commands/auto.md)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-31 | Initial implementation - full auto mode integration |

---

**Status**: Production Ready ✅
**Tested**: All scenarios passing
**Build**: TypeScript compilation successful
**Integration**: Stop hook working correctly
