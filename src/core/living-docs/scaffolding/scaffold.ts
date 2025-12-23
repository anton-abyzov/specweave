/**
 * Living Docs Scaffold - Creates documentation structure for user projects
 *
 * This module creates the .specweave/docs/ directory structure for ANY user project.
 * It's project-agnostic and uses templates with variable substitution.
 *
 * CRITICAL: This runs during `specweave init` to set up the docs structure.
 *
 * @module core/living-docs/scaffolding/scaffold
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger, consoleLogger } from '../../../utils/logger.js';
import { TemplateEngine, createDefaultContext, type TemplateContext } from './template-engine.js';

/**
 * Scaffold options
 */
export interface ScaffoldOptions {
  /** Project root path */
  projectPath: string;

  /** Project ID (e.g., "my-app") - auto-detected if not provided */
  projectId?: string;

  /** Project display name (e.g., "My Application") */
  projectName?: string;

  /** Whether to overwrite existing files */
  overwrite?: boolean;

  /** Dry run - don't create files, just report what would be created */
  dryRun?: boolean;

  /** Logger instance */
  logger?: Logger;

  /** Additional template context variables */
  additionalContext?: Record<string, unknown>;
}

/**
 * Scaffold result
 */
export interface ScaffoldResult {
  /** Whether scaffolding was successful */
  success: boolean;

  /** Files that were created */
  filesCreated: string[];

  /** Files that were skipped (already exist) */
  filesSkipped: string[];

  /** Directories that were created */
  dirsCreated: string[];

  /** Any errors that occurred */
  errors: string[];

  /** Project context used for scaffolding */
  context: TemplateContext;
}

/**
 * Directory structure definition
 */
interface DirectoryDef {
  /** Directory path relative to .specweave/docs/ */
  path: string;

  /** Optional README content or template */
  readme?: string;

  /** Child directories */
  children?: DirectoryDef[];
}

/**
 * Living Docs directory structure
 * This is the canonical structure for all user projects.
 */
const DOCS_STRUCTURE: DirectoryDef[] = [
  {
    path: 'internal',
    readme: '# Internal Documentation\n\nInternal project documentation - not for public consumption.\n',
    children: [
      {
        path: 'specs',
        readme: '# Specifications\n\nFeature specifications and user stories.\n\nEach project has its own folder: `{project}/FS-XXX/`\n',
      },
      {
        path: 'architecture',
        readme: '# Architecture Documentation\n\nSystem architecture, design decisions, and technical documentation.\n',
        children: [
          {
            path: 'adr',
            readme: '# Architecture Decision Records\n\nDocumented architecture decisions using ADR format.\n\nFormat: `XXXX-decision-title.md` (4-digit number, NO adr- prefix)\n',
          },
          {
            path: 'diagrams',
            readme: '# Architecture Diagrams\n\nMermaid diagrams for system architecture visualization.\n',
          },
        ],
      },
      {
        path: 'modules',
        readme: '# Module Documentation\n\nPer-module documentation generated from codebase analysis.\n',
      },
      {
        path: 'organization',
        readme: '# Organization Structure\n\nTeam structure, microservices, and domain groupings.\n',
        children: [
          { path: 'teams' },
          { path: 'microservices' },
          { path: 'domains' },
        ],
      },
      {
        path: 'delivery',
        readme: '# Delivery Documentation\n\nRelease history, CI/CD pipelines, and deployment guides.\n',
      },
      {
        path: 'operations',
        readme: '# Operations Documentation\n\nRunbooks, monitoring, and operational procedures.\n',
      },
      {
        path: 'strategy',
        readme: '# Strategy Documentation\n\nProduct requirements, business cases, and strategic planning.\n',
      },
      {
        path: 'review-needed',
        readme: '# Review Needed\n\nIssues and inconsistencies that need attention.\n',
      },
    ],
  },
  {
    path: 'public',
    readme: '# Public Documentation\n\nUser-facing documentation.\n',
    children: [
      {
        path: 'overview',
        readme: '# Project Overview\n\nHigh-level project documentation and getting started guides.\n',
      },
      {
        path: 'api',
        readme: '# API Documentation\n\nAPI reference and usage guides.\n',
      },
      {
        path: 'guides',
        readme: '# User Guides\n\nHow-to guides and tutorials.\n',
      },
    ],
  },
];

