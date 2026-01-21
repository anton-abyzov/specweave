/**
 * Tests for deploy-router
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { routeDeployment, formatRecommendation } from '../../../../dist/src/core/deployment/deploy-router.js';
import type { DeploymentRecommendation } from '../../../../dist/src/core/deployment/types.js';

describe('Deploy Router', () => {
  const testProjectDir = path.join(process.cwd(), 'test-fixtures', 'deploy-router');

  beforeEach(() => {
    // Create test fixture directory
    if (!fs.existsSync(testProjectDir)) {
      fs.mkdirSync(testProjectDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test fixtures
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
  });

  describe('Next.js with Prisma (Vercel)', () => {
    it('should recommend Vercel for Next.js with Prisma', () => {
      // Setup: Next.js project with Prisma
      const packageJson = {
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
          '@prisma/client': '^5.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      fs.writeFileSync(
        path.join(testProjectDir, 'next.config.js'),
        'module.exports = {}'
      );

      // Create app directory with Server Component
      const appDir = path.join(testProjectDir, 'app');
      fs.mkdirSync(appDir, { recursive: true });

      fs.writeFileSync(
        path.join(appDir, 'page.tsx'),
        `
import { prisma } from '@/lib/db'

export default async function Page() {
  const data = await prisma.user.findMany()
  return <div>{data.length}</div>
}
        `
      );

      // Test
      const result = routeDeployment(testProjectDir);

      expect(result.platform).toBe('vercel');
      expect(result.confidence).toBe('high');
      expect(result.analysis.nodeDeps.hasNativeModules).toBe(true);
      expect(result.analysis.nodeDeps.nativeModules).toContain('@prisma/client');
      expect(result.analysis.edge.isEdgeCompatible).toBe(false);
    });
  });

  describe('Astro Static Site (Cloudflare)', () => {
    it('should recommend Cloudflare for Astro static site', () => {
      // Setup: Astro project
      const packageJson = {
        dependencies: {
          astro: '^4.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      fs.writeFileSync(
        path.join(testProjectDir, 'astro.config.mjs'),
        'export default {}'
      );

      // Test
      const result = routeDeployment(testProjectDir);

      expect(result.platform).toBe('cloudflare');
      expect(result.confidence).toBe('high');
      expect(result.analysis.framework.framework).toBe('astro');
      expect(result.analysis.edge.isEdgeCompatible).toBe(true);
    });
  });

  describe('Next.js with Dynamic SEO (Vercel)', () => {
    it('should recommend Vercel for dynamic meta from database', () => {
      // Setup: Next.js with dynamic metadata
      const packageJson = {
        dependencies: {
          next: '^14.0.0',
          '@prisma/client': '^5.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      fs.writeFileSync(
        path.join(testProjectDir, 'next.config.js'),
        'module.exports = {}'
      );

      // Create app directory with generateMetadata using DB
      const appDir = path.join(testProjectDir, 'app', 'products', '[id]');
      fs.mkdirSync(appDir, { recursive: true });

      fs.writeFileSync(
        path.join(appDir, 'page.tsx'),
        `
import { prisma } from '@/lib/db'

export async function generateMetadata({ params }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id }
  })

  return {
    title: product.name,
    description: product.description
  }
}

export default function ProductPage() {
  return <div>Product</div>
}
        `
      );

      // Test
      const result = routeDeployment(testProjectDir);

      expect(result.platform).toBe('vercel');
      expect(result.analysis.seo.hasDynamicMeta).toBe(true);
      expect(result.analysis.seo.metaSourcesFromDB).toBe(true);
    });
  });

  describe('Vite SPA (Cloudflare)', () => {
    it('should recommend Cloudflare for Vite SPA', () => {
      // Setup: Vite SPA
      const packageJson = {
        dependencies: {
          react: '^18.0.0',
        },
        devDependencies: {
          vite: '^5.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      fs.writeFileSync(
        path.join(testProjectDir, 'vite.config.ts'),
        'export default {}'
      );

      fs.writeFileSync(
        path.join(testProjectDir, 'index.html'),
        '<html><body><div id="root"></div></body></html>'
      );

      // Test
      const result = routeDeployment(testProjectDir);

      expect(result.platform).toBe('cloudflare');
      expect(result.confidence).toBe('high');
      expect(result.analysis.framework.framework).toBe('vite');
    });
  });

  describe('Next.js with fs usage (Vercel)', () => {
    it('should recommend Vercel for file system operations', () => {
      // Setup: Next.js with fs usage
      const packageJson = {
        dependencies: {
          next: '^14.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      fs.writeFileSync(
        path.join(testProjectDir, 'next.config.js'),
        'module.exports = {}'
      );

      // Create lib with fs usage
      const libDir = path.join(testProjectDir, 'lib');
      fs.mkdirSync(libDir, { recursive: true });

      fs.writeFileSync(
        path.join(libDir, 'file-utils.ts'),
        `
import fs from 'fs'
import path from 'path'

export function readLocalFile(filename: string) {
  return fs.readFileSync(path.join(process.cwd(), filename), 'utf-8')
}
        `
      );

      // Test
      const result = routeDeployment(testProjectDir);

      expect(result.platform).toBe('vercel');
      expect(result.analysis.nodeDeps.hasFileSystemUsage).toBe(true);
      expect(result.analysis.edge.isEdgeCompatible).toBe(false);
    });
  });

  describe('User preferences', () => {
    it('should respect preferEdge option', () => {
      // Setup: Simple Next.js app (edge compatible)
      const packageJson = {
        dependencies: {
          next: '^14.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      fs.writeFileSync(
        path.join(testProjectDir, 'next.config.js'),
        'module.exports = {}'
      );

      // Test without preference
      const result1 = routeDeployment(testProjectDir);

      // Test with edge preference
      const result2 = routeDeployment(testProjectDir, { preferEdge: true });

      expect(result2.score.cloudflare).toBeGreaterThan(result1.score.cloudflare);
    });

    it('should respect preferCost option', () => {
      // Setup: Simple Next.js app
      const packageJson = {
        dependencies: {
          next: '^14.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      fs.writeFileSync(
        path.join(testProjectDir, 'next.config.js'),
        'module.exports = {}'
      );

      // Test with cost preference
      const result = routeDeployment(testProjectDir, { preferCost: true });

      const costFactor = result.factors.find((f) => f.name === 'Cost Priority');
      expect(costFactor).toBeDefined();
      expect(costFactor?.impact).toBe('cloudflare');
    });

    it('should respect requireSSR option', () => {
      // Setup: Simple static site
      fs.writeFileSync(
        path.join(testProjectDir, 'index.html'),
        '<html><body>Hello</body></html>'
      );

      // Test with SSR requirement
      const result = routeDeployment(testProjectDir, { requireSSR: true });

      const ssrFactor = result.factors.find((f) => f.name === 'SSR Requirement');
      expect(ssrFactor).toBeDefined();
      expect(ssrFactor?.impact).toBe('vercel');
    });
  });

  describe('formatRecommendation', () => {
    it('should format recommendation as markdown', () => {
      // Setup simple project
      const packageJson = {
        dependencies: {
          next: '^14.0.0',
          '@prisma/client': '^5.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      fs.writeFileSync(
        path.join(testProjectDir, 'next.config.js'),
        'module.exports = {}'
      );

      const result = routeDeployment(testProjectDir);
      const markdown = formatRecommendation(result);

      expect(markdown).toContain('## 🚀 Deployment Recommendation');
      expect(markdown).toContain('**Platform**:');
      expect(markdown).toContain('**Confidence**:');
      expect(markdown).toContain('### Analysis Results');
      expect(markdown).toContain('| Factor | Finding | Impact |');
    });

    it('should include edge blockers in output', () => {
      // Setup project with edge blockers
      const packageJson = {
        dependencies: {
          next: '^14.0.0',
          sharp: '^0.33.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      fs.writeFileSync(
        path.join(testProjectDir, 'next.config.js'),
        'module.exports = {}'
      );

      const result = routeDeployment(testProjectDir);
      const markdown = formatRecommendation(result);

      expect(markdown).toContain('### ⚠️ Edge Blockers');
      expect(markdown).toContain('sharp');
    });
  });

  describe('Edge cases', () => {
    it('should handle missing package.json gracefully', () => {
      fs.writeFileSync(
        path.join(testProjectDir, 'index.html'),
        '<html><body>Static site</body></html>'
      );

      const result = routeDeployment(testProjectDir);

      expect(result).toBeDefined();
      expect(result.platform).toBe('cloudflare'); // Static site
    });

    it('should handle empty project directory', () => {
      const result = routeDeployment(testProjectDir);

      expect(result).toBeDefined();
      expect(result.analysis.framework.framework).toBe('unknown');
    });

    it('should detect edge-compatible database clients', () => {
      const packageJson = {
        dependencies: {
          next: '^14.0.0',
          '@libsql/client': '^0.4.0',
          'drizzle-orm': '^0.29.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      fs.writeFileSync(
        path.join(testProjectDir, 'next.config.js'),
        'module.exports = {}'
      );

      const result = routeDeployment(testProjectDir);

      expect(result.analysis.nodeDeps.dbClients).toContain('@libsql/client (edge-compatible)');
      expect(result.analysis.nodeDeps.hasServerSideDB).toBe(false);
    });
  });

  describe('Hybrid scenarios', () => {
    it('should handle Next.js with API routes but no SSR', () => {
      const packageJson = {
        dependencies: {
          next: '^14.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      fs.writeFileSync(
        path.join(testProjectDir, 'next.config.js'),
        'module.exports = {}'
      );

      // Create API route
      const apiDir = path.join(testProjectDir, 'app', 'api', 'hello');
      fs.mkdirSync(apiDir, { recursive: true });

      fs.writeFileSync(
        path.join(apiDir, 'route.ts'),
        `
export async function GET() {
  return Response.json({ message: 'Hello' })
}
        `
      );

      const result = routeDeployment(testProjectDir);

      expect(result.analysis.ssr.hasApiRoutes).toBe(true);
      expect(result.analysis.edge.isEdgeCompatible).toBe(true);
      // Should prefer Cloudflare for simple edge-compatible API
      expect(result.platform).toBe('cloudflare');
    });
  });
});
