# ADR-0044: Phase Detection Enhancement

**Date**: 2025-11-16
**Status**: Accepted
**Supersedes**: ADR-0003-009 (Multi-Signal Phase Detection)
**Epic**: FS-039 (Ultra-Smart Next Command)

---

## Context

SpecWeave's existing phase detection (ADR-0003-009) uses a multi-signal heuristic to detect workflow phases with **95% accuracy** target:

**Current Signals** (ADR-0003-009):
- **Keywords (40%)**: User input contains phase-related keywords
- **Commands (30%)**: Recently executed commands
- **Context (20%)**: File existence (spec.md, plan.md, tasks.md)
- **Hints (10%)**: User explicit hints (@planning, @execution)

**Current Detection Algorithm** (Hypothetical):
```typescript
function detectPhase(increment: Increment): WorkflowPhase {
  if (!incrementExists) return 'NO_INCREMENTS';
  if (hasSpecMd && !hasPlanMd) return 'NEEDS_PLANNING';
  if (hasPlanMd && hasIncompleteTasks) return 'NEEDS_EXECUTION';
  if (allTasksDone && !validated) return 'NEEDS_VALIDATION';
  if (validated && !qaRun) return 'NEEDS_QA';
  if (status === 'completed') return 'NEEDS_CLOSURE';
  if (status === 'closed') return 'ALL_DONE';
  return 'UNKNOWN';
}
```

**Problems with Current Approach**:

1. **No Confidence Scoring**:
   - Detection returns single phase (no confidence score)
   - Can't distinguish between "definitely needs planning" (95% confident) vs "maybe needs planning" (60% confident)
   - Users can't assess reliability

2. **Binary Decisions**:
   - Phase detection is yes/no (no gray area)
   - Can't handle ambiguous states (e.g., plan.md exists but corrupt)
   - No graceful degradation

3. **No Transparency**:
   - Users don't know WHY a phase was detected
   - Can't debug incorrect detections
   - No signal breakdown ("what led to this decision?")

4. **Limited Extensibility**:
   - Can't add new signals easily (hardcoded weights)
   - Can't tune weights based on feedback
   - Can't replace with ML model later

**User Needs for Ultra-Smart Next Command**:

- **Transparency**: "Why did /specweave:next choose this action?" (show confidence score)
- **Control**: "I want to override when confidence is low" (confidence < 0.7 → prompt user)
- **Trust**: "I need to know the system is reliable" (high confidence → auto-proceed)
- **Debugging**: "Why did detection fail?" (show signals and reasoning)

**Business Requirements**:

- Maintain 95% accuracy (ADR-0003-009 target)
- Add confidence scoring (0.0 to 1.0)
- Enable autonomous mode (confidence >= 0.9 → auto-proceed)
- Support user override (--force flag)

---

## Decision

**Enhance Phase Detection** with confidence scoring while preserving existing multi-signal heuristic:

### Enhancement 1: Confidence Scoring (0.0 to 1.0)

