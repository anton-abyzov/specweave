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

### R-D02: No critical or high code review findings [advisory]
- **Source**: project-default
- **Evaluator**: sw:review
- **Verify**: newest reports/review*.md verdict and its critical/high findings (what closure-gate.ts reads)
- **Threshold**: critical === 0 AND high === 0
- **Note**: `specweave complete` only reports this as a notice; `reports/verify.json` is the one blocking gate
- **Result**: [ ] PENDING
