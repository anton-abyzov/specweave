---
id: US-001
feature: FS-155
title: Convert PM Agent to Skill
status: completed
priority: P0
created: 2026-01-06
project: specweave
external:
  github:
    issue: 990
    url: https://github.com/anton-abyzov/specweave/issues/990
---

# US-001: Convert PM Agent to Skill

**Feature**: [FS-155](./FEATURE.md)

**As a** user asking about product planning
**I want** the PM skill to auto-activate
**So that** I get product management guidance without explicit invocation

---

## Acceptance Criteria

- [x] **AC-US1-01**: PM moved from `agents/pm/` to `skills/pm/SKILL.md`
- [x] **AC-US1-02**: Description contains activation keywords for semantic matching
- [x] **AC-US1-03**: Large content split into progressive disclosure files
- [x] **AC-US1-04**: Skill activates when user mentions "product planning", "user stories", etc.

---

## Implementation

**Increment**: [0155-native-plugin-skill-architecture](../../../../increments/0155-native-plugin-skill-architecture/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Convert PM Agent to Skill with Progressive Disclosure
