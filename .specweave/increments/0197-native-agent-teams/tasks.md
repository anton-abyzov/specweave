# 0197: Native Agent Teams — Tasks

## Phase 1: Core Skill Enhancement

### T-001: [RED] Write tests for team-orchestrate SKILL.md content validation
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Test**: Given the team-orchestrate SKILL.md exists → When parsed → Then it contains: mode detection section, domain-to-skill mapping table, agent spawn prompt templates for all 9 domains, contract-first protocol, and quality gate instructions
**Depends On**: None

### T-002: [GREEN] Rewrite team-orchestrate SKILL.md with native Agent Teams instructions
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05 | **Status**: [x] completed
**Test**: Given SKILL.md is rewritten → When Claude Code reads it → Then it can form a 3-agent team with correct skill assignments, file ownership, and contract dependencies from a feature description
**Depends On**: T-001

Key sections to include:
- Mode detection (env var → tmux/iTerm2/in-process)
- Feature analysis heuristics (keyword detection per domain)
- Complete domain-to-skill mapping table (9 domains × primary + secondary skills)
- Agent spawn prompt templates with: skill invocation, increment ID, file ownership, workflow steps
- Contract-first spawning protocol (Phase 1 upstream → Phase 2 parallel)
- WIP limit check (max 5 active increments)
- `--dry-run` flag support
- Quality gate: each agent runs `/sw:grill` before completion

### T-003: [REFACTOR] Extract reusable agent role definitions into structured format
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02, AC-US1-03 | **Status**: [x] completed
**Test**: Given agent role definitions → When used across team-orchestrate and team-build → Then definitions are consistent and DRY
**Depends On**: T-002

## Phase 2: Contract-First Protocol

### T-004: [RED] Write tests for contract-first dependency detection
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-06 | **Status**: [x] completed
**Test**: Given feature "checkout with Stripe frontend and API" → When analyzed → Then contract chain is: shared/types → backend → frontend. Given feature "3 independent review agents" → When analyzed → Then all spawn in parallel (no chain).
**Depends On**: None

### T-005: [GREEN] Implement contract chain detection in SKILL.md instructions
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05, AC-US2-06 | **Status**: [x] completed
**Test**: Given SKILL.md contract protocol → When Claude Code follows it for a full-stack feature → Then upstream agent (shared types) spawns first, writes contract file, and downstream agents spawn only after contract exists
**Depends On**: T-004

Contract chain rules:
```
shared/types → ALL other domains (must run first if types needed)
database/schema → backend (schema before API)
backend/api → frontend (API before UI)
devops → none (independent)
testing → depends on what's being tested
security → none (independent, read-only review)
```

### T-006: [REFACTOR] Add contract file templates per domain
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03, AC-US2-05 | **Status**: [x] completed
**Test**: Given contract templates → When upstream agent completes → Then contract file matches expected format (TypeScript interfaces, Prisma schema, or OpenAPI spec)
**Depends On**: T-005

## Phase 3: Team Build Skill + Presets

### T-007: [RED] Write tests for team-build SKILL.md preset definitions
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 through AC-US3-06 | **Status**: [x] completed
**Test**: Given team-build SKILL.md → When `--preset full-stack` is used → Then 3 agents spawn with: frontend (sw-frontend:frontend-architect), backend (sw:architect), shared (sw:architect) with contract-first protocol
**Depends On**: None

### T-008: [GREEN] Create team-build SKILL.md with all 5 presets
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05, AC-US3-06 | **Status**: [x] completed
**Test**: Given team-build skill → When invoked with each preset (full-stack, review, testing, tdd, migration) → Then correct agents spawn with correct skills and correct dependencies

Preset definitions:

**full-stack** (3 agents, contract-first):
```
Agent 1: Shared (sw:architect) → writes types/contracts
Agent 2: Backend (sw:architect + sw-infra:devops) → consumes contracts, builds API
Agent 3: Frontend (sw-frontend:frontend-architect) → consumes contracts + API
Chain: Agent 1 → [Agent 2 + Agent 3 parallel]
```

**review** (3 agents, all parallel):
```
Agent 1: Security (sw:security + sw:security-patterns)
Agent 2: Quality (sw:grill + sw:tech-lead + sw:code-simplifier)
Agent 3: Documentation (sw:docs-updater + sw:framework)
Chain: All parallel (no dependencies)
```

**testing** (3 agents, all parallel):
```
Agent 1: Unit Tests (sw-testing:unit-testing)
Agent 2: E2E Tests (sw-testing:e2e-testing)
Agent 3: Coverage Analysis (sw-testing:qa-engineer)
Chain: All parallel
```

