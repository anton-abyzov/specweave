---
increment: 0039-ultra-smart-next-command
architecture_docs:
  - ../../docs/internal/architecture/system-design.md#workflow-orchestration-architecture
  - ../../docs/internal/architecture/adr/0043-workflow-orchestration-architecture.md
  - ../../docs/internal/architecture/adr/0044-phase-detection-enhancement.md
  - ../../docs/internal/architecture/adr/0045-autonomous-mode-safety.md
  - ../../docs/internal/architecture/diagrams/workflow-orchestration/state-machine.mmd
  - ../../docs/internal/architecture/diagrams/workflow-orchestration/command-flow.mmd
  - ../../docs/internal/architecture/data-models/workflow-state.md
---

# Implementation Plan: Ultra-Smart Next Command - Intelligent Workflow Orchestrator

**Increment**: 0039-ultra-smart-next-command
**Priority**: P1
**Status**: Planning
**Epic**: FS-039

---

## Architecture Overview

**Complete Architecture**: [System Design - Workflow Orchestration](../../docs/internal/architecture/system-design.md#workflow-orchestration-architecture)

### Key Architecture Decisions

This implementation is guided by three foundational architecture decisions:

1. **[ADR-0043: Workflow Orchestration Architecture](../../docs/internal/architecture/adr/0043-workflow-orchestration-architecture.md)**
   - Multi-component architecture (WorkflowOrchestrator, PhaseDetector, CommandInvoker, StateManager)
   - Workflow state machine (12 phases)
   - Extend existing phase detection (don't rewrite)

2. **[ADR-0044: Phase Detection Enhancement](../../docs/internal/architecture/adr/0044-phase-detection-enhancement.md)**
   - Confidence scoring (0.0 to 1.0)
   - Multi-signal heuristic (file, task, metadata, user, project signals)
   - Transparency (signal breakdown, reasoning)

3. **[ADR-0045: Autonomous Mode Safety](../../docs/internal/architecture/adr/0045-autonomous-mode-safety.md)**
   - 7 safety layers (infinite loop prevention, critical errors, WIP limits, user control, checkpointing, logging, cost estimation)
   - Max iterations: 50
   - Confidence thresholds (>= 0.9 auto-proceed, < 0.7 prompt user)

### Architecture Diagrams

**State Machine**: [workflow-orchestration/state-machine.mmd](../../docs/internal/architecture/diagrams/workflow-orchestration/state-machine.mmd)
- 12 workflow phases
- State transitions with confidence scores
- Error states and recovery paths

**Command Flow**: [workflow-orchestration/command-flow.mmd](../../docs/internal/architecture/diagrams/workflow-orchestration/command-flow.mmd)
- Sequence diagram: User → CLI → WorkflowOrchestrator → Commands
- Autonomous execution flow
- Checkpointing and error handling

---

## Technology Stack

### Core Technologies

| Component | Technology | Version | Rationale (see ADRs) |
|-----------|-----------|---------|---------------------|
| **Runtime** | Node.js | 20 LTS | SpecWeave standard |
| **Language** | TypeScript | 5.0+ | Type safety, IDE support |
| **CLI Framework** | Commander.js | 11.x | Existing SpecWeave CLI |
| **Testing** | Jest | 29.x | Unit + integration tests |
| **E2E Testing** | Playwright | 1.40+ | Full workflow testing |
| **File System** | fs-extra | 11.x | Robust file operations |
| **YAML Parsing** | js-yaml | 4.x | Metadata parsing |
| **Markdown Parsing** | marked | 11.x | Task parsing |

### New Dependencies

No new external dependencies required. All functionality built using existing SpecWeave stack.

---

## Component Design

### 1. PhaseDetector

**Location**: `src/core/workflow/phase-detector.ts`

**Purpose**: Detect workflow phase with confidence scoring

**API**:
```typescript
export class PhaseDetector {
  // Enhanced detection with confidence
  static detectPhaseWithConfidence(
    increment: Increment,
    config?: Config
  ): PhaseDetectionResult;

  // Generate signals from increment state
  static generateSignals(increment: Increment): Signal[];

  // Calculate confidence from signals
  static calculateConfidence(signals: Signal[]): number;

  // Generate human-readable reasoning
  static generateReasoning(
    phase: WorkflowPhase,
    signals: Signal[],
    confidence: number
  ): string;
}
```

**Key Methods**:
- `detectPhaseWithConfidence()`: Main detection method (95%+ accuracy)
- `generateSignals()`: Extract signals (file, task, metadata, user, project)
- `calculateConfidence()`: Weighted average with penalties/boosts
- `generateReasoning()`: Human-readable explanation

**Dependencies**: `IncrementLoader`, `MetadataLoader`, `FileSystem`

---

### 2. WorkflowOrchestrator

**Location**: `src/core/workflow/workflow-orchestrator.ts`

**Purpose**: Coordinate workflow execution (interactive and autonomous modes)

**API**:
```typescript
export class WorkflowOrchestrator {
  // Interactive mode (default)
  async executeNext(
    increment?: Increment,
    options?: ExecuteOptions
  ): Promise<WorkflowResult>;

  // Autonomous mode
  async executeAutonomous(
    increment: Increment,
    options?: AutonomousOptions
  ): Promise<AutonomousResult>;

  // Dry-run mode
  async previewWorkflow(
    increment: Increment
  ): Promise<WorkflowPreview>;
}
```

**Key Responsibilities**:
- Detect current phase (via PhaseDetector)
- Determine action based on phase
- Invoke commands (via CommandInvoker)
- Handle user prompts (low confidence)
- Track state transitions
- Generate execution logs

**Dependencies**: `PhaseDetector`, `CommandInvoker`, `StateManager`, `BacklogScanner`, `CostEstimator`

---

### 3. CommandInvoker

**Location**: `src/core/workflow/command-invoker.ts`

**Purpose**: Programmatically invoke SpecWeave commands

**API**:
```typescript
export class CommandInvoker {
  // Invoke command programmatically
  async invoke(
    command: string,
    args: string[],
    options?: InvokeOptions
  ): Promise<ActionResult>;

  // Invoke with error handling
  async invokeWithRecovery(
    command: string,
    args: string[],
    retry?: RetryOptions
  ): Promise<ActionResult>;
}
```

**Supported Commands**:
- `/specweave:plan` (NEW)
- `/specweave:do`
- `/specweave:validate`
- `/specweave:qa`
- `/specweave:done`

**Error Handling**:
- Classify errors (INFO, WARNING, ERROR, CRITICAL)
- Retry logic (configurable)
- Graceful degradation

**Dependencies**: Existing command implementations

---

### 4. StateManager

**Location**: `src/core/workflow/state-manager.ts`

**Purpose**: Track workflow state, checkpointing, recovery

**API**:
```typescript
export class StateManager {
  // Save checkpoint
  saveCheckpoint(checkpoint: Checkpoint): void;

  // Load checkpoints
  loadCheckpoints(increment: Increment): Checkpoint[];

  // Get latest checkpoint
  getLatestCheckpoint(increment: Increment): Checkpoint | null;

  // Track state transition
  recordTransition(transition: StateTransition): void;

  // Detect infinite loops
  detectLoop(phaseHistory: WorkflowPhase[]): boolean;
}
```

**Storage**:
- Checkpoints: `.specweave/increments/{id}/logs/autonomous-checkpoints.json`
- State transitions: In-memory (logged to execution log)

**Dependencies**: `FileSystem`, `MetadataLoader`

---

### 5. BacklogScanner

**Location**: `src/core/workflow/backlog-scanner.ts`

**Purpose**: Scan backlog, rank items, suggest next work

**API**:
```typescript
export class BacklogScanner {
  // Scan backlog directory
  scanBacklog(config: Config): BacklogItem[];

  // Rank items by priority + dependencies
  rankItems(
    items: BacklogItem[],
    config: Config
  ): RankedBacklogItem[];

  // Get top N recommendations
  getTopRecommendations(
    n: number,
    config: Config
  ): BacklogRecommendation[];
}
```

**Ranking Algorithm** (see ADR-0043):
```
Score = (Priority Weight × 10)
      + (Dependency Met × 5)
      + (Project Match × 3)
      + (Team Match × 2)
```

**Dependencies**: `IncrementLoader`, `DependencyValidator`

---

### 6. CostEstimator

**Location**: `src/core/workflow/cost-estimator.ts`

**Purpose**: Estimate autonomous execution cost

**API**:
```typescript
export class CostEstimator {
  // Estimate cost for increment
  estimate(increment: Increment): CostEstimate;

  // Estimate cost for specific phase
  estimatePhase(phase: WorkflowPhase, increment: Increment): number;

  // Check if cost exceeds threshold
  checkThreshold(estimate: CostEstimate, config: Config): RiskLevel;
}
```

**Estimation Logic**:
- Planning: 2 AI calls (Architect + test-aware-planner)
- Execution: 3 AI calls per task (avg)
- Validation: 1 AI call (PM validation)
- QA: 1 AI call (judge LLM)
- Cost per call: $0.01 (average)

**Dependencies**: `TaskParser`, `Config`

---

### 7. AutonomousExecutor

**Location**: `src/core/workflow/autonomous-executor.ts`

**Purpose**: Execute autonomous workflow with safety guardrails

**API**:
```typescript
export class AutonomousExecutor {
  // Execute autonomous workflow
  async execute(
    increment: Increment,
    options?: AutonomousOptions
  ): Promise<AutonomousResult>;

  // Abort execution
  abort(): void;

  // Resume from checkpoint
  async resume(
    increment: Increment,
    checkpoint: Checkpoint
  ): Promise<AutonomousResult>;
}
```

**Safety Mechanisms** (ADR-0045):
1. Max iterations (50)
2. Same-phase retry limit (3)
3. Critical error abort
4. User abort (Ctrl+C)
5. Checkpointing (after each action)
6. Cost estimation (before execution)
7. WIP limit enforcement

**Dependencies**: `WorkflowOrchestrator`, `StateManager`, `CostEstimator`

---

### 8. SpecSyncManager

**Location**: `src/core/increment/spec-sync-manager.ts`

**Purpose**: Automatically detect spec.md changes and synchronize plan.md and tasks.md

**API**:
```typescript
export class SpecSyncManager {
  // Detect if spec.md was modified after plan.md
  detectSpecChange(incrementId: string): SpecChangeDetectionResult;

  // Get active increment ID
  getActiveIncrementId(): string | null;

  // Synchronize plan.md and tasks.md based on spec.md
  async syncIncrement(
    incrementId: string,
    skipSync?: boolean
  ): Promise<SpecSyncResult>;

  // Check if active increment needs sync
  checkActiveIncrement(): SpecChangeDetectionResult | null;

  // Format sync message for user
  formatSyncMessage(detection: SpecChangeDetectionResult): string;
}
```

**Key Features**:
- **Change Detection**: Compare modification timestamps (spec.md vs plan.md)
- **Automatic Regeneration**: Trigger Architect Agent + test-aware-planner
- **Status Preservation**: Keep task completion status during regeneration
- **Hook Integration**: Integrated into user-prompt-submit hook (warns user)
- **Multi-Tool Support**: AGENTS.md instructions for non-Claude tools
- **Audit Trail**: Log sync events to increment metadata

**Sync Flow**:
```
1. User edits spec.md
2. Hook detects spec.md mtime > plan.md mtime
3. Show warning to user (with --skip-sync escape hatch)
4. If user approves: Regenerate plan.md using Architect Agent
5. If plan.md regenerated: Regenerate tasks.md using test-aware-planner
6. Preserve task completion status (completed tasks stay [x])
7. Show diff of what changed
8. Log sync event to metadata.json
```

**Non-Claude Tool Support**:
For Cursor/generic tools, AGENTS.md includes:
- Manual sync instructions
- Detection heuristics (file modification times)
- Regeneration commands
- Status preservation techniques

**Dependencies**: `MetadataManager`, `FileSystem`, `ArchitectAgent`, `TestAwarePlanner`

---

### 9. ACStatusManager

**Location**: `src/core/increment/ac-status-manager.ts`

**Purpose**: Automatically sync spec.md AC checkboxes with tasks.md completion status

**API**:
```typescript
export class ACStatusManager {
  // Parse tasks.md and extract AC completion mapping
  parseTasksForACStatus(tasksContent: string): Map<string, ACCompletionStatus>;

  // Parse spec.md and extract AC checkboxes
  parseSpecForACs(specContent: string): Map<string, ACDefinition>;

  // Sync AC status from tasks to spec
  async syncACStatus(incrementId: string): Promise<ACSyncResult>;

  // Validate AC-task mapping (all ACs have tasks)
  validateACMapping(incrementId: string): ValidationResult;

  // Get AC completion summary
  getACCompletionSummary(incrementId: string): ACCompletionSummary;
}
```

**Key Features**:
- **Task Parsing**: Extract **AC**: tags from tasks.md with completion status
- **AC Detection**: Find AC checkboxes in spec.md via regex pattern
- **Mapping Logic**: Map AC-ID → List of tasks → Completion %
- **Update Strategy**:
  - [ ] → [x] when ALL related tasks complete
  - [x] → [ ] if tasks become incomplete (rollback scenario)
- **Diff Display**: Show what will change before updating spec.md
- **Hook Integration**: Triggered by post-task-completion hook
- **Manual Command**: `/specweave:sync-acs` for on-demand sync
- **Conflict Detection**: Warn if AC manually checked but tasks incomplete

**AC Completion Logic**:
```typescript
interface ACCompletionStatus {
  acId: string;           // e.g., "AC-US11-01"
  totalTasks: number;     // e.g., 3
  completedTasks: number; // e.g., 2
  percentage: number;     // e.g., 66.67
  isComplete: boolean;    // true if percentage === 100
  tasks: string[];        // e.g., ["T-062", "T-063", "T-065"]
}
```

**Update Flow**:
```
1. Task completes (e.g., T-062)
2. Post-task-completion hook triggers
3. ACStatusManager.syncACStatus(incrementId)
4. Parse tasks.md → Extract AC mappings
5. Check if ALL tasks for AC-US11-01 complete
6. If yes: Update spec.md AC-US11-01 from [ ] to [x]
7. Show diff to user
8. Log AC status change to metadata.json
```

**Validation**:
- Ensure every AC has at least one task
- Warn if AC has [ ] but all tasks [x] (manual override)
- Warn if AC has [x] but tasks incomplete (conflict)

**Edge Cases**:
- AC with no tasks → Require manual verification (don't auto-check)
- Task references multiple ACs → Update all when task completes
- Partial completion → Show percentage in logs but keep [ ]
- Concurrent updates → Use file locking or atomic writes

**Dependencies**: `FileSystem`, `MetadataManager`, `MarkdownParser`

---

## Implementation Phases

### Phase 1: Foundation (Week 1) ✅

**Goal**: Implement core phase detection and /specweave:plan command

**Tasks**:
1. Create `PhaseDetector` module
   - Implement signal generation (file, task, metadata)
   - Implement confidence calculation (weighted average)
   - Implement reasoning generation (human-readable)
   - Unit tests (100 test cases)

2. Create `/specweave:plan` command
   - Extract planning logic from `/specweave:do`
   - Create command registration
   - Invoke Architect Agent
   - Invoke test-aware-planner
   - Update metadata.json
   - Integration tests

3. Define TypeScript types
   - `WorkflowPhase` enum (12 phases)
   - `SignalType` enum
   - `PhaseDetectionResult` interface
   - `Signal` interface
   - Related types

**Deliverables**:
- `src/core/workflow/phase-detector.ts` (300 lines)
- `src/types/workflow.ts` (200 lines)
- `plugins/specweave/commands/specweave-plan.md` (100 lines)
- `tests/unit/phase-detector.test.ts` (500 lines, 100 test cases)
- `tests/integration/plan-command.test.ts` (200 lines)

**Acceptance Criteria**:
- Phase detection accuracy >= 95% (unit tests)
- Confidence scoring works (0.0 to 1.0)
- `/specweave:plan` creates plan.md + tasks.md
- All tests pass (jest)

---

### Phase 2: Orchestration (Week 2) ✅

**Goal**: Implement workflow orchestration and command invocation

**Tasks**:
1. Create `WorkflowOrchestrator` module
   - Implement `executeNext()` (interactive mode)
   - Integrate PhaseDetector
   - Implement action determination logic
   - User prompt handling (low confidence)
   - Integration tests

2. Create `CommandInvoker` module
   - Implement programmatic command execution
   - Error classification (INFO, WARNING, ERROR, CRITICAL)
   - Retry logic (configurable)
   - Unit tests

3. Create `StateManager` module
   - Implement checkpointing (save/load)
   - Implement state transition tracking
   - Implement loop detection
   - Unit tests

**Deliverables**:
- `src/core/workflow/workflow-orchestrator.ts` (400 lines)
- `src/core/workflow/command-invoker.ts` (250 lines)
- `src/core/workflow/state-manager.ts` (200 lines)
- `tests/integration/workflow-orchestration.test.ts` (400 lines)
- `tests/unit/command-invoker.test.ts` (300 lines)
- `tests/unit/state-manager.test.ts` (250 lines)

**Acceptance Criteria**:
- Interactive mode works (detect phase → invoke command)
- Commands invoked programmatically
- Checkpoints saved after each action
- Loop detection prevents infinite loops
- All tests pass

---

### Phase 3: Intelligence (Week 3) ✅

**Goal**: Implement backlog scanning and cost estimation

**Tasks**:
1. Create `BacklogScanner` module
   - Implement backlog directory scanning
   - Implement ranking algorithm (priority + dependencies + project match)
   - Implement dependency validation
   - Unit tests

2. Create `CostEstimator` module
   - Implement cost estimation logic (AI calls per phase)
   - Implement risk level calculation (LOW, MEDIUM, HIGH, CRITICAL)
   - Implement threshold checking
   - Unit tests

3. Enhance `WorkflowOrchestrator` with backlog suggestions
   - Integrate BacklogScanner
   - Display top 3 recommendations
   - Handle user selection
   - Integration tests

**Deliverables**:
- `src/core/workflow/backlog-scanner.ts` (300 lines)
- `src/core/workflow/cost-estimator.ts` (200 lines)
- `tests/unit/backlog-scanner.test.ts` (300 lines)
- `tests/unit/cost-estimator.test.ts` (250 lines)
- Updated `workflow-orchestrator.ts` (+ 100 lines)

**Acceptance Criteria**:
- Backlog scanning finds all items in `_backlog/`
- Ranking algorithm works (priority, dependencies, project match)
- Cost estimation accurate (within 20% of actual)
- Top 3 recommendations displayed
- All tests pass

---

### Phase 4: Autonomy (Week 4) ✅

**Goal**: Implement autonomous mode with safety guardrails

**Tasks**:
1. Create `AutonomousExecutor` module
   - Implement `execute()` with safety layers
   - Implement infinite loop prevention (max iterations, phase retry limit)
   - Implement critical error handling
   - Implement user abort (Ctrl+C)
   - Implement WIP limit enforcement
   - Integration tests

2. Create execution logging
   - Implement `AutonomousExecutionLog` generation
   - Implement human-readable report.md generation
   - Save logs to `.specweave/increments/{id}/logs/`
   - Unit tests

3. Enhance `/specweave:next` command
   - Add `--autonomous` flag
   - Add `--dry-run` flag (preview workflow)
   - Add `--resume` flag (resume from checkpoint)
   - Integrate WorkflowOrchestrator
   - E2E tests

**Deliverables**:
- `src/core/workflow/autonomous-executor.ts` (500 lines)
- Updated `plugins/specweave/commands/specweave-next.md` (+ 200 lines)
- `tests/integration/autonomous-mode.test.ts` (500 lines)
- `tests/e2e/autonomous-workflow.spec.ts` (400 lines, Playwright)

**Acceptance Criteria**:
- Autonomous mode executes full workflow (plan → do → validate → qa → done)
- Safety guardrails work (max iterations, critical errors, WIP limits)
- User can abort with Ctrl+C
- Execution log generated
- Resume from checkpoint works
- All tests pass (jest + Playwright)

---

### Phase 5: Polish (Week 5) ✅

**Goal**: UX refinement, documentation, performance optimization

**Tasks**:
1. UX Refinement
   - Clear prompts (actionable suggestions)
   - Human-readable confidence scores ("95% confident")
   - Error messages with suggested fixes
   - Progress indicators (iteration count, phase)
   - User feedback collection

2. Documentation
   - Update command reference (`/specweave:next` docs)
   - Create user guide: "Autonomous Workflow with /specweave:next"
   - Create architecture guide (for contributors)
   - Blog post: "Ship Features While You Sleep"
   - Video demo (5 min screencast)

3. Performance Optimization
   - Benchmark phase detection (< 500ms target)
   - Optimize file I/O (batch reads)
   - Cache metadata.json (avoid re-parsing)
   - Profile command orchestration (< 1s overhead target)

4. Configuration
   - Add workflow config to `.specweave/config.json`
   - Document all config options
   - Provide sensible defaults (maxIterations: 50, wipLimit: 3)

**Deliverables**:
- Updated docs: `docs/commands/specweave-next.md`
- User guide: `docs/guides/autonomous-workflow.md`
- Architecture guide: `docs/architecture/workflow-orchestration.md`
- Blog post: `blog/autonomous-workflow.md`
- Video demo: `demos/autonomous-workflow.mp4`
- Performance benchmarks: `benchmarks/workflow-orchestration.md`

**Acceptance Criteria**:
- Phase detection < 500ms (p95)
- Command orchestration overhead < 1s (p95)
- User guide complete
- All documentation updated
- Video demo published

---

### Phase 6: Spec Synchronization (NEW - US-011)

**Goal**: Automatic synchronization of plan.md and tasks.md when spec.md changes

**Tasks**:
1. Implement `SpecSyncManager` module
   - Implement `detectSpecChange()` (file modification time comparison)
   - Implement `syncIncrement()` (regenerate plan + tasks)
   - Implement status preservation (keep completed tasks [x])
   - Implement sync event logging (audit trail in metadata.json)
   - Unit tests (20+ test cases)

2. Integrate with user-prompt-submit hook
   - Add spec change detection to hook
   - Show sync warning before commands
   - Provide --skip-sync escape hatch
   - Test hook integration

3. Create AGENTS.md instructions (multi-tool support)
   - Manual sync detection instructions (file mtime comparison)
   - Regeneration steps (call architect, test-aware-planner)
   - Status preservation techniques (diff, merge)
   - Example commands for Cursor/generic tools

4. Implement plan.md regeneration logic
   - Extract spec.md changes (diff detection)
   - Call Architect Agent with updated spec
   - Merge changes (preserve manual edits where possible)
   - Show diff to user

5. Implement tasks.md regeneration logic
   - Parse existing tasks.md (extract completion status)
   - Call test-aware-planner with updated plan.md
   - Preserve completion status (map old tasks to new tasks by ID)
   - Handle task additions, removals, reordering

**Deliverables**:
- `src/core/increment/spec-sync-manager.ts` (300 lines) ✅
- Updated `plugins/specweave/hooks/user-prompt-submit.sh` (+ 50 lines) ✅
- `AGENTS.md` section: "Spec Synchronization" (200 lines)
- `tests/unit/spec-sync-manager.test.ts` (400 lines)
- `tests/e2e/spec-sync-flow.spec.ts` (300 lines)
- Documentation: `docs/guides/spec-sync.md` (150 lines)

**Acceptance Criteria**:
- Hook detects spec.md changes (100% accuracy)
- Warning shown to user before any command
- plan.md regenerated when spec changes
- tasks.md regenerated when plan changes
- Task completion status preserved (90%+ accuracy)
- --skip-sync flag works
- AGENTS.md instructions clear for non-Claude tools
- All tests pass (unit + E2E)

**Edge Cases Handled**:
- spec.md deleted (no sync, warning shown)
- plan.md doesn't exist yet (no sync needed, planning phase)
- tasks.md doesn't exist (only regenerate plan.md)
- Concurrent edits (use modification time, warn user)
- Invalid spec.md format (show error, skip sync)
- Sync failure (show error, keep old files, rollback)

---

### Phase 7: AC Status Automation (NEW - US-012)

**Goal**: Automatic synchronization of spec.md AC checkboxes with tasks.md completion status

**Tasks**:
1. Implement `ACStatusManager` module
   - Implement `parseTasksForACStatus()` (extract AC tags from tasks.md)
   - Implement `parseSpecForACs()` (find AC checkboxes in spec.md)
   - Implement `syncACStatus()` (update spec.md based on task completion)
   - Implement `validateACMapping()` (ensure all ACs have tasks)
   - Unit tests (20+ test cases)

2. Integrate with post-task-completion hook
   - Add AC status sync to hook
   - Trigger on task completion
   - Show diff before updating spec.md
   - User can skip with --skip-ac-sync flag

3. Create /specweave:sync-acs command
   - Manual command to force AC sync
   - Show AC completion summary
   - Update all ACs for increment
   - Integration tests

4. Add AC status tracking to metadata.json
   - Log AC status changes ([ ] → [x])
   - Track when ACs complete
   - Keep history of AC updates

5. Validation and conflict detection
   - Warn if AC [ ] but all tasks [x]
   - Warn if AC [x] but tasks incomplete
   - Detect manual overrides
   - Show percentage completion

**Deliverables**:
- `src/core/increment/ac-status-manager.ts` (300 lines)
- Updated `plugins/specweave/hooks/post-task-completion.sh` (+ 30 lines)
- `plugins/specweave/commands/specweave-sync-acs.md` (new command)
- `tests/unit/ac-status-manager.test.ts` (400 lines)
- `tests/integration/ac-status-sync.test.ts` (200 lines)
- Documentation: `docs/guides/ac-status-automation.md` (150 lines)

**Acceptance Criteria**:
- Hook updates spec.md ACs when tasks complete
- /specweave:sync-acs command works
- All ACs have corresponding tasks (validation)
- AC status changes logged to metadata
- Diff shown before updating spec.md
- --skip-ac-sync flag works
- Conflict detection (manual vs auto)
- All tests pass (unit + integration)

**Edge Cases Handled**:
- AC with no tasks (require manual verification, don't auto-check)
- Task with multiple ACs (update all when task completes)
- Partial completion (show %, keep [ ])
- Manual AC override (log conflict, preserve manual choice)
- Concurrent spec.md edits (file locking or atomic writes)
- Invalid AC-ID format (warn, skip)

---

## File Structure

### New Files

```
src/core/workflow/
├── phase-detector.ts          # Phase detection with confidence
├── workflow-orchestrator.ts   # Core orchestration logic
├── command-invoker.ts          # Programmatic command execution
├── state-manager.ts            # Checkpointing, state tracking
├── backlog-scanner.ts          # Backlog ranking
├── cost-estimator.ts           # Cost estimation
└── autonomous-executor.ts      # Autonomous mode with safety

src/types/
└── workflow.ts                 # TypeScript types

plugins/specweave/commands/
└── specweave-plan.md           # NEW command

tests/unit/
├── phase-detector.test.ts
├── command-invoker.test.ts
├── state-manager.test.ts
├── backlog-scanner.test.ts
├── cost-estimator.test.ts
└── workflow-orchestrator.test.ts

tests/integration/
├── workflow-orchestration.test.ts
├── autonomous-mode.test.ts
└── plan-command.test.ts

tests/e2e/
└── autonomous-workflow.spec.ts

.specweave/increments/{id}/logs/
├── autonomous-execution-{sessionId}.json  # Execution log
└── autonomous-checkpoints.json            # Checkpoints

.specweave/increments/{id}/reports/
└── autonomous-execution-{sessionId}.md    # Human-readable report
```

**Total New Code**: ~3,500 lines TypeScript (src/)
**Total Tests**: ~3,500 lines (unit + integration + E2E)

---

## Testing Strategy

### Unit Tests (1,500+ lines)

**Coverage Target**: 95%+

**Test Files**:
- `phase-detector.test.ts` (100 test cases)
  - File existence scenarios (20 tests)
  - Task completion scenarios (20 tests)
  - Metadata scenarios (20 tests)
  - Confidence calculation (20 tests)
  - Edge cases (corrupt files, missing data) (20 tests)

- `command-invoker.test.ts` (30 test cases)
  - Successful invocation
  - Error handling (exit code, stderr)
  - Retry logic
  - Critical error classification

- `state-manager.test.ts` (25 test cases)
  - Checkpoint save/load
  - State transition tracking
  - Loop detection
  - File I/O errors

- `backlog-scanner.test.ts` (30 test cases)
  - Directory scanning
  - Ranking algorithm
  - Dependency validation
  - Edge cases (empty backlog, circular dependencies)

- `cost-estimator.test.ts` (25 test cases)
  - Cost calculation (per phase)
  - Risk level determination
  - Threshold checking
  - Edge cases (zero tasks, large increments)

- `workflow-orchestrator.test.ts` (40 test cases)
  - Interactive mode (detect → invoke)
  - Action determination
  - User prompting
  - Error handling

### Integration Tests (1,500+ lines)

**Coverage Target**: 90%+

**Test Files**:
- `workflow-orchestration.test.ts` (40 test cases)
  - Full workflow: spec.md → plan → do → validate → qa → done
  - Multi-project mode
  - Error recovery
  - State transitions

- `autonomous-mode.test.ts` (40 test cases)
  - Autonomous execution (end-to-end)
  - Safety guardrails (infinite loop, critical errors, WIP limits)
  - Checkpointing and resume
  - Cost estimation

- `plan-command.test.ts` (20 test cases)
  - /specweave:plan invocation
  - Architect Agent integration
  - test-aware-planner integration
  - Metadata updates

### E2E Tests (500+ lines, Playwright)

**Coverage Target**: Key user workflows

**Test Files**:
- `autonomous-workflow.spec.ts` (15 test cases)
  - Create spec.md → run /specweave:next --autonomous → verify closed
  - Backlog suggestions (no active increments)
  - Confidence prompting (low confidence)
  - Error recovery (corrupt plan.md)
  - Abort and resume (Ctrl+C → /specweave:next --resume)

### Performance Tests

**Benchmarks**:
- Phase detection latency (target: < 500ms p95)
- Command orchestration overhead (target: < 1s p95)
- Backlog scanning (target: < 2s for 1000 items)
- Autonomous full workflow (target: < 10 min for 5-task increment)

---

## Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| **Phase Detection** | < 500ms | File I/O + parsing + calculation |
| **Command Orchestration** | < 1s | Detection + invocation overhead |
| **Backlog Scanning** | < 2s | Scan 1000 items + rank |
| **Confidence Calculation** | < 100ms | Weighted average (no I/O) |
| **Checkpoint Save** | < 500ms | Write JSON to disk |
| **Autonomous Full Workflow** | < 10 min | 5-task increment (plan → close) |

---

## Security Considerations

### 1. No Privilege Escalation

**Risk**: Autonomous mode auto-approves user-gated actions (e.g., GitHub PR merge)

**Mitigation**:
- Autonomous mode uses same permissions as manual commands
- No auto-approval of user-gated actions
- Audit trail logs all actions

### 2. Infinite Loop Prevention

**Risk**: Phase detection bug causes infinite loop (same phase repeated)

**Mitigation**:
- Max iterations: 50 (configurable)
- Same-phase retry limit: 3
- Loop detection algorithm (abort if same phase 3+ times)

### 3. Input Validation

**Risk**: Malicious increment ID causes path traversal

**Mitigation**:
- Validate increment ID format (4-digit number only)
- Sanitize all file paths (use path.join, never concatenate)
- Check file existence before reading

### 4. Cost Control

**Risk**: Runaway autonomous execution exhausts API credits

**Mitigation**:
- Cost estimation before execution (AI calls + dollars)
- Block CRITICAL cost (> $20)
- Prompt user for HIGH cost ($5-$20)
- Track actual cost (log AI calls)

### 5. State Corruption

**Risk**: Concurrent executions corrupt metadata.json

**Mitigation**:
- File locking (not implemented in v1, documented limitation)
- Checkpointing (atomic writes)
- Validation before save (JSON schema check)

---

## Integration Points

### Existing Components

1. **Phase Detection (ADR-0003-009)** ✅
   - **Status**: Enhance with confidence scoring
   - **Integration**: Extend existing PhaseDetector class (if exists) or create new
   - **Changes**: Add `detectPhaseWithConfidence()` method

2. **PM Agent Validation Gates** ✅
   - **Status**: Invoke existing 3-gate check
   - **Integration**: Call PM validation before `/specweave:done` in autonomous mode
   - **Changes**: None (use as-is)

3. **Increment Lifecycle State Machine** ✅
   - **Status**: Detect state transitions (backlog → planned → active → completed → closed)
   - **Integration**: Read `metadata.json` status field
   - **Changes**: Add `workflow` field to metadata.json (see ADR-0044)

4. **Multi-Project Support (v0.16.11+)** ✅
   - **Status**: Project-aware phase detection
   - **Integration**: Read `config.json` multiProject configuration
   - **Changes**: Apply project keyword filtering in PhaseDetector

### New Components

1. **`/specweave:plan` Command** (NEW) ✅
   - **Purpose**: Extracted from `/specweave:do`, reusable for orchestration
   - **Integration**: Called by WorkflowOrchestrator when phase = NEEDS_PLANNING
   - **Dependencies**: Architect Agent, test-aware-planner Agent

2. **WorkflowOrchestrator** (NEW) ✅
   - **Purpose**: Core orchestration logic
   - **Integration**: Used by `/specweave:next` command
   - **Dependencies**: PhaseDetector, CommandInvoker, StateManager, BacklogScanner, CostEstimator

---

## Migration & Rollout

### Backward Compatibility

✅ **Existing `/specweave:next` behavior preserved**:
- Default mode: Interactive (same as before)
- No breaking changes to existing workflows
- Manual commands still work (`/specweave:plan`, `/do`, `/validate`, etc.)

### Opt-In Features

✅ **Autonomous mode is opt-in**:
- Requires `--autonomous` flag (not default)
- Users control automation level (`--skip-plan`, `--skip-validate`, etc.)
- Confidence prompting can be disabled (config.workflow.autoPrompt: false)

### Rollout Plan

**Phase 1: Alpha Testing (Internal)**
- Test with SpecWeave development (dogfooding)
- Gather feedback, fix critical bugs
- Tune confidence thresholds

**Phase 2: Beta Release (Early Adopters)**
- Publish as v0.22.0-beta
- Invite power users to test
- Monitor error rates, performance

**Phase 3: General Availability**
- Publish as v0.22.0
- CHANGELOG entry with feature explanation
- Blog post: "Autonomous Workflow with /specweave:next"
- Video demo: "Ship Features with One Command"

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Phase Detection Accuracy < 95%** | Medium | High | Extensive unit tests, user feedback loop, fallback to manual prompts |
| **Autonomous Mode Fails Mid-Workflow** | Medium | Medium | Checkpointing (save state after each step), detailed error logs, graceful recovery |
| **Users Over-Rely on Automation** | Low | Medium | Show confidence scores, prompt on low confidence, preserve manual commands |
| **Performance < Targets** | Low | Low | Benchmark tests, optimize hot paths, cache file reads |
| **Breaking Changes** | Low | High | Backward compatibility tests, feature flags for gradual rollout |
| **Cost Estimation Inaccurate** | Medium | Medium | Track actual costs, tune estimation formula, user feedback |

---

## Success Metrics

See [FS-039: Success Criteria](../../docs/internal/specs/_features/FS-039/FEATURE.md#success-criteria)

**Key Metrics**:
1. **Time-to-Completion Reduction**: 40% (4 min → 30 sec overhead)
2. **Phase Detection Accuracy**: >= 95%
3. **User Satisfaction**: 85%+ report "easier workflow"
4. **Autonomous Mode Adoption**: 30%+ of power users
5. **Error Rate**: < 5% of executions

**Measurement**:
- Command execution logs (time tracking)
- Unit tests (accuracy)
- Post-implementation survey (satisfaction)
- Usage analytics (adoption)
- Error logs (error rate)

---

## Related Documentation

**Architecture**:
- [System Design - Workflow Orchestration](../../docs/internal/architecture/system-design.md#workflow-orchestration-architecture)
- [ADR-0043: Workflow Orchestration Architecture](../../docs/internal/architecture/adr/0043-workflow-orchestration-architecture.md)
- [ADR-0044: Phase Detection Enhancement](../../docs/internal/architecture/adr/0044-phase-detection-enhancement.md)
- [ADR-0045: Autonomous Mode Safety](../../docs/internal/architecture/adr/0045-autonomous-mode-safety.md)
- [Data Model: Workflow State](../../docs/internal/architecture/data-models/workflow-state.md)

**Diagrams**:
- [State Machine](../../docs/internal/architecture/diagrams/workflow-orchestration/state-machine.mmd)
- [Command Flow](../../docs/internal/architecture/diagrams/workflow-orchestration/command-flow.mmd)

**Living Specs**:
- [FS-039: Ultra-Smart Next Command](../../docs/internal/specs/_features/FS-039/FEATURE.md)

**User Stories**:
- [US-001: Auto-Detect Current Workflow Phase](../../docs/internal/specs/specweave/FS-039/us-001-auto-detect-workflow-phase.md)
- [US-007: Implement /specweave:plan Command](../../docs/internal/specs/specweave/FS-039/us-007-implement-plan-command.md)
- [US-010: Autonomous Workflow Mode](../../docs/internal/specs/specweave/FS-039/us-010-autonomous-workflow-mode.md)

---

## Summary

This implementation transforms SpecWeave from a powerful but manual system into an intelligent autonomous workflow orchestrator. Users can navigate the entire development lifecycle with one command (`/specweave:next`) or enable full automation (`/specweave:next --autonomous`) to "ship features while they sleep."

**Key Highlights**:
- **95%+ Accuracy**: Phase detection with confidence scoring
- **Zero-Prompt Execution**: Autonomous mode for power users
- **7 Safety Layers**: Infinite loop prevention, cost control, user abort
- **Backward Compatible**: Existing workflows unchanged
- **Well-Tested**: 100+ unit tests, 40+ integration tests, 15+ E2E tests

**Implementation Timeline**: 5 weeks (Foundation → Orchestration → Intelligence → Autonomy → Polish)

**This plan serves as a summary. For complete architecture details, see the referenced ADRs and architecture documents.**
