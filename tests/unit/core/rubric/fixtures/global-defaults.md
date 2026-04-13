---
increment: defaults
title: Global Rubric Defaults
generated: ""
source: specweave-defaults
version: "1.0"
status: defaults
---

## Test Coverage

### R-D01: Unit test coverage meets target [blocking]
- **Source**: project-default
- **Evaluator**: coverage
- **Verify**: Coverage output
- **Threshold**: >= 90%
- **Result**: [ ] PENDING

## Code Quality

### R-D02: No critical code review findings [blocking]
- **Source**: project-default
- **Evaluator**: sw:code-reviewer
- **Verify**: code-review-report.json
- **Threshold**: critical === 0 AND high === 0
- **Result**: [ ] PENDING