**tdd** (3 agents, sequential):
```
Agent 1: Red (sw:tdd-red) → writes failing tests
Agent 2: Green (sw:tdd-green) → minimal implementation
Agent 3: Refactor (sw:tdd-refactor) → improves code quality
Chain: Agent 1 → Agent 2 → Agent 3 (strict sequential)
```

**migration** (3 agents, contract-first):
```
Agent 1: Schema (sw:architect) → designs new schema + migration
Agent 2: Backend (sw:architect) → updates API for new schema
Agent 3: Frontend (sw-frontend:frontend-architect) → updates UI for API changes
Chain: Agent 1 → [Agent 2 + Agent 3 parallel]
```

**Depends On**: T-007

### T-009: [REFACTOR] Add preset validation and error messages
**User Story**: US-003 | **Satisfies ACs**: AC-US3-06 | **Status**: [x] completed
**Test**: Given invalid preset name → When team-build invoked → Then clear error listing available presets
**Depends On**: T-008

## Phase 4: Terminal Configuration

### T-010: [RED] Write tests for terminal detection instructions
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01 | **Status**: [x] completed
**Test**: Given SKILL.md terminal section → When parsed → Then it contains detection logic for tmux, iTerm2, and in-process fallback
**Depends On**: None

### T-011: [GREEN] Add terminal multiplexer setup guide to SKILL.md
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05, AC-US4-06 | **Status**: [x] completed
**Test**: Given the terminal section → When user follows instructions → Then tmux/iTerm2/in-process mode is correctly configured

Content:
```markdown
## Terminal Setup

### Auto-Detection (SKILL.md instructs Claude Code to check)
1. `which tmux` → tmux available → recommend split panes
2. `which it2` → iTerm2 CLI available → offer as alternative
3. Neither → default to in-process mode (Shift+Up/Down to navigate)

### tmux Installation
- macOS: `brew install tmux`
- Ubuntu/Debian: `sudo apt install tmux`
- Windows WSL: `sudo apt install tmux` (inside WSL)

### iTerm2 Setup
- Install iTerm2 from iterm2.com
- Install it2 CLI: iTerm2 → Install Shell Integration
- Enable Python API: Settings → General → Magic → Enable Python API

### Enable Agent Teams
# settings.json (.claude/ directory)
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}

### Navigation
- tmux: Ctrl+B → arrow keys (switch panes)
- iTerm2: Click on pane
- In-process: Shift+Up / Shift+Down
```

**Depends On**: T-010

## Phase 5: Workflow Integration

### T-012: [RED] Write tests for agent spawn prompt templates
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-04 | **Status**: [x] completed
**Test**: Given spawn prompt template → When filled for frontend agent → Then prompt includes: skill invocation (`sw-frontend:frontend-architect`), increment ID, file ownership patterns, workflow steps (/sw:do → /sw:grill → signal done), and rules (only write to owned files)
**Depends On**: None

### T-013: [GREEN] Write complete agent spawn prompt templates per domain
**User Story**: US-005, US-006 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05, AC-US5-06, AC-US6-01, AC-US6-02, AC-US6-03 | **Status**: [x] completed
**Test**: Given all 9 domain templates → When used to spawn agents → Then each agent follows SpecWeave workflow and invokes the correct domain skill

Templates for each domain:
1. **Frontend**: Invoke `sw-frontend:frontend-architect` → read spec → /sw:do → /sw:grill
2. **Backend**: Invoke `sw:architect` → read spec → /sw:do → /sw:grill
3. **Database**: Invoke `sw:architect` → write schema → export contract → /sw:grill
4. **Shared/Types**: Invoke `sw:architect` → write interfaces → export contract
5. **Testing**: Invoke `sw-testing:qa-engineer` → generate tests → run tests → report coverage
6. **Security**: Invoke `sw:security` + `sw:security-patterns` → review all files → report findings
7. **DevOps**: Invoke `sw-infra:devops` → write Dockerfiles/K8s/CI → /sw:grill
8. **Mobile**: Invoke `sw-mobile:react-native-expert` → screens + navigation → /sw:grill
9. **ML**: Invoke `sw-ml:ml-engineer` → pipeline + model → /sw:grill

**Depends On**: T-012

### T-014: [REFACTOR] Optimize spawn prompts for token efficiency
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01 | **Status**: [x] completed
**Test**: Given spawn prompts → When measured → Then each prompt is under 2000 tokens (concise but complete)
**Depends On**: T-013

## Phase 6: Enhance Existing Team Skills

