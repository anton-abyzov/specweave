---
sidebar_position: 6
title: "Lesson 5: Quality Gates"
description: "Deep dive into the 3-gate validation system"
---

# Lesson 5: Quality Gates Deep Dive

**Duration**: 45 minutes
**Prerequisites**: Lessons 1-4 completed
**Outcome**: Understand and customize quality validation

---

## Why Quality Gates?

### The Problem: "Works on My Machine"

Without quality gates:
```
Developer: "Feature complete! Shipping it."

Week later:
  - Tests? "I'll add them later"
  - Docs? "The code is self-documenting"
  - Edge cases? "Nobody will do that"
  - Result: Tech debt, bugs, confusion
```

### The Solution: Automated Checkpoints

```
Feature Complete
      │
      ▼
┌─────────────────┐
│   GATE 1        │    "Are all tasks done?"
│   Tasks         │───► P1: 100% required
└────────┬────────┘    P2: 100% or documented deferral
         │
         ▼
┌─────────────────┐
│   GATE 2        │    "Do tests pass?"
│   Tests         │───► All suites green
└────────┬────────┘    Coverage ≥ threshold
         │
         ▼
┌─────────────────┐
│   GATE 3        │    "Are docs updated?"
│   Documentation │───► ACs checked in spec.md
└────────┬────────┘    Living docs synced
         │
         ▼
    ✅ Ship It!
```

---

## Gate 1: Task Completion

### What It Checks

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 1: TASK COMPLETION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking tasks.md for increment 0001...

Priority P1 (Critical):
  Total: 8 tasks
  Complete: 8/8 (100%)
  Status: ✅ PASS

Priority P2 (Important):
  Total: 5 tasks
  Complete: 4/5 (80%)
  Deferred: 1 (with documented reason)
  Status: ✅ PASS

Priority P3 (Nice-to-have):
  Total: 3 tasks
  Complete: 1/3 (33%)
  Moved to backlog: 2
  Status: ✅ PASS

Blocked Tasks: 0

GATE 1 RESULT: ✅ PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Priority Rules

| Priority | Requirement | Can Defer? |
|----------|-------------|------------|
| **P1** (Critical) | 100% complete | ❌ No |
| **P2** (Important) | 100% complete OR documented deferral | ✅ With reason |
| **P3** (Nice-to-have) | Best effort | ✅ To backlog |

### Task Status Detection

Gate 1 reads `tasks.md` and checks checkbox status:

```markdown
### T-001: Implement Authentication (P1)
**Status**: [x] completed     ← ✅ Counts as complete

### T-002: Add Password Reset (P1)
**Status**: [ ] pending       ← ❌ Incomplete

### T-003: Add 2FA (P2)
**Status**: [ ] deferred      ← ⚠️ Needs reason
**Deferral Reason**: Requires SMS provider integration (scheduled for 0003)
                     ← ✅ Has documented reason
```

### Common Failures

**Failure: P1 task incomplete**
```
❌ GATE 1 FAILED

P1 task T-005 incomplete:
  "Implement rate limiting"

This is a critical task and cannot be skipped.

Action: Complete T-005 before closing increment
```

**Failure: P2 deferred without reason**
```
❌ GATE 1 FAILED

P2 task T-008 deferred but no reason provided:
  "Add email notifications"

Action: Either complete T-008 or add deferral reason:
  **Deferral Reason**: [Your explanation here]
```

---

## Gate 2: Test Validation

### What It Checks

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 2: TEST VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running test suite...

Unit Tests:
  Suites: 12 passed, 0 failed
  Tests:  89 passed, 0 failed
  Coverage: 91% (target: 80%)
  Status: ✅ PASS

Integration Tests:
  Suites: 4 passed, 0 failed
  Tests:  23 passed, 0 failed
  Coverage: 85% (target: 70%)
  Status: ✅ PASS

E2E Tests:
  Suites: 2 passed, 0 failed
  Tests:  8 passed, 0 failed
  Status: ✅ PASS

Skipped Tests: 0

GATE 2 RESULT: ✅ PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Coverage Requirements

Default thresholds (configurable):

| Test Type | Minimum Coverage |
|-----------|------------------|
| Unit Tests | 80% |
| Integration Tests | 70% |
| E2E Tests | N/A (pass/fail only) |
| Overall | 60% |

