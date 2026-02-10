---
increment: 0170-parallel-auto-mode
title: "Parallel Auto Mode - Multi-Agent Orchestration Extension"
status: active
priority: P0
feature: FS-AUTO-PARALLEL
tdd: true
testCoverageTarget: 90
---

# Parallel Auto Mode - Multi-Agent Orchestration Extension

## Executive Summary

Extend the existing `/sw:auto` command with parallel agent orchestration capabilities. This refactors and enhances the current auto mode infrastructure in `src/core/auto/` and `src/cli/commands/auto.ts` to support:

1. **Parallel agent execution** via git worktrees
2. **Intelligent flag detection** from natural language prompts
3. **Automated PR generation** per completed workstream
4. **Cross-platform compatibility** (macOS, Linux, Windows)
5. **90%+ test coverage** for all new and refactored code

**Key Principle**: Extend existing code, don't replace. All new features integrate with current auto mode infrastructure.

---

## Problem Statement

The current `/sw:auto` mode executes tasks sequentially with a single agent. This causes:

1. **Sequential bottlenecks** - Frontend/backend/database tasks block each other
2. **No isolation** - Concurrent work on same files risks conflicts
3. **Manual flag specification** - Users must know all available flags
4. **No PR automation** - Manual PR creation after completion
5. **Limited test coverage** - Current auto module lacks comprehensive tests

---

## Solution: Extend Existing Auto Mode

### Architecture

```
src/core/auto/                    # EXISTING - extend these
├── types.ts                      # Add parallel types
├── config.ts                     # Add parallel config
├── index.ts                      # Export new modules
├── prompt-chunker.ts             # EXISTING - enhance
├── parallel/                     # NEW - parallel orchestration
│   ├── types.ts                  # Agent, session, worktree types
│   ├── orchestrator.ts           # Main coordination logic
│   ├── agent-spawner.ts          # Task tool integration
│   ├── worktree-manager.ts       # Git worktree operations
│   ├── prompt-analyzer.ts        # Intelligent flag detection
│   ├── pr-generator.ts           # Automated PR creation
│   ├── state-manager.ts          # Agent state tracking
│   └── platform-utils.ts         # Cross-platform helpers
└── __tests__/                    # NEW - 90%+ coverage
    ├── parallel/
    │   ├── orchestrator.test.ts
    │   ├── agent-spawner.test.ts
    │   ├── worktree-manager.test.ts
    │   ├── prompt-analyzer.test.ts
    │   ├── pr-generator.test.ts
    │   └── state-manager.test.ts
    ├── auto.test.ts              # CLI command tests
    └── integration/
        └── parallel-workflow.test.ts
```

---

## User Stories

### FS-AUTO-PARALLEL: Parallel Auto Mode Feature Set

---

### US-001: Parallel Agent Execution
**Project**: specweave-dev
**As a** developer using `/sw:auto`,
**I want** to spawn multiple specialized agents in parallel,
**So that** independent workstreams execute concurrently.

#### Acceptance Criteria

- [ ] **AC-US1-01**: `--parallel` flag enables multi-agent mode
- [ ] **AC-US1-02**: `--max-parallel N` controls concurrent agents (default: 3, max: 10)
- [ ] **AC-US1-03**: Each agent runs in isolated git worktree
- [ ] **AC-US1-04**: Orchestrator tracks all agent states in `.specweave/state/parallel/`
- [ ] **AC-US1-05**: Stop hook checks all agents before allowing exit
- [ ] **AC-US1-06**: Agent failure doesn't crash other agents (graceful degradation)
- [ ] **AC-US1-07**: Test coverage for orchestrator ≥90%

#### Technical Notes
- Extend `AutoCommandOptions` in `src/cli/commands/auto.ts`
- Add `ParallelOrchestrator` class in `src/core/auto/parallel/orchestrator.ts`
- Use Claude Code Task tool with `run_in_background: true`

---

### US-002: Intelligent Flag Detection
**Project**: specweave-dev
**As a** developer,
**I want** auto mode to suggest flags based on my prompt,
**So that** I don't need to memorize all options.

#### Acceptance Criteria

- [ ] **AC-US2-01**: System analyzes prompts for domain keywords
- [ ] **AC-US2-02**: Suggests `--parallel` when 2+ domains detected
- [ ] **AC-US2-03**: Suggests `--frontend` for React/Vue/CSS keywords
- [ ] **AC-US2-04**: Suggests `--backend` for API/server keywords
- [ ] **AC-US2-05**: Suggests `--database` for schema/migration keywords
- [ ] **AC-US2-06**: Suggests `--pr` for "pull request" mentions
- [ ] **AC-US2-07**: Confidence scores: high (3+ keywords), medium (2), low (1)
- [ ] **AC-US2-08**: Suggestions displayed before execution, user can accept/modify
- [ ] **AC-US2-09**: Test coverage for prompt analyzer ≥90%

