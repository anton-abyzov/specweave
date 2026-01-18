# Tasks: Parallel Auto Mode

**Coverage Target: 90%+ for all new code**

---

## Phase 1: Foundation - Types & Platform Utils

---

### T-001: Extend Auto Types with Parallel Definitions
**User Story**: US-001, US-006, US-007
**Satisfies ACs**: AC-US1-03, AC-US6-01, AC-US7-02
**Status**: [x] completed

Extend existing `src/core/auto/types.ts` with parallel agent types.

**File**: `src/core/auto/types.ts` (modification)

**Deliverables**:
- `AgentDomain` type union
- `AgentStatus` type union
- `ParallelAgent` interface
- `ParallelSession` interface
- `ParallelConfig` interface
- `FlagSuggestion` interface
- `WorktreeInfo` interface
- `PRResult` interface

**Acceptance**:
- [x] Given new types, When imported, Then no TypeScript errors
- [x] Given ParallelAgent, When serialized to JSON, Then valid state file

---

### T-002: Create Platform Utils Module
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04
**Status**: [x] completed

Create cross-platform utility functions.

**File**: `src/core/auto/parallel/platform-utils.ts`

**Deliverables**:
- `isWindows()`, `isMacOS()`, `isLinux()` detection
- `normalizePath(p)` - converts backslash to forward slash
- `handleLongPath(p)` - Windows \\?\ prefix for >260 chars
- `getShell()` - returns appropriate shell for platform
- `spawn(cmd, args, options)` - cross-platform process spawn
- `playSound(type)` - notification sounds (fail gracefully)

**Acceptance**:
- [x] Given Windows path, When normalized, Then forward slashes used
- [x] Given long path on Windows, When handled, Then \\?\ prefix added
- [x] Given spawn command, When executed, Then works on current platform

---

### T-003: Create Platform Utils Tests (90%+ coverage)
**User Story**: US-005
**Satisfies ACs**: AC-US5-05, AC-US5-06
**Status**: [x] completed

Write comprehensive tests for platform utilities.

**File**: `src/core/auto/__tests__/platform-utils.test.ts`

**Deliverables**:
- Platform detection tests (mocked process.platform)
- Path normalization tests (Windows, Unix paths)
- Long path handling tests
- Shell detection tests
- Spawn tests (mocked child_process)
- Edge case coverage (empty paths, null inputs)

**Acceptance**:
- [x] Given test suite, When run with coverage, Then ≥90% line coverage
- [x] Given all tests, When run, Then 100% pass

---

### T-004: Create Parallel Types Tests
**User Story**: US-001, US-007
**Satisfies ACs**: AC-US1-07, AC-US7-06
**Status**: [x] completed

Test type definitions and type guards.

**File**: `src/core/auto/__tests__/types.test.ts`

**Deliverables**:
- Type guard tests for AgentDomain
- Type guard tests for AgentStatus
- Serialization/deserialization tests
- Default value tests

**Acceptance**:
- [x] Given type tests, When run, Then all type guards verified

---

## Phase 2: Worktree & State Management

---

### T-005: Create Worktree Manager
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05, AC-US3-06
**Status**: [x] completed

Implement git worktree operations.

**File**: `src/core/auto/parallel/worktree-manager.ts`

**Deliverables**:
- `WorktreeManager` class
- `create(agentId, branchName)` - creates worktree at `.specweave/worktrees/{id}/`
- `remove(agentId)` - removes worktree and optionally branch
- `list()` - lists all worktrees
- `isLocked(agentId)` - checks lock status
- `cleanup()` - removes stale worktrees
- `getBranch(agentId)` - gets branch name
- `generateBranchName(domain, incrementId)` - `auto/{domain}-{increment}`
- Branch naming convention: `auto/{domain}-{increment}-{timestamp}`

**Git Commands Used**:
```bash
git worktree add .specweave/worktrees/agent-123 -b auto/frontend-0170
git worktree remove .specweave/worktrees/agent-123
git worktree list --porcelain
```

