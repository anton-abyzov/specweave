# ADR-0045: Autonomous Mode Safety

**Date**: 2025-11-16
**Status**: Accepted
**Epic**: FS-039 (Ultra-Smart Next Command)

---

## Context

The Ultra-Smart Next Command introduces **autonomous mode** (`--autonomous` flag), which enables zero-prompt execution of the entire SpecWeave workflow:

**Autonomous Workflow** (target):
```bash
# User runs ONCE
/specweave:next --autonomous

# System executes automatically:
1. Detect phase: spec.md exists → NEEDS_PLANNING (95% confidence)
2. Auto-invoke: /specweave:plan → create plan.md + tasks.md
3. Detect phase: tasks.md incomplete → NEEDS_EXECUTION
4. Auto-invoke: /specweave:do → execute Task 1
5. Auto-invoke: /specweave:do → execute Task 2
   ... (repeat for all tasks)
6. Detect phase: all tasks done → NEEDS_VALIDATION
7. Auto-invoke: /specweave:validate → run validation
8. Detect phase: validation passed → NEEDS_QA
9. Auto-invoke: /specweave:qa → run quality assessment
10. Detect phase: QA passed → NEEDS_CLOSURE
11. Auto-invoke: /specweave:done → close increment
12. Detect phase: closed → NEEDS_NEXT_INCREMENT
13. Find next active increment or suggest backlog
14. (Loop back to step 1 if more work exists)
```

**Vision**: "Ship features while you sleep" - autonomous end-to-end delivery.

**Safety Risks**:

1. **Infinite Loops**:
   - Phase detection returns same phase repeatedly (stuck in loop)
   - Example: Validation fails, re-runs validation, fails again, repeat...
   - Risk: System hangs, consumes resources indefinitely

2. **Runaway Execution**:
   - Auto-starts backlog items without user knowledge
   - Example: User has 50 backlog items, system starts all (exceeds WIP limit)
   - Risk: Overwhelming AI context, API rate limits, unexpected costs

3. **Critical Errors Ignored**:
   - Tests fail but system continues execution
   - Validation errors ignored, increment closed anyway
   - Risk: Shipping broken code, data loss

4. **Privilege Escalation**:
   - Autonomous mode auto-approves actions user didn't authorize
   - Example: Auto-merge GitHub PR, auto-deploy to production
   - Risk: Security breach, unintended changes

5. **State Corruption**:
   - Concurrent executions (user runs manual command while autonomous running)
   - File system changes mid-execution (plan.md deleted)
   - Risk: Corrupt metadata.json, inconsistent state

6. **Resource Exhaustion**:
   - Long-running autonomous execution (hours)
   - High API usage (LLM calls, GitHub API)
   - Risk: Rate limits, unexpected costs ($100+ for single workflow)

**Business Requirements**:

- Enable full automation (zero-prompt execution)
- Prevent infinite loops, runaway execution, critical errors
- Preserve user control (abort at any time, audit trail)
- Fail safely (stop on errors, preserve state)

---

## Decision

Implement **Multi-Layered Safety Guardrails** for autonomous mode:

### Layer 1: Infinite Loop Prevention ✅

**Max Iterations Per Session**:
```typescript
const MAX_ITERATIONS = 50; // Default, configurable
const MAX_SAME_PHASE_RETRIES = 3; // Prevent phase detection loops

interface AutonomousExecutor {
  iterationCount: number;
  phaseHistory: WorkflowPhase[];
  stateTransitions: StateTransition[];
}

function executeAutonomous(increment: Increment): AutonomousResult {
  const executor = new AutonomousExecutor();

  while (executor.iterationCount < MAX_ITERATIONS) {
    // Detect phase
    const detection = PhaseDetector.detectPhaseWithConfidence(increment);

    // Check for phase loop (same phase 3+ times)
    if (executor.isSamePhaseLoop(detection.phase)) {
      return {
        status: 'ABORTED',
        reason: 'INFINITE_LOOP_DETECTED',
        message: `Phase ${detection.phase} repeated 3 times. Stopping to prevent infinite loop.`
      };
    }

    // Record transition
    executor.recordTransition(detection.phase);

    // Execute action
    const action = determineAction(detection);
    const result = await executeAction(action);

    // Stop on critical errors
    if (result.critical) {
      return {
        status: 'ABORTED',
        reason: 'CRITICAL_ERROR',
        error: result.error
      };
    }

    // Check if done
    if (detection.phase === WorkflowPhase.ALL_DONE) {
      break;
    }

    executor.iterationCount++;
  }

  if (executor.iterationCount >= MAX_ITERATIONS) {
    return {
      status: 'ABORTED',
      reason: 'MAX_ITERATIONS_EXCEEDED',
      message: `Executed ${MAX_ITERATIONS} iterations. Stopping to prevent runaway execution.`
    };
  }

  return { status: 'SUCCESS', iterations: executor.iterationCount };
}
```

