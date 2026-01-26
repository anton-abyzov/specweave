---
increment: 0148-autonomous-execution-auto
title: "Autonomous Execution Engine - Technical Architecture"
phases:
  - foundation
  - stop-hook
  - commands
  - orchestration
  - testing
  - integration
estimated_weeks: 3-4
---

# Technical Architecture Plan

## Overview

This increment implements the Auto feature for SpecWeave, enabling Claude Code to work autonomously for extended periods using the Stop Hook mechanism.

**Core Insight**: Claude Code's Stop Hook can block session exit and re-feed a prompt, creating a feedback loop. By combining this with SpecWeave's existing workflow commands (`/sw:do`, `/sw:done`, `/sw:next`), we create an autonomous execution engine.

---

## Phase 1: Foundation (Week 1)

### 1.1 Session State Management

**File**: `src/core/auto/session-state.ts`

```typescript
interface AutoSession {
  sessionId: string;
  status: 'initializing' | 'running' | 'paused' | 'needs_human' | 'completed' | 'failed';
  startTime: string;
  iteration: number;
  maxIterations: number;
  maxHours: number;
  completionPromise: string;
  originalPrompt: string;
  incrementQueue: string[];
  currentIncrement: string | null;
  completedIncrements: string[];
  checkpoints: Checkpoint[];
}

class SessionStateManager {
  private statePath: string;

  constructor(projectRoot: string) {
    this.statePath = path.join(projectRoot, '.specweave/state/auto-session.json');
  }

  async load(): Promise<AutoSession | null>;
  async save(session: AutoSession): Promise<void>;
  async clear(): Promise<void>;
  async checkpoint(session: AutoSession): Promise<void>;
  async recover(): Promise<AutoSession | null>;
}
```

### 1.2 Configuration Schema

**File**: `src/core/auto/config.ts`

```typescript
interface AutoConfig {
  enabled: boolean;
  maxIterations: number;        // Default: 100
  maxHours: number;             // Default: 24
  completionPromise: string;    // Default: "AUTO_COMPLETE"
  testCommand: string;          // Default: "npm test"
  coverageThreshold: number;    // Default: 80
  humanGated: HumanGatedConfig;
  circuitBreakers: CircuitBreakerConfig;
  sync: SyncConfig;
}

// Load from .specweave/config.json with sensible defaults
function loadAutoConfig(projectRoot: string): AutoConfig;
```

### 1.3 Logging Infrastructure

**File**: `src/core/auto/logger.ts`

```typescript
class AutoLogger {
  constructor(sessionId: string);

  logIteration(iteration: number, phase: string, details: object): void;
  logGate(gateName: string, approved: boolean, reason: string): void;
  logTest(result: TestResult): void;
  logSync(tool: string, result: SyncResult): void;
  logCircuitBreaker(service: string, state: CircuitState): void;
  generateSummary(): AutoSummary;
}
```

---

## Phase 2: Stop Hook Implementation (Week 1-2)

### 2.1 Stop Hook Script

**File**: `plugins/specweave/hooks/stop-auto.sh`