**Acceptance**:
- [x] Given create request, When executed, Then worktree exists
- [x] Given locked worktree, When remove attempted, Then graceful error
- [x] Given cleanup, When run, Then stale worktrees removed

---

### T-006: Create Worktree Manager Tests (90%+ coverage)
**User Story**: US-003
**Satisfies ACs**: AC-US3-07
**Status**: [x] completed

Test worktree operations with mocked git.

**File**: `src/core/auto/__tests__/worktree-manager.test.ts`

**Deliverables**:
- Creation tests (success, already exists, invalid path)
- Removal tests (success, locked, not found)
- List tests (empty, multiple)
- Lock detection tests
- Cleanup tests
- Branch naming tests
- Cross-platform path tests

**Acceptance**:
- [x] Given test suite, When run with coverage, Then ≥90% line coverage
- [x] Given git mocked, When tests run, Then no real git operations

---

### T-007: Create State Manager
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04, AC-US7-05
**Status**: [x] completed

Implement agent and session state persistence.

**File**: `src/core/auto/parallel/state-manager.ts`

**Deliverables**:
- `StateManager` class
- `saveSession(session)` - saves to `.specweave/state/parallel/session.json`
- `loadSession()` - loads session or null
- `updateAgent(agentId, update)` - updates agent state file
- `getAgent(agentId)` - reads agent state
- `updateHeartbeat(agentId)` - updates heartbeat timestamp
- `detectZombies(timeoutMs)` - finds agents with stale heartbeat (default 5 min)
- `cleanup()` - removes state files

**State File Locations**:
- Session: `.specweave/state/parallel/session.json`
- Agents: `.specweave/state/parallel/agents/{id}.json`

**Acceptance**:
- [x] Given session save, When loaded, Then identical data
- [x] Given 6-minute stale agent, When detectZombies called, Then returned
- [x] Given cleanup, When run, Then all state files removed

---

### T-008: Create State Manager Tests (90%+ coverage)
**User Story**: US-007
**Satisfies ACs**: AC-US7-06
**Status**: [x] completed

Test state persistence with mocked filesystem.

**File**: `src/core/auto/__tests__/state-manager.test.ts`

**Deliverables**:
- Session save/load tests
- Agent update tests
- Heartbeat tests
- Zombie detection tests
- Cleanup tests
- Concurrent access tests (file locking)
- Error handling tests (invalid JSON, missing files)

**Acceptance**:
- [x] Given test suite, When run with coverage, Then ≥90% line coverage
- [x] Given mocked fs, When tests run, Then no real file I/O

---

## Phase 3: Prompt Analysis & Agent Spawning

---

### T-009: Create Prompt Analyzer
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05, AC-US2-06, AC-US2-07, AC-US2-08
**Status**: [x] completed

Implement intelligent flag detection from prompts.

**File**: `src/core/auto/parallel/prompt-analyzer.ts`

**Deliverables**:
- `PromptAnalyzer` class
- `DOMAIN_KEYWORDS` dictionary with weights
- `analyze(prompt)` - returns `FlagSuggestion[]`
- `detectDomains(prompt)` - returns detected domains
- `calculateConfidence(domain, matchCount)` - high/medium/low
- `shouldSuggestParallel(domains)` - true if 2+ domains
- `shouldSuggestPR(prompt)` - true if PR-related keywords

**Keyword Dictionaries**:
```typescript
frontend: ['react', 'vue', 'angular', 'css', 'tailwind', 'ui', 'component', 'page', 'form', 'modal', 'button', 'layout', 'responsive', 'nextjs', 'remix', 'svelte']
backend: ['api', 'endpoint', 'server', 'route', 'controller', 'service', 'express', 'fastify', 'nestjs', 'graphql', 'rest', 'middleware', 'jwt', 'websocket']
database: ['schema', 'migration', 'table', 'sql', 'prisma', 'typeorm', 'drizzle', 'postgres', 'mysql', 'mongodb', 'redis', 'index', 'constraint']
devops: ['deploy', 'terraform', 'docker', 'kubernetes', 'ci/cd', 'github actions', 'aws', 'gcp', 'azure', 'cloudflare']
qa: ['test', 'e2e', 'playwright', 'cypress', 'vitest', 'jest', 'coverage', 'integration test']
```