**Phase Loop Detection**:
```typescript
class AutonomousExecutor {
  private phaseHistory: WorkflowPhase[] = [];
  private MAX_SAME_PHASE_RETRIES = 3;

  isSamePhaseLoop(phase: WorkflowPhase): boolean {
    // Get last 3 phases
    const recent = this.phaseHistory.slice(-3);

    // Check if all 3 are the same
    return recent.length === 3 && recent.every(p => p === phase);
  }

  recordTransition(phase: WorkflowPhase): void {
    this.phaseHistory.push(phase);
  }
}
```

### Layer 2: Critical Error Handling ✅

**Error Classification**:
```typescript
enum ErrorSeverity {
  INFO = 'INFO',         // Informational, continue
  WARNING = 'WARNING',   // Warning, continue with caution
  ERROR = 'ERROR',       // Error, stop current action, continue workflow
  CRITICAL = 'CRITICAL'  // Critical, abort entire autonomous execution
}

interface ExecutionError {
  severity: ErrorSeverity;
  message: string;
  context: string;
  suggestedAction?: string;
}
```

**Critical Errors** (abort execution):
- Tests failing (jest/playwright failures)
- Validation errors (PM validation gate failures)
- QA failures (quality threshold not met)
- File system errors (spec.md deleted, plan.md corrupt)
- API failures (GitHub rate limit exceeded, network timeout)
- State corruption (metadata.json invalid)

**Non-Critical Errors** (log and continue):
- Informational messages (task completed, file created)
- Warnings (low confidence detection, deprecated feature used)

**Error Handling Logic**:
```typescript
async function executeAction(action: Action): Promise<ActionResult> {
  try {
    const result = await invokeCommand(action.command, action.args);

    // Check for critical errors
    if (result.exitCode !== 0) {
      return {
        status: 'FAILED',
        critical: true,
        error: {
          severity: ErrorSeverity.CRITICAL,
          message: `Command ${action.command} failed with exit code ${result.exitCode}`,
          context: result.stderr
        }
      };
    }

    // Check for validation errors
    if (action.command === '/specweave:validate' && result.validationErrors) {
      return {
        status: 'FAILED',
        critical: true,
        error: {
          severity: ErrorSeverity.CRITICAL,
          message: 'Validation failed',
          context: formatValidationErrors(result.validationErrors),
          suggestedAction: 'Fix validation errors before proceeding'
        }
      };
    }

    return { status: 'SUCCESS' };
  } catch (error) {
    // Unexpected errors are critical
    return {
      status: 'FAILED',
      critical: true,
      error: {
        severity: ErrorSeverity.CRITICAL,
        message: error.message,
        context: error.stack
      }
    };
  }
}
```

### Layer 3: WIP Limit Enforcement ✅

**Respect WIP Limits** (from config.json):
```typescript
function canStartNewIncrement(config: Config): boolean {
  const activeIncrements = getActiveIncrements();
  const wipLimit = config.workflow?.wipLimit || 3;

  if (activeIncrements.length >= wipLimit) {
    return false;
  }

  return true;
}

function executeAutonomous(increment: Increment, config: Config): AutonomousResult {
  // ... existing logic ...

  // After closing current increment, check WIP limit
  if (detection.phase === WorkflowPhase.NEEDS_NEXT_INCREMENT) {
    if (!canStartNewIncrement(config)) {
      return {
        status: 'SUCCESS',
        message: `WIP limit reached (${config.workflow.wipLimit}). Not starting new increment.`
      };
    }

    // Auto-start next backlog item (respects WIP limit)
    const backlogItem = findNextBacklogItem(config);
    if (backlogItem) {
      startIncrement(backlogItem);
    }
  }
}
```

**WIP Limit Configuration**:
```json
{
  "workflow": {
    "wipLimit": 3,
    "autoStartBacklog": true
  }
}
```

### Layer 4: User Control & Abort ✅

