## Implementation Summary (Auto-Generated)

*Generated from codebase scan on 2026-01-20T04:37:29.911Z*
*Increment: 0170-parallel-auto-mode*

### Modified Files

#### `src/core/auto/`

- `config.ts` (301 lines) - exports: ConfigLoadResult, loadAutoConfig, saveAutoConfig, isAutoEnabled, getEffectiveMode; functions: loadAutoConfig, clampWithWarning, mergeConfig, saveAutoConfig, isAutoEnabled...
- `default-conditions.ts` (234 lines) - exports: MANDATORY_CONDITIONS, getDefaultConditions, mergeConditions, validateUserConditions, describeConditions; functions: getDefaultConditions, mergeConditions, validateUserConditions, describeConditions
- `e2e-coverage.ts` (17 lines)
- `increment-planner.ts` (239 lines) - exports: IncrementPlan, PlanningResult, planIncrements; functions: planIncrements, topologicalSort, visit, createIncrement, generateIncrementName...
- `index.ts` (117 lines)
- `logger.ts` (449 lines) - exports: AutoLogger; classes: AutoLogger; functions: formatDuration
- `plan-approval.ts` (438 lines) - exports: ApprovalConfig, ApprovalResult, PlanDisplayOptions, formatPlanDisplay, logApprovedPlan...; functions: formatPlanDisplay, logApprovedPlan, generateApprovalPrompt, validatePlan, detectCycle...
- `project-detector.ts` (394 lines) - exports: ProjectType, Indicator, ProjectDetection, detectProjectType, getProjectTypeDescription; functions: detectProjectType, checkIndicator, checkConfigIndicator, detectFrameworks, detectTestFrameworks...
- `prompt-chunker.ts` (261 lines) - exports: Feature, PromptAnalysis, extractFeatures, analyzePrompt; functions: extractFeatures, isGenericTerm, splitByFeatureSeparators, analyzeSegment, extractFeatureName...
- `types.ts` (415 lines) - exports: AgentDomain, AgentStatus, WorktreeInfo, ParallelAgent, ParallelSession...; functions: isAgentDomain, isAgentStatus, isGitProvider

#### `src/core/auto/e2e-coverage/`

- `accessibility-audit.ts` (308 lines) - exports: hasAxeInstalled, parseAccessibilityResults, shouldBlockOnAccessibility, generateAccessibilityReport; functions: hasAxeInstalled, parseAccessibilityResults, shouldBlockOnAccessibility, generateAccessibilityReport
- `console-errors.ts` (165 lines) - exports: parseConsoleErrors, shouldBlockOnConsoleErrors; functions: parseConsoleErrors, shouldBlockOnConsoleErrors
- `coverage-manifest.ts` (234 lines) - exports: generateCoverageManifest, saveManifest, loadManifest, updateRouteCoverage, calculateCoverage...; functions: generateCoverageManifest, saveManifest, loadManifest, updateRouteCoverage, calculateCoverage...
- `index.ts` (76 lines)
- `route-extractor.ts` (364 lines) - exports: detectFramework, extractRoutes, loadManualRoutes; functions: anyFileExists, detectFramework, extractNextJsPagesRoutes, walkDir, extractNextJsAppRoutes...
- `route-tracker.ts` (269 lines) - exports: parseRouteVisits, matchRouteToManifest, trackRouteCoverage, parseViewportFromProject; functions: parseRouteVisits, normalizeRoute, matchRouteToManifest, trackRouteCoverage, parseViewportFromProject
- `types.ts` (165 lines) - exports: RouteEntry, ActionEntry, ViewportsCovered, CoverageStats, E2ECoverageManifest...
- `ui-state-coverage.ts` (149 lines) - exports: parseUIStateCoverage, generateUIStateReport; functions: parseUIStateCoverage, generateUIStateReport, formatStateStatus
- `viewport-analyzer.ts` (191 lines) - exports: parsePlaywrightConfig, getRequiredViewports, checkViewportCoverage; functions: parsePlaywrightConfig, getRequiredViewports, checkViewportCoverage

#### `src/core/auto/parallel/`

- `agent-spawner.ts` (283 lines) - exports: TaskSpawnRequest, AgentContext, AgentSpawnResult, AgentSpawner; classes: AgentSpawner
- `index.ts` (80 lines)
- `orchestrator.ts` (599 lines) - exports: DomainTaskAssignment, SessionCreateOptions, SessionStatus, AgentCompletionCallback, ParallelOrchestrator; classes: ParallelOrchestrator
- `platform-utils.ts` (320 lines) - exports: isWindows, isMacOS, isLinux, getPlatform, normalizePath...; functions: isWindows, isMacOS, isLinux, getPlatform, normalizePath...
- `pr-generator.ts` (363 lines) - exports: PRCreateOptions, PRGenerator; classes: PRGenerator
- `prompt-analyzer.ts` (377 lines) - exports: DomainDetection, AnalysisResult, DOMAIN_KEYWORDS, PromptAnalyzer; classes: PromptAnalyzer
- `state-manager.ts` (355 lines) - exports: StateManager; classes: StateManager
- `worktree-manager.ts` (438 lines) - exports: WorktreeCreateOptions, WorktreeRemoveOptions, MergeResult, WorktreeManager; classes: WorktreeManager
