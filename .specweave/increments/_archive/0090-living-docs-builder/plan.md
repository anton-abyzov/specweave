---
increment: 0090-living-docs-builder
title: "Living Docs Builder - Technical Architecture"
status: planned
phases:
  - phase-1-infrastructure
  - phase-2-discovery
  - phase-3-foundation
  - phase-4-integration
  - phase-5-deep-dive
  - phase-6-init-integration
---

# Living Docs Builder - Technical Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INIT COMMAND                                    │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────────────────┐│
│  │ Clone Repos    │    │ Import Issues  │    │ Living Docs Builder         ││
│  │ (background)   │    │ (background)   │    │ (WAITS for both)            ││
│  └───────┬────────┘    └───────┬────────┘    └─────────────┬───────────────┘│
│          │                     │                           │                 │
│          └─────────────────────┴───────────────────────────┘                 │
│                             dependsOn: [cloneJobId, importJobId]             │
└─────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LIVING DOCS BUILDER WORKER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │
│  │  WAITING    │ → │  DISCOVERY  │ → │ FOUNDATION  │ → │ INTEGRATION │      │
│  │ (deps check)│   │ (no LLM)    │   │ (LLM-lite)  │   │ (matching)  │      │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘      │
│                                                               │              │
│  ┌─────────────┐   ┌─────────────┐                           │              │
│  │ SUGGESTIONS │ ← │  DEEP DIVE  │ ←─────────────────────────┘              │
│  │ (gap report)│   │ (per-module)│                                          │
│  └─────────────┘   └──────┬──────┘                                          │
│                           │                                                  │
│                    CHECKPOINT after each module                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Infrastructure (Job System Extensions)

### 1.1 New Job Type

**File**: `src/core/background/types.ts`

```typescript
// Add to JobType union
export type JobType =
  | 'clone-repos'
  | 'import-issues'
  | 'sync-external'
  | 'brownfield-analysis'
  | 'living-docs-builder';  // NEW

// New phase type
export type LivingDocsPhase =
  | 'waiting'           // Waiting for dependencies
  | 'discovery'         // File tree scan (no LLM)
  | 'foundation'        // Generate overview docs
  | 'integration'       // Match work items to modules
  | 'deep-dive'         // Per-module analysis
  | 'suggestions';      // Gap analysis and reporting

// New config type
export interface LivingDocsJobConfig {
  type: 'living-docs-builder';
  projectPath: string;

  // Dependencies (job IDs to wait for)
  dependsOn?: string[];

  // User inputs (collected before job launch)
  userInputs: {
    additionalSources: string[];      // Paths to Notion, Confluence, MD
    priorityAreas: string[];          // "auth", "payments", "api"
    knownPainPoints: string[];        // Free-text descriptions
    analysisDepth: 'quick' | 'standard' | 'deep';
  };

  // Checkpoint for pause/resume
  checkpoint?: LivingDocsCheckpoint;
}

// Checkpoint structure
export interface LivingDocsCheckpoint {
  phase: LivingDocsPhase;
  phaseProgress: {
    discovery?: {
      dirsScanned: number;
      totalDirs: number;
      lastDir: string;
    };
    foundation?: {
      docsGenerated: string[];
      pendingDocs: string[];
    };
    integration?: {
      itemsProcessed: number;
      totalItems: number;
    };
    deepDive?: {
      modulesCompleted: string[];
      currentModule: string;
      modulesRemaining: string[];
      currentModuleProgress?: {
        filesAnalyzed: number;
        totalFiles: number;
      };
    };
  };
  intermediateOutputs: {
    discoveryReport?: string;
    codebaseMap?: string;
    moduleWorkitemMap?: string;
    priorityQueue?: string;
  };
  lastUpdated: string;
}

// Update JobConfig union
export type JobConfig =
  | CloneJobConfig
  | ImportJobConfig
  | SyncJobConfig
  | BrownfieldJobConfig
  | LivingDocsJobConfig;  // NEW
```

### 1.2 Job Dependency System

**File**: `src/core/background/job-dependency.ts` (NEW)

