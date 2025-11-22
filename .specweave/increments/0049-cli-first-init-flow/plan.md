---
increment: 0049-cli-first-init-flow
title: "CLI-First Init Flow with Smart Pagination (Phase 2)"
feature_id: FS-049
status: planned
priority: P1
created: 2025-11-21
structure: user-stories
architecture_docs:
  - ../../docs/internal/architecture/system-design.md
  - ../../docs/internal/architecture/adr/0052-smart-pagination.md
  - ../../docs/internal/architecture/adr/0053-cli-first-defaults.md
  - ../../docs/internal/architecture/adr/0055-progress-tracking.md
  - ../../docs/internal/architecture/adr/0057-async-batch-fetching.md
  - ../../docs/internal/architecture/adr/0058-progress-tracking-implementation.md
  - ../../docs/internal/architecture/adr/0059-cancelation-strategy.md
related_increments:
  - 0048-external-tool-import-enhancement
tech_stack:
  language: TypeScript 5.x
  runtime: Node.js 20 LTS
  cli_framework: Inquirer.js 9.x
  ui_libraries: Ora 7.x, Chalk 5.x
  testing: Vitest 1.x, Playwright 1.x
  http_client: Node Fetch API
dependencies:
  - FS-048 (Phase 1a - ConfigManager & Auto-Discovery)
  - ADR-0052 (Smart Pagination)
  - ADR-0053 (CLI-First Defaults)
  - ADR-0055 (Progress Tracking)
  - ADR-0057 (Async Batch Fetching)
  - ADR-0058 (Progress Tracking Implementation)
  - ADR-0059 (Cancelation Strategy)
target_metrics:
  init_time_reduction: "2-5 minutes → < 30 seconds (80%)"
  keystroke_reduction: "80% (deselect 5 vs select 45)"
  timeout_errors: "Zero (100% success rate)"
---

# Implementation Plan: CLI-First Init Flow with Smart Pagination

**Increment**: 0049-cli-first-init-flow
**Feature**: [FS-049 - CLI-First Init Flow (Phase 2)](../../docs/internal/specs/_features/FS-049/FEATURE.md)
**Status**: Planned
**Priority**: P1 (High)
**Phase**: 2 of External Tool Import Enhancement

---

## Architecture Overview

**Complete architecture**: [System Design](../../docs/internal/architecture/system-design.md)

**Key decisions**:
- [ADR-0052: Smart Pagination (50-Project Limit)](../../docs/internal/architecture/adr/0052-smart-pagination.md)
- [ADR-0053: CLI-First Defaults Philosophy](../../docs/internal/architecture/adr/0053-cli-first-defaults.md)
- [ADR-0055: Progress Tracking with Cancelation](../../docs/internal/architecture/adr/0055-progress-tracking.md)
- [ADR-0057: Async Batch Fetching Strategy](../../docs/internal/architecture/adr/0057-async-batch-fetching.md)
- [ADR-0058: Progress Tracking Implementation](../../docs/internal/architecture/adr/0058-progress-tracking-implementation.md)
- [ADR-0059: Cancelation Strategy](../../docs/internal/architecture/adr/0059-cancelation-strategy.md)

---

## Technology Stack Summary

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Language** | TypeScript | 5.x | Type safety, existing codebase |
| **Runtime** | Node.js | 20 LTS | Current standard, async/await support |
| **CLI Prompts** | Inquirer.js | 9.x | Already in use, mature library |
| **Spinners** | Ora | 7.x | Already in use, simple API |
| **Colors** | Chalk | 5.x | Already in use, terminal styling |
| **Testing** | Vitest | 1.x | Fast, ESM-native (migrated from Jest) |
| **E2E Tests** | Playwright | Latest | Real browser automation |
| **HTTP Client** | Native Fetch | Node 20 | No dependencies, modern API |
| **Retry Logic** | Custom | N/A | Exponential backoff (1s, 2s, 4s) |

---

## Component Design

### Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Init Command Entry Point                     │
│                      src/cli/commands/init.ts                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Issue Tracker Selection Flow                      │
│               src/cli/helpers/issue-tracker/jira.ts                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 1. checkExistingJiraCredentials()                            │   │
│  │ 2. promptJiraCredentials() [NEW: Choose Instance Type]       │   │
│  │ 3. validateJiraCredentials() [Fast auth check]               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Project Count Check [NEW]                         │
│            src/cli/helpers/project-count-fetcher.ts                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ getProjectCount(credentials):                                │   │
│  │   GET /rest/api/3/project/search?maxResults=0                │   │
│  │   → { total: 127 }                                           │   │
│  │   < 1 second (lightweight query)                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Import Strategy Selector [NEW]                      │
│              src/cli/helpers/import-strategy-prompter.ts             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ promptImportStrategy(totalCount):                            │   │
│  │   Options:                                                   │   │
│  │     1. ✨ Import all 127 projects (recommended)              │   │
│  │     2. 📋 Select specific projects                           │   │
│  │     3. ✏️  Manual entry (type keys)                          │   │
│  │   Default: "import-all"                                      │   │
│  │   Safety: Confirm if count > 100                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌─────────────────────────┐  ┌─────────────────────────────────────┐
│   Import All Path       │  │   Select Specific Path              │
│  (Async Batch Fetch)    │  │  (Load 50, Checkbox UI)             │
└────────┬────────────────┘  └───────────┬─────────────────────────┘
         │                                │
         ▼                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Async Project Loader [NEW]                        │
│                src/cli/helpers/project-fetcher.ts                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ AsyncProjectLoader.fetchAllProjects():                       │   │
│  │   - Initialize ProgressTracker                               │   │
│  │   - Register CancelationHandler                              │   │
│  │   - Loop: Fetch batches of 50 projects                       │   │
│  │   - Update progress every 5 projects                         │   │
│  │   - Handle errors (continue-on-failure)                      │   │
│  │   - Check cancelation (Ctrl+C)                               │   │
│  │   - Return: { projects, succeeded, failed, errors }          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌─────────────────────────┐  ┌─────────────────────────────────────┐
│   Progress Tracker      │  │   Cancelation Handler               │
│  [NEW Component]        │  │  [NEW Component]                    │
│  - Real-time progress   │  │  - SIGINT detection                 │
│  - ETA estimation       │  │  - State persistence                │
│  - Final summary        │  │  - Resume capability                │
└─────────────────────────┘  └─────────────────────────────────────┘
```

---

### 1. ProjectCountFetcher (NEW Component)

**File**: `src/cli/helpers/project-count-fetcher.ts`

**Purpose**: Lightweight query to get project count (no metadata)

**Interface**:
```typescript
export interface ProjectCountOptions {
  credentials: JiraCredentials | AdoCredentials;
  provider: 'jira' | 'ado';
}

export interface ProjectCountResult {
  total: number;
  accessible: number;
  error?: string;
}

export async function getProjectCount(
  options: ProjectCountOptions
): Promise<ProjectCountResult>
```

**API Calls**:
- **JIRA Cloud**: `GET /rest/api/3/project/search?maxResults=0`
- **JIRA Server**: `GET /rest/api/2/project?maxResults=0`
- **ADO**: `GET /_apis/projects?$top=0`

**Performance**:
- Target: < 1 second
- Retry: 3 attempts with backoff (1s, 2s, 4s)
- Timeout: 10 seconds

**Error Handling**:
- Auth failure → Return error, prompt re-enter credentials
- Timeout → Retry with backoff
- Network error → Retry with backoff
- Permission error → Return accessible count (may be 0)

---

### 2. ImportStrategyPrompter (NEW Component)

**File**: `src/cli/helpers/import-strategy-prompter.ts`

**Purpose**: Upfront strategy choice BEFORE loading projects

**Interface**:
```typescript
export type ImportStrategy = 'import-all' | 'select-specific' | 'manual-entry';