/**
 * Scaffold class - creates living docs structure
 */
export class LivingDocsScaffold {
  private projectPath: string;
  private projectId: string;
  private logger: Logger;
  private templateEngine: TemplateEngine;
  private overwrite: boolean;
  private dryRun: boolean;
  private context: TemplateContext;

  constructor(options: ScaffoldOptions) {
    this.projectPath = options.projectPath;
    this.projectId = options.projectId || this.detectProjectId();
    this.logger = options.logger ?? consoleLogger;
    this.templateEngine = new TemplateEngine({ logger: this.logger });
    this.overwrite = options.overwrite ?? false;
    this.dryRun = options.dryRun ?? false;

    // Create context
    this.context = {
      ...createDefaultContext(this.projectId),
      projectName: options.projectName || this.projectId,
      ...options.additionalContext,
    };
  }

  /**
   * Detect project ID from git remote or directory name
   */
  private detectProjectId(): string {
    // Try to get from git remote
    try {
      const gitConfigPath = path.join(this.projectPath, '.git', 'config');
      if (fs.existsSync(gitConfigPath)) {
        const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');
        const match = gitConfig.match(/url\s*=\s*.*[\/:]([^\/]+?)(?:\.git)?$/m);
        if (match) {
          return match[1].toLowerCase();
        }
      }
    } catch {
      // Ignore errors
    }

    // Fall back to directory name
    return path.basename(this.projectPath).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  /**
   * Create the full living docs structure
   */
  async scaffold(): Promise<ScaffoldResult> {
    const result: ScaffoldResult = {
      success: true,
      filesCreated: [],
      filesSkipped: [],
      dirsCreated: [],
      errors: [],
      context: this.context,
    };

    const docsBase = path.join(this.projectPath, '.specweave', 'docs');

    this.logger.info('Scaffolding living docs structure...');
    this.logger.info('  Project ID: ' + this.projectId);
    this.logger.info('  Docs path: ' + docsBase);

    try {
      // Create base docs directory
      await this.ensureDir(docsBase, result);

      // Create root README
      await this.createRootReadme(docsBase, result);

      // Recursively create structure
      await this.createStructure(docsBase, DOCS_STRUCTURE, result);

      // Create project-specific specs folder
      await this.createProjectSpecsFolder(docsBase, result);

      // Create SUGGESTIONS.md placeholder
      await this.createSuggestionsFile(docsBase, result);

      this.logger.info('Scaffold complete!');
      this.logger.info('  Directories created: ' + result.dirsCreated.length);
      this.logger.info('  Files created: ' + result.filesCreated.length);
      this.logger.info('  Files skipped: ' + result.filesSkipped.length);

    } catch (error) {
      result.success = false;
      result.errors.push(String(error));
      this.logger.error('Scaffold failed: ' + error);
    }

    return result;
  }

  /**
   * Create directory structure recursively
   */
  private async createStructure(
    basePath: string,
    structure: DirectoryDef[],
    result: ScaffoldResult
  ): Promise<void> {
    for (const dir of structure) {
      const dirPath = path.join(basePath, dir.path);

      // Create directory
      await this.ensureDir(dirPath, result);

      // Create README if defined
      if (dir.readme) {
        const readmePath = path.join(dirPath, 'README.md');
        await this.createFile(readmePath, dir.readme, result);
      }

      // Process children
      if (dir.children) {
        await this.createStructure(dirPath, dir.children, result);
      }
    }
  }

  /**
   * Create root README.md
   */
  private async createRootReadme(docsBase: string, result: ScaffoldResult): Promise<void> {
    const content = `# ${this.context.projectName} - Living Documentation

This directory contains the living documentation for **${this.context.projectName}**.

## Structure

- \`internal/\` - Internal documentation (specs, architecture, operations)
  - \`specs/\` - Feature specifications and user stories
  - \`architecture/\` - System architecture and ADRs
  - \`modules/\` - Per-module documentation
  - \`organization/\` - Team and domain structure
  - \`delivery/\` - Release and deployment docs
  - \`operations/\` - Runbooks and monitoring

- \`public/\` - User-facing documentation
  - \`overview/\` - Project overview and getting started
  - \`api/\` - API documentation
  - \`guides/\` - How-to guides

## Quick Start

1. **Create a feature spec**: \`/sw:increment "my feature"\`
2. **Sync to living docs**: \`/sw:sync-specs\`
3. **View documentation**: \`/sw-docs:view\`

## Generated by SpecWeave

This documentation structure was created by [SpecWeave](https://github.com/specweave/specweave).

Last updated: ${this.context.lastUpdatedDate}
`;

    await this.createFile(path.join(docsBase, 'README.md'), content, result);
  }

  /**
   * Create project-specific specs folder
   */
  private async createProjectSpecsFolder(docsBase: string, result: ScaffoldResult): Promise<void> {
    const projectSpecsPath = path.join(docsBase, 'internal', 'specs', this.projectId);
    await this.ensureDir(projectSpecsPath, result);

    const content = `# ${this.context.projectName} - Specifications

Feature specifications for **${this.context.projectName}**.

## Features

Features are organized by ID: \`FS-XXX/\`

Each feature folder contains:
- \`FEATURE.md\` - Feature overview and implementation history
- \`us-XXX-*.md\` - User story files

## Creating Features

Features are automatically created when you sync increments:

\`\`\`bash
/sw:sync-specs
\`\`\`

Or sync a specific increment:

\`\`\`bash
/sw:sync-specs 0001
\`\`\`

---

Last updated: ${this.context.lastUpdatedDate}
`;

    await this.createFile(path.join(projectSpecsPath, 'README.md'), content, result);
  }

  /**
   * Create SUGGESTIONS.md placeholder
   */
  private async createSuggestionsFile(docsBase: string, result: ScaffoldResult): Promise<void> {
    const content = `# Documentation Suggestions

This file will be populated with documentation improvement suggestions after running the Living Docs Builder.

## How to Generate Suggestions

Run the living docs analysis:

\`\`\`bash
/sw:living-docs
\`\`\`

Or with specific options:

\`\`\`bash
/sw:living-docs --depth standard --priority auth,payments
\`\`\`

## What Gets Analyzed

- **Codebase structure** - Modules, dependencies, patterns
- **Existing documentation** - READMEs, JSDoc, inline comments
- **Specifications** - User stories, acceptance criteria
- **Architecture** - Detected patterns and decisions

---

*Generated by SpecWeave Living Docs Builder*
`;

    await this.createFile(path.join(docsBase, 'SUGGESTIONS.md'), content, result);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(dirPath: string, result: ScaffoldResult): Promise<void> {
    if (this.dryRun) {
      if (!fs.existsSync(dirPath)) {
        result.dirsCreated.push(dirPath);
      }
      return;
    }

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      result.dirsCreated.push(dirPath);
    }
  }

  /**
   * Create a file with content
   */
  private async createFile(
    filePath: string,
    content: string,
    result: ScaffoldResult
  ): Promise<void> {
    if (fs.existsSync(filePath) && !this.overwrite) {
      result.filesSkipped.push(filePath);
      return;
    }

    if (this.dryRun) {
      result.filesCreated.push(filePath + ' (dry-run)');
      return;
    }

    // Render template if it has variables
    const rendered = this.templateEngine.render(content, this.context);

    fs.writeFileSync(filePath, rendered, 'utf-8');
    result.filesCreated.push(filePath);
  }
}

/**
 * Scaffold living docs structure (convenience function)
 */
export async function scaffoldLivingDocs(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const scaffold = new LivingDocsScaffold(options);
  return scaffold.scaffold();
}

/**
 * Check if living docs structure exists
 */
export function hasLivingDocsStructure(projectPath: string): boolean {
  const docsPath = path.join(projectPath, '.specweave', 'docs');
  return fs.existsSync(docsPath) && fs.existsSync(path.join(docsPath, 'internal'));
}
