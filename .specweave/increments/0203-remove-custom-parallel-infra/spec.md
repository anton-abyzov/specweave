---
increment: 0203-remove-custom-parallel-infra
title: "Remove custom parallel agent infrastructure"
type: refactor
priority: P1
status: completed
created: 2026-02-12
structure: user-stories
test_mode: TDD
coverage_target: 80
---

# Feature: Remove Custom Parallel Agent Infrastructure

## Overview

Remove SpecWeave's custom parallel agent orchestration system (`src/core/auto/parallel/`) and rely solely on Claude Code's native Agent Teams mechanism. The native system already provides agent spawning, skill availability, CLAUDE.md context, MCP servers, and inter-agent communication — making our custom infrastructure redundant.

## User Stories

### US-001: Remove Parallel Module Source Code (P1)
**Project**: specweave
**Board**: modules

**As a** SpecWeave maintainer
**I want** the custom parallel module removed
**So that** we eliminate ~65KB of redundant code and reduce maintenance burden

**Acceptance Criteria**:
- [x] **AC-US1-01**: `src/core/auto/parallel/` directory deleted (agent-spawner, orchestrator, worktree-manager, state-manager, pr-generator, prompt-analyzer, platform-utils, index)
- [x] **AC-US1-02**: Parallel-specific types removed from `src/core/auto/types.ts` (AgentDomain, ParallelAgent, ParallelSession, ParallelConfig, WorktreeInfo, PRResult, GitProvider, FlagSuggestion, AgentStatus, DOMAIN_SUBAGENT_MAP, DEFAULT_PARALLEL_CONFIG)
- [x] **AC-US1-03**: `export * from './parallel/index.js'` removed from `src/core/auto/index.ts`
- [x] **AC-US1-04**: Project builds cleanly with `npm run rebuild`

---

### US-002: Remove Parallel CLI Commands (P1)
**Project**: specweave
**Board**: modules

**As a** SpecWeave user
**I want** the parallel CLI flags removed from `specweave auto`
**So that** the CLI surface is simplified and doesn't advertise removed features

**Acceptance Criteria**:
- [x] **AC-US2-01**: `auto.ts` — parallel imports, flags, `handleParallelMode()`, `isParallelModeRequested()`, `getSelectedDomains()`, `buildParallelConfig()` removed
- [x] **AC-US2-02**: `auto-status.ts` — parallel imports, `--parallel`/`--watch` flags, `displayParallelStatus()`, `displayParallelDashboard()`, `watchParallelStatus()` removed
- [x] **AC-US2-03**: `plugins/specweave/commands/auto-parallel.md` deleted
- [x] **AC-US2-04**: CLI `specweave auto` and `specweave auto-status` work correctly without parallel features

---

### US-003: Simplify Team Skills to Native Agent Teams Only (P1)
**Project**: specweave
**Board**: modules

**As a** SpecWeave user
**I want** team skills to only use Claude Code's native Agent Teams
**So that** there's one clear mechanism for multi-agent orchestration

**Acceptance Criteria**:
- [x] **AC-US3-01**: `team-lead/SKILL.md` — remove subagent fallback mode, file-based messaging, worktree references
- [x] **AC-US3-02**: `team-build/SKILL.md` — remove references to subagent fallback mode
- [x] **AC-US3-03**: `team-status/SKILL.md` — remove references to parallel state files and custom orchestrator
- [x] **AC-US3-04**: `team-merge/SKILL.md` — remove subagent mode detection, keep only native Agent Teams path
- [x] **AC-US3-05**: `auto/SKILL.md` — remove references to parallel/worktree features

---

### US-004: Remove Parallel Tests (P1)
**Project**: specweave
**Board**: modules

**As a** SpecWeave maintainer
**I want** tests for removed code deleted
**So that** the test suite stays clean and passes

**Acceptance Criteria**:
- [x] **AC-US4-01**: Delete test files for parallel module (agent-spawner, orchestrator, pr-generator, prompt-analyzer, state-manager, worktree-manager, platform-utils, parallel-integration)
- [x] **AC-US4-02**: Delete `tests/unit/cli/commands/auto-parallel.test.ts`
- [x] **AC-US4-03**: Update `tests/plugin-validation/agent-teams-skills.test.ts` to remove custom parallel references
- [x] **AC-US4-04**: Full test suite passes with `npm test`

## Success Criteria

- `npm run rebuild` completes with zero errors
- `npm test` passes (all remaining tests green)
- No references to `src/core/auto/parallel/` remain in source code
- Team skills work with native Agent Teams only

## Out of Scope

- Native Agent Teams improvements (Claude Code's responsibility)
- Changes to non-parallel auto mode features (completion-evaluator, plan-approval, prompt-chunker, e2e-coverage)
- Adding new features to team skills

## Dependencies

- Claude Code native Agent Teams (experimental feature, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)