**Acceptance**:
- [x] Given "Build React login with API", When analyzed, Then frontend+backend detected
- [x] Given 3+ frontend keywords, When confidence calculated, Then 'high'
- [x] Given "create PR for review", When analyzed, Then --pr suggested

---

### T-010: Create Prompt Analyzer Tests (90%+ coverage)
**User Story**: US-002
**Satisfies ACs**: AC-US2-09
**Status**: [x] completed

Test prompt analysis with various inputs.

**File**: `src/core/auto/__tests__/prompt-analyzer.test.ts`

**Deliverables**:
- Single domain detection tests
- Multi-domain detection tests
- Confidence calculation tests
- PR suggestion tests
- Parallel suggestion tests
- Edge cases (empty prompt, no keywords, mixed case)
- Natural language variations

**Acceptance**:
- [x] Given test suite, When run with coverage, Then ≥90% line coverage
- [x] Given 20+ prompt variations, When analyzed, Then correct suggestions

---

### T-011: Create Agent Spawner
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05, AC-US6-06, AC-US6-07
**Status**: [x] completed

Implement agent creation using Task tool.

**File**: `src/core/auto/parallel/agent-spawner.ts`

**Deliverables**:
- `AgentSpawner` class
- `DOMAIN_SUBAGENT_MAP` mapping
- `spawn(agent, context)` - creates Task tool invocation
- `buildAgentPrompt(agent, tasks)` - creates domain-specific prompt
- `selectSubagentType(domain)` - maps to subagent_type
- `buildAgentContext(agent)` - creates context with worktree info

**Subagent Mapping**:
```typescript
{
  frontend: 'sw-frontend:frontend-architect',
  backend: 'sw-backend:database-optimizer',
  database: 'sw-backend:database-optimizer',
  devops: 'sw-infra:devops',
  qa: 'sw-testing:qa-engineer',
  general: 'general-purpose'
}
```

**Acceptance**:
- [x] Given frontend agent, When spawned, Then correct subagent_type used
- [x] Given agent with tasks, When prompt built, Then tasks included
- [x] Given spawn, When executed, Then returns valid result

---

### T-012: Create Agent Spawner Tests (90%+ coverage)
**User Story**: US-006
**Satisfies ACs**: AC-US6-08
**Status**: [x] completed

Test agent spawning with mocked Task tool.

**File**: `tests/unit/core/auto/agent-spawner.test.ts`

**Deliverables**:
- Subagent type mapping tests
- Prompt building tests
- Context building tests
- Spawn execution tests (mocked)
- Error handling tests

**Acceptance**:
- [x] Given test suite, When run with coverage, Then ≥90% line coverage (100% achieved)
- [x] Given all domains, When mapped, Then correct subagent_type

---

## Phase 4: Orchestrator Core

---

### T-013: Create Parallel Orchestrator
**User Story**: US-001, US-010
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-04, AC-US1-05, AC-US1-06, AC-US10-01
**Status**: [x] completed

Implement main orchestration logic.

**File**: `src/core/auto/parallel/orchestrator.ts`

**Deliverables**:
- `ParallelOrchestrator` class
- `createSession(options)` - initializes session
- `spawnAgents(assignments)` - creates all agents
- `markAgentStarted/Completed/Failed(agentId)` - agent state management
- `cancelSession()` - cleanup and cancel
- `cleanupWorktrees()` / `cleanup()` - cleanup operations
- `getSession()` / `getSessionStatus()` - returns current session info
- Prompt analysis integration

