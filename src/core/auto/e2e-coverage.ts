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
 * Check if any of the given files exist
 */
function anyFileExists(projectPath: string, files: string[]): boolean {
  return files.some((file) => fs.existsSync(path.join(projectPath, file)));
}

/**
 * Detect which frontend framework is being used
 *
 * @param projectPath - Project root path
 * @returns Detected framework type
 */
export function detectFramework(projectPath: string): FrameworkType {
  // Check for Next.js
  if (anyFileExists(projectPath, ['next.config.js', 'next.config.mjs', 'next.config.ts'])) {
    const hasAppRouter = anyFileExists(projectPath, ['app', 'src/app']);
    return hasAppRouter ? 'nextjs-app' : 'nextjs-pages';
  }

  // Check for other frameworks by config file
  if (fs.existsSync(path.join(projectPath, 'remix.config.js'))) return 'remix';
  if (fs.existsSync(path.join(projectPath, 'svelte.config.js'))) return 'svelte-kit';
  if (anyFileExists(projectPath, ['nuxt.config.js', 'nuxt.config.ts'])) return 'vue-router';

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
 * Parse Playwright config to extract viewport/project configuration
 *
 * @param projectPath - Project root path
 * @returns Parsed viewport configuration
 *
 * @example
 * ```typescript
 * const config = parsePlaywrightConfig('/path/to/project');
 * console.log(config.viewports.mobile); // true if mobile viewport configured
 * ```
 */
export function parsePlaywrightConfig(projectPath: string): PlaywrightViewportConfig {
  const projects: PlaywrightProject[] = [];
  const viewports = { mobile: false, tablet: false, desktop: false };

  // Try different config file names
  const configNames = [
    'playwright.config.ts',
    'playwright.config.js',
    'playwright.config.mjs',
  ];

  let configPath: string | undefined;
  let configContent: string | undefined;

  for (const name of configNames) {
    const fullPath = path.join(projectPath, name);
    if (fs.existsSync(fullPath)) {
      configPath = fullPath;
      configContent = fs.readFileSync(fullPath, 'utf-8');
      break;
    }
  }

  if (!configContent) {
    return { projects, viewports };
  }

  // Parse projects array from config
  // Pattern: projects: [ { name: '...', use: { viewport: { width: X, height: Y } } } ]
  const projectPattern = /name:\s*['"`]([^'"`]+)['"`][^}]*viewport:\s*\{[^}]*width:\s*(\d+)/gi;

  let match;
  while ((match = projectPattern.exec(configContent)) !== null) {
    const name = match[1];
    const width = parseInt(match[2], 10);

    // Categorize by width
    let viewport: string;
    if (width <= 480) {
      viewport = 'mobile';
      viewports.mobile = true;
    } else if (width <= 768) {
      viewport = 'tablet';
      viewports.tablet = true;
    } else {
      viewport = 'desktop';
      viewports.desktop = true;
    }

    projects.push({ name, viewport, width });
  }

  // Alternative pattern: devices like 'iPhone 12', 'iPad Pro', etc.
  const devicePattern = /devices\s*\[\s*['"`]([^'"`]+)['"`]\s*\]/gi;
  while ((match = devicePattern.exec(configContent)) !== null) {
    const device = match[1];
    let viewport: string;

    if (/iphone|pixel|android|mobile/i.test(device)) {
      viewport = 'mobile';
      viewports.mobile = true;
    } else if (/ipad|tablet/i.test(device)) {
      viewport = 'tablet';
      viewports.tablet = true;
    } else {
      viewport = 'desktop';
      viewports.desktop = true;
    }

    projects.push({ name: device, viewport });
  }

  // Check for common project names
  const projectNamePattern = /name:\s*['"`](mobile|tablet|desktop|Mobile\s*\w+|Desktop\s*\w+|chromium|webkit|firefox)['"`]/gi;
  while ((match = projectNamePattern.exec(configContent)) !== null) {
    const name = match[1].toLowerCase();

    if (name.includes('mobile') || name === 'webkit') {
      viewports.mobile = true;
      if (!projects.find((p) => p.name.toLowerCase() === name)) {
        projects.push({ name: match[1], viewport: 'mobile' });
      }
    } else if (name.includes('tablet')) {
      viewports.tablet = true;
      if (!projects.find((p) => p.name.toLowerCase() === name)) {
        projects.push({ name: match[1], viewport: 'tablet' });
      }
    } else if (name.includes('desktop') || name === 'chromium' || name === 'firefox') {
      viewports.desktop = true;
      if (!projects.find((p) => p.name.toLowerCase() === name)) {
        projects.push({ name: match[1], viewport: 'desktop' });
      }
    }
  }

  // If we found chromium/firefox/webkit but no explicit viewports, default to desktop
  if (projects.length > 0 && !viewports.mobile && !viewports.tablet && !viewports.desktop) {
    viewports.desktop = true;
  }

  return { projects, viewports, configPath };
}

/**
 * Get required viewports from config or defaults
 *
 * @param projectPath - Project root path
 * @returns Array of required viewport names
 */
export function getRequiredViewports(projectPath: string): string[] {
  const config = parsePlaywrightConfig(projectPath);

  // If config has explicit viewports, use those
  if (config.projects.length > 0) {
    const viewports = new Set<string>();
    for (const project of config.projects) {
      viewports.add(project.viewport);
    }
    return Array.from(viewports);
  }

  // Default: require all three viewports
  return ['mobile', 'tablet', 'desktop'];
}

/**
 * Check if viewport coverage meets requirements
 *
 * @param manifest - E2E coverage manifest
 * @param projectPath - Project root path
 * @returns Coverage check result
 */
export function checkViewportCoverage(
  manifest: E2ECoverageManifest,
  projectPath: string
): {
  complete: boolean;
  required: string[];
  covered: string[];
  missing: string[];
} {
  const required = getRequiredViewports(projectPath);
  const covered: string[] = [];
  const missing: string[] = [];

  for (const viewport of required) {
    if (manifest.viewportsCovered[viewport as keyof ViewportsCovered]) {
      covered.push(viewport);
    } else {
      missing.push(viewport);
    }
  }

  return {
    complete: missing.length === 0,
    required,
    covered,
    missing,
  };
}

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

// ============================================================================
// ACCESSIBILITY AUDIT (Phase 6 - UI/UX Quality Gates)
// ============================================================================

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
 * Detect if @axe-core/playwright is installed in the project
 *
 * @param projectPath - Project root path
 * @returns True if axe-core is installed
 */
export function hasAxeInstalled(projectPath: string): boolean {
  const packageJsonPath = path.join(projectPath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check for common axe packages
    return !!(
      deps['@axe-core/playwright'] ||
      deps['@axe-core/react'] ||
      deps['axe-core'] ||
      deps['jest-axe'] ||
      deps['vitest-axe'] ||
      deps['cypress-axe']
    );
  } catch {
    return false;
  }
}

/**
 * Parse accessibility audit results from test output
 *
 * Looks for patterns from axe-core output:
 * - "X accessibility violations found"
 * - violation objects with impact levels
 * - WCAG references
 *
 * @param output - Test output (stdout/stderr combined)
 * @returns Parsed accessibility audit results
 *
 * @example
 * ```typescript
 * const result = parseAccessibilityResults(testOutput);
 * if (result.summary.critical > 0) {
 *   console.log('Critical accessibility issues found!');
 * }
 * ```
 */
export function parseAccessibilityResults(output: string): A11yAuditResult {
  const violations: A11yViolation[] = [];
  let auditRan = false;
  let passes = 0;

  // Check if accessibility test ran
  const axePatterns = [
    /axe[.-]core/i,
    /accessibility violations/i,
    /a11y\s+(violations?|issues?|errors?)/i,
    /checkA11y/i,
    /injectAxe/i,
    /expect.*toHaveNoViolations/i,
  ];

  for (const pattern of axePatterns) {
    if (pattern.test(output)) {
      auditRan = true;
      break;
    }
  }

  // Pattern 1: "X accessibility violations found"
  const violationCountMatch = output.match(/(\d+)\s+accessibility\s+violations?\s+(?:found|detected)/i);

  // Pattern 2: Parse individual violations from axe output
  // Format: "impact: critical, description: Images must have alternate text"
  const impactPattern = /impact[:\s]+["']?(critical|serious|moderate|minor)["']?[,\s]*(?:description|help)[:\s]+["']?([^"'\n]+)["']?/gi;

  let match;
  while ((match = impactPattern.exec(output)) !== null) {
    const impact = match[1].toLowerCase() as A11yViolationSeverity;
    const description = match[2].trim();

    // Avoid duplicates
    if (!violations.find((v) => v.description === description)) {
      violations.push({
        id: `a11y-${violations.length + 1}`,
        impact,
        description,
      });
    }
  }

  // Pattern 3: Look for axe rule IDs like "image-alt", "color-contrast", etc.
  const ruleIdPattern = /rule[:\s]+["']?([\w-]+)["']?.*?impact[:\s]+["']?(critical|serious|moderate|minor)["']?/gi;
  while ((match = ruleIdPattern.exec(output)) !== null) {
    const id = match[1];
    const impact = match[2].toLowerCase() as A11yViolationSeverity;

    if (!violations.find((v) => v.id === id)) {
      violations.push({
        id,
        impact,
        description: `Accessibility rule violation: ${id}`,
      });
    }
  }

  // Pattern 4: Common axe violation messages
  const commonViolations: { pattern: RegExp; id: string; impact: A11yViolationSeverity }[] = [
    { pattern: /image[s]?\s+must\s+have\s+alt(ernate)?\s+text/i, id: 'image-alt', impact: 'critical' },
    { pattern: /color\s+contrast\s+ratio/i, id: 'color-contrast', impact: 'serious' },
    { pattern: /form\s+elements?\s+must\s+have\s+label/i, id: 'label', impact: 'critical' },
    { pattern: /document\s+must\s+have.+lang/i, id: 'html-has-lang', impact: 'serious' },
    { pattern: /link[s]?\s+must\s+have\s+discernible\s+text/i, id: 'link-name', impact: 'serious' },
    { pattern: /button[s]?\s+must\s+have\s+discernible\s+text/i, id: 'button-name', impact: 'critical' },
    { pattern: /heading[s]?\s+must\s+not\s+be\s+empty/i, id: 'empty-heading', impact: 'minor' },
    { pattern: /skip.*link|bypass.*block/i, id: 'bypass', impact: 'serious' },
    { pattern: /aria-?\s*(label|describedby|hidden)/i, id: 'aria-valid', impact: 'serious' },
    { pattern: /landmark|region/i, id: 'region', impact: 'moderate' },
    { pattern: /focus.*order|tab.*index/i, id: 'focus-order', impact: 'serious' },
    { pattern: /keyboard.*accessible/i, id: 'keyboard', impact: 'critical' },
  ];

  for (const { pattern, id, impact } of commonViolations) {
    if (pattern.test(output) && !violations.find((v) => v.id === id)) {
      const descMatch = output.match(new RegExp(`(${pattern.source}[^.\\n]{0,100})`, 'i'));
      violations.push({
        id,
        impact,
        description: descMatch?.[1]?.trim() || `${id} violation`,
      });
    }
  }

  // Pattern 5: Playwright-specific accessibility output
  // Example: "expected page to have no accessibility violations"
  if (/expected.*page.*to.*have.*no.*(?:accessibility|a11y).*violations/i.test(output)) {
    auditRan = true;
  }

  // Pattern 6: Count passes if available
  const passesMatch = output.match(/(\d+)\s+(?:accessibility\s+)?(?:checks?\s+)?pass(?:ed|es)?/i);
  if (passesMatch) {
    passes = parseInt(passesMatch[1], 10);
  }

  // Build summary
  const summary = {
    critical: violations.filter((v) => v.impact === 'critical').length,
    serious: violations.filter((v) => v.impact === 'serious').length,
    moderate: violations.filter((v) => v.impact === 'moderate').length,
    minor: violations.filter((v) => v.impact === 'minor').length,
    total: violations.length,
  };

  // Infer audit ran if we found violations
  if (violations.length > 0) {
    auditRan = true;
  }

  return {
    hasAxe: auditRan,
    auditRan,
    violations,
    passes,
    summary,
  };
}

/**
 * Check if accessibility audit should block completion
 *
 * @param result - Accessibility audit result
 * @param config - Configuration for blocking thresholds
 * @returns Whether to block and reason
 */
export function shouldBlockOnAccessibility(
  result: A11yAuditResult,
  config: {
    blockOnCritical?: boolean;
    blockOnSerious?: boolean;
    maxViolations?: number;
  } = {}
): { block: boolean; reason: string } {
  const { blockOnCritical = true, blockOnSerious = true, maxViolations = 0 } = config;

  if (!result.auditRan) {
    return { block: false, reason: 'No accessibility audit ran' };
  }

  if (blockOnCritical && result.summary.critical > 0) {
    return {
      block: true,
      reason: `${result.summary.critical} critical accessibility violation(s) found`,
    };
  }

  if (blockOnSerious && result.summary.serious > 0) {
    return {
      block: true,
      reason: `${result.summary.serious} serious accessibility violation(s) found`,
    };
  }

  if (maxViolations > 0 && result.summary.total > maxViolations) {
    return {
      block: true,
      reason: `${result.summary.total} accessibility violations exceed limit of ${maxViolations}`,
    };
  }

  return { block: false, reason: 'Accessibility audit passed' };
}

/**
 * Generate accessibility report
 *
 * @param result - Accessibility audit result
 * @returns Formatted report string
 */
export function generateAccessibilityReport(result: A11yAuditResult): string {
  const lines: string[] = [];

  lines.push('♿ Accessibility Audit Report');
  lines.push('═'.repeat(50));
  lines.push('');

  if (!result.auditRan) {
    lines.push('⚠️ No accessibility audit detected in test output.');
    lines.push('');
    lines.push('To enable accessibility testing, install @axe-core/playwright:');
    lines.push('  npm install -D @axe-core/playwright');
    lines.push('');
    lines.push('Then add to your tests:');
    lines.push("  import { injectAxe, checkA11y } from '@axe-core/playwright';");
    lines.push('  await injectAxe(page);');
    lines.push('  await checkA11y(page);');
    return lines.join('\n');
  }

  // Summary
  lines.push('Summary:');
  lines.push(`  🔴 Critical: ${result.summary.critical}`);
  lines.push(`  🟠 Serious:  ${result.summary.serious}`);
  lines.push(`  🟡 Moderate: ${result.summary.moderate}`);
  lines.push(`  🟢 Minor:    ${result.summary.minor}`);
  lines.push(`  ─────────────`);
  lines.push(`  📊 Total:    ${result.summary.total}`);
  if (result.passes > 0) {
    lines.push(`  ✅ Passed:   ${result.passes}`);
  }
  lines.push('');

  // Critical violations (always show)
  const critical = result.violations.filter((v) => v.impact === 'critical');
  if (critical.length > 0) {
    lines.push('🔴 Critical Violations (MUST FIX):');
    for (const violation of critical) {
      lines.push(`  • [${violation.id}] ${violation.description}`);
      if (violation.helpUrl) {
        lines.push(`    Learn more: ${violation.helpUrl}`);
      }
    }
    lines.push('');
  }

  // Serious violations
  const serious = result.violations.filter((v) => v.impact === 'serious');
  if (serious.length > 0) {
    lines.push('🟠 Serious Violations (Should Fix):');
    for (const violation of serious) {
      lines.push(`  • [${violation.id}] ${violation.description}`);
    }
    lines.push('');
  }

  // Moderate/minor as summary
  const other = result.violations.filter((v) => v.impact === 'moderate' || v.impact === 'minor');
  if (other.length > 0) {
    lines.push(`⚠️ ${other.length} moderate/minor violations (see full report for details)`);
    lines.push('');
  }

  // Status
  if (result.summary.critical === 0 && result.summary.serious === 0) {
    lines.push('✅ Accessibility audit PASSED (no critical or serious issues)');
  } else {
    lines.push('❌ Accessibility audit FAILED - fix critical/serious issues before release');
  }

  return lines.join('\n');
}

// ============================================================================
// CONSOLE ERROR DETECTION (Phase 6 - UI/UX Quality Gates)
// ============================================================================

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
 * Parse console errors from E2E test output
 *
 * Looks for patterns like:
 * - "console.error: ..."
 * - "Uncaught Error: ..."
 * - "Error: ..." in page console
 *
 * @param output - Test output (stdout/stderr combined)
 * @param excludePatterns - Patterns to exclude (expected errors)
 * @returns Parsed console errors
 */
export function parseConsoleErrors(
  output: string,
  excludePatterns: RegExp[] = []
): ConsoleErrorResult {
  const errors: ConsoleError[] = [];
  const warnings: ConsoleError[] = [];
  const uncaughtExceptions: ConsoleError[] = [];

  // Default exclusions for expected/handled errors
  const defaultExclusions = [
    /Download the React DevTools/i,
    /React does not recognize the/i,
    /Warning: Each child in a list should have/i,
    /Failed to load resource.*favicon/i,
    /Source map warning/i,
    /\[HMR\]/i,
    /hot.*reload/i,
    /@fs/i, // Vite dev server
    /WebSocket connection/i, // Dev server
    /Compiled successfully/i,
    /Download the Apollo DevTools/i,
  ];

  const allExclusions = [...defaultExclusions, ...excludePatterns];

  const isExcluded = (msg: string): boolean => {
    return allExclusions.some((pattern) => pattern.test(msg));
  };

  // Pattern 1: Playwright console listener output
  // Format: console.error: Error message here
  // Or: console.error Error message here
  const lines = output.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // console.error pattern
    const errorMatch = trimmed.match(/^console\.error[:\s]+(.+)/i);
    if (errorMatch) {
      const message = errorMatch[1].trim();
      if (!isExcluded(message) && !errors.find((e) => e.message === message)) {
        errors.push({ type: 'error', message });
      }
    }

    // console.warn pattern
    const warnMatch = trimmed.match(/^console\.warn[:\s]+(.+)/i);
    if (warnMatch) {
      const message = warnMatch[1].trim();
      if (!isExcluded(message) && !warnings.find((w) => w.message === message)) {
        warnings.push({ type: 'warn', message });
      }
    }

    // Uncaught exception pattern
    const uncaughtMatch = trimmed.match(/^(?:Uncaught|unhandled)\s+(?:Error|Exception|TypeError|ReferenceError)[:\s]+(.+)/i);
    if (uncaughtMatch) {
      const message = uncaughtMatch[1].trim();
      if (!isExcluded(message) && !uncaughtExceptions.find((e) => e.message === message)) {
        uncaughtExceptions.push({ type: 'uncaught', message });
      }
    }
  }

  let match;

  // Pattern 4: Page error event (Playwright)
  const pageErrorPattern = /page\.on\(['"](?:page)?error['"]\).*?[:\s]+(.+?)(?=\n|$)/gi;
  while ((match = pageErrorPattern.exec(output)) !== null) {
    const message = match[1].trim();
    if (!isExcluded(message)) {
      errors.push({ type: 'error', message, source: 'page' });
    }
  }

  // Pattern 5: React error boundaries
  const errorBoundaryPattern = /Error\s+caught\s+by\s+(?:Error\s*)?Boundary[:\s]+(.+?)(?=\n|$)/gi;
  while ((match = errorBoundaryPattern.exec(output)) !== null) {
    const message = match[1].trim();
    if (!isExcluded(message)) {
      errors.push({ type: 'error', message, source: 'ErrorBoundary' });
    }
  }

  // Pattern 6: General "Error:" in page console (Playwright traces)
  const traceErrorPattern = /\[page\].*?Error:\s*(.+?)(?=\n|$)/gi;
  while ((match = traceErrorPattern.exec(output)) !== null) {
    const message = match[1].trim();
    if (!isExcluded(message) && !errors.find((e) => e.message === message)) {
      errors.push({ type: 'error', message, source: 'page' });
    }
  }

  return {
    errors,
    warnings,
    uncaughtExceptions,
    total: errors.length + uncaughtExceptions.length,
  };
}

/**
 * Check if console errors should block completion
 *
 * @param result - Console error parsing result
 * @param config - Configuration
 * @returns Whether to block and reason
 */
export function shouldBlockOnConsoleErrors(
  result: ConsoleErrorResult,
  config: {
    blockOnErrors?: boolean;
    blockOnUncaught?: boolean;
    maxErrors?: number;
  } = {}
): { block: boolean; reason: string } {
  const { blockOnErrors = true, blockOnUncaught = true, maxErrors = 0 } = config;

  if (blockOnUncaught && result.uncaughtExceptions.length > 0) {
    return {
      block: true,
      reason: `${result.uncaughtExceptions.length} uncaught exception(s) in browser console`,
    };
  }

  if (blockOnErrors && result.errors.length > 0) {
    return {
      block: true,
      reason: `${result.errors.length} console error(s) in browser`,
    };
  }

  if (maxErrors > 0 && result.total > maxErrors) {
    return {
      block: true,
      reason: `${result.total} console errors exceed limit of ${maxErrors}`,
    };
  }

  return { block: false, reason: 'No blocking console errors' };
}

// ============================================================================
// UI STATE COVERAGE (Phase 6 - UI/UX Quality Gates)
// ============================================================================

/**
 * UI state coverage tracking
 */
export interface UIStateCoverage {
  loadingStates: { detected: boolean; tested: boolean; examples: string[] };
  errorStates: { detected: boolean; tested: boolean; examples: string[] };
  emptyStates: { detected: boolean; tested: boolean; examples: string[] };
}

/**
 * Parse test output for UI state coverage
 *
 * Detects if tests cover:
 * - Loading states (spinners, skeletons)
 * - Error states (error boundaries, 404, 500)
 * - Empty states (no data, no results)
 *
 * @param output - Test output
 * @returns UI state coverage analysis
 */
export function parseUIStateCoverage(output: string): UIStateCoverage {
  // Loading state patterns
  const loadingPatterns = [
    /loading|spinner|skeleton|shimmer/i,
    /isLoading|isLoaded|setLoading/i,
    /getByRole\(['"]?status['"]?\)/i,
    /aria-busy/i,
    /Suspense|lazy/i,
  ];

  // Error state patterns
  const errorPatterns = [
    /error.?boundary|error.?state|error.?message/i,
    /404|not.?found/i,
    /500|server.?error|internal.?server/i,
    /something.?went.?wrong/i,
    /try.?again/i,
    /onError|handleError|catchError/i,
  ];

  // Empty state patterns
  const emptyPatterns = [
    /empty.?state|no.?data|no.?results/i,
    /nothing.?here|nothing.?found/i,
    /no.?items|no.?entries/i,
    /list.?is.?empty/i,
    /get.?started|add.?first/i,
  ];

  const findExamples = (patterns: RegExp[]): string[] => {
    const examples: string[] = [];
    for (const pattern of patterns) {
      const match = output.match(new RegExp(`(.{0,30}${pattern.source}.{0,30})`, 'gi'));
      if (match) {
        examples.push(...match.slice(0, 2).map((m) => m.trim()));
      }
    }
    return [...new Set(examples)].slice(0, 3);
  };

  const hasPattern = (patterns: RegExp[]): boolean => {
    return patterns.some((p) => p.test(output));
  };

  // Check if patterns appear in test assertions (vs just code)
  const isInTest = (patterns: RegExp[]): boolean => {
    const testContext = /expect|assert|should|toBe|toEqual|toContain|toHave/i;
    const lines = output.split('\n');
    return lines.some((line) => {
      const hasTestAssertion = testContext.test(line);
      const hasPattern = patterns.some((p) => p.test(line));
      return hasTestAssertion && hasPattern;
    });
  };

  return {
    loadingStates: {
      detected: hasPattern(loadingPatterns),
      tested: isInTest(loadingPatterns),
      examples: findExamples(loadingPatterns),
    },
    errorStates: {
      detected: hasPattern(errorPatterns),
      tested: isInTest(errorPatterns),
      examples: findExamples(errorPatterns),
    },
    emptyStates: {
      detected: hasPattern(emptyPatterns),
      tested: isInTest(emptyPatterns),
      examples: findExamples(emptyPatterns),
    },
  };
}

/**
 * Generate UI state coverage report
 *
 * @param coverage - UI state coverage data
 * @returns Formatted report (warnings only, doesn't block)
 */
export function generateUIStateReport(coverage: UIStateCoverage): string {
  const lines: string[] = [];
  const warnings: string[] = [];

  lines.push('🎨 UI State Coverage');
  lines.push('─'.repeat(40));

  // Helper to format state status
  function formatStateStatus(
    state: { tested: boolean; detected: boolean },
    name: string,
    hint: string
  ): void {
    let status: string;
    let label: string;
    if (state.tested) {
      status = '✅';
      label = 'Tested';
    } else if (state.detected) {
      status = '⚠️';
      label = 'Detected but not tested';
      warnings.push(hint);
    } else {
      status = '❓';
      label = 'Not detected';
    }
    lines.push(`${status} ${name}: ${label}`);
  }

  formatStateStatus(coverage.loadingStates, 'Loading States', 'Consider adding tests for loading states (spinners, skeletons)');
  formatStateStatus(coverage.errorStates, 'Error States  ', 'Consider adding tests for error states (404, 500, error boundaries)');
  formatStateStatus(coverage.emptyStates, 'Empty States  ', 'Consider adding tests for empty states (no data, no results)');

  lines.push('');

  if (warnings.length > 0) {
    lines.push('💡 Recommendations:');
    for (const warning of warnings) {
      lines.push(`   • ${warning}`);
    }
  } else {
    lines.push('✅ UI state coverage looks good!');
  }

  return lines.join('\n');
}
