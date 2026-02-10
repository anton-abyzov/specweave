---
id: US-001
feature: FS-171
title: Router Skill Detection
status: completed
priority: high
created: 2026-01-18
project: specweave
external:
  github:
    issue: 1020
    url: https://github.com/anton-abyzov/specweave/issues/1020
---

# US-001: Router Skill Detection

**Feature**: [FS-171](./FEATURE.md)

**As a** developer using Claude Code,
**I want** SpecWeave skills to load only when I mention SpecWeave-related keywords,
**So that** my context isn't bloated when doing non-SpecWeave work.

---

## Acceptance Criteria

- [x] **AC-US1-01**: Router skill is <100 lines and <500 tokens
- [x] **AC-US1-02**: Router detects keywords: increment, specweave, /sw:, spec.md, tasks.md, living docs, feature planning, sprint
- [x] **AC-US1-03**: Non-matching prompts do NOT trigger plugin loading
- [x] **AC-US1-04**: Keyword detection is case-insensitive
- [x] **AC-US1-05**: Detection latency is <50ms

---

## Implementation

**Increment**: [0171-lazy-plugin-loading](../../../../increments/0171-lazy-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create Keyword Detector Module
- [x] **T-002**: Create Router Skill SKILL.md
- [x] **T-004**: Add Router Skill to Marketplace
- [x] **T-033**: Write Unit Tests for Keyword Detector
