# Workflow State Data Model

**Version**: 1.0
**Last Updated**: 2025-11-16
**Related**: ADR-0043 (Workflow Orchestration Architecture)

---

## Overview

This document defines the data structures for tracking workflow orchestration state in the Ultra-Smart Next Command.

---

## Core Data Structures

### PhaseDetectionResult

**Purpose**: Output of phase detection with confidence scoring

**Location**: `src/types/workflow.ts`

```typescript
interface PhaseDetectionResult {
  /** Detected workflow phase */
  phase: WorkflowPhase;

  /** Confidence score (0.0 to 1.0) */
  confidence: number;

  /** Signals that contributed to detection */
  signals: Signal[];

  /** Human-readable explanation of detection */
  reasoning: string;

  /** Project ID (multi-project mode) */
  project?: string;

  /** Detection timestamp */
  detectedAt: string;
}
```

**Example**:
```json
{
  "phase": "NEEDS_PLANNING",
  "confidence": 0.95,
  "signals": [
    {
      "type": "FILE_EXISTS",
      "value": "spec.md",
      "weight": 0.9,
      "description": "spec.md exists without plan.md"
    },
    {
      "type": "STATUS",
      "value": "planning",
      "weight": 0.8,
      "description": "Metadata status is 'planning'"
    }
  ],
  "reasoning": "Detected phase: NEEDS_PLANNING (95% confident)\n\nKey signals:\n  1. spec.md exists without plan.md (weight: 0.9)\n  2. Metadata status is 'planning' (weight: 0.8)",
  "detectedAt": "2025-11-16T10:30:00Z"
}
```

---

### WorkflowPhase (Enum)

**Purpose**: Enumeration of all workflow phases

```typescript
enum WorkflowPhase {
  // Initial states
  NO_INCREMENTS = 'NO_INCREMENTS',
  BACKLOG_AVAILABLE = 'BACKLOG_AVAILABLE',

  // Planning phase
  NEEDS_PLANNING = 'NEEDS_PLANNING',
  PLANNING_IN_PROGRESS = 'PLANNING_IN_PROGRESS',

  // Execution phase
  NEEDS_EXECUTION = 'NEEDS_EXECUTION',
  EXECUTION_IN_PROGRESS = 'EXECUTION_IN_PROGRESS',

  // Validation phase
  NEEDS_VALIDATION = 'NEEDS_VALIDATION',
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  // QA phase
  NEEDS_QA = 'NEEDS_QA',
  QA_FAILED = 'QA_FAILED',

  // Closure phase
  NEEDS_CLOSURE = 'NEEDS_CLOSURE',

  // Transition states
  NEEDS_NEXT_INCREMENT = 'NEEDS_NEXT_INCREMENT',

  // Error states
  UNKNOWN = 'UNKNOWN',
  CORRUPT_STATE = 'CORRUPT_STATE',
}
```

**State Transitions**:

| From Phase | To Phase | Trigger | Confidence |
|------------|----------|---------|------------|
| NO_INCREMENTS | BACKLOG_AVAILABLE | Backlog items found | 1.0 (high) |
| BACKLOG_AVAILABLE | NEEDS_PLANNING | User selects backlog item | 0.95 (high) |
| NEEDS_PLANNING | PLANNING_IN_PROGRESS | /specweave:plan invoked | 1.0 (high) |
| PLANNING_IN_PROGRESS | NEEDS_EXECUTION | plan.md + tasks.md created | 0.95 (high) |
| NEEDS_EXECUTION | EXECUTION_IN_PROGRESS | /specweave:do invoked | 1.0 (high) |
| EXECUTION_IN_PROGRESS | NEEDS_EXECUTION | More tasks remain | 0.9 (high) |
| EXECUTION_IN_PROGRESS | NEEDS_VALIDATION | All P1 tasks done | 0.85 (medium-high) |
| NEEDS_VALIDATION | VALIDATION_FAILED | Validation errors found | 0.9 (high) |
| VALIDATION_FAILED | NEEDS_EXECUTION | User fixes issues | 0.8 (medium-high) |
| NEEDS_VALIDATION | NEEDS_QA | Validation passed | 0.85 (medium-high) |
| NEEDS_QA | QA_FAILED | QA score < threshold | 0.9 (high) |
| QA_FAILED | NEEDS_EXECUTION | User fixes issues | 0.8 (medium-high) |
| NEEDS_QA | NEEDS_CLOSURE | QA passed | 0.9 (high) |
| NEEDS_CLOSURE | NEEDS_NEXT_INCREMENT | /specweave:done invoked | 1.0 (high) |
| NEEDS_NEXT_INCREMENT | NEEDS_EXECUTION | Next increment found | 0.85 (medium-high) |
| NEEDS_NEXT_INCREMENT | BACKLOG_AVAILABLE | No active increments | 0.9 (high) |

