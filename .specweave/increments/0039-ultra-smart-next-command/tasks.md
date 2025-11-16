# Tasks: Ultra-Smart Next Command - Intelligent Workflow Orchestrator

---
increment: 0039-ultra-smart-next-command
status: planned
test_mode: TDD
coverage_target: 95%
phases:
  - foundation
  - orchestration
  - intelligence
  - autonomy
  - polish
  - spec-synchronization
estimated_tasks: 78
estimated_weeks: 6
---

## Task Notation

- `[T###]`: Sequential task ID
- `[P]`: Parallelizable (no file conflicts)
- `[US#]`: User story reference
- `[ ]`: Not started
- `[x]`: Completed
- **AC**: Acceptance Criteria IDs covered by this task
- Test plans embedded in each task (BDD format: Given/When/Then)

---

## Phase 1: Foundation (Week 1)

### US-007: Implement /specweave:plan Command (P1)

#### T-001: Write tests for PlanCommand initialization
**AC**: AC-US7-01
**File**: `tests/unit/cli/commands/plan-command.test.ts`
**Test Plan**:
- **Given**: Empty increment with only spec.md
- **When**: User runs /specweave:plan
- **Then**: Command initializes correctly and detects missing plan.md/tasks.md

**Test Cases**:
```typescript
describe('PlanCommand', () => {
  it('should detect increment with only spec.md', async () => {
    // Create test increment with spec.md only
    // Run plan command
    // Assert it detects missing files
  });

  it('should validate spec.md exists before planning', async () => {
    // Create increment without spec.md
    // Run plan command
    // Assert error: "spec.md required"
  });
});
```

**Dependencies**: None
**Estimated**: 2 hours

---

#### T-002: Implement PlanCommand class
**AC**: AC-US7-01, AC-US7-02
**File**: `src/cli/commands/plan.ts`
**Implementation**:
1. Create PlanCommand class extending BaseCommand
2. Add command registration (name: 'plan', description, options)
3. Implement execute() method
4. Add increment number parameter parsing
5. Add validation for spec.md existence

**Dependencies**: T-001
**Estimated**: 3 hours

---

#### T-003: Write tests for Architect Agent invocation
**AC**: AC-US7-02
**File**: `tests/unit/cli/commands/plan-command.test.ts`
**Test Plan**:
- **Given**: Increment with spec.md but no plan.md
- **When**: PlanCommand invokes Architect Agent
- **Then**: Agent reads spec.md and generates plan.md with architecture

**Test Cases**:
```typescript
describe('PlanCommand - Architect Invocation', () => {
  it('should invoke Architect agent with spec.md content', async () => {
    const mockAgentInvoker = jest.fn();
    // Mock spec.md content
    // Run plan command
    // Assert Architect agent called with correct prompt
  });

  it('should pass tech stack to Architect agent', async () => {
    // Mock tech stack detection
    // Run plan command
    // Assert tech stack included in agent prompt
  });
});
```

**Dependencies**: T-002
**Estimated**: 2 hours

---

#### T-004: [P] Implement Architect Agent invocation
**AC**: AC-US7-02
**File**: `src/cli/commands/plan.ts`
**Implementation**:
1. Create AgentInvoker utility
2. Read spec.md content
3. Detect tech stack from project files
4. Build Architect agent prompt
5. Invoke agent via Task tool
6. Wait for plan.md creation

**Dependencies**: T-003
**Estimated**: 4 hours

---

#### T-005: Write tests for test-aware-planner invocation
**AC**: AC-US7-03
**File**: `tests/unit/cli/commands/plan-command.test.ts`
**Test Plan**:
- **Given**: Increment with spec.md and plan.md but no tasks.md
- **When**: PlanCommand invokes test-aware-planner agent
- **Then**: Agent generates tasks.md with embedded tests in BDD format

**Test Cases**:
```typescript
describe('PlanCommand - Test-Aware Planner', () => {
  it('should invoke test-aware-planner after Architect', async () => {
    // Mock spec.md and plan.md
    // Run plan command
    // Assert test-aware-planner called after Architect
  });

  it('should pass all AC-IDs to test-aware-planner', async () => {
    // Mock spec with AC-IDs
    // Run plan command
    // Assert all AC-IDs in agent prompt
  });

  it('should embed test plans in tasks.md', async () => {
    // Run plan command
    // Read generated tasks.md
    // Assert BDD format (Given/When/Then) present
  });
});
```

**Dependencies**: T-004
**Estimated**: 2 hours

---

#### T-006: [P] Implement test-aware-planner invocation
**AC**: AC-US7-03
**File**: `src/cli/commands/plan.ts`
**Implementation**:
1. Parse spec.md for AC-IDs
2. Parse plan.md for phases
3. Build test-aware-planner prompt
4. Invoke agent via Task tool
5. Validate tasks.md has embedded tests
6. Check AC-ID coverage (all AC-IDs covered)

**Dependencies**: T-005
**Estimated**: 4 hours

---

#### T-007: Write tests for PlanCommand validation
**AC**: AC-US7-04
**File**: `tests/unit/cli/commands/plan-command.test.ts`
**Test Plan**:
- **Given**: Generated plan.md and tasks.md
- **When**: PlanCommand validates output
- **Then**: Confirms all required sections exist and AC coverage is complete

**Test Cases**:
```typescript
describe('PlanCommand - Validation', () => {
  it('should validate plan.md has architecture section', async () => {
    // Generate plan.md without architecture
    // Run validation
    // Assert error
  });

  it('should validate tasks.md covers all AC-IDs', async () => {
    // Generate tasks.md missing AC-IDs
    // Run validation
    // Assert error with missing AC-IDs
  });

  it('should validate tasks.md has embedded tests', async () => {
    // Generate tasks.md without test plans
    // Run validation
    // Assert error
  });
});
```

**Dependencies**: T-006
**Estimated**: 2 hours

---

#### T-008: Implement validation logic
**AC**: AC-US7-04
**File**: `src/cli/commands/plan.ts`
**Implementation**:
1. Create validation function for plan.md
2. Create validation function for tasks.md
3. Check AC-ID coverage
4. Check embedded test plans exist
5. Report validation errors clearly

**Dependencies**: T-007
**Estimated**: 3 hours

---

#### T-009: [P] Write integration tests for /specweave:plan
**AC**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04
**File**: `tests/integration/commands/plan-command.integration.test.ts`
**Test Plan**:
- **Given**: Real increment with spec.md
- **When**: User runs /specweave:plan
- **Then**: Complete plan.md and tasks.md generated successfully

**Test Cases**:
```typescript
describe('PlanCommand Integration', () => {
  it('should generate plan.md and tasks.md from spec.md', async () => {
    // Create real test increment
    // Run plan command
    // Assert plan.md and tasks.md created
    // Assert files validate successfully
  });

  it('should handle increment without spec.md gracefully', async () => {
    // Create increment without spec.md
    // Run plan command
    // Assert clear error message
  });

  it('should skip if plan.md already exists', async () => {
    // Create increment with existing plan.md
    // Run plan command
    // Assert skips re-generation (or prompts user)
  });
});
```

**Dependencies**: T-008
**Estimated**: 3 hours

---

#### T-010: Register /specweave:plan command
**AC**: AC-US7-01
**File**: `plugins/specweave/commands/specweave-plan.md`
**Implementation**:
1. Create command markdown file
2. Define command name: `/specweave:plan`
3. Add description and usage examples
4. Link to PlanCommand implementation
5. Test command registration in Claude Code

**Dependencies**: T-009
**Estimated**: 2 hours

---

### US-001: Auto-Detect Current Workflow Phase (P1)

#### T-011: Write tests for PhaseDetector - keyword analysis
**AC**: AC-US1-01
**File**: `tests/unit/core/workflow/phase-detector.test.ts`
**Test Plan**:
- **Given**: User prompt with planning keywords ("plan", "design", "architecture")
- **When**: PhaseDetector analyzes keywords
- **Then**: Returns planning phase with confidence > 0.7

**Test Cases**:
```typescript
describe('PhaseDetector - Keyword Analysis', () => {
  it('should detect planning phase from keywords', () => {
    const prompt = "Let's plan the architecture for user authentication";
    const result = detector.analyzeKeywords(prompt);
    expect(result.phase).toBe('planning');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('should detect execution phase from keywords', () => {
    const prompt = "Implement the login API endpoint";
    const result = detector.analyzeKeywords(prompt);
    expect(result.phase).toBe('execution');
  });

  it('should detect review phase from keywords', () => {
    const prompt = "Validate the authentication flow";
    const result = detector.analyzeKeywords(prompt);
    expect(result.phase).toBe('review');
  });
});
```

**Dependencies**: None
**Estimated**: 3 hours

---

#### T-012: Implement PhaseDetector keyword analysis
**AC**: AC-US1-01
**File**: `src/core/workflow/phase-detector.ts`
**Implementation**:
1. Create PhaseDetector class
2. Define keyword dictionaries (planning, execution, review)
3. Implement analyzeKeywords() method
4. Calculate weighted score (40% from ADR-0044)
5. Return phase and confidence

**Dependencies**: T-011
**Estimated**: 3 hours

---

#### T-013: Write tests for PhaseDetector - command analysis
**AC**: AC-US1-01
**File**: `tests/unit/core/workflow/phase-detector.test.ts`
**Test Plan**:
- **Given**: Command context (/specweave:increment, /specweave:do, /specweave:validate)
- **When**: PhaseDetector analyzes command
- **Then**: Returns correct phase with confidence based on command type

**Test Cases**:
```typescript
describe('PhaseDetector - Command Analysis', () => {
  it('should detect planning from /specweave:increment', () => {
    const context = { command: '/specweave:increment' };
    const result = detector.analyzeCommand(context);
    expect(result.phase).toBe('planning');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should detect execution from /specweave:do', () => {
    const context = { command: '/specweave:do' };
    const result = detector.analyzeCommand(context);
    expect(result.phase).toBe('execution');
  });

  it('should detect review from /specweave:validate', () => {
    const context = { command: '/specweave:validate' };
    const result = detector.analyzeCommand(context);
    expect(result.phase).toBe('review');
  });
});
```

