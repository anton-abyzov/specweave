/**
 * ProjectResolutionService - Centralized project resolution for SpecWeave
 *
 * Provides authoritative project resolution with priority-based fallback chain:
 * 1. Per-US **Project**: fields (primary source of truth)
 * 2. Config project.name (single-project mode fallback)
 * 3. Intelligent keyword detection (multi-project mode)
 * 4. Ultimate fallback ("default")
 *
 * Key Architecture Decision (ADR-0140):
 * - Frontmatter project: field REMOVED as source
 * - Per-US fields are now the single source of truth
 * - This service centralizes all project resolution logic
 *
 * @module core/project/project-resolution
 */

import { promises as fs } from 'fs';
import path from 'path';
import { ConfigManager } from '../config/config-manager.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { ProjectRegistry } from './project-registry.js';

/**
 * Resolved project result with confidence and source tracking
 */
export interface ResolvedProject {
  /** Resolved project identifier */
  projectId: string;
  /** Confidence level of resolution */
  confidence: 'high' | 'medium' | 'low';
  /** Source of resolution for debugging */
  source: 'per-us' | 'config' | 'detection' | 'fallback';
  /** Detailed reasoning for the resolution */
  reasoning: string[];
}

/**
 * Available project with optional keywords for intelligent detection
 */
interface AvailableProject {
  id: string;
  keywords?: string[];
}

/**
 * Options for ProjectResolutionService constructor
 */
export interface ProjectResolutionOptions {
  /** Logger instance for debugging */
  logger?: Logger;
  /** ConfigManager instance (default: created from projectRoot) */
  configManager?: ConfigManager;
  /** ProjectRegistry instance (default: created from projectRoot) */
  registry?: ProjectRegistry;
}

/**
 * Centralized project resolution service
 *
 * Replaces fragmented frontmatter.project access throughout codebase
 * with a single, consistent resolution mechanism.
 */
export class ProjectResolutionService {
  private cache = new Map<string, ResolvedProject>();
  private configManager: ConfigManager;
  private registry: ProjectRegistry;
  private logger: Logger;
  private projectRoot: string;

  /**
   * Create a new ProjectResolutionService
   *
   * @param projectRoot - Path to project root
   * @param options - Configuration options
   */
  constructor(
    projectRoot: string,
    options: ProjectResolutionOptions = {}
  ) {
    this.projectRoot = projectRoot;
    this.logger = options.logger ?? consoleLogger;
    this.configManager = options.configManager ?? new ConfigManager(projectRoot, this.logger);
    this.registry = options.registry ?? new ProjectRegistry(projectRoot, { logger: this.logger });
  }

  /**
   * Resolve project for an increment with priority-based fallback
   *
   * Resolution Priority:
   * 1. Per-US **Project**: fields in spec.md (high confidence)
   * 2. Config project.name in single-project mode (high confidence)
   * 3. Intelligent keyword detection (medium/low confidence)
   * 4. Ultimate fallback to "default" (low confidence)
   *
   * @param incrementId - Increment folder name (e.g., "0001-feature-name")
   * @returns Resolved project with confidence and source
   */
  async resolveProjectForIncrement(incrementId: string): Promise<ResolvedProject> {
    // Check cache first
    const cached = this.cache.get(incrementId);
    if (cached) {
      this.logger.debug(`Using cached project resolution for ${incrementId}`);
      return cached;
    }

    // Resolution priority chain
    const resolved =
      await this.resolveFromPerUSFields(incrementId) ||
      await this.resolveFromConfig() ||
      await this.resolveFromIntelligentDetection(incrementId) ||
      this.resolveFallback();

    // Cache result
    this.cache.set(incrementId, resolved);

    this.logger.debug(
      `Resolved project for ${incrementId}: ${resolved.projectId} ` +
      `(${resolved.confidence}, source: ${resolved.source})`
    );

    return resolved;
  }

