---
id: US-001
feature: FS-197
title: "Agent Team Formation with Domain Skills"
status: completed
priority: P1
created: 2026-02-10
tldr: "**As a** developer using SpecWeave with Agent Teams enabled
**I want** Claude Code to automatically form an optimal team with SpecWeave domain skills assigned per teammate
**So that** each agent has expert-level instructions for its domain without me having to specify everything manually."
project: specweave
---

# US-001: Agent Team Formation with Domain Skills

**Feature**: [FS-197](./FEATURE.md)

**As a** developer using SpecWeave with Agent Teams enabled
**I want** Claude Code to automatically form an optimal team with SpecWeave domain skills assigned per teammate
**So that** each agent has expert-level instructions for its domain without me having to specify everything manually

---

## Acceptance Criteria

- [x] **AC-US1-01**: When user says `/sw:team-orchestrate "feature"`, Claude Code analyzes the feature and proposes agent roles with specific SpecWeave skills
- [x] **AC-US1-02**: Agent-to-skill mapping covers all core domains:
- [x] **AC-US1-03**: Each agent's spawn prompt includes: (1) assigned SpecWeave skill to invoke, (2) increment ID to work on, (3) file ownership list, (4) contract dependencies
- [x] **AC-US1-04**: Formation respects WIP limits (max 5 active increments by default)
- [x] **AC-US1-05**: `--dry-run` flag shows proposed team without launching

---

## Implementation

**Increment**: [0197-native-agent-teams](../../../../increments/0197-native-agent-teams/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-023**: [RED] Write integration test for full-stack preset end-to-end