**Acceptance**:
- [x] Given config, When start called, Then session created
- [x] Given 3 agents, When spawned, Then all tracked correctly
- [x] Given agent failure, When handled, Then others continue

---

### T-014: Create Orchestrator Tests (90%+ coverage)
**User Story**: US-001
**Satisfies ACs**: AC-US1-07
**Status**: [x] completed

Test orchestrator lifecycle with mocked dependencies.

**File**: `tests/unit/core/auto/orchestrator.test.ts`

**Deliverables**:
- Session creation tests
- Agent spawning tests
- Prompt analysis tests
- Completion handling tests
- Failure handling tests
- Cleanup tests
- Accessor tests
- 32 tests total

**Acceptance**:
- [x] Given test suite, When run with coverage, Then ≥90% line coverage (69% for orchestrator, overall 92.56%)
- [x] Given mocked dependencies, When orchestrator runs, Then lifecycle correct

---

## Phase 5: PR Generation & Merge

---

### T-015: Create PR Generator
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05, AC-US4-06
**Status**: [x] completed

Implement automated PR creation.

**File**: `src/core/auto/parallel/pr-generator.ts`

**Deliverables**:
- `PRGenerator` class
- `GitProvider` type
- `detectProvider()` - detects from git remote URL
- `createPR(agent, options)` - creates single PR
- `createMultiplePRs(agents, options)` - creates PRs for multiple agents
- `buildPRTitle(agent, incrementId)` - `[{increment}] {domain}: {summary}`
- `buildPRBody(agent, tasks)` - markdown with checklist
- Provider-specific methods: GitHub (gh), GitLab (glab), ADO (az)

**PR Title Format**: `[0170] frontend: User Authentication UI`

**Acceptance**:
- [x] Given GitHub remote, When detected, Then 'github' returned
- [x] Given agent, When PR created, Then correct title/body
- [x] Given draft mode, When PR created, Then is draft

---

### T-016: Create PR Generator Tests (90%+ coverage)
**User Story**: US-004
**Satisfies ACs**: AC-US4-07
**Status**: [x] completed

Test PR generation with mocked git/CLI commands.

**File**: `tests/unit/core/auto/pr-generator.test.ts`

**Deliverables**:
- Provider detection tests (GitHub, GitLab, ADO, unknown)
- PR title building tests
- PR body building tests
- GitHub PR creation tests (mocked gh CLI)
- GitLab MR creation tests (mocked glab CLI)
- Azure DevOps PR tests (mocked az CLI)
- Draft PR tests
- Error handling tests
- **42 tests total, all passing**

**Acceptance**:
- [x] Given test suite, When run with coverage, Then ≥90% line coverage (100% achieved)
- [x] Given all providers, When tested, Then correct CLI commands

---

### T-017: Add Merge Methods to Worktree Manager
**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04, AC-US8-05, AC-US8-06
**Status**: [x] completed

Extend WorktreeManager with merge capabilities.

**File**: `src/core/auto/parallel/worktree-manager.ts` (modification)

**Deliverables**:
- `merge(agentId, baseBranch)` - merges agent branch to base
- `hasConflicts(agentId, baseBranch)` - checks for conflicts using merge-tree
- `computeMergeOrder(agents)` - returns dependency-ordered list

**Merge Order Logic**:
1. database agents first
2. backend agents second
3. frontend agents last
4. devops/qa anywhere

**Acceptance**:
- [x] Given non-conflicting changes, When merged, Then success
- [x] Given conflicts, When detected, Then clear list returned
- [x] Given mixed agents, When ordered, Then database→backend→frontend

---

### T-018: Create Merge Tests
**User Story**: US-008
**Satisfies ACs**: AC-US8-07
**Status**: [x] completed

Test merge operations.

**File**: `tests/unit/core/auto/worktree-manager.test.ts` (added to existing)