---

### Signal

**Purpose**: Individual detection signal with weight

```typescript
interface Signal {
  /** Signal type (file, task, metadata, user, project) */
  type: SignalType;

  /** Signal value (depends on type) */
  value: string | number | boolean;

  /** Signal weight (0.0 to 1.0, contribution to confidence) */
  weight: number;

  /** Human-readable description */
  description: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}
```

**Example Signals**:
```json
[
  {
    "type": "FILE_EXISTS",
    "value": "spec.md",
    "weight": 0.9,
    "description": "spec.md exists without plan.md"
  },
  {
    "type": "INCOMPLETE_TASKS",
    "value": 5,
    "weight": 0.7,
    "description": "5 incomplete tasks in tasks.md"
  },
  {
    "type": "STATUS",
    "value": "planning",
    "weight": 0.8,
    "description": "Metadata status is 'planning'"
  }
]
```

---

### SignalType (Enum)

**Purpose**: Categorize signal types

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
```

---

### AutonomousExecutionLog

**Purpose**: Track autonomous execution session

**Storage**: `.specweave/increments/{id}/logs/autonomous-execution-{sessionId}.json`

```typescript
interface AutonomousExecutionLog {
  /** Unique session identifier */
  sessionId: string;

  /** Increment ID */
  incrementId: string;

  /** Execution start time */
  startTime: string;

  /** Execution end time */
  endTime: string;

  /** Execution status */
  status: 'SUCCESS' | 'ABORTED' | 'FAILED';

  /** Total iterations executed */
  totalIterations: number;

  /** Actions executed (ordered) */
  actions: ActionLog[];

  /** Errors encountered */
  errors: ExecutionError[];

  /** Checkpoints saved */
  checkpoints: Checkpoint[];

  /** Cost estimate */
  costEstimate: CostEstimate;

  /** Actual cost (if tracked) */
  actualCost?: number;

  /** Abort reason (if aborted) */
  abortReason?: string;
}
```

**Example**:
```json
{
  "sessionId": "abc123-def456",
  "incrementId": "0039",
  "startTime": "2025-11-16T10:00:00Z",
  "endTime": "2025-11-16T10:45:30Z",
  "status": "SUCCESS",
  "totalIterations": 12,
  "actions": [
    {
      "iteration": 1,
      "timestamp": "2025-11-16T10:00:05Z",
      "phase": "NEEDS_PLANNING",
      "action": {
        "command": "/specweave:plan",
        "args": ["0039"]
      },
      "confidence": 0.95,
      "result": {
        "status": "SUCCESS"
      },
      "durationMs": 120000
    }
  ],
  "errors": [],
  "checkpoints": [
    {
      "timestamp": "2025-11-16T10:02:00Z",
      "iteration": 1,
      "phase": "PLANNING_IN_PROGRESS",
      "lastAction": {
        "command": "/specweave:plan",
        "args": ["0039"]
      }
    }
  ],
  "costEstimate": {
    "aiCalls": 25,
    "estimatedCost": 5.50,
    "estimatedDuration": 45,
    "riskLevel": "MEDIUM"
  },
  "actualCost": 4.80
}
```

---

### ActionLog

**Purpose**: Record of single action executed

```typescript
interface ActionLog {
  /** Iteration number */
  iteration: number;

  /** Action timestamp */
  timestamp: string;

  /** Phase when action was taken */
  phase: WorkflowPhase;

  /** Action details */
  action: Action;

  /** Detection confidence */
  confidence: number;

  /** Action result */
  result: ActionResult;

  /** Execution duration (milliseconds) */
  durationMs: number;

  /** User intervention (if any) */
  userIntervention?: string;
}
```

---

### Action

**Purpose**: Command to execute

```typescript
interface Action {
  /** Command to invoke */
  command: string;

  /** Command arguments */
  args: string[];

  /** Action type */
  type: 'AUTO' | 'SUGGESTED' | 'MANUAL';

