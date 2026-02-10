---
id: US-006
feature: FS-197
title: "Agent Communication Protocol"
status: completed
priority: P1
created: 2026-02-10
tldr: "**As a** developer with agents that need to share discoveries
**I want** agents to communicate design decisions and contract changes to each other
**So that** downstream work stays consistent with upstream changes."
project: specweave
---

# US-006: Agent Communication Protocol

**Feature**: [FS-197](./FEATURE.md)

**As a** developer with agents that need to share discoveries
**I want** agents to communicate design decisions and contract changes to each other
**So that** downstream work stays consistent with upstream changes

---

## Acceptance Criteria

- [x] **AC-US6-01**: In native Agent Teams mode: agents use SDK `SendMessage` for peer communication
- [x] **AC-US6-02**: In subagent fallback mode: agents communicate via shared files in `.specweave/state/parallel/messages/`
- [x] **AC-US6-03**: SKILL.md instructs agents to announce: (1) contract changes, (2) blocking issues, (3) completion signals
- [x] **AC-US6-04**: Lead agent aggregates messages into a summary when checking `/sw:team-status`

---

## Implementation

**Increment**: [0197-native-agent-teams](../../../../increments/0197-native-agent-teams/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
