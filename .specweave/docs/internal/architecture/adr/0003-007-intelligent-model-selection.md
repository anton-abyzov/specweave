# ADR-0003-007: Intelligent Model Selection Architecture

**Status**: Accepted
**Date**: 2025-10-30
**Increment**: [0003-intelligent-model-selection](../../../../increments/0003-intelligent-model-selection/)

---

## Context

SpecWeave needs automatic cost optimization while maintaining quality. Users want to reduce AI costs without manual model selection for every task.

---

## Decision

Implement 3-layer intelligent model selection system:
1. **Agent Preferences** (Layer 1): Static intelligence - each agent declares preferred model
2. **Phase Detection** (Layer 2): Dynamic intelligence - detect planning vs execution vs review
3. **Model Selector** (Layer 3): Decision engine - combine preferences + phase + config

---

## Rationale

- Aligns with Anthropic official guidance (Sonnet for planning, Haiku for execution)
- Backward compatible (manual override always available)
- Transparent (all decisions logged)
- Quality-first (automatic fallback if Haiku fails)

---

## Alternatives Considered

### 1. Manual Only
**Rejected**: Poor UX, requires AI model expertise from users

### 2. Always Haiku
**Rejected**: Quality degradation on planning tasks (architecture, requirements analysis)

### 3. ML-Based Prediction
**Deferred**: Too complex for v1, requires training data

---

## Consequences

### Positive
- ✅ 60-70% cost savings expected
- ✅ Zero configuration required
- ✅ Transparent decision-making (all decisions logged)
- ✅ Quality-first design (automatic fallback to Sonnet)

### Neutral
- ⚠️ Phase detection may be wrong occasionally
  - Mitigated by: logging + manual override always available

---

## Implementation

### Agent Model Preferences (YAML Extension)

```yaml
---
name: pm
description: Product Manager agent
model_preference: sonnet  # sonnet|haiku|auto
cost_profile: planning     # planning|execution|hybrid
fallback_behavior: auto    # strict|flexible|auto
---
```

### Phase Detection Algorithm

Multi-signal heuristic:
- Keyword Analysis (40% weight)
- Command Analysis (30% weight)
- Context Analysis (20% weight)
- Explicit Hints (10% weight)

### Model Selector Decision Matrix

```
Score > 0.7: High confidence → Use detected phase
Score 0.4-0.7: Medium confidence → Use agent preference
Score < 0.4: Low confidence → Use agent preference + prompt user
```

---

## Related

- **ADR**: [Cost Tracking System](0003-008-cost-tracking-system.md) - How costs are measured
- **ADR**: [Phase Detection Algorithm](0003-009-phase-detection-algorithm.md) - Detection details
- **Increment**: [0003-intelligent-model-selection](../../../../increments/0003-intelligent-model-selection/)
