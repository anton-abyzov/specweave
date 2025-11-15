---
increment: 0003-intelligent-model-selection
title: "Technical Implementation Plan"
created: 2025-10-30
updated: 2025-10-30
architecture_docs:
  - ../../docs/internal/architecture/system-design.md
  - ../../docs/internal/architecture/adr/ADR-007-intelligent-model-selection.md
  - ../../docs/internal/architecture/adr/ADR-008-cost-tracking-system.md
  - ../../docs/internal/architecture/adr/ADR-009-phase-detection-algorithm.md
status: planned
---

# Technical Implementation Plan: Intelligent Model Selection

## Architecture Overview

This increment implements a **3-layer intelligent model selection system** that automatically optimizes AI costs while maintaining quality, following Anthropic's official Sonnet/Haiku guidance.

### System Context

```
User Request
     ↓
[Phase Detector] ← Analyzes intent, keywords, commands
     ↓
[Model Selector] ← Combines agent preferences + phase + config
     ↓
[Task Tool] ← Executes with selected model
     ↓
[Cost Tracker] ← Records tokens, costs, savings
     ↓
Results + Cost Report
```

### Key Design Principles

1. **Automatic by Default**: Zero configuration required for 80% use case
2. **Transparent Always**: Every model decision logged with reasoning
3. **Override Always Available**: User can force any model for any task
4. **Quality First**: Automatic fallback if Haiku fails
5. **Backward Compatible**: Existing projects work without changes

---

## System Components

### 1. Agent Model Preferences (Layer 1: Static Intelligence)

**Location**: `src/agents/{agent-name}/AGENT.md`

**YAML Schema Extension**:
```yaml
---
name: pm
description: Product Manager agent...
model_preference: sonnet|haiku|auto
cost_profile: planning|execution|hybrid
fallback_behavior: strict|flexible|auto
---
```

**Field Definitions**:
- `model_preference`: Default model for this agent
  - `sonnet`: Always use Sonnet 4.5 (planning, analysis, architecture)
  - `haiku`: Always use Haiku 4.5 (implementation, execution)
  - `auto`: Context-dependent (system decides)

- `cost_profile`: Cost optimization profile
  - `planning`: High-cost operations (deep reasoning required)
  - `execution`: Low-cost operations (code generation, file operations)
  - `hybrid`: Mixed operations (some planning, some execution)

- `fallback_behavior`: What to do if preferred model fails
  - `strict`: Always use preferred model (retry on failure)
  - `flexible`: Upgrade to Sonnet if Haiku fails repeatedly
  - `auto`: System decides based on error type

**Agent Classifications**:

| Agent | Preference | Profile | Rationale |
|-------|-----------|---------|-----------|
| PM | sonnet | planning | Market research, requirements analysis |
| Architect | sonnet | planning | System design, ADR creation |
| Security | sonnet | planning | Threat modeling, vulnerability analysis |
| Performance | sonnet | planning | Profiling analysis, optimization strategies |
| Frontend | haiku | execution | Component implementation, styling |
| Backend | haiku | execution | API endpoints, database queries |
| DevOps | haiku | execution | Deployment scripts, configuration |
| Tech Lead | haiku | execution | Code review, refactoring |
| QA Lead | haiku | execution | Test case implementation |
| Diagrams | auto | hybrid | Simple diagrams = haiku, complex = sonnet |
| Docs Writer | auto | hybrid | API docs = haiku, architecture = sonnet |

**Implementation**: `src/core/agent-model-manager.ts`

```typescript
interface AgentModelPreference {
  agent: string;
  preference: 'sonnet' | 'haiku' | 'auto';
  profile: 'planning' | 'execution' | 'hybrid';
  fallback: 'strict' | 'flexible' | 'auto';
}

class AgentModelManager {
  loadAgentPreferences(): Map<string, AgentModelPreference>;
  getPreferredModel(agentName: string): 'sonnet' | 'haiku' | 'auto';
}
```

---

### 2. Phase Detection (Layer 2: Dynamic Intelligence)

**Location**: `src/core/phase-detector.ts`

**Algorithm**: Multi-signal analysis

