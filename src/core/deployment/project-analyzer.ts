/**
 * Project Analyzer for Deployment Routing
 *
 * Analyzes project structure, dependencies, and configuration to determine
 * optimal deployment platform (Vercel vs Cloudflare).
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  FrameworkDetection,
  Framework,
  NodeDependencyAnalysis,
  SSRAnalysis,
  SEOAnalysis,
  EdgeCompatibility,
  ProjectAnalysis,
} from './types.js';

/**
 * Framework config file patterns
 */
const FRAMEWORK_CONFIGS: Record<Framework, string[]> = {
  nextjs: ['next.config.js', 'next.config.ts', 'next.config.mjs'],
  remix: ['remix.config.js', 'remix.config.ts'],
  astro: ['astro.config.mjs', 'astro.config.js', 'astro.config.ts'],
  nuxt: ['nuxt.config.ts', 'nuxt.config.js'],
  sveltekit: ['svelte.config.js', 'svelte.config.ts'],
  vite: ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'],
  cra: [], // Detected via react-scripts in package.json
  gatsby: ['gatsby-config.js', 'gatsby-config.ts'],
  static: ['index.html'],
  unknown: [],
};

/**
 * Native Node.js modules that don't work in edge runtime
 */
const NATIVE_MODULE_PATTERNS = [
  'prisma',
  '@prisma/client',
  'sharp',
  'puppeteer',
  'playwright',
  'canvas',
  'bcrypt',
  'argon2',
  'node-gyp',
  'better-sqlite3',
  'sqlite3',
  'pg-native',
  'oracledb',
  'tedious', // MS SQL
];

/**
 * Database clients that require Node.js runtime
 */
const SERVER_DB_CLIENTS = [
  'prisma',
  '@prisma/client',
  'typeorm',
  'sequelize',
  'knex',
  'pg',
  'mysql',
  'mysql2',
  'mongodb',
  'mongoose',
  'better-sqlite3',
];

/**
 * Edge-compatible database clients
 */
const EDGE_DB_CLIENTS = [
  '@libsql/client',
  '@planetscale/database',
  '@vercel/postgres',
  '@neondatabase/serverless',
  'drizzle-orm', // With edge-compatible driver
];

/**
 * Detect framework from project structure
 */
export function detectFramework(projectPath: string): FrameworkDetection {
  const frameworks: Framework[] = [
    'nextjs',
    'remix',
    'astro',
    'nuxt',
    'sveltekit',
    'gatsby',
    'vite',
  ];

  for (const framework of frameworks) {
    const configs = FRAMEWORK_CONFIGS[framework];
    for (const config of configs) {
      const configPath = path.join(projectPath, config);
      if (fs.existsSync(configPath)) {
        const version = getFrameworkVersion(projectPath, framework);
        return { framework, version, configFile: config };
      }
    }
  }

  // Check for CRA via package.json
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.dependencies?.['react-scripts'] || pkg.devDependencies?.['react-scripts']) {
        return { framework: 'cra', version: pkg.dependencies?.['react-scripts'] };
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Check for static site (just index.html)
  const indexHtmlPath = path.join(projectPath, 'index.html');
  const publicIndexPath = path.join(projectPath, 'public', 'index.html');
  if (fs.existsSync(indexHtmlPath) || fs.existsSync(publicIndexPath)) {
    return { framework: 'static' };
  }

  return { framework: 'unknown' };
}

/**
 * Get framework version from package.json
 */
