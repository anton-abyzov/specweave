---
increment: defaults
title: Global Rubric Defaults
generated: ""
source: specweave-defaults
version: "1.0"
status: defaults
---

# Global Rubric Defaults

> These criteria apply to all increments unless overridden at the project or increment level.
> Override by creating `.specweave/rubric-defaults.md` (project) or editing `rubric.md` (increment).

---

## Test Coverage

### R-D01: Unit test coverage meets project target [advisory]
- **Source**: project-default
- **Evaluator**: coverage
- **Verify**: Coverage output on new/modified files (authoritative gate: completion-validator validateCoverage, which blocks on real low coverage)
- **Threshold**: >= configured coverageTarget (default 90%) line coverage
- **Result**: [ ] PENDING

> Advisory because coverage is hard-gated separately by `validateCoverage`. The
> `coverage` rubric evaluator is not automated and would resolve to `skip`, which
> blocks closure; keeping it advisory avoids double-gating every increment.

---

## Code Quality

### R-D02: No critical or high code review findings [blocking]
- **Source**: project-default
- **Evaluator**: sw:review
- **Verify**: review.json findings
- **Threshold**: critical === 0 AND high === 0
- **Result**: [ ] PENDING

---

## Independent Evaluation

### R-D03: Review verdict is ship [blocking]
- **Source**: project-default
- **Evaluator**: sw:review
- **Verify**: review.json ok
- **Threshold**: ok !== false
- **Result**: [ ] PENDING

### R-D04: Independent reviewer was a fresh context [advisory]
- **Source**: project-default
- **Evaluator**: manual
- **Verify**: review.md "Reviewer context" line
- **Threshold**: subagent or new session (never the authoring session)
- **Result**: [ ] PENDING
