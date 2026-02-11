---
status: completed
---
# 0197: Native Agent Teams Integration

## Problem Statement

SpecWeave has a mature parallel agent system (0170) using Claude Code's **Task tool** (subagents). However, subagents are isolated — no peer communication, no shared task lists, no real-time coordination. Claude Code's new **experimental Agent Teams** feature provides true collaboration: shared task lists, peer-to-peer messaging, terminal split panes, and full Claude Code instances per teammate.

The gap: SpecWeave's existing `/sw:team-orchestrate` skill has ONE line about Agent Teams with zero guidance. Claude Code is notoriously bad at forming teams without detailed instructions. SpecWeave already has 40+ domain skills that map perfectly to agent roles — they just need to be wired into Agent Teams properly.

## Goal

Upgrade SpecWeave's team skills to leverage Claude Code's native Agent Teams when available, with **contract-first spawning**, **domain-specific agent instructions**, and **SpecWeave increment files as the coordination protocol** — while preserving backward compatibility with the subagent approach.

## Scope

**In Scope:**
- Enhanced `/sw:team-orchestrate` SKILL.md with native Agent Teams instructions
- New `/sw:team-build` skill for implementation-focused team workflows
- Contract-first spawning protocol (upstream dependencies before parallel work)
- Domain-to-skill agent role mapping with detailed per-agent instructions
- Terminal configuration guidance (tmux/iTerm2/in-process)
- Agent team presets (full-stack, review, testing, migration)
- Integration with `/sw:auto`, `/sw:grill`, `/sw:progress`
- Setup guide and docs-site page

**Out of Scope:**
- Multi-machine distributed agents
- Container-based isolation (Docker per agent)
- Custom AI engine support (Claude Code only)
- GUI dashboard (CLI/terminal only)
- Changes to the `src/core/auto/parallel/` TypeScript module (that's 0170's territory)

## User Stories

### US-001: Agent Team Formation with Domain Skills
**As a** developer using SpecWeave with Agent Teams enabled
**I want** Claude Code to automatically form an optimal team with SpecWeave domain skills assigned per teammate
**So that** each agent has expert-level instructions for its domain without me having to specify everything manually

**Acceptance Criteria:**
- [x] AC-US1-01: When user says `/sw:team-orchestrate "feature"`, Claude Code analyzes the feature and proposes agent roles with specific SpecWeave skills
- [x] AC-US1-02: Agent-to-skill mapping covers all core domains:
  - Frontend: `sw-frontend:frontend-architect` + `sw-frontend:nextjs` (if Next.js detected)
  - Backend: `sw-infra:devops` or domain-specific backend skill
  - Database/Shared: `sw:architect` for schema design + types
  - Testing: `sw-testing:qa-engineer` + `sw-testing:e2e-testing`
  - Security: `sw:security` for security-focused reviews
  - DevOps: `sw-infra:devops` + `sw-k8s:*` (if K8s detected)
- [x] AC-US1-03: Each agent's spawn prompt includes: (1) assigned SpecWeave skill to invoke, (2) increment ID to work on, (3) file ownership list, (4) contract dependencies
- [x] AC-US1-04: Formation respects WIP limits (max 5 active increments by default)
- [x] AC-US1-05: `--dry-run` flag shows proposed team without launching

### US-002: Contract-First Spawning Protocol
**As a** developer building cross-layer features
**I want** upstream agents (database/shared) to establish contracts before downstream agents (backend/frontend) start
**So that** agents don't waste tokens building against incorrect schemas/types

**Acceptance Criteria:**
- [x] AC-US2-01: SKILL.md defines contract chain: `shared/types` → `database/schema` → `backend/api` → `frontend/ui`
- [x] AC-US2-02: Phase 1 spawns ONLY upstream agents (shared types, DB schema)
- [x] AC-US2-03: Phase 1 agent signals contract completion by writing a contract file (e.g., `src/types/api-contract.ts` or `prisma/schema.prisma`)
- [x] AC-US2-04: Phase 2 spawns downstream agents ONLY after contract files exist
- [x] AC-US2-05: Contract files are passed as context to downstream agent spawn prompts
- [x] AC-US2-06: If no cross-layer dependencies detected, all agents spawn in parallel immediately

