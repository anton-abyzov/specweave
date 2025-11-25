---
sidebar_position: 9
title: "Lesson 8: AI Model Selection"
description: "Choose the right AI model for each task"
---

# Lesson 8: AI Model Selection Strategy

**Duration**: 30 minutes
**Prerequisites**: Lessons 1-7 completed
**Outcome**: Understand when to use Opus, Sonnet, or Haiku for optimal results and cost

---

## The AI Landscape in 2025

### Claude Model Family

| Model | Best For | Token Cost | Speed |
|-------|----------|------------|-------|
| **Opus 4.5** | Complex architecture, multi-file refactoring | $$$ | Slower |
| **Sonnet 4** | Daily coding, feature implementation | $$ | Fast |
| **Haiku 3.5** | Quick lookups, simple edits, bulk operations | $ | Fastest |

### Key Insight

> **The most expensive model isn't always the best choice.**
>
> Using Opus for a typo fix is like using a sledgehammer for a thumbtack.

---

## Model Selection by Task Type

### Use Opus 4.5 When:

```
✅ Architecture decisions
✅ Complex multi-file refactoring
✅ System design and planning
✅ Debugging intricate issues
✅ Writing comprehensive specs
✅ Security reviews
✅ Performance optimization analysis
```

**Example Tasks**:
```bash
# Planning a new increment (uses Opus by default)
/specweave:increment "Implement real-time collaboration"

# Quality assessment
/specweave:qa 0001

# Architecture decisions
"Design the caching layer for 10M daily requests"
```

### Use Sonnet 4 When:

```
✅ Feature implementation
✅ Writing tests
✅ Code reviews
✅ Bug fixes
✅ Documentation updates
✅ Daily development tasks
```

**Example Tasks**:
```bash
# Executing increment tasks
/specweave:do

# Regular development
"Add input validation to the registration form"
"Write unit tests for UserService"
```

### Use Haiku 3.5 When:

```
✅ Quick lookups
✅ Simple file edits
✅ Bulk find-and-replace
✅ Formatting code
✅ Quick questions
✅ Syntax checks
```

**Example Tasks**:
```bash
# Quick lookups
"What's the export name in utils/constants.ts?"

# Simple edits
"Change the button color from blue to green"

# Bulk operations
"Add 'use strict' to all JavaScript files"
```

---

## SpecWeave's Smart Model Selection

### Default Behavior

SpecWeave automatically selects models based on task complexity:

```
/specweave:increment    → Opus 4.5 (complex planning)
/specweave:do           → Sonnet 4 (balanced execution)
/specweave:qa           → Opus 4.5 (deep analysis)
/specweave:sync-progress → Haiku 3.5 (fast sync)
```

### Agent Model Configuration

When spawning agents, specify the model:

```typescript
// Complex architecture task
Task({
  subagent_type: "specweave:architect:architect",
  model: "opus",  // Use Opus for architecture
  prompt: "Design authentication system"
});

// Quick exploration
Task({
  subagent_type: "Explore",
  model: "haiku",  // Fast, cheap exploration
  prompt: "Find all files importing AuthService"
});

// Standard implementation
Task({
  subagent_type: "specweave:tech-lead:tech-lead",
  model: "sonnet",  // Balanced for coding
  prompt: "Implement the login endpoint"
});
```

---

## Cost Optimization Strategies

### Strategy 1: Progressive Complexity

Start cheap, escalate as needed:

```
Step 1: Haiku exploration
  "What files handle authentication?"
  Cost: ~$0.001

Step 2: Sonnet analysis
  "Explain the auth flow in these 3 files"
  Cost: ~$0.02

Step 3: Opus architecture (if needed)
  "Redesign auth to support multi-tenant"
  Cost: ~$0.15
```

### Strategy 2: Batch Similar Tasks

Group cheap operations:

```bash
# ❌ Expensive: 10 separate Opus calls
"Fix typo in file1.ts"
"Fix typo in file2.ts"
...

# ✅ Cheap: 1 Haiku bulk operation
"Fix all typos: file1.ts, file2.ts, ... file10.ts"
```

### Strategy 3: Cache Exploration Results

```bash
# First time: Explore with Haiku, save results
/specweave:do --explore-only

# Implementation: Use Sonnet with cached context
/specweave:do --continue
```

---

## Real-World Scenarios

### Scenario 1: New Feature Planning

```
Task: "Add payment processing"

Phase 1: Research (Haiku)
  → "What payment libraries exist in package.json?"
  → "Find existing payment-related code"
  Cost: $0.005

Phase 2: Planning (Opus)
  → /specweave:increment "Payment processing"
  → Generates spec.md, plan.md, tasks.md
  Cost: $0.20

Phase 3: Implementation (Sonnet)
  → /specweave:do
  → Implements each task
  Cost: $0.15 × 8 tasks = $1.20

Total: ~$1.40 (vs ~$3.00 all-Opus)
```

### Scenario 2: Bug Investigation

