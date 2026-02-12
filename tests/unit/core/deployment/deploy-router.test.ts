/**
 * Tests for deploy-router
 *
 * Comprehensive unit tests using vi.hoisted() + vi.mock() for ESM mocking.
 * Mocks the project-analyzer module to isolate router logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  ProjectAnalysis,
  DeploymentRecommendation,
  FrameworkDetection,
  NodeDependencyAnalysis,
  SSRAnalysis,
  SEOAnalysis,
  EdgeCompatibility,
} from '../../../../src/core/deployment/types.js';

// Hoisted mock for analyzeProject
const { mockAnalyzeProject } = vi.hoisted(() => ({
  mockAnalyzeProject: vi.fn(),
}));

vi.mock('../../../../src/core/deployment/project-analyzer.js', () => ({
  analyzeProject: mockAnalyzeProject,
}));

import { routeDeployment, formatRecommendation } from '../../../../src/core/deployment/deploy-router.js';

/**
 * Helper to build a ProjectAnalysis with sensible defaults
 */
function buildAnalysis(overrides: {
  framework?: Partial<FrameworkDetection>;
  nodeDeps?: Partial<NodeDependencyAnalysis>;
  ssr?: Partial<SSRAnalysis>;
  seo?: Partial<SEOAnalysis>;
  edge?: Partial<EdgeCompatibility>;
} = {}): ProjectAnalysis {
  return {
    framework: {
      framework: 'unknown',
      ...overrides.framework,
    },
    nodeDeps: {
      hasNativeModules: false,
      nativeModules: [],
      hasFileSystemUsage: false,
      hasCryptoUsage: false,
      hasServerSideDB: false,
      dbClients: [],
      ...overrides.nodeDeps,
    },
    ssr: {
      hasServerComponents: false,
      hasServerActions: false,
      hasGetServerSideProps: false,
      hasGenerateMetadata: false,
      hasDynamicRoutes: false,
      hasApiRoutes: false,
      ...overrides.ssr,
    },
    seo: {
      hasDynamicMeta: false,
      hasStaticMeta: false,
      hasSitemap: false,
      hasRobotsTxt: false,
      hasStructuredData: false,
      metaSourcesFromDB: false,
      ...overrides.seo,
    },
    edge: {
      isEdgeCompatible: true,
      blockers: [],
      warnings: [],
      ...overrides.edge,
    },
  };
}

