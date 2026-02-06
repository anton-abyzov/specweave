---
sidebar_position: 9
slug: 08-ai-model-selection
title: "Lesson 8: AI Model Selection"
description: "Choose the right model for each task"
---

# Lesson 8: AI Model Selection

**Time**: 25 minutes
**Goal**: Optimize cost and quality by choosing the right model

---

## Claude Models

| Model | Best For | Cost | Speed |
|-------|----------|------|-------|
| **Opus 4.6** | All complex work (latest, most capable) | $$$ | Best quality |
| **Opus 4.5** | Complex work (previous generation) | $$$ | Best quality |
| **Sonnet 4.5** | Balanced speed + capability | $$ | Fast |
| **Haiku 4.5** | Quick lookups, simple edits | $ | Fastest |

> **Opus 4.6 is the most capable coding model available and the recommended default.**
> Use Sonnet 4.5 for routine tasks. Use Haiku for mechanical tasks to save costs.

---

## When to Use Each Model

### Opus 4.6 / 4.5

```
✅ Architecture decisions
✅ Complex multi-file refactoring
✅ System design
✅ Security reviews
✅ Comprehensive specs
```

**Example commands:**
```bash
/sw:increment "..."  # Uses Opus for planning
/sw:qa 0001          # Uses Opus for analysis
```

### Haiku 4.5

```
✅ Quick lookups
✅ Simple file edits
✅ Bulk find-and-replace
✅ Syntax checks
```

**Example:**
```
"What's the export name in utils/constants.ts?"
"Change button color from blue to green"
```

---

## SpecWeave Default Selection

SpecWeave picks automatically:

```
/sw:increment    → Opus (complex planning)
/sw:do           → Sonnet (balanced execution)
/sw:qa           → Opus (deep analysis)
/sw:sync-progress → Haiku (fast sync)
```

---

## Cost Optimization

### Strategy 1: Progressive Escalation

Start cheap, escalate as needed:

```
Step 1: Haiku exploration
  "What files handle authentication?"
  Cost: ~$0.001

Step 2: Sonnet analysis
  "Explain the auth flow"
  Cost: ~$0.02

Step 3: Opus architecture (if needed)
  "Redesign for multi-tenant"
  Cost: ~$0.15
```

### Strategy 2: Batch Similar Tasks

```
❌ Expensive: 10 separate Opus calls
  "Fix typo in file1.ts"
  "Fix typo in file2.ts"
  ...

✅ Cheap: 1 Haiku bulk operation
  "Fix all typos: file1.ts, file2.ts, ..."
```

### Strategy 3: Explore First

```bash
# Cheap exploration with Haiku
/sw:do --explore-only

# Then implement with Sonnet
/sw:do --continue
```

---

## Real-World Example

**Task**: "Add payment processing"

| Phase | Model | Cost | Action |
|-------|-------|------|--------|
| Research | Haiku | $0.005 | Find existing code |
| Planning | Opus | $0.20 | Create increment |
| Implementation | Sonnet | $1.20 | Build 8 tasks |
| **Total** | | **$1.40** | vs $3.00 all-Opus |

---

## Configuration

### Default Models

In `.specweave/config.json`:

```json
{
  "ai": {
    "defaultModel": "opus",
    "planningModel": "opus",
    "explorationModel": "haiku"
  }
}
```

### Per-Increment Override

In spec.md frontmatter:

```yaml
---
increment: 0001-complex-refactor
ai:
  model: opus  # Use Opus throughout
---
```

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────┐
│              WHICH MODEL?                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  "I need to..."                                         │
│                                                         │
│  Design / Architect     ────────────► OPUS 4.5         │
│  Complex refactor                     (DEFAULT)         │
│  Security review                                        │
│  Feature implementation                                 │
│  Writing tests                                          │
│  Bug fixes                                              │
│                                                         │
│  Quick lookup           ────────────► HAIKU 4.5        │
│  Simple edit                                            │
│  Bulk operation                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Glossary Terms Used

- **[LLM](/docs/glossary/terms/llm)** — Large Language Model
- **Inference** — Using trained models

---

## Key Takeaways

1. **Start cheap** (Haiku), escalate as needed
2. **Use Opus** for planning, Sonnet for execution
3. **Batch** similar operations
4. **Cache** exploration results

---

## What's Next?

Learn how to fix common issues.

**:next** → [Lesson 9: Troubleshooting](./09-troubleshooting)