```typescript
import { JobManager } from './job-manager.js';
import { BackgroundJob } from './types.js';

export interface DependencyStatus {
  ready: boolean;
  waitingFor: string[];
  failedDeps: string[];
  completedDeps: string[];
}

export async function checkDependencies(
  projectPath: string,
  dependsOn: string[]
): Promise<DependencyStatus> {
  if (!dependsOn || dependsOn.length === 0) {
    return { ready: true, waitingFor: [], failedDeps: [], completedDeps: [] };
  }

  const jobManager = new JobManager(projectPath);
  const waitingFor: string[] = [];
  const failedDeps: string[] = [];
  const completedDeps: string[] = [];

  for (const depId of dependsOn) {
    const job = jobManager.getJob(depId);

    if (!job) {
      // Job doesn't exist (deleted?), treat as completed
      completedDeps.push(depId);
      continue;
    }

    switch (job.status) {
      case 'completed':
        completedDeps.push(depId);
        break;
      case 'failed':
        failedDeps.push(depId);
        break;
      default:
        waitingFor.push(depId);
    }
  }

  return {
    ready: waitingFor.length === 0,
    waitingFor,
    failedDeps,
    completedDeps
  };
}

export async function waitForDependencies(
  projectPath: string,
  jobId: string,
  dependsOn: string[],
  onProgress: (status: DependencyStatus) => void,
  pollIntervalMs: number = 10000
): Promise<DependencyStatus> {
  let status = await checkDependencies(projectPath, dependsOn);

  while (!status.ready) {
    onProgress(status);
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    status = await checkDependencies(projectPath, dependsOn);
  }

  return status;
}
```

### 1.3 Extended BackgroundJob Type

**File**: `src/core/background/types.ts` (update)

```typescript
export interface BackgroundJob {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: JobProgress;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  config: JobConfig;
  result?: Record<string, unknown>;

  // NEW: Dependency tracking
  dependsOn?: string[];
  dependencyStatus?: 'waiting' | 'ready' | 'partial';  // partial = some deps failed
}
```

---

## Phase 2: Discovery Module

### 2.1 File Discovery

**File**: `src/core/living-docs/discovery.ts` (NEW)

```typescript
export interface DiscoveryResult {
  codebaseStats: {
    totalFiles: number;
    totalDirs: number;
    byExtension: Record<string, number>;
    byType: {
      code: number;
      tests: number;
      docs: number;
      config: number;
      assets: number;
    };
    estimatedLOC: number;
  };

  techStack: {
    languages: string[];
    frameworks: string[];
    buildTools: string[];
    testFrameworks: string[];
    detectedFrom: string[];
  };

  existingDocs: {
    readme: string | null;
    contributing: string | null;
    docsFolder: string | null;
    wikiFolder: string | null;
    mdFiles: string[];
  };

  entryPoints: {
    main: string[];
    index: string[];
    exports: string[];
  };

  modules: ModuleInfo[];

  tier: 'small' | 'medium' | 'large' | 'massive';
  samplingConfig: SamplingConfig;
}

export interface ModuleInfo {
  name: string;
  path: string;
  fileCount: number;
  estimatedLOC: number;
  hasTests: boolean;
  hasReadme: boolean;
  entryPoints: string[];
}

export interface SamplingConfig {
  tier: 'small' | 'medium' | 'large' | 'massive';
  filesPerDir: number | 'all';
  priorityPatterns: string[];
  skipPatterns: string[];
}

export async function runDiscovery(
  projectPath: string,
  additionalSources: string[],
  onProgress: (current: number, total: number, currentDir: string) => void
): Promise<DiscoveryResult> {
  // Implementation...
}
```

### 2.2 Tier Calculation

```typescript
function calculateTier(totalFiles: number): SamplingConfig {
  if (totalFiles < 500) {
    return {
      tier: 'small',
      filesPerDir: 'all',
      priorityPatterns: ['**/index.*', '**/main.*', '**/*.config.*'],
      skipPatterns: ['node_modules/**', 'dist/**', '**/*.test.*']
    };
  } else if (totalFiles < 2000) {
    return {
      tier: 'medium',
      filesPerDir: 5,
      priorityPatterns: ['**/index.*', '**/main.*', '**/*.config.*', '**/types.*'],
      skipPatterns: ['node_modules/**', 'dist/**', 'build/**', '**/*.test.*', '**/*.spec.*']
    };
  } else if (totalFiles < 10000) {
    return {
      tier: 'large',
      filesPerDir: 3,
      priorityPatterns: ['**/index.*', '**/main.*', '**/*.config.*', '**/types.*'],
      skipPatterns: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '**/*.test.*', '**/*.spec.*', '**/__tests__/**']
    };
  } else {
    return {
      tier: 'massive',
      filesPerDir: 1,
      priorityPatterns: ['**/index.*', '**/main.*', '**/app.*', '**/*.config.*'],
      skipPatterns: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/*.min.*', '**/*.bundle.*']
    };
  }
}
```

