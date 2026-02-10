---
id: US-005
feature: FS-197
title: "SpecWeave Workflow Integration"
status: completed
priority: P1
created: 2026-02-10
tldr: "**As a** developer using Agent Teams within SpecWeave's increment lifecycle
**I want** each agent to follow the standard SpecWeave workflow (increment → do → progress → done)
**So that** all work is tracked, quality-gated, and syncable."
project: specweave
---

# US-005: SpecWeave Workflow Integration

**Feature**: [FS-197](./FEATURE.md)

**As a** developer using Agent Teams within SpecWeave's increment lifecycle
**I want** each agent to follow the standard SpecWeave workflow (increment → do → progress → done)
**So that** all work is tracked, quality-gated, and syncable

---

## Acceptance Criteria

- [x] **AC-US5-01**: Each agent runs `/sw:do` (or `/sw:auto`) on its assigned increment
- [x] **AC-US5-02**: Each agent updates its `tasks.md` as it completes tasks
- [x] **AC-US5-03**: Lead agent can check `/sw:team-status` to see progress across all increments
- [x] **AC-US5-04**: `/sw:grill` runs per agent before it signals completion
- [x] **AC-US5-05**: `/sw:team-merge` triggers `/sw:done` per increment after successful merge
- [x] **AC-US5-06**: GitHub/JIRA sync triggered per increment via `/sw-github:sync` or `/sw-jira:push`

---

## Implementation

**Increment**: [0197-native-agent-teams](../../../../increments/0197-native-agent-teams/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-013**: [GREEN] Write complete agent spawn prompt templates per domain
