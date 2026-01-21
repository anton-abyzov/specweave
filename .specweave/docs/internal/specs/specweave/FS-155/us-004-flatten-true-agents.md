---
id: US-004
feature: FS-155
title: Flatten TRUE Agents
status: completed
priority: P0
created: 2026-01-06
project: specweave
external:
  github:
    issue: 993
    url: https://github.com/anton-abyzov/specweave/issues/993
---

# US-004: Flatten TRUE Agents

**Feature**: [FS-155](./FEATURE.md)

**As a** developer using Task tool
**I want** true agents to work natively
**So that** I can spawn isolated sub-agents correctly

---

## Acceptance Criteria

- [x] **AC-US4-01**: Any remaining true agents are flat files `agents/name.md`
- [x] **AC-US4-02**: Agent names are simple (no `sw:` prefix)
- [x] **AC-US4-03**: Task tool can spawn agents with `subagent_type: "name"`
- [x] **AC-US4-04**: AGENTS-INDEX.md updated with native format

---

## Implementation

**Increment**: [0155-native-plugin-skill-architecture](../../../../increments/0155-native-plugin-skill-architecture/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Update AGENTS-INDEX.md
