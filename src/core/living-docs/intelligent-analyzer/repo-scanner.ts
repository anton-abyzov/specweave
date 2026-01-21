/**
 * Repo Scanner
 *
 * Discovers and inventories all repositories in the project.
 * Detects repo type (frontend/backend/mobile/shared-lib) and extracts tech stack.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger, consoleLogger } from '../../../utils/logger.js';
import { PackageJsonCache, type PackageJsonContent } from '../../../utils/package-json-cache.js';

export interface RepoInfo {
  path: string;
  name: string;
  type: RepoType;
  techStack: TechStack;
  fileCount: number;
  lineCount: number;
  languages: LanguageStats[];
  lastCommit: string;
  branch: string;
}

export type RepoType = 'frontend' | 'backend' | 'mobile' | 'shared-lib' | 'infrastructure' | 'unknown';

export interface TechStack {
  primary: string;      // 'typescript', 'go', 'python', etc.
  framework?: string;   // 'nextjs', 'gin', 'django', etc.
  database?: string;    // 'postgresql', 'mongodb', etc.
  orm?: string;         // 'prisma', 'gorm', 'sqlalchemy', etc.
  testing?: string;     // 'jest', 'vitest', 'pytest', etc.
}

export interface LanguageStats {
  language: string;
  fileCount: number;
  percentage: number;
}

/**
 * Repository scanner that discovers repos and extracts metadata.
 */
export class RepoScanner {
  private projectRoot: string;
  private logger: Logger;
  private pkgCache: PackageJsonCache;

  constructor(projectRoot: string, logger?: Logger) {
    this.projectRoot = projectRoot;
    this.logger = logger ?? consoleLogger;
    this.pkgCache = PackageJsonCache.getInstance();
  }

  /**
   * Scan all repos (umbrella or single).
   */
  async scanAll(): Promise<RepoInfo[]> {
    const repos = await this.discoverRepos();
    const repoInfos: RepoInfo[] = [];

    for (const repo of repos) {
      const info = await this.scanRepo(repo.path);
      repoInfos.push(info);
    }

    return repoInfos;
  }

  /**
   * Scan a single repository.
   */
  async scanRepo(repoPath: string): Promise<RepoInfo> {
    const name = path.basename(repoPath);
    const type = this.detectRepoType(repoPath);
    const techStack = await this.extractTechStack(repoPath);
    const fileCount = this.countFiles(repoPath);
    const lineCount = await this.countLines(repoPath);
    const languages = this.detectLanguages(repoPath);
    const { lastCommit, branch } = this.getGitInfo(repoPath);

    return {
      path: repoPath,
      name,
      type,
      techStack,
      fileCount,
      lineCount,
      languages,
      lastCommit,
      branch,
    };
  }

  /**
   * Detect repository type based on file patterns.
   * Uses PackageJsonCache to avoid redundant file reads.
   */
  detectRepoType(repoPath: string): RepoType {
    // Check package.json for Node.js projects (using cache)
    const pkg = this.pkgCache.get(repoPath);
    if (pkg) {
      const deps = this.pkgCache.getAllDependencies(pkg);

      // Frontend indicators
      if (deps['react'] || deps['vue'] || deps['@angular/core'] || deps['svelte']) {
        return 'frontend';
      }

      // Mobile indicators
      if (deps['react-native'] || deps['expo'] || deps['@ionic/angular']) {
        return 'mobile';
      }

      // Backend indicators
      if (deps['express'] || deps['fastify'] || deps['koa'] || deps['@nestjs/core']) {
        return 'backend';
      }
    }

    // Check go.mod for Go projects
    if (fs.existsSync(path.join(repoPath, 'go.mod'))) {
      return 'backend';
    }

    // Check requirements.txt for Python projects
    if (fs.existsSync(path.join(repoPath, 'requirements.txt'))) {
      const content = fs.readFileSync(path.join(repoPath, 'requirements.txt'), 'utf-8');
      if (content.includes('django') || content.includes('flask') || content.includes('fastapi')) {
        return 'backend';
      }
    }

    // Check for Terraform/infrastructure
    const tfFiles = this.findFiles(repoPath, /\.tf$/);
    if (tfFiles.length > 0) {
      return 'infrastructure';
    }

    // Check for shared library indicators
    const hasTypesFolder = fs.existsSync(path.join(repoPath, 'types'));
    const hasUtilsFolder = fs.existsSync(path.join(repoPath, 'utils'));
    const hasSharedFolder = fs.existsSync(path.join(repoPath, 'shared'));

    if ((hasTypesFolder || hasUtilsFolder || hasSharedFolder) && pkg) {
      // Reuse cached pkg instead of re-reading
      if (pkg.main || pkg.exports) {
        return 'shared-lib';
      }
    }

    return 'unknown';
  }