export interface StrategyPromptOptions {
  totalCount: number;
  provider: 'jira' | 'ado' | 'github';
  existingConfig?: { projects: string[] };
}

export interface StrategyPromptResult {
  strategy: ImportStrategy;
  projectKeys?: string[]; // If manual-entry chosen
  confirmed: boolean;     // If safety confirmation shown
}

export async function promptImportStrategy(
  options: StrategyPromptOptions
): Promise<StrategyPromptResult>
```

**Inquirer.js Prompt Structure**:

```typescript
// Step 1: Strategy choice
{
  type: 'list',
  name: 'strategy',
  message: 'How would you like to import projects?',
  default: 'import-all',  // CLI-first default
  choices: [
    {
      name: chalk.cyan('✨ Import all 127 projects (recommended)') +
            chalk.gray('\n   ↳ Fast: All projects imported in < 30 seconds'),
      value: 'import-all',
      short: 'Import all'
    },
    {
      name: chalk.cyan('📋 Select specific projects') +
            chalk.gray('\n   ↳ Interactive: Deselect unwanted projects'),
      value: 'select-specific',
      short: 'Select specific'
    },
    {
      name: chalk.cyan('✏️  Manual entry') +
            chalk.gray('\n   ↳ Type project keys: "BACKEND,FRONTEND,MOBILE"'),
      value: 'manual-entry',
      short: 'Manual entry'
    }
  ]
}

// Step 2: Safety confirmation (if count > 100 AND strategy === 'import-all')
{
  type: 'confirm',
  name: 'confirmBulkImport',
  message: chalk.yellow(
    `⚠️  You're about to import ${totalCount} projects.\n` +
    `   This will create ${totalCount} project folders and take ~${estimatedTime}s.\n` +
    `   Continue?`
  ),
  default: false,  // Safe default (prevents accidents)
  when: (answers) => answers.strategy === 'import-all' && totalCount > 100
}

// Step 3: Manual entry input (if strategy === 'manual-entry')
{
  type: 'input',
  name: 'projectKeys',
  message: 'Enter project keys (comma-separated):',
  validate: (input: string) => {
    const keys = input.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return 'At least one project key required';
    if (keys.some(k => !/^[A-Z0-9_-]+$/i.test(k))) {
      return 'Invalid format. Use letters, numbers, hyphens only (e.g., BACKEND,FRONTEND)';
    }
    return true;
  },
  when: (answers) => answers.strategy === 'manual-entry'
}
```

**Safety Confirmation Logic**:
- Threshold: 100 projects
- Default: "No" (safe default)
- If user declines: Return to strategy selection
- Estimated time: `Math.ceil(totalCount / 50) * 5` seconds (50 projects/batch, 5s/batch)

---

### 3. AsyncProjectLoader (NEW Component)

**File**: `src/cli/helpers/project-fetcher.ts`

**Purpose**: Batch fetching with progress tracking and cancelation

**Interface**:
```typescript
export interface FetchOptions {
  batchSize?: number;         // Default: 50
  updateFrequency?: number;   // Default: 5 (update every 5 projects)
  showEta?: boolean;          // Default: true
  stateFile?: string;         // Default: .specweave/cache/import-state.json
}

export interface FetchResult {
  projects: Project[];
  succeeded: number;
  failed: number;
  skipped: number;
  errors: FetchError[];
  canceled?: boolean;
}

export interface FetchError {
  projectKey: string;
  error: string;
  timestamp: string;
  suggestion: string;
  retryAttempts?: number;
}

export class AsyncProjectLoader {
  private progressTracker: ProgressTracker;
  private cancelHandler: CancelationHandler;

  constructor(
    private credentials: Credentials,
    private provider: 'jira' | 'ado',
    private options: FetchOptions = {}
  ) {
    // Initialize components (lazy initialization)
  }