```
Task: "Users can't log in after password reset"

Phase 1: Gather Info (Haiku)
  → "Show me the password reset flow"
  → "Find recent changes to auth files"
  Cost: $0.003

Phase 2: Analyze (Sonnet → Opus if needed)
  → "Explain what changed in AuthService"
  → If complex: escalate to Opus
  Cost: $0.02 - $0.15

Phase 3: Fix (Sonnet)
  → Implement the fix
  Cost: $0.03

Total: ~$0.05 - $0.18
```

### Scenario 3: Refactoring

```
Task: "Extract common validation logic"

Phase 1: Identify (Haiku)
  → "Find all validation functions"
  → List 15 files with validation
  Cost: $0.002

Phase 2: Plan (Opus)
  → "Design unified validation library"
  → Creates architecture
  Cost: $0.15

Phase 3: Execute (Sonnet)
  → Refactor each file sequentially
  Cost: $0.10 × 15 files = $1.50

Total: ~$1.65
```

---

## Non-Claude AI Tools

### When to Use Other Tools

| Tool | Best For |
|------|----------|
| **GitHub Copilot** | Inline completions, boilerplate |
| **Cursor** | IDE-integrated AI editing |
| **ChatGPT** | General research, explanations |
| **Gemini** | Google ecosystem integration |

### SpecWeave Integration

SpecWeave is AI-model agnostic for documentation:

```markdown
<!-- spec.md can be written with any AI -->

## Feature: User Authentication

### User Stories
- US-001: As a user, I want to log in...

<!-- Then use Claude for implementation -->
/specweave:do
```

### Hybrid Workflow

```
1. Research with ChatGPT (free tier)
   → "Explain OAuth2 PKCE flow"

2. Plan with Claude Opus
   → /specweave:increment "OAuth2 PKCE authentication"

3. Code with Copilot (inline)
   → Tab-complete boilerplate

4. Implement with Claude Sonnet
   → /specweave:do

5. Review with Claude Opus
   → /specweave:qa
```

---

## Claude Desktop & Web Sessions

### Claude Desktop (2025)

New capabilities:

```
✅ Extended context (200K tokens)
✅ File system access
✅ Local tool execution
✅ Multi-modal input (images, PDFs)
✅ Persistent sessions
```

**With SpecWeave**:
```bash
# Claude Desktop can read your entire codebase
"Review the authentication module"
# → Reads all relevant files automatically
```

### Web Sessions

For quick tasks without CLI:

```
1. Go to claude.ai
2. Upload spec.md
3. Ask: "Review this spec for completeness"
4. Copy feedback back to local files
```

**Limitation**: No direct file system access in web

---

## Model Selection Cheat Sheet

```
┌─────────────────────────────────────────────────────────┐
│                  WHICH MODEL?                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  "I need to..."                                         │
│                                                         │
│  ┌─────────────────┐                                    │
│  │ Design/Architect │ ──────────────────► OPUS 4.5     │
│  │ Complex refactor │                                   │
│  │ Security review  │                                   │
│  └─────────────────┘                                    │
│                                                         │
│  ┌─────────────────┐                                    │
│  │ Write features  │ ──────────────────► SONNET 4     │
│  │ Fix bugs        │                                   │
│  │ Write tests     │                                   │
│  └─────────────────┘                                   │
│                                                         │
│  ┌─────────────────┐                                    │
│  │ Quick lookup    │ ──────────────────► HAIKU 3.5    │
│  │ Simple edit     │                                   │
│  │ Bulk operation  │                                   │
│  └─────────────────┘                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Configuration

### Setting Default Models

In `.specweave/config.json`:

```json
{
  "ai": {
    "defaultModel": "sonnet",
    "planningModel": "opus",
    "executionModel": "sonnet",
    "explorationModel": "haiku"
  }
}
```

### Per-Increment Override

In `spec.md` frontmatter:

```yaml
---
increment: 0001-complex-refactor
ai:
  model: opus  # Use Opus for this complex increment
---
```

---

## Practice Exercise

### Exercise 1: Cost Comparison

```bash
# Try the same task with different models:

# Haiku (observe speed and quality)
"Using Haiku: explain the auth flow"

# Sonnet (compare)
"Using Sonnet: explain the auth flow"

# Opus (note the difference)
"Using Opus: explain the auth flow"
```

### Exercise 2: Progressive Escalation

```bash
# Start with Haiku
"Find all TODO comments in the codebase"

# Escalate to Sonnet for analysis
"Prioritize these TODOs by importance"

# Use Opus for planning
"Create an increment to address the top 5 TODOs"
```

---

## Summary

| Model | When to Use | Cost |
|-------|-------------|------|
| **Opus 4.5** | Architecture, complex analysis | $$$ |
| **Sonnet 4** | Daily development, features | $$ |
| **Haiku 3.5** | Quick tasks, exploration | $ |

**Golden Rules**:
1. Start cheap (Haiku), escalate as needed
2. Use Opus for planning, Sonnet for execution
3. Batch similar operations
4. Cache exploration results

:next → [Lesson 9: Troubleshooting](./09-troubleshooting)
