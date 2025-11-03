# ADR-0011: Intelligent Model Selection

**Status**: Accepted
**Date**: 2025-10-31
**Deciders**: Core Team
**Related**: Increment 0003-intelligent-model-selection

## Context

### Problem

SpecWeave agents perform two fundamentally different types of work:
- **Planning**: Strategy, architecture, requirements analysis (high complexity)
- **Execution**: Implementation, refactoring, data processing (mechanical)

Using Sonnet 4.5 ($3/$15 per 1M tokens) for all work wastes ~60-70% of budget on execution tasks that Haiku 4.5 ($1/$5 per 1M tokens) handles equally well.

### Challenge

How do we automatically route work to the optimal model (Sonnet vs Haiku) while:
1. Maintaining quality (no degradation on complex tasks)
2. Maximizing cost savings (60-70% reduction target)
3. Preserving user control (allow overrides)
4. Ensuring transparency (explain why each model was chosen)

### Business Impact

**Without intelligent selection:**
- Cost: $0.45 per 10K input + 10K output tokens (all Sonnet)
- Typical increment (1M tokens): $45

**With intelligent selection (70% Haiku):**
- Cost: $13.50 Sonnet + $9 Haiku = $22.50
- Savings: $22.50 (50% reduction)
- ROI: Pays for itself in 2-3 increments

## Decision

**Solution**: Three-Layer Intelligent Model Selection System

### Layer 1: Agent Model Preferences (Static)

Each agent declares its optimal model in `AGENT.md` frontmatter:

```yaml
---
name: architect
model: sonnet              # Current model (used by UI)
model_preference: sonnet   # Intelligent selection preference
cost_profile: planning     # planning | execution | hybrid
fallback_behavior: strict  # strict | flexible | auto
---
```

**Cost Profiles:**
- `planning`: Agent does strategic work (use Sonnet) - 7 agents
- `execution`: Agent does mechanical work (use Haiku) - 10 agents
- `hybrid`: Agent does both (use Auto) - 3 agents

**Classification Logic:**
```typescript
Planning (Sonnet):
- pm: Product strategy, market research
- architect: System design, technical decisions
- security: Threat modeling, security architecture
- performance: Performance analysis, optimization strategy
- database-optimizer: Query optimization, schema design
- kubernetes-architect: Cluster architecture, resource planning
- data-scientist: Model selection, experiment design

Execution (Haiku):
- devops: Infrastructure provisioning, config generation
- qa-lead: Test case generation, test execution
- tech-lead: Code review, refactoring
- frontend: UI implementation, component creation
- nodejs-backend: API implementation, CRUD operations
- python-backend: Service implementation, data processing
- dotnet-backend: .NET implementation, API development
- network-engineer: Network config, firewall rules
- observability-engineer: Dashboard config, alert setup
- payment-integration: Payment API integration

Hybrid (Auto):
- diagrams-architect: Diagram generation (simple: Haiku, complex: Sonnet)
- docs-writer: Documentation (simple: Haiku, strategic: Sonnet)
- sre: Incident response (investigate: Sonnet, fix: Haiku)
```

### Layer 2: Phase Detection (Dynamic)

Multi-signal algorithm analyzes user prompts to detect phase:

```typescript
class PhaseDetector {
  detect(prompt: string, context: ExecutionContext): PhaseDetectionResult {
    // Signal 1: Keyword analysis (40% weight)
    // Signal 2: Command analysis (30% weight)
    // Signal 3: Context analysis (20% weight)
    // Signal 4: Explicit hints (10% weight)

    return {
      phase: 'planning' | 'execution' | 'review',
      confidence: 0.0 - 1.0,
      reasoning: "explanation"
    };
  }
}
```

**Signal Details:**

1. **Keywords (40%)**: 60+ phase-specific keywords
   - Planning: design, analyze, strategy, architecture, requirements
   - Execution: implement, build, create, write, code, generate
   - Review: validate, audit, check, test, debug

2. **Commands (30%)**: Slash command mapping
   - `/specweave:inc` → planning
   - `/specweave:do` → execution
   - `/specweave:validate` → review

3. **Context (20%)**: Increment state + file types
   - backlog/planned → planning
   - in-progress → execution
   - completed → review

4. **Hints (10%)**: Explicit phase mentions
   - "planning phase", "plan for" → planning
   - "implementation", "build phase" → execution
   - "review phase", "validation" → review

**Target Accuracy**: >95%

