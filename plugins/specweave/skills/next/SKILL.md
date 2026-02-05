---
description: Smart increment transition - auto-close current if ready, intelligently suggest next work (backlog or new feature)
---

# Next Increment (Smart Workflow Transition)

**Smart Workflow**: Seamlessly transition from current work to next, with automatic closure validation.

You are helping the user complete their current increment and move to the next one with intelligent suggestions.

**CRITICAL**: This command requires **EXPLICIT USER CONFIRMATION** before closing any increment! This prevents the auto-completion bug where increments were marked "completed" without user approval.

## Usage

```bash
/sw:next
```

**No arguments needed** - the command intelligently handles the transition.

---

## What This Does

The `/sw:next` command is your **workflow continuation** command. It:

1. **Validates current increment** - Checks if work is complete
2. **Transitions to ready_for_review** - If all tasks done, auto-transitions to `ready_for_review`
3. **ASKS USER FOR CONFIRMATION** - NEVER auto-closes! Always asks "Ready to close this increment?"
4. **Closes on explicit approval** - Only marks `completed` if user confirms
5. **Suggests next work** - Intelligent recommendations from backlog or prompt for new

---

## Workflow

### Step 1: Find Active Increment

```bash
# Check for in-progress increments
find .specweave/increments -type f -name "spec.md" -exec grep -l "status: in-progress" {} \;
```

**Scenarios**:
- ✅ One increment in-progress → Validate for closure
- ⚠️ Multiple in-progress → Warn about WIP limit, ask which to close
- ℹ️ None in-progress → Skip to Step 3 (suggest next work)

### Step 2: PM Validation Gates (3 Gates)

**🔥 CRITICAL: Run PM validation like `/done` command**

Invoke PM validation for the in-progress increment:

#### Gate 1: Tasks Completed ✅

Check `tasks.md`:
- [ ] All P1 (critical) tasks completed
- [ ] All P2 (important) tasks completed OR deferred with reason
- [ ] P3 (nice-to-have) tasks completed, deferred, or moved to backlog
- [ ] No tasks in "blocked" state

**Example check**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 1: Tasks Completion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking tasks.md for increment 0001...

Priority P1 (Critical): 12 tasks
  ✅ 12/12 completed (100%)

Priority P2 (Important): 18 tasks
  ✅ 16/18 completed (89%)
  ⚠️ 2 deferred (documented reasons)

Priority P3 (Nice-to-have): 12 tasks
  ✅ 8/12 completed (67%)
  📋 4 moved to backlog

Status: ✅ PASS
```

#### Gate 2: Tests Passing ✅

Run test suite:
- [ ] All test suites passing (no failures)
- [ ] Test coverage meets requirements (>80% for critical paths)
- [ ] E2E tests passing (if UI exists)
- [ ] No skipped tests without documentation

**Example check**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 2: Tests Passing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running test suite...

Unit Tests: ✅ 47/47 passing (Coverage: 89%)
Integration Tests: ✅ 15/15 passing
E2E Tests: ✅ 8/8 passing

Status: ✅ PASS
```

#### Gate 3: Documentation Updated ✅

Check documentation:
- [ ] CLAUDE.md updated with new features
- [ ] README.md updated with usage examples
- [ ] CHANGELOG.md updated (if public API changed)
- [ ] API documentation regenerated (if applicable)

**Example check**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 3: Documentation Updated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking documentation updates...

CLAUDE.md: ✅ Updated with new features
README.md: ✅ Examples added
CHANGELOG.md: ✅ v0.1.7 entry created
Inline Docs: ✅ All functions documented

Status: ✅ PASS
```

### Step 3: Closure Decision

**Based on PM validation results**:

#### Scenario A: All Gates Pass (ASK USER CONFIRMATION)

**CRITICAL**: NEVER auto-close! Always ask for user confirmation to prevent the auto-completion bug.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PM VALIDATION: ✅ READY TO CLOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Gate 1: Tasks (100% P1, 89% P2)
✅ Gate 2: Tests (70/70 passing, 89% coverage)
✅ Gate 3: Docs (all current)

Increment 0001-user-authentication is ready for closure!

📋 Status: ready_for_review (awaiting your approval)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CONFIRMATION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This will permanently mark the increment as COMPLETED.

Please confirm: Do you want to close this increment?

A. Yes, close it - I've reviewed the work and it's complete
B. No, keep it open - I need to review or make changes first
```

