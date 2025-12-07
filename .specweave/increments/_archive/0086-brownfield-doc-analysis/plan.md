# Implementation Plan: 0086 Brownfield Documentation Analysis

## Implementation Strategy

**Approach**: Incremental delivery with immediate value at each phase
**Pattern**: Extend existing background job infrastructure
**Risk Mitigation**: Start with minimal viable analysis, expand detection algorithms

---

## Phase 1: Discrepancy Storage Infrastructure

### 1.1 Folder Structure & Schema

**File**: `src/core/discrepancy/types.ts`

```typescript
export type DiscrepancyType =
  | 'missing-docs'      // Code exists, no documentation
  | 'stale-docs'        // Code changed, docs didn't
  | 'code-doc-mismatch' // Docs say X, code does Y
  | 'knowledge-gap'     // Module with single contributor
  | 'orphan-doc'        // Docs for deleted code
  | 'missing-adr';      // Significant pattern, no ADR

export type DiscrepancyStatus =
  | 'pending'           // Needs attention
  | 'in-progress'       // Linked to increment
  | 'resolved'          // Fixed
  | 'ignored';          // Marked as false positive/won't fix

export interface Discrepancy {
  id: string;
  type: DiscrepancyType;
  module: string;
  codeLocation?: string;
  docLocation?: string;
  summary: string;
  details: string;
  evidence: DiscrepancyEvidence;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  autoDetected: boolean;
  status: DiscrepancyStatus;
  incrementId?: string;
  resolution?: DiscrepancyResolution;
  detectedAt: string;
  detectedBy: 'brownfield-analyzer' | 'drift-detector' | 'manual';
  lastChecked: string;
}

export interface DiscrepancyEvidence {
  codeSnippet?: string;
  docSnippet?: string;
  gitHistory?: {
    lastCodeChange: string;
    lastDocChange?: string;
    authors: string[];
  };
}

export interface DiscrepancyResolution {
  type: 'doc-updated' | 'code-updated' | 'both-updated' | 'false-positive';
  resolvedAt: string;
  resolvedBy: string;
}

export interface DiscrepancyIndex {
  version: '1.0.0';
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    ignored: number;
    byType: Record<DiscrepancyType, number>;
    byPriority: Record<string, number>;
  };
  lastUpdated: string;
  lastAnalysis?: {
    jobId: string;
    completedAt: string;
    duration: number;
    phasesCompleted: string[];
  };
}
```

### 1.2 Discrepancy Manager

**File**: `src/core/discrepancy/discrepancy-manager.ts`

```typescript
export class DiscrepancyManager {
  private projectPath: string;
  private basePath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.basePath = path.join(projectPath, '.specweave', 'discrepancies');
  }

  // CRUD operations
  async createDiscrepancy(data: Omit<Discrepancy, 'id'>): Promise<Discrepancy>;
  async getDiscrepancy(id: string): Promise<Discrepancy | null>;
  async updateDiscrepancy(id: string, updates: Partial<Discrepancy>): Promise<Discrepancy>;
  async deleteDiscrepancy(id: string): Promise<boolean>;

  // Query operations
  async listDiscrepancies(filter?: DiscrepancyFilter): Promise<Discrepancy[]>;
  async getStats(): Promise<DiscrepancyIndex['stats']>;

  // Status transitions
  async linkToIncrement(discrepancyId: string, incrementId: string): Promise<void>;
  async resolveDiscrepancy(id: string, resolution: DiscrepancyResolution): Promise<void>;
  async ignoreDiscrepancy(id: string, reason: string): Promise<void>;

  // Batch operations
  async createBatch(discrepancies: Omit<Discrepancy, 'id'>[]): Promise<Discrepancy[]>;
  async archiveResolved(): Promise<number>;

  // Internal helpers
  private getBatchFolder(id: number): string;
  private getNextId(): Promise<string>;
  private updateIndex(): Promise<void>;
}
```

### 1.3 Folder Layout

```
.specweave/discrepancies/
├── index.json                  # DiscrepancyIndex
├── pending/
│   ├── 0001-0100/
│   │   ├── DISC-0001.json
│   │   └── ...
│   └── 0101-0200/
├── in-progress/
│   └── DISC-0050.json         # Has incrementId
└── resolved/
    └── 2025-12/               # By month
        └── DISC-0042.json
```

---

## Phase 2: Init Flow Integration

### 2.1 Brownfield Analysis Prompt

**File**: `src/cli/helpers/init/brownfield-analysis.ts`

