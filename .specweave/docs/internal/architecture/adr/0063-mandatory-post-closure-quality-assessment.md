# ADR-0063: Mandatory Post-Closure Quality Assessment

**Status**: Accepted
**Date**: 2025-11-22
**Deciders**: Anton Abyzov (Product Owner)
**Related**: ADR-0047 (Three-File Canonical Structure), ADR-0032 (Universal Hierarchy Mapping)

---

## Context

**Problem**: Current `/specweave:done` and `/specweave:next` commands only validate **structural completion** (tasks done, tests passing, documentation updated) but do NOT validate **implementation quality** (code quality, architecture decisions, security risks, technical debt).

**Gap Identified** (2025-11-22):
- PM validation checks checkboxes (tasks completed, tests passing)
- No automatic assessment of HOW WELL the feature was implemented
- Quality assessment (`/specweave:qa`) exists but is optional and manual
- No systematic tracking of technical debt, security vulnerabilities, or quality metrics

**User Expectation**:
> "We MUST execute `/specweave:do` unless we complete all tasks and ACs, then it MUST use `/specweave:done`, and after it's closed it MUST call `/specweave:qa` to validate how good it was implemented!"

This expectation is **architecturally sound** and aligns with continuous improvement practices.

---

## Decision

**MANDATORY**: Both `/specweave:done` and `/specweave:next` commands SHALL automatically invoke `/specweave:qa` after successful closure.

### Architecture Changes

#### 1. `/specweave:done` Workflow (Updated)

```
Step 1: Load Increment Context
Step 2: Automated Completion Validation (Gate 0)
  - AC coverage (100% required)
  - No orphan tasks
  - Source of truth validation (tasks.md + spec.md)
Step 3: PM Validation (3 Gates)
  - Gate 1: Tasks completed
  - Gate 2: Tests passing
  - Gate 3: Documentation updated
Step 4: PM Decision (APPROVED/REJECTED)
Step 5: Post-Closure Sync (GitHub, JIRA, ADO)
Step 5.5: Post-Closure Quality Assessment (NEW!)  ⭐
  - Invoke /specweave:qa automatically
  - 7-dimension quality evaluation
  - BMAD risk scoring (Probability × Impact)
  - Quality gate decision (PASS/CONCERNS/FAIL)
  - Generate qa-post-closure.md report
Step 6: Handle Incomplete Work (if applicable)
```

#### 2. `/specweave:next` Workflow (Updated)

```
Step 1: Find Active Increment
Step 2: PM Validation (3 Gates)
Step 3: Closure Decision
  - If all gates pass → Auto-close
Step 3.5: Post-Closure Quality Assessment (NEW!)  ⭐
  - Invoke /specweave:qa automatically
  - Generate quality report
  - Handle FAIL scenarios (create follow-up increment)
Step 4: Suggest Next Work
```

### Quality Assessment Details

**What Gets Evaluated** (7 Dimensions):
1. **Clarity** (18%): Problem statement, objectives, terminology
2. **Testability** (22%): Acceptance criteria testability, measurable success
3. **Completeness** (18%): Requirements coverage, error handling, NFRs
4. **Feasibility** (13%): Architecture scalability, technical constraints
5. **Maintainability** (9%): Modular design, extension points, tech debt
6. **Edge Cases** (9%): Failure scenarios, performance limits, security
7. **Risk Assessment** (11%): BMAD Probability × Impact scoring (0-10)

**Quality Gate Decisions**:

| Decision | Criteria | Action |
|----------|----------|--------|
| ✅ **PASS** | Score ≥80, No critical risks | Proceed to next work |
| 🟡 **CONCERNS** | Score 60-79, High risks present | Log concerns, suggest improvements |
| 🔴 **FAIL** | Score `<60`, Critical risks present | **Create follow-up increment for fixes** |

**Report Location**: `.specweave/increments/####/reports/qa-post-closure.md`

### Critical Design Principles

1. **Non-Blocking**: Quality assessment runs AFTER closure, does NOT block delivery
   - Increment is already closed and can be deployed
   - QA provides learning and continuous improvement, not gatekeeping

2. **Automatic**: No manual invocation required
   - Developers no longer need to remember to run `/specweave:qa`
   - Consistent quality metrics across all increments

3. **Actionable**: FAIL scenarios trigger follow-up increment creation
   - Critical security issues → Immediate follow-up increment
   - High risks → Logged as technical debt for next sprint

4. **Traceable**: All quality reports saved for historical analysis
   - Track quality trends over time
   - Identify patterns (e.g., edge cases consistently low)
   - Velocity metrics (quality score vs. implementation time)

---

## Consequences

### Positive

1. **Continuous Improvement**: Every increment closure includes quality retrospective
2. **Security**: Automatic OWASP-based vulnerability scanning on every delivery
3. **Technical Debt Visibility**: Systematic identification and tracking
4. **Quality Metrics**: Build historical data for quality trends and velocity
5. **User Experience**: Natural workflow (`/specweave:next` does everything)
6. **Learning**: Teams learn from quality reports and improve over time

### Negative

1. **Token Cost**: ~2,000-5,000 tokens per increment (~$0.02-$0.05)
   - **Mitigation**: Optional skip flag (`/specweave:done --skip-qa`) for hotfixes
2. **Execution Time**: +1-2 minutes per increment closure
   - **Mitigation**: Runs in background, doesn't block next work suggestion
3. **Noise**: Some false positives in quality reports
   - **Mitigation**: Quality scores improve with LLM improvements over time

