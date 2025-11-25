---
sidebar_position: 5
title: "Lesson 4: Mastering :next"
description: "Deep dive into the workflow continuation command"
---

# Lesson 4: Mastering the `:next` Command

**Duration**: 30 minutes
**Prerequisites**: Lessons 1-3 completed
**Outcome**: Understand all `:next` scenarios and become a workflow expert

---

## Why `:next` is Your Best Friend

### The Old Way (Cognitive Overhead)

```
Developer: "I finished the feature..."
Brain: "What command closes it?"
Developer: "Did I update the docs?"
Brain: "Should I run tests first?"
Developer: "What's in the backlog?"
Brain: "How do I start the next one?"
Developer: *opens documentation*
Developer: *forgets what they were doing*
```

### The SpecWeave Way (Flow State)

```bash
/specweave:next
```

That's it. The system:
1. Finds active work
2. Validates completion
3. Closes if ready
4. Suggests what's next

**You stay in flow.**

---

## The `:next` Decision Tree

```
                        /specweave:next
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
    All gates     Some gates      Has items      Empty backlog
      PASS          FAIL              │               │
        │              │              ▼               ▼
        ▼              ▼          "Start           "Create new
    Auto-close    Present         0002?"          increment?"
        │         options
        ▼
    Run QA
        │
        ▼
    Suggest next
```

---

## Scenario 1: All Gates Pass (Happy Path)

**Situation**: You've completed all work, tests pass, docs updated.

```bash
/specweave:next
```

**Output**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKING ACTIVE INCREMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Active: 0001-user-authentication

PM VALIDATION:
  ✅ Gate 1: Tasks (12/12 complete)
  ✅ Gate 2: Tests (47/47 passing, 89% coverage)
  ✅ Gate 3: Docs (all updated)

STATUS: ✅ READY TO CLOSE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTO-CLOSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ Status: in-progress → completed
  ✓ Completion date: 2025-11-25
  ✓ WIP freed: 1/2 → 0/2

🎉 Increment 0001 CLOSED!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST-CLOSURE QA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Score: 87/100 (GOOD)
Quality Gate: ✅ PASS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT WORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found in backlog:
  0002-payment-processing (P1)
    → Stripe integration
    → Dependencies: 0001 ✅

Recommendation: Start 0002

Next: /specweave:do 0002
```

**What happened**:
1. Found active increment (0001)
2. Validated all 3 gates → PASS
3. Auto-closed increment
4. Ran quality assessment
5. Found backlog item (0002)
6. Suggested next action

---

## Scenario 2: Gates Fail (Work Remaining)

**Situation**: Some tasks incomplete or tests failing.

```bash
/specweave:next
```

**Output**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKING ACTIVE INCREMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Active: 0001-user-authentication

PM VALIDATION:
  ❌ Gate 1: Tasks (10/12 complete)
     Missing:
       T-011: Add rate limiting (P1, 2h)
       T-012: Update README (P2, 30m)

  ✅ Gate 2: Tests (42/42 passing, 85% coverage)

  ❌ Gate 3: Docs
     Missing:
       CLAUDE.md not updated

STATUS: ❌ NOT READY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A. Complete remaining work (recommended)
   → T-011: Rate limiting - 2 hours
   → T-012: README - 30 min
   → Update CLAUDE.md - 15 min
   → Total: ~3 hours

B. Force close with deferrals
   → Move T-011, T-012 to next increment
   → Document deferral reasons
   → Close 0001 as "completed with deferrals"

C. Continue working (no action)
   → Stay on 0001
   → Run /specweave:do to resume

What would you like to do? [A/B/C]
```

**Your options**:

### Option A: Complete the Work

```
A

Resuming increment 0001...
Run /specweave:do to continue at T-011
```

### Option B: Force Close

```
B

⚠️  Force closing with deferrals...

Deferred tasks moved to 0002-deferred-items:
  - T-011: Rate limiting
  - T-012: README update

0001 closed as "completed with deferrals"

Note: This adds technical debt. Consider prioritizing
deferred items in next increment.
```

### Option C: No Action

```
C

No action taken. Increment 0001 remains in-progress.

Tip: Run /specweave:progress to see current status
```

---

## Scenario 3: No Active Work

**Situation**: No increment is in-progress.

```bash
/specweave:next
```

**Output**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKING ACTIVE INCREMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No active increments found.

Recent work:
  ✅ 0001-authentication (closed 2 days ago)
  ✅ 0002-payments (closed yesterday)

Current WIP: 0/2 (both slots available)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT WORK SUGGESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Backlog items found:

1. 0003-notifications (P1)
   → Email + push notifications
   → Dependencies: 0002 ✅

2. 0004-dashboard (P2)
   → Analytics dashboard
   → Dependencies: None

Recommendation: Start 0003-notifications