```typescript
export interface BrownfieldAnalysisConfig {
  enabled: boolean;
  jobId?: string;
  sourceDocsPath?: string;
  analysisDepth: 'quick' | 'standard' | 'deep';
}

export async function promptBrownfieldAnalysis(
  targetDir: string,
  language: SupportedLanguage
): Promise<BrownfieldAnalysisConfig> {
  const strings = getBrownfieldStrings(language);

  console.log('');
  console.log(chalk.cyan.bold(strings.header));
  console.log(chalk.gray('   ' + strings.subheader));
  console.log('');

  // Show explanation
  console.log(chalk.white(strings.explanation));
  console.log(chalk.gray('   • Detect undocumented code'));
  console.log(chalk.gray('   • Find stale documentation'));
  console.log(chalk.gray('   • Identify knowledge gaps'));
  console.log('');

  const wantsAnalysis = await confirm({
    message: strings.analyzeQuestion,
    default: true
  });

  if (!wantsAnalysis) {
    console.log(chalk.gray(`   ${strings.skipped}`));
    return { enabled: false, analysisDepth: 'quick' };
  }

  // Auto-detect existing docs
  const detectedDocs = detectExistingDocsLocations(targetDir);

  let sourceDocsPath: string | undefined;
  if (detectedDocs.length > 0) {
    console.log(chalk.gray(`   ${strings.detectedDocs}`));
    for (const doc of detectedDocs) {
      console.log(chalk.gray(`     • ${doc.path} (${doc.fileCount} files)`));
    }

    const useDetected = await confirm({
      message: strings.useDetectedDocs,
      default: true
    });

    if (useDetected) {
      sourceDocsPath = detectedDocs[0].path;
    } else {
      sourceDocsPath = await input({
        message: strings.customDocsPath,
        default: 'docs/'
      });
    }
  }

  // Analysis depth
  const depth = await select<'quick' | 'standard' | 'deep'>({
    message: strings.selectDepth,
    choices: [
      {
        name: strings.depthQuick,
        value: 'quick'
      },
      {
        name: strings.depthStandard,
        value: 'standard'
      },
      {
        name: strings.depthDeep,
        value: 'deep'
      }
    ],
    default: 'standard'
  });

  console.log('');
  console.log(chalk.green(`   ${strings.starting}`));
  console.log(chalk.gray(`   ${strings.monitorHint}`));
  console.log('');

  return {
    enabled: true,
    sourceDocsPath,
    analysisDepth: depth
  };
}
```

### 2.2 Init Command Integration

**Location**: End of `src/cli/commands/init.ts`, after testing config

```typescript
// After promptTestingConfig()...

// Brownfield analysis (last step)
const brownfieldConfig = await promptBrownfieldAnalysis(targetDir, language);

if (brownfieldConfig.enabled) {
  // Launch background job
  const job = await launchBrownfieldAnalysisJob({
    type: 'brownfield-analysis',
    projectPath: targetDir,
    sourceDocsPath: brownfieldConfig.sourceDocsPath,
    analysisDepth: brownfieldConfig.analysisDepth
  });

  // Save job reference to config
  await updateConfigWithBrownfield(targetDir, {
    lastAnalysisJobId: job.id,
    analysisDepth: brownfieldConfig.analysisDepth
  });
}
```

---

## Phase 3: Brownfield Analysis Background Job

### 3.1 Job Type Extension

**File**: `src/core/background/types.ts`

```typescript
export type JobType =
  | 'clone-repos'
  | 'import-issues'
  | 'sync-external'
  | 'brownfield-analysis';  // NEW

export interface BrownfieldAnalysisJobConfig {
  type: 'brownfield-analysis';
  projectPath: string;
  sourceDocsPath?: string;
  analysisDepth: 'quick' | 'standard' | 'deep';

  // Checkpoint for pause/resume
  checkpoint?: {
    phase: BrownfieldPhase;
    lastProcessedPath: string;
    processedCount: number;
  };
}

export type BrownfieldPhase =
  | 'discovery'           // Find all code/doc files
  | 'code-analysis'       // Extract signatures, APIs
  | 'doc-matching'        // Match code to docs
  | 'discrepancy-detect'  // Find gaps
  | 'reporting';          // Generate summary
```

### 3.2 Brownfield Analysis Worker

**File**: `src/cli/workers/brownfield-worker.ts`