### Configuration

In `.specweave/config.json`:

```json
{
  "quality": {
    "coverage": {
      "unit": 80,
      "integration": 70,
      "overall": 60
    },
    "requireAllTestsPass": true,
    "allowSkippedTests": false
  }
}
```

### Common Failures

**Failure: Tests failing**
```
❌ GATE 2 FAILED

3 tests failing:

  FAIL src/auth.test.ts
    ✕ login_invalidPassword_throwsError (42ms)
      Expected: InvalidPasswordError
      Received: undefined

  FAIL src/user.test.ts
    ✕ createUser_duplicateEmail_rejects (18ms)
    ✕ updateUser_invalidId_throws (12ms)

Action: Fix failing tests before closing increment

Run: npm test -- --verbose
```

**Failure: Coverage below threshold**
```
❌ GATE 2 FAILED

Coverage below threshold:
  Unit: 72% (required: 80%)

Uncovered files:
  src/services/PaymentService.ts: 45% coverage
  src/utils/validation.ts: 60% coverage

Action: Add tests for uncovered code

Suggested tests:
  - PaymentService.processRefund()
  - validation.validateCreditCard()
```

**Failure: Skipped tests**
```
❌ GATE 2 FAILED

Skipped tests found (not allowed by config):

  SKIP src/auth.test.ts
    ○ login_with2FA_requiresCode (skipped: "TODO: implement 2FA")

Action: Either:
  1. Remove skip and implement test
  2. Enable allowSkippedTests in config
  3. Document why test is skipped in tasks.md
```

---

## Gate 3: Documentation

### What It Checks

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 3: DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking documentation status...

spec.md:
  Acceptance Criteria checked: 12/12
  All ACs have corresponding tests: ✅
  Status: ✅ PASS

tasks.md:
  All tasks have status: ✅
  AC-IDs present: ✅
  Status: ✅ PASS

Living Docs:
  Feature synced to FEATURES.md: ✅
  ADRs captured: 2 decisions
  Status: ✅ PASS

External Sync:
  GitHub Issue #42: Synced
  JIRA Epic PROJ-123: Synced
  Status: ✅ PASS

GATE 3 RESULT: ✅ PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Acceptance Criteria Tracking

Gate 3 checks that ACs in spec.md are checked off:

```markdown
## spec.md

### Acceptance Criteria

- [x] **AC-US1-01**: User can log in with email     ← ✅ Checked
- [x] **AC-US1-02**: Invalid credentials show error ← ✅ Checked
- [ ] **AC-US1-03**: Session expires after 24h      ← ❌ Not checked!
```

### Living Docs Sync

Gate 3 verifies that living documentation is updated:

```
.specweave/docs/
├── public/
│   └── FEATURES.md    ← Must include new feature
└── _features/
    └── FS-001-auth/   ← Feature folder must exist
        └── README.md  ← Must be generated
```

### Common Failures

**Failure: ACs not checked**
```
❌ GATE 3 FAILED

Unchecked acceptance criteria in spec.md:

  - [ ] AC-US1-03: Session expires after 24h
  - [ ] AC-US2-02: Password reset email sent within 30s

Action: Either:
  1. Implement the missing functionality
  2. Check off the ACs if already implemented
  3. Move to next increment if out of scope

Command to sync: /specweave:sync-acs
```

**Failure: Living docs not synced**
```
❌ GATE 3 FAILED

Living documentation out of sync:

  FEATURES.md missing entry for:
    - 0001-user-authentication

Action: Sync living documentation

Command: /specweave:sync-docs
```

---

## Post-Closure: Quality Assessment

After all gates pass and increment closes, QA runs automatically:

### The 7 Dimensions

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY ASSESSMENT: 0001-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DIMENSION SCORES:

1. Clarity (95/100) ✓✓
   Requirements unambiguous and well-defined
   User stories follow standard format
   ACs are specific and testable

2. Testability (88/100) ✓
   All ACs have corresponding tests
   BDD scenarios properly structured
   Edge cases identified

3. Completeness (92/100) ✓✓
   All user stories addressed
   Non-functional requirements met
   Integration points documented

4. Feasibility (90/100) ✓✓
   Implementation achievable
   No unrealistic constraints
   Dependencies available

5. Maintainability (85/100) ✓
   Code follows patterns
   Components properly separated
   Technical debt minimal