  async fetchAllProjects(totalCount: number): Promise<FetchResult>
  async fetchBatch(offset: number, limit: number): Promise<Project[]>
  private async fetchBatchWithRetry(
    operation: () => Promise<Project[]>,
    maxRetries: number = 3
  ): Promise<Project[]>
}
```

**Implementation Flow**:

```typescript
async fetchAllProjects(totalCount: number): Promise<FetchResult> {
  const batchSize = this.options.batchSize || 50;
  const projects: Project[] = [];
  const errors: FetchError[] = [];

  // Initialize progress tracking
  this.progressTracker = new ProgressTracker({
    total: totalCount,
    updateFrequency: this.options.updateFrequency || 5,
    showEta: this.options.showEta !== false
  });

  // Initialize cancelation handler
  this.cancelHandler = new CancelationHandler({
    stateFile: this.options.stateFile || '.specweave/cache/import-state.json'
  });

  // Register cleanup callback (save state on Ctrl+C)
  this.cancelHandler.onCleanup(async () => {
    await this.savePartialState(projects, totalCount, errors);
  });

  // Main fetch loop
  for (let offset = 0; offset < totalCount; offset += batchSize) {
    // Check for cancelation
    if (this.cancelHandler.shouldCancel()) {
      return {
        projects,
        succeeded: projects.length,
        failed: errors.length,
        skipped: 0,
        errors,
        canceled: true
      };
    }

    // Calculate batch size (last batch may be smaller)
    const limit = Math.min(batchSize, totalCount - offset);

    try {
      // Fetch batch with retry logic
      const batch = await this.fetchBatchWithRetry(
        () => this.fetchBatch(offset, limit)
      );

      projects.push(...batch);

      // Update progress (throttled)
      batch.forEach(project => {
        this.progressTracker.update(project.key, 'success');
      });

    } catch (error: any) {
      // Log error, continue to next batch (continue-on-failure)
      const errorEntry: FetchError = {
        projectKey: `BATCH_${offset}-${offset + limit}`,
        error: error.message,
        timestamp: new Date().toISOString(),
        suggestion: this.getSuggestion(error),
        retryAttempts: 3
      };
      errors.push(errorEntry);

      // Update progress (mark as failed)
      this.progressTracker.update(`BATCH_${offset}`, 'failure');
    }
  }

  // Complete
  this.progressTracker.finish();
  await this.cancelHandler.clearState();

  return {
    projects,
    succeeded: projects.length,
    failed: errors.length,
    skipped: 0,
    errors
  };
}
```

**Retry Logic** (Exponential Backoff):

```typescript
private async fetchBatchWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const delays = [1000, 2000, 4000];  // 1s, 2s, 4s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;
      const isRetryable = this.isRetryableError(error);

      if (isLastAttempt || !isRetryable) {
        throw error;
      }

      console.warn(
        chalk.yellow(`⚠️  Retry ${attempt + 1}/${maxRetries} after ${delays[attempt]}ms...`)
      );
      await this.sleep(delays[attempt]);
    }
  }

  throw new Error('Retry logic exhausted (should never reach here)');
}

private isRetryableError(error: any): boolean {
  // Network errors
  if (['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'].includes(error.code)) {
    return true;
  }

  // HTTP 5XX server errors
  if (error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }

  // HTTP 429 (rate limit) → Retryable with backoff
  if (error.statusCode === 429) {
    return true;
  }

  // All other errors (4XX, auth failures) → Not retryable
  return false;
}
```

**Error Suggestion Mapping**:

```typescript
private getSuggestion(error: any): string {
  const statusCode = error.statusCode;
  const code = error.code;

  if (statusCode === 403) {
    return 'Check project permissions (you may lack read access)';
  }

  if (statusCode === 404) {
    return 'Project may have been deleted or archived';
  }

  if (statusCode === 429) {
    return 'Rate limit exceeded (throttling applied)';
  }

  if (code === 'ETIMEDOUT') {
    return 'Network timeout (try again or reduce batch size)';
  }

  if (statusCode >= 500) {
    return 'API issue (retrying with backoff)';
  }

  return 'Unknown error (check logs for details)';
}
```

---

### 4. ProgressTracker (NEW Component)

**File**: `src/cli/helpers/progress-tracker.ts`

**Purpose**: Real-time progress bar with ETA estimation

**Architecture**: See [ADR-0058](../../docs/internal/architecture/adr/0058-progress-tracking-implementation.md) for detailed implementation.

**Interface**:
```typescript
export interface ProgressOptions {
  total: number;
  updateFrequency?: number;  // Default: 5
  showEta?: boolean;          // Default: true
}