```typescript
export class BrownfieldAnalysisWorker {
  private config: BrownfieldAnalysisJobConfig;
  private jobManager: BackgroundJobManager;
  private discrepancyManager: DiscrepancyManager;

  async run(): Promise<void> {
    const phases: BrownfieldPhase[] = [
      'discovery',
      'code-analysis',
      'doc-matching',
      'discrepancy-detect',
      'reporting'
    ];

    // Resume from checkpoint if exists
    const startPhase = this.config.checkpoint?.phase
      ? phases.indexOf(this.config.checkpoint.phase)
      : 0;

    for (let i = startPhase; i < phases.length; i++) {
      const phase = phases[i];
      this.updateProgress(phase, 0);

      switch (phase) {
        case 'discovery':
          await this.runDiscoveryPhase();
          break;
        case 'code-analysis':
          await this.runCodeAnalysisPhase();
          break;
        case 'doc-matching':
          await this.runDocMatchingPhase();
          break;
        case 'discrepancy-detect':
          await this.runDiscrepancyDetectionPhase();
          break;
        case 'reporting':
          await this.runReportingPhase();
          break;
      }

      // Save checkpoint after each phase
      this.saveCheckpoint(phase);
    }
  }

  private async runDiscoveryPhase(): Promise<void> {
    // Find all TypeScript/JavaScript files
    // Find all markdown/doc files
    // Build file inventory
  }

  private async runCodeAnalysisPhase(): Promise<void> {
    // Reuse analyzers from 0084 (discrepancy-detection)
    // Extract function signatures, APIs
    // Build module map
  }

  private async runDocMatchingPhase(): Promise<void> {
    // Match existing docs to code modules
    // Identify documented vs undocumented
  }

  private async runDiscrepancyDetectionPhase(): Promise<void> {
    // Detect missing-docs
    // Detect stale-docs
    // Detect knowledge-gaps
    // Create discrepancies via DiscrepancyManager
  }

  private async runReportingPhase(): Promise<void> {
    // Generate summary
    // Update index.json
    // Log completion stats
  }
}
```

---

## Phase 4: Discrepancy Commands

### 4.1 List Discrepancies Command

**File**: `plugins/specweave/commands/specweave-discrepancies.md`

```markdown
---
description: List and filter documentation discrepancies
---

# /specweave:discrepancies

Show documentation gaps and discrepancies detected by brownfield analysis.

## Usage

- `/specweave:discrepancies` - List all pending discrepancies
- `/specweave:discrepancies --module payment` - Filter by module
- `/specweave:discrepancies --type missing-docs` - Filter by type
- `/specweave:discrepancies --severity critical` - Filter by severity

## Output

Shows table with: ID, Type, Module, Severity, Summary, Age

## Actions

- View details: `/specweave:discrepancy DISC-0001`
- Create increment: `/specweave:discrepancy-to-increment DISC-0001 DISC-0002`
- Ignore: `/specweave:discrepancies --ignore DISC-0001 "False positive"`
```

### 4.2 Discrepancy to Increment Command

**File**: `plugins/specweave/commands/specweave-discrepancy-to-increment.md`

```markdown
---
description: Convert discrepancies into an actionable increment
---

# /specweave:discrepancy-to-increment

Convert one or more discrepancies into a new increment.

## Usage

/specweave:discrepancy-to-increment DISC-0001 DISC-0002 DISC-0003

## Process

1. Reads discrepancy details
2. Groups by module if multiple
3. Generates increment spec with:
   - Context from discrepancy evidence
   - Suggested user stories
   - Links to affected code/docs
4. Creates increment in planning status
5. Updates discrepancy status to in-progress
6. Links discrepancy to increment

## On Increment Completion

When the increment closes:
- All linked discrepancies marked resolved
- Resolution type: doc-updated (or as appropriate)
- Archived to resolved/YYYY-MM/
```

---

## Phase 5: Living Docs Integration

### 5.1 Module Documentation Score

After analysis, each module gets an "understanding score":

```markdown
## Module: payment-service

### Understanding Score: 62% [NEEDS WORK]

| Metric | Status |
|--------|--------|
| Code coverage | 85% |
| Doc coverage | 45% |
| Has WHY (ADRs) | Missing |
| Has WHAT (API docs) | Partial |
| Bus factor | 1 (only @alice) |
| Last doc update | 8 months ago |

### Discrepancies
- DISC-0042: Missing API documentation
- DISC-0043: Stale integration guide
- DISC-0044: No ADR for retry logic

### Recommended Actions
1. Document public API endpoints
2. Update integration guide
3. Create ADR for retry strategy
```

---

## Implementation Tasks Summary

| Phase | Tasks | Effort |
|-------|-------|--------|
| 1. Storage | Types, Manager, Folder structure | 4h |
| 2. Init Flow | Prompt, Integration, i18n | 3h |
| 3. Background Job | Worker, Phases, Checkpoint | 6h |
| 4. Commands | List, Details, Convert | 4h |
| 5. Integration | Score, Hooks | 3h |

**Total Estimate**: ~20h implementation

---

## Testing Strategy

### Unit Tests
- DiscrepancyManager CRUD operations
- Batch folder calculations
- Discrepancy type classification

### Integration Tests
- Init flow with brownfield prompt
- Background job lifecycle
- Discrepancy → Increment flow

### E2E Tests
- Full brownfield analysis on sample project
- Command execution and output
