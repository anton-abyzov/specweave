/**
 * Coverage Manifest
 *
 * Manages E2E coverage manifest generation, persistence, and statistics.
 *
 * @module core/auto/e2e-coverage/coverage-manifest
 * @since v1.0.115
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  E2ECoverageManifest,
  RouteEntry,
  ViewportsCovered,
  CoverageStats,
  FrameworkType,
} from './types.js';
import { detectFramework, extractRoutes, loadManualRoutes } from './route-extractor.js';

/**
 * Generate E2E coverage manifest
 *
 * @param projectPath - Project root path
 * @param options - Generation options
 * @returns Generated manifest
 *
 * @example
 * ```typescript
 * const manifest = generateCoverageManifest('/path/to/project');
 * console.log(manifest.coverage.routes); // Coverage percentage
 * ```
 */
export function generateCoverageManifest(
  projectPath: string,
  options: { framework?: FrameworkType; includeActions?: boolean } = {}
): E2ECoverageManifest {
  // Try manual routes first
  let routes = loadManualRoutes(projectPath);

  // Auto-detect if no manual routes
  if (!routes || routes.length === 0) {
    routes = extractRoutes(projectPath, options.framework);
  }

  // Build routes object
  const routesObj: Record<string, RouteEntry> = {};
  for (const route of routes) {
    routesObj[route] = {
      path: route,
      tested: false,
      viewports: [],
    };
  }

  // Generate manifest
  const manifest: E2ECoverageManifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    framework: detectFramework(projectPath),
    routes: routesObj,
    criticalActions: {},
    viewportsCovered: {
      mobile: false,
      tablet: false,
      desktop: false,
    },
    coverage: {
      routes: 0,
      actions: 0,
      viewports: 0,
    },
  };

  return manifest;
}

/**
 * Save manifest to state directory
 */
export function saveManifest(projectPath: string, manifest: E2ECoverageManifest): void {
  const stateDir = path.join(projectPath, '.specweave/state');

  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  const manifestPath = path.join(stateDir, 'e2e-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Load existing manifest from state directory
 */
export function loadManifest(projectPath: string): E2ECoverageManifest | null {
  const manifestPath = path.join(projectPath, '.specweave/state/e2e-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Update route coverage in manifest
 */
export function updateRouteCoverage(
  manifest: E2ECoverageManifest,
  route: string,
  viewports: string[] = []
): E2ECoverageManifest {
  if (manifest.routes[route]) {
    manifest.routes[route].tested = true;
    manifest.routes[route].viewports = [
      ...new Set([...manifest.routes[route].viewports, ...viewports]),
    ];
    manifest.routes[route].lastTested = new Date().toISOString();
  }

  // Update viewport coverage
  for (const viewport of viewports) {
    if (viewport in manifest.viewportsCovered) {
      manifest.viewportsCovered[viewport as keyof ViewportsCovered] = true;
    }
  }

  // Recalculate coverage stats
  manifest.coverage = calculateCoverage(manifest);

  return manifest;
}

/**
 * Calculate coverage statistics
 */
export function calculateCoverage(manifest: E2ECoverageManifest): CoverageStats {
  const routes = Object.values(manifest.routes);
  const actions = Object.values(manifest.criticalActions);
  const viewports = Object.values(manifest.viewportsCovered);

  const testedRoutes = routes.filter((r) => r.tested).length;
  const testedActions = actions.filter((a) => a.tested).length;
  const testedViewports = viewports.filter((v) => v).length;

  return {
    routes: routes.length > 0 ? Math.round((testedRoutes / routes.length) * 100) : 0,
    actions: actions.length > 0 ? Math.round((testedActions / actions.length) * 100) : 0,
    viewports: Math.round((testedViewports / 3) * 100),
  };
}

/**
 * Get untested routes
 */
export function getUntestedRoutes(manifest: E2ECoverageManifest): string[] {
  return Object.values(manifest.routes)
    .filter((r) => !r.tested)
    .map((r) => r.path);
}

/**
 * Get routes missing viewport coverage
 */
export function getRoutesWithMissingViewports(manifest: E2ECoverageManifest): {
  route: string;
  missingViewports: string[];
}[] {
  const allViewports = ['mobile', 'tablet', 'desktop'];

  return Object.values(manifest.routes)
    .filter((r) => r.tested && r.viewports.length < 3)
    .map((r) => ({
      route: r.path,
      missingViewports: allViewports.filter((v) => !r.viewports.includes(v)),
    }));
}

/**
 * Generate coverage report from manifest
 *
 * @param manifest - E2E coverage manifest
 * @returns Formatted coverage report
 */
export function generateCoverageReport(manifest: E2ECoverageManifest): string {
  const lines: string[] = [];
  const coverage = calculateCoverage(manifest);

  lines.push('📊 E2E Coverage Report');
  lines.push('═'.repeat(50));
  lines.push('');
  lines.push(`Framework: ${manifest.framework || 'Unknown'}`);
  lines.push(`Generated: ${manifest.generatedAt}`);
  lines.push('');
  lines.push('Coverage Summary:');
  lines.push(`  Routes:    ${coverage.routes}%`);
  lines.push(`  Viewports: ${coverage.viewports}%`);
  lines.push(`  Actions:   ${coverage.actions}%`);
  lines.push('');

  // Untested routes
  const untested = getUntestedRoutes(manifest);
  if (untested.length > 0) {
    lines.push('❌ Untested Routes:');
    for (const route of untested) {
      lines.push(`   ${route}`);
    }
    lines.push('');
  }

  // Incomplete viewport coverage
  const incomplete = getRoutesWithMissingViewports(manifest);
  if (incomplete.length > 0) {
    lines.push('⚠️ Incomplete Viewport Coverage:');
    for (const { route, missingViewports } of incomplete) {
      lines.push(`   ${route} → missing: ${missingViewports.join(', ')}`);
    }
    lines.push('');
  }

  // Viewport summary
  lines.push('Viewport Coverage:');
  lines.push(`  📱 Mobile:  ${manifest.viewportsCovered.mobile ? '✅' : '❌'}`);
  lines.push(`  📱 Tablet:  ${manifest.viewportsCovered.tablet ? '✅' : '❌'}`);
  lines.push(`  🖥️ Desktop: ${manifest.viewportsCovered.desktop ? '✅' : '❌'}`);

  return lines.join('\n');
}
