---
sidebar_position: 5
title: "Lesson 4: The :next Command"
description: "Your workflow compass"
---

# Lesson 4: The `:next` Command

**Time**: 25 minutes
**Goal**: Master the one command that handles everything

---

## Why `:next` is Your Best Friend

### The Old Way

```
"I finished the feature..."
"What command closes it?"
"Did I update the docs?"
"What's in the backlog?"
*opens documentation*
*forgets what they were doing*
```

### The SpecWeave Way

```bash
/sw:next
```

That's it. The system:
1. Finds active work
2. Validates completion
3. Closes if ready
4. Suggests what's next

**You stay in flow.**

---

## The Decision Tree

```
                    /sw:next
                          │
           ┌──────────────┴──────────────┐
           │                              │
    Active increment?              No active work
           │                              │
           ▼                              ▼
    Run PM validation             Check backlog
           │                              │
    ┌──────┴──────┐               ┌───────┴───────┐
    │              │               │               │
All gates      Some gates      Has items      Empty
  PASS          FAIL               │               │
    │              │               ▼               ▼
    ▼              ▼          "Start         "Create new
Auto-close    Present         0002?"        increment?"
    │         options
    ▼
Suggest next
```

---

## Scenario 1: All Gates Pass (Happy Path)

**Situation**: Work complete, tests pass, docs updated.

```bash
/sw:next
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKING ACTIVE INCREMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Active: 0001-user-authentication

PM VALIDATION:
  ✅ Gate 1: Tasks (12/12 complete)
  ✅ Gate 2: Tests (47/47 passing, 89% coverage)
  ✅ Gate 3: Docs (all updated)

STATUS: ✅ READY TO CLOSE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTO-CLOSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ Status: in-progress → completed
  ✓ Completion date: 2025-11-25

🎉 Increment 0001 CLOSED!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT WORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found in backlog:
  0002-payment-processing (P1)

Recommendation: Start 0002

Next: /sw:do 0002
```

---

## Scenario 2: Gates Fail (Work Remaining)

**Situation**: Some tasks incomplete.

```bash
/sw:next
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PM VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Gate 1: Tasks (10/12 complete)
   Missing:
     T-011: Add rate limiting (P1)
     T-012: Update README (P2)

✅ Gate 2: Tests (42/42 passing)

❌ Gate 3: Docs (CLAUDE.md not updated)

STATUS: ❌ NOT READY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A. Complete remaining work (recommended)
   → ~3 hours estimated

B. Force close with deferrals
   → Move T-011, T-012 to next increment

C. Continue working (no action)
   → Run /sw:do to resume

What would you like to do? [A/B/C]
```

---

## Scenario 3: No Active Work

**Situation**: No [increment](/docs/glossary/terms/increments) in progress.

```bash
/sw:next
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NO ACTIVE INCREMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recent work:
  ✅ 0001-authentication (closed 2 days ago)
  ✅ 0002-payments (closed yesterday)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUGGESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Backlog items:
  1. 0003-notifications (P1)
  2. 0004-dashboard (P2)

Options:
A. Start 0003 → /sw:do 0003
B. Start 0004 → /sw:do 0004
C. Create new → /sw:increment "description"
```

---

## Scenario 4: [WIP Limit](/docs/glossary/terms/wip-limits) Warning

**Situation**: Multiple increments in progress.

```bash
/sw:next
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  WIP LIMIT WARNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Multiple increments in-progress (2/2 at limit)

Active:
  0002-payment-processing    ████████░░  55%
  0003-notification-system   ████░░░░░░  30%

⚠️  Recommendation: Focus on completing ONE

Which should we close first?
A. 0002-payment-processing (55% → 100%)
B. 0003-notification-system (30% → 100%)
C. Cancel (continue as-is)
```

---

## When to Use `:next`

| Situation | Use `:next`? |
|-----------|--------------|
| "I think I'm done" | ✅ Yes |
| "What should I work on?" | ✅ Yes |
| "Let's move forward" | ✅ Yes |
| "Just finished that task" | ✅ Yes |
| "Need to check status" | ❌ Use `/sw:progress` |
| "Want to start specific feature" | ❌ Use `/sw:increment` |
| "Need to pause work" | ❌ Use `/sw:pause` |

---

## The `:next` Mindset

> **When in doubt, type `:next`.**

It will either:
- Close your work (if ready)
- Tell you what's missing (if not ready)
- Suggest what's next (if nothing active)

---

## Quick Exercise

```bash
# Try :next on your current project
/sw:next

# Observe what happens based on your state
```

---

## Glossary Terms Used

- **[Increment](/docs/glossary/terms/increments)** — A unit of work
- **[WIP Limits](/docs/glossary/terms/wip-limits)** — Work-in-progress constraints
- **[Acceptance Criteria](/docs/glossary/terms/acceptance-criteria)** — Success conditions validated by gates

---

## Key Takeaways

1. `:next` is your **workflow compass**
2. It **validates** before closing
3. It **suggests** next work
4. **When in doubt**, type `:next`

---

## What's Next?

Learn about the quality gates that `:next` validates.

**:next** → [Lesson 5: Quality Gates](./05-quality-gates)