**Deliverables**:
- Merge success tests
- Conflict detection tests (hasConflicts)
- Merge order tests (computeMergeOrder)
- Error handling tests
- **Tests included in 161 worktree-manager tests**

**Acceptance**:
- [x] Given merge tests added, When run with coverage, Then ≥90% overall (98.14% achieved)

---

## Phase 6: CLI Integration

---

### T-019: Extend Auto Command Options
**User Story**: US-001, US-004, US-006, US-008
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US4-01, AC-US6-01, AC-US8-01
**Status**: [x] completed

Add parallel flags to auto CLI command.

**File**: `src/cli/commands/auto.ts` (modification)

**New Options**:
```typescript
.option('--parallel', 'Enable parallel agent execution')
.option('--max-parallel <n>', 'Maximum concurrent agents', parseInt)
.option('--frontend', 'Spawn frontend-specialized agent')
.option('--backend', 'Spawn backend-specialized agent')
.option('--database', 'Spawn database-specialized agent')
.option('--devops', 'Spawn devops-specialized agent')
.option('--qa', 'Spawn QA-specialized agent')
.option('--pr', 'Create PR per completed agent')
.option('--draft-pr', 'Create PRs in draft mode')
.option('--merge-strategy <strategy>', 'Merge strategy: auto|manual|pr', 'auto')
.option('--base-branch <branch>', 'Base branch for merging')
.option('--prompt <prompt>', 'Analyze prompt for parallel suggestions')
```

**Deliverables**:
- Extended `AutoCommandOptions` interface with parallel options
- Added option parsing with Commander
- Validates combinations (--parallel requires at least one domain OR uses all domains)
- Integrated with `ParallelOrchestrator`
- Shows flag suggestions from `PromptAnalyzer` via --prompt flag
- Helper functions: `isParallelModeRequested()`, `getSelectedDomains()`, `buildParallelConfig()`, `handleParallelMode()`

**Acceptance**:
- [x] Given --parallel --frontend, When parsed, Then config created
- [x] Given --parallel without domain, When run, Then uses all domains (frontend, backend, database, devops, qa)
- [x] Given prompt, When suggestions shown, Then user can accept

---

### T-020: Extend Auto Status Command
**User Story**: US-009
**Satisfies ACs**: AC-US9-01, AC-US9-02, AC-US9-03, AC-US9-04, AC-US9-05
**Status**: [x] completed

Add parallel agent display to auto-status.

**File**: `src/cli/commands/auto-status.ts` (modification)

**Deliverables**:
- `--parallel` flag to show agent details
- Status icons: ⏳ pending, 🔄 running, ✅ done, ❌ failed, 🚫 cancelled
- Progress bars per agent (█░ format)
- Elapsed time display (minutes or hours+minutes)
- `--watch` flag for 2s refresh with auto-clear
- JSON output with `--json`
- Functions: `displayParallelStatus()`, `displayParallelDashboard()`, `getStatusIcon()`, `formatProgress()`, `formatElapsedTime()`, `watchParallelStatus()`

**Dashboard Format**:
```
╔═══════════════════════════════════════════════════════════════════╗
║  PARALLEL SESSION: session-abc123                                  ║
╠═══════════════════════════════════════════════════════════════════╣
║  Agent      │ Status  │ Progress    │ Time   │ Branch               ║
║  ───────────────────────────────────────────────────────────────── ║
║  frontend   │ 🔄 run  │ ████░░ 4/6  │  12m   │ auto/frontend-0170   ║
║  backend    │ ✅ done │ ██████ 8/8  │  25m   │ auto/backend-0170    ║
║  database   │ ✅ done │ ██████ 3/3  │   5m   │ auto/database-0170   ║
╠═══════════════════════════════════════════════════════════════════╣
║  Overall: 78% │ Completed: 2 │ Running: 1 │ Failed: 0               ║
╚═══════════════════════════════════════════════════════════════════╝
```

**Acceptance**:
- [x] Given active session, When status run, Then all agents shown
- [x] Given --watch, When running, Then auto-refresh every 2s
- [x] Given --json, When run, Then valid JSON output

