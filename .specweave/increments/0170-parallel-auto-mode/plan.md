# Implementation Plan: Parallel Auto Mode

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PARALLEL AUTO MODE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EXISTING (extend)                    NEW (add)                              │
│  ─────────────────                    ─────────                              │
│                                                                              │
│  src/cli/commands/auto.ts    ──────►  Add --parallel, --frontend, etc.      │
│            │                                                                 │
│            ▼                                                                 │
│  src/core/auto/                                                              │
│  ├── types.ts           ──────────►  Add ParallelSession, Agent types       │
│  ├── config.ts          ──────────►  Add parallel config options            │
│  ├── index.ts           ──────────►  Export new parallel module             │
│  ├── prompt-chunker.ts  ──────────►  Enhance with flag detection            │
│  │                                                                           │
│  └── parallel/          ◄──────────  NEW DIRECTORY                          │
│      ├── types.ts                    Agent, Session, Worktree types          │
│      ├── orchestrator.ts             Main coordination logic                 │
│      ├── agent-spawner.ts            Task tool integration                   │
│      ├── worktree-manager.ts         Git worktree operations                 │
│      ├── prompt-analyzer.ts          Intelligent flag detection              │
│      ├── pr-generator.ts             Automated PR creation                   │
│      ├── state-manager.ts            Agent state tracking                    │
│      ├── platform-utils.ts           Cross-platform helpers                  │
│      └── index.ts                    Module exports                          │
│                                                                              │
│  src/core/auto/__tests__/  ◄────────  NEW TEST DIRECTORY                    │
│      ├── orchestrator.test.ts        90%+ coverage                          │
│      ├── agent-spawner.test.ts       90%+ coverage                          │
│      ├── worktree-manager.test.ts    90%+ coverage                          │
│      ├── prompt-analyzer.test.ts     90%+ coverage                          │
│      ├── pr-generator.test.ts        90%+ coverage                          │
│      ├── state-manager.test.ts       90%+ coverage                          │
│      ├── platform-utils.test.ts      90%+ coverage                          │
│      └── integration/                                                        │
│          └── parallel-workflow.test.ts                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation - Types & Platform Utils (Day 1)

### 1.1 Extend Core Types

**File**: `src/core/auto/types.ts` (modification)

Add to existing types:
```typescript
// Agent domain types
export type AgentDomain = 'frontend' | 'backend' | 'database' | 'devops' | 'qa' | 'general';
export type AgentStatus = 'pending' | 'creating-worktree' | 'running' | 'merging' | 'completed' | 'failed';

// Parallel agent state
export interface ParallelAgent {
  id: string;
  domain: AgentDomain;
  status: AgentStatus;
  worktreePath: string;
  branchName: string;
  tasks: string[];
  progress: { completed: number; total: number };
  startedAt: string;
  updatedAt: string;
  errors: string[];
  pid?: number;
}

// Parallel session
export interface ParallelSession {
  sessionId: string;
  incrementId: string;
  agents: ParallelAgent[];
  config: ParallelConfig;
  createdAt: string;
  status: 'active' | 'completed' | 'failed' | 'aborted';
}

// Parallel config
export interface ParallelConfig {
  enabled: boolean;
  maxParallel: number;
  createPR: boolean;
  draftPR: boolean;
  mergeStrategy: 'auto' | 'manual' | 'pr';
  baseBranch: string;
  domains: AgentDomain[];
}

// Flag suggestion from prompt analysis
export interface FlagSuggestion {
  flag: string;
  domain?: AgentDomain;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}
```

### 1.2 Create Platform Utils

**File**: `src/core/auto/parallel/platform-utils.ts`

```typescript
export class PlatformUtils {
  static isWindows(): boolean;
  static isMacOS(): boolean;
  static isLinux(): boolean;

  static normalizePath(p: string): string;
  static handleLongPath(p: string): string;
  static getShell(): { shell: string; args: string[] };
  static async spawn(cmd: string, args: string[], options?: SpawnOptions): Promise<SpawnResult>;
}
```

### 1.3 Create Platform Utils Tests

**File**: `src/core/auto/__tests__/platform-utils.test.ts`