  /**
   * Resolve project for spec content directly (without increment ID)
   *
   * Useful when spec content is already loaded and increment ID is not available.
   *
   * @param specContent - Raw spec.md content
   * @returns Resolved project with confidence and source
   */
  async resolveProjectFromContent(specContent: string): Promise<ResolvedProject> {
    const projects = this.extractProjectsFromUSFields(specContent);
    const resolved = this.createResolvedProjectFromUSFields(projects);

    if (resolved) {
      return resolved;
    }

    return await this.resolveFromConfig() || this.resolveFallback();
  }

  /**
   * Create a ResolvedProject from extracted US field projects
   */
  private createResolvedProjectFromUSFields(projects: string[]): ResolvedProject | null {
    if (projects.length === 0) {
      return null;
    }

    if (projects.length === 1) {
      return {
        projectId: projects[0],
        confidence: 'high',
        source: 'per-us',
        reasoning: [`Single project found in US fields: ${projects[0]}`]
      };
    }

    return {
      projectId: projects[0],
      confidence: 'medium',
      source: 'per-us',
      reasoning: [
        `Multiple projects found: ${projects.join(', ')}`,
        `Using first project as primary: ${projects[0]}`
      ]
    };
  }

  /**
   * Priority 1: Extract from per-US **Project**: fields
   *
   * Scans spec.md for **Project**: field patterns in user stories.
   * This is the primary and preferred source of truth.
   */
  private async resolveFromPerUSFields(
    incrementId: string
  ): Promise<ResolvedProject | null> {
    const specPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    try {
      const content = await fs.readFile(specPath, 'utf-8');
      const projects = this.extractProjectsFromUSFields(content);

      if (projects.length === 0) {
        this.logger.debug(`No per-US **Project**: fields found in ${incrementId}`);
        return null;
      }

      return this.createResolvedProjectFromUSFields(projects);
    } catch (error: any) {
      this.logger.debug(`Could not extract from per-US fields: ${error.message}`);
      return null;
    }
  }