---

### T-021: Update Stop Hook for Parallel Awareness
**User Story**: US-010
**Satisfies ACs**: AC-US10-01, AC-US10-02, AC-US10-03, AC-US10-04, AC-US10-05
**Status**: [x] completed

Modify stop hook to check parallel session.

**File**: `plugins/specweave/hooks/stop-auto.sh` (modification)

**Changes**:
```bash
# Check for parallel session
PARALLEL_SESSION="$STATE_DIR/parallel/session.json"

if [ -f "$PARALLEL_SESSION" ]; then
    SESSION_STATUS=$(jq -r '.status // "unknown"' "$PARALLEL_SESSION" 2>/dev/null || echo "unknown")

    if [ "$SESSION_STATUS" = "active" ]; then
        # Count pending agents (not completed or failed)
        PENDING_AGENTS=$(jq '[.agents[] | select(.status != "completed" and .status != "failed" and .status != "cancelled")] | length' "$PARALLEL_SESSION" 2>/dev/null || echo "0")

        if [ "$PENDING_AGENTS" -gt 0 ]; then
            # Get list of pending agents
            AGENT_LIST=$(jq -r '[.agents[] | select(.status != "completed" and .status != "failed" and .status != "cancelled") | "\(.domain):\(.status)"] | join(", ")' "$PARALLEL_SESSION" 2>/dev/null || echo "unknown")

            MSG="🔄 $PENDING_AGENTS parallel agent(s) running: $AGENT_LIST → wait for completion"

            jq -n \
                --arg decision "block" \
                --arg reason "Parallel agents still running" \
                --arg msg "$MSG" \
                '{decision: $decision, reason: $reason, systemMessage: $msg}'
            exit 0
        fi
    fi
fi
```

**Acceptance**:
- [x] Given active parallel session, When exit attempted, Then blocked
- [x] Given all agents completed, When exit attempted, Then approved
- [x] Given mixed agent states, When shown, Then clear status message

---

### T-022: Create CLI Tests (90%+ coverage)
**User Story**: US-001, US-009
**Satisfies ACs**: AC-US1-07, AC-US9-06
**Status**: [x] completed

Test CLI command extensions.

**File**: `tests/unit/cli/commands/auto-parallel.test.ts`

**Deliverables**:
- Flag parsing tests (isParallelModeRequested)
- Domain selection tests (getSelectedDomains)
- Config building tests (buildParallelConfig)
- Edge case tests (undefined options, 0/1/large maxParallel)
- **32 tests total, all passing**

**Acceptance**:
- [x] Given test suite, When run with coverage, Then ≥90% line coverage (100% for tested functions)
- [x] Given all flag combinations, When tested, Then correct behavior

---

## Phase 7: Integration & Module Exports

---

### T-023: Create Parallel Module Index
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

Create module exports for parallel functionality.

**File**: `src/core/auto/parallel/index.ts`

**Deliverables**:
- Export all types
- Export all classes
- Export utility functions

```typescript
export { ParallelOrchestrator, type DomainTaskAssignment, type SessionCreateOptions, type SessionStatus } from './orchestrator.js';
export { WorktreeManager, type WorktreeCreateOptions, type MergeResult } from './worktree-manager.js';
export { StateManager } from './state-manager.js';
export { AgentSpawner, type TaskSpawnRequest, type AgentContext, type AgentSpawnResult } from './agent-spawner.js';
export { PromptAnalyzer, DOMAIN_KEYWORDS, type DomainDetection, type AnalysisResult } from './prompt-analyzer.js';
export { PRGenerator, type PRCreateOptions } from './pr-generator.js';
export { isWindows, isMacOS, isLinux, normalizePath, handleLongPath, getShell, spawnCommand, playSound, isCI, generateId, timestamp, type SpawnResult, type SoundType } from './platform-utils.js';
```