export interface ProgressSummary {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  elapsed: number;
}

export class ProgressTracker {
  constructor(options: ProgressOptions)
  update(item: string, status: 'success' | 'failure' | 'skip'): void
  finish(): void
  cancel(): void
  getSummary(): ProgressSummary
}
```

**Key Features**:
- ASCII progress bar: `[=============>          ] 39%`
- ETA estimation: Rolling average of last 10 items
- Update throttling: Every 5 projects (reduce console spam)
- Final summary: `✅ Loaded 125/127 projects (2 failed, 0 skipped) in 28s`

**Example Output**:
```
Loading projects... 50/127 (39%) [=============>          ] [47s elapsed, ~2m remaining]
```

---

### 5. CancelationHandler (NEW Component)

**File**: `src/cli/helpers/cancelation-handler.ts`

**Purpose**: Graceful Ctrl+C handling with state persistence

**Architecture**: See [ADR-0059](../../docs/internal/architecture/adr/0059-cancelation-strategy.md) for detailed implementation.

**Interface**:
```typescript
export interface CancelationOptions {
  stateFile: string;  // e.g., .specweave/cache/import-state.json
}

export interface CancelationState {
  operation: string;
  provider: string;
  domain?: string;
  timestamp: string;
  version: string;
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  remaining: Array<{ key: string; name: string }>;
  errors: Array<{ projectKey: string; error: string; timestamp: string }>;
}

export class CancelationHandler {
  constructor(options: CancelationOptions)
  shouldCancel(): boolean
  onCleanup(callback: () => Promise<void>): void
  async saveState(state: CancelationState): Promise<void>
  async loadState(): Promise<CancelationState | null>
  async clearState(): Promise<void>
}
```

**Key Features**:
- SIGINT handler registration
- Atomic file writes (temp file → rename)
- State TTL: 24 hours
- Double Ctrl+C: Force exit (no state save)
- Resume command suggested to user

**Example Output**:
```
^C
⚠️  Cancelation requested. Saving progress...
State saved to .specweave/cache/import-state.json
⚠️  Operation canceled
   Imported 47/127 projects (37% complete)
   Resume with: /specweave-jira:import-projects --resume
```

---

## API Integration Details

### JIRA Cloud (v3)

**Count Check**:
```http
GET /rest/api/3/project/search?maxResults=0
Authorization: Basic base64(email:token)

Response:
{
  "total": 127,
  "values": []
}
```

**Batch Fetch**:
```http
GET /rest/api/3/project/search?startAt=0&maxResults=50
Authorization: Basic base64(email:token)

Response:
{
  "total": 127,
  "maxResults": 50,
  "startAt": 0,
  "values": [
    {
      "id": "10000",
      "key": "BACKEND",
      "name": "Backend Services",
      "projectTypeKey": "software",
      "simplified": false
    },
    // ... 49 more
  ]
}
```

**Pagination Logic**:
```typescript
const totalBatches = Math.ceil(totalCount / batchSize);
for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
  const startAt = batchIndex * batchSize;
  const maxResults = Math.min(batchSize, totalCount - startAt);

  const url = `/rest/api/3/project/search?startAt=${startAt}&maxResults=${maxResults}`;
  // Fetch batch...
}
```

---

### JIRA Server (v2)

**Count Check**:
```http
GET /rest/api/2/project?maxResults=0
Authorization: Basic base64(email:token)