**🔥 CRITICAL**: Use the AskUserQuestion tool to get explicit confirmation:
```
AskUserQuestion({
  questions: [{
    header: "Close increment?",
    question: "All PM gates passed. Ready to permanently close this increment?",
    options: [
      { label: "Yes, close it", description: "Mark as completed (irreversible)" },
      { label: "No, keep open", description: "Stay at ready_for_review status" }
    ],
    multiSelect: false
  }]
})
```

**Only if user confirms "Yes"**:
```
🎯 Closing increment with your approval...
  ✓ Updated status: ready_for_review → completed
  ✓ Set completion date: 2025-10-28
  ✓ Set approvedAt timestamp
  ✓ Generated completion report
  ✓ Freed WIP slot (1/2 → 0/2)

🎉 Increment 0001 closed successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 POST-CLOSURE QUALITY ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running quality assessment to validate implementation...

/sw:qa 0001

Overall Score: 87/100 (GOOD) ✓

Dimension Scores:
  Clarity:         92/100 ✓✓
  Testability:     85/100 ✓
  Completeness:    90/100 ✓✓
  Feasibility:     88/100 ✓✓
  Maintainability: 85/100 ✓
  Edge Cases:      78/100 ✓
  Risk Assessment: 75/100 ✓

Quality Gate Decision: ✅ PASS

📋 Quality report saved:
   .specweave/increments/0001-user-authentication/reports/qa-post-closure.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proceeding to suggest next work...
```

#### Scenario B: One or More Gates Fail ❌ (Present Options)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PM VALIDATION: ❌ NOT READY TO CLOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Gate 1: Tasks - 2 P1 tasks incomplete
✅ Gate 2: Tests - All passing
❌ Gate 3: Docs - CLAUDE.md and README.md outdated

Increment 0001-user-authentication is NOT ready to close.

Options:
A. Complete remaining work (recommended)
   → Finish T005 (password hashing) - 2h
   → Finish T008 (JWT validation) - 3h
   → Update CLAUDE.md - 30m
   → Update README.md - 1h
   → Estimated: 6-7 hours

B. Force close and defer incomplete tasks
   → Move T005, T008 to next increment (0002)
   → Close 0001 as "completed with deferrals"
   → Document deferral reasons

C. Stay on current increment
   → Continue working on 0001
   → Run `/specweave do 0001` to resume

What would you like to do? [A/B/C]
```

**🔥 CRITICAL**: NEVER auto-close with incomplete work! Always give user control.

### Step 3.5: Post-Closure Quality Assessment

**🎯 MANDATORY**: After successful closure, automatically run quality assessment to validate implementation quality.

**Why This Step Matters**:
- PM validation (Step 2) checks **structural completion** (tasks done, tests pass, docs updated)
- Quality assessment checks **implementation quality** (code quality, architecture, risks)
- Provides retrospective learning and continuous improvement
- Identifies technical debt and areas for future enhancement

**Implementation**:

1. **Invoke QA command automatically**:
   ```bash
   /sw:qa ${incrementId}
   ```

2. **Quality assessment evaluates**:
   - **7 dimensions**: Clarity, Testability, Completeness, Feasibility, Maintainability, Edge Cases, Risk
   - **BMAD risk scoring**: Probability × Impact (0-10 scale)
   - **Quality gate decision**: PASS/CONCERNS/FAIL
   - **Security vulnerabilities**: OWASP-based checks
   - **Architecture quality**: Design patterns, modularity, scalability

3. **Generate quality report**:
   - Save to `.specweave/increments/####/reports/qa-post-closure.md`
   - Include dimension scores, risks identified, recommendations
   - Link to specific code locations and acceptance criteria

4. **Display results**:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔍 POST-CLOSURE QUALITY ASSESSMENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Overall Score: 87/100 (GOOD) ✓

   Dimension Scores:
     Clarity:         92/100 ✓✓
     Testability:     85/100 ✓
     Completeness:    90/100 ✓✓
     Feasibility:     88/100 ✓✓
     Maintainability: 85/100 ✓
     Edge Cases:      78/100 ✓
     Risk Assessment: 75/100 ✓

   Quality Gate Decision: ✅ PASS

   📋 Full report: .specweave/increments/####/reports/qa-post-closure.md
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

**Quality Gate Decisions**:

| Decision | Criteria | Action |
|----------|----------|--------|
| ✅ PASS | Score ≥80, No critical risks | Proceed to next work |
| 🟡 CONCERNS | Score 60-79, High risks present | Log concerns, suggest improvements |
| 🔴 FAIL | Score <60, Critical risks present | Create follow-up increment for fixes |