**Dependencies**: T-012
**Estimated**: 2 hours

---

#### T-014: [P] Implement PhaseDetector command analysis
**AC**: AC-US1-01
**File**: `src/core/workflow/phase-detector.ts`
**Implementation**:
1. Define command-to-phase mapping
2. Implement analyzeCommand() method
3. Calculate weighted score (30% from ADR-0044)
4. Handle unknown commands gracefully

**Dependencies**: T-013
**Estimated**: 2 hours

---

#### T-015: Write tests for PhaseDetector - context analysis
**AC**: AC-US1-01
**File**: `tests/unit/core/workflow/phase-detector.test.ts`
**Test Plan**:
- **Given**: Increment context (status: planned vs in-progress, files present)
- **When**: PhaseDetector analyzes context
- **Then**: Returns appropriate phase based on increment state

**Test Cases**:
```typescript
describe('PhaseDetector - Context Analysis', () => {
  it('should detect planning when increment is planned', () => {
    const context = { incrementStatus: 'planned' };
    const result = detector.analyzeContext(context);
    expect(result.phase).toBe('planning');
  });

  it('should detect execution when increment is in-progress', () => {
    const context = { incrementStatus: 'in-progress' };
    const result = detector.analyzeContext(context);
    expect(result.phase).toBe('execution');
  });

  it('should detect review when all tasks completed', () => {
    const context = {
      tasksCompleted: 42,
      totalTasks: 42
    };
    const result = detector.analyzeContext(context);
    expect(result.phase).toBe('review');
  });
});
```

**Dependencies**: T-014
**Estimated**: 3 hours

---

#### T-016: [P] Implement PhaseDetector context analysis
**AC**: AC-US1-01
**File**: `src/core/workflow/phase-detector.ts`
**Implementation**:
1. Read increment metadata
2. Check file existence (spec.md, plan.md, tasks.md)
3. Parse task completion status
4. Calculate weighted score (20% from ADR-0044)
5. Return phase based on state

**Dependencies**: T-015
**Estimated**: 3 hours

---

#### T-017: Write tests for confidence scoring
**AC**: AC-US1-02, AC-US1-03
**File**: `tests/unit/core/workflow/phase-detector.test.ts`
**Test Plan**:
- **Given**: Multiple signals (keywords 40%, commands 30%, context 20%, hints 10%)
- **When**: PhaseDetector calculates final confidence
- **Then**: Returns weighted average with 0.0-1.0 score and signal breakdown

**Test Cases**:
```typescript
describe('PhaseDetector - Confidence Scoring', () => {
  it('should calculate weighted average across signals', () => {
    const signals = {
      keywords: { phase: 'planning', score: 0.8 },
      command: { phase: 'planning', score: 0.9 },
      context: { phase: 'planning', score: 0.7 },
      hints: { phase: 'planning', score: 0.6 }
    };
    const result = detector.calculateConfidence(signals);
    // 0.8*0.4 + 0.9*0.3 + 0.7*0.2 + 0.6*0.1 = 0.77
    expect(result.confidence).toBeCloseTo(0.77, 2);
  });

  it('should apply contradiction penalty', () => {
    const signals = {
      keywords: { phase: 'planning', score: 0.8 },
      command: { phase: 'execution', score: 0.9 } // contradiction!
    };
    const result = detector.calculateConfidence(signals);
    expect(result.confidence).toBeLessThan(0.8);
    expect(result.warnings).toContain('Signal contradiction detected');
  });

  it('should provide signal breakdown for transparency', () => {
    const result = detector.detect(prompt, context);
    expect(result.signals).toHaveProperty('keywords');
    expect(result.signals).toHaveProperty('command');
    expect(result.signals).toHaveProperty('context');
    expect(result.reasoning).toBeDefined();
  });
});
```

**Dependencies**: T-016
**Estimated**: 4 hours

---

#### T-018: Implement confidence scoring algorithm
**AC**: AC-US1-02, AC-US1-03
**File**: `src/core/workflow/phase-detector.ts`
**Implementation**:
1. Implement calculateConfidence() method
2. Apply weights (40%, 30%, 20%, 10%)
3. Detect contradictions (different phases)
4. Apply penalty for contradictions
5. Generate signal breakdown for transparency
6. Create human-readable reasoning string

**Dependencies**: T-017
**Estimated**: 4 hours

---

#### T-019: Write integration tests for PhaseDetector
**AC**: AC-US1-01, AC-US1-02, AC-US1-03
**File**: `tests/integration/workflow/phase-detector.integration.test.ts`
**Test Plan**:
- **Given**: Real-world prompts and contexts
- **When**: PhaseDetector performs full detection
- **Then**: Achieves >= 95% accuracy on test suite

**Test Cases**:
```typescript
describe('PhaseDetector Integration - 100+ test cases', () => {
  const testCases = [
    { prompt: "Plan authentication system", expected: 'planning', minConfidence: 0.7 },
    { prompt: "Implement login API", expected: 'execution', minConfidence: 0.7 },
    { prompt: "Validate user flows", expected: 'review', minConfidence: 0.7 },
    // ... 97 more test cases
  ];

  it('should achieve >= 95% accuracy', () => {
    let correct = 0;
    testCases.forEach(tc => {
      const result = detector.detect(tc.prompt, {});
      if (result.phase === tc.expected && result.confidence >= tc.minConfidence) {
        correct++;
      }
    });
    const accuracy = correct / testCases.length;
    expect(accuracy).toBeGreaterThanOrEqual(0.95);
  });
});
```

**Dependencies**: T-018
**Estimated**: 6 hours

---

## Phase 2: Orchestration (Week 2)

### US-002: Auto-Call /specweave:plan When Needed (P1)

#### T-020: Write tests for WorkflowOrchestrator initialization
**AC**: AC-US2-01
**File**: `tests/unit/core/workflow/workflow-orchestrator.test.ts`
**Test Plan**:
- **Given**: Increment with only spec.md exists
- **When**: Orchestrator analyzes increment state
- **Then**: Detects "needs planning" phase

**Test Cases**:
```typescript
describe('WorkflowOrchestrator - State Detection', () => {
  it('should detect needs-planning when only spec.md exists', async () => {
    // Create increment with spec.md only
    const state = await orchestrator.detectState('0039');
    expect(state.phase).toBe('needs-planning');
    expect(state.nextAction).toBe('call-plan-command');
  });

  it('should detect ready-for-execution when plan and tasks exist', async () => {
    // Create increment with all files
    const state = await orchestrator.detectState('0039');
    expect(state.phase).toBe('ready-for-execution');
    expect(state.nextAction).toBe('call-do-command');
  });
});
```

**Dependencies**: T-019
**Estimated**: 3 hours

---

#### T-021: Implement WorkflowOrchestrator state detection
**AC**: AC-US2-01
**File**: `src/core/workflow/workflow-orchestrator.ts`
**Implementation**:
1. Create WorkflowOrchestrator class
2. Implement detectState() method
3. Check file existence (spec.md, plan.md, tasks.md)
4. Map to workflow phase (12 phases from ADR-0043)
5. Determine next action

**Dependencies**: T-020
**Estimated**: 4 hours

---

#### T-022: Write tests for CommandInvoker
**AC**: AC-US2-02
**File**: `tests/unit/core/workflow/command-invoker.test.ts`
**Test Plan**:
- **Given**: Command name and parameters
- **When**: CommandInvoker executes command programmatically
- **Then**: Command runs successfully and returns result

**Test Cases**:
```typescript
describe('CommandInvoker', () => {
  it('should invoke /specweave:plan command', async () => {
    const result = await invoker.invoke('plan', { incrementId: '0039' });
    expect(result.success).toBe(true);
    expect(result.filesCreated).toContain('plan.md');
    expect(result.filesCreated).toContain('tasks.md');
  });

  it('should handle command errors gracefully', async () => {
    const result = await invoker.invoke('plan', { incrementId: '9999' }); // non-existent
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should capture command output for logging', async () => {
    const result = await invoker.invoke('do', { incrementId: '0039' });
    expect(result.output).toBeDefined();
    expect(result.logs).toBeInstanceOf(Array);
  });
});
```

**Dependencies**: T-021
**Estimated**: 3 hours

---

#### T-023: [P] Implement CommandInvoker class
**AC**: AC-US2-02
**File**: `src/core/workflow/command-invoker.ts`
**Implementation**:
1. Create CommandInvoker class
2. Implement invoke() method
3. Load command from registry
4. Execute command with parameters
5. Capture output and logs
6. Handle errors and return result

**Dependencies**: T-022
**Estimated**: 4 hours

---

#### T-024: Write tests for auto-planning logic
**AC**: AC-US2-01, AC-US2-02, AC-US2-03
**File**: `tests/unit/core/workflow/workflow-orchestrator.test.ts`
**Test Plan**:
- **Given**: Orchestrator detects "needs-planning" phase
- **When**: User confirms or --auto-plan flag enabled
- **Then**: Automatically invokes /specweave:plan command

**Test Cases**:
```typescript
describe('WorkflowOrchestrator - Auto-Planning', () => {
  it('should prompt user when planning needed', async () => {
    const mockPrompt = jest.fn().mockResolvedValue('yes');
    const result = await orchestrator.next({ promptUser: mockPrompt });
    expect(mockPrompt).toHaveBeenCalledWith('Run /specweave:plan?');
    expect(result.actionTaken).toBe('invoked-plan-command');
  });

  it('should auto-plan without prompt when --auto-plan flag set', async () => {
    const result = await orchestrator.next({ autoPlan: true });
    expect(result.actionTaken).toBe('invoked-plan-command');
    expect(result.prompted).toBe(false);
  });

  it('should skip planning if user declines', async () => {
    const mockPrompt = jest.fn().mockResolvedValue('no');
    const result = await orchestrator.next({ promptUser: mockPrompt });
    expect(result.actionTaken).toBe('none');
    expect(result.message).toContain('Skipped planning');
  });
});
```

**Dependencies**: T-023
**Estimated**: 3 hours

---

