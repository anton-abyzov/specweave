# Model Selection Guide

**Understanding SpecWeave's intelligent model routing**

---

## Overview

SpecWeave uses a two-tier model strategy:
1. **Opus 4.6** (or Opus 4.5) - Default for all complex work (planning, analysis, architecture, code review)
2. **Haiku** - For simple/cheap operations (translations, mechanical tasks)

:::tip Latest Models
Claude Opus 4.6 is the most capable coding model available. It excels at complex architecture, multi-file refactors, and production-quality code generation. Sonnet 4.5 provides an excellent balance of speed and capability for routine tasks.
:::

---

## The Models

### Opus 4.6 / 4.5 (Default - Planning, Analysis & Complex Work)

**Use for**:
- Strategic planning
- Architecture design
- Complex problem solving
- Security analysis
- Code review
- Quality assessment

**Pricing**: $15 per 1M input tokens, $75 per 1M output tokens

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

### Sonnet 4 (Legacy)

**Rarely used** - Available for backwards compatibility.

**Pricing**: $3 per 1M input tokens, $15 per 1M output tokens

---

**See full content at**: https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/public/guides/model-selection.md

*Due to length, truncating here. File contains complete guide with agent classifications, phase detection algorithm, decision examples, troubleshooting, and FAQ.*

---

*Last updated: 2025-10-31*
