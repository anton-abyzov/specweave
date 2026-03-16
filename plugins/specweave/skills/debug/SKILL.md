---
description: Systematic 4-phase debugging with escalation protocol. Use when saying "debug", "investigate bug", "find root cause", "why is this failing", or "fix this bug".
argument-hint: "<bug-description>"
allowed-tools: Read, Grep, Glob, Bash
context: fork
---

# Systematic Debugging

## Project Overrides

!`s="debug"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

## Iron Law

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

Random fixes waste time and mask underlying issues. If you haven't traced the bug to its origin, you don't understand it well enough to fix it.

---

## When to Use This Skill

- A test is failing and the cause isn't immediately obvious
- A bug report describes unexpected behavior
- Something "used to work" and now doesn't
- An error message is confusing or misleading
- You've already tried one fix and it didn't work

---

## Phase 1: Root Cause Investigation

**Goal**: Understand what's actually happening before proposing any fix.

1. **Read error messages completely** — including stack traces, line numbers, and surrounding context. Don't skim. The answer is often in the error message itself.

2. **Reproduce consistently** — if you can't reproduce it, you can't verify a fix. Document the exact reproduction steps.

3. **Check recent changes** — what changed since it last worked?
   ```bash
   git log --oneline -15
   git diff HEAD~5..HEAD -- <affected-files>
   ```

4. **Trace the data flow** — start from the error and work backward. At each component boundary, log what enters and what exits:
   - What data enters the failing function?
   - What data does it produce?
   - Where does the input come from?
   - Is the input what you expected?

5. **Identify affected code paths** — map which files, functions, and modules are involved. Read them fully — don't skim.

**Phase 1 output**: A clear statement of what is happening vs. what should happen, with evidence.

---

## Phase 2: Pattern Analysis

**Goal**: Find working analogues to understand how the system is supposed to behave.

1. **Find similar working code** — search for functions, patterns, or flows that do something analogous and work correctly.

2. **Compare implementations completely** — don't just spot-check. Enumerate ALL differences between working and broken:
   - Different function signatures?
   - Different error handling?
   - Different data transformations?
   - Different initialization order?

3. **Check for recurring patterns** — has this type of bug happened before? Search git history:
   ```bash
   git log --all --oneline --grep="<error-keyword>"
   ```

4. **Understand dependencies** — map what the broken code depends on. Has any dependency changed version, API, or behavior?

**Phase 2 output**: Ranked list of hypotheses, most likely first, with evidence for each.

---

## Phase 3: Hypothesis Testing

**Goal**: Systematically verify or eliminate each hypothesis. Scientific method — one variable at a time.

1. **State your hypothesis explicitly**: "I think X is happening because Y."

2. **Design a minimal test** for each hypothesis — change exactly ONE thing and observe the result.

3. **Execute and record**:
   - Hypothesis: [what you think is wrong]
   - Test: [what you changed]
   - Expected result: [what should happen if hypothesis is correct]
   - Actual result: [what actually happened]
   - Conclusion: [confirmed / eliminated / needs more data]

4. **Never make compound changes** — if you change two things and it works, you don't know which one fixed it. If you change two things and it doesn't work, you don't know if one of them was right.

5. **Maximum 3 hypotheses before escalation** — if your third hypothesis fails, STOP. You are likely missing something fundamental. Proceed to the Escalation Protocol.

**Phase 3 output**: Confirmed root cause with evidence, or escalation trigger.

---

## Phase 4: Implementation

**Goal**: Fix the confirmed root cause with a regression test.

1. **Write a failing test first** that reproduces the exact bug. The test must:
   - Fail before the fix (proving it catches the bug)
   - Pass after the fix (proving the fix works)

2. **Implement a single, targeted fix** — address only the confirmed root cause. Do not "fix other things while you're in there."

3. **Verify the fix**:
   ```bash
   # Run the regression test
   npx vitest run <test-file> -- --reporter=verbose

   # Run the full suite to check for side effects
   npx vitest run
   ```

4. **Verify no other tests broke** — a fix that breaks something else isn't a fix.

**Phase 4 output**: Passing regression test + clean full suite.

---

## Escalation Protocol

**Trigger**: 3 consecutive failed fix attempts OR 3 eliminated hypotheses without a confirmed root cause.

When triggered:

1. **STOP immediately.** Do not try a 4th fix.

2. **Present findings to the user**:
   ```
   ESCALATION: Root cause not confirmed after 3 attempts.

   What I investigated:
   - Hypothesis 1: [X] — Result: [eliminated because Y]
   - Hypothesis 2: [X] — Result: [eliminated because Y]
   - Hypothesis 3: [X] — Result: [eliminated because Y]

   What I know:
   - [fact 1]
   - [fact 2]

   What I suspect but cannot confirm:
   - [suspicion]

   Recommended next step:
   - [suggestion — e.g., "review the architecture of module X",
     "add instrumentation at boundary Y", "pair on this"]
   ```

3. **Question architectural assumptions** — if each fix reveals new problems in different places, the issue may be architectural, not a fixable bug. Say so explicitly.

---

## Red Flags

These phrases in your own thinking should trigger an immediate pause and return to Phase 1:

| Red Flag | What It Means |
|----------|---------------|
| "Quick fix for now" | You don't understand the root cause |
| "Skip the test" | You're not confident the fix works |
| "One more attempt" | You're past the escalation threshold |
| "It works on my machine" | You haven't reproduced it properly |
| "Probably not related" | You're dismissing evidence |
| "Let's ignore that for now" | You're avoiding complexity |
| "I'll investigate later" | You're deferring instead of understanding |
| "This shouldn't be possible" | Your mental model is wrong |

---

## Anti-Rationalization Table

| Excuse | Rebuttal | Why It Matters |
|--------|----------|----------------|
| "The fix is obvious, skip investigation" | Obvious fixes have a 40% first-time success rate. Investigation has 95%. | Skipping Phase 1 means you're guessing, not debugging |
| "I don't have time to investigate properly" | Systematic debugging takes 15-30 min. Guess-and-check takes 2-3 hours. | Investigation is faster than thrashing |
| "It's just a typo/config issue" | Then investigation will confirm that in 2 minutes. Skip nothing. | Simple bugs deserve the same rigor |
| "I'll add more logging and try again" | Logging without a hypothesis is fishing. Form a hypothesis first. | Undirected logging creates noise, not signal |
| "Let me just try reverting this commit" | Revert is a valid hypothesis test — but state it as one and record the result. | Blind reverts teach nothing if they don't work |
| "The test is wrong, not the code" | Prove it. Read the spec. Check the AC. If the test matches the spec, the code is wrong. | Blaming tests is the #1 escape hatch for broken code |
| "This code is too complex to trace" | Break it into components. Trace one boundary at a time. | Complexity is not an excuse — it's a reason to be MORE systematic |
| "Multiple things changed, hard to isolate" | Use git bisect. Or revert to last known good and apply changes one at a time. | Compound changes are the enemy of diagnosis |
| "I've seen this before, I know what to do" | Then Phase 1 will take 30 seconds. Don't skip it. | Past experience biases toward familiar fixes, not correct ones |

---

## Process Summary

```
Phase 1: Root Cause Investigation
  → What is actually happening? (evidence, not assumptions)

Phase 2: Pattern Analysis
  → What should be happening? (working analogues, comparisons)

Phase 3: Hypothesis Testing
  → Why is it happening? (one variable at a time, max 3 attempts)

Phase 4: Implementation
  → Fix it with proof. (regression test + targeted fix)

Escalation: 3 strikes → STOP → present findings → question architecture
```

---

Debug target: $ARGUMENTS

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#debug)