#### T-025: Implement auto-planning orchestration
**AC**: AC-US2-01, AC-US2-02, AC-US2-03
**File**: `src/core/workflow/workflow-orchestrator.ts`
**Implementation**:
1. Add autoPlan option to next() method
2. Detect "needs-planning" phase
3. Prompt user (unless auto mode)
4. Invoke /specweave:plan via CommandInvoker
5. Wait for completion
6. Validate plan.md and tasks.md created
7. Log action taken

**Dependencies**: T-024
**Estimated**: 4 hours

---

### US-003: Auto-Call /specweave:do When Ready (P1)

#### T-026: Write tests for execution readiness detection
**AC**: AC-US3-01
**File**: `tests/unit/core/workflow/workflow-orchestrator.test.ts`
**Test Plan**:
- **Given**: Increment with spec.md, plan.md, tasks.md
- **When**: Orchestrator checks execution readiness
- **Then**: Detects "ready-for-execution" and suggests /specweave:do

**Test Cases**:
```typescript
describe('WorkflowOrchestrator - Execution Readiness', () => {
  it('should detect ready-for-execution when all files exist', async () => {
    // Create complete increment
    const state = await orchestrator.detectState('0039');
    expect(state.phase).toBe('ready-for-execution');
    expect(state.nextAction).toBe('call-do-command');
    expect(state.confidence).toBeGreaterThan(0.9);
  });

  it('should detect not-ready when tasks.md missing', async () => {
    // Create increment without tasks.md
    const state = await orchestrator.detectState('0039');
    expect(state.phase).toBe('needs-planning');
  });

  it('should check task dependencies before execution', async () => {
    // Create tasks with unmet dependencies
    const state = await orchestrator.detectState('0039');
    expect(state.warnings).toContain('Unmet dependencies');
  });
});
```

**Dependencies**: T-025
**Estimated**: 3 hours

---

#### T-027: [P] Implement execution readiness logic
**AC**: AC-US3-01
**File**: `src/core/workflow/workflow-orchestrator.ts`
**Implementation**:
1. Check all required files exist
2. Validate tasks.md format
3. Check for blocking dependencies
4. Return readiness result with confidence

**Dependencies**: T-026
**Estimated**: 3 hours

---

#### T-028: Write tests for auto-execution
**AC**: AC-US3-02, AC-US3-03
**File**: `tests/unit/core/workflow/workflow-orchestrator.test.ts`
**Test Plan**:
- **Given**: Ready-for-execution phase detected
- **When**: User confirms or --auto flag enabled
- **Then**: Automatically invokes /specweave:do

**Test Cases**:
```typescript
describe('WorkflowOrchestrator - Auto-Execution', () => {
  it('should prompt user before starting execution', async () => {
    const mockPrompt = jest.fn().mockResolvedValue('yes');
    const result = await orchestrator.next({ promptUser: mockPrompt });
    expect(mockPrompt).toHaveBeenCalledWith('Start execution with /specweave:do?');
    expect(result.actionTaken).toBe('invoked-do-command');
  });

  it('should execute without prompt in autonomous mode', async () => {
    const result = await orchestrator.next({ autonomous: true });
    expect(result.actionTaken).toBe('invoked-do-command');
    expect(result.prompted).toBe(false);
  });
});
```

**Dependencies**: T-027
**Estimated**: 2 hours

---

#### T-029: Implement auto-execution orchestration
**AC**: AC-US3-02, AC-US3-03
**File**: `src/core/workflow/workflow-orchestrator.ts`
**Implementation**:
1. Detect ready-for-execution phase
2. Prompt user (unless autonomous)
3. Invoke /specweave:do via CommandInvoker
4. Monitor task execution progress
5. Handle errors during execution
6. Log action taken

**Dependencies**: T-028
**Estimated**: 4 hours

---

### US-004: Suggest Validation When Appropriate (P1)

#### T-030: Write tests for validation suggestion logic
**AC**: AC-US4-01, AC-US4-02
**File**: `tests/unit/core/workflow/workflow-orchestrator.test.ts`
**Test Plan**:
- **Given**: All P1 tasks completed, tests passing
- **When**: Orchestrator checks if validation needed
- **Then**: Suggests /specweave:validate

**Test Cases**:
```typescript
describe('WorkflowOrchestrator - Validation Suggestion', () => {
  it('should suggest validation when P1 tasks done', async () => {
    // Mock all P1 tasks completed
    const state = await orchestrator.detectState('0039');
    expect(state.phase).toBe('needs-validation');
    expect(state.suggestion).toBe('run-validate-command');
  });

  it('should not suggest validation if tests failing', async () => {
    // Mock some tests failing
    const state = await orchestrator.detectState('0039');
    expect(state.phase).toBe('execution-errors');
    expect(state.suggestion).toBe('fix-failing-tests');
  });

  it('should suggest QA after validation passes', async () => {
    // Mock validation passed
    const state = await orchestrator.detectState('0039');
    expect(state.phase).toBe('needs-qa');
    expect(state.suggestion).toBe('run-qa-command');
  });
});
```

**Dependencies**: T-029
**Estimated**: 3 hours

---

#### T-031: [P] Implement validation suggestion logic
**AC**: AC-US4-01, AC-US4-02
**File**: `src/core/workflow/workflow-orchestrator.ts`
**Implementation**:
1. Parse tasks.md for P1 completion status
2. Check test results (via test framework)
3. Determine if validation appropriate
4. Generate suggestion with reasoning

**Dependencies**: T-030
**Estimated**: 3 hours

---

### US-005: Auto-Close Increment When Complete (P1)

#### T-032: Write tests for completion detection
**AC**: AC-US5-01, AC-US5-02
**File**: `tests/unit/core/workflow/workflow-orchestrator.test.ts`
**Test Plan**:
- **Given**: All P1 tasks done, validation passed, QA passed
- **When**: Orchestrator checks completion status
- **Then**: Detects "ready-for-closure" phase

**Test Cases**:
```typescript
describe('WorkflowOrchestrator - Completion Detection', () => {
  it('should detect ready-for-closure when all gates pass', async () => {
    // Mock: P1 tasks done, tests pass, validation pass, QA pass
    const state = await orchestrator.detectState('0039');
    expect(state.phase).toBe('ready-for-closure');
    expect(state.nextAction).toBe('call-done-command');
  });

  it('should check PM gates before closure', async () => {
    // Mock: P1 tasks done but docs not updated
    const state = await orchestrator.detectState('0039');
    expect(state.phase).toBe('needs-documentation');
    expect(state.warnings).toContain('Documentation gate failed');
  });
});
```

**Dependencies**: T-031
**Estimated**: 3 hours

---

#### T-033: Implement auto-closure logic
**AC**: AC-US5-02, AC-US5-03
**File**: `src/core/workflow/workflow-orchestrator.ts`
**Implementation**:
1. Validate all PM gates (tasks, tests, docs)
2. Prompt user for closure confirmation
3. Invoke /specweave:done via CommandInvoker
4. Update increment status to "completed"
5. Log closure action

**Dependencies**: T-032
**Estimated**: 4 hours

---

### US-006: Suggest Next Work from Backlog (P2)

#### T-034: Write tests for BacklogScanner
**AC**: AC-US6-01
**File**: `tests/unit/core/workflow/backlog-scanner.test.ts`
**Test Plan**:
- **Given**: Multiple increments in backlog status
- **When**: BacklogScanner scans backlog
- **Then**: Returns prioritized list with dependencies resolved

**Test Cases**:
```typescript
describe('BacklogScanner', () => {
  it('should scan backlog and return prioritized items', async () => {
    // Create 10 backlog increments with various priorities
    const items = await scanner.scan();
    expect(items).toHaveLength(10);
    expect(items[0].priority).toBe('P1'); // highest first
  });

  it('should filter blocked items by dependencies', async () => {
    // Create increment with unmet dependency
    const items = await scanner.scan({ includeBlocked: false });
    expect(items).not.toContainEqual(expect.objectContaining({ id: 'blocked-increment' }));
  });

  it('should estimate effort for backlog items', async () => {
    const items = await scanner.scan();
    expect(items[0].estimatedWeeks).toBeDefined();
  });
});
```

**Dependencies**: None (parallel with other tasks)
**Estimated**: 3 hours

---

#### T-035: [P] Implement BacklogScanner class
**AC**: AC-US6-01, AC-US6-02
**File**: `src/core/workflow/backlog-scanner.ts`
**Implementation**:
1. Create BacklogScanner class
2. Scan all increments with status = "backlog"
3. Parse priority from metadata
4. Check dependencies
5. Estimate effort from tasks.md
6. Sort by priority and effort

**Dependencies**: T-034
**Estimated**: 4 hours

---

#### T-036: Write tests for backlog suggestion
**AC**: AC-US6-02, AC-US6-03
**File**: `tests/unit/core/workflow/workflow-orchestrator.test.ts`
**Test Plan**:
- **Given**: Current increment closed, backlog has items
- **When**: Orchestrator suggests next work
- **Then**: Presents top 3 backlog items with reasoning

**Test Cases**:
```typescript
describe('WorkflowOrchestrator - Backlog Suggestions', () => {
  it('should suggest top 3 backlog items after closure', async () => {
    // Close current increment
    // Mock backlog with 10 items
    const suggestions = await orchestrator.suggestNextWork();
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0].reasoning).toContain('priority');
  });

  it('should include effort estimates in suggestions', async () => {
    const suggestions = await orchestrator.suggestNextWork();
    expect(suggestions[0].estimatedWeeks).toBeDefined();
  });
});
```

**Dependencies**: T-035
**Estimated**: 2 hours

---

#### T-037: Implement backlog suggestion logic
**AC**: AC-US6-02, AC-US6-03
**File**: `src/core/workflow/workflow-orchestrator.ts`
**Implementation**:
1. Detect "increment-closed" phase
2. Invoke BacklogScanner
3. Get top 3 prioritized items
4. Generate reasoning for each
5. Present to user with effort estimates

**Dependencies**: T-036
**Estimated**: 3 hours

---

## Phase 3: Intelligence (Week 3)

### US-008: Confidence Scoring and Transparency (P1)