---

## Phase 3: Foundation Builder

### 3.1 Foundation Docs Generator

**File**: `src/core/living-docs/foundation-builder.ts` (NEW)

```typescript
export interface FoundationDocs {
  overview: string;          // Project summary, main components
  techStack: string;         // Technologies, versions, tools
  modulesSkeleton: string;   // Module list with brief descriptions
}

export async function buildFoundation(
  projectPath: string,
  discovery: DiscoveryResult,
  onProgress: (docName: string, status: 'generating' | 'complete') => void
): Promise<FoundationDocs> {
  // 1. Read key files (limited set)
  const keyFiles = await readKeyFiles(projectPath, discovery);

  // 2. Generate overview.md (LLM call)
  onProgress('overview.md', 'generating');
  const overview = await generateOverview(keyFiles, discovery);
  onProgress('overview.md', 'complete');

  // 3. Generate tech-stack.md (mostly from discovery, minimal LLM)
  onProgress('tech-stack.md', 'generating');
  const techStack = await generateTechStack(discovery);
  onProgress('tech-stack.md', 'complete');

  // 4. Generate modules-skeleton.md (from discovery + brief LLM descriptions)
  onProgress('modules-skeleton.md', 'generating');
  const modulesSkeleton = await generateModulesSkeleton(discovery);
  onProgress('modules-skeleton.md', 'complete');

  return { overview, techStack, modulesSkeleton };
}

async function readKeyFiles(
  projectPath: string,
  discovery: DiscoveryResult
): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  // Priority: README, package.json/requirements.txt, main entry points
  const priorities = [
    discovery.existingDocs.readme,
    ...discovery.entryPoints.main.slice(0, 3),
    ...discovery.entryPoints.index.slice(0, 3)
  ].filter(Boolean);

  // Add 1-2 samples per top-level module
  for (const mod of discovery.modules.slice(0, 10)) {
    if (mod.entryPoints[0]) {
      priorities.push(mod.entryPoints[0]);
    }
  }

  for (const filePath of priorities) {
    if (filePath) {
      const content = await fs.readFile(path.join(projectPath, filePath), 'utf-8');
      files.set(filePath, content);
    }
  }

  return files;
}
```

---

## Phase 4: Work Item Integration

### 4.1 Work Item Matcher

**File**: `src/core/living-docs/workitem-matcher.ts` (NEW)

```typescript
export interface ModuleWorkItemMap {
  [modulePath: string]: {
    module: ModuleInfo;
    workItems: WorkItemReference[];
    matchScore: number;
  };
}

export interface WorkItemReference {
  id: string;
  title: string;
  type: 'feature' | 'bug' | 'task';
  status: string;
  matchReason: string;  // Why matched to this module
}

export interface PriorityQueue {
  modules: Array<{
    path: string;
    name: string;
    workItemCount: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
}

export async function matchWorkItemsToModules(
  projectPath: string,
  discovery: DiscoveryResult
): Promise<{ map: ModuleWorkItemMap; queue: PriorityQueue }> {
  // 1. Load imported work items from .specweave/docs/internal/specs/
  const workItems = await loadImportedWorkItems(projectPath);

  // 2. Match each work item to modules using keyword/path matching
  const map: ModuleWorkItemMap = {};

  for (const module of discovery.modules) {
    const matches = workItems.filter(item =>
      matchesModule(item, module)
    );

    if (matches.length > 0 || true) {  // Include all modules
      map[module.path] = {
        module,
        workItems: matches.map(item => ({
          id: item.id,
          title: item.title,
          type: item.type,
          status: item.status,
          matchReason: getMatchReason(item, module)
        })),
        matchScore: matches.length
      };
    }
  }

  // 3. Build priority queue (sorted by work item count)
  const queue: PriorityQueue = {
    modules: Object.entries(map)
      .sort((a, b) => b[1].matchScore - a[1].matchScore)
      .map(([path, data]) => ({
        path,
        name: data.module.name,
        workItemCount: data.matchScore,
        priority: getPriority(data.matchScore)
      }))
  };

  return { map, queue };
}

function matchesModule(item: WorkItem, module: ModuleInfo): boolean {
  const itemText = `${item.title} ${item.description}`.toLowerCase();
  const moduleKeywords = [
    module.name.toLowerCase(),
    ...module.path.split('/').map(p => p.toLowerCase())
  ];

  return moduleKeywords.some(kw => itemText.includes(kw));
}

function getPriority(workItemCount: number): 'critical' | 'high' | 'medium' | 'low' {
  if (workItemCount >= 20) return 'critical';
  if (workItemCount >= 10) return 'high';
  if (workItemCount >= 5) return 'medium';
  return 'low';
}
```

