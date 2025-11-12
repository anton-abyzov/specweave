/**
 * Project Detector for Intelligent Living Docs Sync
 *
 * Detects which project an increment belongs to using keyword matching and metadata.
 *
 * @module living-docs/project-detector
 */

import fs from 'fs-extra';
import path from 'path';
import { ParsedSpec } from './content-parser.js';

/**
 * Project context with confidence score
 */
export interface ProjectContext {
  id: string;              // Project ID (e.g., "default", "backend", "frontend")
  name: string;            // Display name
  confidence: number;      // 0.0 - 1.0
  reasoning: string[];     // Why this project was selected
  metadata?: Record<string, any>;
}

/**
 * Project configuration from config.json
 */
export interface ProjectConfig {
  id: string;
  name: string;
  description?: string;
  keywords?: string[];
  team?: string;
  techStack?: string[];
  specsFolder?: string;
}

/**
 * Detector options
 */
export interface DetectorOptions {
  configPath?: string;       // Path to .specweave/config.json
  fallbackProject?: string;  // Default project (usually "default")
  confidenceThreshold?: number; // Minimum confidence to auto-select
}

/**
 * Project Detector class
 */
export class ProjectDetector {
  private options: Required<DetectorOptions>;
  private projects: Map<string, ProjectConfig>;

  constructor(options: DetectorOptions = {}) {
    this.options = {
      configPath: options.configPath || path.join(process.cwd(), '.specweave', 'config.json'),
      fallbackProject: options.fallbackProject || 'default',
      confidenceThreshold: options.confidenceThreshold || 0.7,
    };

    this.projects = new Map();
    this.loadProjects();
  }

