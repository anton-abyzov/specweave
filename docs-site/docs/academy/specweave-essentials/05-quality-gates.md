---
sidebar_position: 6
slug: 05-quality-gates
title: "Lesson 5: Quality Gates"
description: "The 3-gate validation system"
---

# Lesson 5: Quality Gates

**Time**: 35 minutes
**Goal**: Understand and customize quality validation

---

## Why Quality Gates?

Without gates:
```
"Feature complete! Shipping it."

Week later:
  - Tests? "I'll add them later"
  - Docs? "The code is self-documenting"
  - Result: Tech debt, bugs, confusion
```

With gates:
```
Feature Complete
      │
      ▼
┌─────────────────┐
│   GATE 1        │    "Are all tasks done?"
│   Tasks         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   GATE 2        │    "Do tests pass?"
│   Tests         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   GATE 3        │    "Are docs updated?"
│   Documentation │
└────────┬────────┘
         │
         ▼
    ✅ Ship It!
```

---

## Gate 1: Task Completion

Checks that all tasks in tasks.md are complete.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 1: TASK COMPLETION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

GATE 1 RESULT: ✅ PASS
```

### Priority Rules

| Priority | Requirement | Can Defer? |
|----------|-------------|------------|
| **P1** (Critical) | 100% complete | ❌ No |
| **P2** (Important) | 100% or documented deferral | ✅ With reason |
| **P3** (Nice-to-have) | Best effort | ✅ To backlog |

### Deferral Format

```markdown
### T-003: Add 2FA (P2)
**Status**: [ ] deferred
**Deferral Reason**: Requires SMS provider integration (scheduled for 0003)
```

---

## Gate 2: Test Validation

Checks that tests pass and coverage meets thresholds.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 2: TEST VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Unit Tests:
  Suites: 12 passed, 0 failed
  Tests:  89 passed, 0 failed
  Coverage: 91% (target: 80%)
  Status: ✅ PASS

Integration Tests:
  Suites: 4 passed, 0 failed
  Coverage: 85% (target: 70%)
  Status: ✅ PASS

GATE 2 RESULT: ✅ PASS
```

### Coverage Thresholds (Default)

| Test Type | Minimum |
|-----------|---------|
| Unit Tests | 80% |
| Integration Tests | 70% |
| Overall | 60% |

### Common Failures

**Tests failing:**
```
❌ GATE 2 FAILED

3 tests failing:
  FAIL src/auth.test.ts
    ✕ login_invalidPassword_throwsError

Action: Fix failing tests
```

**Coverage low:**
```
❌ GATE 2 FAILED

Coverage: 72% (required: 80%)

Uncovered:
  src/services/PaymentService.ts: 45%

Action: Add tests
```

---

## Gate 3: Documentation

Checks that [acceptance criteria](/docs/glossary/terms/acceptance-criteria) are verified and [living docs](/docs/glossary/terms/living-docs) are synced.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 3: DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

spec.md:
  Acceptance Criteria checked: 12/12
  All ACs have tests: ✅
  Status: ✅ PASS

Living Docs:
  Feature synced to FEATURES.md: ✅
  ADRs captured: 2 decisions
  Status: ✅ PASS

GATE 3 RESULT: ✅ PASS
```

### AC Tracking

Gate 3 checks checkboxes in spec.md:

```markdown
#### Acceptance Criteria

- [x] **AC-US1-01**: User can log in      ← ✅ Checked
- [x] **AC-US1-02**: Error on bad creds   ← ✅ Checked
- [ ] **AC-US1-03**: Session expires      ← ❌ Not checked!
```

**Fix unchecked ACs:**
```bash
/sw:sync-acs
```

---

## Customizing Gates

### In config.json

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
        "allowSkipped": false
      },
      "docs": {
        "requireAcSync": true,
        "requireLivingDocs": true
      }
    }
  }
}
```

### Per-Increment Override

In spec.md frontmatter:

```yaml
---
increment: 0001-hotfix
quality:
  tests:
    minCoverage: 60  # Lower for hotfix
  docs:
    requireLivingDocs: false
---
```

---

## Bypassing Gates (Emergency Only)

**When to bypass:**
- 🔥 Production is down
- 🔥 Security vulnerability

**Never for convenience.**

```bash
/sw:done 0001 --force --reason "Production hotfix for CVE-2025-1234"
```

What happens:
- Gates skipped
- Increment marked "completed with bypass"
- Reason logged
- Follow-up suggested

---

## Glossary Terms Used

- **[Acceptance Criteria](/docs/glossary/terms/acceptance-criteria)** — Testable success conditions
- **[AC-ID](/docs/glossary/terms/ac-id)** — Acceptance criteria identifier
- **[Living Docs](/docs/glossary/terms/living-docs)** — Auto-synced documentation
- **[Test Coverage](/docs/glossary/terms/test-coverage)** — Percentage of code tested

---

## Key Takeaways

| Gate | Question | Prevents |
|------|----------|----------|
| **Gate 1** | Tasks done? | Incomplete features |
| **Gate 2** | Tests pass? | Bugs, regressions |
| **Gate 3** | Docs updated? | Knowledge loss |

**Golden rule**: Gates are your friends, not obstacles.

---

## What's Next?

Learn test-driven development with SpecWeave's TDD commands.

**:next** → [Lesson 6: TDD Workflow](./06-tdd-workflow)
