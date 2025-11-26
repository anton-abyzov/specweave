# ADR-0003-009: Phase Detection Algorithm

**Status**: Accepted
**Date**: 2025-10-30
**Increment**: [0003-intelligent-model-selection](../../../../increments/0003-intelligent-model-selection/)

---

## Context

Accurate phase detection is critical for intelligent model selection quality. Without accurate phase detection, the system might choose Haiku for planning tasks (poor quality) or Sonnet for execution tasks (unnecessary cost).

---

## Decision

Use multi-signal heuristic algorithm combining keywords, commands, context, and explicit hints.

---

## Algorithm

### Signal Weights

1. **Keyword Analysis** (40% weight)
   - Planning: "plan", "design", "analyze", "research", "architecture", "decide"
   - Execution: "implement", "build", "create", "write", "code", "generate"
   - Review: "review", "validate", "audit", "assess", "check", "verify"

2. **Command Analysis** (30% weight)
   - Planning: `/specweave:inc`, `/spec-driven-brainstorming`, `/increment-planner`
   - Execution: `/specweave:do`, `/do`, task execution within increment
   - Review: `/specweave:validate`, `/specweave:done`, quality checks

3. **Context Analysis** (20% weight)
   - Current increment state (planned → Sonnet, in-progress → Haiku)
   - Previous task types in session
   - Files being modified (architecture docs → Sonnet, code files → Haiku)

4. **Explicit Hints** (10% weight)
   - User mentions "plan" or "implement" directly
   - Tool selection (Write → execution, Read → analysis)

### Decision Matrix

```
Score > 0.7:    High confidence → Use detected phase
Score 0.4-0.7:  Medium confidence → Use agent preference
Score < 0.4:    Low confidence → Use agent preference + prompt user
```

---

## Accuracy Target

**95% on common workflows** (validated via test suite)

---

## Fallback Strategy

When confidence < 0.4:
1. Use agent preference (safe default)
2. Log decision with low confidence warning
3. User can override if needed

---

## Future Improvements (v2)

**ML model trained on user feedback**:
- Collect user corrections when phase detection is wrong
- Train supervised learning model
- Target: 98%+ accuracy

**Deferred to v2** - Heuristic is sufficient for v1

---

## Implementation

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

---

## Consequences

### Positive
- ✅ Good accuracy on common workflows (95% target)
- ✅ Conservative confidence thresholds (prefer safe defaults)
- ✅ All decisions logged with reasoning (transparency)

### Neutral
- ⚠️ Heuristic-based (not perfect)
  - Mitigated by: user override always available
  - Mitigated by: logging for analysis
  - Mitigated by: future ML model for v2

---

## Related

- **ADR**: [Intelligent Model Selection](0003-007-intelligent-model-selection.md) - Overall architecture
- **Increment**: [0003-intelligent-model-selection](../../../../increments/0003-intelligent-model-selection/)
