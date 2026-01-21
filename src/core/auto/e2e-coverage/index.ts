/**
 * E2E Coverage Module
 *
 * Tracks which routes, actions, and viewports have E2E test coverage.
 * Auto-generates manifest from project routes (Next.js, React Router, etc.).
 *
 * @module core/auto/e2e-coverage
 * @since v1.0.115
 */

// Types
export type {
  RouteEntry,
  ActionEntry,
  ViewportsCovered,
  CoverageStats,
  E2ECoverageManifest,
  FrameworkType,
  RouteVisit,
  RouteTrackingResult,
  PlaywrightViewportConfig,
  PlaywrightProject,
  A11yViolationSeverity,
  A11yViolation,
  A11yAuditResult,
  ConsoleError,
  ConsoleErrorResult,
  UIStateCoverage,
} from './types.js';

export { DEFAULT_VIEWPORTS } from './types.js';

// Route Extraction
export { detectFramework, extractRoutes, loadManualRoutes } from './route-extractor.js';

// Coverage Manifest
export {
  generateCoverageManifest,
  saveManifest,
  loadManifest,
  updateRouteCoverage,
  calculateCoverage,
  getUntestedRoutes,
  getRoutesWithMissingViewports,
  generateCoverageReport,
} from './coverage-manifest.js';

// Route Tracking
export {
  parseRouteVisits,
  matchRouteToManifest,
  trackRouteCoverage,
  parseViewportFromProject,
} from './route-tracker.js';

// Viewport Analysis
export {
  parsePlaywrightConfig,
  getRequiredViewports,
  checkViewportCoverage,
} from './viewport-analyzer.js';

// Accessibility Audit
export {
  hasAxeInstalled,
  parseAccessibilityResults,
  shouldBlockOnAccessibility,
  generateAccessibilityReport,
} from './accessibility-audit.js';

// Console Errors
export { parseConsoleErrors, shouldBlockOnConsoleErrors } from './console-errors.js';

// UI State Coverage
export { parseUIStateCoverage, generateUIStateReport } from './ui-state-coverage.js';
