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
- **Verify**: Coverage output on new/modified files (completion-validator validateCoverage warns on real low coverage)
- **Threshold**: >= `testing.coverage.unit` line coverage
- **Result**: [ ] PENDING

> Opt-in: included only when the project sets `testing.coverage.unit`. There is no
> default target. Advisory because the `coverage` rubric evaluator is not automated.

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
