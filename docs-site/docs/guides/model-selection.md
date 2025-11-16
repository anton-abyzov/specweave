# Model Selection Guide

**Understanding SpecWeave's intelligent model routing**

---

## Overview

SpecWeave uses a three-layer intelligent system to automatically choose the best AI model for each task:
1. **Agent Preferences** - Each agent declares its optimal model
2. **Phase Detection** - Analyzes your prompt to detect planning vs execution
3. **Model Selector** - Combines all signals to make the final decision

---

## The Three Models

### Sonnet 4.5 (Planning & Strategy)

**Use for**:
- Strategic planning
- Architecture design
- Complex problem solving
- Security analysis
- Code review

**Pricing**: $3 per 1M input tokens, $15 per 1M output tokens

**Characteristics**:
- Deep reasoning
- Complex analysis
- Strategic thinking
- High accuracy

### Haiku 4.5 (Execution & Implementation)

**Use for**:
- Code implementation
- Refactoring
- Data processing
- Configuration generation
- Test writing

**Pricing**: $1 per 1M input tokens, $5 per 1M output tokens

**Characteristics**:
- Fast execution (2x Sonnet speed)
- Excellent code generation
- Pattern recognition
- Cost-effective

### Opus 4.0 (Coming Soon)

**Use for**:
- Extremely complex reasoning
- Novel algorithm design
- Research-level tasks

**Pricing**: $15 per 1M input tokens, $75 per 1M output tokens

---

**See full content at**: https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/public/guides/model-selection.md

*Due to length, truncating here. File contains complete guide with agent classifications, phase detection algorithm, decision examples, troubleshooting, and FAQ.*

---

*Last updated: 2025-10-31 | SpecWeave v0.4.0*