1. **Keyword Analysis** (40% weight)
   - Planning: "plan", "design", "analyze", "research", "architecture", "decide"
   - Execution: "implement", "build", "create", "write", "code", "generate"
   - Review: "review", "validate", "audit", "assess", "check", "verify"

2. **Command Analysis** (30% weight)
   - Planning: `/specweave:inc`, `/spec-driven-brainstorming`, `/increment-planner`
   - Execution: `/specweave:do`, `/do`, task execution within increment
   - Review: `/specweave:validate`, `/specweave:done`, quality checks

3. **Context Analysis** (20% weight)
   - Current increment state (planned → use Sonnet, in-progress → use Haiku)
   - Previous task types in session
   - Files being modified (architecture docs → Sonnet, code files → Haiku)

4. **Explicit Hints** (10% weight)
   - User mentions "plan" or "implement" directly
   - Tool selection (Write → execution, Read → analysis)

**Decision Matrix**:
```
Score > 0.7: High confidence (use detected phase)
Score 0.4-0.7: Medium confidence (use agent preference)
Score < 0.4: Low confidence (use agent preference + prompt user)
```

**Implementation**:
```typescript
interface PhaseDetectionResult {
  phase: 'planning' | 'execution' | 'review';
  confidence: number; // 0.0 to 1.0
  signals: {
    keywords: string[];
    command?: string;
    context: string[];
  };
  reasoning: string;
}

class PhaseDetector {
  detect(prompt: string, context: ExecutionContext): PhaseDetectionResult;

  private analyzeKeywords(prompt: string): number;
  private analyzeCommand(context: ExecutionContext): number;
  private analyzeContext(context: ExecutionContext): number;
  private analyzeHints(prompt: string): number;
}
```

**ADR**: See `ADR-009-phase-detection-algorithm.md` for detailed analysis.

---

### 3. Model Selector (Layer 3: Decision Engine)

**Location**: `src/core/model-selector.ts`

**Decision Algorithm**:

```typescript
function selectModel(
  userRequest: string,
  agent: string,
  context: ExecutionContext,
  config: ModelSelectionConfig
): ModelSelectionDecision {

  // Step 1: Check explicit override
  if (config.forceModel) {
    return { model: config.forceModel, reason: 'user_override' };
  }

  // Step 2: Load agent preference
  const agentPref = agentModelManager.getPreferredModel(agent);
  if (agentPref !== 'auto') {
    return { model: agentPref, reason: 'agent_preference' };
  }

  // Step 3: Detect phase
  const phase = phaseDetector.detect(userRequest, context);

  // Step 4: Apply decision matrix
  if (phase.confidence > 0.7) {
    return {
      model: PHASE_MODEL_MAP[phase.phase],
      reason: 'phase_detection',
      confidence: phase.confidence
    };
  }

  // Step 5: Default to Sonnet (safe choice)
  return { model: 'sonnet', reason: 'low_confidence_default' };
}

const PHASE_MODEL_MAP = {
  planning: 'sonnet',
  execution: 'haiku',
  review: 'sonnet'
};
```

**Configuration** (`.specweave/config.yaml`):
```yaml
model_selection:
  mode: auto  # auto|balanced|manual

  # Defaults
  default_planning_model: sonnet
  default_execution_model: haiku
  default_review_model: sonnet

  # Confidence thresholds
  high_confidence: 0.7
  medium_confidence: 0.4

  # User control
  require_approval: false  # balanced mode
  log_decisions: true
  show_reasoning: true

  # Cost policies
  enable_cost_tracking: true
  warn_threshold: 1.0   # $1 per increment
  block_threshold: 5.0  # $5 per increment
```

**Implementation**:
```typescript
interface ModelSelectionDecision {
  model: 'sonnet' | 'haiku' | 'opus';
  reason:
    | 'user_override'
    | 'agent_preference'
    | 'phase_detection'
    | 'low_confidence_default'
    | 'cost_policy'
    | 'fallback';
  confidence?: number;
  reasoning: string;
  alternatives?: Array<{ model: string; score: number }>;
}

class ModelSelector {
  select(
    prompt: string,
    agent: string,
    context: ExecutionContext,
    config: ModelSelectionConfig
  ): ModelSelectionDecision;

  logDecision(decision: ModelSelectionDecision): void;
}
```

