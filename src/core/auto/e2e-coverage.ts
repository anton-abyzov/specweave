/**
 * E2E Coverage Manifest
 *
 * Tracks which routes, actions, and viewports have E2E test coverage.
 * Auto-generates manifest from project routes (Next.js, React Router, etc.).
 *
 * @module e2e-coverage
 */

import * as fs from 'fs';
import * as path from 'path';

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
 * Detect which frontend framework is being used
 *
 * @param projectPath - Project root path
 * @returns Detected framework type
 */
export function detectFramework(projectPath: string): FrameworkType {
  // Check for Next.js
  const nextConfigPath = path.join(projectPath, 'next.config.js');
  const nextConfigMjsPath = path.join(projectPath, 'next.config.mjs');
  const nextConfigTsPath = path.join(projectPath, 'next.config.ts');

  if (
    fs.existsSync(nextConfigPath) ||
    fs.existsSync(nextConfigMjsPath) ||
    fs.existsSync(nextConfigTsPath)
  ) {
    // Check for App Router vs Pages Router
    const appDir = path.join(projectPath, 'app');
    const srcAppDir = path.join(projectPath, 'src/app');
    if (fs.existsSync(appDir) || fs.existsSync(srcAppDir)) {
      return 'nextjs-app';
    }
    return 'nextjs-pages';
  }

  // Check for Remix
  const remixConfig = path.join(projectPath, 'remix.config.js');
  if (fs.existsSync(remixConfig)) {
    return 'remix';
  }

  // Check for SvelteKit
  const svelteConfig = path.join(projectPath, 'svelte.config.js');
  if (fs.existsSync(svelteConfig)) {
    return 'svelte-kit';
  }

  // Check for Vue Router (nuxt or vue-router)
  const nuxtConfig = path.join(projectPath, 'nuxt.config.js');
  const nuxtConfigTs = path.join(projectPath, 'nuxt.config.ts');
  if (fs.existsSync(nuxtConfig) || fs.existsSync(nuxtConfigTs)) {
    return 'vue-router';
  }

  // Check package.json for React Router
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps['react-router'] || deps['react-router-dom']) {
        return 'react-router';
      }
    } catch {
      // Ignore parse errors
    }
  }

  return 'unknown';
}

/**
 * Extract routes from Next.js Pages Router
 */
function extractNextJsPagesRoutes(projectPath: string): string[] {
  const routes: string[] = [];
  const pagesDir =
    fs.existsSync(path.join(projectPath, 'pages')) ?
      path.join(projectPath, 'pages')
    : path.join(projectPath, 'src/pages');

  if (!fs.existsSync(pagesDir)) {
    return routes;
  }

  function walkDir(dir: string, baseRoute: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const baseName = entry.name.replace(/\.(tsx?|jsx?|mdx?)$/, '');

      // Skip API routes, _app, _document, etc.
      if (baseName.startsWith('_') || baseName === 'api') {
        continue;
      }

      if (entry.isDirectory()) {
        // Handle dynamic routes [slug]
        const routeSegment = baseName.startsWith('[') ? `:${baseName.slice(1, -1)}` : baseName;
        walkDir(fullPath, `${baseRoute}/${routeSegment}`);
      } else if (/\.(tsx?|jsx?|mdx?)$/.test(entry.name)) {
        // Handle index files
        if (baseName === 'index') {
          routes.push(baseRoute || '/');
        } else {
          // Handle dynamic routes [slug]
          const routeSegment = baseName.startsWith('[') ? `:${baseName.slice(1, -1)}` : baseName;
          routes.push(`${baseRoute}/${routeSegment}`);
        }
      }
    }
  }

  walkDir(pagesDir);
  return routes;
}

/**
 * Extract routes from Next.js App Router
 */
function extractNextJsAppRoutes(projectPath: string): string[] {
  const routes: string[] = [];
  const appDir =
    fs.existsSync(path.join(projectPath, 'app')) ?
      path.join(projectPath, 'app')
    : path.join(projectPath, 'src/app');

  if (!fs.existsSync(appDir)) {
    return routes;
  }

  function walkDir(dir: string, baseRoute: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    // Check if this directory has a page.tsx/page.js
    const hasPage = entries.some(
      (e) => !e.isDirectory() && /^page\.(tsx?|jsx?)$/.test(e.name)
    );

    if (hasPage) {
      routes.push(baseRoute || '/');
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const baseName = entry.name;

      // Skip private folders, API routes, and special Next.js folders
      if (
        baseName.startsWith('_') ||
        baseName.startsWith('.') ||
        baseName === 'api' ||
        baseName.startsWith('@')
      ) {
        continue;
      }

      // Handle route groups (ignored in URL)
      if (baseName.startsWith('(') && baseName.endsWith(')')) {
        walkDir(path.join(dir, baseName), baseRoute);
        continue;
      }

      // Handle dynamic routes [slug]
      const routeSegment = baseName.startsWith('[') ? `:${baseName.slice(1, -1)}` : baseName;
      walkDir(path.join(dir, baseName), `${baseRoute}/${routeSegment}`);
    }
  }

  walkDir(appDir);
  return routes;
}

/**
 * Extract routes from React Router configuration
 * Note: This is a best-effort approach since React Router config is runtime
 */
