---
increment: 0090-living-docs-builder
status: planned
total_tasks: 8
estimated_effort: 3-4 weeks
phases:
  - infrastructure
  - discovery
  - foundation
  - integration
---

# Tasks: Living Docs Builder

## Phase 1: Infrastructure

### T-001: Extend Background Job Types for Living Docs Builder

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed (2025-12-02)
**Model**: 🧠 Sonnet

**Description**:
Add new job type `living-docs-builder` and job dependency system to the background job infrastructure.

**Implementation Steps**:
1. Update `src/core/background/types.ts`:
   - Add `'living-docs-builder'` to `JobType` union
   - Add `LivingDocsPhase` type (waiting, discovery, foundation, integration, deep-dive, suggestions)
   - Add `LivingDocsJobConfig` interface with `dependsOn`, `userInputs`, `checkpoint`
   - Add `LivingDocsCheckpoint` interface for pause/resume
   - Add `dependsOn?: string[]` and `dependencyStatus` to `BackgroundJob`

2. Create `src/core/background/job-dependency.ts`:
   - `checkDependencies(projectPath, dependsOn)` → `DependencyStatus`
   - `waitForDependencies(projectPath, jobId, dependsOn, onProgress)` with polling

3. Update `src/core/background/job-manager.ts`:
   - Add dependency status tracking in job state
   - Add `getJob(jobId)` if not exists

**Files to Create/Modify**:
- `src/core/background/types.ts` (modify)
- `src/core/background/job-dependency.ts` (create)
- `src/core/background/job-manager.ts` (modify)

**Test Plan**:
```gherkin
Feature: Job Dependency System
  Scenario: Job waits for dependencies
    Given a living-docs job with dependsOn: ["job-123"]
    When job-123 is still running
    Then living-docs job status should be "waiting for dependencies"

  Scenario: Dependencies completed
    Given a living-docs job with dependsOn: ["job-123"]
    When job-123 status is "completed"
    Then living-docs job should proceed to discovery phase

  Scenario: Dependency failed gracefully
    Given a living-docs job with dependsOn: ["job-123", "job-456"]
    When job-123 fails and job-456 completes
    Then living-docs job should proceed with partial data
    And failedDeps should contain "job-123"
```

---

### T-002: Create Job Launcher for Living Docs Builder

**User Story**: US-002, US-010
**Satisfies ACs**: AC-US2-03, AC-US2-06, AC-US10-03, AC-US10-04
**Status**: [x] completed (2025-12-02)
**Model**: 🧠 Sonnet

**Description**:
Add `launchLivingDocsJob()` function and update jobs display to show living-docs jobs.

**Implementation Steps**:
1. Update `src/core/background/job-launcher.ts`:
   - Add `launchLivingDocsJob(config: LaunchLivingDocsOptions)` function
   - Handle `dependsOn` array in job config
   - Create job directory and write config.json
   - Spawn worker process for `living-docs-worker.ts`

2. Update `src/cli/commands/jobs.ts`:
   - Add display support for `living-docs-builder` job type
   - Show dependency status (waiting for X jobs)
   - Show current phase and phase progress
   - Format duration estimates based on analysisDepth

**Files to Create/Modify**:
- `src/core/background/job-launcher.ts` (modify)
- `src/cli/commands/jobs.ts` (modify)

**Test Plan**:
```gherkin
Feature: Living Docs Job Launcher
  Scenario: Launch job with dependencies
    Given clone job "clone-123" is running
    And import job "import-456" is running
    When launchLivingDocsJob is called with dependsOn: ["clone-123", "import-456"]
    Then job should be created with status "pending"
    And job.dependsOn should contain both job IDs
    And jobs display should show "Waiting for 2 jobs"

  Scenario: Display living-docs job progress
    Given a living-docs job in "discovery" phase at 50%
    When running "specweave jobs"
    Then output should show "living-docs-builder" type
    And output should show "Phase: discovery (50%)"
```

---

## Phase 2: Discovery

### T-003: Implement Discovery Phase (File Scanning)

**User Story**: US-003, US-004
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05, AC-US3-06, AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed (2025-12-02)
**Model**: 🧠 Sonnet