**ADR**: See `ADR-007-intelligent-model-selection.md` for decision rationale.

---

### 4. Cost Tracking System

**Location**: `src/core/cost-tracker.ts`

**Data Model**:
```typescript
interface CostSession {
  sessionId: string;
  timestamp: string;
  incrementId?: string;
  agent?: string;
  model: 'sonnet' | 'haiku' | 'opus';
  phase: 'planning' | 'execution' | 'review';

  tokens: {
    input: number;
    output: number;
    cached?: number;
  };

  cost: {
    input: number;   // $ cost for input tokens
    output: number;  // $ cost for output tokens
    total: number;   // sum
  };

  duration: number; // milliseconds
  success: boolean;
  errorType?: string;
}

interface IncrementCostReport {
  incrementId: string;
  startTime: string;
  endTime: string;

  sessions: CostSession[];

  totals: {
    sonnetCost: number;
    haikuCost: number;
    opusCost: number;
    totalCost: number;
  };

  breakdown: {
    byAgent: Record<string, number>;
    byPhase: Record<string, number>;
    byModel: Record<string, number>;
  };

  savings: {
    baselineCost: number;  // if all Sonnet
    actualCost: number;
    savedAmount: number;
    savedPercent: number;
  };

  efficiency: {
    avgCostPerTask: number;
    avgDuration: number;
    successRate: number;
  };
}
```

**Pricing Constants** (as of 2025-10-30):
```typescript
const PRICING = {
  sonnet: {
    input: 0.000003,   // $3 per 1M tokens
    output: 0.000015,  // $15 per 1M tokens
  },
  haiku: {
    input: 0.000001,   // $1 per 1M tokens
    output: 0.000005,  // $5 per 1M tokens
  },
  opus: {
    input: 0.000015,   // $15 per 1M tokens
    output: 0.000075,  // $75 per 1M tokens
  }
};
```

**Storage**:
- **Real-time**: In-memory during execution
- **Persistent**: `.specweave/increments/####/reports/cost-analysis.json`
- **Historical**: `.specweave/logs/cost-history.jsonl` (append-only log)

**Implementation**:
```typescript
class CostTracker {
  // Track current session
  startSession(agent: string, model: string, phase: string): string;
  endSession(sessionId: string, tokens: TokenUsage, success: boolean): void;

  // Query costs
  getIncrementCost(incrementId: string): IncrementCostReport;
  getProjectCosts(startDate?: Date, endDate?: Date): ProjectCostReport;

  // Savings calculations
  calculateSavings(actual: CostSession[], baseline: 'all-sonnet'): SavingsReport;

  // Persistence
  saveToDisk(incrementId: string): void;
  loadFromDisk(incrementId: string): IncrementCostReport;
}
```

**ADR**: See `ADR-008-cost-tracking-system.md` for storage design decisions.

---

### 5. Auto-Split Orchestration

**Concept**: For complex multi-phase workflows, automatically split work across models.

**Example: Brownfield Onboarder Skill**

**Current** (all Sonnet):
```typescript
async function onboardBrownfield(projectPath: string) {
  // All in one agent call
  const result = await invokeAgent('brownfield-onboarder', {
    model: 'sonnet',  // entire workflow
    prompt: `Analyze ${projectPath} and migrate to SpecWeave`
  });
}
```

**Optimized** (auto-split):
```typescript
async function onboardBrownfield(projectPath: string) {
  // Phase 1: Analysis (Sonnet) - 20% of time
  const analysis = await invokeAgent('brownfield-onboarder', {
    model: 'sonnet',
    prompt: `Analyze structure of ${projectPath}, classify docs, plan migration`,
    phase: 'analysis'
  });

  // Phase 2: Execution (Haiku) - 70% of time
  const migration = await invokeAgent('brownfield-onboarder', {
    model: 'haiku',
    prompt: `Execute migration plan: ${analysis.plan}`,
    phase: 'execution',
    context: { analysis }
  });

  // Phase 3: Validation (Sonnet) - 10% of time
  const validation = await invokeAgent('brownfield-onboarder', {
    model: 'sonnet',
    prompt: `Validate migration: ${migration.summary}`,
    phase: 'validation',
    context: { analysis, migration }
  });

  return { analysis, migration, validation };
}
```