**Abort Mechanism**:
```typescript
// Detect Ctrl+C (SIGINT)
process.on('SIGINT', () => {
  if (autonomousExecutor.isRunning()) {
    autonomousExecutor.abort();
    console.log('\n✋ Autonomous execution aborted by user');
    process.exit(0);
  }
});

class AutonomousExecutor {
  private aborted: boolean = false;

  abort(): void {
    this.aborted = true;
  }

  async executeNext(): Promise<ActionResult> {
    // Check abort flag before each action
    if (this.aborted) {
      return { status: 'ABORTED', reason: 'USER_ABORTED' };
    }

    // ... execute action ...
  }
}
```

**User Prompts on Low Confidence**:
```typescript
async function executeAction(action: Action, detection: PhaseDetectionResult): Promise<ActionResult> {
  // In autonomous mode, still prompt if confidence < 0.7 (SAFETY)
  if (detection.confidence < 0.7) {
    console.log(`⚠️ Low confidence (${(detection.confidence * 100).toFixed(0)}%) for action: ${action.command}`);
    console.log('Reasoning:', detection.reasoning);

    const answer = await promptUser('Proceed anyway? [y/N]');
    if (answer.toLowerCase() !== 'y') {
      return { status: 'SKIPPED', reason: 'USER_DECLINED' };
    }
  }

  // High confidence → auto-proceed (no prompt)
  return await invokeCommand(action.command, action.args);
}
```

### Layer 5: Checkpointing & State Recovery ✅

**Save State After Each Action**:
```typescript
interface Checkpoint {
  timestamp: string;
  iteration: number;
  phase: WorkflowPhase;
  lastAction: Action;
  metadata: IncrementMetadata;
}

class AutonomousExecutor {
  private checkpoints: Checkpoint[] = [];

  async executeNext(): Promise<ActionResult> {
    const result = await invokeCommand(action.command, action.args);

    // Save checkpoint after successful action
    if (result.status === 'SUCCESS') {
      this.saveCheckpoint({
        timestamp: new Date().toISOString(),
        iteration: this.iterationCount,
        phase: this.currentPhase,
        lastAction: action,
        metadata: loadMetadata(this.increment)
      });
    }

    return result;
  }

  saveCheckpoint(checkpoint: Checkpoint): void {
    this.checkpoints.push(checkpoint);

    // Persist to disk (for recovery)
    fs.writeFileSync(
      `.specweave/increments/${this.increment.id}/logs/autonomous-checkpoints.json`,
      JSON.stringify(this.checkpoints, null, 2)
    );
  }

  recoverFromCheckpoint(): Checkpoint {
    // Load checkpoints from disk
    const checkpoints = loadCheckpoints(this.increment);
    return checkpoints[checkpoints.length - 1]; // Latest checkpoint
  }
}
```

**Recovery After Abort**:
```bash
# User aborts autonomous execution (Ctrl+C)
/specweave:next --autonomous
# ... autonomous execution starts ...
# User hits Ctrl+C (aborted at iteration 15, phase: EXECUTION)

# Resume from last checkpoint
/specweave:next --autonomous --resume
# → Loads iteration 15, continues from EXECUTION phase
```

### Layer 6: Execution Logging ✅

**Detailed Audit Trail**:
```typescript
interface AutonomousExecutionLog {
  sessionId: string;
  incrementId: string;
  startTime: string;
  endTime: string;
  status: 'SUCCESS' | 'ABORTED' | 'FAILED';
  totalIterations: number;
  actions: ActionLog[];
  errors: ExecutionError[];
  checkpoints: Checkpoint[];
}

interface ActionLog {
  iteration: number;
  timestamp: string;
  phase: WorkflowPhase;
  action: Action;
  confidence: number;
  result: ActionResult;
  durationMs: number;
}

class AutonomousExecutor {
  private log: AutonomousExecutionLog;

  async execute(): Promise<AutonomousResult> {
    this.log = {
      sessionId: generateSessionId(),
      incrementId: this.increment.id,
      startTime: new Date().toISOString(),
      status: 'IN_PROGRESS',
      totalIterations: 0,
      actions: [],
      errors: [],
      checkpoints: []
    };

    // ... execute workflow ...

    // Finalize log
    this.log.endTime = new Date().toISOString();
    this.log.status = result.status;

    // Write log to disk
    this.saveLog();

    return result;
  }

  saveLog(): void {
    const logPath = `.specweave/increments/${this.increment.id}/logs/autonomous-execution-${this.log.sessionId}.json`;
    fs.writeFileSync(logPath, JSON.stringify(this.log, null, 2));

    // Also create human-readable report
    this.generateReport();
  }

  generateReport(): void {
    const report = `
