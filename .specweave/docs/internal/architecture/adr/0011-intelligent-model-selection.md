---
id: adr-0011-intelligent-model-selection
title: "ADR-0011: Intelligent Model Selection (SUPERSEDED)"
sidebar_label: "0011: Model Selection (Superseded)"
---

# ADR-0011: Intelligent Model Selection (SUPERSEDED)

---
**⚠️ SUPERSEDED**: This ADR has been superseded.

**See instead**: [ADR-0003: Intelligent Model Selection Architecture](./0003-intelligent-model-selection)

**Date Superseded**: 2025-11-13 (Updated: 2025-11-26)
**Reason**: Consolidated into ADR-0003 which is the canonical intelligent model selection decision.
---

## Original Content (Archived)

**Status**: Superseded (was: Accepted)
**Date**: 2025-10-31
**Deciders**: Core Team
**Related**: Increment 0003-intelligent-model-selection

## Context

SpecWeave agents perform two fundamentally different types of work:
- **Planning**: Strategy, architecture, requirements analysis (high complexity)
- **Execution**: Implementation, refactoring, data processing (mechanical)

Using Sonnet 4.5 ($3/$15 per 1M tokens) for all work wastes ~60-70% of budget on execution tasks that Haiku 4.5 ($1/$5 per 1M tokens) handles equally well.

## Decision

See [ADR-0003](./0003-intelligent-model-selection) for the canonical decision covering:
- 3-layer intelligent model selection system
- Agent preferences
- Phase detection
- Model selector logic

## Related

- **Canonical ADR**: [ADR-0003: Intelligent Model Selection Architecture](./0003-intelligent-model-selection)
- **Specific Use Case**: [ADR-0151: Reflection Model Selection](./0151-reflection-model-selection) (for self-reflection system specifically)