  /** Rationale for action */
  rationale: string;
}
```

**Example**:
```json
{
  "command": "/specweave:plan",
  "args": ["0039"],
  "type": "AUTO",
  "rationale": "spec.md exists without plan.md (95% confident)"
}
```

---

### ActionResult

**Purpose**: Result of command execution

```typescript
interface ActionResult {
  /** Execution status */
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'ABORTED';

  /** Exit code (for CLI commands) */
  exitCode?: number;

  /** Standard output */
  stdout?: string;

  /** Standard error */
  stderr?: string;

  /** Parsed result data */
  data?: Record<string, unknown>;

  /** Critical error flag */
  critical?: boolean;

  /** Error details (if failed) */
  error?: ExecutionError;
}
```

---

### ExecutionError

**Purpose**: Error encountered during execution

```typescript
interface ExecutionError {
  /** Error severity */
  severity: ErrorSeverity;

  /** Error message */
  message: string;

  /** Error context (stack trace, etc.) */
  context: string;

  /** Suggested action to fix */
  suggestedAction?: string;

  /** Error code (for categorization) */
  code?: string;
}
```

**Error Severity**:
```typescript
enum ErrorSeverity {
  INFO = 'INFO',         // Informational, continue
  WARNING = 'WARNING',   // Warning, continue with caution
  ERROR = 'ERROR',       // Error, stop current action, continue workflow
  CRITICAL = 'CRITICAL'  // Critical, abort entire execution
}
```

---

### Checkpoint

**Purpose**: State snapshot for recovery

```typescript
interface Checkpoint {
  /** Checkpoint timestamp */
  timestamp: string;

  /** Iteration number when checkpoint created */
  iteration: number;

  /** Phase at checkpoint time */
  phase: WorkflowPhase;

  /** Last action executed */
  lastAction: Action;

  /** Increment metadata snapshot */
  metadata: IncrementMetadata;

  /** File hashes (for corruption detection) */
  fileHashes?: Record<string, string>;
}
```

**Example**:
```json
{
  "timestamp": "2025-11-16T10:05:00Z",
  "iteration": 2,
  "phase": "NEEDS_EXECUTION",
  "lastAction": {
    "command": "/specweave:do",
    "args": ["0039"]
  },
  "metadata": {
    "id": "0039",
    "status": "active",
    "tasksCompleted": 1,
    "tasksTotal": 5
  },
  "fileHashes": {
    "spec.md": "abc123...",
    "plan.md": "def456...",
    "tasks.md": "ghi789..."
  }
}
```

---

### CostEstimate

**Purpose**: Estimate autonomous execution cost

```typescript
interface CostEstimate {
  /** Estimated AI API calls */
  aiCalls: number;

  /** Estimated cost (USD) */
  estimatedCost: number;

  /** Estimated duration (minutes) */
  estimatedDuration: number;

  /** Risk level */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Cost breakdown */
  breakdown?: {
    planning: number;
    execution: number;
    validation: number;
    qa: number;
  };
}
```

**Risk Levels**:
| Risk Level | Cost Range | Action |
|------------|------------|--------|
| LOW | < $1 | Auto-proceed |
| MEDIUM | $1 - $5 | Auto-proceed with warning |
| HIGH | $5 - $20 | Prompt user |
| CRITICAL | > $20 | Block execution, suggest alternatives |

---

### StateTransition

**Purpose**: Track phase transitions

```typescript
interface StateTransition {
  /** Transition timestamp */
  timestamp: string;

  /** From phase */
  fromPhase: WorkflowPhase;

  /** To phase */
  toPhase: WorkflowPhase;

  /** Trigger action */
  trigger: Action;

  /** Transition confidence */
  confidence: number;

  /** Transition duration (ms) */
  durationMs: number;
}
```

---

## Metadata Enhancements

### Enhanced IncrementMetadata

**Purpose**: Extend existing metadata.json with workflow state

**Additions**:
```typescript
interface IncrementMetadata {
  // ... existing fields (id, title, status, etc.) ...

