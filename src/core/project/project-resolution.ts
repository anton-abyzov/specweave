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
    // Try per-US fields from content
    const projects = this.extractProjectsFromUSFields(specContent);

    if (projects.length === 1) {
      return {
        projectId: projects[0],
        confidence: 'high',
        source: 'per-us',
        reasoning: [`Single project found in US fields: ${projects[0]}`]
      };
    }

    if (projects.length > 1) {
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

    // Fall back to config
    const configResolved = await this.resolveFromConfig();
    if (configResolved) {
      return configResolved;
    }

    // Ultimate fallback
    return this.resolveFallback();
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
        return null; // No per-US fields found
      }

      if (projects.length === 1) {
        // Single project - high confidence
        return {
          projectId: projects[0],
          confidence: 'high',
          source: 'per-us',
          reasoning: [`Single project found in US fields: ${projects[0]}`]
        };
      }

      // Multiple projects - use first one as primary (cross-project increment)
      return {
        projectId: projects[0],
        confidence: 'medium',
        source: 'per-us',
        reasoning: [
          `Multiple projects found: ${projects.join(', ')}`,
          `Using first project as primary: ${projects[0]}`
        ]
      };
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
}
