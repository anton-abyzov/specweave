/**
 * ProjectManager - Multi-project support for SpecWeave
 *
 * Handles project context, path resolution, and project switching.
 * Key principle: Single project = multi-project with 1 project (no special cases)
 */

import path from 'path';
import * as fs from '../../utils/fs-native.js';
import { ConfigManager } from '../config-manager.js';
import { autoDetectProjectIdSync, formatProjectName } from '../../utils/project-detection.js';
import { ProjectContext } from '../living-docs/types.js';

// Re-export ProjectContext as type-only for backward compatibility with CLI commands
export type { ProjectContext };

export class ProjectManager {
  private configManager: ConfigManager;
  private projectRoot: string;
  private cachedProject: ProjectContext | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.configManager = new ConfigManager(projectRoot);
  }

  /**
   * Get current active project
   * Auto-detects project ID from git remote or sync config
   *
   * @returns ProjectContext
   */
  getActiveProject(): ProjectContext {
    // Return cached project if available
    if (this.cachedProject) {
      return this.cachedProject;
    }

    const config = this.configManager.load();

    // Single project mode → return auto-detected project
    if (!config.multiProject?.enabled) {
      // Auto-detect project ID (git remote, sync config, or "default")
      const projectId = autoDetectProjectIdSync(this.projectRoot, { silent: true });

      this.cachedProject = {
        projectId: projectId,
        projectName: config.project?.name || formatProjectName(projectId),
        projectPath: path.join(this.projectRoot, '.specweave/docs/internal/specs', projectId),
        keywords: [],
        techStack: config.project?.techStack || []
      };
      return this.cachedProject;
    }

    // Multi-project mode → return first available project
    // NOTE (v0.33.0): activeProject REMOVED - per-US project targeting replaces it
    // In multi-project mode, we use the first project as default context
    // Individual USs can target specific projects via **Project**: field
    const projectIds = Object.keys(config.multiProject.projects || {});
    if (projectIds.length === 0) {
      throw new Error('Multi-project mode enabled but no projects defined in config');
    }

    const activeProjectId = projectIds[0];  // Use first project as default
    const projectConfig = config.multiProject.projects![activeProjectId];

    // Convert ProjectConfig to ProjectContext
    const project: ProjectContext = {
      projectId: activeProjectId,
      projectName: projectConfig.name,
      projectPath: path.join(this.projectRoot, '.specweave/docs/internal/specs', activeProjectId),
      keywords: projectConfig.keywords || [],
      techStack: projectConfig.techStack || []
    };

    this.cachedProject = project;
    return project;
  }

  /**
   * Get all projects
   *
   * @returns ProjectContext[]
   */
  getAllProjects(): ProjectContext[] {
    const config = this.configManager.load();

    if (!config.multiProject?.enabled) {
      // Auto-detect project ID for single project mode
      const projectId = autoDetectProjectIdSync(this.projectRoot, { silent: true });

      return [{
        projectId: projectId,
        projectName: config.project?.name || formatProjectName(projectId),
        projectPath: path.join(this.projectRoot, '.specweave/docs/internal/specs', projectId),
        keywords: [],
        techStack: config.project?.techStack || []
      }];
    }

    // Convert Record<string, ProjectConfig> to ProjectContext[]
    const projects: ProjectContext[] = [];
    for (const [projectId, projectConfig] of Object.entries(config.multiProject.projects)) {
      projects.push({
        projectId: projectId,
        projectName: projectConfig.name,
        projectPath: path.join(this.projectRoot, '.specweave/docs/internal/specs', projectId),
        keywords: projectConfig.keywords || [],
        techStack: projectConfig.techStack || []
      });
    }

    return projects;
  }

  /**
   * Get project by ID
   *
   * @param projectId - Project identifier
   * @returns ProjectContext or null
   */
  getProjectById(projectId: string): ProjectContext | null {
    const projects = this.getAllProjects();
    return projects.find(p => p.projectId === projectId) || null;
  }

  /**
   * Get specs path for active project
   * Example: .specweave/docs/internal/specs/backend/
   *
   * @returns string
   */
  getSpecsPath(projectId?: string): string {
    const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/specs',
      project.projectId
    );
  }

  /**
   * @deprecated As of v0.X.X (increment 0026), modules/ folder is no longer created.
   * Use getSpecsPath() instead and document modules within specs.
   */
  getModulesPath(projectId?: string): string {
    const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Still return path for backward compatibility, but folder not created
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/modules',
      project.projectId
    );
  }

  /**
   * @deprecated As of v0.X.X (increment 0026), team/ folder is no longer created.
   * Use getSpecsPath() instead and document team info within specs or README.
   */
  getTeamPath(projectId?: string): string {
    const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Still return path for backward compatibility, but folder not created
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/team',
      project.projectId
    );
  }

  /**
   * @deprecated As of v0.X.X (increment 0026), project-arch/ folder is no longer created.
   * Use top-level .specweave/docs/internal/architecture/ for all ADRs instead.
   */
  getProjectArchitecturePath(projectId?: string): string {
    const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Still return path for backward compatibility, but folder not created
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/project-arch',
      project.projectId
    );
  }

  /**
   * @deprecated As of v0.X.X (increment 0026), legacy/ folder is no longer created.
   * Import brownfield docs directly into specs/ folder instead.
   */
  getLegacyPath(source?: string, projectId?: string): string {
    const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Still return path for backward compatibility, but folder not created
    const basePath = path.join(
      this.projectRoot,
      '.specweave/docs/internal/legacy',
      project.projectId
    );
    return source ? path.join(basePath, source) : basePath;
  }

  /**
   * Create project structure (simplified - ONLY specs folder)
   *
   * NOTE: As of v0.X.X (increment 0026), we ONLY create specs/ folder.
   * No modules/, team/, project-arch/, legacy/ folders.
   * This simplifies the structure and reduces complexity.
   *
   * @param projectId - Project identifier
   */
  async createProjectStructure(projectId: string): Promise<void> {
    // Create ONLY specs folder
    await fs.ensureDir(this.getSpecsPath(projectId));

    // Create README file
    const project = this.getProjectById(projectId);
    if (project) {
      await this.createProjectREADME(project);
    }

    console.log(`📁 Created project structure for: ${projectId}`);
  }

  /**
   * Add new project to config
   *
   * @param project - Project context
   */
  async addProject(project: ProjectContext): Promise<void> {
    const config = this.configManager.load();

    // Initialize multiProject if not present
    // NOTE (v0.33.0): activeProject REMOVED - per-US project targeting replaces it
    if (!config.multiProject) {
      config.multiProject = {
        enabled: false,
        projects: {}
      };
    }

    // Check for duplicate ID
    if (config.multiProject.projects[project.projectId]) {
      throw new Error(`Project with ID '${project.projectId}' already exists`);
    }

    // Validate project ID (kebab-case)
    const kebabCaseRegex = /^[a-z0-9-]+$/;
    if (!kebabCaseRegex.test(project.projectId)) {
      throw new Error(`Project ID '${project.projectId}' is invalid. Must be kebab-case (lowercase, hyphens only)`);
    }

    // Add project - convert ProjectContext to ProjectConfig
    config.multiProject.projects[project.projectId] = {
      id: project.projectId,
      name: project.projectName,
      description: `${project.projectName} project`,
      keywords: project.keywords,
      techStack: project.techStack,
      team: 'Engineering Team'
    };
    await this.configManager.save(config);

    // Create structure
    await this.createProjectStructure(project.projectId);

    console.log(`✅ Added project: ${project.projectName} (${project.projectId})`);
  }

  /**
   * Remove project from config
   *
   * @param projectId - Project identifier
   */
  async removeProject(projectId: string): Promise<void> {
    const config = this.configManager.load();

    if (!config.multiProject?.enabled) {
      throw new Error('Multi-project mode not enabled');
    }

    if (projectId === 'default') {
      throw new Error('Cannot remove default project');
    }

    // NOTE (v0.33.0): activeProject check removed - projects can always be removed
    // Just ensure at least one project remains
    const projectCount = Object.keys(config.multiProject.projects).length;
    if (projectCount <= 1) {
      throw new Error('Cannot remove last project. At least one project must remain.');
    }

    if (!config.multiProject.projects[projectId]) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Remove from config
    delete config.multiProject.projects[projectId];
    await this.configManager.save(config);

    console.log(`✅ Removed project: ${projectId}`);
    console.log('⚠️  Project files not deleted. Remove manually if needed.');
  }

  /**
   * Clear cached project (force reload)
   */
  clearCache(): void {
    this.cachedProject = null;
  }

  // README creation methods

  private async createProjectREADME(project: ProjectContext): Promise<void> {
    const specsPath = this.getSpecsPath(project.projectId);
    const content = `# ${project.projectName}

## Project Information

- **Team**: Engineering Team
- **Tech Stack**: ${project.techStack.length > 0 ? project.techStack.join(', ') : 'Not specified'}

## Documentation

All living documentation lives in this folder:
- Feature specs (FS-XXX)
- User stories (us-XXX-*.md)
- Requirements and acceptance criteria

---

**Created**: ${new Date().toISOString().split('T')[0]}
`;

    await fs.writeFile(path.join(specsPath, 'README.md'), content);
  }
}