**Cost Comparison**:
- **All Sonnet**: ~$0.80 (8 min * $0.10/min)
- **Auto-split**: ~$0.30 (2min Sonnet + 5min Haiku + 1min Sonnet)
- **Savings**: 62%

**Skills to Optimize**:
1. `brownfield-onboarder` - Analysis + Migration + Validation
2. `role-orchestrator` - PM/Architect (Sonnet) + Devs (Haiku)
3. `spec-driven-brainstorming` - Exploration (Sonnet) + Documentation (Haiku)

**Implementation Pattern**:
```typescript
interface PhaseConfig {
  phase: string;
  model: 'sonnet' | 'haiku' | 'auto';
  estimatedDuration: number;
  inputs: string[];
  outputs: string[];
}

class AutoSplitOrchestrator {
  async execute(
    workflow: PhaseConfig[],
    context: ExecutionContext
  ): Promise<WorkflowResult> {
    const results = [];

    for (const phase of workflow) {
      const model = this.selectModelForPhase(phase);
      const result = await this.executePhase(phase, model, results);
      results.push(result);

      // Track cost per phase
      costTracker.logPhase(phase, model, result);
    }

    return { phases: results, totalCost: costTracker.total() };
  }
}
```

---

### 6. Cost Dashboard Command

**Command**: `/specweave:costs [incrementId]`

**Output Format**:
```
╔══════════════════════════════════════════════════════════════╗
║           SpecWeave Cost Dashboard                           ║
╠══════════════════════════════════════════════════════════════╣
║ Increment: 0003-intelligent-model-selection                  ║
║ Status: In Progress (12/20 tasks completed)                  ║
║ Duration: 3h 45m                                             ║
╠══════════════════════════════════════════════════════════════╣
║                    Cost Breakdown                            ║
╠══════════════════════════════════════════════════════════════╣
║ Sonnet 4.5:    $0.45  (45% of total)  [Planning]            ║
║ Haiku 4.5:     $0.18  (18% of total)  [Execution]           ║
║ Total:         $0.63                                         ║
║                                                              ║
║ Baseline (all-Sonnet):  $1.85                               ║
║ Savings:                $1.22  (66%)                         ║
╠══════════════════════════════════════════════════════════════╣
║                  Breakdown by Agent                          ║
╠══════════════════════════════════════════════════════════════╣
║ PM:            $0.22  (Sonnet)                               ║
║ Architect:     $0.18  (Sonnet)                               ║
║ Frontend:      $0.08  (Haiku)                                ║
║ Backend:       $0.10  (Haiku)                                ║
║ Tech Lead:     $0.05  (Haiku)                                ║
╠══════════════════════════════════════════════════════════════╣
║                  Breakdown by Phase                          ║
╠══════════════════════════════════════════════════════════════╣
║ Planning:      $0.40  (64%)                                  ║
║ Execution:     $0.18  (29%)                                  ║
║ Review:        $0.05  (7%)                                   ║
╠══════════════════════════════════════════════════════════════╣
║                    Efficiency                                ║
╠══════════════════════════════════════════════════════════════╣
║ Avg cost per task:     $0.05                                 ║
║ Success rate:          95%                                   ║
║ Haiku success rate:    92%                                   ║
╠══════════════════════════════════════════════════════════════╣
║ Export: cost-analysis.json | cost-history.csv               ║
╚══════════════════════════════════════════════════════════════╝
```

**Implementation**: `src/commands/specweave:costs.md`

Slash command triggers cost reporter utility:
```typescript
class CostReporter {
  generateDashboard(incrementId?: string): string;
  exportToJSON(incrementId: string, path: string): void;
  exportToCSV(incrementId: string, path: string): void;
  generateChart(data: IncrementCostReport): string; // ASCII chart
}
```

---

