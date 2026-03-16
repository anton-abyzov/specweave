# Model Selection Guide

**Understanding SpecWeave's intelligent model routing**

---

## Overview

SpecWeave uses a two-tier model strategy:
1. **Opus 4.6** - Default for all complex work (planning, analysis, architecture, code review)
2. **Haiku** - For simple/cheap operations (translations, mechanical tasks)

---

## The Models

### Opus 4.6 (Default - Planning, Analysis & Complex Work)

**Use for**:
- Strategic planning
- Architecture design
- Complex problem solving
- Security analysis
- Code review
- Quality assessment

**Pricing**: $5 per 1M input tokens, $25 per 1M output tokens

**Characteristics**:
- Deepest reasoning
- Highest quality analysis
- Best for complex tasks
- Default for all agents

### Haiku 4.5 (Simple & Cheap Operations)

**Use for**:
- Translations
- Mechanical execution
- Simple data processing
- Configuration generation
- Routine tasks

**Pricing**: $1 per 1M input tokens, $5 per 1M output tokens

**Characteristics**:
- Fast execution
- Cost-effective
- Good for repetitive tasks
- Used when task has detailed spec

### Sonnet 4.6 (Balanced)

**Use for balanced speed and quality** - Good middle ground between Opus and Haiku.

**Pricing**: $3 per 1M input tokens, $15 per 1M output tokens

---

## Recommended: `/model opusplan`

Claude Code provides a hybrid model alias that works perfectly with SpecWeave's plan-mode-first workflow:

```bash
/model opusplan
```

This sets Opus 4.6 for plan mode (specs, architecture, analysis) and Sonnet 4.6 for execution (implementation, tests). Since SpecWeave mandates plan mode for all non-trivial work, you automatically get Opus reasoning where it matters most and Sonnet speed+savings during implementation.

See the [Cost Optimization Guide](./cost-optimization.md#4-use-model-opusplan-for-optimal-cost-quality-balance) for detailed savings estimates.

---

**See full content at**: https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/public/guides/model-selection.md

*Due to length, truncating here. File contains complete guide with agent classifications, phase detection algorithm, decision examples, troubleshooting, and FAQ.*

---

*Last updated: 2026-03-01 | SpecWeave v1.0.342*
