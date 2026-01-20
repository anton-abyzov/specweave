---
id: US-006
feature: FS-170
title: "Domain-Specific Agent Flags"
status: completed
priority: P0
created: 2026-01-20
project: specweave-dev
---

# US-006: Domain-Specific Agent Flags

**Feature**: [FS-170](./FEATURE.md)

**As a** developer,
**I want** to explicitly request domain-specific agents,
**So that** I control which workstreams run in parallel.

---

## Acceptance Criteria

- [x] **AC-US6-01**: `--frontend` spawns frontend-specialized agent
- [x] **AC-US6-02**: `--backend` spawns backend-specialized agent
- [x] **AC-US6-03**: `--database` spawns database-specialized agent
- [x] **AC-US6-04**: `--devops` spawns devops-specialized agent
- [x] **AC-US6-05**: `--qa` spawns QA-specialized agent
- [x] **AC-US6-06**: Multiple flags combinable (`--frontend --backend`)
- [x] **AC-US6-07**: At least one domain required when `--parallel` used
- [x] **AC-US6-08**: Test coverage for agent spawner ≥90%

---

## Implementation

**Increment**: [0170-parallel-auto-mode](../../../../increments/0170-parallel-auto-mode/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Extend Auto Types with Parallel Definitions
- [x] **T-011**: Create Agent Spawner
- [x] **T-012**: Create Agent Spawner Tests (90%+ coverage)
- [x] **T-019**: Extend Auto Command Options
- [x] **T-026**: Update Auto Command Documentation