## Integration Points

### 1. Task Tool Integration

**Current Task Tool** (`claude-code/src/agent-tool.ts`):
```typescript
interface TaskToolParams {
  subagent_type: string;
  prompt: string;
  model?: 'sonnet' | 'haiku' | 'opus';  // ✅ Already exists
  description: string;
}
```

**Enhancement** (backward compatible):
```typescript
interface TaskToolParams {
  subagent_type: string;
  prompt: string;
  model?: 'sonnet' | 'haiku' | 'opus' | 'auto';  // ✅ Add 'auto'
  description: string;

  // New optional fields
  phase?: 'planning' | 'execution' | 'review';
  cost_tracking?: boolean;  // default: true
  allow_model_override?: boolean;  // default: true
}
```

**Implementation**:
```typescript
// Before invoking agent
if (params.model === 'auto' || !params.model) {
  const decision = modelSelector.select(
    params.prompt,
    params.subagent_type,
    context,
    config
  );
  params.model = decision.model;

  // Log decision
  if (config.log_decisions) {
    console.log(`[Model Selection] ${decision.model} - ${decision.reasoning}`);
  }
}

// Track cost
const sessionId = costTracker.startSession(
  params.subagent_type,
  params.model,
  params.phase || 'execution'
);

try {
  const result = await invokeAgent(params);
  costTracker.endSession(sessionId, result.tokens, true);
  return result;
} catch (error) {
  costTracker.endSession(sessionId, error.tokens, false);

  // Fallback logic
  if (params.model === 'haiku' && shouldFallback(error)) {
    return await invokeAgentWithFallback(params, 'sonnet');
  }
  throw error;
}
```

### 2. Agent System Integration

**Agent Invocation** (no changes to AGENT.md format):
```yaml
---
name: frontend
description: Frontend developer agent
model_preference: haiku  # ← NEW FIELD
cost_profile: execution   # ← NEW FIELD
---
```

**Loader Enhancement** (`src/core/agent-loader.ts`):
```typescript
function loadAgent(agentName: string): AgentConfig {
  const agentMd = readAgentFile(agentName);
  const frontmatter = parseYAML(agentMd);

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    // ✅ NEW
    modelPreference: frontmatter.model_preference || 'auto',
    costProfile: frontmatter.cost_profile || 'hybrid',
    fallbackBehavior: frontmatter.fallback_behavior || 'auto',
    // ... rest
  };
}
```

### 3. Command System Integration

**Slash Commands Declare Phase**:
```yaml
# src/commands/specweave:inc.md
---
name: specweave.inc
description: Plan new increment
phase: planning  # ← NEW FIELD (hint for model selector)
---
```

**Command Execution**:
```typescript
// When /specweave:inc is invoked
const command = loadCommand('specweave.inc');
context.phase = command.phase || 'execution';  // hint for model selector
```

### 4. Config System Integration

**No changes needed** - Config manager already loads `.specweave/config.yaml`.

**New section added**:
```yaml
# .specweave/config.yaml
model_selection:
  mode: auto
  enable_cost_tracking: true
  log_decisions: true
  # ... (see config schema above)
```

---

## Data Flow

### Request Flow (Execution Path)

```
1. User: "/specweave:do"
   ↓
2. Command Loader: Load command config (phase: "execution")
   ↓
3. Increment Manager: Load current increment tasks
   ↓
4. Task Executor: For each task...
   ↓
5. Model Selector:
   - Load agent preference (e.g., frontend → haiku)
   - Detect phase from command (execution)
   - Check config (mode: auto)
   - Decision: haiku
   ↓
6. Cost Tracker: Start session (agent: frontend, model: haiku, phase: execution)
   ↓
7. Task Tool: Invoke agent with model=haiku
   ↓
8. Agent Execution: Generate code
   ↓
9. Cost Tracker: End session (tokens: 5000 input, 8000 output, cost: $0.05)
   ↓
10. Results: Return to user + log cost
```

### Cost Query Flow

```
1. User: "/specweave:costs 0003"
   ↓
2. Cost Tracker: Load cost-analysis.json
   ↓
3. Cost Reporter: Aggregate data, calculate savings
   ↓
4. Display: Render dashboard
```