# Autonomous Execution Report

**Session ID**: ${this.log.sessionId}
**Increment**: ${this.log.incrementId}
**Status**: ${this.log.status}
**Duration**: ${formatDuration(this.log.startTime, this.log.endTime)}
**Iterations**: ${this.log.totalIterations}

## Actions Executed

${this.log.actions.map((a, i) => `
### ${i + 1}. ${a.action.command} (${a.phase})
- **Confidence**: ${(a.confidence * 100).toFixed(0)}%
- **Result**: ${a.result.status}
- **Duration**: ${a.durationMs}ms
`).join('\n')}

## Errors

${this.log.errors.map(e => `
- **${e.severity}**: ${e.message}
  - Context: ${e.context}
`).join('\n')}

## Checkpoints

${this.log.checkpoints.map((c, i) => `
${i + 1}. Iteration ${c.iteration} - ${c.phase} (${c.timestamp})
`).join('\n')}
`;

    const reportPath = `.specweave/increments/${this.increment.id}/reports/autonomous-execution-${this.log.sessionId}.md`;
    fs.writeFileSync(reportPath, report);
  }
}
```

### Layer 7: Cost Estimation & Limits ✅

**Estimate Cost Before Execution**:
```typescript
interface CostEstimate {
  aiCalls: number;         // LLM API calls
  estimatedCost: number;   // USD
  estimatedDuration: number; // Minutes
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

function estimateAutonomousCost(increment: Increment): CostEstimate {
  const tasks = parseTasksMd(increment);
  const incompleteTasks = tasks.filter(t => !t.completed);

  // Estimate AI calls
  const planningCalls = hasPlanMd(increment) ? 0 : 2; // Architect + test-aware-planner
  const executionCalls = incompleteTasks.length * 3; // 3 LLM calls per task (avg)
  const validationCalls = 1; // PM validation
  const qaCalls = 1; // QA assessment (judge LLM)

  const totalCalls = planningCalls + executionCalls + validationCalls + qaCalls;

  // Estimate cost (assume $0.01 per LLM call, average)
  const estimatedCost = totalCalls * 0.01;

  // Estimate duration (5 min per task, avg)
  const estimatedDuration = incompleteTasks.length * 5;

  // Risk level
  let riskLevel: CostEstimate['riskLevel'];
  if (estimatedCost < 1) riskLevel = 'LOW';
  else if (estimatedCost < 5) riskLevel = 'MEDIUM';
  else if (estimatedCost < 20) riskLevel = 'HIGH';
  else riskLevel = 'CRITICAL';

  return { aiCalls: totalCalls, estimatedCost, estimatedDuration, riskLevel };
}

async function executeAutonomous(increment: Increment): Promise<AutonomousResult> {
  // Estimate cost before starting
  const estimate = estimateAutonomousCost(increment);

  console.log(`
📊 Autonomous Execution Estimate:
   • AI Calls: ${estimate.aiCalls}
   • Estimated Cost: $${estimate.estimatedCost.toFixed(2)}
   • Estimated Duration: ${estimate.estimatedDuration} min
   • Risk Level: ${estimate.riskLevel}
`);

  // Block CRITICAL cost executions
  if (estimate.riskLevel === 'CRITICAL') {
    console.log('❌ Estimated cost exceeds safe threshold ($20). Aborting.');
    console.log('Suggestion: Break into smaller increments or run manually.');
    return { status: 'ABORTED', reason: 'COST_TOO_HIGH' };
  }

  // Prompt user for HIGH cost
  if (estimate.riskLevel === 'HIGH') {
    const answer = await promptUser(`Proceed with $${estimate.estimatedCost.toFixed(2)} autonomous execution? [y/N]`);
    if (answer.toLowerCase() !== 'y') {
      return { status: 'ABORTED', reason: 'USER_DECLINED_COST' };
    }
  }

  // Proceed with execution
  return await executeAutonomousInternal(increment, estimate);
}
```

---

## Alternatives Considered

### Alternative 1: No Safety Guardrails (Unlimited Execution)

**Description**: Run autonomous mode without limits (trust phase detection).

**Pros**:
- Simple implementation (no safety code)
- Maximum autonomy (no interruptions)

