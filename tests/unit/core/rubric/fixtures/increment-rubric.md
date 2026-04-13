---
increment: 0663-test
title: Test Increment Rubric
generated: ""
source: spec.md
version: "1.0"
status: pending
---

## Functional Correctness

### R-001: Config schema validated [blocking]
- **Source**: AC-US1-01
- **Evaluator**: sw:grill
- **Verify**: Type exists
- **Threshold**: AC passes
- **Result**: [ ] PENDING

### R-002: Migration works [blocking]
- **Source**: AC-US2-01
- **Evaluator**: sw:grill
- **Verify**: Migration runs
- **Threshold**: Idempotent
- **Result**: [ ] PENDING

## Test Coverage

### R-D01: Unit test coverage meets target [blocking]
- **Source**: increment-override
- **Evaluator**: coverage
- **Verify**: Coverage output
- **Threshold**: >= 80%
- **Result**: [ ] PENDING