**Description**:
Create discovery module that scans codebase structure without LLM calls.

**Implementation Steps**:
1. Create `src/core/living-docs/discovery.ts`:
   - `runDiscovery(projectPath, additionalSources, onProgress)` → `DiscoveryResult`
   - File scanning with skip patterns (node_modules, dist, etc.)
   - Count files by extension and type (code, tests, docs, config, assets)
   - Detect tech stack from config files (package.json, requirements.txt, go.mod, etc.)
   - Find existing docs (README, docs/, wiki/)
   - Identify entry points (main.*, index.*, app.*)
   - Group files into modules by directory structure

2. Implement tier calculation:
   - `calculateTier(totalFiles)` → `SamplingConfig`
   - small (<500): read all
   - medium (500-2000): 5 per dir
   - large (2000-10000): 3 per dir
   - massive (>10000): 1 per dir

3. Add representative file selection:
   - `selectRepresentative(files)` using heuristics (size, imports, name match)

**Files to Create**:
- `src/core/living-docs/discovery.ts`

**Test Plan**:
```gherkin
Feature: Codebase Discovery
  Scenario: Detect tech stack from package.json
    Given a project with package.json containing "next" and "typescript"
    When runDiscovery is executed
    Then techStack.languages should contain "typescript"
    And techStack.frameworks should contain "nextjs"

  Scenario: Calculate correct tier for large codebase
    Given a project with 5000 code files
    When runDiscovery is executed
    Then tier should be "large"
    And samplingConfig.filesPerDir should be 3

  Scenario: Skip test and build directories
    Given a project with 100 files in src/ and 500 in node_modules/
    When runDiscovery is executed
    Then totalFiles should not include node_modules
    And codebaseStats.totalFiles should be approximately 100

  Scenario: Identify modules from directory structure
    Given a project with src/auth/, src/payments/, src/api/
    When runDiscovery is executed
    Then modules should contain "auth", "payments", "api"
    And each module should have fileCount and entryPoints
```

---

### T-004: Implement Foundation Builder Phase

**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05, AC-US5-06
**Status**: [x] completed (2025-12-02)
**Model**: 🧠 Sonnet

**Description**:
Create foundation docs generator that produces high-level documentation quickly.

**Implementation Steps**:
1. Create `src/core/living-docs/foundation-builder.ts`:
   - `buildFoundation(projectPath, discovery, onProgress)` → `FoundationDocs`
   - `readKeyFiles(projectPath, discovery)` - limited set of priority files
   - `generateOverview(keyFiles, discovery)` - LLM call for project summary
   - `generateTechStack(discovery)` - mostly from discovery data, minimal LLM
   - `generateModulesSkeleton(discovery)` - brief descriptions per module

2. Implement key file selection:
   - README, main config files
   - Top 3 entry points
   - 1-2 samples per top-level module (up to 10 modules)
   - Total: ~30-50 files maximum

3. Output markdown files:
   - `.specweave/docs/internal/architecture/overview.md`
   - `.specweave/docs/internal/architecture/tech-stack.md`
   - `.specweave/docs/internal/architecture/modules-skeleton.md`

**Files to Create**:
- `src/core/living-docs/foundation-builder.ts`

**Test Plan**:
```gherkin
Feature: Foundation Docs Builder
  Scenario: Generate overview from key files
    Given a discovery result with 5 modules
    And README.md and package.json exist
    When buildFoundation is executed
    Then overview.md should exist
    And it should contain project name and description
    And it should list main modules

  Scenario: Limit key files read
    Given a project with 1000 files
    When readKeyFiles is called
    Then files read should be less than 50
    And README should be included
    And at least one file per top-level module

  Scenario: Complete within time limit
    Given a large project (5000 files)
    When buildFoundation is executed
    Then it should complete within 2 hours
    And all three foundation docs should exist
```

---

## Phase 3: Integration

### T-005: Implement Work Item Matcher

**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05, AC-US6-06
**Status**: [x] completed (2025-12-02)
**Model**: 🧠 Sonnet

**Description**:
Create module that matches imported work items to discovered modules.