  /**
   * Priority 2: Use config.project.name (single-project mode)
   *
   * Only applies when multiProject.enabled !== true.
   * In single-project mode, config.project.name is authoritative.
   */
  private async resolveFromConfig(): Promise<ResolvedProject | null> {
    try {
      // Cast to any to access multiProject which may or may not exist
      // (multiProject is a runtime field managed by single-project-migrator)
      const config = await this.configManager.read() as any;

      const isSingleProject = config.multiProject?.enabled !== true;
      if (!isSingleProject) {
        this.logger.debug('Multi-project mode enabled, skipping config fallback');
        return null; // Multi-project mode, can't use config fallback
      }

      const projectName = config.project?.name;
      if (!projectName) {
        this.logger.debug('No project.name in config');
        return null; // No project name in config
      }

      return {
        projectId: projectName,
        confidence: 'high',
        source: 'config',
        reasoning: [
          'Single-project mode detected',
          `Using project.name from config: ${projectName}`
        ]
      };
    } catch (error: any) {
      this.logger.debug(`Config resolution failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Priority 3: Intelligent detection from increment content
   *
   * Scores each available project based on keyword matching.
   * Only used in multi-project mode when per-US fields are missing.
   */
  private async resolveFromIntelligentDetection(
    incrementId: string
  ): Promise<ResolvedProject | null> {
    const specPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    try {
      const content = await fs.readFile(specPath, 'utf-8');
      const config = await this.configManager.read();

      // Get available projects
      const availableProjects = this.getAvailableProjects(config);
      if (availableProjects.length === 0) {
        this.logger.debug('No available projects for intelligent detection');
        return null;
      }

      // Score each project based on keyword matching
      const scores = new Map<string, number>();
      const keywords = this.extractKeywords(content);
      const contentLower = content.toLowerCase();

      for (const project of availableProjects) {
        let score = 0;

        // Match project ID directly in content (handles kebab-case like "frontend-app")
        if (contentLower.includes(project.id.toLowerCase())) {
          score += 10;
        }

        // Also check individual word matches (for keywords in content)
        if (keywords.has(project.id.toLowerCase())) {
          score += 5;
        }

        // Match project keywords (if configured)
        const projectKeywords = project.keywords || [];
        for (const keyword of projectKeywords) {
          if (keywords.has(keyword.toLowerCase())) {
            score += 3;
          }
        }

        scores.set(project.id, score);
      }

      // Find highest scoring project
      const sortedScores = Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1]);

      const bestMatch = sortedScores[0];

      if (bestMatch && bestMatch[1] > 0) {
        return {
          projectId: bestMatch[0],
          confidence: bestMatch[1] >= 10 ? 'medium' : 'low',
          source: 'detection',
          reasoning: [
            'Intelligent detection based on keywords',
            `Best match: ${bestMatch[0]} (score: ${bestMatch[1]})`
          ]
        };
      }

      this.logger.debug('No keyword matches found in intelligent detection');
      return null;
    } catch (error: any) {
      this.logger.debug(`Intelligent detection failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Priority 4: Ultimate fallback - "default" project
   *
   * This should rarely happen in practice. Indicates missing configuration.
   */
  private resolveFallback(): ResolvedProject {
    this.logger.debug('Using ultimate fallback for project resolution');
    return {
      projectId: 'default',
      confidence: 'low',
      source: 'fallback',
      reasoning: [
        'No project could be resolved from any source',
        'Using fallback project: default'
      ]
    };
  }

  /**
   * Extract project IDs from **Project**: fields in spec.md
   *
   * Pattern: **Project**: project-id (case-insensitive, kebab-case)
   *
   * @param content - Spec content to scan
   * @returns Unique project IDs found
   */
  extractProjectsFromUSFields(content: string): string[] {
    const projectPattern = /\*\*Project\*\*:\s*([a-zA-Z0-9-]+)/gi;
    const projects = new Set<string>();

    let match;
    while ((match = projectPattern.exec(content)) !== null) {
      projects.add(match[1].toLowerCase());
    }

    return Array.from(projects);
  }

  /**
   * Extract keywords from spec content for intelligent matching
   *
   * Filters out short words and common stopwords.
   */
  private extractKeywords(content: string): Set<string> {
    const words = content
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 3);

    return new Set(words);
  }

  /**
   * Get available projects from config
   *
   * Handles both single-project and multi-project modes.
   */
  private getAvailableProjects(config: any): AvailableProject[] {
    if (config.multiProject?.enabled) {
      return Object.entries(config.multiProject.projects || {}).map(
        ([id, proj]: [string, any]) => ({
          id,
          keywords: proj.keywords || []
        })
      );
    }

    if (config.umbrella?.enabled && config.umbrella.childRepos?.length) {
      return config.umbrella.childRepos.map((repo: any) => ({
        id: repo.id,
        keywords: repo.techStack || [],
      }));
    }

    if (config.project?.name) {
      return [{ id: config.project.name, keywords: [] }];
    }

    return [];
  }

  /**
   * Clear cache (useful for testing and after config changes)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Validate resolved project against the project registry
   *
   * Checks if the project exists in the registry and provides suggestions if not.
   * This integration supports AC-US9-01 through AC-US9-04 for Living Docs integration.
   *
   * @param projectId - Project ID to validate
   * @returns Validation result with suggestions if project not found
   */
  async validateAgainstRegistry(projectId: string): Promise<{
    valid: boolean;
    projectId: string;
    inRegistry: boolean;
    suggestions?: string[];
    techStack?: string[];
    team?: string;
  }> {
    try {
      const project = await this.registry.getProject(projectId);

      if (project) {
        return {
          valid: true,
          projectId: project.id,
          inRegistry: true,
          techStack: project.techStack,
          team: project.team
        };
      }

      // Project not found - get suggestions from registered projects
      const registeredProjects = await this.registry.listProjects();
      const suggestions = registeredProjects
        .map(p => p.id)
        .filter(id => {
          // Suggest projects with similar names (partial match)
          return id.includes(projectId) || projectId.includes(id);
        })
        .slice(0, 3);

      this.logger.warn(
        `Project '${projectId}' not found in registry. ` +
        `Run 'specweave project add ${projectId}' to register it.`
      );

      if (suggestions.length > 0) {
        this.logger.warn(`Similar registered projects: ${suggestions.join(', ')}`);
      }

      return {
        valid: false,
        projectId,
        inRegistry: false,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };
    } catch (error) {
      // Registry not initialized or error - return valid to not block sync
      this.logger.debug(`Registry validation skipped: ${error}`);
      return {
        valid: true,
        projectId,
        inRegistry: false
      };
    }
  }

  /**
   * Get project metadata from registry (techStack, team, etc.)
   *
   * Useful for enriching living docs with project context.
   *
   * @param projectId - Project ID to look up
   * @returns Project metadata or null if not found
   */
  async getProjectMetadata(projectId: string): Promise<{
    techStack?: string[];
    team?: string;
    description?: string;
    keywords?: string[];
  } | null> {
    try {
      const project = await this.registry.getProject(projectId);
      if (!project) return null;

      return {
        techStack: project.techStack,
        team: project.team,
        description: project.description,
        keywords: project.keywords
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the project registry instance
   *
   * Allows external code to interact with the registry directly.
   */
  getRegistry(): ProjectRegistry {
    return this.registry;
  }

  /**
   * Get all unique projects from an increment's user stories
   *
   * Useful for cross-project increment handling.
   *
   * @param incrementId - Increment folder name
   * @returns Array of unique project IDs
   */
  async getAllProjectsForIncrement(incrementId: string): Promise<string[]> {
    const specPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    try {
      const content = await fs.readFile(specPath, 'utf-8');
      return this.extractProjectsFromUSFields(content);
    } catch {
      // Fallback to resolved project if spec can't be read
      const resolved = await this.resolveProjectForIncrement(incrementId);
      return [resolved.projectId];
    }
  }

  /**
   * CRITICAL: Validate a project ID before folder creation
   *
   * This is the primary guard against folder pollution from example/invalid projects.
   * Called before any ensureDir() or mkdirSync() that creates project folders.
   *
   * Validation rules (STRICT - returns false if ANY rule fails):
   * 1. Must be a valid project format (kebab-case, alphanumeric)
   * 2. Must NOT be an obvious example/placeholder name
   * 3. In single-project mode: must match config.project.name
   * 4. In multi-project mode: must exist in config.multiProject.projects
   *
   * @param projectId - Project ID to validate
   * @returns Validation result with reason for rejection
   */
  async validateProjectForFolderCreation(projectId: string): Promise<{
    valid: boolean;
    projectId: string;
    reason: string;
    allowedProjects: string[];
  }> {
    // Rule 1: Basic format validation
    if (!projectId || typeof projectId !== 'string') {
      return {
        valid: false,
        projectId: projectId || '(empty)',
        reason: 'Project ID is empty or not a string',
        allowedProjects: []
      };
    }

    // Rule 2: Reject obvious placeholders and invalid characters
    const invalidPatterns = [
      /\{\{.*\}\}/,           // Template placeholders like {{PROJECT_ID}}
      /,/,                     // Comma-separated lists
      /\s{2,}/,               // Multiple spaces
      /[←→❌✅⚠️]/,          // Emoji indicators (from examples)
      /[()]/,                 // Parentheses (like "MyApp (3 repos)")
      /[^\w-]/,               // Non-alphanumeric (except hyphen)
      /^(example|test-project|my-?app|sample|demo|placeholder|todo|tbd|xxx)$/i,
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(projectId)) {
        return {
          valid: false,
          projectId,
          reason: `Project ID contains invalid pattern: ${pattern.toString()}`,
          allowedProjects: []
        };
      }
    }

    // Rule 3: Known example project names that appear in documentation/specs
    const exampleProjects = new Set([
      'frontend-app',
      'backend-api',
      'mobile-app',
      'shared-lib',
      'acme-corp',
      'myapp',
      'my-app',
      'example-project',
      'sample-project',
      'test-project',
      'per',
      'default'
    ]);

    // CRITICAL v0.35.1: Use ProjectRegistry as PRIMARY source of truth
    // Fallback to config.json for backward compatibility
    let allowedProjects: string[] = [];
    const projectIdLower = projectId.toLowerCase();

    try {
      // Check ProjectRegistry FIRST (.specweave/state/projects.json)
      const registeredProjects = await this.registry.listProjects();

      if (registeredProjects.length > 0) {
        allowedProjects = registeredProjects.map(p => p.id.toLowerCase());

        // If project exists in registry, it's valid
        if (allowedProjects.includes(projectIdLower)) {
          return {
            valid: true,
            projectId,
            reason: 'Project exists in registry',
            allowedProjects
          };
        }

        // If project is a known example and NOT in registry, reject it
        if (exampleProjects.has(projectIdLower)) {
          return {
            valid: false,
            projectId,
            reason: `Project '${projectId}' is a known example project name. Add it with 'specweave project add ${projectId}' to allow.`,
            allowedProjects
          };
        }

        // Project not in registry - REJECT
        return {
          valid: false,
          projectId,
          reason: `Project '${projectId}' is not in the project registry. Allowed: [${allowedProjects.join(', ')}]`,
          allowedProjects
        };
      }
    } catch (error) {
      this.logger.debug(`Registry check failed, falling back to config.json: ${error}`);
    }

    // FALLBACK: Use config.json if registry is empty or failed
    const config = await this.configManager.read() as any;
    const isSingleProject = config.multiProject?.enabled !== true;

    if (isSingleProject) {
      // Single-project mode: only config.project.name is allowed
      const configProject = config.project?.name;
      if (configProject) {
        allowedProjects = [configProject.toLowerCase()];
      }
    } else {
      // Multi-project mode: only projects in config.multiProject.projects
      const multiProjects = config.multiProject?.projects || {};
      allowedProjects = Object.keys(multiProjects).map(p => p.toLowerCase());
    }

    // If project is in allowed list, it's valid (even if it's in exampleProjects)
    if (allowedProjects.includes(projectIdLower)) {
      return {
        valid: true,
        projectId,
        reason: 'Project is in config.json',
        allowedProjects
      };
    }

    // If project is a known example and NOT in allowed list, reject it
    if (exampleProjects.has(projectIdLower)) {
      return {
        valid: false,
        projectId,
        reason: `Project '${projectId}' is a known example project name. Add it to config to allow.`,
        allowedProjects
      };
    }

    // If there are no allowed projects configured, be permissive (new project setup)
    if (allowedProjects.length === 0) {
      this.logger.warn(
        `No projects configured. Project '${projectId}' will be allowed. ` +
        `Consider adding it with 'specweave project add ${projectId}'`
      );
      return {
        valid: true,
        projectId,
        reason: 'No projects configured, allowing new project',
        allowedProjects
      };
    }

    // Project not in allowed list - REJECT
    return {
      valid: false,
      projectId,
      reason: `Project '${projectId}' is not in the allowed list: [${allowedProjects.join(', ')}]`,
      allowedProjects
    };
  }

  /**
   * Filter project IDs extracted from spec.md to only valid projects
   *
   * This prevents example User Stories from polluting the specs folder.
   * Should be called after extractProjectsFromUSFields() to filter results.
   *
   * @param projectIds - Raw project IDs from spec.md
   * @returns Only valid, configured project IDs
   */
  async filterValidProjects(projectIds: string[]): Promise<string[]> {
    const validProjects: string[] = [];

    for (const projectId of projectIds) {
      const validation = await this.validateProjectForFolderCreation(projectId);
      if (validation.valid) {
        validProjects.push(projectId);
      } else {
        this.logger.debug(
          `Filtered out invalid project '${projectId}': ${validation.reason}`
        );
      }
    }

    return validProjects;
  }

  /**
   * Synchronous check for common example project names
   *
   * Fast path for pre-tool-use hooks that can't be async.
   * Returns true if the project name looks like an example.
   */
  static isExampleProjectName(projectId: string): boolean {
    if (!projectId) return true;

    const examplePatterns = [
      /^frontend-?app$/i,
      /^backend-?api$/i,
      /^mobile-?app$/i,
      /^shared-?lib$/i,
      /^acme-?corp$/i,
      /^my-?app$/i,
      /^example/i,
      /^sample/i,
      /^test-project/i,
      /^demo/i,
      /^placeholder/i,
      /\{\{.*\}\}/,         // Template placeholders
      /,/,                   // Comma-separated
      /[()]/,               // Parentheses
      /[←→❌✅]/,           // Emoji indicators
    ];

    return examplePatterns.some(p => p.test(projectId));
  }
}
