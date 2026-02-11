---
id: US-003
feature: FS-197
title: "Agent Team Presets"
status: completed
priority: P1
created: 2026-02-10
tldr: "**As a** developer who frequently uses common team patterns
**I want** pre-defined team compositions I can invoke by name
**So that** I don't have to describe team formation every time."
project: specweave
---

# US-003: Agent Team Presets

**Feature**: [FS-197](./FEATURE.md)

**As a** developer who frequently uses common team patterns
**I want** pre-defined team compositions I can invoke by name
**So that** I don't have to describe team formation every time

---

## Acceptance Criteria

- [x] **AC-US3-01**: `full-stack` preset: frontend (`sw-frontend:frontend-architect`) + backend + shared (`sw:architect`)
- [x] **AC-US3-02**: `review` preset: security (`sw:security`) + code quality (`sw:grill`/`sw:tech-lead`) + documentation (`sw:docs-updater`)
- [x] **AC-US3-03**: `testing` preset: unit (`sw-testing:unit-testing`) + e2e (`sw-testing:e2e-testing`) + coverage (`sw-testing:qa-engineer`)
- [x] **AC-US3-04**: `migration` preset: schema (`sw:architect`) + backend + frontend (for DB migrations)
- [x] **AC-US3-05**: `tdd` preset: red agent (`sw:tdd-red`) + green agent (`sw:tdd-green`) + refactor agent (`sw:tdd-refactor`)
- [x] **AC-US3-06**: Usage: `/sw:team-build --preset full-stack "Build checkout"`

---

## Implementation

**Increment**: [0197-native-agent-teams](../../../../increments/0197-native-agent-teams/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