function getFrameworkVersion(projectPath: string, framework: Framework): string | undefined {
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return undefined;

  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const frameworkPackages: Record<Framework, string[]> = {
      nextjs: ['next'],
      remix: ['@remix-run/react', 'remix'],
      astro: ['astro'],
      nuxt: ['nuxt'],
      sveltekit: ['@sveltejs/kit'],
      vite: ['vite'],
      cra: ['react-scripts'],
      gatsby: ['gatsby'],
      static: [],
      unknown: [],
    };

    for (const pkg of frameworkPackages[framework]) {
      if (deps[pkg]) return deps[pkg];
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

/**
 * Analyze Node.js dependencies for edge compatibility
 */
export function analyzeNodeDependencies(projectPath: string): NodeDependencyAnalysis {
  const result: NodeDependencyAnalysis = {
    hasNativeModules: false,
    nativeModules: [],
    hasFileSystemUsage: false,
    hasCryptoUsage: false,
    hasServerSideDB: false,
    dbClients: [],
  };

  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return result;

  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Check for native modules
    for (const pattern of NATIVE_MODULE_PATTERNS) {
      if (allDeps[pattern]) {
        result.hasNativeModules = true;
        result.nativeModules.push(pattern);
      }
    }

    // Check for server DB clients
    for (const client of SERVER_DB_CLIENTS) {
      if (allDeps[client]) {
        result.hasServerSideDB = true;
        result.dbClients.push(client);
      }
    }

    // Check for edge-compatible DB clients (these don't require Node.js)
    for (const client of EDGE_DB_CLIENTS) {
      if (allDeps[client]) {
        result.dbClients.push(`${client} (edge-compatible)`);
      }
    }
  } catch {
    // Ignore errors
  }

  // Scan source files for fs/crypto usage
  const srcDirs = ['src', 'app', 'pages', 'lib', 'utils'];
  for (const dir of srcDirs) {
    const dirPath = path.join(projectPath, dir);
    if (fs.existsSync(dirPath)) {
      const usages = scanForNodeUsage(dirPath);
      result.hasFileSystemUsage = result.hasFileSystemUsage || usages.fs;
      result.hasCryptoUsage = result.hasCryptoUsage || usages.crypto;
    }
  }

  return result;
}

/**
 * Scan directory for Node.js fs/crypto usage
 */
function scanForNodeUsage(dirPath: string): { fs: boolean; crypto: boolean } {
  const result = { fs: false, crypto: false };

  try {
    const files = fs.readdirSync(dirPath, { recursive: true }) as string[];

    for (const file of files) {
      if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;

      const filePath = path.join(dirPath, file);
      if (!fs.statSync(filePath).isFile()) continue;

      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for fs usage
      if (
        /require\s*\(\s*['"]fs['"]\s*\)/.test(content) ||
        /from\s+['"]fs['"]/.test(content) ||
        /from\s+['"]node:fs['"]/.test(content) ||
        /import\s+.*\s+from\s+['"]fs/.test(content)
      ) {
        result.fs = true;
      }

      // Check for crypto usage
      if (
        /require\s*\(\s*['"]crypto['"]\s*\)/.test(content) ||
        /from\s+['"]crypto['"]/.test(content) ||
        /from\s+['"]node:crypto['"]/.test(content)
      ) {
        result.crypto = true;
      }
    }
  } catch {
    // Ignore errors
  }

  return result;
}

/**
 * Analyze SSR patterns in the project
 */
export function analyzeSSR(projectPath: string): SSRAnalysis {
  const result: SSRAnalysis = {
    hasServerComponents: false,
    hasServerActions: false,
    hasGetServerSideProps: false,
    hasGenerateMetadata: false,
    hasDynamicRoutes: false,
    hasApiRoutes: false,
  };

  const srcDirs = ['src', 'app', 'pages', 'lib'];

  for (const dir of srcDirs) {
    const dirPath = path.join(projectPath, dir);
    if (!fs.existsSync(dirPath)) continue;

    try {
      const files = fs.readdirSync(dirPath, { recursive: true }) as string[];

      for (const file of files) {
        if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;

        const filePath = path.join(dirPath, file);
        if (!fs.statSync(filePath).isFile()) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for Server Components (Next.js 13+)
        if (/['"]use server['"]/.test(content)) {
          result.hasServerComponents = true;
        }

        // Check for Server Actions
        if (/['"]use server['"]/.test(content) && /async\s+function/.test(content)) {
          result.hasServerActions = true;
        }

        // Check for getServerSideProps (Next.js pages)
        if (/export\s+(async\s+)?function\s+getServerSideProps/.test(content)) {
          result.hasGetServerSideProps = true;
        }

        // Check for generateMetadata (Next.js 13+)
        if (/export\s+(async\s+)?function\s+generateMetadata/.test(content)) {
          result.hasGenerateMetadata = true;
        }

        // Check for dynamic routes
        if (/\[.*\]/.test(file)) {
          result.hasDynamicRoutes = true;
        }
      }
    } catch {
      // Ignore errors
    }
  }

  // Check for API routes
  const apiDirs = [
    path.join(projectPath, 'pages', 'api'),
    path.join(projectPath, 'app', 'api'),
    path.join(projectPath, 'src', 'pages', 'api'),
    path.join(projectPath, 'src', 'app', 'api'),
  ];

  for (const apiDir of apiDirs) {
    if (fs.existsSync(apiDir)) {
      result.hasApiRoutes = true;
      break;
    }
  }

  return result;
}

/**
 * Analyze SEO requirements
 */
export function analyzeSEO(projectPath: string): SEOAnalysis {
  const result: SEOAnalysis = {
    hasDynamicMeta: false,
    hasStaticMeta: false,
    hasSitemap: false,
    hasRobotsTxt: false,
    hasStructuredData: false,
    metaSourcesFromDB: false,
  };

  // Check for sitemap and robots.txt
  const publicDir = path.join(projectPath, 'public');
  if (fs.existsSync(publicDir)) {
    if (fs.existsSync(path.join(publicDir, 'sitemap.xml'))) {
      result.hasSitemap = true;
    }
    if (fs.existsSync(path.join(publicDir, 'robots.txt'))) {
      result.hasRobotsTxt = true;
    }
  }

  // Check for sitemap generation in app
  const appDir = path.join(projectPath, 'app');
  const srcAppDir = path.join(projectPath, 'src', 'app');
  const sitemapFiles = ['sitemap.ts', 'sitemap.js', 'sitemap.xml'];

  for (const sitemapFile of sitemapFiles) {
    if (
      fs.existsSync(path.join(appDir, sitemapFile)) ||
      fs.existsSync(path.join(srcAppDir, sitemapFile))
    ) {
      result.hasSitemap = true;
      break;
    }
  }

  // Scan for meta patterns
  const srcDirs = ['src', 'app', 'pages', 'components'];

  for (const dir of srcDirs) {
    const dirPath = path.join(projectPath, dir);
    if (!fs.existsSync(dirPath)) continue;

    try {
      const files = fs.readdirSync(dirPath, { recursive: true }) as string[];

      for (const file of files) {
        if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;

        const filePath = path.join(dirPath, file);
        if (!fs.statSync(filePath).isFile()) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for generateMetadata with DB calls
        if (/generateMetadata/.test(content)) {
          result.hasDynamicMeta = true;

          // Check if metadata comes from database
          if (
            /prisma|db\.|fetch\s*\(|supabase|mongoose/.test(content) &&
            /generateMetadata/.test(content)
          ) {
            result.metaSourcesFromDB = true;
          }
        }

        // Check for static Head/meta
        if (/<Head>|<meta/.test(content)) {
          result.hasStaticMeta = true;
        }

        // Check for structured data (JSON-LD)
        if (/application\/ld\+json|@type.*Product|@type.*Article/.test(content)) {
          result.hasStructuredData = true;
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return result;
}

/**
 * Analyze edge compatibility
 */
export function analyzeEdgeCompatibility(
  nodeDeps: NodeDependencyAnalysis,
  ssr: SSRAnalysis
): EdgeCompatibility {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Native modules block edge deployment
  if (nodeDeps.hasNativeModules) {
    blockers.push(`Native modules detected: ${nodeDeps.nativeModules.join(', ')}`);
  }

  // File system usage blocks edge
  if (nodeDeps.hasFileSystemUsage) {
    blockers.push('File system (fs) usage detected');
  }

  // Server-side DB clients may block edge
  if (nodeDeps.hasServerSideDB) {
    const serverOnlyClients = nodeDeps.dbClients.filter(
      (c) => !c.includes('edge-compatible')
    );
    if (serverOnlyClients.length > 0) {
      blockers.push(`Server-only database clients: ${serverOnlyClients.join(', ')}`);
    }
  }

  // getServerSideProps requires Node.js
  if (ssr.hasGetServerSideProps) {
    warnings.push('getServerSideProps requires Node.js runtime (consider ISR/SSG)');
  }

  // Server Actions may have issues on edge
  if (ssr.hasServerActions && nodeDeps.hasServerSideDB) {
    warnings.push('Server Actions with database may need Node.js runtime');
  }

  return {
    isEdgeCompatible: blockers.length === 0,
    blockers,
    warnings,
  };
}

/**
 * Full project analysis
 */
export function analyzeProject(projectPath: string): ProjectAnalysis {
  const framework = detectFramework(projectPath);
  const nodeDeps = analyzeNodeDependencies(projectPath);
  const ssr = analyzeSSR(projectPath);
  const seo = analyzeSEO(projectPath);
  const edge = analyzeEdgeCompatibility(nodeDeps, ssr);

  return {
    framework,
    nodeDeps,
    ssr,
    seo,
    edge,
  };
}