---

## Phase 5: Deep Dive Analyzer

### 5.1 Module Analyzer

**File**: `src/core/living-docs/module-analyzer.ts` (NEW)

```typescript
export interface ModuleAnalysis {
  name: string;
  path: string;
  summary: string;
  exports: ExportInfo[];
  dependencies: string[];
  apis: APIInfo[];
  relatedWorkItems: WorkItemReference[];
  docStatus: 'complete' | 'partial' | 'skeleton';
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const';
  signature: string;
  hasJSDoc: boolean;
  lineNumber: number;
}

export async function analyzeModule(
  projectPath: string,
  module: ModuleInfo,
  samplingConfig: SamplingConfig,
  workItems: WorkItemReference[],
  onProgress: (filesAnalyzed: number, totalFiles: number) => void
): Promise<ModuleAnalysis> {
  // 1. Select files to analyze (based on sampling config)
  const files = await selectFilesForAnalysis(
    path.join(projectPath, module.path),
    samplingConfig
  );

  // 2. Extract exports and signatures from each file
  const exports: ExportInfo[] = [];
  let filesAnalyzed = 0;

  for (const file of files) {
    const fileExports = await extractExports(file);
    exports.push(...fileExports);
    filesAnalyzed++;
    onProgress(filesAnalyzed, files.length);
  }

  // 3. Extract dependencies
  const dependencies = await extractDependencies(files);

  // 4. Identify APIs (exported functions with HTTP patterns)
  const apis = await identifyAPIs(exports);

  // 5. Generate summary (LLM call with limited context)
  const summary = await generateModuleSummary(
    module.name,
    exports.slice(0, 20),  // Top 20 exports
    dependencies,
    apis
  );

  return {
    name: module.name,
    path: module.path,
    summary,
    exports,
    dependencies,
    apis,
    relatedWorkItems: workItems,
    docStatus: determineDocStatus(module, exports)
  };
}
```

### 5.2 Checkpoint Manager

```typescript
export async function saveCheckpoint(
  projectPath: string,
  jobId: string,
  checkpoint: LivingDocsCheckpoint
): Promise<void> {
  const checkpointDir = path.join(
    projectPath,
    '.specweave/state/jobs',
    jobId,
    'checkpoints'
  );

  await fs.mkdir(checkpointDir, { recursive: true });

  // Save phase-specific checkpoint
  const filename = `phase-${checkpoint.phase}.json`;
  await fs.writeFile(
    path.join(checkpointDir, filename),
    JSON.stringify(checkpoint, null, 2)
  );

  // Also update main config.json checkpoint
  const configPath = path.join(
    projectPath,
    '.specweave/state/jobs',
    jobId,
    'config.json'
  );
  const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
  config.checkpoint = checkpoint;
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function loadCheckpoint(
  projectPath: string,
  jobId: string
): Promise<LivingDocsCheckpoint | null> {
  const configPath = path.join(
    projectPath,
    '.specweave/state/jobs',
    jobId,
    'config.json'
  );

  try {
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    return config.checkpoint || null;
  } catch {
    return null;
  }
}
```

---

## Phase 6: Suggestions Generator

### 6.1 Gap Analysis

**File**: `src/core/living-docs/suggestions-generator.ts` (NEW)

```typescript
export interface SuggestionsReport {
  summary: {
    modulesTotal: number;
    modulesDocumented: number;
    modulesPartial: number;
    modulesUndocumented: number;
    analysisDuration: string;
    codebaseSize: string;
  };

  priorityZones: Array<{
    module: string;
    workItemCount: number;
    status: 'complete' | 'partial' | 'none';
    suggestedAction: string;
  }>;

  immediateActions: Array<{
    title: string;
    module: string;
    description: string;
    keyFiles: string[];
  }>;

  additionalSourcesProcessed: Array<{
    path: string;
    status: 'merged' | 'stale' | 'failed';
    fileCount: number;
  }>;

  notAnalyzed: Array<{
    directory: string;
    reason: string;
    filesSkipped: number;
  }>;
}

export async function generateSuggestions(
  projectPath: string,
  discovery: DiscoveryResult,
  moduleAnalyses: ModuleAnalysis[],
  priorityQueue: PriorityQueue,
  userInputs: LivingDocsUserInputs
): Promise<SuggestionsReport> {
  // Generate comprehensive suggestions report
  // ...
}

export async function writeSuggestionsMarkdown(
  projectPath: string,
  report: SuggestionsReport
): Promise<string> {
  const content = formatSuggestionsMarkdown(report);
  const outputPath = path.join(
    projectPath,
    '.specweave/docs/SUGGESTIONS.md'
  );
  await fs.writeFile(outputPath, content);
  return outputPath;
}
```