Response: []
Headers: X-Total-Count: 127
```

**Batch Fetch**:
```http
GET /rest/api/2/project?startAt=0&maxResults=50
Authorization: Basic base64(email:token)

Response: [
  {
    "id": "10000",
    "key": "BACKEND",
    "name": "Backend Services"
  },
  // ... 49 more
]
```

**Note**: JIRA Server returns array directly, total count in header.

---

### Azure DevOps

**Count Check**:
```http
GET https://dev.azure.com/{org}/_apis/projects?$top=0&api-version=7.0
Authorization: Basic base64(:PAT)

Response:
{
  "count": 127,
  "value": []
}
```

**Batch Fetch**:
```http
GET https://dev.azure.com/{org}/_apis/projects?$top=50&$skip=0&api-version=7.0
Authorization: Basic base64(:PAT)

Response:
{
  "count": 127,
  "value": [
    {
      "id": "guid",
      "name": "Backend Services",
      "description": "...",
      "state": "wellFormed"
    },
    // ... 49 more
  ]
}
```

---

## Performance Optimization

### Target Metrics

| Scenario | Current (Baseline) | Target (Optimized) | Improvement |
|----------|-------------------|-------------------|-------------|
| **50 projects** | 1-2 minutes | < 10 seconds | 85%+ |
| **100 projects** | 2-5 minutes | < 30 seconds | 80%+ |
| **500 projects** | 5-10 minutes | < 2 minutes | 80%+ |

### Optimization Strategies

**1. Count-Only Query First**
- API Call: `GET /project/search?maxResults=0`
- Response Time: < 1 second
- Benefit: User sees total count immediately

**2. Batch Size: 50 Projects**
- Rationale: Balance efficiency vs. timeout risk
- API Call Reduction: 100 projects = 2 batches (vs. 100 calls) = **98% reduction**
- Timeout Risk: 50 projects < 5 seconds (well under 30s timeout)

**3. Update Throttling**
- Console updates: Every 5 projects (not every project)
- Reduction: 127 projects = 26 updates (vs. 127) = **80% reduction**
- Benefit: Improved readability, no flickering

**4. Retry with Exponential Backoff**
- Delays: 1s, 2s, 4s (total 7s overhead per failure)
- Benefit: Handles transient network issues
- Fallback: Graceful degradation (reduce batch size 50 → 25 → 10)

**5. Continue-on-Failure**
- Single project failure doesn't block batch
- Benefit: 95 out of 100 projects succeed (vs. 0 if blocking)
- Error Logging: All failures logged to `.specweave/logs/import-errors.log`

---

## Test Strategy

### Unit Tests (Coverage Target: 85%+)

See full test cases in spec.md section "Test Strategy > Unit Tests"

Key test files:
- `tests/unit/cli/helpers/project-count-fetcher.test.ts`
- `tests/unit/cli/helpers/import-strategy-prompter.test.ts`
- `tests/unit/cli/helpers/project-fetcher.test.ts`
- `tests/unit/cli/helpers/progress-tracker.test.ts`
- `tests/unit/cli/helpers/cancelation-handler.test.ts`

---

### Integration Tests (Coverage Target: 80%+)

See full test cases in spec.md section "Test Strategy > Integration Tests"

Key test files:
- `tests/integration/cli/init-flow/batch-fetching.test.ts`
- `tests/integration/cli/init-flow/progress-tracking.test.ts`
- `tests/integration/cli/init-flow/cancelation-resume.test.ts`

---

### E2E Tests (Playwright) (Coverage Target: 70%+)

See full test cases in spec.md section "Test Strategy > E2E Tests"

Key test file:
- `tests/e2e/init-flow/cli-first-init.spec.ts`

---

### Performance Tests (Coverage Target: 95%+)

See full test cases in spec.md section "Test Strategy > Performance Tests"

Key test file:
- `tests/performance/init-flow/performance-benchmarks.test.ts`

---

## Implementation Phases

### Phase 1: Foundation (Days 1-2)
- ✅ Create ProjectCountFetcher component
- ✅ Create ImportStrategyPrompter component
- ✅ Update JIRA helper to integrate count check
- ✅ Unit tests for count check and strategy selection

### Phase 2: Async Batch Fetching (Days 3-4)
- ✅ Create AsyncProjectLoader component
- ✅ Implement retry logic with exponential backoff
- ✅ Implement continue-on-failure error handling
- ✅ Unit tests for batch fetching and retry logic

### Phase 3: Progress Tracking (Day 5)
- ✅ Create ProgressTracker component
- ✅ Implement ETA estimation (rolling average)
- ✅ Integrate with AsyncProjectLoader
- ✅ Unit tests for progress tracking

### Phase 4: Cancelation Support (Day 6)
- ✅ Create CancelationHandler component
- ✅ Implement state persistence (atomic writes)
- ✅ Implement resume command
- ✅ Unit tests for cancelation and resume

### Phase 5: Integration (Day 7)
- ✅ Update init command to integrate all components
- ✅ Update project-selector.ts (pre-checked checkboxes)
- ✅ Integration tests (full init flow)

### Phase 6: E2E & Performance Testing (Days 8-9)
- ✅ E2E tests with Playwright
- ✅ Performance benchmarks (100 projects < 30s)
- ✅ Stress tests (500 projects < 2 minutes)

### Phase 7: Documentation & Polish (Day 10)
- ✅ Update CLI help text
- ✅ Update user guide (init flow section)
- ✅ Create migration guide (old → new flow)
- ✅ Update .env.example with new config fields

---

## File Structure

### New Files Created

```
src/cli/helpers/
├── project-count-fetcher.ts         # Lightweight count check (NEW)
├── import-strategy-prompter.ts      # Strategy selection UI (NEW)
├── project-fetcher.ts               # AsyncProjectLoader (NEW)
├── progress-tracker.ts              # Progress bar + ETA (NEW)
└── cancelation-handler.ts           # Ctrl+C handling (NEW)