function extractReactRouterRoutes(projectPath: string): string[] {
  const routes: string[] = [];
  const patterns = ['src/routes', 'src/router', 'src/app/routes'];

  for (const pattern of patterns) {
    const routesDir = path.join(projectPath, pattern);
    if (fs.existsSync(routesDir)) {
      // Look for route files
      const files = fs.readdirSync(routesDir);
      for (const file of files) {
        if (/\.(tsx?|jsx?)$/.test(file)) {
          const routeName = file.replace(/\.(tsx?|jsx?)$/, '').toLowerCase();
          if (routeName === 'index' || routeName === 'root') {
            routes.push('/');
          } else {
            routes.push(`/${routeName}`);
          }
        }
      }
    }
  }

  // Fallback: scan for <Route path="..." /> patterns in source files
  if (routes.length === 0) {
    const srcDir = path.join(projectPath, 'src');
    if (fs.existsSync(srcDir)) {
      const routePattern = /<Route[^>]*path=["']([^"']+)["']/g;
      scanForPatterns(srcDir, routePattern, routes);
    }
  }

  return routes;
}

/**
 * Scan files for route patterns
 */
function scanForPatterns(dir: string, pattern: RegExp, routes: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      scanForPatterns(fullPath, pattern, routes);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        let match;
        while ((match = pattern.exec(content)) !== null) {
          if (match[1] && !routes.includes(match[1])) {
            routes.push(match[1]);
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }
}

/**
 * Extract routes from project based on detected framework
 *
 * @param projectPath - Project root path
 * @param framework - Optional framework override
 * @returns Array of route paths
 */
export function extractRoutes(projectPath: string, framework?: FrameworkType): string[] {
  const detectedFramework = framework || detectFramework(projectPath);

  switch (detectedFramework) {
    case 'nextjs-pages':
      return extractNextJsPagesRoutes(projectPath);
    case 'nextjs-app':
      return extractNextJsAppRoutes(projectPath);
    case 'react-router':
      return extractReactRouterRoutes(projectPath);
    case 'remix':
      // Remix uses file-based routing similar to Next.js
      return extractNextJsPagesRoutes(projectPath);
    case 'svelte-kit':
      // SvelteKit uses routes/ directory
      return extractSvelteKitRoutes(projectPath);
    case 'vue-router':
      return extractVueRoutes(projectPath);
    default:
      // Fallback: try all methods and combine
      const routes = new Set<string>();
      extractNextJsPagesRoutes(projectPath).forEach((r) => routes.add(r));
      extractNextJsAppRoutes(projectPath).forEach((r) => routes.add(r));
      extractReactRouterRoutes(projectPath).forEach((r) => routes.add(r));
      return Array.from(routes);
  }
}

/**
 * Extract routes from SvelteKit
 */
function extractSvelteKitRoutes(projectPath: string): string[] {
  const routes: string[] = [];
  const routesDir = path.join(projectPath, 'src/routes');

  if (!fs.existsSync(routesDir)) {
    return routes;
  }

  function walkDir(dir: string, baseRoute: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    // Check if this directory has a +page.svelte
    const hasPage = entries.some((e) => !e.isDirectory() && e.name === '+page.svelte');

    if (hasPage) {
      routes.push(baseRoute || '/');
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const baseName = entry.name;

      // Skip private folders and layout groups
      if (baseName.startsWith('_') || baseName.startsWith('.')) {
        continue;
      }

      // Handle route groups (ignored in URL)
      if (baseName.startsWith('(') && baseName.endsWith(')')) {
        walkDir(path.join(dir, baseName), baseRoute);
        continue;
      }

      // Handle dynamic routes [slug]
      const routeSegment = baseName.startsWith('[') ? `:${baseName.slice(1, -1)}` : baseName;
      walkDir(path.join(dir, baseName), `${baseRoute}/${routeSegment}`);
    }
  }

  walkDir(routesDir);
  return routes;
}

/**
 * Extract routes from Vue/Nuxt
 */
function extractVueRoutes(projectPath: string): string[] {
  const routes: string[] = [];
  const pagesDir = path.join(projectPath, 'pages');

  if (!fs.existsSync(pagesDir)) {
    return routes;
  }

  function walkDir(dir: string, baseRoute: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const baseName = entry.name.replace(/\.vue$/, '');

      if (entry.isDirectory()) {
        const routeSegment = baseName.startsWith('_') ? `:${baseName.slice(1)}` : baseName;
        walkDir(fullPath, `${baseRoute}/${routeSegment}`);
      } else if (entry.name.endsWith('.vue')) {
        if (baseName === 'index') {
          routes.push(baseRoute || '/');
        } else {
          const routeSegment = baseName.startsWith('_') ? `:${baseName.slice(1)}` : baseName;
          routes.push(`${baseRoute}/${routeSegment}`);
        }
      }
    }
  }

  walkDir(pagesDir);
  return routes;
}

/**
 * Load manual routes override from routes.json
 */
export function loadManualRoutes(projectPath: string): string[] | null {
  const routesJsonPath = path.join(projectPath, 'routes.json');
  const specweaveRoutesPath = path.join(projectPath, '.specweave/routes.json');

  const routesPath = fs.existsSync(specweaveRoutesPath) ? specweaveRoutesPath : routesJsonPath;

  if (!fs.existsSync(routesPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(routesPath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data.routes) ? data.routes : data;
  } catch {
    return null;
  }
}

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