**Implementation Steps**:
1. Create `src/core/living-docs/workitem-matcher.ts`:
   - `loadImportedWorkItems(projectPath)` - scan `.specweave/docs/internal/specs/`
   - `matchWorkItemsToModules(projectPath, discovery)` → `{ map, queue }`
   - `matchesModule(item, module)` - keyword/path matching
   - `getMatchReason(item, module)` - explain why matched
   - `getPriority(workItemCount)` - critical/high/medium/low

2. Implement matching logic:
   - Extract keywords from work item title + description
   - Match against module name and path segments
   - Score based on match quality and count

3. Output files:
   - `module-workitem-map.json` - full mapping
   - `priority-queue.json` - sorted by work item count

**Files to Create**:
- `src/core/living-docs/workitem-matcher.ts`

**Test Plan**:
```gherkin
Feature: Work Item Matching
  Scenario: Match work item to module by keyword
    Given a work item titled "Fix authentication bug in login flow"
    And a module named "auth" at path "src/auth/"
    When matchWorkItemsToModules is called
    Then module "auth" should have the work item in its list
    And matchReason should mention "keyword match: auth"

  Scenario: Priority queue ordering
    Given modules with work item counts: auth=15, payments=5, api=25
    When priorityQueue is generated
    Then first module should be "api" (25 items)
    And priority should be "critical"
    And second should be "auth" (15 items)

  Scenario: Handle modules with no work items
    Given a module "utils" with no matching work items
    When matchWorkItemsToModules is called
    Then "utils" should still be in the map
    And workItems array should be empty
    And priority should be "low"
```

---

### T-006: Implement Checkpoint Manager and Deep Dive Skeleton

**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04
**Status**: [x] completed (2025-12-02)
**Model**: 🧠 Sonnet

**Description**:
Create checkpoint system for pause/resume and skeleton for per-module deep analysis.

**Implementation Steps**:
1. Create `src/core/living-docs/checkpoint-manager.ts`:
   - `saveCheckpoint(projectPath, jobId, checkpoint)` - save to checkpoints/
   - `loadCheckpoint(projectPath, jobId)` - load from config.json
   - Update config.json with latest checkpoint
   - Phase-specific checkpoint files

2. Create `src/core/living-docs/module-analyzer.ts` (skeleton):
   - `analyzeModule(projectPath, module, samplingConfig, workItems, onProgress)`
   - File selection based on sampling config
   - Export extraction using regex patterns
   - Dependency extraction from imports
   - Summary generation placeholder

3. Implement checkpoint after each module:
   - Save modulesCompleted, currentModule, modulesRemaining
   - On resume: skip already-completed modules

**Files to Create**:
- `src/core/living-docs/checkpoint-manager.ts`
- `src/core/living-docs/module-analyzer.ts`

**Test Plan**:
```gherkin
Feature: Checkpoint System
  Scenario: Save checkpoint after module completion
    Given deep-dive phase is processing module "auth"
    When "auth" analysis completes
    Then checkpoint should be saved
    And modulesCompleted should contain "auth"
    And currentModule should be next in queue

  Scenario: Resume from checkpoint
    Given a paused job with checkpoint showing "auth" completed
    When job is resumed
    Then "auth" should be skipped
    And processing should start from next module

  Scenario: Checkpoint survives process restart
    Given a checkpoint saved to disk
    When worker process is killed and restarted
    Then loadCheckpoint should return saved state
    And phase should match saved phase
```

---

### T-007: Implement Suggestions Generator

**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04, AC-US8-05, AC-US8-06
**Status**: [x] completed (2025-12-02)
**Model**: 🧠 Sonnet

**Description**:
Create suggestions generator that produces actionable gap analysis.

**Implementation Steps**:
1. Create `src/core/living-docs/suggestions-generator.ts`:
   - `generateSuggestions(projectPath, discovery, analyses, queue, inputs)` → `SuggestionsReport`
   - Analyze doc status per module (complete/partial/none)
   - Identify priority zones from work item density
   - Generate immediate actions with file paths
   - Note sampled vs fully analyzed directories
   - Create discrepancy records for gaps

