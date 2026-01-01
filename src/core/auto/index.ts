/**
 * Auto Module
 * Autonomous Execution Engine for SpecWeave
 *
 * Inspired by Ralph Wiggum plugin architecture, fully integrated with
 * SpecWeave's spec-driven workflow, living docs, and external tool sync.
 */

// Types
export * from './types.js';

// Session State Management
export { SessionStateManager } from './session-state.js';

// Configuration
export {
  loadAutoConfig,
  saveAutoConfig,
  isAutoEnabled,
  getEffectiveMode,
  type ConfigLoadResult,
} from './config.js';

// Logging
export { AutoLogger } from './logger.js';

// Cost Estimation
export {
  estimateCost,
  formatCostEstimate,
  type CostEstimate,
  type IncrementEstimate,
  type EstimatorConfig,
} from './cost-estimator.js';

// Report Generation
export {
  generateSessionReport,
  generateMarkdownReport,
  saveReport,
  generateCancellationSummary,
  type SessionReport,
  type IncrementReport,
  type GateReport,
  type CircuitBreakerReport,
  type ReportSummary,
} from './report-generator.js';

// Increment Queue Management
export {
  IncrementQueueManager,
  type QueuedIncrement,
  type QueueConfig,
} from './increment-queue.js';

// Test Gates
export {
  TestGate,
  quickTestCheck,
  type TestGateConfig,
  type TestResult,
  type CoverageResult,
  type TestFailure,
  type GateResult,
} from './test-gate.js';

// Human Gates
export {
  HumanGateDetector,
  type HumanGateConfig,
  type GateRequest,
  type GateResponse,
  type DetectionResult,
} from './human-gate.js';

// Circuit Breakers
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitOpenError,
  parseRateLimitHeaders,
  type CircuitState,
  type CircuitBreakerConfig,
  type CircuitStatus,
  type QueuedOperation,
} from './circuit-breaker.js';

// Sync Checkpoints
export {
  SyncCheckpointManager,
  type SyncCheckpointConfig,
  type SyncResult,
  type CheckpointResult,
} from './sync-checkpoint.js';

// Prompt Chunking (Intelligent Auto Mode)
export {
  extractFeatures,
  analyzePrompt,
  type Feature,
  type PromptAnalysis,
} from './prompt-chunker.js';

// Increment Planning (Auto Mode)
export {
  planIncrements,
  type IncrementPlan,
  type PlanningResult,
} from './increment-planner.js';

// Plan Approval (Auto Mode)
export {
  formatPlanDisplay,
  generateApprovalPrompt,
  validatePlan,
  logApprovedPlan,
  savePlanToState,
  loadPlanFromState,
  clearPlanFromState,
  applyPlanModification,
  type ApprovalConfig,
  type ApprovalResult,
  type PlanDisplayOptions,
} from './plan-approval.js';

// E2E Coverage Manifest (Auto Mode)
export {
  detectFramework,
  extractRoutes,
  loadManualRoutes,
  generateCoverageManifest,
  saveManifest,
  loadManifest,
  updateRouteCoverage,
  calculateCoverage,
  getUntestedRoutes,
  getRoutesWithMissingViewports,
  parseRouteVisits,
  matchRouteToManifest,
  trackRouteCoverage,
  parseViewportFromProject,
  parsePlaywrightConfig,
  getRequiredViewports,
  checkViewportCoverage,
  generateCoverageReport,
  DEFAULT_VIEWPORTS,
  // Accessibility Audit (Phase 6)
  hasAxeInstalled,
  parseAccessibilityResults,
  shouldBlockOnAccessibility,
  generateAccessibilityReport,
  // Console Error Detection (Phase 6)
  parseConsoleErrors,
  shouldBlockOnConsoleErrors,
  // UI State Coverage (Phase 6)
  parseUIStateCoverage,
  generateUIStateReport,
  type RouteEntry,
  type ActionEntry,
  type ViewportsCovered,
  type CoverageStats,
  type E2ECoverageManifest,
  type FrameworkType,
  type RouteVisit,
  type RouteTrackingResult,
  type PlaywrightViewportConfig,
  type PlaywrightProject,
  // Accessibility types
  type A11yViolationSeverity,
  type A11yViolation,
  type A11yAuditResult,
  // Console error types
  type ConsoleError,
  type ConsoleErrorResult,
  // UI state types
  type UIStateCoverage,
} from './e2e-coverage.js';