**Cons**:
- ❌ Infinite loops possible (phase detection bugs)
- ❌ Runaway costs (unlimited LLM calls)
- ❌ No user control (can't abort)

**Why Not Chosen**: Too risky, violates "fail safely" requirement.

---

### Alternative 2: Manual Confirmation After Each Action

**Description**: Prompt user after each auto-invoked command ("Proceed?").

**Pros**:
- Maximum safety (user control at every step)
- No runaway execution

**Cons**:
- ❌ Not autonomous (defeats purpose of --autonomous flag)
- ❌ High friction (user must watch execution)

**Why Not Chosen**: Violates "zero-prompt execution" goal.

---

### Alternative 3: Sandbox Execution (Dry-Run Mode)

**Description**: Run autonomous mode in dry-run (no actual file changes, simulate).

**Pros**:
- Zero risk (no side effects)
- Preview workflow

**Cons**:
- ❌ Not useful for shipping features (simulation only)
- ❌ Doesn't catch real errors (tests don't actually run)

**Why Not Chosen**: Doesn't solve "ship features while you sleep" goal. However, we DO provide `--dry-run` flag for preview.

---

### Alternative 4: Time-Based Limits (Max 1 hour execution)

**Description**: Abort autonomous execution after 1 hour.

**Pros**:
- Prevents infinite execution
- Simple implementation (setTimeout)

**Cons**:
- ❌ Arbitrary limit (some workflows may need > 1 hour)
- ❌ Doesn't prevent infinite loops (could loop 1000 times in 1 hour)

**Why Not Chosen**: Iteration-based limits are more precise. However, we DO implement time-based logging for audit.

---

## Consequences

### Positive ✅

1. **Safe Autonomy**:
   - Infinite loops prevented (max iterations, phase loop detection)
   - Runaway execution prevented (WIP limits, cost estimation)
   - Critical errors stop execution (tests fail → abort)

2. **User Control Preserved**:
   - Abort at any time (Ctrl+C)
   - Low confidence → prompt user (safety override)
   - Cost estimation upfront (informed decision)

3. **Observability**:
   - Detailed execution log (audit trail)
   - Checkpoints (recovery after abort)
   - Human-readable report (post-mortem)