**Algorithm**:
```typescript
interface PhaseDetectionResult {
  phase: WorkflowPhase;
  confidence: number; // 0.0 to 1.0
  signals: Signal[];  // Array of contributing signals
  reasoning: string;  // Human-readable explanation
}

function detectPhaseWithConfidence(increment: Increment): PhaseDetectionResult {
  const signals: Signal[] = [];

  // File existence signals (high weight)
  if (!hasSpecMd) {
    signals.push({ type: 'FILE_MISSING', value: 'spec.md', weight: 0.9 });
  }
  if (hasSpecMd && !hasPlanMd) {
    signals.push({ type: 'FILE_MISSING', value: 'plan.md', weight: 0.9 });
  }
  if (hasPlanMd && !hasTasksMd) {
    signals.push({ type: 'FILE_MISSING', value: 'tasks.md', weight: 0.9 });
  }

  // Task completion signals (medium weight)
  const incompleteTasks = parseIncompleteTasks(increment);
  if (incompleteTasks.length > 0) {
    signals.push({
      type: 'INCOMPLETE_TASKS',
      value: incompleteTasks.length,
      weight: 0.7
    });
  }

  // Metadata signals (medium weight)
  if (metadata.status === 'completed') {
    signals.push({ type: 'STATUS', value: 'completed', weight: 0.8 });
  }

  // Validation signals (low weight, may be stale)
  if (!metadata.validatedAt || isStale(metadata.validatedAt)) {
    signals.push({ type: 'VALIDATION_STALE', value: true, weight: 0.5 });
  }

  // Calculate confidence (weighted average)
  const confidence = calculateConfidence(signals);

  // Determine phase
  const phase = determinePhase(signals);

  // Generate reasoning
  const reasoning = generateReasoning(phase, signals, confidence);

  return { phase, confidence, signals, reasoning };
}

function calculateConfidence(signals: Signal[]): number {
  // Weighted average of signal strengths
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = signals.reduce((sum, s) => sum + s.weight, 0);

  // Normalize to 0.0-1.0
  const baseConfidence = weightedSum / Math.max(totalWeight, 1);

  // Penalize if contradictory signals exist
  const penalty = calculateContradictionPenalty(signals);

  // Boost if multiple signals agree
  const boost = calculateAgreementBoost(signals);

  return Math.max(0.0, Math.min(1.0, baseConfidence - penalty + boost));
}

function generateReasoning(
  phase: WorkflowPhase,
  signals: Signal[],
  confidence: number
): string {
  const topSignals = signals
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  const signalDescriptions = topSignals.map(s => describeSignal(s));

  return `Detected phase: ${phase} (${(confidence * 100).toFixed(0)}% confident)

Key signals:
${signalDescriptions.map((d, i) => `  ${i + 1}. ${d}`).join('\n')}`;
}
```

**Confidence Thresholds**:
- **High (>= 0.9)**: Auto-proceed in autonomous mode, no user prompt
- **Medium (0.7 - 0.9)**: Proceed with user confirmation ("95% confident, proceed?")
- **Low (< 0.7)**: Always prompt user, show alternatives
- **Very Low (< 0.5)**: Block auto-proceed, require --force flag

### Enhancement 2: Signal Transparency

**Signal Types**:
```typescript
enum SignalType {
  // File signals (weight: 0.8-0.9)
  FILE_EXISTS = 'FILE_EXISTS',
  FILE_MISSING = 'FILE_MISSING',
  FILE_CORRUPT = 'FILE_CORRUPT',

  // Task signals (weight: 0.7-0.8)
  INCOMPLETE_TASKS = 'INCOMPLETE_TASKS',
  ALL_TASKS_DONE = 'ALL_TASKS_DONE',
  P1_TASKS_DONE = 'P1_TASKS_DONE',

  // Metadata signals (weight: 0.6-0.8)
  STATUS = 'STATUS',
  VALIDATION_STALE = 'VALIDATION_STALE',
  QA_RUN = 'QA_RUN',

  // User signals (weight: 0.5-0.6)
  KEYWORD = 'KEYWORD',
  RECENT_COMMAND = 'RECENT_COMMAND',
  EXPLICIT_HINT = 'EXPLICIT_HINT',

  // Project signals (weight: 0.3-0.5)
  PROJECT_KEYWORD = 'PROJECT_KEYWORD',
  TEAM_PATTERN = 'TEAM_PATTERN',
}

interface Signal {
  type: SignalType;
  value: string | number | boolean;
  weight: number;       // 0.0 to 1.0
  description: string;  // Human-readable
}
```

**Signal Display**:
```
Phase Detected: NEEDS_PLANNING (95% confident)

Key Signals:
  1. spec.md exists without plan.md (weight: 0.9)
  2. No recent /specweave:plan command (weight: 0.7)
  3. Status is 'planning' in metadata.json (weight: 0.8)

Suggested Action:
  → /specweave:plan
```

### Enhancement 3: Phase Enumeration