---

## File Structure

### New Files Created

```
src/
├── core/
│   ├── agent-model-manager.ts       # Agent preference loader
│   ├── phase-detector.ts            # Phase detection algorithm
│   ├── model-selector.ts            # Model selection engine
│   ├── cost-tracker.ts              # Cost tracking service
│   └── auto-split-orchestrator.ts   # Multi-phase workflow splitter
│
├── utils/
│   ├── cost-reporter.ts             # Cost dashboard generator
│   └── pricing-constants.ts         # Model pricing (updated regularly)
│
├── commands/
│   └── specweave.costs.md           # Cost dashboard command
│
└── types/
    ├── model-selection.ts           # TypeScript interfaces
    └── cost-tracking.ts             # Cost data types

.specweave/
├── increments/
│   └── ####-name/
│       └── reports/
│           └── cost-analysis.json   # Per-increment cost report
│
└── logs/
    └── cost-history.jsonl           # Project-wide cost log

.specweave/docs/internal/architecture/adr/
├── ADR-007-intelligent-model-selection.md
├── ADR-008-cost-tracking-system.md
└── ADR-009-phase-detection-algorithm.md
```

---

## Architecture Decision Records (ADRs)

### ADR-007: Intelligent Model Selection Architecture

**Status**: Proposed

**Context**: SpecWeave needs automatic cost optimization while maintaining quality.

**Decision**: Implement 3-layer system (agent preferences + phase detection + model selector).

**Rationale**:
- Aligns with Anthropic official guidance
- Backward compatible (manual override always available)
- Transparent (all decisions logged)
- Quality-first (automatic fallback)

**Alternatives Considered**:
1. **Manual only** - Rejected (poor UX, requires expertise)
2. **Always Haiku** - Rejected (quality degradation on planning tasks)
3. **ML-based prediction** - Deferred (too complex for v1)

**Consequences**:
- ✅ 60-70% cost savings
- ✅ Zero configuration required
- ✅ Transparent decision-making
- ⚠️ Phase detection may be wrong occasionally (mitigated by logging + override)

---

### ADR-008: Cost Tracking System Design

**Status**: Proposed

**Context**: Users need visibility into AI costs per increment.

**Decision**: JSON-based storage, async logging, per-increment reports.

**Storage Options Evaluated**:
1. **SQLite database** - Rejected (overkill, adds dependency)
2. **JSON files** - ✅ Selected (simple, human-readable, git-friendly)
3. **Cloud API** - Deferred (future feature)

**Schema**: See `CostSession` and `IncrementCostReport` above.

**Performance**: Async writes, batched every 10 operations or 30 seconds.

---

### ADR-009: Phase Detection Algorithm

**Status**: Proposed

**Context**: Accurate phase detection is critical for model selection quality.

**Decision**: Multi-signal heuristic (keywords + commands + context + hints).

**Algorithm**: See Phase Detector section above.

**Accuracy Target**: 95% on common workflows.

**Fallback**: When confidence < 0.4, use agent preference (safe default).

**Future**: ML model trained on user feedback (v2 feature).

---

## Testing Strategy

### Unit Tests

**Agent Model Manager**:
- ✅ Load agent preferences from AGENT.md
- ✅ Handle missing model_preference field (default to 'auto')
- ✅ Validate preference values (sonnet|haiku|auto only)

**Phase Detector**:
- ✅ Detect planning phase from keywords
- ✅ Detect execution phase from keywords
- ✅ Detect review phase from keywords
- ✅ Command hints override keyword detection
- ✅ Low confidence returns agent preference

**Model Selector**:
- ✅ Explicit override always wins
- ✅ Agent preference used when phase is auto
- ✅ Phase detection used when confidence high
- ✅ Default to Sonnet when confidence low
- ✅ Log all decisions

**Cost Tracker**:
- ✅ Calculate costs correctly (Sonnet vs Haiku)
- ✅ Aggregate by agent, phase, model
- ✅ Calculate savings vs baseline
- ✅ Persist to JSON correctly
- ✅ Load from JSON correctly