4. **Reliability**:
   - State recovery (resume from checkpoint)
   - Graceful degradation (errors don't corrupt state)

### Negative ❌

1. **Complexity**:
   - 7 safety layers (1000+ lines of code)
   - Extensive testing required (edge cases, error scenarios)

2. **May Block Valid Executions**:
   - Cost estimation may be too conservative (block valid $25 workflows)
   - Max iterations may be too low (some workflows need > 50 iterations)
   - Mitigation: Make thresholds configurable

3. **Performance Overhead**:
   - Checkpointing adds I/O (write to disk after each action)
   - Cost estimation adds latency (parse tasks.md)
   - Mitigation: < 1s overhead, acceptable

### Neutral ⚖️

1. **User Experience Trade-off**:
   - Prompts on low confidence (safety) vs zero-prompt (convenience)
   - Resolution: Only prompt if confidence < 0.7 (rare in well-formed workflows)

2. **Configuration Needed**:
   - Users must configure WIP limits, cost thresholds
   - Default values provided (WIP: 3, cost threshold: $20)

---

## Configuration

**Autonomous Mode Settings** (`.specweave/config.json`):
```json
{
  "workflow": {
    "autonomous": {
      "maxIterations": 50,
      "maxSamePhaseRetries": 3,
      "lowConfidenceThreshold": 0.7,
      "costThreshold": {
        "low": 1,
        "medium": 5,
        "high": 20
      },
      "autoStartBacklog": true,
      "enableCheckpointing": true,
      "logVerbosity": "detailed"
    },
    "wipLimit": 3
  }
}
```

---

## Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| **Cost Estimation** | < 1s | Parse tasks.md, calculate estimate |
| **Checkpointing** | < 500ms | Write checkpoint to disk |
| **Log Generation** | < 2s | Generate report.md after execution |
| **Abort Latency** | < 100ms | Time from Ctrl+C to abort |

---

## Testing Strategy

### Unit Tests

**Infinite Loop Detection**:
```typescript
describe('AutonomousExecutor - Infinite Loop Prevention', () => {
  it('aborts when max iterations exceeded', async () => {
    const executor = new AutonomousExecutor({ maxIterations: 10 });
    const result = await executor.execute(incrementWithLoopBug);

    expect(result.status).toBe('ABORTED');
    expect(result.reason).toBe('MAX_ITERATIONS_EXCEEDED');
  });

  it('aborts when same phase repeated 3 times', async () => {
    const executor = new AutonomousExecutor();
    const result = await executor.execute(incrementWithPhaseLoop);

    expect(result.status).toBe('ABORTED');
    expect(result.reason).toBe('INFINITE_LOOP_DETECTED');
  });
});
```

**Critical Error Handling**:
```typescript
describe('AutonomousExecutor - Critical Errors', () => {
  it('aborts when tests fail', async () => {
    const executor = new AutonomousExecutor();
    const result = await executor.execute(incrementWithFailingTests);

    expect(result.status).toBe('ABORTED');
    expect(result.reason).toBe('CRITICAL_ERROR');
    expect(result.error.message).toContain('Tests failed');
  });

  it('aborts when validation fails', async () => {
    const executor = new AutonomousExecutor();
    const result = await executor.execute(incrementWithValidationErrors);

    expect(result.status).toBe('ABORTED');
    expect(result.error.severity).toBe(ErrorSeverity.CRITICAL);
  });
});
```

**WIP Limit Enforcement**:
```typescript
describe('AutonomousExecutor - WIP Limits', () => {
  it('does not start new increment when WIP limit reached', async () => {
    const config = { workflow: { wipLimit: 2 } };
    const executor = new AutonomousExecutor(config);

    // Already have 2 active increments
    createActiveIncrement('0001');
    createActiveIncrement('0002');

    const result = await executor.execute(increment);

    expect(result.status).toBe('SUCCESS');
    expect(result.message).toContain('WIP limit reached');
    expect(getActiveIncrements()).toHaveLength(2); // No new increment started
  });
});
```

### Integration Tests

**Full Autonomous Workflow**:
```typescript
describe('AutonomousExecutor - Full Workflow', () => {
  it('executes plan → do → validate → qa → done', async () => {
    const executor = new AutonomousExecutor();
    const result = await executor.execute(validIncrement);

    expect(result.status).toBe('SUCCESS');
    expect(result.log.actions).toHaveLength(5); // 5 commands executed
    expect(result.log.actions[0].action.command).toBe('/specweave:plan');
    expect(result.log.actions[4].action.command).toBe('/specweave:done');
  });
});
```

### E2E Tests (Playwright)

**Real Autonomous Execution**:
```typescript
describe('Autonomous Mode - E2E', () => {
  it('ships a feature end-to-end', async () => {
    // Create spec.md
    await createSpec('Add dark mode toggle');

    // Run autonomous mode
    await runCommand('/specweave:next --autonomous');

    // Verify increment closed
    const increment = loadIncrement('0040');
    expect(increment.metadata.status).toBe('closed');

    // Verify log exists
    const log = loadLog('0040');
    expect(log.status).toBe('SUCCESS');
  });
});
```

---

## Monitoring & Alerting

**Track in Production**:
```typescript
interface AutonomousSafetyMetrics {
  timestamp: string;
  sessionId: string;
  abortReason?: string;
  iterations: number;
  costEstimate: number;
  durationMs: number;
  criticalErrors: number;
}
```

**Alerting**:
- Abort rate > 20% → investigate phase detection quality
- Cost threshold exceeded > 10% → review cost estimation logic
- Critical error rate > 5% → investigate validation/test failures

---

## Related Decisions

- **ADR-0043**: Workflow Orchestration Architecture (uses autonomous executor)
- **ADR-0044**: Phase Detection Enhancement (confidence scoring for safety)

---

## References

- **Living Spec**: [SPEC-0039: Ultra-Smart Next Command](../../specs/specweave/spec-0039-ultra-smart-next-command.md)
- **User Story**: [US-010: Autonomous Workflow Mode](../../specs/specweave/FS-039/us-010-autonomous-workflow-mode.md)
- **Increment**: [0039-ultra-smart-next-command](../../../increments/0039-ultra-smart-next-command/)

---

**Decision Rationale Summary**:

We implemented **Multi-Layered Safety Guardrails** for autonomous mode because:
- ✅ Prevents infinite loops (max iterations, phase loop detection)
- ✅ Handles critical errors (tests fail → abort)
- ✅ Preserves user control (Ctrl+C abort, low confidence prompts)
- ✅ Enables observability (detailed logs, checkpoints)
- ✅ Manages costs (upfront estimation, thresholds)
- ✅ Supports recovery (checkpointing, resume)

This safety architecture enables **autonomous shipping** while preventing catastrophic failures. Users can trust the system to "ship features while they sleep" without runaway costs or broken code.