tests/unit/cli/helpers/
├── project-count-fetcher.test.ts    # Unit tests (NEW)
├── import-strategy-prompter.test.ts # Unit tests (NEW)
├── project-fetcher.test.ts          # Unit tests (NEW)
├── progress-tracker.test.ts         # Unit tests (NEW)
└── cancelation-handler.test.ts      # Unit tests (NEW)

tests/integration/cli/init-flow/
├── batch-fetching.test.ts           # Integration tests (NEW)
├── progress-tracking.test.ts        # Integration tests (NEW)
└── cancelation-resume.test.ts       # Integration tests (NEW)

tests/e2e/init-flow/
└── cli-first-init.spec.ts           # E2E tests (NEW)

.specweave/cache/
└── import-state.json                # Cancelation state (NEW, gitignored)

.specweave/logs/
└── import-errors.log                # Error logging (NEW, gitignored)
```

### Modified Files

```
src/cli/helpers/issue-tracker/jira.ts
  - Add upfront strategy choice (promptImportStrategy)
  - Integrate ProjectCountFetcher
  - Integrate AsyncProjectLoader
  - Remove old synchronous fetch logic

plugins/specweave-jira/lib/project-selector.ts
  - Update checkbox prompt to set `checked: true` by default
  - Add instruction text ("All selected by default. Deselect...")

src/cli/commands/init.ts
  - Register SIGINT handler during init
  - Integrate progress tracking
  - Handle cancelation cleanup

src/core/config/types.ts
  - Add `importBatchSize`, `importProgressUpdateInterval`, etc.