### US-003: Agent Team Presets
**As a** developer who frequently uses common team patterns
**I want** pre-defined team compositions I can invoke by name
**So that** I don't have to describe team formation every time

**Acceptance Criteria:**
- [x] AC-US3-01: `full-stack` preset: frontend (`sw-frontend:frontend-architect`) + backend + shared (`sw:architect`)
- [x] AC-US3-02: `review` preset: security (`sw:security`) + code quality (`sw:grill`/`sw:tech-lead`) + documentation (`sw:docs-updater`)
- [x] AC-US3-03: `testing` preset: unit (`sw-testing:unit-testing`) + e2e (`sw-testing:e2e-testing`) + coverage (`sw-testing:qa-engineer`)
- [x] AC-US3-04: `migration` preset: schema (`sw:architect`) + backend + frontend (for DB migrations)
- [x] AC-US3-05: `tdd` preset: red agent (`sw:tdd-red`) + green agent (`sw:tdd-green`) + refactor agent (`sw:tdd-refactor`)
- [x] AC-US3-06: Usage: `/sw:team-build --preset full-stack "Build checkout"`

### US-004: Terminal Multiplexer Configuration
**As a** developer who wants visual split-pane monitoring
**I want** clear guidance on setting up tmux or iTerm2 for Agent Teams
**So that** I can see all agents working simultaneously in split panes

**Acceptance Criteria:**
- [x] AC-US4-01: SKILL.md detects terminal mode: tmux installed → recommend tmux; macOS + iTerm2 → offer as alternative; neither → default to in-process
- [x] AC-US4-02: Setup instructions for tmux (brew install tmux / apt install tmux / WSL setup)
- [x] AC-US4-03: Setup instructions for iTerm2 (it2 CLI + Python API)
- [x] AC-US4-04: In-process mode works without any terminal multiplexer (Shift+Up/Down to navigate)
- [x] AC-US4-05: Navigation guide: tmux (Ctrl+B + arrow), iTerm2 (click pane), in-process (Shift+Up/Down)
- [x] AC-US4-06: `settings.json` configuration example for enabling agent teams per-project

### US-005: SpecWeave Workflow Integration
**As a** developer using Agent Teams within SpecWeave's increment lifecycle
**I want** each agent to follow the standard SpecWeave workflow (increment → do → progress → done)
**So that** all work is tracked, quality-gated, and syncable

**Acceptance Criteria:**
- [x] AC-US5-01: Each agent runs `/sw:do` (or `/sw:auto`) on its assigned increment
- [x] AC-US5-02: Each agent updates its `tasks.md` as it completes tasks
- [x] AC-US5-03: Lead agent can check `/sw:team-status` to see progress across all increments
- [x] AC-US5-04: `/sw:grill` runs per agent before it signals completion
- [x] AC-US5-05: `/sw:team-merge` triggers `/sw:done` per increment after successful merge
- [x] AC-US5-06: GitHub/JIRA sync triggered per increment via `/sw-github:sync` or `/sw-jira:push`

### US-006: Agent Communication Protocol
**As a** developer with agents that need to share discoveries
**I want** agents to communicate design decisions and contract changes to each other
**So that** downstream work stays consistent with upstream changes

**Acceptance Criteria:**
- [x] AC-US6-01: In native Agent Teams mode: agents use SDK `SendMessage` for peer communication
- [x] AC-US6-02: In subagent fallback mode: agents communicate via shared files in `.specweave/state/parallel/messages/`
- [x] AC-US6-03: SKILL.md instructs agents to announce: (1) contract changes, (2) blocking issues, (3) completion signals
- [x] AC-US6-04: Lead agent aggregates messages into a summary when checking `/sw:team-status`

