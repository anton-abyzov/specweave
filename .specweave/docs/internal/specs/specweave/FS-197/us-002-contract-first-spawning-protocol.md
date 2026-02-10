---
id: US-002
feature: FS-197
title: "Contract-First Spawning Protocol"
status: completed
priority: P1
created: 2026-02-10
tldr: "**As a** developer building cross-layer features
**I want** upstream agents (database/shared) to establish contracts before downstream agents (backend/frontend) start
**So that** agents don't waste tokens building against incorrect schemas/types."
project: specweave
---

# US-002: Contract-First Spawning Protocol

**Feature**: [FS-197](./FEATURE.md)

**As a** developer building cross-layer features
**I want** upstream agents (database/shared) to establish contracts before downstream agents (backend/frontend) start
**So that** agents don't waste tokens building against incorrect schemas/types

---

## Acceptance Criteria

- [x] **AC-US2-01**: SKILL.md defines contract chain: `shared/types` → `database/schema` → `backend/api` → `frontend/ui`
- [x] **AC-US2-02**: Phase 1 spawns ONLY upstream agents (shared types, DB schema)
- [x] **AC-US2-03**: Phase 1 agent signals contract completion by writing a contract file (e.g., `src/types/api-contract.ts` or `prisma/schema.prisma`)
- [x] **AC-US2-04**: Phase 2 spawns downstream agents ONLY after contract files exist
- [x] **AC-US2-05**: Contract files are passed as context to downstream agent spawn prompts
- [x] **AC-US2-06**: If no cross-layer dependencies detected, all agents spawn in parallel immediately

---

## Implementation

**Increment**: [0197-native-agent-teams](../../../../increments/0197-native-agent-teams/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-023**: [RED] Write integration test for full-stack preset end-to-end
