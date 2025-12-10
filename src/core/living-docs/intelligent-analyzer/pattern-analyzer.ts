/**
 * Pattern Analyzer
 *
 * Detects architectural patterns and framework choices from codebase.
 * Categories: State Management, API Style, Auth, Database, Testing
 */

import * as fs from 'fs';
import * as path from 'path';
import type { RepoInfo } from './repo-scanner.js';

export interface Pattern {
  category: PatternCategory;
  name: string;
  confidence: number; // 0-100 (percentage of codebase using this)
  evidence: Evidence[];
  decision: string;
}

export type PatternCategory =
  | 'state-management'
  | 'api-style'
  | 'auth'
  | 'database'
  | 'testing'
  | 'other';

export interface Evidence {
  file: string;
  lineNumber?: number;
  snippet?: string;
  reason: string;
}

export interface Inconsistency {
  type: 'mixed-patterns' | 'outdated-deps' | 'code-duplication' | 'large-files';
  severity: 'P1' | 'P2' | 'P3';
  description: string;
  affectedFiles: string[];
  recommendation: string;
}

export interface AnalysisResult {
  patterns: Pattern[];
  inconsistencies: Inconsistency[];
}

/**
 * Analyzes codebases to detect patterns and architectural decisions.
 */
export class PatternAnalyzer {
  private repos: RepoInfo[];

  constructor(repos: RepoInfo[]) {
    this.repos = repos;
  }

  /**
   * Analyze all patterns across all repos.
   */
  async analyzeAll(): Promise<AnalysisResult> {
    const patterns: Pattern[] = [];
    const inconsistencies: Inconsistency[] = [];

    for (const repo of this.repos) {
      // State management patterns
      patterns.push(...(await this.detectStateManagement(repo)));

      // API style patterns
      patterns.push(...(await this.detectAPIStyle(repo)));

      // Auth strategy patterns
      patterns.push(...(await this.detectAuthStrategy(repo)));

      // Database access patterns
      patterns.push(...(await this.detectDatabaseAccess(repo)));

      // Testing approach
      patterns.push(...(await this.detectTestingApproach(repo)));
    }

    // Detect inconsistencies
    inconsistencies.push(...(await this.detectInconsistencies()));

    return { patterns, inconsistencies };
  }

  /**
   * Detect state management patterns (Redux, Context API, MobX, Zustand).
   */
  async detectStateManagement(repo: RepoInfo): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Redux detection
    const reduxEvidence = this.findReduxEvidence(repo.path);
    if (reduxEvidence.length > 0) {
      const componentCount = this.countFiles(repo.path, /\.(tsx?|jsx?)$/);
      const reduxUsageCount = this.countPatternUsage(repo.path, /(useSelector|useDispatch|connect)/);
      const confidence = componentCount > 0 ? Math.round((reduxUsageCount / componentCount) * 100) : 0;

      patterns.push({
        category: 'state-management',
        name: 'Redux',
        confidence,
        evidence: reduxEvidence,
        decision: 'Use Redux for global state management',
      });
    }

    // Context API detection
    const contextEvidence = this.findContextAPIEvidence(repo.path);
    if (contextEvidence.length > 0) {
      const componentCount = this.countFiles(repo.path, /\.(tsx?|jsx?)$/);
      const contextUsageCount = this.countPatternUsage(repo.path, /(createContext|useContext)/);
      const confidence = componentCount > 0 ? Math.round((contextUsageCount / componentCount) * 100) : 0;

      patterns.push({
        category: 'state-management',
        name: 'Context API',
        confidence,
        evidence: contextEvidence,
        decision: 'Use React Context API for theme/locale/authentication context',
      });
    }

    // MobX detection
    const mobxEvidence = this.findMobXEvidence(repo.path);
    if (mobxEvidence.length > 0) {
      patterns.push({
        category: 'state-management',
        name: 'MobX',
        confidence: 50, // Placeholder
        evidence: mobxEvidence,
        decision: 'Use MobX for reactive state management',
      });
    }

    // Zustand detection
    const zustandEvidence = this.findZustandEvidence(repo.path);
    if (zustandEvidence.length > 0) {
      patterns.push({
        category: 'state-management',
        name: 'Zustand',
        confidence: 50, // Placeholder
        evidence: zustandEvidence,
        decision: 'Use Zustand for lightweight state management',
      });
    }