### Integration Tests

**End-to-End Workflows**:
1. `/specweave:inc` (planning) → Should use Sonnet
2. `/specweave:do` (execution) → Should use Haiku
3. `/specweave:validate` (review) → Should use Sonnet
4. Manual override → Should respect user choice

**Cost Tracking**:
1. Execute increment → Cost report generated
2. `/specweave:costs` → Dashboard displays correctly
3. Multiple increments → Historical costs aggregate

**Auto-Split Orchestration**:
1. Brownfield onboarder → Splits into 3 phases
2. Role orchestrator → PM uses Sonnet, Frontend uses Haiku
3. Phase transitions logged

### Acceptance Tests (from spec.md)

**US-001**: Automatic optimization works out-of-box
**US-002**: Cost report generated per increment
**US-003**: Agent preferences respected
**US-004**: Phase detection 95% accurate
**US-005**: Auto-split reduces cost 60%+

### Performance Tests

**Benchmarks**:
- Model selection decision < 50ms ✅
- Cost tracking overhead < 10ms per operation ✅
- Phase detection < 30ms ✅

### Quality Tests

**Haiku vs Sonnet Quality**:
- Run same 50 tasks with both models
- Compare success rate (target: Haiku > 90%)
- Compare output quality (manual review)
- Identify tasks where Haiku underperforms → always use Sonnet

---

## Migration Plan

### Phase 1: Foundation (Week 1)

**Tasks**:
1. Implement agent model manager
2. Add model_preference to all 20 agents
3. Update Task tool to read preferences
4. Test: Agent preferences respected

**Validation**: Manually specify agents, verify correct model used.

---

### Phase 2: Intelligence (Week 2)

**Tasks**:
1. Implement phase detector
2. Implement model selector
3. Integrate with Task tool
4. Test: Phase detection accuracy

**Validation**: Run 100 test prompts, measure accuracy.

---

### Phase 3: Cost Tracking (Week 2-3)

**Tasks**:
1. Implement cost tracker
2. Integrate with Task tool
3. Generate cost reports
4. Test: Cost calculation accuracy

**Validation**: Compare against Anthropic billing dashboard.

---

### Phase 4: Auto-Split (Week 3)

**Tasks**:
1. Implement auto-split orchestrator
2. Update brownfield-onboarder skill
3. Update role-orchestrator skill
4. Test: Cost savings measured

**Validation**: Run brownfield migration, verify 60%+ savings.

---

### Phase 5: Dashboard (Week 3)

**Tasks**:
1. Implement cost reporter
2. Create `/specweave:costs` command
3. Design ASCII dashboard
4. Export to JSON/CSV

**Validation**: User testing, feedback on usability.

---

## Rollout Strategy

### Beta (Internal Dogfooding)

**Scope**: Use for SpecWeave development (this increment)

**Success Criteria**:
- 60%+ cost savings on implementation tasks
- No quality degradation
- Phase detection 95%+ accurate

**Timeline**: 2 weeks

---

### Public Beta (5-10 Users)

**Scope**: Invite power users to test

**Feedback Areas**:
- Model selection accuracy
- Cost savings realized
- Dashboard usability
- Documentation clarity

**Timeline**: 1 week

---

### General Availability

**Launch Checklist**:
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Blog post written
- [ ] Success metrics validated

**Announcement**:
- Blog post: "Announcing Intelligent Model Selection"
- Tweet thread
- Reddit r/ClaudeAI post
- Changelog update

---

## Monitoring & Observability

### Metrics to Track

**Product Metrics**:
- Cost savings % (target: 60%+)
- Haiku success rate (target: 90%+)
- Phase detection accuracy (target: 95%+)

**Usage Metrics**:
- % users in auto mode (target: 80%+)
- `/specweave:costs` usage (target: 50% of users)
- Manual overrides (target: <10%)

**Business Metrics**:
- User-reported cost savings (surveys)
- Adoption rate (new users)
- Retention improvement

### Logging