```

---

## Configuration

### New Config Fields (.specweave/config.json)

```json
{
  "issueTracker": {
    "provider": "jira",
    "domain": "example.atlassian.net",
    "strategy": "project-per-team"
  },
  "import": {
    "initialLoadLimit": 50,
    "batchSize": 50,
    "batchSizeMin": 10,
    "retryAttempts": 3,
    "retryBackoffMs": [1000, 2000, 4000],
    "rateLimitThreshold": 10,
    "rateLimitPauseMs": 5000,
    "progressUpdateInterval": 5,
    "progressBarWidth": 30,
    "progressShowEta": true,
    "stateTtlHours": 24,
    "resumeEnabled": true,
    "statePath": ".specweave/cache/import-state.json",
    "errorLogPath": ".specweave/logs/import-errors.log"
  }
}
```

---

## Risks & Mitigations

### Risk 1: API Rate Limits (JIRA Cloud)
**Problem**: Fetching 500+ projects may hit rate limits (3600 req/hour)

**Mitigation**:
- Sequential batching (not parallel) to stay under 1 req/sec
- Respect `X-RateLimit-Remaining` header (throttle if < 10)
- Retry with exponential backoff on 429 errors
- Cache project list for 24 hours (reduce redundant calls)

**Priority**: P0 (Critical)

---

### Risk 2: Large Project Lists (UI Performance)
**Problem**: Rendering 500+ checkbox items may freeze UI

**Mitigation**:
- Only load first 50 projects in checkbox mode
- "Import all" bypasses checkbox UI (async fetch with progress bar)
- Virtual scrolling (future enhancement)

**Priority**: P2 (Medium)

---

### Risk 3: Partial Failures (Permission Errors)
**Problem**: User selects "Import all" but lacks permissions for 10/100 projects

**Mitigation**:
- Continue-on-failure (import accessible 90 projects)
- Log failed projects to `.specweave/logs/import-errors.log`
- Show warning in final summary
- Provide actionable suggestions (check permissions)

**Priority**: P1 (High)

---

### Risk 4: Network Timeout (Slow API)
**Problem**: Batch fetch times out after 30 seconds

**Mitigation**:
- Retry with exponential backoff (3 attempts: 1s, 2s, 4s)
- Reduce batch size on timeout (50 → 25 → 10 projects)
- Clear error message with suggestion
- Progress saved on failure (resume capability)

**Priority**: P0 (Critical)

---

### Risk 5: State File Corruption
**Problem**: Cancelation state corrupted (invalid JSON)

**Mitigation**:
- Atomic writes (temp file → rename)
- Validation on resume (detect corruption)
- Prompt fresh start if invalid
- TTL expiration (24 hours)

**Priority**: P1 (High)

---

## Success Criteria

### Must-Have (MVP)
1. ✅ Init time < 30 seconds for 100+ project instances
2. ✅ "Import all" as default with upfront strategy choice
3. ✅ 50-project pagination working correctly
4. ✅ Progress tracking with percentage and ETA
5. ✅ Graceful cancelation with state save
6. ✅ Zero timeout errors in performance tests

### Should-Have (Enhanced)
1. ⭐ Resume capability tested and working
2. ⭐ Safety confirmation for > 100 projects
3. ⭐ Error logging with actionable suggestions
4. ⭐ Retry logic with exponential backoff

### Metrics (Validation)
- **Performance**: Init time reduced from 2-5 minutes → < 30 seconds (80% improvement)
- **API Efficiency**: API calls reduced from 100+ → < 12 for 500 projects (90% reduction)
- **UX**: 80% keystroke reduction (5 deselects vs. 45 selects)
- **Reliability**: Zero timeout errors in 100 test runs with 100+ projects

---

## Related Documentation

- **Feature Spec**: `.specweave/docs/internal/specs/_features/FS-049/FEATURE.md`
- **ADR-0052**: Smart Pagination (50-Project Limit)
- **ADR-0053**: CLI-First Defaults Philosophy
- **ADR-0055**: Progress Tracking with Cancelation
- **ADR-0057**: Async Batch Fetching Strategy
- **ADR-0058**: Progress Tracking Implementation
- **ADR-0059**: Cancelation Strategy
- **Phase 1a**: `.specweave/increments/0048-external-tool-import-enhancement/`
- **JIRA API Docs**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/

---

**End of Implementation Plan**