### US-007: Documentation and Setup Guide
**As a** new SpecWeave user interested in Agent Teams
**I want** a clear guide explaining setup, usage, and best practices
**So that** I can start using Agent Teams effectively without trial and error

**Acceptance Criteria:**
- [x] AC-US7-01: docs-site page at `docs/guides/agent-teams-setup.md` with step-by-step setup
- [x] AC-US7-02: Existing `docs/guides/agent-teams-and-swarms.md` updated with native Agent Teams details
- [x] AC-US7-03: SKILL.md includes troubleshooting section (hanging tmux, agent not spawning, etc.)
- [x] AC-US7-04: README.md mentions Agent Teams capability

## Domain-to-Skill Agent Mapping (Reference)

This is the authoritative mapping used by the team-orchestrate and team-build skills:

| Domain | Primary Skill | Secondary Skills | File Ownership Pattern |
|--------|--------------|------------------|----------------------|
| **Frontend** | `sw-frontend:frontend-architect` | `sw-frontend:nextjs`, `sw-frontend:frontend-design` | `src/components/`, `src/pages/`, `src/hooks/`, `src/styles/`, `tests/frontend/` |
| **Backend** | `sw:architect` | `sw-infra:devops` | `src/api/`, `src/services/`, `src/middleware/`, `tests/api/` |
| **Database** | `sw:architect` | — | `prisma/`, `src/models/`, `migrations/`, `src/types/` |
| **Shared/Types** | `sw:architect` | `sw:tech-lead` | `src/types/`, `src/utils/`, `src/shared/` |
| **Testing** | `sw-testing:qa-engineer` | `sw-testing:e2e-testing`, `sw-testing:unit-testing` | `tests/`, `playwright/`, `__tests__/` |
| **Security** | `sw:security` | `sw:security-patterns` | Any (read-only review, no file ownership) |
| **DevOps** | `sw-infra:devops` | `sw-k8s:deployment-generate`, `sw-infra:observability` | `docker/`, `k8s/`, `.github/workflows/`, `terraform/` |
| **Mobile** | `sw-mobile:react-native-expert` | `sw-mobile:screen-generate`, `sw-mobile:expo` | `src/screens/`, `src/navigation/`, `ios/`, `android/` |
| **ML** | `sw-ml:ml-engineer` | `sw-ml:pipeline`, `sw-ml:deploy` | `src/ml/`, `models/`, `notebooks/`, `data/` |

## Agent Team Presets (Reference)

### `full-stack` (3 agents)
```
Lead → Shared Agent (sw:architect) → [contract] → Frontend (sw-frontend:frontend-architect) + Backend (sw:architect)
```

### `review` (3 agents, parallel)
```
Lead → Security (sw:security) | Quality (sw:grill + sw:tech-lead) | Docs (sw:docs-updater)
```

### `testing` (3 agents, parallel)
```
Lead → Unit (sw-testing:unit-testing) | E2E (sw-testing:e2e-testing) | Coverage (sw-testing:qa-engineer)
```

### `tdd` (3 agents, sequential)
```
Lead → Red (sw:tdd-red) → Green (sw:tdd-green) → Refactor (sw:tdd-refactor)
```

### `migration` (3 agents, contract-first)
```
Lead → Schema (sw:architect) → [contract] → Backend + Frontend
```

## Non-Functional Requirements

- **Backward compatible**: When `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is NOT set, falls back to subagent mode (existing behavior)
- **Token awareness**: SKILL.md warns about 2-4x token cost vs single agent and recommends task sizing (5-6 tasks per agent)
- **Safety**: Maximum team size of 5 agents (configurable), zombie detection, graceful shutdown
- **Cross-platform**: tmux instructions for macOS, Linux, and Windows WSL