```bash
#!/usr/bin/env bash
#
# Auto Stop Hook - Creates feedback loop for autonomous execution
#
# Triggered: When Claude Code tries to exit
# Behavior: Blocks exit if auto session is active, re-feeds prompt
#

set -e

PROJECT_ROOT="${PWD}"
STATE_FILE="${PROJECT_ROOT}/.specweave/state/auto-session.json"
LOG_DIR="${PROJECT_ROOT}/.specweave/logs"

# Check if auto session exists
if [[ ! -f "$STATE_FILE" ]]; then
    # No auto session - allow normal exit
    echo '{"decision": "approve"}'
    exit 0
fi

# Load session state
SESSION=$(cat "$STATE_FILE")
STATUS=$(echo "$SESSION" | jq -r '.status')
ITERATION=$(echo "$SESSION" | jq -r '.iteration')
MAX_ITERATIONS=$(echo "$SESSION" | jq -r '.maxIterations')
COMPLETION_PROMISE=$(echo "$SESSION" | jq -r '.completionPromise')
ORIGINAL_PROMPT=$(echo "$SESSION" | jq -r '.originalPrompt')

# Check if already completed or failed
if [[ "$STATUS" == "completed" || "$STATUS" == "failed" ]]; then
    echo '{"decision": "approve"}'
    exit 0
fi

# Check max iterations
if [[ "$ITERATION" -ge "$MAX_ITERATIONS" ]]; then
    # Update status to completed (max iterations reached)
    jq '.status = "completed" | .endReason = "max_iterations"' "$STATE_FILE" > "$STATE_FILE.tmp"
    mv "$STATE_FILE.tmp" "$STATE_FILE"

    echo '{"decision": "approve", "reason": "Max iterations reached. Auto session complete."}'
    exit 0
fi

# Check for completion promise in transcript
TRANSCRIPT_PATH="$1"  # Passed by Claude Code
if [[ -f "$TRANSCRIPT_PATH" ]]; then
    # Extract last assistant message
    LAST_MESSAGE=$(tail -1 "$TRANSCRIPT_PATH" | jq -r '.content // ""')

    if echo "$LAST_MESSAGE" | grep -q "<auto-complete>$COMPLETION_PROMISE</auto-complete>"; then
        # Completion promise detected - allow exit
        jq '.status = "completed" | .endReason = "completion_promise"' "$STATE_FILE" > "$STATE_FILE.tmp"
        mv "$STATE_FILE.tmp" "$STATE_FILE"

        echo '{"decision": "approve", "reason": "Auto complete! All work finished."}'
        exit 0
    fi
fi

# Check for human gate pending
PENDING_GATE=$(echo "$SESSION" | jq -r '.humanGates.pending // null')
if [[ "$PENDING_GATE" != "null" ]]; then
    # Human gate pending - pause and wait
    echo "{\"decision\": \"block\", \"reason\": \"Human approval required for: $PENDING_GATE. Please approve or deny.\", \"systemMessage\": \"AUTO PAUSED: Awaiting human approval\"}"
    exit 0
fi

# Increment iteration counter
NEXT_ITERATION=$((ITERATION + 1))
jq ".iteration = $NEXT_ITERATION" "$STATE_FILE" > "$STATE_FILE.tmp"
mv "$STATE_FILE.tmp" "$STATE_FILE"

# Log iteration
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Iteration $NEXT_ITERATION started" >> "${LOG_DIR}/auto-iterations.log"

# Block exit and re-feed prompt
CONTEXT="Auto iteration $NEXT_ITERATION of $MAX_ITERATIONS. Continue working on: $ORIGINAL_PROMPT"

cat <<EOF
{
  "decision": "block",
  "reason": "$CONTEXT",
  "systemMessage": "AUTO ACTIVE: Iteration $NEXT_ITERATION/$MAX_ITERATIONS"
}
EOF
```

### 2.2 Hook Registration

**File**: `.claude/hooks.json` (auto-added by setup script)

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash plugins/specweave/hooks/stop-auto.sh $TRANSCRIPT_PATH"
          }
        ]
      }
    ]
  }
}
```

---

## Phase 3: Command Implementation (Week 2)

### 3.1 Auto Command

**File**: `plugins/specweave/commands/auto.md`

```yaml
---
name: sw:auto
description: Start autonomous execution session. Claude works continuously until completion promise or max iterations.
---

# Auto - Autonomous Execution

**Usage**: /sw:auto "<task>" [--max-iterations N] [--max-hours N] [--increments id1,id2]
```

**Implementation**: `plugins/specweave/scripts/setup-auto.sh`

### 3.2 Cancel Command

**File**: `plugins/specweave/commands/cancel-auto.md`

### 3.3 Status Command

**File**: `plugins/specweave/commands/auto-status.md`

---

## Phase 4: Multi-Increment Orchestration (Week 2-3)

### 4.1 Increment Queue Manager

**File**: `src/core/auto/increment-queue.ts`

```typescript
class IncrementQueueManager {
  constructor(private session: AutoSession);

  async getCurrentIncrement(): Promise<Increment | null>;
  async moveToNext(): Promise<Increment | null>;
  async validateDependencies(incrementId: string): Promise<boolean>;
  async checkWIPLimits(): Promise<boolean>;
  async getQueueStatus(): Promise<QueueStatus>;
}
```

### 4.2 Increment Transition Logic

- After `/sw:done` succeeds for current increment
- Check if more increments in queue
- Validate dependencies satisfied
- Check WIP limits
- Transition to next or complete session

---

## Phase 5: Test-Driven Gates (Week 3)

### 5.1 Test Gate Enforcement

**File**: `src/core/auto/test-gate.ts`

```typescript
interface TestGateResult {
  passed: boolean;
  unitTests: TestSuiteResult;
  integrationTests: TestSuiteResult | null;
  e2eTests: TestSuiteResult | null;
  coverage: number;
  failureDetails: TestFailure[];
}

class TestGate {
  constructor(private config: AutoConfig);

  async runGate(): Promise<TestGateResult>;
  async attemptFix(failures: TestFailure[]): Promise<boolean>;
  async escalateToHuman(failures: TestFailure[]): Promise<void>;
}
```

### 5.2 Playwright Integration

- Detect `playwright.config.ts` or `playwright.config.js`
- Run E2E suite as part of test gate
- Parse Playwright JSON report for results

---

## Phase 6: Human Gates (Week 3)

### 6.1 Gate Detection

**File**: `src/core/auto/human-gate.ts`

```typescript
class HumanGateDetector {
  private patterns: RegExp[];

  constructor(config: HumanGatedConfig);