### Neutral

- Increment is already closed when QA runs, so FAIL doesn't block deployment
- Teams must decide whether to create follow-up increments for FAIL scenarios

---

## Implementation Details

### Command Updates

**File**: `plugins/specweave/commands/specweave-done.md`
- Added **Step 5.5: Post-Closure Quality Assessment**
- Updated Example 1 to show QA output
- Added quality gate decision handling (PASS/CONCERNS/FAIL)

**File**: `plugins/specweave/commands/specweave-next.md`
- Added **Step 3.5: Post-Closure Quality Assessment**
- Updated Example 1 (Happy Path) to show QA output
- Updated "Key Differences" table to include QA in workflow

### Quality Report Format

```markdown
# Quality Assessment Report: Increment 0001-user-authentication

**Generated**: 2025-11-22 14:32:15 UTC
**Command**: /specweave:qa 0001 (auto-invoked by /specweave:done)
**Status**: Post-Closure Assessment

## Executive Summary

**Overall Score**: 87/100 (GOOD) ✓
**Quality Gate Decision**: ✅ PASS

## Dimension Scores

| Dimension | Score | Weight | Weighted Score |
|-----------|-------|--------|----------------|
| Clarity | 92/100 ✓✓ | 18% | 16.56 |
| Testability | 85/100 ✓ | 22% | 18.70 |
| Completeness | 90/100 ✓✓ | 18% | 16.20 |
| Feasibility | 88/100 ✓✓ | 13% | 11.44 |
| Maintainability | 85/100 ✓ | 9% | 7.65 |
| Edge Cases | 78/100 ✓ | 9% | 7.02 |
| Risk Assessment | 75/100 ✓ | 11% | 8.25 |

**Overall**: 85.82/100 (rounded to 87/100)

## Risks Identified (BMAD Scoring)

### 🟢 LOW RISK (0)
No low-priority risks identified.

### 🟡 MEDIUM RISK (1)
**RISK-001**: Session storage scalability (2.4/10)
- **Category**: Technical
- **Probability**: 0.4 (Medium)
- **Impact**: 6 (Moderate)
- **Description**: Plan uses in-memory sessions
- **Location**: plan.md, Architecture section
- **Mitigation**: Use Redis for session store
- **AC**: N/A

### 🔴 HIGH RISK (0)
No high-priority risks identified.

### ⚫ CRITICAL RISK (0)
No critical risks identified.

## Recommendations

### Immediate Actions (None)
No critical issues requiring immediate action.

### Future Improvements
1. Consider Redis for session storage (scalability)
2. Add more edge case tests (current: 78/100, target: 80+)
3. Document risk mitigation strategies

## Quality Metrics

- **Code Coverage**: 89% (target: 80%+) ✓
- **Test Pass Rate**: 100% (70/70 tests) ✓
- **Documentation**: Up-to-date ✓
- **Security Scan**: No OWASP Top 10 vulnerabilities ✓

---

**Next Actions**: Proceed to next increment. No follow-up required.
```

### Skip Flag (Optional)

For hotfixes or time-sensitive deployments:

```bash
/specweave:done 0001 --skip-qa
```

**When to use**:
- Emergency hotfix (production down)
- Trivial changes (typo fix, README update)
- QA already run manually

**Warning**: Skip flag logs to audit trail (`.specweave/logs/qa-skipped.log`)

---

## Alternatives Considered

### Alternative 1: Keep QA Manual (Rejected)

**Pros**: No token cost, no execution time
**Cons**:
- Developers forget to run QA
- Inconsistent quality metrics
- No systematic technical debt tracking

**Why Rejected**: User expectation is clear - QA MUST run automatically. Manual QA is unreliable.

### Alternative 2: Run QA Before Closure (Rejected)

**Pros**: Block bad implementations from closing
**Cons**:
- Slows down delivery (QA blocks deployment)
- Quality issues discovered too late (after all work done)
- Discourages experimentation (fear of low scores)

**Why Rejected**: Post-closure QA provides learning without blocking delivery. Increment is already closed, QA is retrospective.

### Alternative 3: Run QA Only on `/specweave:done`, Not `/specweave:next` (Rejected)

**Pros**: Reduces token cost for automated workflows
**Cons**:
- Inconsistent behavior (some increments get QA, others don't)
- `/specweave:next` is the primary workflow, should have QA

**Why Rejected**: Both commands should have identical quality gates for consistency.

---

## Related Decisions

- **ADR-0047**: Three-File Canonical Structure (tasks.md = source of truth)
- **ADR-0032**: Universal Hierarchy Mapping (Feature → User Story → Task → AC)
- **ADR-0050**: Configuration Management (config.json vs. .env)
- **ADR-0060**: Three-Tier Hook Optimization (performance improvements)

---

## Audit Trail

| Date | Change | Author |
|------|--------|--------|
| 2025-11-22 | Initial decision | Anton Abyzov |
| 2025-11-22 | Implemented in v0.24.0+ | Claude Code |

---

## References

- **Issue**: N/A (internal architectural improvement)
- **Discussion**: User feedback on 2025-11-22
- **Implementation**:
  - `plugins/specweave/commands/specweave-done.md` (Step 5.5)
  - `plugins/specweave/commands/specweave-next.md` (Step 3.5)
- **Related Skills**: `increment-quality-judge-v2` (SKILL.md)
- **Related Commands**: `/specweave:qa`, `/specweave:validate`

---

**Status**: ✅ Accepted and Implemented (v0.24.0+)