**Workflow Phases** (complete enumeration):
```typescript
enum WorkflowPhase {
  // Initial states
  NO_INCREMENTS = 'NO_INCREMENTS',          // No active increments
  BACKLOG_AVAILABLE = 'BACKLOG_AVAILABLE',  // Backlog items exist

  // Planning phase
  NEEDS_PLANNING = 'NEEDS_PLANNING',        // spec.md exists, no plan.md
  PLANNING_IN_PROGRESS = 'PLANNING_IN_PROGRESS', // plan.md partial

  // Execution phase
  NEEDS_EXECUTION = 'NEEDS_EXECUTION',      // plan.md + tasks.md, tasks incomplete
  EXECUTION_IN_PROGRESS = 'EXECUTION_IN_PROGRESS', // Tasks being worked on

  // Validation phase
  NEEDS_VALIDATION = 'NEEDS_VALIDATION',    // All P1 tasks done, not validated
  VALIDATION_FAILED = 'VALIDATION_FAILED',  // Validation run, issues found

  // QA phase
  NEEDS_QA = 'NEEDS_QA',                    // Validation passed, QA not run
  QA_FAILED = 'QA_FAILED',                  // QA run, quality issues found

  // Closure phase
  NEEDS_CLOSURE = 'NEEDS_CLOSURE',          // QA passed, not closed

  // Transition states
  NEEDS_NEXT_INCREMENT = 'NEEDS_NEXT_INCREMENT', // Current closed, find next

  // Unknown/error states
  UNKNOWN = 'UNKNOWN',                      // Ambiguous state
  CORRUPT_STATE = 'CORRUPT_STATE',          // Data corruption detected
}
```

### Enhancement 4: Multi-Project Support

**Project-Aware Detection**:
```typescript
function detectPhaseMultiProject(
  increment: Increment,
  config: Config
): PhaseDetectionResult {
  const project = detectProject(increment, config);

  if (project) {
    // Apply project-specific signal weights
    const projectWeights = getProjectWeights(project);
    const result = detectPhaseWithConfidence(increment, projectWeights);

    return {
      ...result,
      project: project.id,
      reasoning: `[Project: ${project.name}]\n${result.reasoning}`
    };
  }

  // Fallback to default detection
  return detectPhaseWithConfidence(increment);
}
```

---

## Alternatives Considered

### Alternative 1: Machine Learning-Based Detection

**Description**: Train supervised learning model (e.g., decision tree, random forest) on user feedback.

**Pros**:
- Potentially higher accuracy (> 98%)
- Adapts to user patterns over time
- Can discover new signals

**Cons**:
- ❌ Requires training data (no historical data yet)
- ❌ Model drift (needs retraining)
- ❌ Complexity (model deployment, versioning)
- ❌ Not explainable (black box, no signal transparency)
- ❌ Overkill for v1 (heuristic already achieves 95%)

**Why Not Chosen**: Premature optimization. Heuristic is sufficient for v1, can add ML in v2 if needed.

---

### Alternative 2: LLM-Based Detection (Ask AI)

**Description**: Send increment state to LLM (Claude Sonnet), ask "what phase is this in?".

**Pros**:
- Maximum flexibility (handles edge cases)
- No hardcoded logic (LLM generalizes)

**Cons**:
- ❌ Expensive (~$0.01 per detection, 100 detections/day = $1/day = $365/year)
- ❌ Slow (500-2000ms latency, violates < 500ms target)
- ❌ Unpredictable (LLM hallucinations, inconsistent results)
- ❌ No confidence scoring (LLM confidence is unreliable)

**Why Not Chosen**: Violates cost, performance, and reliability requirements.

---

### Alternative 3: Rule-Based Decision Tree (Static Rules)

**Description**: Hardcoded if/else decision tree (no signal weights, no confidence).

**Pros**:
- Simple implementation (no confidence calculation)
- Fast (< 10ms)
- Deterministic (same input = same output)