#### T-038: Write tests for confidence threshold handling
**AC**: AC-US8-01, AC-US8-02
**File**: `tests/unit/core/workflow/workflow-orchestrator.test.ts`
**Test Plan**:
- **Given**: Phase detection returns low confidence (< 0.4)
- **When**: Orchestrator processes result
- **Then**: Prompts user for clarification

**Test Cases**:
```typescript
describe('WorkflowOrchestrator - Confidence Thresholds', () => {
  it('should auto-proceed when confidence > 0.7', async () => {
    // Mock high confidence detection
    const result = await orchestrator.next({ autoThreshold: 0.7 });
    expect(result.prompted).toBe(false);
    expect(result.actionTaken).toBeDefined();
  });

  it('should prompt user when confidence 0.4-0.7', async () => {
    // Mock medium confidence
    const mockPrompt = jest.fn().mockResolvedValue('yes');
    const result = await orchestrator.next({ promptUser: mockPrompt });
    expect(mockPrompt).toHaveBeenCalled();
  });

  it('should always prompt when confidence < 0.4', async () => {
    // Mock low confidence
    const mockPrompt = jest.fn().mockResolvedValue('yes');
    const result = await orchestrator.next({ promptUser: mockPrompt, autoThreshold: 0.7 });
    expect(mockPrompt).toHaveBeenCalled();
    expect(result.warnings).toContain('Low confidence detection');
  });
});
```

**Dependencies**: T-018 (PhaseDetector confidence scoring)
**Estimated**: 3 hours

---

#### T-039: Implement confidence threshold logic
**AC**: AC-US8-01, AC-US8-02
**File**: `src/core/workflow/workflow-orchestrator.ts`
**Implementation**:
1. Add confidence threshold configuration
2. Check detected phase confidence
3. Auto-proceed if confidence > threshold
4. Prompt if confidence in medium range
5. Always prompt if confidence < 0.4

**Dependencies**: T-038
**Estimated**: 3 hours

---

#### T-040: Write tests for signal breakdown display
**AC**: AC-US8-03
**File**: `tests/unit/core/workflow/workflow-orchestrator.test.ts`
**Test Plan**:
- **Given**: Phase detected with signal breakdown
- **When**: Orchestrator displays result to user
- **Then**: Shows all signals and reasoning transparently

**Test Cases**:
```typescript
describe('WorkflowOrchestrator - Transparency', () => {
  it('should display signal breakdown to user', async () => {
    const result = await orchestrator.next({ verbose: true });
    expect(result.display).toContain('Keywords: planning (0.8)');
    expect(result.display).toContain('Command: /specweave:increment (0.9)');
    expect(result.display).toContain('Context: status=planned (0.7)');
    expect(result.display).toContain('Overall confidence: 0.77');
  });

  it('should show reasoning for suggested action', async () => {
    const result = await orchestrator.next();
    expect(result.reasoning).toBeDefined();
    expect(result.reasoning).toContain('because');
  });
});
```

**Dependencies**: T-039
**Estimated**: 2 hours

---

#### T-041: [P] Implement signal breakdown display
**AC**: AC-US8-03
**File**: `src/core/workflow/workflow-orchestrator.ts`
**Implementation**:
1. Format signal breakdown for display
2. Create human-readable reasoning
3. Add verbose mode option
4. Generate confidence visualization

**Dependencies**: T-040
**Estimated**: 3 hours

---

## Phase 4: Autonomy (Week 4)

### US-010: Autonomous Workflow Mode (P3)

#### T-042: Write tests for StateManager (loop prevention)
**AC**: AC-US10-01
**File**: `tests/unit/core/workflow/state-manager.test.ts`
**Test Plan**:
- **Given**: Autonomous mode enabled
- **When**: Same phase detected 3+ times
- **Then**: StateManager detects infinite loop and aborts

**Test Cases**:
```typescript
describe('StateManager - Loop Prevention', () => {
  it('should detect infinite loop after 3 same-phase iterations', async () => {
    const stateManager = new StateManager();
    stateManager.recordIteration({ phase: 'needs-planning', action: 'call-plan-command' });
    stateManager.recordIteration({ phase: 'needs-planning', action: 'call-plan-command' });
    stateManager.recordIteration({ phase: 'needs-planning', action: 'call-plan-command' });

    expect(stateManager.isInfiniteLoop()).toBe(true);
    expect(stateManager.getLoopPhase()).toBe('needs-planning');
  });

  it('should abort autonomous execution on infinite loop', async () => {
    // Mock infinite loop scenario
    const result = await orchestrator.runAutonomous();
    expect(result.aborted).toBe(true);
    expect(result.reason).toContain('Infinite loop detected');
  });

  it('should enforce max iterations limit (50)', async () => {
    // Mock 50+ iterations
    const result = await orchestrator.runAutonomous({ maxIterations: 50 });
    expect(result.iterations).toBeLessThanOrEqual(50);
  });
});
```

**Dependencies**: None
**Estimated**: 4 hours

---

#### T-043: [P] Implement StateManager class
**AC**: AC-US10-01
**File**: `src/core/workflow/state-manager.ts`
**Implementation**:
1. Create StateManager class
2. Track iteration history
3. Detect same-phase loops (3+ repetitions)
4. Enforce max iterations (50 from ADR-0045)
5. Create checkpoints for recovery
6. Implement abort logic

**Dependencies**: T-042
**Estimated**: 4 hours

---

#### T-044: Write tests for AutonomousExecutor
**AC**: AC-US10-02, AC-US10-03
**File**: `tests/unit/core/workflow/autonomous-executor.test.ts`
**Test Plan**:
- **Given**: --autonomous flag enabled
- **When**: User runs /specweave:next --autonomous
- **Then**: Executes full workflow without prompts until completion or error

**Test Cases**:
```typescript
describe('AutonomousExecutor', () => {
  it('should run full workflow autonomously', async () => {
    // Create increment with only spec.md
    const result = await executor.run({ incrementId: '0039' });

    expect(result.phases).toContain('plan');
    expect(result.phases).toContain('execute');
    expect(result.phases).toContain('validate');
    expect(result.phases).toContain('close');
    expect(result.totalIterations).toBeGreaterThan(0);
    expect(result.completed).toBe(true);
  });

  it('should create checkpoints after each phase', async () => {
    const result = await executor.run({ incrementId: '0039' });
    expect(result.checkpoints).toHaveLength(4); // plan, execute, validate, close
  });

  it('should abort on critical errors', async () => {
    // Mock critical error during execution
    const result = await executor.run({ incrementId: '0039' });
    expect(result.aborted).toBe(true);
    expect(result.error).toBeDefined();
  });

  it('should allow user abort with Ctrl+C', async () => {
    // Mock user interrupt signal
    const result = await executor.run({ incrementId: '0039' });
    expect(result.aborted).toBe(true);
    expect(result.reason).toContain('User interrupted');
  });
});
```

**Dependencies**: T-043
**Estimated**: 5 hours

---

#### T-045: Implement AutonomousExecutor class
**AC**: AC-US10-02, AC-US10-03
**File**: `src/core/workflow/autonomous-executor.ts`
**Implementation**:
1. Create AutonomousExecutor class
2. Implement run() method with loop
3. Integrate StateManager for safety
4. Create checkpoints after each phase
5. Handle user interrupts (Ctrl+C)
6. Log all actions for auditability
7. Implement recovery from checkpoints

**Dependencies**: T-044
**Estimated**: 6 hours

---

#### T-046: Write tests for CostEstimator
**AC**: AC-US10-01
**File**: `tests/unit/core/workflow/cost-estimator.test.ts`
**Test Plan**:
- **Given**: Autonomous workflow with AI calls
- **When**: CostEstimator calculates total cost
- **Then**: Blocks execution if estimated cost > $20

**Test Cases**:
```typescript
describe('CostEstimator', () => {
  it('should estimate AI call costs for workflow', async () => {
    const workflow = {
      phases: ['plan', 'execute', 'validate', 'qa'],
      estimatedAICalls: 50
    };
    const estimate = await costEstimator.estimate(workflow);
    expect(estimate.totalCost).toBeDefined();
    expect(estimate.breakdown).toHaveProperty('plan');
  });

  it('should block if estimated cost > $20', async () => {
    // Mock expensive workflow (> $20)
    const result = await executor.run({ incrementId: '0039' });
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('Cost limit exceeded');
    expect(result.estimatedCost).toBeGreaterThan(20);
  });

  it('should allow override with --max-cost flag', async () => {
    const result = await executor.run({ maxCost: 50 });
    expect(result.blocked).toBe(false);
  });
});
```

**Dependencies**: None (parallel)
**Estimated**: 3 hours

---

#### T-047: [P] Implement CostEstimator class
**AC**: AC-US10-01
**File**: `src/core/workflow/cost-estimator.ts`
**Implementation**:
1. Create CostEstimator class
2. Define AI call estimates per command
3. Calculate total estimated cost
4. Compare to threshold ($20 from ADR-0045)
5. Return risk level (low/medium/high)

**Dependencies**: T-046
**Estimated**: 3 hours

---

#### T-048: Write integration tests for autonomous mode
**AC**: AC-US10-02, AC-US10-03
**File**: `tests/integration/workflow/autonomous-mode.integration.test.ts`
**Test Plan**:
- **Given**: Real increment with spec.md
- **When**: Run /specweave:next --autonomous
- **Then**: Complete full workflow end-to-end

**Test Cases**:
```typescript
describe('Autonomous Mode Integration', () => {
  it('should complete full workflow from spec to closure', async () => {
    // Create real test increment
    const result = await runCommand('/specweave:next --autonomous 0039');

    expect(result.filesCreated).toContain('plan.md');
    expect(result.filesCreated).toContain('tasks.md');
    expect(result.tasksCompleted).toBeGreaterThan(0);
    expect(result.incrementStatus).toBe('completed');
  }, 600000); // 10 min timeout

  it('should recover from checkpoint on error', async () => {
    // Mock error during execution
    // Resume from checkpoint
    const result = await runCommand('/specweave:next --autonomous --resume-from=checkpoint-2');
    expect(result.resumed).toBe(true);
    expect(result.checkpointUsed).toBe('checkpoint-2');
  });
});
```

**Dependencies**: T-045, T-047
**Estimated**: 6 hours

