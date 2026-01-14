/**
 * Route Extractor
 *
 * Extracts routes from various frontend frameworks (Next.js, React Router, etc.).
 *
 * @module core/auto/e2e-coverage/route-extractor
 * @since v1.0.115
 */

import * as fs from 'fs';
import * as path from 'path';
import type { FrameworkType } from './types.js';

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
