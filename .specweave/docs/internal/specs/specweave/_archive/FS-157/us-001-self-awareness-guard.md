---
id: US-001
feature: FS-157
title: "Self-Awareness Guard"
status: completed
priority: P1
created: 2026-01-07
project: specweave-dev
---

# US-001: Self-Awareness Guard

**Feature**: [FS-157](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: Detect SpecWeave repo by checking `package.json` name field equals "specweave"
- [x] **AC-US1-02**: Detect SpecWeave repo by checking for `src/cli/commands` directory existence
- [x] **AC-US1-03**: Detect SpecWeave repo by checking for `plugins/specweave` directory existence
- [x] **AC-US1-04**: When detected, display warning: "⚠️ Running in SpecWeave repository itself!"
- [x] **AC-US1-05**: Prompt user to confirm: "Creating increment FOR SpecWeave development" vs "Testing with example"
- [x] **AC-US1-06**: Provide options: Continue, Cancel, or Suggest examples/ directory for tests
- [x] **AC-US1-07**: Add `--force-specweave-dev` flag to bypass warning for CI/automation

---

## Implementation

**Increment**: [0157-skill-routing-optimization](../../../../increments/0157-skill-routing-optimization/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
