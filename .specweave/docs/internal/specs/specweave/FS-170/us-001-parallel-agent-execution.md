---
id: US-001
feature: FS-170
title: "Parallel Agent Execution"
status: completed
priority: P0
created: 2026-01-20
project: specweave-dev
---

# US-001: Parallel Agent Execution

**Feature**: [FS-170](./FEATURE.md)

**As a** developer using `/sw:auto`,
**I want** to spawn multiple specialized agents in parallel,
**So that** independent workstreams execute concurrently.

---

## Acceptance Criteria

- [x] **AC-US1-01**: `--parallel` flag enables multi-agent mode
- [x] **AC-US1-02**: `--max-parallel N` controls concurrent agents (default: 3, max: 10)
- [x] **AC-US1-03**: Each agent runs in isolated git worktree
- [x] **AC-US1-04**: Orchestrator tracks all agent states in `.specweave/state/parallel/`
- [x] **AC-US1-05**: Stop hook checks all agents before allowing exit
- [x] **AC-US1-06**: Agent failure doesn't crash other agents (graceful degradation)
- [x] **AC-US1-07**: Test coverage for orchestrator ≥90%

---

## Implementation

**Increment**: [0170-parallel-auto-mode](../../../../increments/0170-parallel-auto-mode/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Extend Auto Types with Parallel Definitions
- [x] **T-004**: Create Parallel Types Tests
- [x] **T-013**: Create Parallel Orchestrator
- [x] **T-014**: Create Orchestrator Tests (90%+ coverage)
- [x] **T-019**: Extend Auto Command Options
- [x] **T-022**: Create CLI Tests (90%+ coverage)
- [x] **T-023**: Create Parallel Module Index
- [x] **T-024**: Update Main Auto Module Index
- [x] **T-025**: Create Integration Tests
- [x] **T-026**: Update Auto Command Documentation
- [x] **T-027**: Add Parallel Config to Config Schema
- [x] **T-028**: Create Config Tests
