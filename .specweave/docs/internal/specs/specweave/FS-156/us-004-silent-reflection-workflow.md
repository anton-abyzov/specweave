---
id: US-004
feature: FS-156
title: Silent Reflection Workflow
status: completed
priority: P1
created: 2026-01-06
project: specweave
external:
  github:
    issue: 974
    url: https://github.com/anton-abyzov/specweave/issues/974
---

# US-004: Silent Reflection Workflow

**Feature**: [FS-156](./FEATURE.md)

**As a** SpecWeave user
**I want** reflection to happen automatically with no prompts
**So that** learning is seamless and non-intrusive

---

## Acceptance Criteria

- [x] **AC-US4-01**: Stop hook detects reflection opportunities (corrections, approvals)
- [x] **AC-US4-02**: Confidence levels calculated: HIGH (>80%), MEDIUM (50-80%), LOW (<50%)
- [x] **AC-US4-03**: HIGH confidence learnings auto-commit to MEMORY.md
- [x] **AC-US4-04**: MEDIUM/LOW learnings queued for user review
- [x] **AC-US4-05**: Silent notification via jq system message (no interruption)
- [x] **AC-US4-06**: `/sw:reflect-status` shows pending and committed learnings

---

## Implementation

**Increment**: [0156-per-skill-reflection-memory-override](../../../../increments/0156-per-skill-reflection-memory-override/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-012**: Create memory parser utility
- [x] **T-013**: Implement content similarity algorithm
- [x] **T-014**: Implement deduplication logic
- [x] **T-015**: Create merge script
- [x] **T-016**: Update bin/install-skills.sh with smart merge
- [x] **T-017**: Create backup mechanism