### T-015: Update team-status SKILL.md for native Agent Teams mode
**User Story**: US-005 | **Satisfies ACs**: AC-US5-03 | **Status**: [x] completed
**Test**: Given native Agent Teams running → When `/sw:team-status` invoked → Then shows agent names, domains, task progress, and terminal pane info
**Depends On**: T-002

### T-016: Update team-merge SKILL.md for native Agent Teams mode
**User Story**: US-005 | **Satisfies ACs**: AC-US5-05, AC-US5-06 | **Status**: [x] completed
**Test**: Given all agents completed → When `/sw:team-merge` invoked → Then merges in dependency order, runs /sw:done per increment, and triggers sync
**Depends On**: T-002

## Phase 7: Communication Protocol

### T-017: [RED] Write tests for agent communication protocol
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04 | **Status**: [x] completed
**Test**: Given SKILL.md communication section → When parsed → Then it defines: (1) native mode uses SendMessage, (2) fallback mode uses .specweave/state/parallel/messages/, (3) agents announce contract changes, blocking issues, and completion
**Depends On**: None

### T-018: [GREEN] Add communication protocol to SKILL.md
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04 | **Status**: [x] completed
**Test**: Given communication protocol → When agents follow it → Then contract changes propagate to downstream agents and lead agent can summarize all messages

Message types:
```
CONTRACT_READY: "Schema/types defined. Contract at: {path}"
BLOCKING_ISSUE: "Cannot proceed: {reason}. Need: {what from whom}"
COMPLETION: "All tasks done. Quality gate passed."
API_CHANGE: "Endpoint {X} changed: {old} → {new}"
```

**Depends On**: T-017

## Phase 8: Documentation

### T-019: Update docs-site agent-teams-and-swarms.md with native Agent Teams
**User Story**: US-007 | **Satisfies ACs**: AC-US7-02 | **Status**: [x] completed
**Test**: Given updated docs → When native Agent Teams section read → Then it explains: setup, mode detection, contract-first protocol, presets, and troubleshooting
**Depends On**: T-002, T-008, T-011

### T-020: Create docs-site agent-teams-setup.md step-by-step guide
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01 | **Status**: [x] completed
**Test**: Given setup guide → When new user follows steps → Then Agent Teams works within 5 minutes (install tmux, set env var, restart Claude Code, run /sw:team-build)
**Depends On**: T-011

### T-021: Add troubleshooting section to team-orchestrate SKILL.md
**User Story**: US-007 | **Satisfies ACs**: AC-US7-03 | **Status**: [x] completed
**Test**: Given troubleshooting section → When user encounters known issue → Then solution is documented

Known issues:
| Issue | Solution |
|-------|----------|
| tmux panes hang/freeze | Kill tmux session: `tmux kill-server`. Use in-process mode as fallback. |
| Agent not spawning | Check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set. Restart Claude Code. |
| Agents editing same files | Verify file ownership patterns in spawn prompt. Check for overlap. |
| Token cost too high | Reduce team size. Use presets with fewer agents. Size tasks (5-6 per agent). |
| Agent completes but lead doesn't notice | Check `/sw:team-status`. In native mode, teammate should auto-signal. In subagent mode, check TaskOutput. |
| Contract agent takes too long | Set max time per phase. If upstream agent stalls, lead should check and intervene. |

**Depends On**: T-002

### T-022: Update AGENTS.md with Agent Teams role definitions
**User Story**: US-007 | **Satisfies ACs**: AC-US7-04 | **Status**: [x] completed
**Test**: Given AGENTS.md update → When Claude Code reads it → Then it understands available agent roles and team presets
**Depends On**: T-008

## Phase 9: Integration Testing

### T-023: [RED] Write integration test for full-stack preset end-to-end
**User Story**: US-001, US-002, US-003 | **Satisfies ACs**: AC-US1-01, AC-US2-01, AC-US3-01 | **Status**: [x] completed
**Test**: Given team-build `--preset full-stack` → When executed with dry-run → Then output shows: 3 agents, correct skills, contract chain (shared → backend + frontend parallel), file ownership with no overlap
**Depends On**: T-002, T-008

### T-024: [RED] Write integration test for subagent fallback mode
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` NOT set → When team-orchestrate invoked → Then falls back to Task tool with run_in_background (existing behavior preserved)
**Depends On**: T-002

### T-025: [GREEN] Verify all tests pass
**User Story**: All | **Satisfies ACs**: All | **Status**: [x] completed
**Test**: Given all test files → When `npm test` runs → Then all pass with 80%+ coverage on new code
**Depends On**: T-001 through T-024
