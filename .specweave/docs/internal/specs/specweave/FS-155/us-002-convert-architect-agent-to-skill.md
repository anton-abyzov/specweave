---
id: US-002
feature: FS-155
title: Convert Architect Agent to Skill
status: completed
priority: P0
created: 2026-01-06
project: specweave
external:
  github:
    issue: 991
    url: https://github.com/anton-abyzov/specweave/issues/991
---

# US-002: Convert Architect Agent to Skill

**Feature**: [FS-155](./FEATURE.md)

**As a** user asking about system design
**I want** the Architect skill to auto-activate
**So that** I get architecture guidance automatically

---

## Acceptance Criteria

- [x] **AC-US2-01**: Architect moved from `agents/architect/` to `skills/architect/SKILL.md`
- [x] **AC-US2-02**: Description optimized for activation keywords
- [x] **AC-US2-03**: ADR templates moved to progressive disclosure
- [x] **AC-US2-04**: Skill activates for "architecture", "design", "ADR" prompts

---

## Implementation

**Increment**: [0155-native-plugin-skill-architecture](../../../../increments/0155-native-plugin-skill-architecture/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Convert Architect Agent to Skill