Options:
A. Start 0003 → /specweave:do 0003
B. Start 0004 → /specweave:do 0004
C. Create new → /specweave:increment "description"
```

---

## Scenario 4: Multiple Active Increments (WIP Warning)

**Situation**: You have 2 increments in-progress (at WIP limit).

```bash
/specweave:next
```

**Output**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  WIP LIMIT WARNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Multiple increments in-progress (2/2 at WIP limit)

Active increments:
┌─────────────────────────────────────────────────────────┐
│ 0002-payment-processing (55% complete)                  │
│   Last activity: 2 hours ago                            │
│   Next task: T-007 (Stripe webhook handling)            │
├─────────────────────────────────────────────────────────┤
│ 0003-notification-system (30% complete)                 │
│   Last activity: 1 day ago                              │
│   Next task: T-004 (Email templates)                    │
└─────────────────────────────────────────────────────────┘

⚠️  Recommendation: Focus on completing ONE increment
    before starting new work.

Which increment should we focus on?
A. Close 0002-payment-processing (55% → 100%)
B. Close 0003-notification-system (30% → 100%)
C. Cancel (continue working as-is)

Your choice? [A/B/C]
```

---

## Scenario 5: QA Concerns After Closure

**Situation**: Gates pass, but quality assessment finds issues.

```bash
/specweave:next
```

**Output** (after auto-close):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST-CLOSURE QUALITY ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Score: 68/100 (CONCERNS)

Dimensions:
  Clarity:         85/100 ✓
  Testability:     75/100 ✓
  Completeness:    70/100 ⚠
  Feasibility:     90/100 ✓✓
  Maintainability: 55/100 ⚠
  Edge Cases:      60/100 ⚠
  Risk Assessment: 65/100 ⚠

RISKS IDENTIFIED:
  HIGH: SQL injection in search query (P: 7, I: 9)
  MEDIUM: Rate limiting not implemented (P: 5, I: 6)

Quality Gate: 🟡 CONCERNS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issues logged for future attention:
  → .specweave/increments/0001/reports/qa-concerns.md

Recommendation: Address HIGH risks in next increment

Proceeding to next work suggestions...
```

**Note**: QA runs AFTER closure — it doesn't block delivery but flags issues for improvement.

---

## Scenario 6: QA Fails (Critical Issues)

**Situation**: Quality assessment finds critical problems.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST-CLOSURE QUALITY ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Score: 52/100 (POOR)

Quality Gate: 🔴 FAIL

CRITICAL ISSUES:
  • No input validation on user registration
  • Passwords stored in plain text (!)
  • No HTTPS enforcement

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  SECURITY VULNERABILITIES DETECTED

Recommendation: Create hotfix increment immediately

Options:
A. Create hotfix increment 0002-security-fixes (recommended)
B. Log as technical debt and continue
C. Review issues and decide later

What would you like to do? [A/B/C]
```

---

## When to Use `:next`

| Situation | Use `:next`? |
|-----------|--------------|
| "I think I'm done" | ✅ Yes |
| "What should I work on?" | ✅ Yes |
| "Let's move forward" | ✅ Yes |
| "Just finished that task" | ✅ Yes |
| "Need to check status" | ❌ Use `/specweave:progress` |
| "Want to start specific feature" | ❌ Use `/specweave:increment` |
| "Need to pause work" | ❌ Use `/specweave:pause` |

---

## The `:next` Mindset

Think of `:next` as your **workflow compass**:

```
Traditional Developer:
  "What command do I need?"
  "Did I forget something?"
  "What's the right order?"

SpecWeave Developer:
  /specweave:next
  (System handles everything)
  (Developer stays in flow)
```

### The Rule

> **When in doubt, type `:next`.**

It will either:
- Close your work (if ready)
- Tell you what's missing (if not ready)
- Suggest what's next (if nothing active)

---

## Practice Exercise

**Goal**: Experience all `:next` scenarios

### Exercise 1: Happy Path

```bash
# Create a small increment
/specweave:increment "Add footer copyright"

# Execute
/specweave:do

# Close with :next
/specweave:next
# Should auto-close and suggest next
```

### Exercise 2: Incomplete Work

```bash
# Create increment
/specweave:increment "Add multi-language support"

# Partially execute (stop early)
/specweave:do --until T-002

# Try :next
/specweave:next
# Should show options A/B/C
```

### Exercise 3: Empty State

```bash
# Make sure no active increments
# (complete or abandon any in-progress)

# Run :next
/specweave:next
# Should show backlog or prompt for new
```

---

## Summary

The `:next` command is:

1. **Your workflow compass** — Always knows what's next
2. **Quality enforcer** — Validates before closing
3. **Context preserver** — Runs QA, logs issues
4. **Suggestion engine** — Finds backlog items

**Remember**: When in doubt, type `:next`.

:next → [Lesson 5: Quality Gates Deep Dive](./05-quality-gates)