Target: 90%+ coverage

---

## Phase 2: Worktree & State Management (Day 2)

### 2.1 Worktree Manager

**File**: `src/core/auto/parallel/worktree-manager.ts`

```typescript
export class WorktreeManager {
  constructor(private projectPath: string);

  async create(agentId: string, branchName: string): Promise<WorktreeInfo>;
  async remove(agentId: string): Promise<void>;
  async list(): Promise<WorktreeInfo[]>;
  async isLocked(agentId: string): Promise<boolean>;
  async cleanup(): Promise<CleanupResult>;
  async getBranch(agentId: string): Promise<string | null>;

  private getWorktreePath(agentId: string): string;
  private generateBranchName(domain: AgentDomain, incrementId: string): string;
}
```

### 2.2 State Manager

**File**: `src/core/auto/parallel/state-manager.ts`

```typescript
export class StateManager {
  constructor(private projectPath: string);

  async saveSession(session: ParallelSession): Promise<void>;
  async loadSession(): Promise<ParallelSession | null>;
  async updateAgent(agentId: string, update: Partial<ParallelAgent>): Promise<void>;
  async getAgent(agentId: string): Promise<ParallelAgent | null>;
  async updateHeartbeat(agentId: string): Promise<void>;
  async detectZombies(timeoutMs?: number): Promise<ParallelAgent[]>;
  async cleanup(): Promise<void>;

  private getSessionPath(): string;
  private getAgentPath(agentId: string): string;
}
```

### 2.3 Tests for Phase 2

**Files**:
- `src/core/auto/__tests__/worktree-manager.test.ts` (90%+)
- `src/core/auto/__tests__/state-manager.test.ts` (90%+)

---

## Phase 3: Prompt Analysis & Agent Spawning (Day 3)

### 3.1 Prompt Analyzer

**File**: `src/core/auto/parallel/prompt-analyzer.ts`

```typescript
export class PromptAnalyzer {
  private static DOMAIN_KEYWORDS: Record<AgentDomain, string[]> = {
    frontend: ['react', 'vue', 'angular', 'css', 'tailwind', 'ui', 'component', 'page', 'form', ...],
    backend: ['api', 'endpoint', 'server', 'route', 'controller', 'express', 'nestjs', ...],
    database: ['schema', 'migration', 'table', 'sql', 'prisma', 'typeorm', 'postgres', ...],
    devops: ['deploy', 'terraform', 'docker', 'kubernetes', 'ci/cd', 'aws', ...],
    qa: ['test', 'e2e', 'playwright', 'cypress', 'vitest', 'coverage', ...],
    general: []
  };

  analyze(prompt: string): FlagSuggestion[];
  detectDomains(prompt: string): AgentDomain[];
  calculateConfidence(domain: AgentDomain, matchCount: number): 'high' | 'medium' | 'low';
  shouldSuggestParallel(domains: AgentDomain[]): boolean;
  shouldSuggestPR(prompt: string): boolean;
}
```

### 3.2 Agent Spawner

**File**: `src/core/auto/parallel/agent-spawner.ts`

```typescript
export class AgentSpawner {
  private static DOMAIN_SUBAGENT_MAP: Record<AgentDomain, string> = {
    frontend: 'sw-frontend:frontend-architect',
    backend: 'sw-backend:database-optimizer',
    database: 'sw-backend:database-optimizer',
    devops: 'sw-infra:devops',
    qa: 'sw-testing:qa-engineer',
    general: 'general-purpose'
  };

  async spawn(agent: ParallelAgent, context: AgentContext): Promise<SpawnResult>;
  buildAgentPrompt(agent: ParallelAgent, tasks: string[]): string;
  selectSubagentType(domain: AgentDomain): string;
}
```

### 3.3 Tests for Phase 3

**Files**:
- `src/core/auto/__tests__/prompt-analyzer.test.ts` (90%+)
- `src/core/auto/__tests__/agent-spawner.test.ts` (90%+)

---

## Phase 4: Orchestrator Core (Day 4)

### 4.1 Parallel Orchestrator

**File**: `src/core/auto/parallel/orchestrator.ts`

