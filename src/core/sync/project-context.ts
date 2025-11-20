/**
 * Project Context Manager
 *
 * Manages project contexts for multi-project sync.
 * Handles project detection, specs folder organization, and project-increment mapping.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import {
  ProjectContext,
  ProjectDetectionResult,
  SyncConfiguration,
} from '../types/sync-profile.js';

export class ProjectContextManager {
  private configPath: string;
  private projectRoot: string;
  private config: SyncConfiguration | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, '.specweave', 'config.json');
  }

  // ==========================================================================
  // Load/Save Operations
  // ==========================================================================

  /**
   * Load sync configuration
   */
  async load(): Promise<SyncConfiguration> {
    if (this.config) {
      return this.config;
    }

    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const fullConfig = JSON.parse(content);

      this.config = fullConfig.sync || {
        profiles: {},
        projects: {},
        settings: {
          autoDetectProject: true,
          defaultTimeRange: '1M',
          rateLimitProtection: true,
        },
      };

      return this.config;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.config = {
          profiles: {},
          projects: {},
          settings: {
            canUpsertInternalItems: false,
            canUpdateExternalItems: false,
            canUpdateStatus: false,
            autoDetectProject: true,
            defaultTimeRange: '1M',
            rateLimitProtection: true,
          },
        };
        return this.config;
      }
      throw error;
    }
  }

  /**
   * Save sync configuration
   */
  async save(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration loaded. Call load() first.');
    }

    // Read full config
    let fullConfig: any = {};
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      fullConfig = JSON.parse(content);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Merge sync section
    fullConfig.sync = this.config;

    // Write back
    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeFile(
      this.configPath,
      JSON.stringify(fullConfig, null, 2),
      'utf-8'
    );
  }

  // ==========================================================================
  // Project CRUD Operations
  // ==========================================================================

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<Record<string, ProjectContext>> {
    const config = await this.load();
    return config.projects || {};
  }

  /**
   * Get a specific project by ID
   */
  async getProject(projectId: string): Promise<ProjectContext | null> {
    const config = await this.load();
    return config.projects?.[projectId] || null;
  }

  /**
   * Create a new project context
   */
  async createProject(
    projectId: string,
    project: Omit<ProjectContext, 'id'>
  ): Promise<void> {
    const config = await this.load();

    // Validate ID format
    if (!/^[a-z0-9-]+$/.test(projectId)) {
      throw new Error(
        'Project ID must contain only lowercase letters, numbers, and hyphens'
      );
    }

    // Check if project already exists
    if (config.projects?.[projectId]) {
      throw new Error(`Project '${projectId}' already exists`);
    }

    // Create specs folder
    const specsFolder = project.specsFolder || `.specweave/docs/internal/specs/${projectId}`;
    const fullPath = path.join(this.projectRoot, specsFolder);
    await fs.ensureDir(fullPath);

    // Create README for the project
    const readmePath = path.join(fullPath, 'README.md');
    await fs.writeFile(
      readmePath,
      this.generateProjectReadme(projectId, project as ProjectContext),
      'utf-8'
    );

    // Add project
    if (!config.projects) {
      config.projects = {};
    }

    config.projects[projectId] = {
      id: projectId,
      ...project,
      specsFolder,
      increments: project.increments || [],
    };

    await this.save();
  }

  /**
   * Update a project context
   */
  async updateProject(
    projectId: string,
    updates: Partial<Omit<ProjectContext, 'id'>>
  ): Promise<void> {
    const config = await this.load();

    const existing = config.projects?.[projectId];
    if (!existing) {
      throw new Error(`Project '${projectId}' does not exist`);
    }

    // Merge updates
    config.projects![projectId] = {
      ...existing,
      ...updates,
      id: projectId, // Preserve ID
    };

    await this.save();
  }

  /**
   * Delete a project context
   */
  async deleteProject(projectId: string, deleteSpecs: boolean = false): Promise<void> {
    const config = await this.load();

    const project = config.projects?.[projectId];
    if (!project) {
      throw new Error(`Project '${projectId}' does not exist`);
    }

    // Optionally delete specs folder
    if (deleteSpecs && project.specsFolder) {
      const fullPath = path.join(this.projectRoot, project.specsFolder);
      await fs.remove(fullPath);
    }

    delete config.projects[projectId];
    await this.save();
  }

  // ==========================================================================
  // Project Detection
  // ==========================================================================

  /**
   * Detect project from increment description
   *
   * @param description Increment description text
   * @returns Detection result with matched project and confidence score
   */
  async detectProject(description: string): Promise<ProjectDetectionResult> {
    const config = await this.load();
    const projects = config.projects || {};

    if (Object.keys(projects).length === 0) {
      return {
        confidence: 0,
        matchedKeywords: [],
      };
    }

    const lowerDesc = description.toLowerCase();
    let bestMatch: ProjectContext | undefined;
    let bestScore = 0;
    let bestKeywords: string[] = [];

    for (const project of Object.values(projects)) {
      let score = 0;
      const matchedKeywords: string[] = [];

      // Check project name
      if (lowerDesc.includes(project.name.toLowerCase())) {
        score += 10;
        matchedKeywords.push(project.name);
      }

      // Check team name
      if (project.team && lowerDesc.includes(project.team.toLowerCase())) {
        score += 5;
        matchedKeywords.push(project.team);
      }

      // Check keywords
      for (const keyword of project.keywords) {
        if (lowerDesc.includes(keyword.toLowerCase())) {
          score += 3;
          matchedKeywords.push(keyword);
        }
      }

      // Update best match
      if (score > bestScore) {
        bestScore = score;
        bestMatch = project;
        bestKeywords = matchedKeywords;
      }
    }

    // Calculate confidence (0-1)
    const confidence = bestScore > 0 ? Math.min(bestScore / 10, 1) : 0;

    const result: ProjectDetectionResult = {
      project: bestMatch,
      confidence,
      matchedKeywords: bestKeywords,
    };

    // Add suggested profile if project has default
    if (bestMatch?.defaultSyncProfile) {
      result.suggestedProfile = bestMatch.defaultSyncProfile;
    }

    return result;
  }

  /**
   * Link increment to project
   */
  async linkIncrementToProject(
    projectId: string,
    incrementId: string
  ): Promise<void> {
    const config = await this.load();

    const project = config.projects?.[projectId];
    if (!project) {
      throw new Error(`Project '${projectId}' does not exist`);
    }

    // Add increment to project's increments list
    if (!project.increments) {
      project.increments = [];
    }

    if (!project.increments.includes(incrementId)) {
      project.increments.push(incrementId);
      await this.save();
    }
  }

  /**
   * Unlink increment from project
   */
  async unlinkIncrementFromProject(
    projectId: string,
    incrementId: string
  ): Promise<void> {
    const config = await this.load();

    const project = config.projects?.[projectId];
    if (!project) {
      throw new Error(`Project '${projectId}' does not exist`);
    }

    if (project.increments) {
      project.increments = project.increments.filter((id) => id !== incrementId);
      await this.save();
    }
  }

  // ==========================================================================
  // Specs Folder Management
  // ==========================================================================

  /**
   * Get specs folder path for a project
   */
  getSpecsFolder(projectId: string): string {
    return `.specweave/docs/internal/specs/${projectId}`;
  }

  /**
   * Ensure specs folder exists for a project
   */
  async ensureSpecsFolder(projectId: string): Promise<string> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project '${projectId}' does not exist`);
    }

    const fullPath = path.join(this.projectRoot, project.specsFolder);
    await fs.ensureDir(fullPath);

    return project.specsFolder;
  }

  /**
   * Get all spec files for a project
   */
  async getProjectSpecs(projectId: string): Promise<string[]> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project '${projectId}' does not exist`);
    }

    const fullPath = path.join(this.projectRoot, project.specsFolder);

    try {
      const files = await fs.readdir(fullPath);
      return files
        .filter((f) => f.startsWith('spec-') && f.endsWith('.md'))
        .map((f) => path.join(project.specsFolder, f));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Generate README for project specs folder
   */
  private generateProjectReadme(projectId: string, project: ProjectContext): string {
    return `# ${project.name}

${project.description}

${project.team ? `**Team**: ${project.team}\n` : ''}
**Keywords**: ${project.keywords.join(', ')}
${project.defaultSyncProfile ? `**Default Sync**: ${project.defaultSyncProfile}\n` : ''}

## Specifications

This folder contains all specifications for the **${project.name}** project.

- Each spec file follows the format: \`spec-NNN-feature-area.md\`
- Specs are permanent, feature-level documentation
- Updated continuously as features evolve

## Related Increments

${project.increments && project.increments.length > 0
  ? project.increments.map((inc) => `- ${inc}`).join('\n')
  : 'No increments yet.'
}

---

**Last Updated**: ${new Date().toISOString().split('T')[0]}
`;
  }

  /**
   * Get statistics about projects
   */
  async getStats(): Promise<{
    totalProjects: number;
    totalIncrements: number;
    projectsByTeam: Record<string, number>;
  }> {
    const config = await this.load();
    const projects = config.projects || {};

    const stats = {
      totalProjects: Object.keys(projects).length,
      totalIncrements: 0,
      projectsByTeam: {} as Record<string, number>,
    };

    for (const project of Object.values(projects)) {
      stats.totalIncrements += project.increments?.length || 0;

      if (project.team) {
        stats.projectsByTeam[project.team] =
          (stats.projectsByTeam[project.team] || 0) + 1;
      }
    }

    return stats;
  }
}
