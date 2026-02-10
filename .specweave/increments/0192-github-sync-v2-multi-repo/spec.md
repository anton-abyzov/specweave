---
increment: 0192-github-sync-v2-multi-repo
title: 'GitHub Sync V2: Spec-to-Issue, Projects V2, Multi-Repo & Agent Teams'
type: feature
priority: P1
status: completed
created: 2026-02-06T00:00:00.000Z
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: GitHub Sync V2: Spec-to-Issue, Projects V2, Multi-Repo & Agent Teams

## Overview

Complete the GitHub sync implementation to support real-world multi-repository microservices teams. The old increment-based sync was correctly removed (v0.17.0), but the replacement spec-based sync was never fully built. This increment delivers: bidirectional spec-to-GitHub-Issue sync, GitHub Projects V2 board integration (replacing deprecated Classic Projects), distributed multi-repo sync for microservices, an Agent Teams orchestration skill, and cleanup of deprecated code.

## Context

- Specs are permanent, increments are temporary. Only specs sync to GitHub (SYNC-ARCHITECTURE-FIX-SUMMARY.md)
- `github-spec-sync.ts` (1207 lines) handles push direction only, using 2 GraphQL mutations + REST gh CLI
- 4 multi-project strategies exist: project-per-spec, team-board, centralized, distributed
- `github-board-resolver.ts` only supports Classic Projects V1 (deprecated by GitHub)
- Agent Teams is a new Claude Code experimental feature (Feb 2026) with TeammateTool (13 operations)
- SpecWeave already has parallel auto mode (`/sw:auto --parallel`) with git worktrees

## User Stories

### US-001: Spec-to-GitHub Issue Sync (Push Direction) (P1)
**Project**: specweave

**As a** developer using SpecWeave with GitHub,
**I want** my User Stories from spec.md to automatically create and update GitHub Issues in the target repository,
**So that** my team can track work on GitHub boards without manual issue creation.

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Running `/sw-github:sync-spec <spec-id>` creates one GitHub Issue per User Story in the target repository
- [ ] **AC-US1-02**: Issue title follows format `[US-XXX] <User Story Title>` for deduplication and searchability
- [ ] **AC-US1-03**: Issue body contains User Story description, Acceptance Criteria as checkboxes, priority label, and link back to local spec
- [ ] **AC-US1-04**: Labels are applied automatically: `user-story`, `spec:<spec-id>`, `priority:<P1|P2|P3>`
- [ ] **AC-US1-05**: Idempotent sync: if issue already exists (matched by `[US-XXX]` title prefix), it updates the existing issue rather than creating a duplicate
- [ ] **AC-US1-06**: After sync, spec frontmatter is updated with `externalLinks.github.userStories[US-XXX].issueNumber` and `issueUrl`
- [ ] **AC-US1-07**: `/sw-github:sync-spec --all` syncs all specs in the workspace in a single batch

---

### US-002: GitHub-to-Spec Pull Sync (P1)
**Project**: specweave

**As a** team lead reviewing work on GitHub,
**I want** status changes made in GitHub (issue closed, labels changed, checkbox toggles) to flow back into SpecWeave specs,
**So that** the local spec.md stays in sync with team activity on GitHub without manual updates.

**Acceptance Criteria**:
- [ ] **AC-US2-01**: `/sw-github:sync-spec <spec-id> --direction from-github` fetches current issue state for all linked User Stories
- [ ] **AC-US2-02**: When a GitHub Issue is closed, the corresponding User Story status in spec.md is updated to reflect completion
- [ ] **AC-US2-03**: When AC checkboxes are toggled in the GitHub Issue body, those changes are reflected back in spec.md
- [ ] **AC-US2-04**: Conflict detection: if both spec and GitHub changed the same field, the user is prompted with options (github-wins, spec-wins, or skip)
- [ ] **AC-US2-05**: Default sync direction is `two-way` (push then pull) unless explicitly overridden with `--direction`

---

### US-003: GitHub Projects V2 Board Integration (P1)
**Project**: specweave

**As an** engineering manager,
**I want** SpecWeave to create and manage GitHub Projects V2 boards with custom fields,
**So that** I can visualize my team's work using modern project boards with Status, Priority columns and cross-repo tracking.

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Board resolver supports Projects V2 via GraphQL API (`createProjectV2`, `addProjectV2ItemById`, `updateProjectV2ItemFieldValue` mutations)
- [ ] **AC-US3-02**: Running sync creates a GitHub Project V2 (if enabled in config) and adds User Story issues as project items
- [ ] **AC-US3-03**: Status field is updated when User Story status changes (maps spec status to project Status field options)
- [ ] **AC-US3-04**: Priority custom field is set from spec priority (P1/P2/P3 mapped to project field options)
- [ ] **AC-US3-05**: Cross-repo support works: issues from multiple repositories can be added to a single org-level Project V2
- [ ] **AC-US3-06**: `gh project` CLI commands are used where available, with GraphQL fallback for operations the CLI doesn't support
- [ ] **AC-US3-07**: Config supports Projects V2 via: `config.sync.profiles[x].config.projectV2Number` (number) or `projectV2Id` (node ID)

---

### US-004: Multi-Repo Distributed Sync (P2)
**Project**: specweave

**As an** architect running a microservices project,
**I want** each service's User Stories to sync to its own GitHub repository while sharing a single org-level Project board,
**So that** each team sees only their issues locally, but management gets a unified cross-repo view.