  detectGate(content: string): HumanGate | null;
  async requestApproval(gate: HumanGate): Promise<ApprovalResult>;
  async waitForApproval(timeout: number): Promise<ApprovalResult>;
}
```

### 6.2 Default Patterns

```typescript
const DEFAULT_HUMAN_GATE_PATTERNS = [
  /deploy/i,
  /migrate/i,
  /publish/i,
  /push\s+--force/i,
  /rm\s+-rf/i,
  /API_KEY|SECRET|PASSWORD|TOKEN/,
  /production|prod\s+/i,
];
```

---

## Phase 7: Circuit Breakers (Week 3)

### 7.1 Circuit Breaker Implementation

**File**: `src/core/auto/circuit-breaker.ts`

```typescript
enum CircuitState {
  CLOSED = 'closed',    // Normal operation
  OPEN = 'open',        // Failing, reject calls
  HALF_OPEN = 'half_open'  // Testing recovery
}

class CircuitBreaker {
  constructor(
    private name: string,
    private failureThreshold: number = 3,
    private resetTimeout: number = 300000  // 5 minutes
  );

  async execute<T>(fn: () => Promise<T>): Promise<T>;
  getState(): CircuitState;
  recordFailure(error: Error): void;
  recordSuccess(): void;
}
```

### 7.2 Service-Specific Breakers

- GitHub API circuit breaker
- JIRA API circuit breaker
- ADO API circuit breaker
- General HTTP circuit breaker

---

## Phase 8: Sync Integration (Week 3-4)

### 8.1 Checkpoint Sync

**File**: `src/core/auto/sync-checkpoint.ts`

```typescript
class SyncCheckpoint {
  private lastSync: Date;
  private batchInterval: number;

  async shouldSync(): Promise<boolean>;
  async performSync(): Promise<SyncResult>;
  async forceFinalSync(): Promise<SyncResult>;
}
```

### 8.2 Deferred Sync Queue

- Queue sync operations during execution
- Batch to minimize API calls
- Force flush on increment completion
- Force flush on session end

---

## File Structure

```
plugins/specweave/
├── commands/
│   ├── auto.md           # /sw:auto command
│   ├── cancel-auto.md    # /sw:cancel-auto command
│   └── auto-status.md    # /sw:auto-status command
├── hooks/
│   └── stop-auto.sh      # Stop hook implementation
└── scripts/
    └── setup-auto.sh     # Session initialization

src/core/auto/
├── index.ts                   # Main exports
├── session-state.ts           # Session state management
├── config.ts                  # Configuration loading
├── logger.ts                  # Auto logging
├── increment-queue.ts         # Multi-increment orchestration
├── test-gate.ts               # Test-driven gates
├── human-gate.ts              # Human approval gates
├── circuit-breaker.ts         # External service resilience
└── sync-checkpoint.ts         # Living docs sync

tests/
├── unit/
│   └── auto/
│       ├── session-state.test.ts
│       ├── circuit-breaker.test.ts
│       ├── test-gate.test.ts
│       └── human-gate.test.ts
├── integration/
│   └── auto/
│       ├── stop-hook.test.ts
│       └── increment-transition.test.ts
└── e2e/
    └── auto/
        └── full-workflow.spec.ts
```

---

## Dependencies

### New Dependencies

None required - using existing Node.js and TypeScript stack.

### Existing Infrastructure Used

- `src/core/workflow/` - Workflow orchestration (ADR-0175)
- `src/core/sync/` - External tool sync
- `src/core/living-docs/` - Living docs sync
- `plugins/specweave/hooks/` - Existing hook infrastructure

---

## Testing Strategy

### Unit Tests

- Session state serialization/deserialization
- Circuit breaker state transitions
- Human gate pattern matching
- Test gate result parsing

### Integration Tests

- Stop hook behavior with mock session
- Increment queue transitions
- Sync checkpoint batching

### E2E Tests

- Full auto workflow (3 small tasks)
- Human gate approval flow
- Crash recovery scenario

---

## Rollout Plan

### Phase A: Internal Testing (Week 4)

- Enable for SpecWeave development only
- Test with 3-task increments
- Gather iteration logs and feedback

### Phase B: Beta Users (Week 5)

- Enable via feature flag
- Documentation and examples
- Support channel for issues

### Phase C: General Availability

- Remove feature flag
- Full documentation
- Blog post and demo video

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Infinite loop | Max iterations + completion promise |
| Runaway costs | Cost estimation + limits |
| Data corruption | Checkpointing + atomic updates |
| External service failure | Circuit breakers + retry queue |
| Sensitive operation | Human gates + default deny |

---

## Related Documents

- [ADR-0175: Workflow Orchestration](../.specweave/docs/internal/architecture/adr/0175-workflow-orchestration-architecture.md)
- [ADR-0177: Autonomous Mode Safety](../.specweave/docs/internal/architecture/adr/0177-autonomous-mode-safety.md)
- [Auto Mode Documentation](../../../../../../plugins/specweave/commands/auto.md)