  /**
   * Extract tech stack from repository.
   * Uses PackageJsonCache to avoid redundant file reads.
   */
  async extractTechStack(repoPath: string): Promise<TechStack> {
    const techStack: TechStack = {
      primary: 'unknown',
    };

    // Check package.json for Node.js/TypeScript (using cache)
    const pkg = this.pkgCache.get(repoPath);
    if (pkg) {
      const deps = this.pkgCache.getAllDependencies(pkg);

      // Primary language
      if (deps['typescript'] || fs.existsSync(path.join(repoPath, 'tsconfig.json'))) {
        techStack.primary = 'typescript';
      } else {
        techStack.primary = 'javascript';
      }

      // Framework detection
      if (deps['next']) techStack.framework = 'nextjs';
      else if (deps['@nestjs/core']) techStack.framework = 'nestjs';
      else if (deps['express']) techStack.framework = 'express';
      else if (deps['fastify']) techStack.framework = 'fastify';
      else if (deps['react']) techStack.framework = 'react';
      else if (deps['vue']) techStack.framework = 'vue';
      else if (deps['@angular/core']) techStack.framework = 'angular';

      // Database detection
      if (deps['pg'] || deps['postgres']) techStack.database = 'postgresql';
      else if (deps['mysql'] || deps['mysql2']) techStack.database = 'mysql';
      else if (deps['mongodb'] || deps['mongoose']) techStack.database = 'mongodb';
      else if (deps['redis']) techStack.database = 'redis';

      // ORM detection
      if (deps['prisma'] || deps['@prisma/client']) techStack.orm = 'prisma';
      else if (deps['typeorm']) techStack.orm = 'typeorm';
      else if (deps['sequelize']) techStack.orm = 'sequelize';
      else if (deps['mongoose']) techStack.orm = 'mongoose';

      // Testing framework
      if (deps['jest']) techStack.testing = 'jest';
      else if (deps['vitest']) techStack.testing = 'vitest';
      else if (deps['mocha']) techStack.testing = 'mocha';
      else if (deps['@playwright/test']) techStack.testing = 'playwright';
    }

    // Check go.mod for Go projects
    if (fs.existsSync(path.join(repoPath, 'go.mod'))) {
      techStack.primary = 'go';
      const goModContent = fs.readFileSync(path.join(repoPath, 'go.mod'), 'utf-8');
      if (goModContent.includes('gin-gonic/gin')) techStack.framework = 'gin';
      else if (goModContent.includes('gorilla/mux')) techStack.framework = 'gorilla';
      if (goModContent.includes('gorm.io/gorm')) techStack.orm = 'gorm';
    }

    // Check requirements.txt for Python
    const requirementsTxt = path.join(repoPath, 'requirements.txt');
    if (fs.existsSync(requirementsTxt)) {
      techStack.primary = 'python';
      const content = fs.readFileSync(requirementsTxt, 'utf-8');
      if (content.includes('django')) techStack.framework = 'django';
      else if (content.includes('flask')) techStack.framework = 'flask';
      else if (content.includes('fastapi')) techStack.framework = 'fastapi';
      if (content.includes('sqlalchemy')) techStack.orm = 'sqlalchemy';
      if (content.includes('pytest')) techStack.testing = 'pytest';
    }

    // Check for Rust
    if (fs.existsSync(path.join(repoPath, 'Cargo.toml'))) {
      techStack.primary = 'rust';
    }

    // Check for Java
    if (fs.existsSync(path.join(repoPath, 'pom.xml')) || fs.existsSync(path.join(repoPath, 'build.gradle'))) {
      techStack.primary = 'java';
    }

    return techStack;
  }