---

#### T-049: Integrate autonomous mode into NextCommand
**AC**: AC-US10-02
**File**: `plugins/specweave/commands/specweave-next.md`
**Implementation**:
1. Update NextCommand to support --autonomous flag
2. Invoke AutonomousExecutor when flag present
3. Display progress updates
4. Handle errors and checkpoints
5. Log autonomous execution

**Dependencies**: T-048
**Estimated**: 4 hours

---

## Phase 5: Polish (Week 5)

### US-009: Multi-Project Support (P2)

#### T-050: Write tests for multi-project increment selection
**AC**: AC-US9-01
**File**: `tests/unit/core/workflow/workflow-orchestrator.test.ts`
**Test Plan**:
- **Given**: Multiple projects with active increments
- **When**: /specweave:next with no project specified
- **Then**: Prompts user to select project

**Test Cases**:
```typescript
describe('WorkflowOrchestrator - Multi-Project', () => {
  it('should detect multiple projects', async () => {
    // Create projects: web-app, mobile, backend
    const projects = await orchestrator.detectProjects();
    expect(projects).toHaveLength(3);
  });

  it('should prompt for project selection', async () => {
    const mockPrompt = jest.fn().mockResolvedValue('web-app');
    const result = await orchestrator.next({ promptUser: mockPrompt });
    expect(mockPrompt).toHaveBeenCalledWith(expect.objectContaining({
      choices: expect.arrayContaining(['web-app', 'mobile', 'backend'])
    }));
  });

  it('should work on selected project only', async () => {
    const result = await orchestrator.next({ project: 'mobile' });
    expect(result.project).toBe('mobile');
    expect(result.incrementId).toMatch(/mobile/);
  });
});
```

**Dependencies**: None
**Estimated**: 3 hours

---

#### T-051: [P] Implement multi-project support
**AC**: AC-US9-01, AC-US9-02
**File**: `src/core/workflow/workflow-orchestrator.ts`
**Implementation**:
1. Detect multi-project mode from config
2. Scan all projects for active increments
3. Prompt user to select project
4. Filter workflow to selected project
5. Handle cross-project dependencies

**Dependencies**: T-050
**Estimated**: 4 hours

---

### Error Handling and UX Polish

#### T-052: Write tests for error scenarios
**AC**: All NFRs
**File**: `tests/unit/core/workflow/workflow-orchestrator.error.test.ts`
**Test Plan**:
- **Given**: Various error scenarios
- **When**: Orchestrator handles errors
- **Then**: Clear error messages and recovery paths

**Test Cases**:
```typescript
describe('WorkflowOrchestrator - Error Handling', () => {
  it('should handle missing spec.md gracefully', async () => {
    const result = await orchestrator.next({ incrementId: '9999' });
    expect(result.error).toContain('spec.md not found');
    expect(result.suggestion).toContain('Run /specweave:increment first');
  });

  it('should handle command failures gracefully', async () => {
    // Mock /specweave:plan failure
    const result = await orchestrator.next();
    expect(result.error).toBeDefined();
    expect(result.retry).toBe(true);
  });

  it('should provide clear next steps on errors', async () => {
    const result = await orchestrator.next();
    if (result.error) {
      expect(result.nextSteps).toBeInstanceOf(Array);
      expect(result.nextSteps.length).toBeGreaterThan(0);
    }
  });
});
```

**Dependencies**: All previous orchestrator tasks
**Estimated**: 4 hours

---

#### T-053: Implement comprehensive error handling
**AC**: NFR-003, NFR-004
**File**: `src/core/workflow/workflow-orchestrator.ts`
**Implementation**:
1. Add try-catch blocks for all commands
2. Create clear error messages
3. Suggest recovery paths
4. Log errors for debugging
5. Support retry logic

**Dependencies**: T-052
**Estimated**: 4 hours

---

#### T-054: Write tests for UX improvements
**AC**: NFR-007
**File**: `tests/unit/core/workflow/workflow-orchestrator.ux.test.ts`
**Test Plan**:
- **Given**: User runs /specweave:next
- **When**: Orchestrator executes
- **Then**: Clear, friendly output with progress indicators

**Test Cases**:
```typescript
describe('WorkflowOrchestrator - UX', () => {
  it('should display clear current phase', async () => {
    const output = await orchestrator.next({ display: true });
    expect(output).toContain('Current phase:');
    expect(output).toContain('Confidence:');
  });

  it('should show progress during long operations', async () => {
    const output = await orchestrator.next({ verbose: true });
    expect(output).toContain('Step 1/5');
  });

  it('should use colors and emojis for readability', async () => {
    const output = await orchestrator.next({ colorize: true });
    expect(output).toMatch(/\u001b\[\d+m/); // ANSI color codes
    expect(output).toMatch(/[✅❌⚠️🚀]/); // Emojis
  });
});
```

**Dependencies**: T-053
**Estimated**: 3 hours

---

#### T-055: Implement UX polish
**AC**: NFR-007
**File**: `src/core/workflow/workflow-orchestrator.ts`
**Implementation**:
1. Add colorized output (chalk)
2. Add emojis for visual clarity
3. Show progress indicators
4. Clear, concise messages
5. Helpful suggestions

**Dependencies**: T-054
**Estimated**: 3 hours

---

## Testing and Documentation (Ongoing)

#### T-056: [P] Write E2E tests for complete workflows
**AC**: All user stories
**File**: `tests/e2e/workflow/ultra-smart-next.e2e.test.ts`
**Test Plan**:
- **Given**: Real SpecWeave project
- **When**: User runs /specweave:next multiple times
- **Then**: Complete workflow executes successfully

**Test Cases**:
```typescript
describe('Ultra-Smart Next E2E', () => {
  it('should execute full workflow: spec → plan → do → validate → done', async () => {
    // Create real increment
    // Run /specweave:next (detects needs-planning, calls plan)
    // Run /specweave:next (detects ready, calls do)
    // Run /specweave:next (detects complete, suggests validate)
    // Run /specweave:next (detects validated, calls done)
    // Verify increment status = completed
  }, 900000); // 15 min timeout

  it('should handle autonomous mode end-to-end', async () => {
    await runCommand('/specweave:next --autonomous 0039');
    // Verify full workflow completed
  }, 900000);
});
```

**Dependencies**: T-049
**Estimated**: 8 hours

---

#### T-057: [P] Write performance tests
**AC**: NFR-001, NFR-002
**File**: `tests/performance/workflow/phase-detection.perf.test.ts`
**Test Plan**:
- **Given**: Large prompts and contexts
- **When**: PhaseDetector analyzes
- **Then**: Response time < 500ms

**Test Cases**:
```typescript
describe('Phase Detection Performance', () => {
  it('should detect phase in < 500ms', async () => {
    const start = Date.now();
    await phaseDetector.detect(longPrompt, complexContext);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('should handle 1000 backlog items in < 2s', async () => {
    // Create 1000 backlog items
    const start = Date.now();
    await backlogScanner.scan();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
```

**Dependencies**: T-056
**Estimated**: 4 hours

---

#### T-058: Update internal architecture docs
**AC**: Documentation requirement
**File**: `.specweave/docs/internal/architecture/system-design.md`
**Implementation**:
1. Document WorkflowOrchestrator architecture
2. Update system design with new components
3. Add sequence diagrams
4. Document configuration options

**Dependencies**: T-055
**Estimated**: 4 hours

---

#### T-059: Update public user guides
**AC**: Documentation requirement
**File**: `.specweave/docs/public/guides/ultra-smart-next-guide.md`
**Implementation**:
1. Create user guide for /specweave:next
2. Document all flags and options
3. Add examples and use cases
4. Document autonomous mode
5. Add troubleshooting section

**Dependencies**: T-058
**Estimated**: 6 hours

---

#### T-060: Create command documentation
**AC**: Documentation requirement
**File**: `plugins/specweave/commands/specweave-next.md`
**Implementation**:
1. Update command markdown
2. Document --autonomous flag
3. Document --auto-plan, --max-cost flags
4. Add usage examples
5. Link to user guide

**Dependencies**: T-059
**Estimated**: 2 hours

---

#### T-061: Update CLAUDE.md and README.md
**AC**: Documentation requirement
**Files**: `CLAUDE.md`, `README.md`
**Implementation**:
1. Add /specweave:next to quick reference
2. Document autonomous mode
3. Update workflow diagrams
4. Add benefits and use cases

**Dependencies**: T-060
**Estimated**: 3 hours

---

## Phase 6: Spec Synchronization (NEW - US-011)

### US-011: Auto-Sync Plan and Tasks on Spec Changes (P1)

#### T-062: Write tests for SpecSyncManager.detectSpecChange()
**AC**: AC-US11-01
**File**: `tests/unit/spec-sync-manager.test.ts`
**Test Plan**:
- **Given**: Increment with spec.md and plan.md
- **When**: spec.md is modified after plan.md
- **Then**: detectSpecChange() returns specChanged=true with correct timestamps

**Test Cases**:
```typescript
describe('SpecSyncManager.detectSpecChange', () => {
  it('should detect when spec.md is newer than plan.md', async () => {
    // Create increment with plan.md older than spec.md
    // Call detectSpecChange()
    // Assert specChanged === true
  });

  it('should not detect change when spec.md is older', async () => {
    // Create increment with plan.md newer than spec.md
    // Call detectSpecChange()
    // Assert specChanged === false
  });

  it('should handle missing plan.md (planning phase)', async () => {
    // Create increment with only spec.md
    // Call detectSpecChange()
    // Assert specChanged === false, reason: "planning phase"
  });

  it('should handle missing spec.md', async () => {
    // Create increment without spec.md
    // Call detectSpecChange()
    // Assert specChanged === false, reason: "spec.md does not exist"
  });
});
```

**Dependencies**: None
**Estimated**: 3 hours

---

#### T-063: Implement SpecSyncManager.detectSpecChange()
**AC**: AC-US11-01
**File**: `src/core/increment/spec-sync-manager.ts`
**Implementation**: ✅ Already implemented
1. Compare spec.md mtime vs plan.md mtime
2. Handle edge cases (missing files)
3. Return SpecChangeDetectionResult with timestamps and reason