describe('Deploy Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('routeDeployment', () => {
    describe('Platform selection', () => {
      it('should recommend Vercel for Next.js with native modules', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs', version: '^14.0.0', configFile: 'next.config.js' },
          nodeDeps: {
            hasNativeModules: true,
            nativeModules: ['@prisma/client'],
            hasServerSideDB: true,
            dbClients: ['@prisma/client'],
          },
          edge: { isEdgeCompatible: false, blockers: ['Native modules detected: @prisma/client'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.platform).toBe('vercel');
      });

      it('should recommend Cloudflare for Astro static site', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'astro', version: '^4.0.0', configFile: 'astro.config.mjs' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.platform).toBe('cloudflare');
      });

      it('should recommend Cloudflare for Gatsby static site', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'gatsby', version: '^5.0.0', configFile: 'gatsby-config.js' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.platform).toBe('cloudflare');
      });

      it('should recommend Cloudflare for Vite SPA', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'vite', version: '^5.0.0', configFile: 'vite.config.ts' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.platform).toBe('cloudflare');
      });

      it('should recommend Cloudflare for CRA', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'cra', version: '^5.0.0' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.platform).toBe('cloudflare');
      });

      it('should recommend Cloudflare for static sites', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'static' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.platform).toBe('cloudflare');
      });

      it('should recommend Vercel when not edge compatible', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs' },
          nodeDeps: { hasFileSystemUsage: true },
          edge: { isEdgeCompatible: false, blockers: ['File system (fs) usage detected'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.platform).toBe('vercel');
      });

      it('should recommend Vercel for project with server-side DB', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs' },
          nodeDeps: {
            hasServerSideDB: true,
            dbClients: ['pg', 'prisma'],
            hasNativeModules: true,
            nativeModules: ['prisma'],
          },
          edge: { isEdgeCompatible: false, blockers: ['Native modules detected: prisma'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.platform).toBe('vercel');
      });

      it('should prefer Cloudflare as tie-breaker when edge compatible', () => {
        // Neutral framework, edge compatible, no strong factors
        const analysis = buildAnalysis({
          framework: { framework: 'remix' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        // remix is neutral, edge compatible -> cloudflare wins on edge+tie-break
        expect(result.platform).toBe('cloudflare');
      });

      it('should recommend Cloudflare for static Next.js without SSR', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs' },
          // No SSR patterns, no server DB
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.platform).toBe('cloudflare');
      });
    });

    describe('Confidence levels', () => {
      it('should return high confidence when score difference >= 30', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs' },
          nodeDeps: {
            hasNativeModules: true,
            nativeModules: ['prisma', 'sharp'],
            hasFileSystemUsage: true,
            hasServerSideDB: true,
            dbClients: ['prisma'],
          },
          edge: { isEdgeCompatible: false, blockers: ['blockers'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.confidence).toBe('high');
      });

      it('should return low confidence for neutral projects', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nuxt' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        // nuxt is neutral, edge compatible -> small diff
        expect(['low', 'medium']).toContain(result.confidence);
      });
    });

    describe('Factors', () => {
      it('should include framework factor', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs', version: '^14.0.0' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const frameworkFactor = result.factors.find((f) => f.name === 'Framework');
        expect(frameworkFactor).toBeDefined();
        expect(frameworkFactor!.finding).toContain('nextjs');
        expect(frameworkFactor!.finding).toContain('v^14.0.0');
      });

      it('should include framework factor without version', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'unknown' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const frameworkFactor = result.factors.find((f) => f.name === 'Framework');
        expect(frameworkFactor).toBeDefined();
        expect(frameworkFactor!.finding).toBe('unknown');
      });

      it('should include native modules factor', () => {
        const analysis = buildAnalysis({
          nodeDeps: { hasNativeModules: true, nativeModules: ['sharp'] },
          edge: { isEdgeCompatible: false, blockers: ['native'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'Native Modules');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('vercel');
        expect(factor!.finding).toContain('sharp');
      });

      it('should include file system factor', () => {
        const analysis = buildAnalysis({
          nodeDeps: { hasFileSystemUsage: true },
          edge: { isEdgeCompatible: false, blockers: ['fs'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'File System');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('vercel');
      });

      it('should include database factor for server-only DB clients', () => {
        const analysis = buildAnalysis({
          nodeDeps: { hasServerSideDB: true, dbClients: ['pg', '@libsql/client (edge-compatible)'] },
          edge: { isEdgeCompatible: false, blockers: ['db'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'Database');
        expect(factor).toBeDefined();
        expect(factor!.finding).toContain('pg');
        expect(factor!.finding).not.toContain('edge-compatible');
      });

      it('should not include database factor if all clients are edge-compatible', () => {
        const analysis = buildAnalysis({
          nodeDeps: { hasServerSideDB: true, dbClients: ['@libsql/client (edge-compatible)'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'Database');
        expect(factor).toBeUndefined();
      });

      it('should include dynamic SEO factor', () => {
        const analysis = buildAnalysis({
          seo: { metaSourcesFromDB: true },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'Dynamic SEO');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('vercel');
      });

      it('should include SSR pattern factor for getServerSideProps', () => {
        const analysis = buildAnalysis({
          ssr: { hasGetServerSideProps: true },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'SSR Pattern');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('vercel');
      });

      it('should include server actions factor with vercel impact when DB present', () => {
        const analysis = buildAnalysis({
          ssr: { hasServerActions: true },
          nodeDeps: { hasServerSideDB: true },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'Server Actions');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('vercel');
      });

      it('should include server actions factor with neutral impact when no DB', () => {
        const analysis = buildAnalysis({
          ssr: { hasServerActions: true },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'Server Actions');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('neutral');
      });

      it('should include API routes factor with vercel impact when native modules present', () => {
        const analysis = buildAnalysis({
          ssr: { hasApiRoutes: true },
          nodeDeps: { hasNativeModules: true, nativeModules: ['sharp'] },
          edge: { isEdgeCompatible: false, blockers: ['native'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'API Routes');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('vercel');
      });

      it('should include API routes factor with neutral impact when no native modules', () => {
        const analysis = buildAnalysis({
          ssr: { hasApiRoutes: true },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'API Routes');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('neutral');
      });

      it('should include edge compatible factor when compatible', () => {
        const analysis = buildAnalysis({
          edge: { isEdgeCompatible: true, blockers: [], warnings: [] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'Edge Compatible');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('cloudflare');
      });

      it('should not include edge compatible factor when incompatible', () => {
        const analysis = buildAnalysis({
          edge: { isEdgeCompatible: false, blockers: ['native modules'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'Edge Compatible');
        expect(factor).toBeUndefined();
      });

      it('should include static site factor for static frameworks', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'astro' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'Static Site');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('cloudflare');
      });

      it('should include static site factor for Next.js without SSR', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs' },
          // No SSR patterns
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'Static Site');
        expect(factor).toBeDefined();
      });

      it('should not include static site factor for Next.js with SSR', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs' },
          ssr: { hasServerComponents: true },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        const factor = result.factors.find((f) => f.name === 'Static Site');
        expect(factor).toBeUndefined();
      });
    });

    describe('User preferences', () => {
      it('should add preferEdge factor', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project', { preferEdge: true });

        const factor = result.factors.find((f) => f.name === 'User Preference');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('cloudflare');
        expect(factor!.weight).toBe(15);
      });

      it('should add preferCost factor', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project', { preferCost: true });

        const factor = result.factors.find((f) => f.name === 'Cost Priority');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('cloudflare');
        expect(factor!.weight).toBe(10);
      });

      it('should add requireSSR factor', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'static' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project', { requireSSR: true });

        const factor = result.factors.find((f) => f.name === 'SSR Requirement');
        expect(factor).toBeDefined();
        expect(factor!.impact).toBe('vercel');
        expect(factor!.weight).toBe(15);
      });

      it('should apply all preferences simultaneously', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project', {
          preferEdge: true,
          preferCost: true,
          requireSSR: true,
        });

        expect(result.factors.find((f) => f.name === 'User Preference')).toBeDefined();
        expect(result.factors.find((f) => f.name === 'Cost Priority')).toBeDefined();
        expect(result.factors.find((f) => f.name === 'SSR Requirement')).toBeDefined();
      });
    });

    describe('Reasoning', () => {
      it('should include native modules in reasoning for Vercel', () => {
        const analysis = buildAnalysis({
          nodeDeps: {
            hasNativeModules: true,
            nativeModules: ['prisma'],
            hasServerSideDB: true,
            dbClients: ['prisma'],
          },
          edge: { isEdgeCompatible: false, blockers: ['native'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.reasoning).toContain('native Node.js modules');
        expect(result.reasoning).toContain('prisma');
      });

      it('should include DB reasoning for Vercel', () => {
        const analysis = buildAnalysis({
          nodeDeps: { hasServerSideDB: true, dbClients: ['pg'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        if (result.platform === 'vercel') {
          expect(result.reasoning).toContain('Database operations');
        }
      });

      it('should include SEO reasoning for Vercel', () => {
        const analysis = buildAnalysis({
          seo: { metaSourcesFromDB: true },
          nodeDeps: {
            hasNativeModules: true,
            nativeModules: ['prisma'],
            hasServerSideDB: true,
            dbClients: ['prisma'],
          },
          edge: { isEdgeCompatible: false, blockers: ['native'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.reasoning).toContain('Dynamic SEO meta tags');
      });

      it('should include fs reasoning for Vercel', () => {
        const analysis = buildAnalysis({
          nodeDeps: { hasFileSystemUsage: true },
          edge: { isEdgeCompatible: false, blockers: ['fs'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.reasoning).toContain('File system');
      });

      it('should include static site reasoning for Cloudflare', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'astro' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.reasoning).toContain('static');
      });

      it('should include edge compatibility reasoning for Cloudflare', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'astro' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.reasoning).toContain('edge');
      });

      it('should include cost reasoning for Cloudflare', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'astro' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.reasoning).toContain('cost-effective');
      });

      it('should generate fallback reasoning when no specific factors apply', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'unknown' },
          // Vercel wins but no specific Vercel reasons matched
          edge: { isEdgeCompatible: false, blockers: ['some custom blocker'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.reasoning).toContain('Based on analysis');
      });
    });

    describe('Alternative recommendations', () => {
      it('should provide Cloudflare migration path when Vercel selected with Prisma', () => {
        const analysis = buildAnalysis({
          nodeDeps: {
            hasNativeModules: true,
            nativeModules: ['prisma'],
          },
          edge: { isEdgeCompatible: false, blockers: ['native'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.alternative).toBeDefined();
        expect(result.alternative!.platform).toBe('cloudflare');
        expect(result.alternative!.migrationPath).toContain(
          'Replace Prisma with Drizzle ORM + edge-compatible database'
        );
      });

      it('should provide Cloudflare migration path when Vercel selected with sharp', () => {
        const analysis = buildAnalysis({
          nodeDeps: {
            hasNativeModules: true,
            nativeModules: ['sharp'],
          },
          edge: { isEdgeCompatible: false, blockers: ['native'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.alternative).toBeDefined();
        expect(result.alternative!.migrationPath.some((s) => s.includes('Image Resizing'))).toBe(true);
      });

      it('should provide migration path for fs usage', () => {
        const analysis = buildAnalysis({
          nodeDeps: { hasFileSystemUsage: true },
          edge: { isEdgeCompatible: false, blockers: ['fs'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.alternative).toBeDefined();
        expect(result.alternative!.migrationPath.some((s) => s.includes('R2 storage'))).toBe(true);
      });

      it('should provide Vercel alternative when Cloudflare selected', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'astro' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.alternative).toBeDefined();
        expect(result.alternative!.platform).toBe('vercel');
        expect(result.alternative!.migrationPath.length).toBeGreaterThan(0);
      });

      it('should return undefined alternative when Vercel selected without migration path', () => {
        // Vercel selected but no specific native modules that have migration paths
        const analysis = buildAnalysis({
          nodeDeps: {
            hasNativeModules: true,
            nativeModules: ['canvas'], // canvas has no specific migration path listed
          },
          edge: { isEdgeCompatible: false, blockers: ['native'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.alternative).toBeUndefined();
      });
    });

    describe('Score calculation', () => {
      it('should return normalized scores that sum to approximately 100', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        // Due to rounding, may not be exactly 100
        const total = result.score.vercel + result.score.cloudflare;
        expect(total).toBeGreaterThanOrEqual(99);
        expect(total).toBeLessThanOrEqual(101);
      });

      it('should give higher Vercel score for heavy server-side projects', () => {
        const analysis = buildAnalysis({
          nodeDeps: {
            hasNativeModules: true,
            nativeModules: ['prisma', 'sharp'],
            hasFileSystemUsage: true,
            hasServerSideDB: true,
            dbClients: ['prisma'],
          },
          ssr: { hasGetServerSideProps: true },
          edge: { isEdgeCompatible: false, blockers: ['native', 'fs', 'db'] },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.score.vercel).toBeGreaterThan(result.score.cloudflare);
      });

      it('should give higher Cloudflare score for static sites', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'astro' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.score.cloudflare).toBeGreaterThan(result.score.vercel);
      });
    });

    describe('Output structure', () => {
      it('should include all required fields in recommendation', () => {
        const analysis = buildAnalysis();
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.platform).toBeDefined();
        expect(result.confidence).toBeDefined();
        expect(result.score).toBeDefined();
        expect(result.score.vercel).toBeDefined();
        expect(result.score.cloudflare).toBeDefined();
        expect(result.factors).toBeDefined();
        expect(Array.isArray(result.factors)).toBe(true);
        expect(result.analysis).toBeDefined();
        expect(result.reasoning).toBeDefined();
        expect(typeof result.reasoning).toBe('string');
      });

      it('should pass through the analysis from analyzeProject', () => {
        const analysis = buildAnalysis({
          framework: { framework: 'nextjs' },
        });
        mockAnalyzeProject.mockReturnValue(analysis);

        const result = routeDeployment('/fake/project');

        expect(result.analysis).toEqual(analysis);
      });
    });
  });

  describe('formatRecommendation', () => {
    function buildRecommendation(overrides: Partial<DeploymentRecommendation> = {}): DeploymentRecommendation {
      return {
        platform: 'vercel',
        confidence: 'high',
        score: { vercel: 70, cloudflare: 30 },
        factors: [
          { name: 'Framework', finding: 'nextjs v^14.0.0', impact: 'neutral', weight: 10 },
          { name: 'Native Modules', finding: 'Uses: prisma', impact: 'vercel', weight: 30 },
        ],
        analysis: buildAnalysis({
          edge: { isEdgeCompatible: false, blockers: ['Native modules'], warnings: [] },
        }),
        reasoning: 'Your project uses native Node.js modules.',
        ...overrides,
      };
    }

    it('should format as markdown with header', () => {
      const rec = buildRecommendation();
      const output = formatRecommendation(rec);

      expect(output).toContain('## ');
      expect(output).toContain('Deployment Recommendation');
    });

    it('should include platform name', () => {
      const rec = buildRecommendation({ platform: 'vercel' });
      const output = formatRecommendation(rec);

      expect(output).toContain('**Platform**: Vercel');
    });

    it('should include Cloudflare platform name', () => {
      const rec = buildRecommendation({ platform: 'cloudflare' });
      const output = formatRecommendation(rec);

      expect(output).toContain('**Platform**: Cloudflare');
    });

    it('should include confidence level', () => {
      const rec = buildRecommendation({ confidence: 'high' });
      const output = formatRecommendation(rec);

      expect(output).toContain('HIGH');
    });

    it('should include medium confidence indicator', () => {
      const rec = buildRecommendation({ confidence: 'medium' });
      const output = formatRecommendation(rec);

      expect(output).toContain('MEDIUM');
    });

    it('should include low confidence indicator', () => {
      const rec = buildRecommendation({ confidence: 'low' });
      const output = formatRecommendation(rec);

      expect(output).toContain('LOW');
    });

    it('should include score percentages', () => {
      const rec = buildRecommendation({ score: { vercel: 70, cloudflare: 30 } });
      const output = formatRecommendation(rec);

      expect(output).toContain('Vercel 70%');
      expect(output).toContain('Cloudflare 30%');
    });

    it('should include factor table', () => {
      const rec = buildRecommendation();
      const output = formatRecommendation(rec);

      expect(output).toContain('| Factor | Finding | Impact |');
      expect(output).toContain('| Framework |');
      expect(output).toContain('| Native Modules |');
    });

    it('should show correct impact labels', () => {
      const rec = buildRecommendation({
        factors: [
          { name: 'A', finding: 'test', impact: 'vercel', weight: 10 },
          { name: 'B', finding: 'test', impact: 'cloudflare', weight: 10 },
          { name: 'C', finding: 'test', impact: 'neutral', weight: 10 },
        ],
      });
      const output = formatRecommendation(rec);

      expect(output).toContain('Vercel');
      expect(output).toContain('Cloudflare');
      expect(output).toContain('Neutral');
    });

    it('should include reasoning section', () => {
      const rec = buildRecommendation({ reasoning: 'Custom reasoning text.' });
      const output = formatRecommendation(rec);

      expect(output).toContain('Custom reasoning text.');
    });

    it('should include alternative section when present', () => {
      const rec = buildRecommendation({
        alternative: {
          platform: 'cloudflare',
          migrationPath: ['Replace Prisma with Drizzle', 'Use R2 for storage'],
        },
      });
      const output = formatRecommendation(rec);

      expect(output).toContain('### Alternative: Cloudflare');
      expect(output).toContain('Replace Prisma with Drizzle');
      expect(output).toContain('Use R2 for storage');
    });

    it('should include alternative for Vercel', () => {
      const rec = buildRecommendation({
        platform: 'cloudflare',
        alternative: {
          platform: 'vercel',
          migrationPath: ['Better DX for Next.js'],
        },
      });
      const output = formatRecommendation(rec);

      expect(output).toContain('### Alternative: Vercel');
    });

    it('should not include alternative section when absent', () => {
      const rec = buildRecommendation({ alternative: undefined });
      const output = formatRecommendation(rec);

      expect(output).not.toContain('### Alternative');
    });

    it('should include edge blockers section when present', () => {
      const rec = buildRecommendation({
        analysis: buildAnalysis({
          edge: {
            isEdgeCompatible: false,
            blockers: ['Native modules detected: prisma'],
            warnings: [],
          },
        }),
      });
      const output = formatRecommendation(rec);

      expect(output).toContain('Edge Blockers');
      expect(output).toContain('Native modules detected: prisma');
    });

    it('should not include edge blockers section when no blockers', () => {
      const rec = buildRecommendation({
        analysis: buildAnalysis({
          edge: { isEdgeCompatible: true, blockers: [], warnings: [] },
        }),
      });
      const output = formatRecommendation(rec);

      expect(output).not.toContain('Edge Blockers');
    });

    it('should include warnings section when present', () => {
      const rec = buildRecommendation({
        analysis: buildAnalysis({
          edge: {
            isEdgeCompatible: true,
            blockers: [],
            warnings: ['getServerSideProps requires Node.js runtime'],
          },
        }),
      });
      const output = formatRecommendation(rec);

      expect(output).toContain('Warnings');
      expect(output).toContain('getServerSideProps');
    });

    it('should not include warnings section when no warnings', () => {
      const rec = buildRecommendation({
        analysis: buildAnalysis({
          edge: { isEdgeCompatible: true, blockers: [], warnings: [] },
        }),
      });
      const output = formatRecommendation(rec);

      expect(output).not.toContain('Warnings');
    });
  });
});