**Cons**:
- ❌ No confidence scoring (can't distinguish high/low confidence)
- ❌ Brittle (edge cases require new rules)
- ❌ Not extensible (can't add ML later)

**Why Not Chosen**: Doesn't support transparency and user control requirements.

---

### Alternative 4: User-Defined Workflow (No Auto-Detection)

**Description**: Let users configure workflow phases manually (YAML/JSON config).

**Pros**:
- Maximum flexibility (custom workflows)
- No detection bugs (user knows their workflow)

**Cons**:
- ❌ High cognitive load (users must define workflow)
- ❌ Doesn't solve "what's next?" problem (still requires manual decisions)
- ❌ Onboarding barrier (new users don't know how to configure)

**Why Not Chosen**: Violates "reduce cognitive load" goal.

---

## Consequences

### Positive ✅

1. **Transparency**:
   - Users see WHY a phase was detected (signal breakdown)
   - Builds trust in automation

2. **User Control**:
   - Low confidence → prompt user (preserve agency)
   - High confidence → auto-proceed (reduce friction)
   - --force flag overrides any confidence level

3. **Reliability**:
   - Confidence calibration ensures no false high confidence
   - Graceful degradation (low confidence → ask user)

4. **Extensibility**:
   - Easy to add new signals (just append to array)
   - Can replace with ML model in v2 (same interface)

5. **Debugging**:
   - Signal display helps debug incorrect detections
   - Users can report specific signals that were wrong

### Negative ❌

1. **Implementation Complexity**:
   - Confidence calculation adds 200+ lines of code
   - Signal weighing requires tuning (empirical testing)

2. **Calibration Needed**:
   - Confidence thresholds (0.9, 0.7) may need adjustment
   - Signal weights may need tuning based on user feedback

3. **Potential Over-Prompting**:
   - Low confidence → prompt user (may be annoying if frequent)
   - Mitigation: Tune thresholds, improve signal quality

### Neutral ⚖️

1. **Performance Impact**:
   - Confidence calculation adds ~50ms overhead (acceptable, still < 500ms target)

2. **Backward Compatibility**:
   - Existing phase detection API unchanged (add new method)
   - No breaking changes

---

## Implementation Plan

### Step 1: Create PhaseDetector Module ✅

**Location**: `src/core/workflow/phase-detector.ts`

**API**:
```typescript
export class PhaseDetector {
  // Existing (backward compatible)
  static detectPhase(increment: Increment): WorkflowPhase;

  // New (enhanced)
  static detectPhaseWithConfidence(
    increment: Increment,
    config?: Config
  ): PhaseDetectionResult;

  // Helper (signal generation)
  static generateSignals(increment: Increment): Signal[];

  // Helper (confidence calculation)
  static calculateConfidence(signals: Signal[]): number;
}
```

### Step 2: Define Signal Types ✅

**Location**: `src/types/workflow.ts`

**Types**:
```typescript
export enum SignalType { ... }
export interface Signal { ... }
export enum WorkflowPhase { ... }
export interface PhaseDetectionResult { ... }
```

### Step 3: Implement Signal Generation ✅

**Logic**:
- File existence signals (spec.md, plan.md, tasks.md)
- Task completion signals (parse tasks.md)
- Metadata signals (status, validatedAt, qaRunAt)
- User signals (recent commands, keywords)
- Project signals (multi-project mode)

### Step 4: Implement Confidence Calculation ✅

**Algorithm**:
- Weighted average of signal strengths
- Penalty for contradictory signals
- Boost for agreeing signals
- Normalization to 0.0-1.0

### Step 5: Implement Reasoning Generation ✅

**Format**:
```
Detected phase: NEEDS_PLANNING (95% confident)

Key Signals:
  1. spec.md exists without plan.md (weight: 0.9)
  2. No recent /specweave:plan command (weight: 0.7)
  3. Status is 'planning' in metadata.json (weight: 0.8)

Suggested Action:
  → /specweave:plan
```

### Step 6: Write Unit Tests ✅

**Coverage**: 100 test cases

**Test Categories**:
- File existence scenarios (20 tests)
- Task completion scenarios (20 tests)
- Metadata scenarios (20 tests)
- Confidence calculation (20 tests)
- Edge cases (corrupt files, missing data) (20 tests)

---

## Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| **Phase Detection** | < 500ms | Include file I/O, parsing, calculation |
| **Signal Generation** | < 100ms | Parse increment state |
| **Confidence Calculation** | < 50ms | Weighted average, no I/O |
| **Reasoning Generation** | < 20ms | String formatting only |

---

## Accuracy Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Overall Accuracy** | >= 95% | Common workflow scenarios (unit tests) |
| **Confidence Calibration** | < 5% false high confidence | High confidence (> 0.9) should be accurate > 95% of the time |
| **Signal Quality** | >= 90% relevant | Signals should be non-redundant and meaningful |

---

## Testing Strategy

### Unit Tests (100 test cases)

**File Existence Scenarios**:
```typescript
describe('PhaseDetector - File Existence', () => {
  it('detects NO_INCREMENTS when no increments folder exists', () => {
    const result = PhaseDetector.detectPhaseWithConfidence(noIncrement);
    expect(result.phase).toBe(WorkflowPhase.NO_INCREMENTS);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('detects NEEDS_PLANNING when spec.md exists without plan.md', () => {
    const result = PhaseDetector.detectPhaseWithConfidence(specOnly);
    expect(result.phase).toBe(WorkflowPhase.NEEDS_PLANNING);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  // ... 18 more file existence tests
});
```

**Task Completion Scenarios**:
```typescript
describe('PhaseDetector - Task Completion', () => {
  it('detects NEEDS_EXECUTION when tasks.md has incomplete tasks', () => {
    const result = PhaseDetector.detectPhaseWithConfidence(incompleteTasks);
    expect(result.phase).toBe(WorkflowPhase.NEEDS_EXECUTION);
    expect(result.signals).toContainEqual({
      type: SignalType.INCOMPLETE_TASKS,
      value: 5,
      weight: expect.any(Number)
    });
  });

  // ... 19 more task completion tests
});
```

**Confidence Calculation**:
```typescript
describe('PhaseDetector - Confidence Calculation', () => {
  it('returns high confidence (>= 0.9) when all signals agree', () => {
    const signals: Signal[] = [
      { type: SignalType.FILE_MISSING, value: 'plan.md', weight: 0.9 },
      { type: SignalType.FILE_EXISTS, value: 'spec.md', weight: 0.8 },
      { type: SignalType.STATUS, value: 'planning', weight: 0.7 }
    ];

    const confidence = PhaseDetector.calculateConfidence(signals);
    expect(confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('penalizes contradictory signals', () => {
    const signals: Signal[] = [
      { type: SignalType.ALL_TASKS_DONE, value: true, weight: 0.8 },
      { type: SignalType.INCOMPLETE_TASKS, value: 3, weight: 0.7 }
    ];

    const confidence = PhaseDetector.calculateConfidence(signals);
    expect(confidence).toBeLessThan(0.7); // Contradictory → low confidence
  });

  // ... 18 more confidence tests
});
```

### Integration Tests

**Workflow Orchestration**:
```typescript
describe('PhaseDetector - Workflow Orchestration', () => {
  it('integrates with WorkflowOrchestrator', async () => {
    const orchestrator = new WorkflowOrchestrator();
    const result = await orchestrator.executeNext(increment);

    expect(result.phaseDetection.confidence).toBeGreaterThan(0.7);
    expect(result.actionTaken).toBe('INVOKE_PLAN');
  });
});
```

---

## Monitoring & Metrics

**Track in Production** (telemetry):
```typescript
interface PhaseDetectionMetrics {
  timestamp: string;
  phase: WorkflowPhase;
  confidence: number;
  signalCount: number;
  detectionTimeMs: number;
  userOverrode: boolean;  // Did user use --force?
  correctDetection: boolean;  // User feedback
}
```

**Alerting**:
- Low confidence rate > 20% → investigate signal quality
- User override rate > 10% → investigate accuracy
- Detection time > 500ms → investigate performance

---

## Related Decisions

- **ADR-0043**: Workflow Orchestration Architecture (uses this phase detection)
- **ADR-0045**: Autonomous Mode Safety (uses confidence thresholds)
- **ADR-0003-009**: Multi-Signal Phase Detection (superseded by this ADR)

---

## References

- **Living Spec**: [SPEC-0039: Ultra-Smart Next Command](../../specs/specweave/spec-0039-ultra-smart-next-command.md)
- **User Story**: [US-001: Auto-Detect Current Workflow Phase](../../specs/specweave/FS-039/us-001-auto-detect-workflow-phase.md)
- **Increment**: [0039-ultra-smart-next-command](../../../increments/0039-ultra-smart-next-command/)

---

**Decision Rationale Summary**:

We enhanced phase detection with **confidence scoring** because:
- ✅ Enables transparency (users see WHY a phase was detected)
- ✅ Supports user control (low confidence → prompt, high confidence → auto-proceed)
- ✅ Maintains 95% accuracy (same heuristic, enhanced with confidence)
- ✅ Extensible (can add ML in v2 without breaking API)
- ✅ Fast (< 500ms, meets performance target)

This enhancement is essential for autonomous mode while preserving user trust and control.