**Dependencies**: T-062
**Estimated**: 2 hours (COMPLETED)

---

#### T-064: Write tests for hook integration
**AC**: AC-US11-07
**File**: `tests/integration/hooks/spec-sync-hook.test.ts`
**Test Plan**:
- **Given**: Active increment with spec.md modified after plan.md
- **When**: User runs any command
- **Then**: Hook shows sync warning before command executes

**Test Cases**:
```typescript
describe('user-prompt-submit hook - spec sync', () => {
  it('should show warning when spec changed', async () => {
    // Create increment, modify spec.md
    // Trigger hook with mock prompt
    // Assert decision: "approve", systemMessage contains sync warning
  });

  it('should not show warning when spec unchanged', async () => {
    // Create increment with spec.md older than plan.md
    // Trigger hook
    // Assert no sync warning in response
  });

  it('should handle --skip-sync flag', async () => {
    // Modify spec.md
    // Run command with --skip-sync
    // Assert sync skipped
  });
});
```

**Dependencies**: T-063
**Estimated**: 4 hours

---

#### T-065: Integrate SpecSyncManager into user-prompt-submit hook
**AC**: AC-US11-07
**File**: `plugins/specweave/hooks/user-prompt-submit.sh`
**Implementation**: ✅ Already implemented
1. Detect active increment
2. Call SpecSyncManager.detectSpecChange()
3. If specChanged, show formatted warning
4. Approve with systemMessage (don't block)

**Dependencies**: T-064
**Estimated**: 2 hours (COMPLETED)

---

#### T-066: Write tests for plan.md regeneration
**AC**: AC-US11-02
**File**: `tests/unit/spec-sync-manager.test.ts`
**Test Plan**:
- **Given**: spec.md modified with new user story
- **When**: syncIncrement() is called
- **Then**: Architect Agent regenerates plan.md with new content

**Test Cases**:
```typescript
describe('SpecSyncManager.syncIncrement - plan regeneration', () => {
  it('should regenerate plan.md when spec changes', async () => {
    // Mock Architect Agent
    // Modify spec.md
    // Call syncIncrement()
    // Assert Architect Agent invoked with updated spec
    // Assert plan.md regenerated
  });

  it('should preserve manual plan.md edits where possible', async () => {
    // Add manual note to plan.md
    // Modify spec.md
    // Call syncIncrement()
    // Assert manual note preserved if possible
  });

  it('should show diff of plan.md changes', async () => {
    // Modify spec.md
    // Call syncIncrement()
    // Assert diff shown (old vs new plan.md)
  });
});
```

**Dependencies**: T-065
**Estimated**: 4 hours

---

#### T-067: Implement plan.md regeneration in SpecSyncManager
**AC**: AC-US11-02
**File**: `src/core/increment/spec-sync-manager.ts`
**Implementation**:
1. Read updated spec.md content
2. Invoke Architect Agent with spec content
3. Generate new plan.md
4. Show diff to user (old vs new)
5. Update plan.md file
6. Log regeneration event to metadata

**Dependencies**: T-066
**Estimated**: 5 hours

---

#### T-068: Write tests for tasks.md regeneration
**AC**: AC-US11-03
**File**: `tests/unit/spec-sync-manager.test.ts`
**Test Plan**:
- **Given**: plan.md regenerated with new tasks
- **When**: syncIncrement() regenerates tasks.md
- **Then**: test-aware-planner creates new tasks.md based on updated plan

**Test Cases**:
```typescript
describe('SpecSyncManager.syncIncrement - tasks regeneration', () => {
  it('should regenerate tasks.md after plan.md', async () => {
    // Mock test-aware-planner
    // Regenerate plan.md
    // Call syncIncrement()
    // Assert test-aware-planner invoked with new plan.md
    // Assert tasks.md regenerated
  });

  it('should show diff of tasks.md changes', async () => {
    // Regenerate tasks.md
    // Assert diff shown (old vs new)
  });
});
```

**Dependencies**: T-067
**Estimated**: 4 hours

---

#### T-069: Implement tasks.md regeneration in SpecSyncManager
**AC**: AC-US11-03
**File**: `src/core/increment/spec-sync-manager.ts`
**Implementation**:
1. Read updated plan.md content
2. Invoke test-aware-planner with plan content
3. Generate new tasks.md
4. Show diff to user (old vs new)
5. Update tasks.md file
6. Log regeneration event to metadata

**Dependencies**: T-068
**Estimated**: 5 hours

---

#### T-070: Write tests for task completion status preservation
**AC**: AC-US11-04
**File**: `tests/unit/spec-sync-manager.test.ts`
**Test Plan**:
- **Given**: Existing tasks.md with some tasks completed [x]
- **When**: tasks.md is regenerated
- **Then**: Completed tasks remain [x] if task ID matches

**Test Cases**:
```typescript
describe('SpecSyncManager - status preservation', () => {
  it('should preserve completed tasks by ID', async () => {
    // Create tasks.md with [x] T-001, [ ] T-002
    // Regenerate with same task IDs
    // Assert T-001 still [x], T-002 still [ ]
  });

  it('should handle task ID renumbering', async () => {
    // Create tasks.md with T-001, T-002, T-003
    // Regenerate with T-001, T-003 removed
    // Assert T-002 mapped correctly
  });

  it('should handle new tasks added', async () => {
    // Create tasks.md with T-001, T-002
    // Regenerate with T-001, T-002, T-003 (new)
    // Assert T-001, T-002 status preserved
    // Assert T-003 is [ ] (new)
  });

  it('should handle task reordering', async () => {
    // Create tasks.md with T-001 [x], T-002 [ ]
    // Regenerate with order: T-002, T-001
    // Assert T-001 still [x], T-002 still [ ]
  });
});
```

**Dependencies**: T-069
**Estimated**: 5 hours

---

#### T-071: Implement task status preservation logic
**AC**: AC-US11-04
**File**: `src/core/increment/spec-sync-manager.ts`
**Implementation**:
1. Parse old tasks.md (extract task IDs and completion status)
2. Parse new tasks.md (extract task IDs)
3. Create mapping: old task ID → new task ID
4. Apply completion status from old to new
5. Write updated tasks.md

**Helper Methods**:
```typescript
private parseTaskCompletion(tasksContent: string): Map<string, boolean>;
private applyCompletionStatus(
  newTasks: string,
  oldCompletion: Map<string, boolean>
): string;
```

**Dependencies**: T-070
**Estimated**: 6 hours

---

#### T-072: Write tests for sync event logging
**AC**: AC-US11-10
**File**: `tests/unit/spec-sync-manager.test.ts`
**Test Plan**:
- **Given**: Spec sync is performed
- **When**: Sync completes
- **Then**: Event logged to metadata.json with timestamps

**Test Cases**:
```typescript
describe('SpecSyncManager - event logging', () => {
  it('should log sync event to metadata.json', async () => {
    // Perform sync
    // Read metadata.json
    // Assert syncEvents array contains new event
    // Assert event has: timestamp, type, specModTime, planModTime, tasksModTime
  });

  it('should keep only last 10 sync events', async () => {
    // Add 12 sync events
    // Assert metadata.syncEvents has only 10 events (oldest 2 removed)
  });

  it('should handle missing metadata.json gracefully', async () => {
    // Remove metadata.json
    // Perform sync
    // Assert no error thrown
  });
});
```

**Dependencies**: T-071
**Estimated**: 3 hours

---

#### T-073: Implement sync event logging
**AC**: AC-US11-10
**File**: `src/core/increment/spec-sync-manager.ts`
**Implementation**: ✅ Already implemented
1. Read metadata.json
2. Add sync event to syncEvents array
3. Keep only last 10 events
4. Write updated metadata.json

**Dependencies**: T-072
**Estimated**: 2 hours (COMPLETED)

---

#### T-074: Write tests for --skip-sync flag
**AC**: AC-US11-06
**File**: `tests/integration/spec-sync-flag.test.ts`
**Test Plan**:
- **Given**: spec.md modified after plan.md
- **When**: User runs command with --skip-sync flag
- **Then**: Sync is skipped, no regeneration occurs

**Test Cases**:
```typescript
describe('--skip-sync flag', () => {
  it('should skip sync when flag provided', async () => {
    // Modify spec.md
    // Run command with --skip-sync
    // Assert sync not performed
    // Assert plan.md unchanged
  });

  it('should show message about skipped sync', async () => {
    // Run with --skip-sync
    // Assert message: "Sync skipped by user"
  });
});
```

**Dependencies**: T-073
**Estimated**: 3 hours

---

#### T-075: Implement --skip-sync flag handling
**AC**: AC-US11-06
**File**: `src/core/increment/spec-sync-manager.ts`
**Implementation**: ✅ Already implemented in syncIncrement()
1. Accept skipSync parameter
2. Return early if skipSync === true
3. Log skip reason

**Dependencies**: T-074
**Estimated**: 1 hour (COMPLETED)

---

#### T-076: Create AGENTS.md section for non-Claude tools
**AC**: AC-US11-08
**File**: `AGENTS.md` (root)
**Implementation**:
Create comprehensive section explaining manual sync for Cursor/generic tools:

1. **Detection Section**:
   - How to compare file modification times
   - Example bash/shell commands
   - VS Code file watcher patterns

2. **Regeneration Section**:
   - Steps to regenerate plan.md (call Architect agent)
   - Steps to regenerate tasks.md (call test-aware-planner)
   - Example prompts for each step

3. **Status Preservation Section**:
   - How to extract task completion status
   - How to merge old status into new tasks
   - Example diff/merge commands

4. **Example Workflow**:
```markdown
## Spec Synchronization (Manual - for Cursor/Generic Tools)

### Detect Spec Changes

```bash
# Compare modification times
SPEC_TIME=$(stat -f %m .specweave/increments/0039/spec.md)
PLAN_TIME=$(stat -f %m .specweave/increments/0039/plan.md)

if [ $SPEC_TIME -gt $PLAN_TIME ]; then
  echo "⚠️  spec.md changed - sync needed"
fi
```

### Regenerate plan.md

1. Read updated spec.md
2. Ask your AI assistant: "Based on this updated spec.md, regenerate plan.md following the existing format"
3. Review and save new plan.md

### Regenerate tasks.md

1. Read updated plan.md
2. Ask your AI assistant: "Based on this updated plan.md, regenerate tasks.md with embedded tests"
3. **IMPORTANT**: Preserve task completion status
   - Before regenerating, note which tasks are [x] completed
   - After regenerating, restore [x] status for matching task IDs

### Example

```bash
# 1. Detect change
./scripts/detect-spec-change.sh 0039

# 2. Backup current files
cp plan.md plan.md.backup
cp tasks.md tasks.md.backup

# 3. Ask AI to regenerate (copy spec.md to prompt)

# 4. Restore completion status
./scripts/restore-task-status.sh tasks.md.backup tasks.md
```
```

**Dependencies**: T-075
**Estimated**: 4 hours

---

#### T-077: Write E2E test for full sync flow
**AC**: AC-US11-01, AC-US11-02, AC-US11-03, AC-US11-04
**File**: `tests/e2e/spec-sync-flow.spec.ts`
**Test Plan**:
- **Given**: Complete increment with spec.md, plan.md, tasks.md
- **When**: User modifies spec.md and runs /specweave:do
- **Then**: Hook warns, plan.md regenerated, tasks.md regenerated, status preserved

**Test Cases**:
```typescript
describe('Spec Sync E2E Flow', () => {
  it('should perform full sync when spec changes', async () => {
    // Create increment 0999-test-sync
    // Complete some tasks ([x])
    // Modify spec.md (add new user story)
    // Run /specweave:do
    // Assert hook showed warning
    // Assert plan.md regenerated with new content
    // Assert tasks.md regenerated
    // Assert completed tasks still [x]
  });

  it('should handle --skip-sync flag in E2E', async () => {
    // Modify spec.md
    // Run /specweave:do --skip-sync
    // Assert sync skipped
    // Assert plan.md unchanged
  });
});
```

**Dependencies**: T-076
**Estimated**: 6 hours

---

#### T-078: Document spec sync feature
**AC**: Documentation requirement
**File**: `docs/guides/spec-sync.md`
**Implementation**:
Create user guide explaining:
1. Why spec sync matters (spec-driven development)
2. How it works (automatic detection, regeneration)
3. When it triggers (spec.md mtime > plan.md mtime)
4. How to skip (--skip-sync flag)
5. Task status preservation
6. Edge cases and troubleshooting

**Dependencies**: T-077
**Estimated**: 3 hours

---

## Phase 7: AC Status Automation (NEW - US-012)

### US-012: Auto-Update AC Status from Task Completion (P1)

#### T-079: Write tests for ACStatusManager.parseTasksForACStatus()
**AC**: AC-US12-01
**File**: `tests/unit/ac-status-manager.test.ts`
**Test Plan**:
- **Given**: tasks.md with **AC**: tags and completion status
- **When**: parseTasksForACStatus() is called
- **Then**: Returns Map<AC-ID, ACCompletionStatus>

**Test Cases**:
```typescript
describe('ACStatusManager.parseTasksForACStatus', () => {
  it('should extract AC tags from completed tasks', () => {
    const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
- [x] Completed
    `;
    const result = manager.parseTasksForACStatus(tasksContent);
    expect(result.get('AC-US11-01').completedTasks).toBe(1);
  });

  it('should extract AC tags from incomplete tasks', () => {
    const tasksContent = `
#### T-002: Task 2
**AC**: AC-US11-02
- [ ] Not completed
    `;
    const result = manager.parseTasksForACStatus(tasksContent);
    expect(result.get('AC-US11-02').completedTasks).toBe(0);
  });

  it('should handle multiple tasks for same AC', () => {
    const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
- [x] Completed

#### T-002: Task 2
**AC**: AC-US11-01
- [ ] Not completed
    `;
    const result = manager.parseTasksForACStatus(tasksContent);
    expect(result.get('AC-US11-01').totalTasks).toBe(2);
    expect(result.get('AC-US11-01').completedTasks).toBe(1);
    expect(result.get('AC-US11-01').percentage).toBe(50);
  });

  it('should handle task with multiple ACs', () => {
    const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01, AC-US11-02
- [x] Completed
    `;
    const result = manager.parseTasksForACStatus(tasksContent);
    expect(result.get('AC-US11-01').completedTasks).toBe(1);
    expect(result.get('AC-US11-02').completedTasks).toBe(1);
  });
});
```

**Dependencies**: None
**Estimated**: 4 hours

---

#### T-080: Implement ACStatusManager.parseTasksForACStatus()
**AC**: AC-US12-01
**File**: `src/core/increment/ac-status-manager.ts`
**Implementation**:
1. Read tasks.md content
2. Regex match task headers: `#### T-###:`
3. Extract **AC**: tag values
4. Check completion status via checkbox `[x]` or `[ ]`
5. Build Map<AC-ID, ACCompletionStatus>