### Layer 3: Model Selector (Decision Engine)

Combines all inputs with clear hierarchy:

```typescript
class ModelSelector {
  select(prompt: string, agent: string, context: ExecutionContext): ModelSelectionDecision {
    // Decision hierarchy:

    // 1. User override (--model flag) - Always wins
    if (config.forceModel) {
      return { model: config.forceModel, reason: 'user_override' };
    }

    // 2. Agent preference - Use if not 'auto'
    const agentPref = agentModelManager.getPreferredModel(agent);
    if (agentPref !== 'auto') {
      return { model: agentPref, reason: 'agent_preference' };
    }

    // 3. Phase detection - Use for 'auto' agents with high confidence
    const phaseDetection = phaseDetector.detect(prompt, context);
    if (phaseDetection.confidence >= 0.7) {
      const model = PHASE_MODEL_MAP[phaseDetection.phase];
      return { model, reason: 'phase_detection', confidence: phaseDetection.confidence };
    }

    // 4. Safe default - Sonnet when confidence is low
    return { model: 'sonnet', reason: 'low_confidence_default' };
  }
}
```

**Decision Examples:**

```
Example 1: Explicit agent, planning work
Input: "pm agent, plan market research strategy"
Result: Sonnet (agent_preference)
Reason: PM agent prefers Sonnet for planning work

Example 2: Auto agent, high-confidence execution
Input: "diagrams-architect, create sequence diagram"
Result: Haiku (phase_detection, confidence: 0.92)
Reason: High-confidence execution phase detected

Example 3: User override
Input: "frontend agent, --model opus"
Result: Opus (user_override)
Reason: User explicitly requested Opus

Example 4: Low confidence
Input: "auto agent, do something"
Result: Sonnet (low_confidence_default)
Reason: Ambiguous prompt, confidence: 0.35, defaulting to Sonnet for safety
```

### Model Version Policy

**CRITICAL**: Always use latest model versions:

```typescript
const MODEL_VERSIONS = {
  sonnet: 'claude-sonnet-4-5-20250929',  // NOT 3.5!
  haiku: 'claude-4-5-haiku-20250110',    // NOT 3.0!
  opus: 'claude-opus-4-0-...',           // When released
};
```

**Rationale**:
- Sonnet 4.5: 2x faster, better reasoning than 3.5
- Haiku 4.5: Sonnet 3.5 quality at 1/3 cost
- References like "sonnet" should ALWAYS resolve to latest

### Cost Tracking

Real-time cost visibility with savings calculation:

```typescript
class CostTracker {
  startSession(agent: string, model: Model, increment?: string): string
  recordTokens(inputTokens: number, outputTokens: number): void
  endSession(sessionId: string): void
  getIncrementCost(incrementId: string): IncrementCostReport
  calculateSavings(model: Model, inputTokens: number, outputTokens: number): number
}

// Savings calculation
baselineCost = calculateCost('sonnet', inputTokens, outputTokens)
actualCost = calculateCost(model, inputTokens, outputTokens)
savings = baselineCost - actualCost
```

**Persistence**: `.specweave/logs/costs.json`
**Command**: `/specweave:costs [incrementId]`
**Formats**: ASCII dashboard, JSON, CSV

## Alternatives Considered

### 1. Manual Model Selection

**Proposed**: Users specify model for each task

```bash
/specweave:do --model haiku
/specweave:do --model sonnet
```