  /** Workflow orchestration data */
  workflow?: {
    /** Last detected phase */
    lastPhase?: WorkflowPhase;

    /** Last phase detection timestamp */
    lastPhaseDetectedAt?: string;

    /** Last phase detection confidence */
    lastPhaseConfidence?: number;

    /** Planning completion timestamp */
    planningCompletedAt?: string;

    /** Validation timestamp */
    validatedAt?: string;

    /** QA timestamp */
    qaRunAt?: string;

    /** QA score (0.0 to 10.0) */
    qaScore?: number;

    /** Autonomous execution sessions */
    autonomousSessions?: string[]; // Session IDs
  };
}
```

**Example**:
```json
{
  "id": "0039",
  "title": "Ultra-Smart Next Command",
  "status": "active",
  "workflow": {
    "lastPhase": "NEEDS_EXECUTION",
    "lastPhaseDetectedAt": "2025-11-16T10:30:00Z",
    "lastPhaseConfidence": 0.92,
    "planningCompletedAt": "2025-11-16T10:05:00Z",
    "validatedAt": null,
    "qaRunAt": null,
    "qaScore": null,
    "autonomousSessions": ["abc123-def456"]
  }
}
```

---

## Configuration

### Workflow Configuration

**Location**: `.specweave/config.json`

```typescript
interface WorkflowConfig {
  /** Autonomous mode settings */
  autonomous?: {
    /** Max iterations per session */
    maxIterations?: number; // Default: 50

    /** Max same-phase retries */
    maxSamePhaseRetries?: number; // Default: 3

    /** Low confidence threshold (prompt user) */
    lowConfidenceThreshold?: number; // Default: 0.7

    /** Cost thresholds */
    costThreshold?: {
      low: number;    // Default: 1
      medium: number; // Default: 5
      high: number;   // Default: 20
    };

    /** Auto-start backlog items */
    autoStartBacklog?: boolean; // Default: true

    /** Enable checkpointing */
    enableCheckpointing?: boolean; // Default: true

    /** Log verbosity */
    logVerbosity?: 'minimal' | 'standard' | 'detailed'; // Default: 'standard'
  };

  /** WIP limit */
  wipLimit?: number; // Default: 3
}
```

**Example**:
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

## File Locations

| Data Type | Location | Format | Git Tracked |
|-----------|----------|--------|-------------|
| **PhaseDetectionResult** | In-memory (ephemeral) | TypeScript object | ❌ No |
| **AutonomousExecutionLog** | `.specweave/increments/{id}/logs/autonomous-execution-{sessionId}.json` | JSON | ✅ Yes |
| **Checkpoint** | `.specweave/increments/{id}/logs/autonomous-checkpoints.json` | JSON | ✅ Yes |
| **Execution Report** | `.specweave/increments/{id}/reports/autonomous-execution-{sessionId}.md` | Markdown | ✅ Yes |
| **Metadata** | `.specweave/increments/{id}/metadata.json` | JSON | ✅ Yes |
| **Config** | `.specweave/config.json` | JSON | ✅ Yes |

---

## Validation Rules

### PhaseDetectionResult Validation

```typescript
function validatePhaseDetectionResult(result: PhaseDetectionResult): boolean {
  // Confidence must be 0.0 to 1.0
  if (result.confidence < 0 || result.confidence > 1) {
    throw new Error('Confidence must be between 0.0 and 1.0');
  }

  // Must have at least one signal
  if (result.signals.length === 0) {
    throw new Error('Must have at least one signal');
  }

  // All signals must have valid weights (0.0 to 1.0)
  for (const signal of result.signals) {
    if (signal.weight < 0 || signal.weight > 1) {
      throw new Error(`Signal ${signal.type} has invalid weight: ${signal.weight}`);
    }
  }

  return true;
}
```

### AutonomousExecutionLog Validation

```typescript
function validateAutonomousExecutionLog(log: AutonomousExecutionLog): boolean {
  // Must have valid session ID
  if (!log.sessionId || log.sessionId.length === 0) {
    throw new Error('Missing session ID');
  }

  // Start time must be before end time
  if (new Date(log.startTime) >= new Date(log.endTime)) {
    throw new Error('Start time must be before end time');
  }

  // Total iterations must match actions length
  if (log.totalIterations !== log.actions.length) {
    throw new Error('Total iterations mismatch');
  }

  return true;
}
```

---

## Related Documentation

- **ADR-0043**: [Workflow Orchestration Architecture](../adr/0043-workflow-orchestration-architecture.md)
- **ADR-0044**: [Phase Detection Enhancement](../adr/0044-phase-detection-enhancement.md)
- **ADR-0045**: [Autonomous Mode Safety](../adr/0045-autonomous-mode-safety.md)
- **Diagrams**: [State Machine](../diagrams/workflow-orchestration/state-machine.mmd), [Command Flow](../diagrams/workflow-orchestration/command-flow.mmd)