**If Quality Gate FAILS**:
```
🔴 QUALITY GATE: FAIL (Score: 58/100)

Critical Issues Found:
  • CRITICAL RISK: Password storage implementation (9.0/10)
  • HIGH RISK: Rate limiting not specified (6.0/10)
  • Testability: 45/100 (below threshold)

Recommendation: Create follow-up increment 0002-security-fixes

Options:
  A. Create follow-up increment now (recommended)
  B. Log as technical debt (track in backlog)
  C. Continue to next feature (not recommended)

What would you like to do? [A/B/C]
```

**If Quality Gate CONCERNS**:
```
🟡 QUALITY GATE: CONCERNS (Score: 72/100)

Issues to address:
  • Edge cases coverage: 65/100 (should be 80+)
  • 2 high-priority risks identified
  • Recommendations: 5 improvements suggested

📋 Review report: .specweave/increments/####/reports/qa-post-closure.md

These can be addressed in future iterations.
Proceeding to next work...
```

**IMPORTANT**: Quality assessment runs AFTER closure to:
- Not block delivery (increment is already closed and shipped)
- Provide learning and continuous improvement
- Identify technical debt for future planning
- Build quality metrics over time

### Step 4: Suggest Next Work (After Successful Closure)

**Intelligent suggestions based on project state**:

1. **Check for planned increments in backlog**:
   ```bash
   ls .specweave/increments/_backlog/*.md
   # or
   find .specweave/increments -name "spec.md" -exec grep -l "status: planned" {} \;
   ```

2. **Present options based on findings**:

   **Option A: Backlog items found** ✅
   ```
   🎯 Next Work Suggestions

   Found 2 planned increments in backlog:

   1. 0002-payment-processing (P1)
      → Stripe integration, payment flow
      → Estimated: 2 weeks
      → Dependencies: 0001 (✅ complete)

   2. 0003-notification-system (P2)
      → Email + SMS notifications
      → Estimated: 1 week
      → Dependencies: None

   Recommendation: Start 0002-payment-processing (P1, ready to go)

   Actions:
   A. Start 0002 now → Run `/specweave do 0002`
   B. Start 0003 instead → Run `/specweave do 0003`
   C. Create new increment → Run `/specweave inc "feature name"`

   What would you like to do? [A/B/C]
   ```

   **Option B: No backlog, but in-progress work exists** ⚠️
   ```
   🎯 Next Work Suggestions

   Current WIP: 1/2 increments active
   Active: 0002-payment-processing (50% complete)

   Recommendation: Continue 0002-payment-processing

   Next Action: Run `/specweave do 0002` to resume

   💡 Tip: Run `/progress 0002` to see current status
   ```

   **Option C: Clean slate, no planned work** ✨
   ```
   🎯 Next Work Suggestions

   No planned increments found.
   Current WIP: 0/2 (both slots available)

   Time to plan your next feature!

   Options:
   A. Create new increment → Run `/specweave inc "feature description"`
      Example: /specweave inc "Admin dashboard"

   B. Check existing ideas → Look in .specweave/increments/_backlog/
      If you have ideas saved, promote them with /sw:increment

   C. Review roadmap → See .specweave/docs/internal/strategy/roadmap.md

   💡 Tip: Start with the most valuable feature for users!
   ```

---

## Example Workflows

### Example 1: Happy Path (Auto-Close and Continue)

**User**:
```bash
/sw:next
```

**Output**:
```
📊 Checking current increment...

Active: 0001-user-authentication

🔍 PM Validation:
  ✅ Gate 1: All P1 tasks complete (12/12)
  ✅ Gate 2: All tests passing (70/70, 89% coverage)
  ✅ Gate 3: Documentation updated

✅ All gates passed! Transitioning to ready_for_review...

📋 Status: ready_for_review (awaiting your approval)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CONFIRMATION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This will permanently mark increment 0001 as COMPLETED.

Please confirm: Do you want to close this increment?
```

**🔥 Claude uses AskUserQuestion tool here to get explicit confirmation**

**User confirms: "Yes, close it"**

**Output (after confirmation)**:
```
🎯 Closing increment with your approval...
  ✓ Status: ready_for_review → completed
  ✓ Set approvedAt: 2025-10-28
  ✓ Completion report generated
  ✓ WIP freed (1/2 → 0/2)

🎉 Increment 0001 closed successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 POST-CLOSURE QUALITY ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running quality assessment...

Overall Score: 87/100 (GOOD) ✓

Quality Gate Decision: ✅ PASS

📋 Report: .specweave/increments/0001-user-authentication/reports/qa-post-closure.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Next Work Suggestions

Found 1 planned increment:

0002-payment-processing (P1)
  → Stripe integration, payment flow
  → Estimated: 2 weeks
  → Dependencies: 0001 (✅ complete)

Recommendation: Start 0002-payment-processing

Next Action: Run `/specweave do 0002` to begin

💡 Tip: Review spec first with `cat .specweave/increments/0002-payment-processing/spec.md`
```

