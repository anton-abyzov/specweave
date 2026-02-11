---
id: specweave-qa
title: /sw:qa Command
sidebar_label: specweave:qa
---

# /sw:qa Command

The **`/sw:qa`** command runs comprehensive AI-powered quality assessment with risk scoring using the Probability x Impact method.

## What It Does

**Key assessments:**
- 7 quality dimensions with weighted scoring
- Risk assessment (Probability x Impact)
- [Quality gate](/docs/glossary/terms/quality-gate) decisions (PASS/CONCERNS/FAIL)
- Actionable recommendations
- Optional export to [tasks.md](/docs/glossary/terms/tasks-md)

## Usage

```bash
# Quick assessment
/sw:qa 0007

# Pre-implementation check
/sw:qa 0007 --pre

# Quality gate (before closing)
/sw:qa 0007 --gate

# Export blockers to tasks
/sw:qa 0007 --export
```

## 7 Quality Dimensions

| Dimension | Weight | What It Checks |
|-----------|--------|----------------|
| Clarity | 18% | Clear, unambiguous requirements |
| Testability | 22% | [Acceptance criteria](/docs/glossary/terms/acceptance-criteria) are testable |
| Completeness | 18% | All sections present |
| Feasibility | 13% | Technical approach is sound |
| Maintainability | 9% | Code will be maintainable |
| Edge Cases | 9% | Boundary conditions covered |
| Risk Assessment | 11% | Risks identified and mitigated |

## Risk Scoring

Uses **Probability x Impact** method:

| Risk Level | Score | Action |
|------------|-------|--------|
| **CRITICAL** | >= 9.0 | Immediate action required |
| **HIGH** | 6.0-8.9 | Address before release |
| **MEDIUM** | 3.0-5.9 | Monitor |
| **LOW** | < 3.0 | Acceptable |

## Gate Decisions

Based on overall score:

| Score | Decision | Meaning |
|-------|----------|---------|
| >= 70 | **PASS** | Ready to proceed |
| 50-69 | **CONCERNS** | Should fix before release |
| < 50 | **FAIL** | Must fix before proceeding |

## Output Example

```bash
$ /sw:qa 0007 --gate

📊 Quality Assessment: 0007-user-authentication

📈 Overall Score: 85/100 (PASS)

Dimension Scores:
  ✅ Clarity: 90/100
  ✅ Testability: 88/100
  ✅ Completeness: 85/100
  ✅ Feasibility: 82/100
  ⚠️  Maintainability: 75/100
  ✅ Edge Cases: 80/100
  ✅ Risk Assessment: 78/100

🔴 Risks Identified:
  - Security: Password storage (Score: 6.5 HIGH)
  - Performance: Token validation (Score: 3.2 MEDIUM)

🎯 Gate Decision: PASS

📝 Recommendations:
  - Consider bcrypt rounds increase (security)
  - Add token caching (performance)
```

## Related

- [Quality Gate](/docs/glossary/terms/quality-gate) - Validation checkpoints
- [QA Engineer Agent](/docs/glossary/terms/qa-lead-agent) - Quality agent (now `sw-testing:qa-engineer`)
- [Acceptance Criteria](/docs/glossary/terms/acceptance-criteria) - Testable requirements
- [/sw:validate](/docs/glossary/terms/specweave-validate) - Rule-based validation
- [/sw:done](/docs/glossary/terms/specweave-done) - Close increment