  /**
   * Load projects from config.json
   */
  private loadProjects(): void {
    try {
      if (fs.existsSync(this.options.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.options.configPath, 'utf-8'));

        // Load projects from multiProject config (v0.8.0+)
        if (config.multiProject?.projects) {
          for (const [id, project] of Object.entries<any>(config.multiProject.projects)) {
            this.projects.set(id, {
              id,
              name: project.name || id,
              description: project.description,
              keywords: project.keywords || [],
              team: project.team,
              techStack: project.techStack || [],
              specsFolder: project.specsFolder,
            });
          }
        }

        // If no projects configured, create default
        if (this.projects.size === 0) {
          this.projects.set(this.options.fallbackProject, {
            id: this.options.fallbackProject,
            name: 'Default Project',
            keywords: [],
            techStack: [],
          });
        }
      } else {
        // No config found - create default project
        this.projects.set(this.options.fallbackProject, {
          id: this.options.fallbackProject,
          name: 'Default Project',
          keywords: [],
          techStack: [],
        });
      }
    } catch (error) {
      console.warn('Failed to load projects from config:', error);
      // Fallback to default project
      this.projects.set(this.options.fallbackProject, {
        id: this.options.fallbackProject,
        name: 'Default Project',
        keywords: [],
        techStack: [],
      });
    }
  }

  /**
   * Detect project for an increment
   */
  detectProject(incrementId: string, spec: ParsedSpec): ProjectContext {
    const scores = new Map<string, { score: number; reasoning: string[] }>();

    // Initialize scores for all projects
    for (const projectId of this.projects.keys()) {
      scores.set(projectId, { score: 0, reasoning: [] });
    }

    // 1. Check increment name for project keywords
    for (const [projectId, project] of this.projects.entries()) {
      const scoreData = scores.get(projectId)!;

      // Project name match (exact)
      if (incrementId.toLowerCase().includes(project.id.toLowerCase())) {
        scoreData.score += 10;
        scoreData.reasoning.push(`Increment name contains project ID "${project.id}"`);
      }

      // Team name match
      if (project.team && incrementId.toLowerCase().includes(project.team.toLowerCase())) {
        scoreData.score += 5;
        scoreData.reasoning.push(`Increment name contains team "${project.team}"`);
      }

      // Keyword matches
      if (project.keywords) {
        for (const keyword of project.keywords) {
          const keywordLower = keyword.toLowerCase();
          if (
            incrementId.toLowerCase().includes(keywordLower) ||
            spec.frontmatter.title?.toLowerCase().includes(keywordLower)
          ) {
            scoreData.score += 3;
            scoreData.reasoning.push(`Keyword match: "${keyword}"`);
          }
        }
      }
    }

    // 2. Check frontmatter for project metadata
    if (spec.frontmatter.project) {
      const projectId = spec.frontmatter.project;
      if (this.projects.has(projectId)) {
        const scoreData = scores.get(projectId)!;
        scoreData.score += 20; // High confidence from explicit metadata
        scoreData.reasoning.push(`Explicit project metadata: "${projectId}"`);
      }
    }

    // 3. Check tech stack from spec content
    for (const [projectId, project] of this.projects.entries()) {
      if (project.techStack && project.techStack.length > 0) {
        const scoreData = scores.get(projectId)!;
        const specContent = JSON.stringify(spec);

        for (const tech of project.techStack) {
          if (specContent.toLowerCase().includes(tech.toLowerCase())) {
            scoreData.score += 2;
            scoreData.reasoning.push(`Tech stack match: "${tech}"`);
          }
        }
      }
    }

    // Find project with highest score
    let maxScore = 0;
    let bestProjectId = this.options.fallbackProject;
    let bestReasoning: string[] = [];

    for (const [projectId, data] of scores.entries()) {
      if (data.score > maxScore) {
        maxScore = data.score;
        bestProjectId = projectId;
        bestReasoning = data.reasoning;
      }
    }

    // If no matches, use fallback
    if (maxScore === 0) {
      bestReasoning.push('No project indicators found - using fallback project');
    }

    // Normalize confidence (max score of ~30 = 1.0 confidence)
    const confidence = Math.min(maxScore / 30, 1.0);

    const project = this.projects.get(bestProjectId)!;

    return {
      id: project.id,
      name: project.name,
      confidence,
      reasoning: bestReasoning,
      metadata: {
        totalProjects: this.projects.size,
        scores: Object.fromEntries(
          Array.from(scores.entries()).map(([id, data]) => [id, data.score])
        ),
      },
    };
  }

  /**
   * Get all configured projects
   */
  getProjects(): ProjectConfig[] {
    return Array.from(this.projects.values());
  }

  /**
   * Get project by ID
   */
  getProject(projectId: string): ProjectConfig | null {
    return this.projects.get(projectId) || null;
  }

  /**
   * Get specs folder path for a project
   */
  getSpecsFolder(projectId: string): string {
    const project = this.projects.get(projectId);

    if (project?.specsFolder) {
      return project.specsFolder;
    }

    // Default: .specweave/docs/internal/specs/{projectId}
    return path.join(process.cwd(), '.specweave', 'docs', 'internal', 'specs', projectId);
  }

  /**
   * Check if confidence meets threshold for auto-selection
   */
  shouldAutoSelect(context: ProjectContext): boolean {
    return context.confidence >= this.options.confidenceThreshold;
  }

  /**
   * Create project context from string ID (fallback when no detection needed)
   */
  createContext(projectId: string): ProjectContext {
    const project = this.projects.get(projectId);

    if (!project) {
      // Unknown project - use fallback
      const fallbackProject = this.projects.get(this.options.fallbackProject)!;
      return {
        id: fallbackProject.id,
        name: fallbackProject.name,
        confidence: 1.0,
        reasoning: [`Fallback to "${fallbackProject.id}" (project "${projectId}" not found)`],
      };
    }

    return {
      id: project.id,
      name: project.name,
      confidence: 1.0,
      reasoning: ['Explicitly selected project'],
      metadata: {
        description: project.description,
        team: project.team,
        techStack: project.techStack,
      },
    };
  }

  /**
   * Ensure project specs folder exists
   */
  async ensureSpecsFolder(projectId: string): Promise<string> {
    const specsFolder = this.getSpecsFolder(projectId);
    await fs.ensureDir(specsFolder);
    return specsFolder;
  }

  /**
   * Get folder path for a category
   */
  getCategoryFolder(category: string, projectId?: string): string {
    const basePath = path.join(process.cwd(), '.specweave', 'docs', 'internal');

    // Categories that don't use project folders
    const globalCategories = ['architecture', 'operations', 'delivery', 'strategy', 'governance'];

    if (globalCategories.includes(category)) {
      return path.join(basePath, category);
    }

    // Project-specific categories (specs, modules, team, etc.)
    if (projectId) {
      return path.join(basePath, category, projectId);
    }

    // Fallback to default project
    return path.join(basePath, category, this.options.fallbackProject);
  }

  /**
   * Extract project ID from increment ID if present
   * Format: 0016-{project}-feature-name OR 0016-feature-name
   */
  extractProjectFromIncrementId(incrementId: string): string | null {
    // Check if increment ID contains a known project ID
    for (const projectId of this.projects.keys()) {
      // Pattern: 0016-backend-auth OR backend-0016-auth
      const regex = new RegExp(`\\b${projectId}\\b`, 'i');
      if (regex.test(incrementId)) {
        return projectId;
      }
    }

    return null;
  }

  /**
   * Validate project structure exists
   */
  async validateProjectStructure(projectId: string): Promise<{
    valid: boolean;
    missing: string[];
  }> {
    const basePath = path.join(process.cwd(), '.specweave', 'docs', 'internal');
    const requiredFolders = [
      path.join(basePath, 'specs', projectId),
    ];

    const missing: string[] = [];

    for (const folder of requiredFolders) {
      if (!fs.existsSync(folder)) {
        missing.push(folder);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Create project structure if missing
   */
  async createProjectStructure(projectId: string): Promise<void> {
    const basePath = path.join(process.cwd(), '.specweave', 'docs', 'internal');
    const folders = [
      path.join(basePath, 'specs', projectId),
      // Add more project-specific folders as needed
    ];

    for (const folder of folders) {
      await fs.ensureDir(folder);
    }

    // Create README in specs folder
    const readmePath = path.join(basePath, 'specs', projectId, 'README.md');
    if (!fs.existsSync(readmePath)) {
      const project = this.projects.get(projectId);
      const content = `# ${project?.name || projectId} Specifications

**Project**: ${project?.name || projectId}
**Description**: ${project?.description || 'No description'}

## Specifications

*Specifications will appear here after living docs sync.*

---

Generated by SpecWeave
`;
      await fs.writeFile(readmePath, content, 'utf-8');
    }
  }
}

/**
 * Factory function to create detector
 */
export function createProjectDetector(options?: DetectorOptions): ProjectDetector {
  return new ProjectDetector(options);
}