**Dependencies**: T-079
**Estimated**: 5 hours

---

#### T-081: Write tests for ACStatusManager.parseSpecForACs()
**AC**: AC-US12-02
**File**: `tests/unit/ac-status-manager.test.ts`
**Test Plan**:
- **Given**: spec.md with AC checkboxes
- **When**: parseSpecForACs() is called
- **Then**: Returns Map<AC-ID, ACDefinition>

**Test Cases**:
```typescript
describe('ACStatusManager.parseSpecForACs', () => {
  it('should extract AC checkboxes from spec.md', () => {
    const specContent = `
- [ ] AC-US11-01: Detect spec changes
- [x] AC-US11-02: Regenerate plan.md
    `;
    const result = manager.parseSpecForACs(specContent);
    expect(result.get('AC-US11-01').checked).toBe(false);
    expect(result.get('AC-US11-02').checked).toBe(true);
  });

  it('should extract AC line numbers for updates', () => {
    const specContent = `Line 1
Line 2
- [ ] AC-US11-01: Detect spec changes
Line 4`;
    const result = manager.parseSpecForACs(specContent);
    expect(result.get('AC-US11-01').lineNumber).toBe(3);
  });
});
```

**Dependencies**: T-080
**Estimated**: 3 hours

---

#### T-082: Implement ACStatusManager.parseSpecForACs()
**AC**: AC-US12-02
**File**: `src/core/increment/ac-status-manager.ts`
**Implementation**:
1. Read spec.md content
2. Regex match AC pattern: `- \[ \] AC-[A-Z0-9-]+:`
3. Extract AC-ID, description, checkbox status
4. Track line number for updates
5. Build Map<AC-ID, ACDefinition>

**Dependencies**: T-081
**Estimated**: 4 hours

---

#### T-083: Write tests for ACStatusManager.syncACStatus()
**AC**: AC-US12-03, AC-US12-04
**File**: `tests/unit/ac-status-manager.test.ts`
**Test Plan**:
- **Given**: tasks.md with completed tasks and spec.md with ACs
- **When**: syncACStatus() is called
- **Then**: spec.md ACs updated to match task completion

**Test Cases**:
```typescript
describe('ACStatusManager.syncACStatus', () => {
  it('should update AC from [ ] to [x] when all tasks complete', async () => {
    // All tasks for AC-US11-01 complete
    const result = await manager.syncACStatus('0039');
    expect(result.updated).toContain('AC-US11-01');
    // Verify spec.md file changed
    const specContent = fs.readFileSync('spec.md', 'utf-8');
    expect(specContent).toContain('[x] AC-US11-01');
  });

  it('should keep AC as [ ] when tasks incomplete', async () => {
    // Only 1 of 3 tasks complete for AC-US11-02
    const result = await manager.syncACStatus('0039');
    expect(result.updated).not.toContain('AC-US11-02');
    // Verify spec.md unchanged
    const specContent = fs.readFileSync('spec.md', 'utf-8');
    expect(specContent).toContain('[ ] AC-US11-02');
  });

  it('should handle AC with no tasks (manual verification)', async () => {
    // AC-US11-99 has no tasks in tasks.md
    const result = await manager.syncACStatus('0039');
    expect(result.warnings).toContain('AC-US11-99 has no tasks');
  });

  it('should detect conflict (AC [x] but tasks incomplete)', async () => {
    // AC-US11-03 manually checked but tasks incomplete
    const result = await manager.syncACStatus('0039');
    expect(result.conflicts).toContain('AC-US11-03: [x] but only 50% tasks complete');
  });
});
```

**Dependencies**: T-082
**Estimated**: 5 hours

---

#### T-084: Implement ACStatusManager.syncACStatus()
**AC**: AC-US12-03, AC-US12-04
**File**: `src/core/increment/ac-status-manager.ts`
**Implementation**:
1. Call parseTasksForACStatus(tasks.md)
2. Call parseSpecForACs(spec.md)
3. For each AC:
   - If isComplete=true and spec has [ ]: Update to [x]
   - If isComplete=false and spec has [x]: Warn conflict
   - If no tasks: Warn manual verification needed
4. Generate diff
5. Update spec.md file
6. Log changes to metadata.json

**Dependencies**: T-083
**Estimated**: 6 hours

---

#### T-085: Write tests for post-task-completion hook integration
**AC**: AC-US12-05
**File**: `tests/integration/ac-status-hook.test.ts`
**Test Plan**:
- **Given**: Task completes (T-062)
- **When**: post-task-completion hook fires
- **Then**: AC status synced automatically

**Test Cases**:
```typescript
describe('post-task-completion hook - AC sync', () => {
  it('should sync AC status when task completes', async () => {
    // Complete task T-062 (AC-US11-01)
    await completeTask('T-062');
    // Hook should fire
    // Verify spec.md updated
    const specContent = fs.readFileSync('spec.md', 'utf-8');
    expect(specContent).toContain('[x] AC-US11-01');
  });

  it('should skip sync with --skip-ac-sync flag', async () => {
    await completeTask('T-063', { skipACSync: true });
    // Verify spec.md not updated
    const specContent = fs.readFileSync('spec.md', 'utf-8');
    expect(specContent).toContain('[ ] AC-US11-02');
  });
});
```

**Dependencies**: T-084
**Estimated**: 4 hours

---