```typescript
import { EventEmitter } from 'events';

export class ParallelOrchestrator extends EventEmitter {
  private session: ParallelSession | null = null;
  private worktreeManager: WorktreeManager;
  private stateManager: StateManager;
  private agentSpawner: AgentSpawner;

  constructor(private projectPath: string);

  async start(config: ParallelConfig, incrementId: string): Promise<void>;
  async spawnAgents(tasks: TasksByDomain): Promise<void>;
  async monitorAgents(): Promise<void>;
  async handleAgentCompletion(agent: ParallelAgent): Promise<void>;
  async handleAgentFailure(agent: ParallelAgent, error: Error): Promise<void>;
  async abort(): Promise<void>;

  isActive(): boolean;
  getSession(): ParallelSession | null;

  // Events
  on(event: 'agent:started', listener: (agent: ParallelAgent) => void): this;
  on(event: 'agent:progress', listener: (agent: ParallelAgent) => void): this;
  on(event: 'agent:completed', listener: (agent: ParallelAgent) => void): this;
  on(event: 'agent:failed', listener: (agent: ParallelAgent, error: Error) => void): this;
  on(event: 'session:completed', listener: () => void): this;
}
```

### 4.2 Orchestrator Tests

**File**: `src/core/auto/__tests__/orchestrator.test.ts` (90%+)

---

## Phase 5: PR Generation & Merge (Day 5)

### 5.1 PR Generator

**File**: `src/core/auto/parallel/pr-generator.ts`

```typescript
export type GitProvider = 'github' | 'gitlab' | 'azure-devops' | 'unknown';

export class PRGenerator {
  constructor(private projectPath: string);

  async createPR(agent: ParallelAgent, options: PROptions): Promise<PRResult>;
  async createBatchPR(agents: ParallelAgent[], options: PROptions): Promise<PRResult>;

  detectProvider(): GitProvider;
  buildPRTitle(agent: ParallelAgent, incrementId: string): string;
  buildPRBody(agent: ParallelAgent, tasks: string[]): string;

  private createGitHubPR(agent: ParallelAgent, options: PROptions): Promise<PRResult>;
  private createGitLabMR(agent: ParallelAgent, options: PROptions): Promise<PRResult>;
  private createAzureDevOpsPR(agent: ParallelAgent, options: PROptions): Promise<PRResult>;
}
```

### 5.2 Merge Coordinator (part of WorktreeManager)

Add merge methods to `WorktreeManager`:
```typescript
async merge(agentId: string, baseBranch: string): Promise<MergeResult>;
async detectConflicts(agentId: string, baseBranch: string): Promise<ConflictInfo[]>;
computeMergeOrder(agents: ParallelAgent[]): ParallelAgent[];
```

### 5.3 Tests for Phase 5

**File**: `src/core/auto/__tests__/pr-generator.test.ts` (90%+)

---

## Phase 6: CLI Integration (Day 6)

### 6.1 Extend Auto Command

**File**: `src/cli/commands/auto.ts` (modification)

Add options:
```typescript
.option('--parallel', 'Enable parallel agent execution')
.option('--max-parallel <n>', 'Maximum concurrent agents', parseInt, 3)
.option('--frontend', 'Spawn frontend-specialized agent')
.option('--backend', 'Spawn backend-specialized agent')
.option('--database', 'Spawn database-specialized agent')
.option('--devops', 'Spawn devops-specialized agent')
.option('--qa', 'Spawn QA-specialized agent')
.option('--pr', 'Create PR per completed agent')
.option('--draft-pr', 'Create PRs in draft mode')
.option('--merge-strategy <s>', 'Merge strategy: auto|manual|pr', 'auto')
.option('--base-branch <branch>', 'Base branch for merging')
```

### 6.2 Extend Auto Status Command

**File**: `src/cli/commands/auto-status.ts` (modification)

Add parallel status display:
- Show all agents with status icons
- Progress bars per agent
- Elapsed time
- `--watch` flag for live updates

### 6.3 Update Stop Hook

**File**: `plugins/specweave/hooks/stop-auto.sh` (modification)

