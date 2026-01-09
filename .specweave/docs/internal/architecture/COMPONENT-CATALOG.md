# SpecWeave Component Catalog

**Last Updated**: 2026-01-08
**Version**: 1.0.109
**Purpose**: Comprehensive catalog of all SpecWeave components, classes, and modules

---

## Table of Contents

1. [Core Modules](#core-modules)
2. [Key Classes](#key-classes)
3. [Utility Modules](#utility-modules)
4. [Plugin Components](#plugin-components)
5. [Type Definitions](#type-definitions)

---

## Core Modules

### 1. Increment Management (`src/core/increment/`)

| Module | File | Purpose | Key Methods |
|--------|------|---------|-------------|
| **MetadataManager** | `metadata-manager.ts` | CRUD for increment metadata | `load()`, `save()`, `updateStatus()`, `transition()` |
| **ActiveIncrementManager** | `active-increment-manager.ts` | Fast cache for active increments | `getActive()`, `canCreateNew()`, `checkWIPLimits()` |
| **IncrementArchiver** | `increment-archiver.ts` | Archive completed increments | `archive()`, `restore()`, `listArchived()` |
| **StatusAutoTransition** | `status-auto-transition.ts` | Auto-transition on task completion | `checkAndTransition()`, `shouldTransition()` |
| **CompletionValidator** | `completion-validator.ts` | Validate before closure | `validateCompletion()`, `checkACs()`, `checkTasks()` |
| **DisciplineChecker** | `discipline-checker.ts` | Enforce folder structure | `checkStructure()`, `validateFiles()`, `enforceLimits()` |
| **IncrementNumberManager** | `increment-number-manager.ts` | Generate unique IDs | `generateIncrementId()`, `getNextNumber()`, `checkDuplicate()` |
| **FeatureIDManager** | `feature-id-manager.ts` | Manage FS-XXX feature IDs | `deriveFeatureID()`, `resolveFeature()`, `assignFeatureID()` |

**Key Classes**:

```typescript
// MetadataManager - CRUD operations for increment metadata
class MetadataManager {
  static async load(incrementId: string): Promise<IncrementMetadata>
  static async save(metadata: IncrementMetadata): Promise<void>
  static async updateStatus(id: string, status: IncrementStatus): Promise<void>
  static async transition(id: string, newStatus: IncrementStatus): Promise<boolean>
  static async updateSyncTarget(id: string, target: SyncTarget): Promise<void>
}

// ActiveIncrementManager - Fast lookup for active increments
class ActiveIncrementManager {
  static async getActive(): Promise<IncrementMetadata[]>
  static async canCreateNew(type: IncrementType): Promise<{ allowed: boolean, reason?: string }>
  static async checkWIPLimits(type: IncrementType): Promise<WIPLimitCheck>
  static invalidateCache(): void
}

// IncrementArchiver - Archive and restore
class IncrementArchiver {
  static async archive(incrementId: string): Promise<void>
  static async restore(incrementId: string): Promise<void>
  static async listArchived(): Promise<IncrementMetadata[]>
  static async autoArchiveStale(daysInactive: number): Promise<string[]>
}
```

### 2. Specification Management (`src/core/specs/`)

| Module | File | Purpose | Key Methods |
|--------|------|---------|-------------|
| **SpecParser** | `spec-parser.ts` | Parse user stories, ACs, tasks | `parseSpec()`, `extractUserStories()`, `extractACs()` |
| **SpecDistributor** | `spec-distributor.ts` | Distribute specs across projects | `distribute()`, `resolveProject()`, `createFolders()` |
| **CompletionPropagator** | `completion-propagator.ts` | Propagate AC completion | `propagateCompletion()`, `syncACs()`, `updateSpec()` |
| **TaskStateManager** | `task-state-manager.ts` | Manage task state | `updateTask()`, `getTaskStatus()`, `completeTask()` |
| **ACStatusManager** | `ac-status-manager.ts` | Sync AC checkboxes | `syncACStatus()`, `markComplete()`, `updateCheckbox()` |
| **SpecFrontmatterUpdater** | `spec-frontmatter-updater.ts` | Atomic spec.md updates | `updateFrontmatter()`, `setField()`, `preserveContent()` |
| **SpecValidator** | `spec-validator.ts` | Validate spec format | `validate()`, `checkStructure()`, `checkLinks()` |

**Key Classes**:

```typescript
// SpecParser - Parse markdown specs
class SpecParser {
  static parseSpec(specPath: string): Promise<ParsedSpec>
  static extractUserStories(content: string): UserStory[]
  static extractACs(content: string): AcceptanceCriteria[]
  static extractTasks(content: string): Task[]
  static extractProject(userStory: string): string | undefined
}

// CompletionPropagator - Bidirectional AC sync
class CompletionPropagator {
  static async propagateCompletion(taskId: string, incrementId: string): Promise<void>
  static async syncACs(taskId: string, incrementId: string): Promise<void>
  static async updateSpec(acIds: string[], incrementId: string): Promise<void>
}

// TaskStateManager - Task lifecycle
class TaskStateManager {
  static async updateTask(taskId: string, status: TaskStatus): Promise<void>
  static async getTaskStatus(taskId: string): Promise<TaskStatus>
  static async completeTask(taskId: string): Promise<void>
  static async getAllTasks(incrementId: string): Promise<Task[]>
  static async getCompletionRate(incrementId: string): Promise<number>
}
```

### 3. Configuration Management (`src/config/`)

| Module | File | Purpose | Key Methods |
|--------|------|---------|-------------|
| **ConfigManager** | `config-manager.ts` | Load/save config.json | `load()`, `save()`, `update()`, `validate()` |
| **SecretsManager** | `secrets-manager.ts` | Manage .env secrets | `load()`, `get()`, `set()`, `validate()` |
| **ProjectResolver** | `project-resolver.ts` | Resolve project from multiple sources | `resolve()`, `fromConfig()`, `fromEnv()` |
| **MultiProjectConfig** | `multi-project-config.ts` | Multi-project setup | `getProjects()`, `mapProject()`, `addProject()` |

**Key Classes**:

```typescript
// ConfigManager - Configuration operations
class ConfigManager {
  static async load(path?: string): Promise<SpecWeaveConfig>
  static async save(config: SpecWeaveConfig, path?: string): Promise<void>
  static async update(updates: Partial<SpecWeaveConfig>, path?: string): Promise<void>
  static async validate(config: SpecWeaveConfig): Promise<ValidationResult>
  static getDefaultConfig(): SpecWeaveConfig
}

// SecretsManager - Secret handling
class SecretsManager {
  static async load(): Promise<Record<string, string>>
  static get(key: string): string | undefined
  static set(key: string, value: string): Promise<void>
  static validate(required: string[]): ValidationResult
  static exists(keys: string[]): boolean
}
```

### 4. Hook System (`src/core/hooks/`)

| Module | File | Purpose | Key Methods |
|--------|------|---------|-------------|
| **HookExecutor** | `hook-executor.ts` | Execute hooks in child processes | `execute()`, `run()`, `timeout()` |
| **HookScanner** | `hook-scanner.ts` | Discover hooks by pattern | `scan()`, `findHooks()`, `match()` |
| **HookHealthChecker** | `hook-health-checker.ts` | Validate hook health | `check()`, `validateSyntax()`, `checkImports()` |
| **HookAutoFixer** | `hook-auto-fixer.ts` | Auto-fix common errors | `fix()`, `addMissingImport()`, `fixSyntax()` |
| **HookLogger** | `hook-logger.ts` | Structured hook logging | `log()`, `rotate()`, `cleanup()` |
| **StopHookDispatcher** | `stop-hook-dispatcher.ts` | Dispatch stop hooks (reflect/auto) | `dispatch()`, `route()`, `execute()` |

**Key Classes**:

```typescript
// HookExecutor - Run hooks in isolation
class HookExecutor {
  static async execute(hookPath: string, args?: string[]): Promise<HookResult>
  static async run(command: string, timeout?: number): Promise<ExecResult>
  static async kill(pid: number): Promise<void>
  static getRunningHooks(): HookProcess[]
}

// HookHealthChecker - Validate hooks
class HookHealthChecker {
  static async check(hookPath: string): Promise<HealthCheckResult>
  static async validateSyntax(content: string, type: HookType): Promise<boolean>
  static async checkImports(hookPath: string): Promise<ImportCheck[]>
  static async profilePerformance(hookPath: string): Promise<PerformanceMetrics>
}

// StopHookDispatcher - Stop hook routing
class StopHookDispatcher {
  static async dispatch(context: StopContext): Promise<DispatchResult>
  static shouldReflect(context: StopContext): boolean
  static shouldContinueAuto(context: StopContext): boolean
}
```

### 5. Sync Engine (`src/core/sync/`)

| Module | File | Purpose | Key Methods |
|--------|------|---------|-------------|
| **SyncOrchestrator** | `sync-orchestrator.ts` | Coordinate multi-platform sync | `sync()`, `orchestrate()`, `schedule()` |
| **SyncTargetResolver** | `sync-target-resolver.ts` | Resolve sync targets | `resolve()`, `fromMetadata()`, `fromMapping()` |
| **CircuitBreaker** | `circuit-breaker.ts` | Prevent failure cascades | `call()`, `open()`, `halfOpen()`, `close()` |
| **AuditLogger** | `audit-logger.ts` | Log all sync operations | `log()`, `query()`, `export()` |
| **PermissionEnforcer** | `permission-enforcer.ts` | Enforce platform permissions | `check()`, `canWrite()`, `canDelete()` |
| **DiscrepancyDetector** | `discrepancy-detector.ts` | Detect drift | `detect()`, `compare()`, `resolve()` |
| **NotificationManager** | `notification-manager.ts` | Manage notifications | `notify()`, `dismiss()`, `query()` |

**Key Classes**:

```typescript
// SyncOrchestrator - Multi-platform coordination
class SyncOrchestrator {
  static async sync(incrementId: string, options?: SyncOptions): Promise<SyncResult>
  static async orchestrate(incrementIds: string[]): Promise<OrchestratedResult>
  static async schedule(): Promise<void>
  static async runScheduledJobs(): Promise<JobResult[]>
}

// SyncTargetResolver - Resolve targets
class SyncTargetResolver {
  static resolve(incrementId: string): Promise<ResolvedTarget>
  static fromMetadata(metadata: IncrementMetadata): SyncTarget | null
  static fromMapping(projectId: string): SyncTarget | null
  static fromDefault(): SyncTarget | null
}

// CircuitBreaker - Failure protection
class CircuitBreaker {
  constructor(config: CircuitBreakerConfig)
  async call<T>(fn: () => Promise<T>): Promise<T>
  open(): void
  halfOpen(): void
  close(): void
  getState(): CircuitState
}
```

### 6. Living Documentation (`src/living-docs/`)

| Module | File | Purpose | Key Methods |
|--------|------|---------|-------------|
| **LivingDocsBuilder** | `living-docs-builder.ts` | Generate living docs | `build()`, `generate()`, `organize()` |
| **SmartDocOrganizer** | `smart-doc-organizer.ts` | Auto-organize docs | `organize()`, `classify()`, `group()` |
| **ProjectDetector** | `project-detector.ts` | Detect project boundaries | `detect()`, `analyze()`, `boundaries()` |
| **ContentClassifier** | `content-classifier.ts` | Classify doc types | `classify()`, `categorize()`, `tag()` |
| **ContentParser** | `content-parser.ts` | Extract structured data | `parse()`, `extract()`, `structure()` |
| **CrossLinker** | `cross-linker.ts` | Create doc links | `link()`, `resolve()`, `validate()` |

**Key Classes**:

```typescript
// LivingDocsBuilder - Generate docs
class LivingDocsBuilder {
  static async build(options?: BuildOptions): Promise<BuildResult>
  static async generate(incrementId: string): Promise<void>
  static async organize(docsPath: string): Promise<void>
  static async sync(): Promise<void>
}

// SmartDocOrganizer - Auto-organization
class SmartDocOrganizer {
  static async organize(docsPath: string): Promise<OrganizationResult>
  static async classify(files: string[]): Promise<ClassificationMap>
  static async group(classified: ClassificationMap): Promise<GroupedDocs>
  static async createNavigation(grouped: GroupedDocs): Promise<void>
}

// ContentClassifier - Document classification
class ContentClassifier {
  static classify(content: string): DocType
  static categorize(docs: string[]): CategoryMap
  static tag(content: string): string[]
  static detectArchitecture(content: string): boolean
}
```

### 7. Auto Mode (`src/core/auto/`)

| Module | File | Purpose | Key Methods |
|--------|------|---------|-------------|
| **SessionManager** | `session-manager.ts` | Manage auto sessions | `create()`, `load()`, `update()`, `complete()` |
| **TaskQueue** | `task-queue.ts` | FIFO task queue | `enqueue()`, `dequeue()`, `peek()`, `isEmpty()` |
| **TestGate** | `test-gate.ts` | Pre/post test validation | `check()`, `runTests()`, `validate()` |
| **HumanGate** | `human-gate.ts` | Block sensitive operations | `check()`, `requireApproval()`, `block()` |
| **E2ECoverage** | `e2e-coverage.ts` | E2E test strategy | `analyze()`, `generateUsers()`, `seedDB()` |
| **CostEstimator** | `cost-estimator.ts` | Track token spend | `estimate()`, `track()`, `report()` |
| **ProgressReporter** | `progress-reporter.ts` | Report execution progress | `report()`, `update()`, `summarize()` |

**Key Classes**:

```typescript
// SessionManager - Auto session lifecycle
class SessionManager {
  static async create(incrementId: string): Promise<AutoSession>
  static async load(sessionId: string): Promise<AutoSession>
  static async update(sessionId: string, updates: Partial<AutoSession>): Promise<void>
  static async complete(sessionId: string): Promise<void>
  static async cancel(sessionId: string): Promise<void>
}

// TaskQueue - Task management
class TaskQueue {
  constructor(tasks: Task[])
  enqueue(task: Task): void
  dequeue(): Task | undefined
  peek(): Task | undefined
  isEmpty(): boolean
  size(): number
  toArray(): Task[]
}

// TestGate - Test validation
class TestGate {
  static async check(incrementId: string): Promise<TestResult>
  static async runTests(incrementId: string): Promise<TestResult>
  static async validate(result: TestResult): boolean
  static async getFailures(result: TestResult): TestFailure[]
}
```

### 8. Multi-Agent System (`src/core/agents/`)

| Module | File | Purpose | Key Methods |
|--------|------|---------|-------------|
| **AgentOrchestrator** | `agent-orchestrator.ts` | Coordinate agents | `orchestrate()`, `sequence()`, `parallel()` |
| **PMAgent** | `pm-agent.ts` | Product management | `research()`, `analyze()`, `prioritize()` |
| **ArchitectAgent** | `architect-agent.ts` | System design | `design()`, `evaluate()`, `recommend()` |
| **TechLeadAgent** | `tech-lead-agent.ts` | Implementation planning | `plan()`, `estimate()`, `assess()` |
| **AgentContext** | `agent-context.ts` | Isolated context | `create()`, `load()`, `save()` |

**Key Classes**:

```typescript
// AgentOrchestrator - Multi-agent coordination
class AgentOrchestrator {
  static async orchestrate(task: string, agents: Agent[]): Promise<OrchestratedResult>
  static async sequence(agents: Agent[]): Promise<SequenceResult>
  static async parallel(agents: Agent[]): Promise<ParallelResult>
}

// PMAgent - Product management
class PMAgent {
  static async research(topic: string): Promise<ResearchResult>
  static async analyze(requirements: string[]): Promise<AnalysisResult>
  static async prioritize(features: Feature[]): Promise<PrioritizedFeatures>
}

// ArchitectAgent - System design
class ArchitectAgent {
  static async design(requirements: Requirements): Promise<ArchitectureDesign>
  static async evaluate(options: DesignOption[]): Promise<EvaluationResult>
  static async recommend(tradeoffs: Tradeoff[]): Promise<Recommendation>
}
```

---

## Key Classes

### Increment Metadata

```typescript
interface IncrementMetadata {
  id: string;                      // "0001-feature-name"
  status: IncrementStatus;         // PLANNING | ACTIVE | READY_FOR_REVIEW | COMPLETED
  type: IncrementType;             // FEATURE | BUG | HOTFIX | REFACTOR | EXPERIMENT
  created: string;                 // ISO 8601
  lastActivity: string;            // ISO 8601
  testMode?: 'TDD' | 'test-after' | 'manual' | 'none';
  coverageTarget?: number;         // 0-100%
  readyForReviewAt?: string;      // When moved to READY_FOR_REVIEW
  approvedAt?: string;            // When explicitly approved via /sw:done
  pausedReason?: string;
  abandonedReason?: string;
  projectId?: string;             // Multi-project support
  multiProject?: MultiProjectUserStory;
  externalRefs?: USExternalRefsMap;
  syncTarget?: SyncTarget;        // v1.0.31+ (ADR-0211)
}

enum IncrementStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  READY_FOR_REVIEW = 'ready_for_review',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  ABANDONED = 'abandoned',
  BACKLOG = 'backlog'
}

enum IncrementType {
  FEATURE = 'feature',
  BUG = 'bug',
  HOTFIX = 'hotfix',
  CHANGE_REQUEST = 'change_request',
  REFACTOR = 'refactor',
  EXPERIMENT = 'experiment'
}
```

### Sync Configuration

```typescript
interface SyncOrchestrationConfig {
  scheduler: {
    enabled: boolean;
    jobs: {
      externalSync: { enabled: boolean, intervalMinutes: number }
      discrepancyCheck: { enabled: boolean, intervalMinutes: number }
      livingDocsSync: { enabled: boolean, intervalMinutes: number }
      notificationCleanup: { enabled: boolean, intervalMinutes: number }
    }
  };
  permissions: {
    github: PlatformSyncPermissions;
    jira: PlatformSyncPermissions;
    ado: PlatformSyncPermissions;
  };
  discrepancy: {
    enabled: boolean;
    autoUpdateTrivial: boolean;
    checkTypes: DiscrepancyType[];
  };
  notifications: {
    enabled: boolean;
    showOnCommands: boolean;
    types: NotificationType[];
  };
  logging: {
    verbosity: LogLevel;
    retentionDays: number;
  };
}

interface PlatformSyncPermissions {
  canRead: boolean;           // Pull from external
  canUpdateStatus: boolean;   // Update only status
  canUpsert: boolean;        // Create/update items
  canDelete: boolean;        // Delete (dangerous!)
}
```

### Sync Target

```typescript
interface SyncTarget {
  profileId: string;              // Which sync profile to use
  derivedFrom: SyncTargetSource;  // How was this target resolved?
  setAt?: string;                 // ISO 8601 timestamp
}

type SyncTargetSource =
  | 'explicit-metadata'           // Set explicitly in metadata.syncTarget
  | 'project-mapping'             // Resolved via **Project**: field
  | 'default-profile'             // Fallback to config.sync.defaultProfile
  | 'first-available';            // Fallback to first enabled profile
```

### Plugin Manifest

```typescript
interface PluginManifest {
  name: string;
  version: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  provides: {
    skills?: string[];
    agents?: string[];
    commands?: string[];
    hooks?: string[];
  };
  auto_detect: {
    files?: string[];           // e.g., [".github/workflows"]
    packages?: string[];        // e.g., ["@octokit/rest"]
    env?: string[];            // e.g., ["GITHUB_TOKEN"]
    git_remotes?: string[];    // e.g., ["github.com"]
  };
  dependencies?: {
    plugins?: string[];
  };
  specweave_core_version?: string;
}
```

---

## Utility Modules

### File System Utilities (`src/utils/fs-utils.ts`)

```typescript
class FileSystemUtils {
  static async readFile(path: string): Promise<string>
  static async writeFile(path: string, content: string): Promise<void>
  static async exists(path: string): Promise<boolean>
  static async mkdir(path: string): Promise<void>
  static async copy(src: string, dest: string): Promise<void>
  static async move(src: string, dest: string): Promise<void>
  static async delete(path: string): Promise<void>
  static async readDir(path: string): Promise<string[]>
}
```

### Path Utilities (`src/utils/path-utils.ts`)

```typescript
class PathUtils {
  static getIncrementsDir(): string
  static getIncrementPath(id: string): string
  static getSpecPath(id: string): string
  static getTasksPath(id: string): string
  static getLivingDocsPath(): string
  static getConfigPath(): string
  static resolveRelative(from: string, to: string): string
}
```

### Logger (`src/utils/logger.ts`)

```typescript
class Logger {
  static info(message: string, meta?: object): void
  static warn(message: string, meta?: object): void
  static error(message: string, meta?: object): void
  static debug(message: string, meta?: object): void
  static setLevel(level: LogLevel): void
  static addTransport(transport: Transport): void
}
```

### Validation Utilities (`src/utils/validation.ts`)

```typescript
class ValidationUtils {
  static isValidIncrementId(id: string): boolean
  static isValidFeatureId(id: string): boolean
  static isValidUserStoryId(id: string): boolean
  static isValidTaskId(id: string): boolean
  static isValidACId(id: string): boolean
  static validateConfig(config: SpecWeaveConfig): ValidationResult
}
```

---

## Plugin Components

### GitHub Plugin (`plugins/specweave-github/`)

```typescript
// Adapter for GitHub API
class GitHubAdapter {
  static async createIssue(data: IssueData): Promise<Issue>
  static async updateIssue(number: number, data: IssueData): Promise<Issue>
  static async closeIssue(number: number): Promise<void>
  static async getIssue(number: number): Promise<Issue>
  static async listIssues(filters: IssueFilters): Promise<Issue[]>
  static async addComment(number: number, body: string): Promise<Comment>
}

// Sync manager
class GitHubSyncManager {
  static async sync(incrementId: string): Promise<SyncResult>
  static async push(incrementId: string): Promise<PushResult>
  static async pull(incrementId: string): Promise<PullResult>
  static async reconcile(incrementId: string): Promise<ReconcileResult>
}
```

### JIRA Plugin (`plugins/specweave-jira/`)

```typescript
// Adapter for JIRA API
class JIRAAdapter {
  static async createEpic(data: EpicData): Promise<Epic>
  static async createStory(data: StoryData): Promise<Story>
  static async updateStory(key: string, data: StoryData): Promise<Story>
  static async transitionIssue(key: string, transition: string): Promise<void>
  static async getIssue(key: string): Promise<Issue>
}

// Sync manager
class JIRASyncManager {
  static async sync(incrementId: string): Promise<SyncResult>
  static async push(incrementId: string): Promise<PushResult>
  static async pull(incrementId: string): Promise<PullResult>
}
```

### Azure DevOps Plugin (`plugins/specweave-ado/`)

```typescript
// Adapter for ADO API
class ADOAdapter {
  static async createWorkItem(type: string, data: WorkItemData): Promise<WorkItem>
  static async updateWorkItem(id: number, data: WorkItemData): Promise<WorkItem>
  static async getWorkItem(id: number): Promise<WorkItem>
  static async listWorkItems(query: string): Promise<WorkItem[]>
}

// Sync manager
class ADOSyncManager {
  static async sync(incrementId: string): Promise<SyncResult>
  static async push(incrementId: string): Promise<PushResult>
  static async pull(incrementId: string): Promise<PullResult>
}
```

---

## Type Definitions

### Core Types (`src/types/`)

**Increment Types** (`increment-metadata.ts`):
- `IncrementMetadata`
- `IncrementStatus`
- `IncrementType`
- `WIPLimitCheck`
- `StatusTransition`

**Spec Types** (`spec.ts`):
- `UserStory`
- `AcceptanceCriteria`
- `Task`
- `ParsedSpec`
- `SpecFrontmatter`

**Config Types** (`config.ts`):
- `SpecWeaveConfig`
- `SyncConfig`
- `SyncProfile`
- `MultiProjectConfig`
- `ProjectMapping`

**Sync Types** (`sync.ts`):
- `SyncTarget`
- `SyncResult`
- `PlatformSyncPermissions`
- `DiscrepancyCheck`
- `NotificationConfig`

**Hook Types** (`hooks.ts`):
- `HookResult`
- `HookType`
- `HealthCheckResult`
- `PerformanceMetrics`

**Plugin Types** (`plugin.ts`):
- `PluginManifest`
- `SkillDefinition`
- `AgentDefinition`
- `CommandDefinition`

---

## Module Dependencies

### Core Dependencies

```
increment/
├── metadata-manager
│   ├── fs-utils
│   ├── path-utils
│   └── validation
├── active-increment-manager
│   ├── metadata-manager
│   └── config-manager
└── increment-archiver
    ├── metadata-manager
    └── fs-utils

specs/
├── spec-parser
│   ├── fs-utils
│   └── markdown-parser
├── completion-propagator
│   ├── spec-parser
│   └── task-state-manager
└── spec-distributor
    ├── config-manager
    └── project-resolver

hooks/
├── hook-executor
│   ├── child-process
│   └── hook-logger
├── hook-health-checker
│   ├── fs-utils
│   └── syntax-validator
└── stop-hook-dispatcher
    ├── hook-executor
    └── session-manager

sync/
├── sync-orchestrator
│   ├── github-adapter
│   ├── jira-adapter
│   ├── ado-adapter
│   └── circuit-breaker
├── sync-target-resolver
│   ├── metadata-manager
│   └── config-manager
└── permission-enforcer
    └── config-manager
```

---

## Next Steps

1. **Read [TECHNICAL-OVERVIEW.md](TECHNICAL-OVERVIEW.md)** for high-level architecture
2. **Explore [diagrams/](diagrams/)** for visual representations
3. **Review [adr/](adr/)** for architectural decisions
4. **Check [../specs/](../specs/)** for feature specifications

---

**Last Updated**: 2026-01-08
**Document Owner**: SpecWeave Architecture Team
**Review Cycle**: Monthly