**Decision Logs** (`.specweave/logs/model-decisions.log`):
```
2025-10-30T10:23:45Z [INFO] Model decision: haiku (reason: agent_preference, agent: frontend, confidence: 0.8)
2025-10-30T10:24:12Z [INFO] Model decision: sonnet (reason: phase_detection, phase: planning, confidence: 0.95)
```

**Cost Logs** (`.specweave/logs/cost-history.jsonl`):
```json
{"timestamp": "2025-10-30T10:23:45Z", "increment": "0003", "agent": "frontend", "model": "haiku", "cost": 0.05}
{"timestamp": "2025-10-30T10:24:12Z", "increment": "0003", "agent": "pm", "model": "sonnet", "cost": 0.12}
```

---

## Risk Mitigation

### Risk 1: Haiku Quality Insufficient

**Impact**: High (poor user experience)

**Probability**: Medium (Anthropic reports 90%, but edge cases exist)

**Mitigation**:
1. Automatic fallback to Sonnet after 2 consecutive Haiku failures
2. Quality tests before rollout (Haiku vs Sonnet comparison)
3. User can always override to Sonnet
4. Log all failures for analysis

---

### Risk 2: Phase Detection Inaccurate

**Impact**: Medium (suboptimal model selection, but not broken)

**Probability**: Medium (heuristic-based, not perfect)

**Mitigation**:
1. Conservative confidence thresholds (0.7 for high confidence)
2. Log all decisions with reasoning
3. User override always available
4. Collect feedback to improve algorithm

---

### Risk 3: Cost Tracking Overhead

**Impact**: Low (performance degradation)

**Probability**: Low (async logging, minimal instrumentation)

**Mitigation**:
1. Async writes (non-blocking)
2. Batched operations
3. Performance tests (target: <10ms overhead)
4. Option to disable (fallback)

---

## Success Criteria (Acceptance Gates)

### Technical Gates

- [ ] Phase detection accuracy > 95% on test suite (100 prompts)
- [ ] Haiku success rate > 90% vs Sonnet baseline (50 tasks)
- [ ] Model selection overhead < 50ms (performance test)
- [ ] Cost tracking overhead < 10ms (performance test)
- [ ] All unit tests passing (100% critical paths)
- [ ] All integration tests passing (E2E workflows)

### Product Gates

- [ ] Cost savings > 60% on implementation-heavy increments
- [ ] Zero breaking changes to existing projects
- [ ] Documentation complete (user guide + developer docs)
- [ ] Beta user feedback positive (4/5 stars average)

### Business Gates

- [ ] Internal dogfooding successful (SpecWeave development)
- [ ] 5 beta users validate cost savings
- [ ] No major issues reported in beta
- [ ] Marketing materials ready (blog post, changelog)

---

## Future Enhancements (Out of Scope for v1)

### Increment 0004+: Advanced Features

1. **Cost Prediction**
   - ML model predicts increment cost before starting
   - Budget recommendations

2. **Team Analytics**
   - Cost per developer
   - Cost trends over time
   - Team leaderboard (most efficient)

3. **Cloud Integration**
   - Sync with Anthropic billing API
   - Real-time cost alerts
   - Budget enforcement

4. **A/B Testing Framework**
   - Compare Haiku vs Sonnet quality
   - Automatic quality scoring
   - Continuous improvement

5. **Multi-Model Support**
   - OpenAI GPT-4 integration
   - Cost comparison across providers
   - Best-price routing

---

## References

### External Documentation
- [Anthropic Pricing](https://www.anthropic.com/pricing)
- [Claude Models Overview](https://docs.anthropic.com/en/docs/about-claude/models)
- [Haiku 4.5 Announcement](https://www.anthropic.com/news/haiku-4-5)

### Internal Documentation
- [CLAUDE.md](../../../CLAUDE.md) - Development guide
- [spec.md](./spec.md) - Product requirements
- [tasks.md](./tasks.md) - Implementation tasks (generated from this plan)

### Related Increments
- [0001-core-framework](../0001-core-framework/) - Agent system foundation
- [0002-core-enhancements](../0002-core-enhancements/) - Command system

---

**Last Updated**: 2025-10-30
**Status**: Planned
**Next Steps**: Generate `tasks.md` from this plan, create ADRs