---

## Worker Implementation

**File**: `src/cli/workers/living-docs-worker.ts` (NEW)

```typescript
import { JobManager } from '../../core/background/job-manager.js';
import { waitForDependencies } from '../../core/background/job-dependency.js';
import { runDiscovery } from '../../core/living-docs/discovery.js';
import { buildFoundation } from '../../core/living-docs/foundation-builder.js';
import { matchWorkItemsToModules } from '../../core/living-docs/workitem-matcher.js';
import { analyzeModule } from '../../core/living-docs/module-analyzer.js';
import { generateSuggestions, writeSuggestionsMarkdown } from '../../core/living-docs/suggestions-generator.js';
import { saveCheckpoint, loadCheckpoint } from '../../core/living-docs/checkpoint-manager.js';
import type { LivingDocsJobConfig, LivingDocsPhase } from '../../core/background/types.js';

const phases: LivingDocsPhase[] = [
  'waiting',
  'discovery',
  'foundation',
  'integration',
  'deep-dive',
  'suggestions'
];

async function main() {
  const [jobId, projectPath] = process.argv.slice(2);
  const jobManager = new JobManager(projectPath);
  const config = await loadConfig(projectPath, jobId) as LivingDocsJobConfig;

  // Load checkpoint if resuming
  let checkpoint = await loadCheckpoint(projectPath, jobId);
  let startPhaseIndex = checkpoint ? phases.indexOf(checkpoint.phase) : 0;

  for (let i = startPhaseIndex; i < phases.length; i++) {
    const phase = phases[i];
    log(`\n${'═'.repeat(60)}`);
    log(`PHASE ${i + 1}: ${phase.toUpperCase()}`);
    log(`${'═'.repeat(60)}\n`);

    switch (phase) {
      case 'waiting':
        await runWaitingPhase(projectPath, jobId, config, jobManager);
        break;
      case 'discovery':
        await runDiscoveryPhase(projectPath, jobId, config, jobManager);
        break;
      case 'foundation':
        await runFoundationPhase(projectPath, jobId, config, jobManager);
        break;
      case 'integration':
        await runIntegrationPhase(projectPath, jobId, config, jobManager);
        break;
      case 'deep-dive':
        await runDeepDivePhase(projectPath, jobId, config, jobManager, checkpoint);
        break;
      case 'suggestions':
        await runSuggestionsPhase(projectPath, jobId, config, jobManager);
        break;
    }

    // Save checkpoint after each phase
    checkpoint = { phase, /* ... */ };
    await saveCheckpoint(projectPath, jobId, checkpoint);
  }

  // Mark job complete
  jobManager.completeJob(jobId);
  log('\n✅ LIVING DOCS BUILDER COMPLETE');
}

main().catch(error => {
  console.error('Worker error:', error);
  process.exit(1);
});
```

---

## Init Integration

**File**: `src/cli/helpers/init/living-docs-preflight.ts` (NEW)

```typescript
import { confirm, text, select } from '@inquirer/prompts';
import chalk from 'chalk';

export interface LivingDocsUserInputs {
  additionalSources: string[];
  priorityAreas: string[];
  knownPainPoints: string[];
  analysisDepth: 'quick' | 'standard' | 'deep';
}

export async function collectLivingDocsInputs(
  projectPath: string,
  isCI: boolean
): Promise<LivingDocsUserInputs | null> {
  if (isCI) {
    return {
      additionalSources: [],
      priorityAreas: [],
      knownPainPoints: [],
      analysisDepth: 'quick'
    };
  }

  console.log(chalk.cyan.bold('\n📚 Living Docs Builder Setup'));
  console.log(chalk.gray('   Analyze codebase + imported work items → generate documentation\n'));

  const wantsDocs = await confirm({
    message: 'Generate living documentation from codebase analysis?',
    default: true
  });

  if (!wantsDocs) return null;

  // Collect inputs...
  // (detailed prompts as designed earlier)

  return inputs;
}
```