#### Technical Notes
- Create `PromptAnalyzer` class in `src/core/auto/parallel/prompt-analyzer.ts`
- Integrate with existing `prompt-chunker.ts` logic
- Keyword dictionaries with weights

---

### US-003: Git Worktree Isolation
**Project**: specweave-dev
**As a** developer,
**I want** each parallel agent in its own git worktree,
**So that** concurrent changes don't conflict.

#### Acceptance Criteria

- [ ] **AC-US3-01**: Worktrees created at `.specweave/worktrees/{agent-id}/`
- [ ] **AC-US3-02**: Each worktree has dedicated branch (`auto/{domain}-{increment}`)
- [ ] **AC-US3-03**: Dirty worktrees preserved on failure
- [ ] **AC-US3-04**: Clean worktrees removed after successful merge
- [ ] **AC-US3-05**: Lock detection prevents duplicate worktrees
- [ ] **AC-US3-06**: Windows long path support (`\\?\` prefix)
- [ ] **AC-US3-07**: Test coverage for worktree manager ≥90%

#### Technical Notes
- Create `WorktreeManager` class in `src/core/auto/parallel/worktree-manager.ts`
- Use native `git worktree` commands
- Cross-platform path handling

---

### US-004: Automated PR Generation
**Project**: specweave-dev
**As a** developer,
**I want** automatic PR creation for completed workstreams,
**So that** changes are ready for review.

#### Acceptance Criteria

- [ ] **AC-US4-01**: `--pr` flag enables PR generation
- [ ] **AC-US4-02**: PR title: `[{increment}] {domain}: {summary}`
- [ ] **AC-US4-03**: PR body includes task completion checklist
- [ ] **AC-US4-04**: PR labeled by domain (frontend, backend, database)
- [ ] **AC-US4-05**: `--draft-pr` creates draft PRs
- [ ] **AC-US4-06**: Works with GitHub, GitLab, Azure DevOps
- [ ] **AC-US4-07**: Test coverage for PR generator ≥90%

#### Technical Notes
- Create `PRGenerator` class in `src/core/auto/parallel/pr-generator.ts`
- Integrate with existing `sw-github`, `sw-jira`, `sw-ado` plugins
- Provider detection from git remote

---

### US-005: Cross-Platform Compatibility
**Project**: specweave-dev
**As a** developer on any OS,
**I want** parallel auto mode to work consistently,
**So that** I can use it on macOS, Linux, or Windows.

#### Acceptance Criteria

- [ ] **AC-US5-01**: All git commands work cross-platform
- [ ] **AC-US5-02**: Path handling uses forward slashes for git
- [ ] **AC-US5-03**: Process spawning works on cmd.exe, PowerShell, bash
- [ ] **AC-US5-04**: File locking works on all filesystems
- [ ] **AC-US5-05**: Test suite passes on all platforms (CI matrix)
- [ ] **AC-US5-06**: Test coverage for platform utils ≥90%

#### Technical Notes
- Create `PlatformUtils` in `src/core/auto/parallel/platform-utils.ts`
- Use `path.posix` for git operations
- Conditional logic for Windows specifics

---

### US-006: Domain-Specific Agent Flags
**Project**: specweave-dev
**As a** developer,
**I want** to explicitly request domain-specific agents,
**So that** I control which workstreams run in parallel.

#### Acceptance Criteria

- [ ] **AC-US6-01**: `--frontend` spawns frontend-specialized agent
- [ ] **AC-US6-02**: `--backend` spawns backend-specialized agent
- [ ] **AC-US6-03**: `--database` spawns database-specialized agent
- [ ] **AC-US6-04**: `--devops` spawns devops-specialized agent
- [ ] **AC-US6-05**: `--qa` spawns QA-specialized agent
- [ ] **AC-US6-06**: Multiple flags combinable (`--frontend --backend`)
- [ ] **AC-US6-07**: At least one domain required when `--parallel` used
- [ ] **AC-US6-08**: Test coverage for agent spawner ≥90%

#### Technical Notes
- Extend CLI options in `src/cli/commands/auto.ts`
- Create `AgentSpawner` in `src/core/auto/parallel/agent-spawner.ts`
- Map domains to `subagent_type` values

---

### US-007: Agent State Management
**Project**: specweave-dev
**As a** system,
**I want** to track parallel agent states,
**So that** the orchestrator coordinates work correctly.

#### Acceptance Criteria

- [ ] **AC-US7-01**: Agent state stored in `.specweave/state/parallel/agents/{id}.json`
- [ ] **AC-US7-02**: State includes: id, domain, status, tasks, progress, errors
- [ ] **AC-US7-03**: Session state in `.specweave/state/parallel/session.json`
- [ ] **AC-US7-04**: Heartbeat mechanism detects zombie agents (>5 min stale)
- [ ] **AC-US7-05**: State persisted on crash for recovery
- [ ] **AC-US7-06**: Test coverage for state manager ≥90%

#### Technical Notes
- Create `StateManager` in `src/core/auto/parallel/state-manager.ts`
- JSON file storage (simple, debuggable)
- Heartbeat via timestamp updates

---

### US-008: Merge Strategy Options
**Project**: specweave-dev
**As a** developer,
**I want** to control how parallel work is merged,
**So that** I choose the appropriate integration approach.

#### Acceptance Criteria

- [ ] **AC-US8-01**: `--merge-strategy auto` attempts automatic merge
- [ ] **AC-US8-02**: `--merge-strategy manual` never auto-merges
- [ ] **AC-US8-03**: `--merge-strategy pr` creates PR instead of merging
- [ ] **AC-US8-04**: `--base-branch NAME` sets merge target
- [ ] **AC-US8-05**: Conflict detection with clear error messages
- [ ] **AC-US8-06**: Merge order respects dependencies (db → backend → frontend)
- [ ] **AC-US8-07**: Test coverage for merge logic ≥90%

#### Technical Notes
- Add merge options to CLI
- Implement in `WorktreeManager` or separate `MergeCoordinator`

---

### US-009: Parallel Status Dashboard
**Project**: specweave-dev
**As a** developer,
**I want** to see real-time status of all parallel agents,
**So that** I understand overall progress.

#### Acceptance Criteria

- [ ] **AC-US9-01**: `specweave auto-status --parallel` shows all agents
- [ ] **AC-US9-02**: Status icons: ⏳ pending, 🔄 running, ✅ done, ❌ failed
- [ ] **AC-US9-03**: Progress bars show task completion
- [ ] **AC-US9-04**: Elapsed time per agent displayed
- [ ] **AC-US9-05**: `--watch` flag enables live updates (2s refresh)
- [ ] **AC-US9-06**: Test coverage for dashboard ≥90%

#### Technical Notes
- Extend `src/cli/commands/auto-status.ts`
- Use `chalk` and `cli-table3` for formatting
- Read from state files

---

### US-010: Stop Hook Parallel Awareness
**Project**: specweave-dev
**As a** system,
**I want** the stop hook to check all parallel agents,
**So that** auto mode doesn't exit prematurely.

#### Acceptance Criteria

- [ ] **AC-US10-01**: Stop hook detects parallel session
- [ ] **AC-US10-02**: Counts pending agents (not just increments)
- [ ] **AC-US10-03**: Blocks exit if any agent still running
- [ ] **AC-US10-04**: Shows agent status in block message
- [ ] **AC-US10-05**: Approves exit only when all agents completed/failed

#### Technical Notes
- Modify `plugins/specweave/hooks/stop-auto.sh`
- Read `.specweave/state/parallel/session.json`
- Count agents with status != 'completed' && != 'failed'

---

## Non-Functional Requirements

### NFR-001: Test Coverage (MANDATORY)
- **All new code**: ≥90% line coverage
- **All refactored code**: ≥90% line coverage
- **Integration tests**: Full workflow coverage
- **Platform tests**: CI matrix for macOS, Linux, Windows

### NFR-002: Performance
- Agent spawn time < 3 seconds
- State polling overhead < 1% CPU
- Worktree creation < 2 seconds (excluding large repos)

### NFR-003: Reliability
- Graceful degradation on agent failure
- No data loss on crash (worktrees preserved)
- Recovery from interrupted sessions

### NFR-004: Compatibility
- macOS 12+, Ubuntu 20.04+, Windows 10+
- Git 2.30+ (worktree support)
- Node.js 18+ (SpecWeave requirement)

---

## Out of Scope

1. Multi-machine distributed agents
2. Container-based isolation
3. Custom AI engines (Claude Code only)
4. Real-time agent collaboration
5. GUI dashboard

---

## Dependencies

- Existing `src/core/auto/` module
- Existing `src/cli/commands/auto.ts`
- Claude Code Task tool
- Git worktree support (Git 2.5+)
- Vitest for testing

---

## Success Metrics

1. **Test coverage**: 90%+ for all auto module code
2. **Parallel speedup**: 2-3x faster for multi-domain features
3. **Cross-platform**: Tests pass on macOS, Linux, Windows
4. **Integration**: Works seamlessly with existing `/sw:auto` flags

---

## References

- [Existing Auto Module](src/core/auto/)
- [Auto CLI Command](src/cli/commands/auto.ts)
- [Stop Hook](plugins/specweave/hooks/stop-auto.sh)
- [Auto Command Docs](plugins/specweave/commands/auto.md)
