/**
 * Tests for E2E Coverage Manifest module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
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
  // Phase 6 - Accessibility
  hasAxeInstalled,
  parseAccessibilityResults,
  shouldBlockOnAccessibility,
  generateAccessibilityReport,
  // Phase 6 - Console Errors
  parseConsoleErrors,
  shouldBlockOnConsoleErrors,
  // Phase 6 - UI State Coverage
  parseUIStateCoverage,
  generateUIStateReport,
} from '../../../../src/core/auto/e2e-coverage.js';

describe('e2e-coverage', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-coverage-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('detectFramework', () => {
    it('should detect Next.js Pages Router', () => {
      fs.writeFileSync(path.join(testDir, 'next.config.js'), 'module.exports = {}');
      fs.mkdirSync(path.join(testDir, 'pages'), { recursive: true });

      expect(detectFramework(testDir)).toBe('nextjs-pages');
    });

    it('should detect Next.js App Router', () => {
      fs.writeFileSync(path.join(testDir, 'next.config.mjs'), 'export default {}');
      fs.mkdirSync(path.join(testDir, 'app'), { recursive: true });

      expect(detectFramework(testDir)).toBe('nextjs-app');
    });

    it('should detect Next.js App Router in src/', () => {
      fs.writeFileSync(path.join(testDir, 'next.config.ts'), '{}');
      fs.mkdirSync(path.join(testDir, 'src/app'), { recursive: true });

      expect(detectFramework(testDir)).toBe('nextjs-app');
    });

    it('should detect React Router from package.json', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            'react-router-dom': '^6.0.0',
          },
        })
      );

      expect(detectFramework(testDir)).toBe('react-router');
    });

    it('should detect Remix', () => {
      fs.writeFileSync(path.join(testDir, 'remix.config.js'), 'module.exports = {}');

      expect(detectFramework(testDir)).toBe('remix');
    });

    it('should detect SvelteKit', () => {
      fs.writeFileSync(path.join(testDir, 'svelte.config.js'), 'module.exports = {}');

      expect(detectFramework(testDir)).toBe('svelte-kit');
    });

    it('should detect Nuxt/Vue', () => {
      fs.writeFileSync(path.join(testDir, 'nuxt.config.ts'), 'export default {}');

      expect(detectFramework(testDir)).toBe('vue-router');
    });

    it('should return unknown for unrecognized project', () => {
      expect(detectFramework(testDir)).toBe('unknown');
    });
  });

  describe('extractRoutes - Next.js Pages Router', () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(testDir, 'next.config.js'), 'module.exports = {}');
    });

    it('should extract basic routes', () => {
      const pagesDir = path.join(testDir, 'pages');
      fs.mkdirSync(pagesDir, { recursive: true });
      fs.writeFileSync(path.join(pagesDir, 'index.tsx'), '');
      fs.writeFileSync(path.join(pagesDir, 'about.tsx'), '');
      fs.writeFileSync(path.join(pagesDir, 'contact.tsx'), '');

      const routes = extractRoutes(testDir, 'nextjs-pages');

      expect(routes).toContain('/');
      expect(routes).toContain('/about');
      expect(routes).toContain('/contact');
    });

    it('should extract nested routes', () => {
      const pagesDir = path.join(testDir, 'pages');
      fs.mkdirSync(path.join(pagesDir, 'blog'), { recursive: true });
      fs.writeFileSync(path.join(pagesDir, 'index.tsx'), '');
      fs.writeFileSync(path.join(pagesDir, 'blog/index.tsx'), '');
      fs.writeFileSync(path.join(pagesDir, 'blog/post.tsx'), '');

      const routes = extractRoutes(testDir, 'nextjs-pages');

      expect(routes).toContain('/');
      expect(routes).toContain('/blog');
      expect(routes).toContain('/blog/post');
    });

    it('should handle dynamic routes', () => {
      const pagesDir = path.join(testDir, 'pages');
      fs.mkdirSync(path.join(pagesDir, 'blog'), { recursive: true });
      fs.writeFileSync(path.join(pagesDir, 'blog/[slug].tsx'), '');
      fs.writeFileSync(path.join(pagesDir, '[id].tsx'), '');

      const routes = extractRoutes(testDir, 'nextjs-pages');

      expect(routes).toContain('/blog/:slug');
      expect(routes).toContain('/:id');
    });

    it('should skip API routes and internal files', () => {
      const pagesDir = path.join(testDir, 'pages');
      fs.mkdirSync(path.join(pagesDir, 'api'), { recursive: true });
      fs.writeFileSync(path.join(pagesDir, 'index.tsx'), '');
      fs.writeFileSync(path.join(pagesDir, '_app.tsx'), '');
      fs.writeFileSync(path.join(pagesDir, '_document.tsx'), '');
      fs.writeFileSync(path.join(pagesDir, 'api/users.ts'), '');

      const routes = extractRoutes(testDir, 'nextjs-pages');

      expect(routes).toContain('/');
      expect(routes).not.toContain('/api/users');
      expect(routes).not.toContain('/_app');
      expect(routes).not.toContain('/_document');
    });
  });

  describe('extractRoutes - Next.js App Router', () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(testDir, 'next.config.js'), 'module.exports = {}');
    });

    it('should extract routes from app directory', () => {
      const appDir = path.join(testDir, 'app');
      fs.mkdirSync(path.join(appDir, 'about'), { recursive: true });
      fs.writeFileSync(path.join(appDir, 'page.tsx'), '');
      fs.writeFileSync(path.join(appDir, 'about/page.tsx'), '');

      const routes = extractRoutes(testDir, 'nextjs-app');

      expect(routes).toContain('/');
      expect(routes).toContain('/about');
    });

    it('should handle route groups', () => {
      const appDir = path.join(testDir, 'app');
      fs.mkdirSync(path.join(appDir, '(marketing)/about'), { recursive: true });
      fs.mkdirSync(path.join(appDir, '(app)/dashboard'), { recursive: true });
      fs.writeFileSync(path.join(appDir, '(marketing)/about/page.tsx'), '');
      fs.writeFileSync(path.join(appDir, '(app)/dashboard/page.tsx'), '');

      const routes = extractRoutes(testDir, 'nextjs-app');

      expect(routes).toContain('/about');
      expect(routes).toContain('/dashboard');
    });

    it('should handle dynamic segments', () => {
      const appDir = path.join(testDir, 'app');
      fs.mkdirSync(path.join(appDir, 'blog/[slug]'), { recursive: true });
      fs.writeFileSync(path.join(appDir, 'blog/[slug]/page.tsx'), '');

      const routes = extractRoutes(testDir, 'nextjs-app');

      expect(routes).toContain('/blog/:slug');
    });
  });

  describe('loadManualRoutes', () => {
    it('should load routes from routes.json', () => {
      fs.writeFileSync(
        path.join(testDir, 'routes.json'),
        JSON.stringify({ routes: ['/', '/about', '/contact'] })
      );

      const routes = loadManualRoutes(testDir);

      expect(routes).toEqual(['/', '/about', '/contact']);
    });

    it('should load routes from .specweave/routes.json', () => {
      fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, '.specweave/routes.json'),
        JSON.stringify(['/', '/dashboard', '/settings'])
      );

      const routes = loadManualRoutes(testDir);

      expect(routes).toEqual(['/', '/dashboard', '/settings']);
    });

    it('should return null if no routes file exists', () => {
      const routes = loadManualRoutes(testDir);
      expect(routes).toBeNull();
    });

    it('should prefer .specweave/routes.json over root routes.json', () => {
      fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'routes.json'), JSON.stringify(['/', '/root']));
      fs.writeFileSync(
        path.join(testDir, '.specweave/routes.json'),
        JSON.stringify(['/', '/specweave'])
      );

      const routes = loadManualRoutes(testDir);

      expect(routes).toEqual(['/', '/specweave']);
    });
  });

  describe('generateCoverageManifest', () => {
    it('should generate manifest from auto-detected routes', () => {
      const pagesDir = path.join(testDir, 'pages');
      fs.mkdirSync(pagesDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'next.config.js'), 'module.exports = {}');
      fs.writeFileSync(path.join(pagesDir, 'index.tsx'), '');
      fs.writeFileSync(path.join(pagesDir, 'about.tsx'), '');

      const manifest = generateCoverageManifest(testDir);

      expect(manifest.routes['/']).toBeDefined();
      expect(manifest.routes['/about']).toBeDefined();
      expect(manifest.routes['/'].tested).toBe(false);
      expect(manifest.framework).toBe('nextjs-pages');
      expect(manifest.coverage.routes).toBe(0);
    });

    it('should use manual routes when provided', () => {
      fs.writeFileSync(
        path.join(testDir, 'routes.json'),
        JSON.stringify(['/', '/custom', '/manual'])
      );

      const manifest = generateCoverageManifest(testDir);

      expect(manifest.routes['/']).toBeDefined();
      expect(manifest.routes['/custom']).toBeDefined();
      expect(manifest.routes['/manual']).toBeDefined();
    });

    it('should initialize all routes as untested', () => {
      fs.writeFileSync(path.join(testDir, 'routes.json'), JSON.stringify(['/', '/about']));

      const manifest = generateCoverageManifest(testDir);

      expect(Object.values(manifest.routes).every((r) => !r.tested)).toBe(true);
    });
  });

  describe('saveManifest / loadManifest', () => {
    it('should save and load manifest', () => {
      const manifest = generateCoverageManifest(testDir);
      manifest.routes['/'] = { path: '/', tested: true, viewports: ['desktop'] };

      saveManifest(testDir, manifest);
      const loaded = loadManifest(testDir);

      expect(loaded).not.toBeNull();
      expect(loaded!.routes['/']).toEqual({ path: '/', tested: true, viewports: ['desktop'] });
    });

    it('should return null when no manifest exists', () => {
      const loaded = loadManifest(testDir);
      expect(loaded).toBeNull();
    });
  });

  describe('updateRouteCoverage', () => {
    it('should update route as tested', () => {
      const manifest = generateCoverageManifest(testDir);
      manifest.routes['/'] = { path: '/', tested: false, viewports: [] };

      const updated = updateRouteCoverage(manifest, '/');

      expect(updated.routes['/'].tested).toBe(true);
    });

    it('should add viewport coverage', () => {
      const manifest = generateCoverageManifest(testDir);
      manifest.routes['/'] = { path: '/', tested: false, viewports: [] };

      const updated = updateRouteCoverage(manifest, '/', ['mobile', 'desktop']);

      expect(updated.routes['/'].viewports).toContain('mobile');
      expect(updated.routes['/'].viewports).toContain('desktop');
    });

    it('should update viewport coverage flags', () => {
      const manifest = generateCoverageManifest(testDir);
      manifest.routes['/'] = { path: '/', tested: false, viewports: [] };

      const updated = updateRouteCoverage(manifest, '/', ['mobile', 'tablet']);

      expect(updated.viewportsCovered.mobile).toBe(true);
      expect(updated.viewportsCovered.tablet).toBe(true);
      expect(updated.viewportsCovered.desktop).toBe(false);
    });

    it('should not duplicate viewports', () => {
      const manifest = generateCoverageManifest(testDir);
      manifest.routes['/'] = { path: '/', tested: true, viewports: ['mobile'] };

      const updated = updateRouteCoverage(manifest, '/', ['mobile', 'desktop']);

      expect(updated.routes['/'].viewports).toHaveLength(2);
      expect(updated.routes['/'].viewports).toContain('mobile');
      expect(updated.routes['/'].viewports).toContain('desktop');
    });
  });

  describe('calculateCoverage', () => {
    it('should calculate route coverage percentage', () => {
      const manifest = generateCoverageManifest(testDir);
      manifest.routes['/'] = { path: '/', tested: true, viewports: [] };
      manifest.routes['/about'] = { path: '/about', tested: false, viewports: [] };

      const coverage = calculateCoverage(manifest);

      expect(coverage.routes).toBe(50);
    });

    it('should calculate viewport coverage percentage', () => {
      const manifest = generateCoverageManifest(testDir);
      manifest.viewportsCovered = { mobile: true, tablet: false, desktop: true };

      const coverage = calculateCoverage(manifest);

      expect(coverage.viewports).toBe(67); // 2/3 = 66.67% rounded
    });

    it('should return 0 for empty routes', () => {
      const manifest = generateCoverageManifest(testDir);

      const coverage = calculateCoverage(manifest);

      expect(coverage.routes).toBe(0);
    });
  });

  describe('getUntestedRoutes', () => {
    it('should return untested routes', () => {
      const manifest = generateCoverageManifest(testDir);
      manifest.routes['/'] = { path: '/', tested: true, viewports: [] };
      manifest.routes['/about'] = { path: '/about', tested: false, viewports: [] };
      manifest.routes['/contact'] = { path: '/contact', tested: false, viewports: [] };

      const untested = getUntestedRoutes(manifest);

      expect(untested).toHaveLength(2);
      expect(untested).toContain('/about');
      expect(untested).toContain('/contact');
    });
  });

  describe('getRoutesWithMissingViewports', () => {
    it('should return routes missing viewport coverage', () => {
      const manifest = generateCoverageManifest(testDir);
      manifest.routes['/'] = { path: '/', tested: true, viewports: ['mobile', 'desktop'] };
      manifest.routes['/about'] = { path: '/about', tested: true, viewports: ['mobile'] };
      manifest.routes['/contact'] = { path: '/contact', tested: false, viewports: [] };

      const missing = getRoutesWithMissingViewports(manifest);

      expect(missing).toHaveLength(2);
      expect(missing.find((m) => m.route === '/')?.missingViewports).toContain('tablet');
      expect(missing.find((m) => m.route === '/about')?.missingViewports).toEqual([
        'tablet',
        'desktop',
      ]);
    });

    it('should not include untested routes', () => {
      const manifest = generateCoverageManifest(testDir);
      manifest.routes['/'] = { path: '/', tested: false, viewports: [] };

      const missing = getRoutesWithMissingViewports(manifest);

      expect(missing).toHaveLength(0);
    });
  });

  describe('parseRouteVisits', () => {
    it('should parse page.goto() calls with single quotes', () => {
      const output = `
        [chromium] › tests/auth.spec.ts:10
        page.goto('http://localhost:3000/login')
        page.goto('/dashboard')
      `;

      const visits = parseRouteVisits(output);

      expect(visits).toHaveLength(2);
      expect(visits[0].route).toBe('/login');
      expect(visits[1].route).toBe('/dashboard');
    });

    it('should parse page.goto() calls with double quotes', () => {
      const output = `
        page.goto("http://localhost:3000/products")
        page.goto("/checkout")
      `;

      const visits = parseRouteVisits(output);

      expect(visits).toHaveLength(2);
      expect(visits[0].route).toBe('/products');
      expect(visits[1].route).toBe('/checkout');
    });

    it('should detect viewport from project indicator', () => {
      const output = `
        [Mobile Safari] › tests/mobile.spec.ts:5
        page.goto('/home')
        [chromium] › tests/desktop.spec.ts:5
        page.goto('/home')
      `;

      const visits = parseRouteVisits(output);

      expect(visits).toHaveLength(2);
      expect(visits[0].viewport).toBe('mobile');
      expect(visits[1].viewport).toBe('desktop');
    });

    it('should skip API routes', () => {
      const output = `
        page.goto('/login')
        page.goto('/api/users')
        page.goto('/api/auth')
        page.goto('/dashboard')
      `;

      const visits = parseRouteVisits(output);

      expect(visits).toHaveLength(2);
      expect(visits.map((v) => v.route)).toEqual(['/login', '/dashboard']);
    });

    it('should remove query strings from routes', () => {
      const output = `
        page.goto('/products?category=electronics&sort=price')
        page.goto('http://localhost:3000/search?q=test')
      `;

      const visits = parseRouteVisits(output);

      expect(visits).toHaveLength(2);
      expect(visits[0].route).toBe('/products');
      expect(visits[1].route).toBe('/search');
    });

    it('should parse navigating to patterns', () => {
      const output = `
        navigating to "/login"
        navigating to 'http://localhost:3000/dashboard'
      `;

      const visits = parseRouteVisits(output);

      expect(visits).toHaveLength(2);
      expect(visits[0].route).toBe('/login');
      expect(visits[1].route).toBe('/dashboard');
    });

    it('should deduplicate routes per viewport', () => {
      const output = `
        [chromium] › test1.spec.ts
        page.goto('/login')
        page.goto('/login')
        page.goto('/login')
      `;

      const visits = parseRouteVisits(output);

      expect(visits).toHaveLength(1);
      expect(visits[0].route).toBe('/login');
    });

    it('should allow same route on different viewports', () => {
      const output = `
        [Mobile Safari] › mobile.spec.ts
        page.goto('/login')
        [chromium] › desktop.spec.ts
        page.goto('/login')
      `;

      const visits = parseRouteVisits(output);

      expect(visits).toHaveLength(2);
      expect(visits[0].viewport).toBe('mobile');
      expect(visits[1].viewport).toBe('desktop');
    });
  });

  describe('matchRouteToManifest', () => {
    it('should match exact routes', () => {
      const manifestRoutes = ['/', '/about', '/contact'];

      expect(matchRouteToManifest('/about', manifestRoutes)).toBe('/about');
      expect(matchRouteToManifest('/', manifestRoutes)).toBe('/');
    });

    it('should match dynamic routes', () => {
      const manifestRoutes = ['/', '/products/:id', '/users/:userId/posts/:postId'];

      expect(matchRouteToManifest('/products/123', manifestRoutes)).toBe('/products/:id');
      expect(matchRouteToManifest('/users/42/posts/99', manifestRoutes)).toBe('/users/:userId/posts/:postId');
    });

    it('should return null for unmatched routes', () => {
      const manifestRoutes = ['/', '/about'];

      expect(matchRouteToManifest('/contact', manifestRoutes)).toBeNull();
    });

    it('should prefer exact match over dynamic', () => {
      const manifestRoutes = ['/products/featured', '/products/:id'];

      expect(matchRouteToManifest('/products/featured', manifestRoutes)).toBe('/products/featured');
    });
  });

  describe('trackRouteCoverage', () => {
    beforeEach(() => {
      // Create a routes.json for testing
      fs.writeFileSync(
        path.join(testDir, 'routes.json'),
        JSON.stringify(['/', '/login', '/dashboard', '/products/:id'])
      );
    });

    it('should track visited routes', () => {
      const output = `
        [chromium] › tests/auth.spec.ts:10
        page.goto('/login')
        page.goto('/dashboard')
      `;

      const result = trackRouteCoverage(testDir, output);

      expect(result.newlyTested).toContain('/login');
      expect(result.newlyTested).toContain('/dashboard');
      expect(result.manifest.routes['/login'].tested).toBe(true);
      expect(result.manifest.routes['/dashboard'].tested).toBe(true);
    });

    it('should track viewport coverage', () => {
      const output = `
        [Mobile Safari] › mobile.spec.ts
        page.goto('/login')
      `;

      const result = trackRouteCoverage(testDir, output);

      expect(result.viewportUpdates).toContainEqual({ route: '/login', viewport: 'mobile' });
      expect(result.manifest.routes['/login'].viewports).toContain('mobile');
      expect(result.manifest.viewportsCovered.mobile).toBe(true);
    });

    it('should persist updated manifest', () => {
      const output = `page.goto('/login')`;

      trackRouteCoverage(testDir, output);

      const loaded = loadManifest(testDir);
      expect(loaded).not.toBeNull();
      expect(loaded!.routes['/login'].tested).toBe(true);
    });

    it('should match dynamic routes to manifest', () => {
      const output = `page.goto('/products/12345')`;

      const result = trackRouteCoverage(testDir, output);

      expect(result.newlyTested).toContain('/products/:id');
      expect(result.manifest.routes['/products/:id'].tested).toBe(true);
    });

    it('should use custom base URL', () => {
      const output = `page.goto('https://myapp.com/login')`;

      const result = trackRouteCoverage(testDir, output, { baseUrl: 'https://myapp.com' });

      expect(result.newlyTested).toContain('/login');
    });
  });

  describe('parseViewportFromProject', () => {
    it('should detect mobile projects', () => {
      expect(parseViewportFromProject('Mobile Safari')).toBe('mobile');
      expect(parseViewportFromProject('Mobile Chrome')).toBe('mobile');
      expect(parseViewportFromProject('iPhone 12')).toBe('mobile');
      expect(parseViewportFromProject('Pixel 5')).toBe('mobile');
      expect(parseViewportFromProject('webkit')).toBe('mobile');
    });

    it('should detect tablet projects', () => {
      expect(parseViewportFromProject('iPad')).toBe('tablet');
      expect(parseViewportFromProject('tablet')).toBe('tablet');
      expect(parseViewportFromProject('iPad Pro')).toBe('tablet');
    });

    it('should detect desktop projects', () => {
      expect(parseViewportFromProject('chromium')).toBe('desktop');
      expect(parseViewportFromProject('firefox')).toBe('desktop');
      expect(parseViewportFromProject('Desktop Chrome')).toBe('desktop');
    });
  });

  describe('generateCoverageReport', () => {
    it('should generate formatted report', () => {
      const manifest = generateCoverageManifest(testDir);
      manifest.routes['/'] = { path: '/', tested: true, viewports: ['mobile', 'desktop'] };
      manifest.routes['/about'] = { path: '/about', tested: false, viewports: [] };
      manifest.viewportsCovered = { mobile: true, tablet: false, desktop: true };
      manifest.coverage = calculateCoverage(manifest);

      const report = generateCoverageReport(manifest);

      expect(report).toContain('E2E Coverage Report');
      expect(report).toContain('Routes:    50%');
      expect(report).toContain('Viewports: 67%');
      expect(report).toContain('Untested Routes:');
      expect(report).toContain('/about');
      expect(report).toContain('Mobile:  ✅');
      expect(report).toContain('Tablet:  ❌');
    });

    it('should report incomplete viewport coverage', () => {
      const manifest = generateCoverageManifest(testDir);
      manifest.routes['/'] = { path: '/', tested: true, viewports: ['mobile'] };
      manifest.coverage = calculateCoverage(manifest);

      const report = generateCoverageReport(manifest);

      expect(report).toContain('Incomplete Viewport Coverage');
      expect(report).toContain('missing: tablet, desktop');
    });
  });

  describe('parsePlaywrightConfig', () => {
    it('should parse config with explicit viewport widths', () => {
      fs.writeFileSync(
        path.join(testDir, 'playwright.config.ts'),
        `
        export default {
          projects: [
            { name: 'Mobile Chrome', use: { viewport: { width: 375, height: 667 } } },
            { name: 'Tablet', use: { viewport: { width: 768, height: 1024 } } },
            { name: 'Desktop', use: { viewport: { width: 1280, height: 720 } } },
          ]
        };
        `
      );

      const config = parsePlaywrightConfig(testDir);

      expect(config.viewports.mobile).toBe(true);
      expect(config.viewports.tablet).toBe(true);
      expect(config.viewports.desktop).toBe(true);
      expect(config.projects).toHaveLength(3);
    });

    it('should parse config with device names', () => {
      fs.writeFileSync(
        path.join(testDir, 'playwright.config.ts'),
        `
        import { devices } from '@playwright/test';
        export default {
          projects: [
            { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
            { name: 'mobile', use: { ...devices['iPhone 12'] } },
          ]
        };
        `
      );

      const config = parsePlaywrightConfig(testDir);

      expect(config.viewports.desktop).toBe(true);
      expect(config.viewports.mobile).toBe(true);
    });

    it('should parse config with project names indicating viewport', () => {
      fs.writeFileSync(
        path.join(testDir, 'playwright.config.js'),
        `
        module.exports = {
          projects: [
            { name: 'chromium' },
            { name: 'webkit' },
            { name: 'firefox' },
          ]
        };
        `
      );

      const config = parsePlaywrightConfig(testDir);

      expect(config.viewports.desktop).toBe(true);
      expect(config.viewports.mobile).toBe(true); // webkit = mobile
    });

    it('should return empty config when no playwright config exists', () => {
      const config = parsePlaywrightConfig(testDir);

      expect(config.projects).toHaveLength(0);
      expect(config.viewports.mobile).toBe(false);
      expect(config.viewports.tablet).toBe(false);
      expect(config.viewports.desktop).toBe(false);
    });
  });

  describe('getRequiredViewports', () => {
    it('should return viewports from playwright config', () => {
      fs.writeFileSync(
        path.join(testDir, 'playwright.config.ts'),
        `
        export default {
          projects: [
            { name: 'Mobile', use: { viewport: { width: 375, height: 667 } } },
            { name: 'Desktop', use: { viewport: { width: 1280, height: 720 } } },
          ]
        };
        `
      );

      const required = getRequiredViewports(testDir);

      expect(required).toContain('mobile');
      expect(required).toContain('desktop');
      expect(required).not.toContain('tablet');
    });

    it('should return all viewports as default when no config', () => {
      const required = getRequiredViewports(testDir);

      expect(required).toEqual(['mobile', 'tablet', 'desktop']);
    });
  });

  describe('checkViewportCoverage', () => {
    it('should report complete coverage', () => {
      fs.writeFileSync(
        path.join(testDir, 'playwright.config.ts'),
        `
        export default {
          projects: [
            { name: 'Mobile', use: { viewport: { width: 375, height: 667 } } },
            { name: 'Desktop', use: { viewport: { width: 1280, height: 720 } } },
          ]
        };
        `
      );

      const manifest = generateCoverageManifest(testDir);
      manifest.viewportsCovered = { mobile: true, tablet: false, desktop: true };

      const result = checkViewportCoverage(manifest, testDir);

      expect(result.complete).toBe(true);
      expect(result.covered).toEqual(['mobile', 'desktop']);
      expect(result.missing).toHaveLength(0);
    });

    it('should report missing viewports', () => {
      fs.writeFileSync(
        path.join(testDir, 'playwright.config.ts'),
        `
        export default {
          projects: [
            { name: 'Mobile', use: { viewport: { width: 375, height: 667 } } },
            { name: 'Tablet', use: { viewport: { width: 768, height: 1024 } } },
            { name: 'Desktop', use: { viewport: { width: 1280, height: 720 } } },
          ]
        };
        `
      );

      const manifest = generateCoverageManifest(testDir);
      manifest.viewportsCovered = { mobile: true, tablet: false, desktop: false };

      const result = checkViewportCoverage(manifest, testDir);

      expect(result.complete).toBe(false);
      expect(result.missing).toContain('tablet');
      expect(result.missing).toContain('desktop');
    });
  });

  // =========================================================================
  // Phase 6 - Accessibility Audit Tests
  // =========================================================================

  describe('hasAxeInstalled', () => {
    it('should detect @axe-core/playwright', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          devDependencies: {
            '@axe-core/playwright': '^4.0.0',
          },
        })
      );

      expect(hasAxeInstalled(testDir)).toBe(true);
    });

    it('should detect jest-axe', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          devDependencies: {
            'jest-axe': '^8.0.0',
          },
        })
      );

      expect(hasAxeInstalled(testDir)).toBe(true);
    });

    it('should detect axe-core in dependencies', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            'axe-core': '^4.0.0',
          },
        })
      );

      expect(hasAxeInstalled(testDir)).toBe(true);
    });

    it('should return false when no axe packages installed', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            react: '^18.0.0',
          },
        })
      );

      expect(hasAxeInstalled(testDir)).toBe(false);
    });

    it('should return false when no package.json', () => {
      expect(hasAxeInstalled(testDir)).toBe(false);
    });
  });

  describe('parseAccessibilityResults', () => {
    it('should detect axe-core audit ran', () => {
      const output = `
        Running accessibility check with axe-core
        2 accessibility violations found
      `;

      const result = parseAccessibilityResults(output);

      expect(result.auditRan).toBe(true);
    });

    it('should parse impact levels from violations', () => {
      const output = `
        axe-core audit results:
        impact: critical, description: Images must have alternate text
        impact: serious, description: Document must have lang attribute
        impact: moderate, description: Landmarks should have unique roles
      `;

      const result = parseAccessibilityResults(output);

      // At least 3 violations parsed from the impact patterns
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
      expect(result.summary.critical).toBeGreaterThanOrEqual(1);
      expect(result.summary.serious).toBeGreaterThanOrEqual(1);
      expect(result.summary.moderate).toBeGreaterThanOrEqual(1);
    });

    it('should detect common violation messages', () => {
      const output = `
        Error: Images must have alt text
        Color contrast ratio is insufficient
        Form elements must have labels
      `;

      const result = parseAccessibilityResults(output);

      expect(result.violations.find((v) => v.id === 'image-alt')).toBeDefined();
      expect(result.violations.find((v) => v.id === 'color-contrast')).toBeDefined();
      expect(result.violations.find((v) => v.id === 'label')).toBeDefined();
    });

    it('should parse Playwright accessibility assertion', () => {
      const output = `
        expected page to have no accessibility violations
        but found 3 violations
      `;

      const result = parseAccessibilityResults(output);

      expect(result.auditRan).toBe(true);
    });

    it('should count passes', () => {
      const output = `
        axe-core results: 45 checks passed, 2 failed
      `;

      const result = parseAccessibilityResults(output);

      expect(result.passes).toBe(45);
    });

    it('should return empty results when no audit ran', () => {
      const output = `
        Running unit tests...
        5 passed, 0 failed
      `;

      const result = parseAccessibilityResults(output);

      expect(result.auditRan).toBe(false);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('shouldBlockOnAccessibility', () => {
    it('should block on critical violations by default', () => {
      const result = {
        hasAxe: true,
        auditRan: true,
        violations: [{ id: 'image-alt', impact: 'critical' as const, description: 'Missing alt' }],
        passes: 10,
        summary: { critical: 1, serious: 0, moderate: 0, minor: 0, total: 1 },
      };

      const blockResult = shouldBlockOnAccessibility(result);

      expect(blockResult.block).toBe(true);
      expect(blockResult.reason).toContain('critical');
    });

    it('should block on serious violations by default', () => {
      const result = {
        hasAxe: true,
        auditRan: true,
        violations: [{ id: 'color-contrast', impact: 'serious' as const, description: 'Low contrast' }],
        passes: 10,
        summary: { critical: 0, serious: 1, moderate: 0, minor: 0, total: 1 },
      };

      const blockResult = shouldBlockOnAccessibility(result);

      expect(blockResult.block).toBe(true);
      expect(blockResult.reason).toContain('serious');
    });

    it('should not block on moderate/minor by default', () => {
      const result = {
        hasAxe: true,
        auditRan: true,
        violations: [{ id: 'region', impact: 'moderate' as const, description: 'Landmark issue' }],
        passes: 10,
        summary: { critical: 0, serious: 0, moderate: 1, minor: 0, total: 1 },
      };

      const blockResult = shouldBlockOnAccessibility(result);

      expect(blockResult.block).toBe(false);
    });

    it('should not block when no audit ran', () => {
      const result = {
        hasAxe: false,
        auditRan: false,
        violations: [],
        passes: 0,
        summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 },
      };

      const blockResult = shouldBlockOnAccessibility(result);

      expect(blockResult.block).toBe(false);
    });

    it('should respect blockOnSerious=false config', () => {
      const result = {
        hasAxe: true,
        auditRan: true,
        violations: [{ id: 'color-contrast', impact: 'serious' as const, description: 'Low contrast' }],
        passes: 10,
        summary: { critical: 0, serious: 1, moderate: 0, minor: 0, total: 1 },
      };

      const blockResult = shouldBlockOnAccessibility(result, { blockOnSerious: false });

      expect(blockResult.block).toBe(false);
    });
  });

  describe('generateAccessibilityReport', () => {
    it('should generate report with violations', () => {
      const result = {
        hasAxe: true,
        auditRan: true,
        violations: [
          { id: 'image-alt', impact: 'critical' as const, description: 'Images need alt text' },
          { id: 'color-contrast', impact: 'serious' as const, description: 'Contrast too low' },
        ],
        passes: 45,
        summary: { critical: 1, serious: 1, moderate: 0, minor: 0, total: 2 },
      };

      const report = generateAccessibilityReport(result);

      expect(report).toContain('Accessibility Audit Report');
      expect(report).toContain('Critical: 1');
      expect(report).toContain('Serious:  1');
      expect(report).toContain('MUST FIX');
      expect(report).toContain('image-alt');
      expect(report).toContain('FAILED');
    });

    it('should show instructions when no audit ran', () => {
      const result = {
        hasAxe: false,
        auditRan: false,
        violations: [],
        passes: 0,
        summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 },
      };

      const report = generateAccessibilityReport(result);

      expect(report).toContain('No accessibility audit detected');
      expect(report).toContain('@axe-core/playwright');
      expect(report).toContain('injectAxe');
    });

    it('should show passed status when no critical/serious issues', () => {
      const result = {
        hasAxe: true,
        auditRan: true,
        violations: [{ id: 'region', impact: 'minor' as const, description: 'Minor issue' }],
        passes: 50,
        summary: { critical: 0, serious: 0, moderate: 0, minor: 1, total: 1 },
      };

      const report = generateAccessibilityReport(result);

      expect(report).toContain('PASSED');
    });
  });

  // =========================================================================
  // Phase 6 - Console Error Detection Tests
  // =========================================================================

  describe('parseConsoleErrors', () => {
    it('should parse console.error patterns', () => {
      const output = `
        [chromium] › tests/app.spec.ts
        console.error: Failed to fetch user data
        console.error: Network timeout
      `;

      const result = parseConsoleErrors(output);

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain('Failed to fetch user data');
    });

    it('should parse uncaught exceptions', () => {
      const output = `
        Uncaught TypeError: Cannot read property 'map' of undefined
            at Component.render
      `;

      const result = parseConsoleErrors(output);

      expect(result.uncaughtExceptions).toHaveLength(1);
      expect(result.uncaughtExceptions[0].message).toContain('Cannot read property');
    });

    it('should exclude React DevTools message', () => {
      const output = `
        console.error: Download the React DevTools for a better development experience
      `;

      const result = parseConsoleErrors(output);

      expect(result.errors).toHaveLength(0);
    });

    it('should exclude HMR messages', () => {
      const output = `
        console.warn: [HMR] Waiting for update signal
        console.error: [HMR] Something happened
      `;

      const result = parseConsoleErrors(output);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should respect custom exclusions', () => {
      const output = `
        console.error: Expected test error for validation
        console.error: Real error that matters
      `;

      const result = parseConsoleErrors(output, [/Expected test error/i]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Real error');
    });

    it('should calculate total correctly', () => {
      const output = `
        console.error: Error 1
        console.error: Error 2
        Uncaught Error: Exception 1
      `;

      const result = parseConsoleErrors(output);

      expect(result.total).toBe(3);
    });
  });

  describe('shouldBlockOnConsoleErrors', () => {
    it('should block on uncaught exceptions by default', () => {
      const result = {
        errors: [],
        warnings: [],
        uncaughtExceptions: [{ type: 'uncaught' as const, message: 'Uncaught error' }],
        total: 1,
      };

      const blockResult = shouldBlockOnConsoleErrors(result);

      expect(blockResult.block).toBe(true);
      expect(blockResult.reason).toContain('uncaught');
    });

    it('should block on console errors by default', () => {
      const result = {
        errors: [{ type: 'error' as const, message: 'Console error' }],
        warnings: [],
        uncaughtExceptions: [],
        total: 1,
      };

      const blockResult = shouldBlockOnConsoleErrors(result);

      expect(blockResult.block).toBe(true);
      expect(blockResult.reason).toContain('console error');
    });

    it('should not block when no errors', () => {
      const result = {
        errors: [],
        warnings: [{ type: 'warn' as const, message: 'Warning' }],
        uncaughtExceptions: [],
        total: 0,
      };

      const blockResult = shouldBlockOnConsoleErrors(result);

      expect(blockResult.block).toBe(false);
    });

    it('should respect blockOnErrors=false', () => {
      const result = {
        errors: [{ type: 'error' as const, message: 'Error' }],
        warnings: [],
        uncaughtExceptions: [],
        total: 1,
      };

      const blockResult = shouldBlockOnConsoleErrors(result, { blockOnErrors: false });

      expect(blockResult.block).toBe(false);
    });
  });

  // =========================================================================
  // Phase 6 - UI State Coverage Tests
  // =========================================================================

  describe('parseUIStateCoverage', () => {
    it('should detect loading state patterns', () => {
      const output = `
        await page.getByRole('status').waitFor();
        expect(page.locator('.spinner')).toBeVisible();
        expect(skeleton).toBeInTheDocument();
      `;

      const result = parseUIStateCoverage(output);

      expect(result.loadingStates.detected).toBe(true);
    });

    it('should detect error state patterns', () => {
      const output = `
        expect(page.locator('.error-boundary')).toBeVisible();
        await page.goto('/404');
        expect(errorMessage).toHaveText('Something went wrong');
      `;

      const result = parseUIStateCoverage(output);

      expect(result.errorStates.detected).toBe(true);
    });

    it('should detect empty state patterns', () => {
      const output = `
        expect(page.locator('.empty-state')).toBeVisible();
        expect(noResults).toHaveText('No items found');
      `;

      const result = parseUIStateCoverage(output);

      expect(result.emptyStates.detected).toBe(true);
    });

    it('should detect tested states (with assertions)', () => {
      const output = `
        expect(page.locator('.loading')).toBeVisible();
        expect(spinner).toBe(true);
      `;

      const result = parseUIStateCoverage(output);

      expect(result.loadingStates.tested).toBe(true);
    });

    it('should differentiate detected vs tested', () => {
      const output = `
        // Code has loading state
        const loading = true;
        setLoading(false);
        // But no expect/assert on it
      `;

      const result = parseUIStateCoverage(output);

      expect(result.loadingStates.detected).toBe(true);
      expect(result.loadingStates.tested).toBe(false);
    });
  });

  describe('generateUIStateReport', () => {
    it('should show tested states with checkmarks', () => {
      const coverage = {
        loadingStates: { detected: true, tested: true, examples: [] },
        errorStates: { detected: true, tested: true, examples: [] },
        emptyStates: { detected: true, tested: true, examples: [] },
      };

      const report = generateUIStateReport(coverage);

      expect(report).toContain('✅ Loading States');
      expect(report).toContain('✅ Error States');
      expect(report).toContain('✅ Empty States');
      expect(report).toContain('looks good');
    });

    it('should show warnings for detected but not tested', () => {
      const coverage = {
        loadingStates: { detected: true, tested: false, examples: [] },
        errorStates: { detected: true, tested: false, examples: [] },
        emptyStates: { detected: false, tested: false, examples: [] },
      };

      const report = generateUIStateReport(coverage);

      expect(report).toContain('⚠️ Loading States');
      expect(report).toContain('Detected but not tested');
      expect(report).toContain('Recommendations');
      expect(report).toContain('loading states');
    });

    it('should show question mark for not detected', () => {
      const coverage = {
        loadingStates: { detected: false, tested: false, examples: [] },
        errorStates: { detected: false, tested: false, examples: [] },
        emptyStates: { detected: false, tested: false, examples: [] },
      };

      const report = generateUIStateReport(coverage);

      expect(report).toContain('❓ Loading States');
      expect(report).toContain('Not detected');
    });
  });
});
