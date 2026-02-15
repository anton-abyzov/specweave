---
id: US-005
feature: FS-192
title: "Agent Teams Orchestration Skill (P2)"
status: not_started
priority: P1
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** developer using Claude Code Agent Teams,
**I want** a `/sw:team-orchestrate` skill that spawns parallel agents per microservice, each working on their own increment and syncing to their own GitHub repo/board,
**So that** I can build full-stack features with multiple agents working simultaneously while tracking progress on GitHub."
project: specweave
---

# US-005: Agent Teams Orchestration Skill (P2)

**Feature**: [FS-192](./FEATURE.md)

**As a** developer using Claude Code Agent Teams,
**I want** a `/sw:team-orchestrate` skill that spawns parallel agents per microservice, each working on their own increment and syncing to their own GitHub repo/board,
**So that** I can build full-stack features with multiple agents working simultaneously while tracking progress on GitHub.

---

## Acceptance Criteria

- [ ] **AC-US5-01**: `/sw:team-orchestrate <feature-description>` analyzes the feature, detects required domains (frontend, backend, database, etc.), and proposes agent assignments
- [ ] **AC-US5-02**: Each spawned agent gets its own increment, git worktree, and sync profile targeting the correct repo
- [ ] **AC-US5-03**: `/sw:team-status` shows all agents' increment progress, task completion %, and per-agent sync status in a table view
- [ ] **AC-US5-04**: When all agents complete, a merge step combines work in dependency order (database, backend, frontend)
- [ ] **AC-US5-05**: Each agent's completed increment triggers GitHub sync to its target repo, with all issues appearing on the shared org-level Project V2
- [ ] **AC-US5-06**: Skill works with both subagents (Task tool, current infrastructure) and native Agent Teams (TeammateTool, when `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set)
- [ ] **AC-US5-07**: File ownership is declared per agent to prevent two agents editing the same file (ownership manifest in session state)

---

## Implementation

**Increment**: [0192-github-sync-v2-multi-repo](../../../../increments/0192-github-sync-v2-multi-repo/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
