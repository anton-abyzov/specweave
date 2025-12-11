---
id: quality-gate
title: Quality Gate
sidebar_label: Quality Gate
---

# Quality Gate

A **quality gate** is a checkpoint in the SpecWeave workflow that validates work meets specific criteria before proceeding to the next phase.

## SpecWeave Quality Gates

### 1. Pre-Implementation Gate (`/sw:qa --pre`)

Validates specifications before starting implementation:

```bash
/sw:qa 0001 --pre
```

**Checks**:
- ✅ Clarity - Requirements are clear and unambiguous
- ✅ Testability - [Acceptance criteria](/docs/glossary/terms/acceptance-criteria) are testable
- ✅ Completeness - All necessary sections present
- ✅ Feasibility - Technical approach is sound

### 2. Completion Gate (`/sw:done`)

Validates work before closing an [increment](/docs/glossary/terms/increments):

```bash
/sw:done 0001
```

**Three validation gates**:
1. **Tasks Complete** - All tasks in [tasks.md](/docs/glossary/terms/tasks-md) marked done
2. **Tests Pass** - 60%+ [test coverage](/docs/glossary/terms/test-coverage)
3. **Docs Updated** - [Living docs](/docs/glossary/terms/living-docs) synchronized

### 3. Quality Assessment Gate (`/sw:qa --gate`)

Comprehensive quality check before release:

```bash
/sw:qa 0001 --gate
```

**7 Quality Dimensions** (weighted scoring):
1. Clarity (18%)
2. Testability (22%)
3. Completeness (18%)
4. Feasibility (13%)
5. Maintainability (9%)
6. Edge Cases (9%)
7. Risk Assessment (11%)

**Gate Decisions**:
- 🟢 **PASS** - Ready to proceed
- 🟡 **CONCERNS** - Should fix before release
- 🔴 **FAIL** - Must fix before proceeding

## Risk Scoring

Quality gates include risk assessment using **Probability × Impact** method:

| Risk Level | Score | Action |
|------------|-------|--------|
| **CRITICAL** | ≥9.0 | Immediate action required |
| **HIGH** | 6.0-8.9 | Address before release |
| **MEDIUM** | 3.0-5.9 | Monitor |
| **LOW** | &lt;3.0 | Acceptable |

## Example Output

```bash
$ /sw:qa 0001 --gate

📊 Quality Assessment: 0001-user-authentication

📈 Overall Score: 85/100 (PASS)

Dimension Scores:
  ✅ Clarity: 90/100
  ✅ Testability: 88/100
  ✅ Completeness: 85/100
  ✅ Feasibility: 82/100
  ⚠️  Maintainability: 75/100
  ✅ Edge Cases: 80/100
  ✅ Risk Assessment: 78/100

🎯 Gate Decision: 🟢 PASS

📝 Recommendations:
  - Consider extracting AuthService into smaller modules
  - Add rate limiting tests for login endpoint

✅ Ready for release
```

## Configuration

Quality gate thresholds in `.specweave/config.json`:

```json
{
  "validation": {
    "quality_judge": {
      "enabled": true,
      "pass_threshold": 70,
      "concerns_threshold": 50
    }
  }
}
```

## Related

- [Increments](/docs/glossary/terms/increments) - What gates validate
- [Acceptance Criteria](/docs/glossary/terms/acceptance-criteria) - What gates check
- [Test Coverage](/docs/glossary/terms/test-coverage) - Coverage requirements
- [TDD](/docs/glossary/terms/tdd) - Test-first approach