    return patterns;
  }

  /**
   * Detect API style patterns (REST, GraphQL, gRPC).
   */
  async detectAPIStyle(repo: RepoInfo): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // REST API detection (Express, Fastify routes)
    const restEvidence = this.findRESTEvidence(repo.path);
    if (restEvidence.length > 0) {
      patterns.push({
        category: 'api-style',
        name: 'REST API',
        confidence: 80,
        evidence: restEvidence,
        decision: 'Use RESTful API architecture',
      });
    }

    // GraphQL detection
    const graphqlEvidence = this.findGraphQLEvidence(repo.path);
    if (graphqlEvidence.length > 0) {
      patterns.push({
        category: 'api-style',
        name: 'GraphQL',
        confidence: 70,
        evidence: graphqlEvidence,
        decision: 'Use GraphQL for flexible API queries',
      });
    }

    return patterns;
  }

  /**
   * Detect authentication strategy.
   */
  async detectAuthStrategy(repo: RepoInfo): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // JWT detection
    const jwtEvidence = this.findJWTEvidence(repo.path);
    if (jwtEvidence.length > 0) {
      patterns.push({
        category: 'auth',
        name: 'JWT',
        confidence: 90,
        evidence: jwtEvidence,
        decision: 'Use JWT for stateless authentication',
      });
    }

    // OAuth/SSO detection
    const oauthEvidence = this.findOAuthEvidence(repo.path);
    if (oauthEvidence.length > 0) {
      patterns.push({
        category: 'auth',
        name: 'OAuth/SSO',
        confidence: 80,
        evidence: oauthEvidence,
        decision: 'Use OAuth 2.0 for third-party authentication',
      });
    }

    return patterns;
  }

  /**
   * Detect database access patterns.
   */
  async detectDatabaseAccess(repo: RepoInfo): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Prisma detection
    const prismaEvidence = this.findPrismaEvidence(repo.path);
    if (prismaEvidence.length > 0) {
      patterns.push({
        category: 'database',
        name: 'Prisma ORM',
        confidence: 95,
        evidence: prismaEvidence,
        decision: 'Use Prisma ORM with PostgreSQL',
      });
    }

    // TypeORM detection
    const typeormEvidence = this.findTypeORMEvidence(repo.path);
    if (typeormEvidence.length > 0) {
      patterns.push({
        category: 'database',
        name: 'TypeORM',
        confidence: 90,
        evidence: typeormEvidence,
        decision: 'Use TypeORM for database access',
      });
    }

    return patterns;
  }

  /**
   * Detect testing approach.
   */
  async detectTestingApproach(repo: RepoInfo): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Jest detection
    const jestEvidence = this.findJestEvidence(repo.path);
    if (jestEvidence.length > 0) {
      patterns.push({
        category: 'testing',
        name: 'Jest',
        confidence: 85,
        evidence: jestEvidence,
        decision: 'Use Jest for unit testing',
      });
    }

    // Vitest detection
    const vitestEvidence = this.findVitestEvidence(repo.path);
    if (vitestEvidence.length > 0) {
      patterns.push({
        category: 'testing',
        name: 'Vitest',
        confidence: 85,
        evidence: vitestEvidence,
        decision: 'Use Vitest for fast unit testing',
      });
    }

    return patterns;
  }

  /**
   * Detect inconsistencies (mixed patterns, TS/JS mix).
   */
  async detectInconsistencies(): Promise<Inconsistency[]> {
    const inconsistencies: Inconsistency[] = [];

    for (const repo of this.repos) {
      // Detect TS/JS mix
      const tsFiles = this.countFiles(repo.path, /\.tsx?$/);
      const jsFiles = this.countFiles(repo.path, /\.jsx?$/);
      const total = tsFiles + jsFiles;

      if (total > 0 && tsFiles > 0 && jsFiles > 0) {
        const tsPercentage = Math.round((tsFiles / total) * 100);
        const jsPercentage = 100 - tsPercentage;

        if (tsPercentage >= 20 && jsPercentage >= 20) {
          inconsistencies.push({
            type: 'mixed-patterns',
            severity: 'P2',
            description: `Mixed TypeScript/JavaScript usage: ${tsPercentage}% TS, ${jsPercentage}% JS`,
            affectedFiles: [],
            recommendation: 'Migrate all JavaScript files to TypeScript for consistency',
          });
        }
      }
    }

    return inconsistencies;
  }

  // Helper methods for pattern detection

  private findReduxEvidence(repoPath: string): Evidence[] {
    const evidence: Evidence[] = [];

    // Check for Redux store
    if (fs.existsSync(path.join(repoPath, 'src/store'))) {
      evidence.push({
        file: 'src/store/',
        reason: 'Redux store directory found',
      });
    }

    // Check package.json
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['redux'] || deps['@reduxjs/toolkit']) {
        evidence.push({
          file: 'package.json',
          reason: 'Redux dependencies found',
        });
      }
    }

    return evidence;
  }

  private findContextAPIEvidence(repoPath: string): Evidence[] {
    // Simplified - would grep for createContext in files
    return [];
  }

  private findMobXEvidence(repoPath: string): Evidence[] {
    const evidence: Evidence[] = [];
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.dependencies?.['mobx']) {
        evidence.push({ file: 'package.json', reason: 'MobX dependency found' });
      }
    }
    return evidence;
  }

  private findZustandEvidence(repoPath: string): Evidence[] {
    const evidence: Evidence[] = [];
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.dependencies?.['zustand']) {
        evidence.push({ file: 'package.json', reason: 'Zustand dependency found' });
      }
    }
    return evidence;
  }

  private findRESTEvidence(repoPath: string): Evidence[] {
    const evidence: Evidence[] = [];
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.dependencies?.['express'] || pkg.dependencies?.['fastify']) {
        evidence.push({ file: 'package.json', reason: 'Express/Fastify framework found' });
      }
    }
    return evidence;
  }

  private findGraphQLEvidence(repoPath: string): Evidence[] {
    const evidence: Evidence[] = [];
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.dependencies?.['graphql'] || pkg.dependencies?.['apollo-server']) {
        evidence.push({ file: 'package.json', reason: 'GraphQL dependencies found' });
      }
    }
    return evidence;
  }

  private findJWTEvidence(repoPath: string): Evidence[] {
    const evidence: Evidence[] = [];
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.dependencies?.['jsonwebtoken']) {
        evidence.push({ file: 'package.json', reason: 'jsonwebtoken dependency found' });
      }
    }
    return evidence;
  }

  private findOAuthEvidence(repoPath: string): Evidence[] {
    const evidence: Evidence[] = [];
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.dependencies?.['passport'] || pkg.dependencies?.['next-auth']) {
        evidence.push({ file: 'package.json', reason: 'OAuth library found' });
      }
    }
    return evidence;
  }

  private findPrismaEvidence(repoPath: string): Evidence[] {
    const evidence: Evidence[] = [];
    if (fs.existsSync(path.join(repoPath, 'prisma/schema.prisma'))) {
      evidence.push({ file: 'prisma/schema.prisma', reason: 'Prisma schema found' });
    }
    return evidence;
  }

  private findTypeORMEvidence(repoPath: string): Evidence[] {
    const evidence: Evidence[] = [];
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.dependencies?.['typeorm']) {
        evidence.push({ file: 'package.json', reason: 'TypeORM dependency found' });
      }
    }
    return evidence;
  }

  private findJestEvidence(repoPath: string): Evidence[] {
    const evidence: Evidence[] = [];
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.devDependencies?.['jest']) {
        evidence.push({ file: 'package.json', reason: 'Jest dependency found' });
      }
    }
    return evidence;
  }

  private findVitestEvidence(repoPath: string): Evidence[] {
    const evidence: Evidence[] = [];
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.devDependencies?.['vitest']) {
        evidence.push({ file: 'package.json', reason: 'Vitest dependency found' });
      }
    }
    return evidence;
  }

  private countFiles(repoPath: string, pattern: RegExp): number {
    let count = 0;
    const excludeDirs = ['node_modules', '.git', 'dist', 'build'];

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (excludeDirs.includes(entry.name)) continue;

          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (pattern.test(entry.name)) {
            count++;
          }
        }
      } catch {
        // Ignore errors
      }
    };

    walk(repoPath);
    return count;
  }

  private countPatternUsage(repoPath: string, pattern: RegExp): number {
    let count = 0;
    const excludeDirs = ['node_modules', '.git', 'dist', 'build'];

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (excludeDirs.includes(entry.name)) continue;

          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const matches = content.match(pattern);
              if (matches) count += matches.length;
            } catch {
              // Ignore read errors
            }
          }
        }
      } catch {
        // Ignore errors
      }
    };

    walk(repoPath);
    return count;
  }
}