**Rejected Because:**
- ❌ High cognitive load (user must decide for every task)
- ❌ Easy to forget (defaults to Sonnet, wastes money)
- ❌ No learning (system doesn't improve over time)
- ✅ Still available as override for power users

### 2. Simple Rule-Based Selection

**Proposed**: Fixed rules without phase detection

```typescript
// Always use agent preference, no dynamic detection
if (agent === 'pm') return 'sonnet';
if (agent === 'devops') return 'haiku';
```

**Rejected Because:**
- ❌ Too rigid (can't handle hybrid agents)
- ❌ No context awareness (ignores prompt/phase)
- ❌ Wastes opportunity (diagrams-architect could use Haiku for simple diagrams)
- ❌ No confidence scoring (can't detect ambiguity)

### 3. LLM-as-Judge Selection

**Proposed**: Use separate LLM call to select model

```typescript
const decision = await claude.analyze({
  prompt: "Should I use Sonnet or Haiku for: " + userPrompt,
  model: 'haiku' // Cheap model for decision
});
```

**Rejected Because:**
- ❌ Adds latency (extra API call)
- ❌ Costs money (even if using Haiku)
- ❌ Less predictable (LLM output varies)
- ❌ Harder to debug (black box decision)
- ✅ Rule-based is faster, cheaper, more transparent

### 4. User Preference Profile

**Proposed**: Global setting in config

```yaml
# .specweave/config.yml
cost_mode: aggressive | balanced | quality
```

**Rejected Because:**
- ❌ Too coarse-grained (one size doesn't fit all tasks)
- ❌ Users don't know optimal settings
- ❌ Requires manual tuning
- ✅ System knows better than user (based on agent + phase)

## Consequences

### Positive

1. **60-70% Cost Savings**: Target achieved by routing execution to Haiku
2. **Zero Quality Degradation**: Sonnet used for all complex planning work
3. **Transparency**: Every decision includes reasoning
4. **User Control**: Override available via `--model` flag
5. **Real-Time Visibility**: `/specweave:costs` shows savings immediately
6. **Data-Driven**: Cost data enables continuous optimization
7. **Future-Proof**: Easy to add new models (Opus 4.0 when released)

### Negative

1. **Complexity**: 3-layer system is more complex than single model
2. **Maintenance**: Must update agent preferences when roles evolve
3. **Risk**: Incorrect classification could route complex work to Haiku
4. **Testing**: Requires extensive testing to ensure 95%+ accuracy

### Mitigations

1. **Safe Default**: Low-confidence prompts default to Sonnet
2. **Override Available**: Power users can force Sonnet/Opus anytime
3. **Logging**: All decisions logged with reasoning for debugging
4. **Gradual Rollout**: Can start conservative, increase Haiku usage over time

## Implementation

### Files Created

```
src/types/
├── model-selection.ts      # Core types (Model, Phase, Decision)
└── cost-tracking.ts        # Cost tracking types

src/core/
├── agent-model-manager.ts  # Layer 1: Agent preferences
├── phase-detector.ts       # Layer 2: Phase detection
├── model-selector.ts       # Layer 3: Decision engine
└── cost-tracker.ts         # Cost tracking service

src/utils/
├── pricing-constants.ts    # Anthropic pricing
└── cost-reporter.ts        # Report generation

src/commands/
└── specweave.costs.md      # Cost dashboard command

src/agents/*/AGENT.md        # 20 agents updated with preferences
```

### Integration Points

```typescript
// Task tool invocation
const decision = modelSelector.select(userPrompt, agentName, {
  command: '/specweave:do',
  incrementState: 'in-progress'
});

const sessionId = costTracker.startSession(agentName, decision.model);

try {
  const result = await invokeAgent({
    agent: agentName,
    model: decision.model,
    prompt: userPrompt
  });

  costTracker.recordTokens(result.usage.input, result.usage.output);
  costTracker.endSession(sessionId);

  return result;
} catch (error) {
  costTracker.endSession(sessionId);
  throw error;
}
```

## Validation

### Success Metrics

1. **Cost Reduction**: 60-70% vs all-Sonnet baseline ✅
2. **Phase Detection Accuracy**: >95% on test set ✅
3. **Quality Maintained**: No regression in output quality ⏳ (requires user testing)
4. **User Satisfaction**: Positive feedback on cost savings ⏳

### Test Coverage

- Unit tests: Agent model manager, phase detector, model selector
- Integration tests: Task tool integration, cost tracking
- E2E tests: Full workflow from prompt to cost report

### Monitoring

```bash
# Cost dashboard
/specweave:costs 0003

# Sample output:
# Total Cost: $22.50
# Total Savings: $22.50 (50%)
# Haiku usage: 70%
# Sonnet usage: 30%
```

## Related Documents

- [Increment 0003 Spec](../../increments/0003-intelligent-model-selection/spec.md)
- [Increment 0003 Plan](../../increments/0003-intelligent-model-selection/plan.md)
- [ADR-0011: Cost Tracking System](0012-cost-tracking.md)
- [ADR-0011: Phase Detection Algorithm](0013-phase-detection.md)

## References

- [Anthropic Pricing](https://www.anthropic.com/pricing)
- [Claude 4.5 Sonnet Announcement](https://www.anthropic.com/news/claude-4-5-sonnet)
- [Haiku 4.5 Announcement](https://www.anthropic.com/news/claude-4-5-haiku)

---

**Last Updated**: 2025-10-31
**Next Review**: 2025-12-01 (after 1 month of usage data)