6. Edge Cases (78/100) ⚠
   Most edge cases covered
   Some scenarios missing:
     - Concurrent login attempts
     - Network timeout handling

7. Risk Assessment (82/100) ✓
   Security risks identified
   Mitigation strategies in place
   Minor gaps in error handling

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OVERALL: 87/100 (GOOD)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Risk Scoring (BMAD Method)

Risks are scored using Probability × Impact:

```
IDENTIFIED RISKS:

1. HIGH RISK (Score: 7.2/10)
   "Rate limiting not implemented"
   Probability: 8/10 (likely to be exploited)
   Impact: 9/10 (service disruption)
   Mitigation: Implement in next increment

2. MEDIUM RISK (Score: 4.2/10)
   "Session fixation possible"
   Probability: 6/10 (requires specific attack)
   Impact: 7/10 (account compromise)
   Mitigation: Regenerate session on login

3. LOW RISK (Score: 1.5/10)
   "Verbose error messages"
   Probability: 3/10 (requires enumeration)
   Impact: 5/10 (information disclosure)
   Mitigation: Generic error messages
```

### Quality Gate Decisions

| Score | Decision | Action |
|-------|----------|--------|
| ≥80 | ✅ PASS | Proceed normally |
| 60-79 | 🟡 CONCERNS | Log issues, continue |
| <60 | 🔴 FAIL | Create follow-up increment |

---

## Customizing Quality Gates

### Adjusting Thresholds

`.specweave/config.json`:

```json
{
  "quality": {
    "gates": {
      "tasks": {
        "p1Required": true,
        "p2Required": true,
        "p3Required": false
      },
      "tests": {
        "minCoverage": 80,
        "allowSkipped": false,
        "requireE2E": false
      },
      "docs": {
        "requireAcSync": true,
        "requireLivingDocs": true,
        "requireExternalSync": false
      }
    },
    "qa": {
      "minScore": 70,
      "blockOnFail": false
    }
  }
}
```

### Per-Increment Overrides

In `spec.md` frontmatter:

```yaml
---
increment: 0001-hotfix
quality:
  tests:
    minCoverage: 60  # Lower for hotfix
  docs:
    requireLivingDocs: false  # Skip for urgent fix
---
```

---

## Bypassing Gates (Emergency Only)

### When to Bypass

- 🔥 Production is down
- 🔥 Security vulnerability needs immediate patch
- ⚠️ Never for convenience

### How to Bypass

```bash
/specweave:done 0001 --force --reason "Production hotfix for CVE-2025-1234"
```

**What happens**:
1. Gates skipped
2. Increment marked "completed with bypass"
3. Reason logged to metadata.json
4. Alert added to QA report
5. Follow-up increment suggested

```
⚠️  GATES BYPASSED

Increment 0001 closed with bypass.
Reason: "Production hotfix for CVE-2025-1234"

⚠️  Technical debt created:
  - Tests not verified
  - Docs not synced

REQUIRED: Create follow-up increment to address debt

Suggested: /specweave:increment "Address 0001 tech debt"
```

---

## Practice Exercise

### Exercise 1: Force a Gate Failure

```bash
# Create increment
/specweave:increment "Test gate failures"

# Execute only first task
/specweave:do --until T-001

# Try to close (will fail Gate 1)
/specweave:next

# Observe the failure message and options
```

### Exercise 2: Check Coverage Impact

```bash
# Create increment with low coverage threshold
# Edit .specweave/config.json:
# "minCoverage": 95

# Try to close existing increment
/specweave:next

# Observe Gate 2 failure
```

### Exercise 3: Missing AC Check

```bash
# Find spec.md with checked ACs
# Manually uncheck one:
# - [ ] **AC-US1-01**: ...

# Run validation
/specweave:validate 0001

# Observe Gate 3 failure
```

---

## Summary

Quality Gates ensure:

| Gate | Question | Prevents |
|------|----------|----------|
| **Gate 1** | Tasks done? | Incomplete features |
| **Gate 2** | Tests pass? | Bugs, regressions |
| **Gate 3** | Docs updated? | Knowledge loss |
| **QA** | Quality good? | Tech debt accumulation |

**The Golden Rule**: Gates are your friends, not obstacles.

:next → [Lesson 6: TDD Workflow](./06-tdd-workflow)
