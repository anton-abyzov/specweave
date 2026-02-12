---
sidebar_position: 8
title: "Prompt is Too Long" — Context Exhaustion
description: Why Claude Code shows "prompt is too long" during long sessions and how SpecWeave's increment-based workflow eliminates the problem
keywords: [prompt too long, context window, context exhaustion, session restart, context evaporation]
---

# "Prompt is Too Long" — Context Exhaustion

## The Problem

During extended Claude Code sessions, you'll eventually hit this error:

```
prompt is too long
```

This happens because Claude Code has a finite context window. As your conversation grows — code reads, edits, tool outputs, explanations — the accumulated context exceeds the model's limit. Your session effectively ends.

**What you lose:**
- Architecture decisions made earlier in the session
- Understanding of your codebase that Claude built up over time
- The "flow state" where Claude understood exactly what you were doing
- All the context you spent 10-15 minutes loading at the start

**What happens next:**
- You start a fresh session
- Re-explain your project structure
- Re-describe what you were working on
- Re-load the same files Claude already read
- Repeat decisions that were already made

This cycle — build context, lose it, rebuild it — is one of the most frustrating aspects of AI-assisted development. It's not a bug; it's a fundamental limitation of how LLMs work.

## Why This Isn't a SpecWeave Issue

SpecWeave's hooks (UserPromptSubmit, SessionStart, etc.) inject minimal context:
- **UserPromptSubmit**: 500-3000 characters of active increment status, TDD mode, and skill hints
- **SessionStart**: Less than 100 characters (continuation signal)
- **Reflection memories**: 500-1500 characters per skill (optional)

These are small compared to Claude Code's context window (200K+ tokens). The "prompt is too long" error comes from accumulated conversation history, not from SpecWeave's hook outputs.

## How SpecWeave Solves This

SpecWeave's increment-based workflow turns context exhaustion from a showstopper into a non-event.

### Before SpecWeave (Vibe Coding)

```
Session 1: Explain project → Load context → Build feature → ERROR: prompt too long
Session 2: Re-explain project → Re-load context → Continue feature → ERROR again
Session 3: Re-explain AGAIN → Forget earlier decisions → Build differently → Bugs
```

Every restart costs 10-15 minutes of re-explaining before productive work begins.

### With SpecWeave (Spec-Driven)

```
Session 1: /sw:increment → Build tasks T-001 through T-005 → Context exhausted
Session 2: Claude reads spec.md + tasks.md → Sees T-005 done, starts T-006 → Full speed
Session 3: Claude reads same files → Continues exactly where it left off
```

**Why this works:**
1. **spec.md** captures WHAT you're building and WHY (user stories, acceptance criteria)
2. **plan.md** captures HOW (architecture decisions, tech choices, ADRs)
3. **tasks.md** captures WHERE you are (completed tasks checked off, next task clear)

Claude reads these three files in seconds and has full context. No re-explaining. No repeating yourself. No lost decisions.

### The Key Insight

> When you follow the discipline — create increments, write specs, break work into tasks — you can restart at ANY point. It's not vibe coding anymore. It's structured, disciplined development where context is permanent, not ephemeral.

## Best Practices

### Keep Increments Small
- **5-15 tasks** per increment (golden rule)
- **1-3 user stories** per increment
- Smaller increments = less context needed per session
- Each task is independently resumable

### Use `/sw:do` for Task-by-Task Execution
Instead of long freeform sessions, use `/sw:do` to work through tasks systematically. Each task is a self-contained unit that Claude can pick up from scratch.

### Mark Progress Immediately
Check off tasks in `tasks.md` as you complete them. This is the breadcrumb trail that lets any future session know exactly where you left off.

### Let Specs Be Your Memory
Don't rely on conversation history for decisions. If an architecture choice matters, it belongs in `plan.md`. If a requirement matters, it belongs in `spec.md`. These files survive any number of session restarts.

## Related

- [Skill Truncation Budget](./skill-truncation-budget.md) — if skills aren't loading, check the character budget
- [Why SpecWeave?](/docs/overview/why-specweave) — the full case for spec-driven development
- [What is an Increment?](/docs/guides/core-concepts/what-is-an-increment) — understanding SpecWeave's fundamental unit of work
