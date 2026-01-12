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
 * Common source directories to scan
 */
const SOURCE_DIRS = ['src', 'app', 'pages', 'lib', 'utils', 'components'];

/**
 * Check if a file is a TypeScript/JavaScript source file
 */
function isSourceFile(filename: string): boolean {
  return /\.(ts|tsx|js|jsx)$/.test(filename);
}

/**
 * Safely read and parse package.json
 */
function readPackageJson(projectPath: string): Record<string, unknown> | null {
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Get all dependencies from package.json
 */
function getAllDependencies(pkg: Record<string, unknown>): Record<string, string> {
  const deps = (pkg.dependencies || {}) as Record<string, string>;
  const devDeps = (pkg.devDependencies || {}) as Record<string, string>;
  return { ...deps, ...devDeps };
}

/**
 * Scan source files in a directory and apply a visitor function
 */
function scanSourceFiles(
  dirPath: string,
  visitor: (content: string, filePath: string) => void
): void {
  if (!fs.existsSync(dirPath)) return;

  try {
    const files = fs.readdirSync(dirPath, { recursive: true }) as string[];

    for (const file of files) {
      if (!isSourceFile(file)) continue;

      const filePath = path.join(dirPath, file);
      if (!fs.statSync(filePath).isFile()) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      visitor(content, filePath);
    }
  } catch {
    // Ignore errors during scanning
  }
}

/**
 * Detect framework from project structure
 */
export function detectFramework(projectPath: string): FrameworkDetection {
  // Check config-based frameworks first
  const configBasedFrameworks: Framework[] = [
    'nextjs',
    'remix',
    'astro',
    'nuxt',
    'sveltekit',
    'gatsby',
    'vite',
  ];

  for (const framework of configBasedFrameworks) {
    const configs = FRAMEWORK_CONFIGS[framework];
    for (const config of configs) {
      if (fs.existsSync(path.join(projectPath, config))) {
        return {
          framework,
          version: getFrameworkVersion(projectPath, framework),
          configFile: config,
        };
      }
    }
  }

  // Check for CRA via package.json
  const pkg = readPackageJson(projectPath);
  if (pkg) {
    const allDeps = getAllDependencies(pkg);
    if (allDeps['react-scripts']) {
      return { framework: 'cra', version: allDeps['react-scripts'] };
    }
  }

  // Check for static site (index.html in root or public)
  const hasIndexHtml =
    fs.existsSync(path.join(projectPath, 'index.html')) ||
    fs.existsSync(path.join(projectPath, 'public', 'index.html'));

  if (hasIndexHtml) {
    return { framework: 'static' };
  }

  return { framework: 'unknown' };
}

/**
 * Framework to package name mapping
 */
const FRAMEWORK_PACKAGES: Record<Framework, string[]> = {
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

/**
 * Get framework version from package.json
 */
function getFrameworkVersion(projectPath: string, framework: Framework): string | undefined {
  const pkg = readPackageJson(projectPath);
  if (!pkg) return undefined;

  const deps = getAllDependencies(pkg);
  const packages = FRAMEWORK_PACKAGES[framework];

  for (const packageName of packages) {
    if (deps[packageName]) {
      return deps[packageName];
    }
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

  const pkg = readPackageJson(projectPath);
  if (pkg) {
    const allDeps = getAllDependencies(pkg);

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

    // Check for edge-compatible DB clients
    for (const client of EDGE_DB_CLIENTS) {
      if (allDeps[client]) {
        result.dbClients.push(`${client} (edge-compatible)`);
      }
    }
  }

  // Scan source files for fs/crypto usage
  for (const dir of SOURCE_DIRS) {
    const dirPath = path.join(projectPath, dir);
    const usages = scanForNodeUsage(dirPath);
    result.hasFileSystemUsage = result.hasFileSystemUsage || usages.fs;
    result.hasCryptoUsage = result.hasCryptoUsage || usages.crypto;
  }

  return result;
}

/**
 * Check if content imports the fs module
 */
function hasFsImport(content: string): boolean {
  return (
    /require\s*\(\s*['"]fs['"]\s*\)/.test(content) ||
    /from\s+['"]fs['"]/.test(content) ||
    /from\s+['"]node:fs['"]/.test(content) ||
    /import\s+.*\s+from\s+['"]fs/.test(content)
  );
}

/**
 * Check if content imports the crypto module
 */
function hasCryptoImport(content: string): boolean {
  return (
    /require\s*\(\s*['"]crypto['"]\s*\)/.test(content) ||
    /from\s+['"]crypto['"]/.test(content) ||
    /from\s+['"]node:crypto['"]/.test(content)
  );
}

/**
 * Scan directory for Node.js fs/crypto usage
 */
function scanForNodeUsage(dirPath: string): { fs: boolean; crypto: boolean } {
  const result = { fs: false, crypto: false };

  scanSourceFiles(dirPath, (content) => {
    if (hasFsImport(content)) result.fs = true;
    if (hasCryptoImport(content)) result.crypto = true;
  });

  return result;
}

/**
 * Check for API routes in common locations
 */
function hasApiRoutes(projectPath: string): boolean {
  const apiDirs = [
    path.join(projectPath, 'pages', 'api'),
    path.join(projectPath, 'app', 'api'),
    path.join(projectPath, 'src', 'pages', 'api'),
    path.join(projectPath, 'src', 'app', 'api'),
  ];

  return apiDirs.some((dir) => fs.existsSync(dir));
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
    hasApiRoutes: hasApiRoutes(projectPath),
  };

  const ssrDirs = ['src', 'app', 'pages', 'lib'];

  for (const dir of ssrDirs) {
    const dirPath = path.join(projectPath, dir);

    scanSourceFiles(dirPath, (content, filePath) => {
      const hasUseServer = /['"]use server['"]/.test(content);

      if (hasUseServer) {
        result.hasServerComponents = true;
        if (/async\s+function/.test(content)) {
          result.hasServerActions = true;
        }
      }

      if (/export\s+(async\s+)?function\s+getServerSideProps/.test(content)) {
        result.hasGetServerSideProps = true;
      }

      if (/export\s+(async\s+)?function\s+generateMetadata/.test(content)) {
        result.hasGenerateMetadata = true;
      }

      // Check if any part of the path (not just basename) contains dynamic route brackets
      if (/\[.*\]/.test(filePath)) {
        result.hasDynamicRoutes = true;
      }
    });
  }

  return result;
}

/**
 * Check if sitemap exists in public or app directories
 */
function hasSitemap(projectPath: string): boolean {
  const publicSitemap = path.join(projectPath, 'public', 'sitemap.xml');
  if (fs.existsSync(publicSitemap)) return true;

  const appDirs = [
    path.join(projectPath, 'app'),
    path.join(projectPath, 'src', 'app'),
  ];

  const sitemapFiles = ['sitemap.ts', 'sitemap.js', 'sitemap.xml'];

  for (const appDir of appDirs) {
    for (const sitemapFile of sitemapFiles) {
      if (fs.existsSync(path.join(appDir, sitemapFile))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if content uses database for metadata generation
 */
function hasDbMetadata(content: string): boolean {
  return (
    /generateMetadata/.test(content) &&
    /prisma|db\.|fetch\s*\(|supabase|mongoose/.test(content)
  );
}

/**
 * Analyze SEO requirements
 */
export function analyzeSEO(projectPath: string): SEOAnalysis {
  const publicDir = path.join(projectPath, 'public');

  const result: SEOAnalysis = {
    hasDynamicMeta: false,
    hasStaticMeta: false,
    hasSitemap: hasSitemap(projectPath),
    hasRobotsTxt: fs.existsSync(path.join(publicDir, 'robots.txt')),
    hasStructuredData: false,
    metaSourcesFromDB: false,
  };

  const seoDirs = ['src', 'app', 'pages', 'components'];

  for (const dir of seoDirs) {
    const dirPath = path.join(projectPath, dir);

    scanSourceFiles(dirPath, (content) => {
      if (/generateMetadata/.test(content)) {
        result.hasDynamicMeta = true;
        if (hasDbMetadata(content)) {
          result.metaSourcesFromDB = true;
        }
      }

      if (/<Head>|<meta/.test(content)) {
        result.hasStaticMeta = true;
      }

      if (/application\/ld\+json|@type.*Product|@type.*Article/.test(content)) {
        result.hasStructuredData = true;
      }
    });
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