**Acceptance Criteria**:
- [ ] **AC-US4-01**: With `githubStrategy: "distributed"`, each SpecWeave project syncs issues to its mapped GitHub repo via sync profiles
- [ ] **AC-US4-02**: Project detection from spec path works: `.specweave/docs/internal/specs/frontend/spec-001.md` resolves to profile `frontend` which targets repo `org/frontend-app`
- [ ] **AC-US4-03**: Cross-team User Stories (tagged with multiple projects in frontmatter) create issues in all relevant repos
- [ ] **AC-US4-04**: Cross-repo issues reference each other via body links: "Also tracked in: org/backend-api#45"
- [ ] **AC-US4-05**: All cross-repo issues can be aggregated into a single org-level GitHub Project V2 board (using US-003)
- [ ] **AC-US4-06**: Rate limiting coordinates across simultaneous multi-repo syncs using a shared token bucket to prevent 429 errors

---

### US-005: Agent Teams Orchestration Skill (P2)
**Project**: specweave

**As a** developer using Claude Code Agent Teams,
**I want** a `/sw:team-orchestrate` skill that spawns parallel agents per microservice, each working on their own increment and syncing to their own GitHub repo/board,
**So that** I can build full-stack features with multiple agents working simultaneously while tracking progress on GitHub.

**Acceptance Criteria**:
- [ ] **AC-US5-01**: `/sw:team-orchestrate <feature-description>` analyzes the feature, detects required domains (frontend, backend, database, etc.), and proposes agent assignments
- [ ] **AC-US5-02**: Each spawned agent gets its own increment, git worktree, and sync profile targeting the correct repo
- [ ] **AC-US5-03**: `/sw:team-status` shows all agents' increment progress, task completion %, and per-agent sync status in a table view
- [ ] **AC-US5-04**: When all agents complete, a merge step combines work in dependency order (database, backend, frontend)
- [ ] **AC-US5-05**: Each agent's completed increment triggers GitHub sync to its target repo, with all issues appearing on the shared org-level Project V2
- [ ] **AC-US5-06**: Skill works with both subagents (Task tool, current infrastructure) and native Agent Teams (TeammateTool, when `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set)
- [ ] **AC-US5-07**: File ownership is declared per agent to prevent two agents editing the same file (ownership manifest in session state)

---

### US-006: Deprecated Code Cleanup (P3)
**Project**: specweave

**As a** SpecWeave contributor,
**I want** deprecated GitHub sync code removed and replaced with clear migration paths,
**So that** the codebase has a single canonical sync path and no confusion between old and new systems.

**Acceptance Criteria**:
- [ ] **AC-US6-01**: `github-board-resolver.ts` Classic Projects V1 code is replaced with Projects V2 resolver (from US-003)
- [ ] **AC-US6-02**: `task-sync.ts` and `task-parser.ts` (deprecated increment-based sync) are deleted with git history preserved
- [ ] **AC-US6-03**: `github-issue-tracker` skill (deprecated) is removed from the plugin
- [ ] **AC-US6-04**: `/sw-github:sync` command (old increment-based) redirects to `/sw-github:sync-spec` with a deprecation notice
- [ ] **AC-US6-05**: Feature sync vs spec sync ambiguity resolved: single canonical sync path documented in MULTI-PROJECT-SYNC-ARCHITECTURE.md

## Functional Requirements

### FR-001: GraphQL API Layer for Projects V2
A `GitHubGraphQLClient` utility that wraps `gh api graphql` calls with:
- Owner ID resolution (org or user)
- Project creation, item addition, field value updates
- Batch mutations (multiple items in single request)
- Error handling with GraphQL-specific error parsing
- Rate limit detection from response headers

### FR-002: Spec Metadata Schema Extension
Extended `externalLinks.github` schema in spec frontmatter:
- Per-User-Story issue tracking: `userStories[US-XXX].issueNumber`, `issueUrl`, `syncedAt`
- Sync status: `syncStatus: synced|dirty|conflicted`
- Projects V2 reference: `projectV2Number`, `projectV2Id`
- Cross-team repos array with relevant user story mappings

### FR-003: Conflict Resolution Strategy
For bidirectional sync conflicts:
- Field-level comparison (title, body checkboxes, status)
- Three resolution modes: `github-wins`, `spec-wins`, `prompt` (interactive)
- Default: `prompt` for content changes, `github-wins` for status changes
- Conflict log stored in metadata for audit trail

### FR-004: Rate Limiter for Multi-Repo Sync
Shared token bucket across all sync profiles:
- GitHub API limit: 5000 requests/hour for authenticated users
- Pre-flight estimation: count expected API calls before sync
- Progressive warnings at 80% utilization
- Backoff with retry on 429 responses

## Success Criteria

- All 6 User Stories implemented with passing tests
- End-to-end test: create spec with 3 US → sync → verify 3 GitHub Issues created → close one on GitHub → pull → verify spec updated
- Multi-repo test: 2 repos, distributed strategy, cross-team story → issues in both repos + shared Project V2 board
- No regressions in existing Jira/ADO sync functionality

## Out of Scope

- Jira and ADO plugin changes (separate increments)
- GitHub Actions / CI integration
- PR-to-increment linking
- Sprint/iteration planning sync
- Story points or time tracking sync
- Webhook-based real-time sync (polling/manual trigger only)
- Native Agent Teams TeammateTool integration (skill supports both but doesn't require the experimental flag)

## Dependencies

- `plugins/specweave-github/` — primary implementation target
- `src/core/types/sync-profile.ts` — GitHubConfig interface extensions
- Claude Code Agent Teams experimental feature (for US-005 testing)
- GitHub `gh` CLI v2.40+ (for `gh project` commands)
- GitHub token with `project` scope (for Projects V2 mutations)
