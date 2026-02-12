/**
 * Tests for project-analyzer
 *
 * Comprehensive unit tests using vi.hoisted() + vi.mock() for ESM mocking.
 * Mocks fs to avoid real filesystem operations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks for ESM compatibility
const { mockExistsSync, mockReadFileSync, mockReaddirSync, mockStatSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockStatSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    readdirSync: mockReaddirSync,
    statSync: mockStatSync,
  },
}));

import {
  detectFramework,
  analyzeNodeDependencies,
  analyzeSSR,
  analyzeSEO,
  analyzeEdgeCompatibility,
  analyzeProject,
} from '../../../../src/core/deployment/project-analyzer.js';

describe('Project Analyzer', () => {
  const projectPath = '/fake/project';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: nothing exists
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('');
    mockReaddirSync.mockReturnValue([]);
    mockStatSync.mockReturnValue({ isFile: () => true });
  });

  describe('detectFramework', () => {
    it('should detect Next.js via next.config.js', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('next.config.js')) return true;
        if (p.endsWith('package.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { next: '^14.0.0' },
      }));

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('nextjs');
      expect(result.configFile).toBe('next.config.js');
      expect(result.version).toBe('^14.0.0');
    });

    it('should detect Next.js via next.config.ts', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('next.config.ts')) return true;
        return false;
      });

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('nextjs');
      expect(result.configFile).toBe('next.config.ts');
    });

    it('should detect Next.js via next.config.mjs', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('next.config.mjs')) return true;
        return false;
      });

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('nextjs');
      expect(result.configFile).toBe('next.config.mjs');
    });

    it('should detect Remix via remix.config.js', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('remix.config.js')) return true;
        return false;
      });

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('remix');
      expect(result.configFile).toBe('remix.config.js');
    });

    it('should detect Remix via remix.config.ts', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('remix.config.ts')) return true;
        return false;
      });

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('remix');
      expect(result.configFile).toBe('remix.config.ts');
    });

    it('should detect Astro via astro.config.mjs', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('astro.config.mjs')) return true;
        return false;
      });

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('astro');
      expect(result.configFile).toBe('astro.config.mjs');
    });

    it('should detect Nuxt via nuxt.config.ts', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('nuxt.config.ts')) return true;
        return false;
      });

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('nuxt');
      expect(result.configFile).toBe('nuxt.config.ts');
    });

    it('should detect SvelteKit via svelte.config.js', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('svelte.config.js')) return true;
        return false;
      });

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('sveltekit');
      expect(result.configFile).toBe('svelte.config.js');
    });

    it('should detect Gatsby via gatsby-config.js', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('gatsby-config.js')) return true;
        return false;
      });

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('gatsby');
      expect(result.configFile).toBe('gatsby-config.js');
    });

    it('should detect Vite via vite.config.ts', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('vite.config.ts')) return true;
        return false;
      });

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('vite');
      expect(result.configFile).toBe('vite.config.ts');
    });

    it('should detect CRA from react-scripts in package.json', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { 'react-scripts': '^5.0.0' },
      }));

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('cra');
      expect(result.version).toBe('^5.0.0');
    });

    it('should detect static site via root index.html', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('index.html') && !p.includes('public')) return true;
        return false;
      });

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('static');
    });

    it('should detect static site via public/index.html', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('public') && p.endsWith('index.html')) return true;
        return false;
      });

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('static');
    });

    it('should return unknown for empty directory', () => {
      const result = detectFramework(projectPath);

      expect(result.framework).toBe('unknown');
    });

    it('should extract version from devDependencies', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('vite.config.ts')) return true;
        if (p.endsWith('package.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        devDependencies: { vite: '^5.0.0' },
      }));

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('vite');
      expect(result.version).toBe('^5.0.0');
    });

    it('should return undefined version when package.json missing', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('next.config.js')) return true;
        return false;
      });

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('nextjs');
      expect(result.version).toBeUndefined();
    });

    it('should handle malformed package.json gracefully', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation(() => {
        throw new SyntaxError('Unexpected token');
      });

      const result = detectFramework(projectPath);

      // CRA check reads package.json but it fails -> falls through to static/unknown
      expect(result.framework).toBe('unknown');
    });

    it('should prioritize config-based frameworks over CRA', () => {
      // Both next.config.js and react-scripts in package.json
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('next.config.js')) return true;
        if (p.endsWith('package.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { next: '^14.0.0', 'react-scripts': '^5.0.0' },
      }));

      const result = detectFramework(projectPath);

      expect(result.framework).toBe('nextjs');
    });
  });

  describe('analyzeNodeDependencies', () => {
    it('should detect native modules', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { prisma: '^5.0.0', sharp: '^0.33.0' },
      }));

      const result = analyzeNodeDependencies(projectPath);

      expect(result.hasNativeModules).toBe(true);
      expect(result.nativeModules).toContain('prisma');
      expect(result.nativeModules).toContain('sharp');
    });

    it('should detect all native module patterns', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          '@prisma/client': '^5.0.0',
          puppeteer: '^21.0.0',
          playwright: '^1.40.0',
          canvas: '^2.11.0',
          bcrypt: '^5.1.0',
          argon2: '^0.30.0',
          'better-sqlite3': '^9.0.0',
          sqlite3: '^5.1.0',
          'pg-native': '^3.0.0',
          oracledb: '^6.0.0',
          tedious: '^16.0.0',
        },
      }));

      const result = analyzeNodeDependencies(projectPath);

      expect(result.hasNativeModules).toBe(true);
      expect(result.nativeModules).toHaveLength(11);
    });

    it('should detect server-side database clients', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          '@prisma/client': '^5.0.0',
          pg: '^8.0.0',
          mongoose: '^7.0.0',
        },
      }));

      const result = analyzeNodeDependencies(projectPath);

      expect(result.hasServerSideDB).toBe(true);
      expect(result.dbClients).toContain('@prisma/client');
      expect(result.dbClients).toContain('pg');
      expect(result.dbClients).toContain('mongoose');
    });

    it('should detect edge-compatible database clients', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          '@libsql/client': '^0.4.0',
          '@planetscale/database': '^1.0.0',
          '@vercel/postgres': '^0.5.0',
          '@neondatabase/serverless': '^0.7.0',
          'drizzle-orm': '^0.29.0',
        },
      }));

      const result = analyzeNodeDependencies(projectPath);

      expect(result.hasServerSideDB).toBe(false);
      expect(result.dbClients).toContain('@libsql/client (edge-compatible)');
      expect(result.dbClients).toContain('@planetscale/database (edge-compatible)');
      expect(result.dbClients).toContain('@vercel/postgres (edge-compatible)');
      expect(result.dbClients).toContain('@neondatabase/serverless (edge-compatible)');
      expect(result.dbClients).toContain('drizzle-orm (edge-compatible)');
    });

    it('should detect fs usage in source files', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        // Source dirs exist
        if (p.endsWith('/src')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('package.json')) {
          return JSON.stringify({ dependencies: {} });
        }
        return "import fs from 'fs'\nfs.readFileSync('test')";
      });
      mockReaddirSync.mockReturnValue(['utils.ts']);
      mockStatSync.mockReturnValue({ isFile: () => true });

      const result = analyzeNodeDependencies(projectPath);

      expect(result.hasFileSystemUsage).toBe(true);
    });

    it('should detect crypto usage via require', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        if (p.endsWith('/src')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('package.json')) {
          return JSON.stringify({ dependencies: {} });
        }
        return "const crypto = require('crypto')";
      });
      mockReaddirSync.mockReturnValue(['hash.ts']);
      mockStatSync.mockReturnValue({ isFile: () => true });

      const result = analyzeNodeDependencies(projectPath);

      expect(result.hasCryptoUsage).toBe(true);
    });

    it('should detect node:fs import', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        if (p.endsWith('/src')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('package.json')) {
          return JSON.stringify({ dependencies: {} });
        }
        return "import { readFile } from 'node:fs'";
      });
      mockReaddirSync.mockReturnValue(['file.ts']);
      mockStatSync.mockReturnValue({ isFile: () => true });

      const result = analyzeNodeDependencies(projectPath);

      expect(result.hasFileSystemUsage).toBe(true);
    });

    it('should detect node:crypto import', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        if (p.endsWith('/src')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('package.json')) {
          return JSON.stringify({ dependencies: {} });
        }
        return "import { createHash } from 'node:crypto'";
      });
      mockReaddirSync.mockReturnValue(['hash.ts']);
      mockStatSync.mockReturnValue({ isFile: () => true });

      const result = analyzeNodeDependencies(projectPath);

      expect(result.hasCryptoUsage).toBe(true);
    });

    it('should handle missing package.json', () => {
      const result = analyzeNodeDependencies(projectPath);

      expect(result.hasNativeModules).toBe(false);
      expect(result.nativeModules).toEqual([]);
      expect(result.hasServerSideDB).toBe(false);
      expect(result.dbClients).toEqual([]);
    });

    it('should skip non-source files during scanning', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        if (p.endsWith('/src')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('package.json')) {
          return JSON.stringify({ dependencies: {} });
        }
        return "import fs from 'fs'";
      });
      // Include non-source files that should be skipped
      mockReaddirSync.mockReturnValue(['readme.md', 'data.json', 'utils.ts']);
      mockStatSync.mockReturnValue({ isFile: () => true });

      const result = analyzeNodeDependencies(projectPath);

      // Only utils.ts should be read, so fs import is detected
      expect(result.hasFileSystemUsage).toBe(true);
    });

    it('should handle error during source file scanning', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        if (p.endsWith('/src')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('package.json')) {
          return JSON.stringify({ dependencies: {} });
        }
        throw new Error('Permission denied');
      });
      mockReaddirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw
      const result = analyzeNodeDependencies(projectPath);

      expect(result.hasFileSystemUsage).toBe(false);
    });
  });

  describe('analyzeSSR', () => {
    function setupSourceScan(content: string, filePath = 'page.tsx') {
      mockExistsSync.mockImplementation((p: string) => {
        // Checked dirs: src, app, pages, lib
        if (p.endsWith('/app') || p.endsWith('/pages')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue([filePath]);
      mockStatSync.mockReturnValue({ isFile: () => true });
      mockReadFileSync.mockReturnValue(content);
    }

    it('should detect server components', () => {
      setupSourceScan("'use server'\n\nexport default function Page() {}");

      const result = analyzeSSR(projectPath);

      expect(result.hasServerComponents).toBe(true);
    });

    it('should detect server actions (use server + async function)', () => {
      setupSourceScan("'use server'\n\nexport async function submitForm() {}");

      const result = analyzeSSR(projectPath);

      expect(result.hasServerComponents).toBe(true);
      expect(result.hasServerActions).toBe(true);
    });

    it('should detect getServerSideProps', () => {
      setupSourceScan('export async function getServerSideProps() { return { props: {} } }');

      const result = analyzeSSR(projectPath);

      expect(result.hasGetServerSideProps).toBe(true);
    });

    it('should detect non-async getServerSideProps', () => {
      setupSourceScan('export function getServerSideProps() { return { props: {} } }');

      const result = analyzeSSR(projectPath);

      expect(result.hasGetServerSideProps).toBe(true);
    });

    it('should detect generateMetadata', () => {
      setupSourceScan('export async function generateMetadata() { return { title: "Page" } }');

      const result = analyzeSSR(projectPath);

      expect(result.hasGenerateMetadata).toBe(true);
    });

    it('should detect dynamic routes from file path with brackets', () => {
      setupSourceScan('export default function Page() {}', 'posts/[id]/page.tsx');

      const result = analyzeSSR(projectPath);

      expect(result.hasDynamicRoutes).toBe(true);
    });

    it('should detect API routes', () => {
      // API route dirs: pages/api, app/api, src/pages/api, src/app/api
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('app/api') || p.includes('pages/api')) return true;
        if (p.endsWith('/app') || p.endsWith('/pages')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue([]);

      const result = analyzeSSR(projectPath);

      expect(result.hasApiRoutes).toBe(true);
    });

    it('should return all false for empty project', () => {
      const result = analyzeSSR(projectPath);

      expect(result.hasServerComponents).toBe(false);
      expect(result.hasServerActions).toBe(false);
      expect(result.hasGetServerSideProps).toBe(false);
      expect(result.hasGenerateMetadata).toBe(false);
      expect(result.hasDynamicRoutes).toBe(false);
      expect(result.hasApiRoutes).toBe(false);
    });

    it('should detect "use server" with double quotes', () => {
      setupSourceScan('"use server"\n\nexport async function action() {}');

      const result = analyzeSSR(projectPath);

      expect(result.hasServerComponents).toBe(true);
      expect(result.hasServerActions).toBe(true);
    });
  });

  describe('analyzeSEO', () => {
    it('should detect sitemap.xml in public directory', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('public') && p.endsWith('sitemap.xml')) return true;
        return false;
      });

      const result = analyzeSEO(projectPath);

      expect(result.hasSitemap).toBe(true);
    });

    it('should detect sitemap.ts in app directory', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('app/sitemap.ts')) return true;
        return false;
      });

      const result = analyzeSEO(projectPath);

      expect(result.hasSitemap).toBe(true);
    });

    it('should detect sitemap.js in app directory', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('app/sitemap.js')) return true;
        return false;
      });

      const result = analyzeSEO(projectPath);

      expect(result.hasSitemap).toBe(true);
    });

    it('should detect sitemap.xml in app directory', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('app/sitemap.xml') && !p.includes('public')) return true;
        return false;
      });

      const result = analyzeSEO(projectPath);

      expect(result.hasSitemap).toBe(true);
    });

    it('should detect sitemap in src/app directory', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('src/app/sitemap.ts')) return true;
        return false;
      });

      const result = analyzeSEO(projectPath);

      expect(result.hasSitemap).toBe(true);
    });

    it('should detect robots.txt', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('robots.txt')) return true;
        return false;
      });

      const result = analyzeSEO(projectPath);

      expect(result.hasRobotsTxt).toBe(true);
    });

    it('should detect dynamic meta (generateMetadata)', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('/app')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['page.tsx']);
      mockStatSync.mockReturnValue({ isFile: () => true });
      mockReadFileSync.mockReturnValue('export async function generateMetadata() {}');

      const result = analyzeSEO(projectPath);

      expect(result.hasDynamicMeta).toBe(true);
    });

    it('should detect meta from database', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('/app')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['page.tsx']);
      mockStatSync.mockReturnValue({ isFile: () => true });
      mockReadFileSync.mockReturnValue(
        'export async function generateMetadata() {\n  const data = await prisma.product.findFirst()\n}'
      );

      const result = analyzeSEO(projectPath);

      expect(result.hasDynamicMeta).toBe(true);
      expect(result.metaSourcesFromDB).toBe(true);
    });

    it('should detect meta from database via db.query pattern', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('/app')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['page.tsx']);
      mockStatSync.mockReturnValue({ isFile: () => true });
      mockReadFileSync.mockReturnValue(
        'export async function generateMetadata() {\n  const data = await db.query()\n}'
      );

      const result = analyzeSEO(projectPath);

      expect(result.metaSourcesFromDB).toBe(true);
    });

    it('should detect static meta tags', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('/components')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['Layout.tsx']);
      mockStatSync.mockReturnValue({ isFile: () => true });
      mockReadFileSync.mockReturnValue('<Head>\n<meta name="description" content="test" />\n</Head>');

      const result = analyzeSEO(projectPath);

      expect(result.hasStaticMeta).toBe(true);
    });

    it('should detect structured data (JSON-LD)', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('/components')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['Schema.tsx']);
      mockStatSync.mockReturnValue({ isFile: () => true });
      mockReadFileSync.mockReturnValue('type="application/ld+json"');

      const result = analyzeSEO(projectPath);

      expect(result.hasStructuredData).toBe(true);
    });

    it('should detect structured data via @type Product', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('/components')) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(['Schema.tsx']);
      mockStatSync.mockReturnValue({ isFile: () => true });
      mockReadFileSync.mockReturnValue('"@type": "Product"');

      const result = analyzeSEO(projectPath);

      expect(result.hasStructuredData).toBe(true);
    });

    it('should return all false for empty project', () => {
      const result = analyzeSEO(projectPath);

      expect(result.hasDynamicMeta).toBe(false);
      expect(result.hasStaticMeta).toBe(false);
      expect(result.hasSitemap).toBe(false);
      expect(result.hasRobotsTxt).toBe(false);
      expect(result.hasStructuredData).toBe(false);
      expect(result.metaSourcesFromDB).toBe(false);
    });
  });

  describe('analyzeEdgeCompatibility', () => {
    const baseNodeDeps = {
      hasNativeModules: false,
      nativeModules: [] as string[],
      hasFileSystemUsage: false,
      hasCryptoUsage: false,
      hasServerSideDB: false,
      dbClients: [] as string[],
    };

    const baseSSR = {
      hasServerComponents: false,
      hasServerActions: false,
      hasGetServerSideProps: false,
      hasGenerateMetadata: false,
      hasDynamicRoutes: false,
      hasApiRoutes: false,
    };

    it('should be edge compatible with clean project', () => {
      const result = analyzeEdgeCompatibility(baseNodeDeps, baseSSR);

      expect(result.isEdgeCompatible).toBe(true);
      expect(result.blockers).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should block edge for native modules', () => {
      const nodeDeps = { ...baseNodeDeps, hasNativeModules: true, nativeModules: ['prisma', 'sharp'] };

      const result = analyzeEdgeCompatibility(nodeDeps, baseSSR);

      expect(result.isEdgeCompatible).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toContain('prisma, sharp');
    });

    it('should block edge for file system usage', () => {
      const nodeDeps = { ...baseNodeDeps, hasFileSystemUsage: true };

      const result = analyzeEdgeCompatibility(nodeDeps, baseSSR);

      expect(result.isEdgeCompatible).toBe(false);
      expect(result.blockers).toContain('File system (fs) usage detected');
    });

    it('should block edge for server-only DB clients', () => {
      const nodeDeps = {
        ...baseNodeDeps,
        hasServerSideDB: true,
        dbClients: ['prisma', 'pg', '@libsql/client (edge-compatible)'],
      };

      const result = analyzeEdgeCompatibility(nodeDeps, baseSSR);

      expect(result.isEdgeCompatible).toBe(false);
      expect(result.blockers[0]).toContain('prisma, pg');
    });

    it('should not block for edge-compatible-only DB clients', () => {
      const nodeDeps = {
        ...baseNodeDeps,
        hasServerSideDB: true,
        dbClients: ['@libsql/client (edge-compatible)'],
      };

      const result = analyzeEdgeCompatibility(nodeDeps, baseSSR);

      // Only edge-compatible clients, no server-only clients -> no blocker from DB
      expect(result.blockers).toHaveLength(0);
    });

    it('should warn about getServerSideProps', () => {
      const ssr = { ...baseSSR, hasGetServerSideProps: true };

      const result = analyzeEdgeCompatibility(baseNodeDeps, ssr);

      expect(result.isEdgeCompatible).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('getServerSideProps');
    });

    it('should warn about server actions with server-side DB', () => {
      const nodeDeps = { ...baseNodeDeps, hasServerSideDB: true, dbClients: [] };
      const ssr = { ...baseSSR, hasServerActions: true };

      const result = analyzeEdgeCompatibility(nodeDeps, ssr);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Server Actions');
    });

    it('should not warn about server actions without server-side DB', () => {
      const ssr = { ...baseSSR, hasServerActions: true };

      const result = analyzeEdgeCompatibility(baseNodeDeps, ssr);

      expect(result.warnings).toHaveLength(0);
    });

    it('should combine multiple blockers', () => {
      const nodeDeps = {
        ...baseNodeDeps,
        hasNativeModules: true,
        nativeModules: ['sharp'],
        hasFileSystemUsage: true,
        hasServerSideDB: true,
        dbClients: ['pg'],
      };

      const result = analyzeEdgeCompatibility(nodeDeps, baseSSR);

      expect(result.isEdgeCompatible).toBe(false);
      expect(result.blockers).toHaveLength(3);
    });
  });

  describe('analyzeProject', () => {
    it('should return complete project analysis', () => {
      // Empty project
      const result = analyzeProject(projectPath);

      expect(result.framework).toBeDefined();
      expect(result.framework.framework).toBe('unknown');
      expect(result.nodeDeps).toBeDefined();
      expect(result.ssr).toBeDefined();
      expect(result.seo).toBeDefined();
      expect(result.edge).toBeDefined();
      expect(result.edge.isEdgeCompatible).toBe(true);
    });

    it('should detect Next.js with Prisma as non-edge-compatible', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('next.config.js')) return true;
        if (p.endsWith('package.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          next: '^14.0.0',
          '@prisma/client': '^5.0.0',
        },
      }));

      const result = analyzeProject(projectPath);

      expect(result.framework.framework).toBe('nextjs');
      expect(result.nodeDeps.hasNativeModules).toBe(true);
      expect(result.edge.isEdgeCompatible).toBe(false);
    });
  });
});