Add parallel session detection:
```bash
# Check for parallel session
PARALLEL_SESSION=".specweave/state/parallel/session.json"
if [ -f "$PARALLEL_SESSION" ]; then
    PENDING_AGENTS=$(jq '[.agents[] | select(.status != "completed" and .status != "failed")] | length' "$PARALLEL_SESSION")
    if [ "$PENDING_AGENTS" -gt 0 ]; then
        # Block exit - agents still running
        ...
    fi
fi
```

### 6.4 CLI Tests

**File**: `src/cli/commands/__tests__/auto.test.ts` (90%+)

---

## Phase 7: Integration & Documentation (Day 7)

### 7.1 Integration Tests

**File**: `src/core/auto/__tests__/integration/parallel-workflow.test.ts`

Full workflow tests:
- Create parallel session
- Spawn multiple agents
- Track completion
- Merge branches
- Create PRs

### 7.2 Update Module Index

**File**: `src/core/auto/index.ts` (modification)

Export new parallel module:
```typescript
// Parallel Orchestration
export * from './parallel/index.js';
```

### 7.3 Update Documentation

**File**: `plugins/specweave/commands/auto.md` (modification)

Add parallel mode documentation:
- New flags
- Usage examples
- Configuration options

---

## Directory Structure (Final)

```
src/core/auto/
├── index.ts                 # Module exports (modified)
├── types.ts                 # Types (modified - add parallel types)
├── config.ts                # Config (modified - add parallel config)
├── logger.ts                # Existing
├── prompt-chunker.ts        # Existing
├── increment-planner.ts     # Existing
├── plan-approval.ts         # Existing
├── project-detector.ts      # Existing
├── default-conditions.ts    # Existing
├── e2e-coverage/            # Existing
├── parallel/                # NEW
│   ├── index.ts             # Parallel module exports
│   ├── types.ts             # Parallel-specific types
│   ├── orchestrator.ts      # Main orchestration
│   ├── agent-spawner.ts     # Agent creation
│   ├── worktree-manager.ts  # Git worktree ops
│   ├── state-manager.ts     # State persistence
│   ├── prompt-analyzer.ts   # Flag detection
│   ├── pr-generator.ts      # PR creation
│   └── platform-utils.ts    # Cross-platform utils
└── __tests__/               # NEW
    ├── types.test.ts
    ├── platform-utils.test.ts
    ├── worktree-manager.test.ts
    ├── state-manager.test.ts
    ├── prompt-analyzer.test.ts
    ├── agent-spawner.test.ts
    ├── orchestrator.test.ts
    ├── pr-generator.test.ts
    └── integration/
        └── parallel-workflow.test.ts

src/cli/commands/
├── auto.ts                  # Modified with parallel flags
├── auto-status.ts           # Modified with parallel display
└── __tests__/
    └── auto.test.ts         # CLI tests
```

---

## Test Coverage Requirements

| Module | Target | Notes |
|--------|--------|-------|
| `platform-utils.ts` | 90%+ | Cross-platform edge cases |
| `worktree-manager.ts` | 90%+ | Git operations mocked |
| `state-manager.ts` | 90%+ | File I/O mocked |
| `prompt-analyzer.ts` | 90%+ | Keyword matching |
| `agent-spawner.ts` | 90%+ | Task tool mocked |
| `orchestrator.ts` | 90%+ | Full lifecycle |
| `pr-generator.ts` | 90%+ | Provider detection |
| `auto.ts` (CLI) | 90%+ | Flag parsing |
| **Integration** | 80%+ | End-to-end workflow |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Low test coverage | TDD approach - tests first |
| Git worktree edge cases | Comprehensive mocking + real tests |
| Cross-platform issues | CI matrix (macOS, Linux, Windows) |
| Agent communication | State files + heartbeat |
| Merge conflicts | Conflict detection + clear errors |

---

## Success Criteria

1. **Test coverage ≥90%** for all new/modified code
2. **All tests pass** on CI (macOS, Linux, Windows)
3. **Parallel execution works** with 2-3 agents
4. **Flag suggestions work** for common prompts
5. **PR generation works** with GitHub (primary), GitLab, ADO
6. **Seamless integration** with existing auto mode