### Example 2: Incomplete Work (User Decision)

**User**:
```bash
/sw:next
```

**Output**:
```
📊 Checking current increment...

Active: 0001-user-authentication

🔍 PM Validation:
  ❌ Gate 1: 2 P1 tasks incomplete (10/12)
  ✅ Gate 2: All tests passing
  ❌ Gate 3: README.md not updated

Increment 0001 is NOT ready to close.

Blockers:
  • T010: Add rate limiting (P1) - 2 hours
  • T012: Add password reset (P1) - 3 hours
  • README.md update - 1 hour

Options:
A. Complete remaining work (recommended) → 6 hours
B. Force close and defer T010, T012 to 0002
C. Stay on 0001 and continue working

What would you like to do? [A/B/C] _
```

**User types "A"**:
```
✅ Good choice! Let's finish 0001 properly.

Next Action: Run `/specweave do 0001` to resume at T010

💡 Tip: `/specweave progress` shows your current status anytime
```

### Example 3: No Active Work (Clean Start)

**User**:
```bash
/sw:next
```

**Output**:
```
📊 Checking current increment...

No active increments found.

Recent work:
  ✅ 0001-user-authentication (closed 2 days ago)
  ✅ 0002-payment-processing (closed 1 week ago)

Current WIP: 0/2 (both slots available)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Next Work Suggestions

No planned increments found. Time to plan new work!

Options:
1. Create new increment:
   → Run `/specweave inc "feature description"`
   → Example: /specweave inc "Admin dashboard"

2. Check backlog for ideas:
   → Look in .specweave/increments/_backlog/
   → Promote with `/specweave inc "feature name"`

3. Review roadmap:
   → See .specweave/docs/internal/strategy/roadmap.md

💡 Tip: Focus on the most valuable feature for users!
```

### Example 4: Multiple In-Progress (WIP Limit Warning)

**User**:
```bash
/sw:next
```

**Output**:
```
📊 Checking current increment...

⚠️ Warning: Multiple increments in-progress (2/2 at WIP limit)

Active increments:
1. 0002-payment-processing (50% complete)
   → Last activity: 2 hours ago
   → Next task: T008

2. 0003-notification-system (25% complete)
   → Last activity: 1 day ago
   → Next task: T004

Recommendation: Focus on completing one before starting new work.

Which increment should we focus on closing?
A. Close 0002-payment-processing
B. Close 0003-notification-system
C. Cancel (continue working as-is)

Your choice? [A/B/C] _
```

---

## Key Differences from Other Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/sw:increment "feature"` | Create NEW increment with specific feature | Starting fresh work |
| `/sw:do` | Execute tasks in increment | Implementing planned work |
| `/sw:progress` | Check status (no action) | Quick status check |
| `/sw:done` | Explicitly close increment | Manual closure with validation |
| `/sw:qa` | Quality assessment only | Standalone QA check |
| `/sw:next` ⭐ | **Smart transition** (close + QA + suggest next) | **Natural workflow continuation** |

**Why `/sw:next` is special**:
- ✅ Combines validation + closure + **quality assessment** + suggestion in one command
- ✅ No need to remember `/sw:done` then `/sw:qa` then `/sw:increment` sequence
- ✅ Intelligent suggestions (backlog, WIP, new work)
- ✅ User stays in control (never forces actions)
- ✅ Natural "what's next?" workflow
- ✅ Automatic post-closure quality assessment

---

## Best Practices

1. **Run `/sw:next` when you feel done** - It validates completion and suggests next steps
2. **Trust the PM validation** - If gates fail, there's unfinished work
3. **Follow recommendations** - Backlog items are already planned
4. **Keep WIP limit in mind** - Don't force multiple increments
5. **Use `/specweave progress` for status** - `/next` is for transitions

---

## Related Commands

- `/inc` - Create new increment (PM-led planning)
- `/specweave do` - Execute tasks (auto-resumes)
- `/specweave progress` - Check status
- `/done` - Manual closure with PM validation
- `/list-increments` - View all increments

---

## Configuration

Auto-close uses sensible defaults:
- PM validation gates must pass (tasks, tests, docs)
- P1 tasks required, P2 can be deferred
- Tests must pass with 80% coverage
- Documentation must be updated

---

**💡 Remember**: `/next` is your **"I'm done, what's next?"** command. It handles the transition intelligently so you can stay in flow!