**File**: `src/cli/commands/init.ts` (update)

```typescript
// At end of init, after import job launch:

import { collectLivingDocsInputs } from '../helpers/init/living-docs-preflight.js';
import { launchLivingDocsJob } from '../../core/background/job-launcher.js';

// ... existing init code ...

// NEW: Living Docs Builder
if (!continueExisting && !isEmptyProject) {
  const livingDocsInputs = await collectLivingDocsInputs(targetDir, isCI);

  if (livingDocsInputs) {
    const dependsOn = [cloneResult?.jobId, importResult?.jobId].filter(Boolean);

    const result = await launchLivingDocsJob({
      projectPath: targetDir,
      userInputs: livingDocsInputs,
      dependsOn
    });

    console.log(chalk.cyan('\n📚 Living Docs Builder scheduled'));
    console.log(chalk.gray(`   Job ID: ${result.jobId}`));
    if (dependsOn.length > 0) {
      console.log(chalk.gray(`   Waiting for: ${dependsOn.length} job(s) to complete`));
    }
    const duration = livingDocsInputs.analysisDepth === 'deep' ? '24+ hours' :
                     livingDocsInputs.analysisDepth === 'standard' ? '4-8 hours' : '~1 hour';
    console.log(chalk.gray(`   Estimated: ${duration}`));
    console.log(chalk.gray(`   Monitor: /specweave:jobs`));
  }
}
```

---

## File Structure

```
NEW FILES:
──────────────────────────────────────────────────────────────
src/core/background/job-dependency.ts         # Dependency system
src/core/living-docs/discovery.ts             # Phase 1: File scanning
src/core/living-docs/foundation-builder.ts    # Phase 2: Key file analysis
src/core/living-docs/workitem-matcher.ts      # Phase 3: Match work items
src/core/living-docs/module-analyzer.ts       # Phase 4: Deep analysis
src/core/living-docs/checkpoint-manager.ts    # Checkpoint save/load
src/core/living-docs/suggestions-generator.ts # Phase 5: Gap analysis
src/cli/workers/living-docs-worker.ts         # Main worker process
src/cli/helpers/init/living-docs-preflight.ts # User input collection

MODIFY:
──────────────────────────────────────────────────────────────
src/core/background/types.ts                  # Add LivingDocsJobConfig
src/core/background/job-launcher.ts           # Add launchLivingDocsJob()
src/core/background/job-manager.ts            # Add dependency handling
src/cli/commands/init.ts                      # Trigger after imports
src/cli/commands/jobs.ts                      # Display living-docs job

OUTPUT STRUCTURE:
──────────────────────────────────────────────────────────────
.specweave/state/jobs/{jobId}/
├── config.json                # Job config with checkpoint
├── worker.pid                 # Process ID
├── worker.log                 # Human-readable log
├── progress.json              # Machine-readable progress
├── checkpoints/
│   ├── phase-discovery.json
│   ├── phase-foundation.json
│   ├── phase-deep-dive-auth.json
│   └── ...
└── outputs/
    ├── discovery-report.json
    ├── codebase-map.json
    ├── module-workitem-map.json
    ├── priority-queue.json
    └── module-summaries/
        ├── auth.json
        ├── payments.json
        └── ...

.specweave/docs/
├── SUGGESTIONS.md             # Final suggestions report
└── internal/
    ├── architecture/
    │   ├── overview.md        # Foundation doc
    │   ├── tech-stack.md      # Foundation doc
    │   └── modules-skeleton.md
    └── strategy/
        └── modules/
            ├── auth.md        # Deep dive output
            ├── payments.md
            └── ...
```

---

## Testing Strategy

| Component | Test Type | Priority |
|-----------|-----------|----------|
| Job dependency system | Unit | P1 |
| Discovery phase | Integration | P1 |
| Sampling config | Unit | P1 |
| Foundation builder | Integration | P2 |
| Checkpoint save/load | Unit | P1 |
| Work item matching | Unit | P2 |
| Module analyzer | Integration | P2 |
| Suggestions generator | Unit | P2 |
| Init integration | E2E | P1 |
| Worker lifecycle | E2E | P1 |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LLM costs | Smart sampling, limit calls per module, cache results |
| Context overflow | Chunk files, summarize progressively |
| Long runtime | Foundation first, checkpoints, progress visibility |
| Dependency failures | Graceful degradation, proceed with available data |
| Memory issues | Stream file reading, process one module at a time |
