---
id: US-004
feature: FS-171
title: "Context Forking for Heavy Skills"
status: completed
priority: high
created: 2026-01-18
project: specweave
---

# US-004: Context Forking for Heavy Skills

**Feature**: [FS-171](./FEATURE.md)

**As a** developer,
**I want** heavy skills (architect, planner, etc.) to run in forked context,
**So that** my main conversation context isn't overwhelmed.

---

## Acceptance Criteria

- [x] **AC-US4-01**: Skills >200 lines use `context: fork` in frontmatter
- [x] **AC-US4-02**: Forked skills use appropriate agent type (Explore, Plan, general-purpose)
- [x] **AC-US4-03**: Forked skill results return to main conversation
- [x] **AC-US4-04**: At least 15 heavy skills converted to forked context
- [x] **AC-US4-05**: Token usage reduced by >30% for forked skills (achieved 46%)

---

## Implementation

**Increment**: [0171-lazy-plugin-loading](../../../../increments/0171-lazy-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-012**: Audit Skills for Line Count
- [x] **T-013**: Convert Architect Skill to Forked Context
- [x] **T-014**: Convert PM and QA Skills to Forked Context
- [x] **T-015**: Convert Security and Tech Lead Skills
- [x] **T-016**: Measure Token Reduction from Forking