  /**
   * Count files in repository (excluding node_modules, .git, etc.).
   */
  private countFiles(repoPath: string): number {
    let count = 0;
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.specweave', 'coverage', '__pycache__'];

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (excludeDirs.includes(entry.name)) continue;

          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else {
            count++;
          }
        }
      } catch {
        // Ignore permission errors
      }
    };

    walk(repoPath);
    return count;
  }

  /**
   * Count total lines of code.
   */
  private async countLines(repoPath: string): Promise<number> {
    // Simplified - would use cloc or similar in production
    return 0; // Placeholder
  }

  /**
   * Detect languages used in repository.
   */
  private detectLanguages(repoPath: string): LanguageStats[] {
    const langCounts: Record<string, number> = {};
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.specweave'];

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (excludeDirs.includes(entry.name)) continue;

          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else {
            const ext = path.extname(entry.name);
            const lang = this.extensionToLanguage(ext);
            if (lang) {
              langCounts[lang] = (langCounts[lang] || 0) + 1;
            }
          }
        }
      } catch {
        // Ignore permission errors
      }
    };

    walk(repoPath);

    const total = Object.values(langCounts).reduce((sum, count) => sum + count, 0);
    const stats: LanguageStats[] = [];

    for (const [language, fileCount] of Object.entries(langCounts)) {
      stats.push({
        language,
        fileCount,
        percentage: Math.round((fileCount / total) * 100),
      });
    }

    return stats.sort((a, b) => b.fileCount - a.fileCount);
  }

  /**
   * Map file extension to language.
   */
  private extensionToLanguage(ext: string): string | null {
    const map: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.kt': 'Kotlin',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.cs': 'C#',
      '.cpp': 'C++',
      '.c': 'C',
      '.swift': 'Swift',
    };
    return map[ext] || null;
  }

  /**
   * Get Git information for repository.
   */
  private getGitInfo(repoPath: string): { lastCommit: string; branch: string } {
    try {
      const { execSync } = require('child_process');
      const lastCommit = execSync('git rev-parse HEAD', {
        cwd: repoPath,
        encoding: 'utf-8',
      }).trim();
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: repoPath,
        encoding: 'utf-8',
      }).trim();
      return { lastCommit, branch };
    } catch {
      return { lastCommit: 'unknown', branch: 'unknown' };
    }
  }

  /**
   * Discover all repos from config.
   */
  private async discoverRepos(): Promise<Array<{ name: string; path: string }>> {
    const configPath = path.join(this.projectRoot, '.specweave/config.json');
    if (!fs.existsSync(configPath)) {
      return [{ name: path.basename(this.projectRoot), path: this.projectRoot }];
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.umbrella && config.umbrella.childRepos) {
        return config.umbrella.childRepos.map((repo: any) => ({
          name: repo.name,
          path: path.join(this.projectRoot, repo.path),
        }));
      }
    } catch (error) {
      this.logger.warn(`Failed to load config: ${error}`);
    }

    return [{ name: path.basename(this.projectRoot), path: this.projectRoot }];
  }

  /**
   * Find files matching pattern.
   */
  private findFiles(repoPath: string, pattern: RegExp): string[] {
    const files: string[] = [];
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
            files.push(fullPath);
          }
        }
      } catch {
        // Ignore errors
      }
    };

    walk(repoPath);
    return files;
  }
}