2. Format SUGGESTIONS.md:
   - Summary statistics
   - Priority zones table
   - Immediate actions with specific files
   - Additional sources processed
   - What was not analyzed

3. Output: `.specweave/docs/SUGGESTIONS.md`

**Files to Create**:
- `src/core/living-docs/suggestions-generator.ts`

**Test Plan**:
```gherkin
Feature: Suggestions Generator
  Scenario: Generate summary statistics
    Given 10 modules analyzed: 3 complete, 4 partial, 3 none
    When generateSuggestions is called
    Then summary.modulesDocumented should be 3
    And summary.modulesPartial should be 4
    And summary.modulesUndocumented should be 3

  Scenario: Identify priority zones
    Given module "payments" has 30 work items and no docs
    When generateSuggestions is called
    Then priorityZones should have "payments" first
    And suggestedAction should mention "START HERE"

  Scenario: Note sampled directories
    Given tier is "large" and components/ was sampled (3 of 100 files)
    When generateSuggestions is called
    Then notAnalyzed should mention "components/"
    And filesSkipped should be 97
```

---

### T-008: Create Worker and Init Integration

**User Story**: US-009, US-010
**Satisfies ACs**: AC-US9-01 through AC-US9-06, AC-US10-01 through AC-US10-06
**Status**: [x] completed (2025-12-02)
**Model**: 🧠 Sonnet

**Description**:
Create main worker process and integrate with init command.

**Implementation Steps**:
1. Create `src/cli/workers/living-docs-worker.ts`:
   - Main entry point with phase loop
   - Import all phase modules
   - Handle checkpoint resume
   - Structured logging to worker.log and progress.json
   - Error handling and graceful failure

2. Create `src/cli/helpers/init/living-docs-preflight.ts`:
   - `collectLivingDocsInputs(projectPath, isCI)` → `LivingDocsUserInputs | null`
   - Prompts for additional sources, priority areas, pain points, depth
   - CI mode defaults (no prompts)

3. Update `src/cli/commands/init.ts`:
   - Detect brownfield (not empty project)
   - Call `collectLivingDocsInputs()`
   - Launch job with dependencies on clone/import jobs
   - Display job ID and estimated duration
   - Handle `--no-living-docs` flag

**Files to Create/Modify**:
- `src/cli/workers/living-docs-worker.ts` (create)
- `src/cli/helpers/init/living-docs-preflight.ts` (create)
- `src/cli/commands/init.ts` (modify)

**Test Plan**:
```gherkin
Feature: Living Docs Worker
  Scenario: Worker completes all phases
    Given a new living-docs job with no dependencies
    When worker runs to completion
    Then all phases should execute in order
    And SUGGESTIONS.md should exist
    And job status should be "completed"

  Scenario: Worker resumes from checkpoint
    Given a job paused at "deep-dive" phase
    When worker is relaunched
    Then phases before deep-dive should be skipped
    And deep-dive should resume from checkpoint.currentModule

Feature: Init Integration
  Scenario: Living docs scheduled after init
    Given a brownfield project with existing code
    When specweave init completes
    Then living-docs job should be scheduled
    And dependsOn should include clone and import job IDs
    And estimated duration should be shown

  Scenario: Skip with --no-living-docs flag
    Given specweave init --no-living-docs
    When init completes
    Then no living-docs job should be created

  Scenario: CI mode uses defaults
    Given CI environment variable is set
    When init runs
    Then no interactive prompts for living-docs inputs
    And analysisDepth should default to "quick"
```

---

## Summary

| Task | Phase | Priority | Complexity |
|------|-------|----------|------------|
| T-001 | Infrastructure | P1 | Medium |
| T-002 | Infrastructure | P1 | Medium |
| T-003 | Discovery | P1 | Large |
| T-004 | Foundation | P1 | Large |
| T-005 | Integration | P2 | Medium |
| T-006 | Deep Dive | P2 | Medium |
| T-007 | Suggestions | P2 | Medium |
| T-008 | Integration | P1 | Large |

**Total**: 8 tasks (within limit)
**Estimated effort**: 3-4 weeks
