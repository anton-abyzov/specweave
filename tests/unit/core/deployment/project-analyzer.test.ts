/**
 * Tests for project-analyzer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  detectFramework,
  analyzeNodeDependencies,
  analyzeSSR,
  analyzeSEO,
  analyzeEdgeCompatibility,
} from '../../../../dist/src/core/deployment/project-analyzer.js';

describe('Project Analyzer', () => {
  const testProjectDir = path.join(process.cwd(), 'test-fixtures', 'project-analyzer');

  beforeEach(() => {
    if (!fs.existsSync(testProjectDir)) {
      fs.mkdirSync(testProjectDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
  });

  describe('detectFramework', () => {
    it('should detect Next.js', () => {
      fs.writeFileSync(path.join(testProjectDir, 'next.config.js'), 'module.exports = {}');

      const result = detectFramework(testProjectDir);

      expect(result.framework).toBe('nextjs');
      expect(result.configFile).toBe('next.config.js');
    });

    it('should detect Remix', () => {
      fs.writeFileSync(path.join(testProjectDir, 'remix.config.js'), 'module.exports = {}');

      const result = detectFramework(testProjectDir);

      expect(result.framework).toBe('remix');
      expect(result.configFile).toBe('remix.config.js');
    });

    it('should detect Astro', () => {
      fs.writeFileSync(path.join(testProjectDir, 'astro.config.mjs'), 'export default {}');

      const result = detectFramework(testProjectDir);

      expect(result.framework).toBe('astro');
      expect(result.configFile).toBe('astro.config.mjs');
    });

    it('should detect CRA from package.json', () => {
      const packageJson = {
        dependencies: {
          'react-scripts': '^5.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = detectFramework(testProjectDir);

      expect(result.framework).toBe('cra');
    });

    it('should detect static site', () => {
      fs.writeFileSync(path.join(testProjectDir, 'index.html'), '<html></html>');

      const result = detectFramework(testProjectDir);

      expect(result.framework).toBe('static');
    });

    it('should return unknown for empty directory', () => {
      const result = detectFramework(testProjectDir);

      expect(result.framework).toBe('unknown');
    });

    it('should extract version from package.json', () => {
      const packageJson = {
        dependencies: {
          next: '^14.1.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      fs.writeFileSync(path.join(testProjectDir, 'next.config.ts'), 'export default {}');

      const result = detectFramework(testProjectDir);

      expect(result.framework).toBe('nextjs');
      expect(result.version).toBe('^14.1.0');
    });
  });

  describe('analyzeNodeDependencies', () => {
    it('should detect native modules', () => {
      const packageJson = {
        dependencies: {
          prisma: '^5.0.0',
          sharp: '^0.33.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = analyzeNodeDependencies(testProjectDir);

      expect(result.hasNativeModules).toBe(true);
      expect(result.nativeModules).toContain('prisma');
      expect(result.nativeModules).toContain('sharp');
    });

    it('should detect server-side database clients', () => {
      const packageJson = {
        dependencies: {
          '@prisma/client': '^5.0.0',
          pg: '^8.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = analyzeNodeDependencies(testProjectDir);

      expect(result.hasServerSideDB).toBe(true);
      expect(result.dbClients).toContain('@prisma/client');
      expect(result.dbClients).toContain('pg');
    });

    it('should detect edge-compatible database clients', () => {
      const packageJson = {
        dependencies: {
          '@libsql/client': '^0.4.0',
          '@planetscale/database': '^1.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = analyzeNodeDependencies(testProjectDir);

      expect(result.hasServerSideDB).toBe(false);
      expect(result.dbClients).toContain('@libsql/client (edge-compatible)');
      expect(result.dbClients).toContain('@planetscale/database (edge-compatible)');
    });

    it('should detect fs usage in source files', () => {
      const packageJson = {
        dependencies: {
          next: '^14.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create src directory with fs usage
      const srcDir = path.join(testProjectDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(
        path.join(srcDir, 'utils.ts'),
        `
import fs from 'fs'

export function readFile(path: string) {
  return fs.readFileSync(path, 'utf-8')
}
        `
      );

      const result = analyzeNodeDependencies(testProjectDir);

      expect(result.hasFileSystemUsage).toBe(true);
    });

    it('should detect crypto usage in source files', () => {
      // Create package.json first (required for analyze to run)
      const packageJson = {
        dependencies: {
          next: '^14.0.0',
        },
      };

      fs.writeFileSync(
        path.join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create src directory with crypto usage
      const srcDir = path.join(testProjectDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(
        path.join(srcDir, 'hash.ts'),
        `
import crypto from 'crypto'

export function hash(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}
        `
      );

      const result = analyzeNodeDependencies(testProjectDir);

      expect(result.hasCryptoUsage).toBe(true);
    });

    it('should handle missing package.json', () => {
      const result = analyzeNodeDependencies(testProjectDir);

      expect(result.hasNativeModules).toBe(false);
      expect(result.nativeModules).toEqual([]);
      expect(result.hasServerSideDB).toBe(false);
    });
  });

  describe('analyzeSSR', () => {
    it('should detect Server Components', () => {
      const appDir = path.join(testProjectDir, 'app');
      fs.mkdirSync(appDir, { recursive: true });

      fs.writeFileSync(
        path.join(appDir, 'page.tsx'),
        `
'use server'

export default async function Page() {
  return <div>Server Component</div>
}
        `
      );

      const result = analyzeSSR(testProjectDir);

      expect(result.hasServerComponents).toBe(true);
    });

    it('should detect Server Actions', () => {
      const appDir = path.join(testProjectDir, 'app');
      fs.mkdirSync(appDir, { recursive: true });

      fs.writeFileSync(
        path.join(appDir, 'actions.ts'),
        `
'use server'

export async function submitForm(data: FormData) {
  // Server action
}
        `
      );

      const result = analyzeSSR(testProjectDir);

      expect(result.hasServerActions).toBe(true);
    });

    it('should detect getServerSideProps', () => {
      const pagesDir = path.join(testProjectDir, 'pages');
      fs.mkdirSync(pagesDir, { recursive: true });

      fs.writeFileSync(
        path.join(pagesDir, 'index.tsx'),
        `
export async function getServerSideProps() {
  return { props: {} }
}

export default function Page() {
  return <div>Page</div>
}
        `
      );

      const result = analyzeSSR(testProjectDir);

      expect(result.hasGetServerSideProps).toBe(true);
    });

    it('should detect generateMetadata', () => {
      const appDir = path.join(testProjectDir, 'app');
      fs.mkdirSync(appDir, { recursive: true });

      fs.writeFileSync(
        path.join(appDir, 'page.tsx'),
        `
export async function generateMetadata() {
  return { title: 'Page' }
}

export default function Page() {
  return <div>Page</div>
}
        `
      );

      const result = analyzeSSR(testProjectDir);

      expect(result.hasGenerateMetadata).toBe(true);
    });

    it('should detect dynamic routes', () => {
      const appDir = path.join(testProjectDir, 'app', 'posts', '[id]');
      fs.mkdirSync(appDir, { recursive: true });

      fs.writeFileSync(
        path.join(appDir, 'page.tsx'),
        `
export default function PostPage() {
  return <div>Post</div>
}
        `
      );

      const result = analyzeSSR(testProjectDir);

      expect(result.hasDynamicRoutes).toBe(true);
    });

    it('should detect API routes', () => {
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

      const result = analyzeSSR(testProjectDir);

      expect(result.hasApiRoutes).toBe(true);
    });
  });

  describe('analyzeSEO', () => {
    it('should detect sitemap.xml in public', () => {
      const publicDir = path.join(testProjectDir, 'public');
      fs.mkdirSync(publicDir, { recursive: true });

      fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), '<urlset></urlset>');

      const result = analyzeSEO(testProjectDir);

      expect(result.hasSitemap).toBe(true);
    });

    it('should detect robots.txt in public', () => {
      const publicDir = path.join(testProjectDir, 'public');
      fs.mkdirSync(publicDir, { recursive: true });

      fs.writeFileSync(path.join(publicDir, 'robots.txt'), 'User-agent: *');

      const result = analyzeSEO(testProjectDir);

      expect(result.hasRobotsTxt).toBe(true);
    });

    it('should detect dynamic sitemap generation', () => {
      const appDir = path.join(testProjectDir, 'app');
      fs.mkdirSync(appDir, { recursive: true });

      fs.writeFileSync(
        path.join(appDir, 'sitemap.ts'),
        `
export default function sitemap() {
  return []
}
        `
      );

      const result = analyzeSEO(testProjectDir);

      expect(result.hasSitemap).toBe(true);
    });

    it('should detect dynamic meta from database', () => {
      const appDir = path.join(testProjectDir, 'app');
      fs.mkdirSync(appDir, { recursive: true });

      fs.writeFileSync(
        path.join(appDir, 'page.tsx'),
        `
import { prisma } from '@/lib/db'

export async function generateMetadata() {
  const data = await prisma.product.findFirst()
  return {
    title: data.name,
    description: data.description
  }
}
        `
      );

      const result = analyzeSEO(testProjectDir);

      expect(result.hasDynamicMeta).toBe(true);
      expect(result.metaSourcesFromDB).toBe(true);
    });

    it('should detect static meta tags', () => {
      const componentsDir = path.join(testProjectDir, 'components');
      fs.mkdirSync(componentsDir, { recursive: true });

      fs.writeFileSync(
        path.join(componentsDir, 'Layout.tsx'),
        `
export function Layout() {
  return (
    <Head>
      <meta name="description" content="Static site" />
    </Head>
  )
}
        `
      );

      const result = analyzeSEO(testProjectDir);

      expect(result.hasStaticMeta).toBe(true);
    });

    it('should detect structured data (JSON-LD)', () => {
      const componentsDir = path.join(testProjectDir, 'components');
      fs.mkdirSync(componentsDir, { recursive: true });

      fs.writeFileSync(
        path.join(componentsDir, 'ProductSchema.tsx'),
        `
export function ProductSchema() {
  return (
    <script type="application/ld+json">
      {JSON.stringify({
        "@type": "Product",
        name: "Product Name"
      })}
    </script>
  )
}
        `
      );

      const result = analyzeSEO(testProjectDir);

      expect(result.hasStructuredData).toBe(true);
    });
  });

  describe('analyzeEdgeCompatibility', () => {
    it('should mark as incompatible with native modules', () => {
      const nodeDeps = {
        hasNativeModules: true,
        nativeModules: ['prisma', 'sharp'],
        hasFileSystemUsage: false,
        hasCryptoUsage: false,
        hasServerSideDB: false,
        dbClients: [],
      };

      const ssr = {
        hasServerComponents: false,
        hasServerActions: false,
        hasGetServerSideProps: false,
        hasGenerateMetadata: false,
        hasDynamicRoutes: false,
        hasApiRoutes: false,
      };

      const result = analyzeEdgeCompatibility(nodeDeps, ssr);

      expect(result.isEdgeCompatible).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toContain('prisma, sharp');
    });

    it('should mark as incompatible with fs usage', () => {
      const nodeDeps = {
        hasNativeModules: false,
        nativeModules: [],
        hasFileSystemUsage: true,
        hasCryptoUsage: false,
        hasServerSideDB: false,
        dbClients: [],
      };

      const ssr = {
        hasServerComponents: false,
        hasServerActions: false,
        hasGetServerSideProps: false,
        hasGenerateMetadata: false,
        hasDynamicRoutes: false,
        hasApiRoutes: false,
      };

      const result = analyzeEdgeCompatibility(nodeDeps, ssr);

      expect(result.isEdgeCompatible).toBe(false);
      expect(result.blockers).toContain('File system (fs) usage detected');
    });

    it('should warn about getServerSideProps', () => {
      const nodeDeps = {
        hasNativeModules: false,
        nativeModules: [],
        hasFileSystemUsage: false,
        hasCryptoUsage: false,
        hasServerSideDB: false,
        dbClients: [],
      };

      const ssr = {
        hasServerComponents: false,
        hasServerActions: false,
        hasGetServerSideProps: true,
        hasGenerateMetadata: false,
        hasDynamicRoutes: false,
        hasApiRoutes: false,
      };

      const result = analyzeEdgeCompatibility(nodeDeps, ssr);

      expect(result.isEdgeCompatible).toBe(true); // No blockers
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('getServerSideProps');
    });

    it('should be compatible with edge-friendly setup', () => {
      const nodeDeps = {
        hasNativeModules: false,
        nativeModules: [],
        hasFileSystemUsage: false,
        hasCryptoUsage: false,
        hasServerSideDB: false,
        dbClients: ['@libsql/client (edge-compatible)'],
      };

      const ssr = {
        hasServerComponents: true,
        hasServerActions: true,
        hasGetServerSideProps: false,
        hasGenerateMetadata: true,
        hasDynamicRoutes: true,
        hasApiRoutes: true,
      };

      const result = analyzeEdgeCompatibility(nodeDeps, ssr);

      expect(result.isEdgeCompatible).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });
  });
});
