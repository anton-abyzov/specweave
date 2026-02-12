/**
 * Auto Module
 * Autonomous Execution Engine for SpecWeave
 *
 * Simplified architecture (v1.0.110+):
 * - Trust the framework (hooks handle sync, state, validation)
 * - Minimal session management (just filesystem reads)
 * - Quality gates in /sw:done (not auto mode)
 */

// Types
export * from './types.js';

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

// Project Detection
export * from './project-detector.js';

// E2E Coverage Manifest (Auto Mode)
export {
  detectFramework as detectE2EFramework,
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

// Completion Conditions
export * from './default-conditions.js';

