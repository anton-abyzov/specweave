/**
 * Route Tracker
 *
 * Parses test output to extract visited routes and track coverage.
 *
 * @module core/auto/e2e-coverage/route-tracker
 * @since v1.0.115
 */

import type { RouteVisit, RouteTrackingResult, E2ECoverageManifest } from './types.js';
import {
  generateCoverageManifest,
  loadManifest,
  saveManifest,
  updateRouteCoverage,
} from './coverage-manifest.js';

/**
 * Parse Playwright test output to extract visited routes
 *
 * Looks for patterns like:
 * - page.goto('http://localhost:3000/login')
 * - await page.goto('/dashboard')
 * - navigating to "http://localhost:3000/products"
 * - → /api/users (XHR) - skip API routes
 *
 * @param output - Test output (stdout/stderr combined)
 * @param baseUrl - Optional base URL to normalize routes
 * @returns Array of route visits
 */
export function parseRouteVisits(output: string, baseUrl?: string): RouteVisit[] {
  const visits: RouteVisit[] = [];
  const seenRoutes = new Set<string>();

  // Normalize base URL (remove trailing slash)
  const normalizedBaseUrl = baseUrl?.replace(/\/$/, '') || 'http://localhost:3000';

  // Pattern 1: page.goto('url') or page.goto("url")
  const gotoPattern = /page\.goto\s*\(\s*['"`]([^'"`]+)['"`]/gi;

  // Pattern 2: navigating to "url"
  const navigatingPattern = /navigating to\s*['"`]?([^'"`\s]+)['"`]?/gi;

  // Pattern 3: Playwright trace output: GET http://... (document)
  const tracePattern = /(?:GET|POST)\s+(https?:\/\/[^\s]+)\s*\(document\)/gi;

  // Pattern 4: [chromium|webkit|firefox] › path/to/test.spec.ts:line
  // This helps identify which viewport/project ran
  const projectPattern = /\[(chromium|webkit|firefox|Mobile\s*\w+|Desktop\s*\w+|mobile|tablet|desktop)\]/gi;

  // Track current viewport from project name
  let currentViewport: string | undefined;

  // Extract viewport from project patterns in the output
  const lines = output.split('\n');

  for (const line of lines) {
    // Check for viewport/project indicator
    const projectMatch = projectPattern.exec(line);
    if (projectMatch) {
      const project = projectMatch[1].toLowerCase();
      if (project.includes('mobile') || project === 'webkit') {
        currentViewport = 'mobile';
      } else if (project.includes('tablet')) {
        currentViewport = 'tablet';
      } else if (project.includes('desktop') || project === 'chromium' || project === 'firefox') {
        currentViewport = 'desktop';
      }
    }

    // Reset regex lastIndex for each line
    gotoPattern.lastIndex = 0;
    navigatingPattern.lastIndex = 0;
    tracePattern.lastIndex = 0;

    let match;

    // Pattern 1: page.goto()
    while ((match = gotoPattern.exec(line)) !== null) {
      const route = normalizeRoute(match[1], normalizedBaseUrl);
      if (route && !route.startsWith('/api') && !seenRoutes.has(route + currentViewport)) {
        seenRoutes.add(route + currentViewport);
        visits.push({ route, viewport: currentViewport });
      }
    }

    // Pattern 2: navigating to
    while ((match = navigatingPattern.exec(line)) !== null) {
      const route = normalizeRoute(match[1], normalizedBaseUrl);
      if (route && !route.startsWith('/api') && !seenRoutes.has(route + currentViewport)) {
        seenRoutes.add(route + currentViewport);
        visits.push({ route, viewport: currentViewport });
      }
    }

    // Pattern 3: trace GET/POST (document)
    while ((match = tracePattern.exec(line)) !== null) {
      const route = normalizeRoute(match[1], normalizedBaseUrl);
      if (route && !route.startsWith('/api') && !seenRoutes.has(route + currentViewport)) {
        seenRoutes.add(route + currentViewport);
        visits.push({ route, viewport: currentViewport });
      }
    }
  }

  return visits;
}

/**
 * Normalize a URL or path to a route
 */
function normalizeRoute(urlOrPath: string, baseUrl: string): string | null {
  try {
    // Handle full URLs
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      const url = new URL(urlOrPath);
      // Skip external domains
      const baseUrlHost = new URL(baseUrl).host;
      if (url.host !== baseUrlHost && !url.host.includes('localhost')) {
        return null;
      }
      return url.pathname || '/';
    }

    // Handle relative paths
    if (urlOrPath.startsWith('/')) {
      return urlOrPath.split('?')[0]; // Remove query string
    }

    // Handle paths without leading slash
    return '/' + urlOrPath.split('?')[0];
  } catch {
    return null;
  }
}

/**
 * Match a visited route against manifest routes (handling dynamic segments)
 *
 * @param visitedRoute - The actual route visited (e.g., "/products/123")
 * @param manifestRoutes - Routes in manifest (may include :params like "/products/:id")
 * @returns Matched manifest route or null
 */
export function matchRouteToManifest(
  visitedRoute: string,
  manifestRoutes: string[]
): string | null {
  // Exact match first
  if (manifestRoutes.includes(visitedRoute)) {
    return visitedRoute;
  }

  // Try dynamic route matching
  for (const manifestRoute of manifestRoutes) {
    if (manifestRoute.includes(':')) {
      // Convert "/products/:id" to regex "/products/[^/]+"
      const pattern = manifestRoute
        .replace(/:[^/]+/g, '[^/]+')
        .replace(/\//g, '\\/');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(visitedRoute)) {
        return manifestRoute;
      }
    }
  }

  return null;
}

/**
 * Track route coverage from test output
 *
 * Parses test output, extracts route visits, and updates manifest.
 *
 * @param projectPath - Project root path
 * @param testOutput - Raw test output
 * @param options - Tracking options
 * @returns Tracking result with updated manifest
 *
 * @example
 * ```typescript
 * const result = trackRouteCoverage('/path/to/project', testOutput);
 * console.log(`Tested ${result.newlyTested.length} new routes`);
 * ```
 */
export function trackRouteCoverage(
  projectPath: string,
  testOutput: string,
  options: { baseUrl?: string; viewport?: string } = {}
): RouteTrackingResult {
  // Load or generate manifest
  let manifest = loadManifest(projectPath);
  if (!manifest) {
    manifest = generateCoverageManifest(projectPath);
  }

  const visits = parseRouteVisits(testOutput, options.baseUrl);
  const manifestRoutes = Object.keys(manifest.routes);
  const newlyTested: string[] = [];
  const viewportUpdates: { route: string; viewport: string }[] = [];

  for (const visit of visits) {
    // Match visited route to manifest route
    const matchedRoute = matchRouteToManifest(visit.route, manifestRoutes);

    if (matchedRoute && manifest.routes[matchedRoute]) {
      const routeEntry = manifest.routes[matchedRoute];
      const wasTestedBefore = routeEntry.tested;

      // Determine viewport (from visit, options, or default)
      const viewport = visit.viewport || options.viewport || 'desktop';

      // Track viewport updates BEFORE updating (to know what's new)
      const hadViewport = routeEntry.viewports.includes(viewport);
      if (viewport && !hadViewport) {
        viewportUpdates.push({ route: matchedRoute, viewport });
      }

      // Update route coverage
      const viewports = viewport ? [viewport] : [];
      manifest = updateRouteCoverage(manifest, matchedRoute, viewports);

      // Track newly tested routes
      if (!wasTestedBefore) {
        newlyTested.push(matchedRoute);
      }
    }
  }

  // Save updated manifest
  saveManifest(projectPath, manifest);

  return {
    visits,
    manifest,
    newlyTested,
    viewportUpdates,
  };
}

/**
 * Parse viewport from Playwright project name
 *
 * @param projectName - Playwright project name from config or output
 * @returns Normalized viewport name
 */
export function parseViewportFromProject(projectName: string): string {
  const name = projectName.toLowerCase();

  // Common mobile indicators
  if (
    name.includes('mobile') ||
    name.includes('iphone') ||
    name.includes('pixel') ||
    name.includes('android') ||
    name === 'webkit'
  ) {
    return 'mobile';
  }

  // Tablet indicators
  if (name.includes('tablet') || name.includes('ipad')) {
    return 'tablet';
  }

  // Desktop (default for chromium/firefox/edge)
  return 'desktop';
}