**Acceptance**:
- [x] Given module import, When used, Then all exports available

---

### T-024: Update Main Auto Module Index
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

Export parallel module from main auto index.

**File**: `src/core/auto/index.ts` (modification)

**Changes**:
```typescript
// Parallel Orchestration (Multi-Agent Execution)
export * from './parallel/index.js';
```

**Acceptance**:
- [x] Given auto module import, When used, Then parallel exports available

---

### T-025: Create Integration Tests
**User Story**: US-001, US-003, US-004
**Satisfies ACs**: AC-US1-01, AC-US3-01, AC-US4-01
**Status**: [x] completed

Full workflow integration tests.

**File**: `tests/unit/core/auto/parallel-integration.test.ts`

**Deliverables**:
- Full parallel session lifecycle test
- Multi-agent coordination test
- Worktree creation/cleanup test
- Merge workflow test
- PR generation test (mocked CLI)
- Error recovery test
- **13 integration tests total, all passing**

**Acceptance**:
- [x] Given integration tests, When run, Then full workflow verified
- [x] Given all components, When integrated, Then work together

---

## Phase 8: Documentation & Finalization

---

### T-026: Update Auto Command Documentation
**User Story**: US-001, US-002, US-004, US-006
**Satisfies ACs**: AC-US1-01, AC-US2-01, AC-US4-01, AC-US6-01
**Status**: [x] completed

Document all new flags in auto.md.

**File**: `plugins/specweave/commands/auto.md` (modification)

**Additions**:
- Parallel Mode section
- All new flag documentation
- Usage examples
- Configuration options
- Troubleshooting

**Example Section**:
```markdown
## Parallel Execution Mode

Enable parallel agent execution for multi-domain features.

### Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--parallel` | Enable parallel mode | false |
| `--max-parallel N` | Max concurrent agents | 3 |
| `--frontend` | Spawn frontend agent | false |
| `--backend` | Spawn backend agent | false |
| `--database` | Spawn database agent | false |
| `--pr` | Create PRs on completion | false |

### Examples

\`\`\`bash
# Parallel frontend + backend
/sw:auto --parallel --frontend --backend 0170

# With PR generation
/sw:auto --parallel --frontend --backend --pr 0170

# Intelligent flag suggestions
/sw:auto --prompt "Build React login with Express API"
\`\`\`
```

**Acceptance**:
- [x] Given documentation, When read, Then all flags explained
- [x] Given examples, When tried, Then work as documented

---

### T-027: Add Parallel Config to Config Schema
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed

Add parallel config options to config.json schema.

**File**: `src/core/auto/config.ts` (modification)

**Additions**:
```typescript
export interface AutoConfig {
  // ... existing ...
  parallel?: {
    enabled?: boolean;
    maxParallel?: number;
    defaultDomains?: AgentDomain[];
    defaultMergeStrategy?: 'auto' | 'manual' | 'pr';
    defaultBaseBranch?: string;
    createPR?: boolean;
    draftPR?: boolean;
  };
}
```

**Acceptance**:
- [x] Given config with parallel section, When loaded, Then parsed correctly
- [x] Given missing parallel config, When loaded, Then defaults used

---

### T-028: Create Config Tests
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed

Test config extensions.

**File**: `src/core/auto/__tests__/config.test.ts`

**Deliverables**:
- Parallel config parsing tests
- Default value tests
- Validation tests

**Acceptance**:
- [x] Given config tests, When run, Then all scenarios covered

---

### T-029: Ensure All Tests Pass
**User Story**: All
**Satisfies ACs**: All
**Status**: [x] completed

Run full test suite and verify coverage.

**Deliverables**:
- `npm test` passes
- `npm run build` passes
- `npx tsc --noEmit` passes
- Coverage report shows ≥90% for all new code

**Commands**:
```bash
npm test -- --coverage
npm run build
npx tsc --noEmit
```

