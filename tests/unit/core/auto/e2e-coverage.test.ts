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
  generateCoverageReport,
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
});
