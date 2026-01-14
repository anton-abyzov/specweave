/**
 * E2E Coverage Types
 *
 * Shared type definitions for E2E coverage tracking.
 *
 * @module core/auto/e2e-coverage/types
 * @since v1.0.115
 */

export interface RouteEntry {
  path: string;
  tested: boolean;
  viewports: string[];
  lastTested?: string;
}

export interface ActionEntry {
  id: string;
  description: string;
  tested: boolean;
  lastTested?: string;
}

export interface ViewportsCovered {
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
}

export interface CoverageStats {
  routes: number;
  actions: number;
  viewports: number;
}

export interface E2ECoverageManifest {
  version: string;
  generatedAt: string;
  framework?: string;
  routes: Record<string, RouteEntry>;
  criticalActions: Record<string, ActionEntry>;
  viewportsCovered: ViewportsCovered;
  coverage: CoverageStats;
}

export type FrameworkType =
  | 'nextjs-pages'
  | 'nextjs-app'
  | 'react-router'
  | 'vue-router'
  | 'svelte-kit'
  | 'remix'
  | 'unknown';

/**
 * Default viewports for responsive testing
 */
export const DEFAULT_VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
};

/**
 * Route visit detected in test output
 */
export interface RouteVisit {
  route: string;
  viewport?: string;
  timestamp?: string;
}

/**
 * Result of parsing test output for route visits
 */
export interface RouteTrackingResult {
  visits: RouteVisit[];
  manifest: E2ECoverageManifest;
  newlyTested: string[];
  viewportUpdates: { route: string; viewport: string }[];
}

/**
 * Playwright project/viewport configuration
 */
export interface PlaywrightViewportConfig {
  projects: PlaywrightProject[];
  viewports: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
  };
  configPath?: string;
}

export interface PlaywrightProject {
  name: string;
  viewport: string;
  width?: number;
  height?: number;
}

/**
 * Accessibility violation severity levels
 */
export type A11yViolationSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

/**
 * Accessibility violation from axe-core or similar tool
 */
export interface A11yViolation {
  id: string;
  impact: A11yViolationSeverity;
  description: string;
  helpUrl?: string;
  nodes?: number;
  tags?: string[];
}

/**
 * Result of accessibility audit parsing
 */
export interface A11yAuditResult {
  hasAxe: boolean;
  auditRan: boolean;
  violations: A11yViolation[];
  passes: number;
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    total: number;
  };
}

/**
 * Console error detected in E2E test output
 */
export interface ConsoleError {
  type: 'error' | 'warn' | 'uncaught';
  message: string;
  source?: string;
  line?: number;
}

/**
 * Result of console error parsing
 */
export interface ConsoleErrorResult {
  errors: ConsoleError[];
  warnings: ConsoleError[];
  uncaughtExceptions: ConsoleError[];
  total: number;
}

/**
 * UI state coverage tracking
 */
export interface UIStateCoverage {
  loadingStates: { detected: boolean; tested: boolean; examples: string[] };
  errorStates: { detected: boolean; tested: boolean; examples: string[] };
  emptyStates: { detected: boolean; tested: boolean; examples: string[] };
}