#### T-086: Integrate ACStatusManager into post-task-completion hook
**AC**: AC-US12-05
**File**: `plugins/specweave/hooks/post-task-completion.sh`
**Implementation**:
1. Add AC sync logic after task completion
2. Call ACStatusManager.syncACStatus()
3. Show diff if ACs updated
4. Respect --skip-ac-sync flag
5. Log AC updates

**Dependencies**: T-085
**Estimated**: 3 hours

---

#### T-087: Create /specweave:sync-acs command
**AC**: AC-US12-06
**File**: `plugins/specweave/commands/specweave-sync-acs.md`
**Implementation**:
1. Create command registration
2. Accept optional increment ID
3. Call ACStatusManager.syncACStatus()
4. Display AC completion summary
5. Show which ACs were updated
6. Ask user confirmation before updating spec.md

**Dependencies**: T-086
**Estimated**: 4 hours

---

#### T-088: Write tests for validateACMapping()
**AC**: AC-US12-07
**File**: `tests/unit/ac-status-manager.test.ts`
**Test Plan**:
- **Given**: spec.md with ACs and tasks.md
- **When**: validateACMapping() is called
- **Then**: Reports ACs with no tasks

**Test Cases**:
```typescript
describe('ACStatusManager.validateACMapping', () => {
  it('should detect ACs with no tasks', () => {
    // AC-US11-99 in spec.md but not referenced in tasks.md
    const result = manager.validateACMapping('0039');
    expect(result.orphanedACs).toContain('AC-US11-99');
  });

  it('should report tasks with invalid AC-IDs', () => {
    // Task references AC-INVALID-01 (doesn't exist in spec.md)
    const result = manager.validateACMapping('0039');
    expect(result.invalidReferences).toContain('AC-INVALID-01');
  });
});
```

**Dependencies**: T-087
**Estimated**: 3 hours

---

#### T-089: Implement validateACMapping()
**AC**: AC-US12-07
**File**: `src/core/increment/ac-status-manager.ts`
**Implementation**:
1. Parse spec.md for all ACs
2. Parse tasks.md for all AC references
3. Find ACs with no tasks (orphaned)
4. Find task AC references not in spec.md (invalid)
5. Return validation result

**Dependencies**: T-088
**Estimated**: 3 hours

---

#### T-090: Write tests for AC status change logging
**AC**: AC-US12-10
**File**: `tests/unit/ac-status-manager.test.ts`
**Test Plan**:
- **Given**: AC status changes
- **When**: syncACStatus() completes
- **Then**: Event logged to metadata.json

**Test Cases**:
```typescript
describe('ACStatusManager - logging', () => {
  it('should log AC status change to metadata.json', async () => {
    await manager.syncACStatus('0039');
    const metadata = JSON.parse(fs.readFileSync('metadata.json', 'utf-8'));
    expect(metadata.acStatusEvents).toBeDefined();
    expect(metadata.acStatusEvents[0].type).toBe('ac-status-changed');
    expect(metadata.acStatusEvents[0].acId).toBe('AC-US11-01');
    expect(metadata.acStatusEvents[0].from).toBe('[ ]');
    expect(metadata.acStatusEvents[0].to).toBe('[x]');
  });
});
```

**Dependencies**: T-089
**Estimated**: 3 hours

---

#### T-091: Implement AC status logging
**AC**: AC-US12-10
**File**: `src/core/increment/ac-status-manager.ts`
**Implementation**:
1. After updating spec.md, log event to metadata.json
2. Event format:
   ```json
   {
     "timestamp": "2025-11-16T...",
     "type": "ac-status-changed",
     "acId": "AC-US11-01",
     "from": "[ ]",
     "to": "[x]",
     "trigger": "task-completion",
     "taskId": "T-062"
   }
   ```
3. Keep last 20 AC status events

**Dependencies**: T-090
**Estimated**: 2 hours

---

#### T-092: Write E2E test for full AC status flow
**AC**: AC-US12-01 through AC-US12-10
**File**: `tests/e2e/ac-status-flow.spec.ts`
**Test Plan**:
- **Given**: Increment with spec.md, tasks.md
- **When**: Tasks complete and hook fires
- **Then**: spec.md ACs auto-update

**Test Cases**:
```typescript
describe('AC Status Automation E2E', () => {
  it('should auto-update ACs when tasks complete', async () => {
    // Create increment
    // Complete task T-062
    // Trigger hook
    // Verify AC-US11-01 updated to [x] in spec.md
  });

  it('should handle partial completion correctly', async () => {
    // Complete 1 of 3 tasks for AC-US11-02
    // Trigger hook
    // Verify AC-US11-02 stays [ ]
  });

  it('should detect and warn about conflicts', async () => {
    // Manually check AC-US11-03 in spec.md
    // Leave tasks incomplete
    // Run sync
    // Verify conflict warning
  });
});
```

**Dependencies**: T-091
**Estimated**: 5 hours

---

#### T-093: Document AC status automation
**AC**: Documentation requirement
**File**: `docs/guides/ac-status-automation.md`
**Implementation**:
Create user guide explaining:
1. Why AC status automation matters
2. How it works (task completion → spec.md update)
3. AC-task mapping via **AC**: tags
4. Manual sync command: /specweave:sync-acs
5. Skip flag: --skip-ac-sync
6. Validation and conflict detection
7. Troubleshooting

**Dependencies**: T-092
**Estimated**: 3 hours

---

## Summary

- **Total Tasks**: 93 implementation + testing tasks (61 original + 17 Phase 6 + 15 Phase 7)
- **Completed Tasks**: 68/93 (73%)
  - Phases 1-5: 61/61 complete ✅
  - Phase 6 (NEW - Spec Sync): 7/17 complete (41%)
  - Phase 7 (NEW - AC Status): 0/15 complete (0%)
- **Coverage Target**: 95% (TDD mode enabled)
- **Estimated Duration**: 7 weeks (5 weeks original + 1 week Phase 6 + 1 week Phase 7)
- **Phases**: Foundation → Orchestration → Intelligence → Autonomy → Polish → Spec Synchronization → AC Status Automation

**Key Milestones**:
- Week 1: /specweave:plan command functional ✅
- Week 2: Auto-orchestration working (plan → do → validate) ✅
- Week 3: Confidence scoring and backlog intelligence complete ✅
- Week 4: Autonomous mode functional with safety guardrails ✅
- Week 5: UX polish, documentation, performance optimization ✅
- Week 6: **NEW** - Spec synchronization - FOUNDATION COMPLETE (41%)
  - ✅ Detection & warning system working
  - ✅ Hook integration complete
  - ✅ Multi-tool support (AGENTS.md)
  - ✅ Comprehensive tests (14 unit + 7 E2E scenarios)
  - 🚧 Regeneration logic (plan.md, tasks.md) - TODO
  - 🚧 Status preservation - TODO
- Week 7: **NEW** - AC Status Automation (0%)
  - 🚧 ACStatusManager component
  - 🚧 Auto-update spec.md AC checkboxes from tasks.md
  - 🚧 Hook integration (post-task-completion)
  - 🚧 /specweave:sync-acs command
  - 🚧 Validation and conflict detection

**Phase 6 Progress** (NEW - US-011):

**✅ COMPLETED (7/17 tasks)**:
- [x] T-062: Unit tests for detectSpecChange() - 14 tests passing ✅
- [x] T-063: SpecSyncManager.detectSpecChange() implementation ✅
- [x] T-065: Hook integration (user-prompt-submit.sh) ✅
- [x] T-073: Sync event logging to metadata.json ✅
- [x] T-075: --skip-sync flag handling ✅
- [x] T-076: AGENTS.md for non-Claude tools ✅
- [x] T-077: E2E tests for sync flow ✅

**🚧 REMAINING (10/17 tasks)**:
- [ ] T-064: Hook integration tests (separate from E2E)
- [ ] T-066: Plan regeneration tests
- [ ] T-067: Plan regeneration implementation (skeleton only)
- [ ] T-068: Tasks regeneration tests
- [ ] T-069: Tasks regeneration implementation (skeleton only)
- [ ] T-070: Status preservation tests
- [ ] T-071: Status preservation implementation (design only)
- [ ] T-072: Sync event logging tests (partially covered in T-062)
- [ ] T-074: --skip-sync flag tests (partially covered in T-062)
- [ ] T-078: User guide documentation

**Next Steps**:
1. Validate this tasks.md (all AC-IDs covered for US-011)
2. Run /specweave:validate 0039
3. Implement remaining Phase 6 tasks: /specweave:do 0039

---

**AC Coverage Summary**:
- US-001 (Phase Detection): AC-US1-01, AC-US1-02, AC-US1-03 ✅
- US-002 (Auto-Plan): AC-US2-01, AC-US2-02, AC-US2-03 ✅
- US-003 (Auto-Do): AC-US3-01, AC-US3-02, AC-US3-03 ✅
- US-004 (Validation): AC-US4-01, AC-US4-02 ✅
- US-005 (Auto-Close): AC-US5-01, AC-US5-02, AC-US5-03 ✅
- US-006 (Backlog): AC-US6-01, AC-US6-02, AC-US6-03 ✅
- US-007 (Plan Command): AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04 ✅
- US-008 (Confidence): AC-US8-01, AC-US8-02, AC-US8-03 ✅
- US-009 (Multi-Project): AC-US9-01, AC-US9-02 ✅
- US-010 (Autonomous): AC-US10-01, AC-US10-02, AC-US10-03 ✅
- **US-011 (Spec Sync)**:
  - ✅ AC-US11-01 (Detection)
  - ❌ AC-US11-02 (Regenerate plan.md)
  - ❌ AC-US11-03 (Regenerate tasks.md)
  - ❌ AC-US11-04 (Preserve status)
  - ❌ AC-US11-05 (Show diff)
  - ✅ AC-US11-06 (--skip-sync flag)
  - ✅ AC-US11-07 (Hook works)
  - ✅ AC-US11-08 (AGENTS.md)
  - ✅ AC-US11-09 (Edge cases)
  - ✅ AC-US11-10 (Sync logging)
  - **Status**: 6/10 complete

**All 76 AC-IDs covered across 78 tasks** ✅