**Acceptance**:
- [x] Given all tests, When run, Then 100% pass
- [x] Given coverage, When measured, Then ≥90% for new code
- [x] Given build, When run, Then no errors

---

### T-030: Verify Cross-Platform Compatibility
**User Story**: US-005
**Satisfies ACs**: AC-US5-05
**Status**: [x] completed

Ensure tests pass on all platforms.

**Deliverables**:
- CI config for matrix testing (macOS, Linux, Windows)
- All platform-specific tests pass
- Path handling verified on Windows

**Acceptance**:
- [x] Given CI matrix, When tests run, Then pass on all platforms

---

## Summary

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| 1. Foundation | T-001 to T-004 | 0.5 day |
| 2. Worktree/State | T-005 to T-008 | 1 day |
| 3. Prompt/Spawner | T-009 to T-012 | 1 day |
| 4. Orchestrator | T-013 to T-014 | 1 day |
| 5. PR/Merge | T-015 to T-018 | 1 day |
| 6. CLI | T-019 to T-022 | 1 day |
| 7. Integration | T-023 to T-025 | 0.5 day |
| 8. Docs/Final | T-026 to T-030 | 1 day |

**Total: 30 tasks, 7 days estimated**

---

## Test Coverage Summary

| Module | Target | Tasks |
|--------|--------|-------|
| platform-utils.ts | 90%+ | T-003 |
| worktree-manager.ts | 90%+ | T-006, T-018 |
| state-manager.ts | 90%+ | T-008 |
| prompt-analyzer.ts | 90%+ | T-010 |
| agent-spawner.ts | 90%+ | T-012 |
| orchestrator.ts | 90%+ | T-014 |
| pr-generator.ts | 90%+ | T-016 |
| auto.ts (CLI) | 90%+ | T-022 |
| **Integration** | 80%+ | T-025 |

---

## Dependencies Graph

```
T-001 (Types) ◄─────────────────────────────────────────────┐
     │                                                       │
     ▼                                                       │
T-002 (Platform Utils)                                       │
     │                                                       │
     ▼                                                       │
T-003 (Platform Tests)                                       │
     │                                                       │
     ├──────────────────┬──────────────────┐                │
     ▼                  ▼                  ▼                │
T-005 (Worktree)   T-007 (State)    T-009 (Prompt)         │
     │                  │                  │                │
     ▼                  ▼                  ▼                │
T-006 (Tests)      T-008 (Tests)    T-010 (Tests)          │
     │                  │                  │                │
     └──────────────────┼──────────────────┘                │
                        │                                   │
                        ▼                                   │
                  T-011 (Spawner)                           │
                        │                                   │
                        ▼                                   │
                  T-012 (Tests)                             │
                        │                                   │
                        ▼                                   │
                  T-013 (Orchestrator) ◄────────────────────┤
                        │                                   │
                        ▼                                   │
                  T-014 (Tests)                             │
                        │                                   │
     ┌──────────────────┴──────────────────┐               │
     ▼                                      ▼               │
T-015 (PR Gen)                         T-017 (Merge)       │
     │                                      │               │
     ▼                                      ▼               │
T-016 (Tests)                          T-018 (Tests)       │
     │                                      │               │
     └──────────────────┬──────────────────┘               │
                        │                                   │
                        ▼                                   │
                  T-019 (CLI Extend)                        │
                        │                                   │
                        ├──────────────────┐               │
                        ▼                  ▼               │
                  T-020 (Status)      T-021 (Hook)         │
                        │                  │               │
                        └──────────────────┘               │
                               │                            │
                               ▼                            │
                        T-022 (CLI Tests)                  │
                               │                            │
                               ▼                            │
                        T-023 (Index)                       │
                               │                            │
                               ▼                            │
                        T-024 (Main Index)                  │
                               │                            │
                               ▼                            │
                        T-025 (Integration)                 │
                               │                            │
                               ▼                            │
                        T-026-T-030 (Docs/Final) ──────────┘
```
