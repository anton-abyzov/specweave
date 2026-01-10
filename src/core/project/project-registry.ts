/**
 * ProjectRegistry - Centralized Project Management
 *
 * Single source of truth for all projects in SpecWeave.
 * Provides CRUD operations with file persistence and event emission.
 *
 * Storage: .specweave/state/projects.json
 */

import path from 'path';
import * as fs from '../../utils/fs-native.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import {
  Project,
  ProjectRegistryData,
  ProjectValidationResult,
  AddProjectOptions,
  UpdateProjectOptions,
  RemoveProjectOptions,
  ProjectSyncStatus,
  SyncStatus,
} from './types/project-types.js';
import { ProjectEventBus } from './project-event-bus.js';

const REGISTRY_VERSION = '1.0.0';
const REGISTRY_FILENAME = 'projects.json';

export class ProjectRegistry {
  private projectRoot: string;
  private registryPath: string;
  private projects: Map<string, Project> = new Map();
  private defaultProjectId?: string;
  private eventBus: ProjectEventBus;
  private logger: Logger;
  private initialized = false;
  private isValid: boolean;

  constructor(
    projectRoot: string,
    options: {
      logger?: Logger;
      eventBus?: ProjectEventBus;
    } = {}
  ) {
    this.projectRoot = projectRoot;
    this.logger = options.logger ?? consoleLogger;
    this.eventBus = options.eventBus ?? new ProjectEventBus({ logger: this.logger });

    // CRITICAL: Only operate on valid SpecWeave projects
    const specweaveDir = path.join(projectRoot, '.specweave');
    if (!fs.existsSync(specweaveDir)) {
      // NOT a SpecWeave project - mark as invalid and DON'T create any directories
      this.logger.warn(`Not a SpecWeave project: ${projectRoot} - project registry disabled`);
      this.isValid = false;
      this.registryPath = '';
      return;
    }

    this.isValid = true;
    this.registryPath = path.join(specweaveDir, 'state', REGISTRY_FILENAME);
  }

  /**
   * Checks if this registry instance is valid (project has .specweave dir)
   */
  public isValidProject(): boolean {
    return this.isValid;
  }

  /**
   * Initialize the registry (lazy loading)
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await this.load();
    this.initialized = true;
  }

  /**
   * Load registry from disk
   */
  async load(): Promise<void> {
    if (!this.isValid) {
      return;
    }

    try {
      if (fs.existsSync(this.registryPath)) {
        const content = fs.readFileSync(this.registryPath, 'utf-8');
        const data: ProjectRegistryData = JSON.parse(content);

        this.projects.clear();
        for (const [id, project] of Object.entries(data.projects)) {
          this.projects.set(id, project);
        }
        this.defaultProjectId = data.defaultProject;

        this.logger.debug(`Loaded ${this.projects.size} projects from registry`);
      } else {
        // Check if migration from config.json is needed
        await this.migrateFromConfig();
      }
    } catch (error) {
      this.logger.error(`Failed to load project registry: ${error}`);
      throw error;
    }
  }

  /**
   * Save registry to disk
   */
  async save(): Promise<void> {
    if (!this.isValid) {
      return;
    }

    try {
      // Ensure directory exists (safe - .specweave validated in constructor)
      const stateDir = path.dirname(this.registryPath);
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }

      const data: ProjectRegistryData = {
        version: REGISTRY_VERSION,
        projects: Object.fromEntries(this.projects),
        defaultProject: this.defaultProjectId,
        metadata: {
          created: fs.existsSync(this.registryPath)
            ? JSON.parse(fs.readFileSync(this.registryPath, 'utf-8')).metadata?.created ?? new Date().toISOString()
            : new Date().toISOString(),
          lastModified: new Date().toISOString(),
        },
      };

      fs.writeFileSync(this.registryPath, JSON.stringify(data, null, 2));
      this.logger.debug(`Saved ${this.projects.size} projects to registry`);
    } catch (error) {
      this.logger.error(`Failed to save project registry: ${error}`);
      throw error;
    }
  }

  /**
   * Migrate projects from config.json to registry
   */
  private async migrateFromConfig(): Promise<void> {
    const configPath = path.join(this.projectRoot, '.specweave', 'config.json');

    if (!fs.existsSync(configPath)) {
      this.logger.debug('No config.json found, starting with empty registry');
      return;
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      let migratedCount = 0;

      // Check for multi-project config
      if (config.multiProject?.enabled && config.multiProject.projects) {
        for (const [id, projectConfig] of Object.entries(config.multiProject.projects as Record<string, any>)) {
          const project: Project = {
            id,
            name: projectConfig.name || id,
            description: projectConfig.description,
            techStack: projectConfig.techStack || [],
            team: projectConfig.team,
            keywords: projectConfig.keywords || [],
            created: new Date().toISOString(),
          };
          this.projects.set(id, project);
          migratedCount++;
        }

        // Set default project
        if (config.multiProject.activeProject) {
          this.defaultProjectId = config.multiProject.activeProject;
        } else if (this.projects.size > 0) {
          this.defaultProjectId = this.projects.keys().next().value;
        }
      }
      // Check for single project config
      else if (config.project) {
        const projectId = config.project.name?.toLowerCase().replace(/\s+/g, '-') || 'default';
        const project: Project = {
          id: projectId,
          name: config.project.name || 'Default Project',
          description: config.project.description,
          techStack: config.project.techStack || [],
          keywords: [],
          created: new Date().toISOString(),
        };
        this.projects.set(projectId, project);
        this.defaultProjectId = projectId;
        migratedCount++;
      }

      if (migratedCount > 0) {
        await this.save();
        this.logger.info(`Migrated ${migratedCount} project(s) from config.json to registry`);
      }
    } catch (error) {
      this.logger.warn(`Failed to migrate from config.json: ${error}`);
    }
  }

  // ============================================
  // CRUD Operations
  // ============================================

  /**
   * Add a new project to the registry
   */
  async addProject(project: Project, options: AddProjectOptions = {}): Promise<void> {
    await this.ensureInitialized();

    const { skipValidation = false, emitEvent = true, setAsDefault = false } = options;

    // Validate
    if (!skipValidation) {
      const validation = this.validateProject(project);
      if (!validation.valid) {
        throw new Error(`Invalid project: ${validation.errors.join(', ')}`);
      }
    }

    // Check for duplicates
    if (this.projects.has(project.id)) {
      throw new Error(`Project with ID '${project.id}' already exists`);
    }

    // Add timestamps
    const projectWithTimestamps: Project = {
      ...project,
      created: project.created || new Date().toISOString(),
    };

    this.projects.set(project.id, projectWithTimestamps);

    if (setAsDefault || !this.defaultProjectId) {
      this.defaultProjectId = project.id;
    }

    await this.save();

    // Emit event
    if (emitEvent) {
      this.eventBus.emit({
        type: 'ProjectCreated',
        project: projectWithTimestamps,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.info(`Added project: ${project.id}`);
  }

  /**
   * Update an existing project
   */
  async updateProject(
    id: string,
    updates: Partial<Project>,
    options: UpdateProjectOptions = {}
  ): Promise<void> {
    await this.ensureInitialized();

    const { skipValidation = false, emitEvent = true } = options;

    const existing = this.projects.get(id);
    if (!existing) {
      throw new Error(`Project '${id}' not found`);
    }

    // Prevent changing the ID
    if (updates.id && updates.id !== id) {
      throw new Error('Cannot change project ID');
    }

    const updatedProject: Project = {
      ...existing,
      ...updates,
      id, // Ensure ID is preserved
      updated: new Date().toISOString(),
    };

    // Validate
    if (!skipValidation) {
      const validation = this.validateProject(updatedProject);
      if (!validation.valid) {
        throw new Error(`Invalid project update: ${validation.errors.join(', ')}`);
      }
    }

    const previousValues: Partial<Project> = {};
    for (const key of Object.keys(updates) as (keyof Project)[]) {
      previousValues[key] = existing[key] as any;
    }

    this.projects.set(id, updatedProject);
    await this.save();

    // Emit event
    if (emitEvent) {
      this.eventBus.emit({
        type: 'ProjectUpdated',
        projectId: id,
        changes: updates,
        previousValues,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.info(`Updated project: ${id}`);
  }

  /**
   * Remove a project from the registry
   */
  async removeProject(id: string, options: RemoveProjectOptions = {}): Promise<void> {
    await this.ensureInitialized();

    const { emitEvent = true, force = false } = options;

    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project '${id}' not found`);
    }

    // Check if it's the default project
    if (this.defaultProjectId === id && !force) {
      throw new Error(
        `Cannot remove default project '${id}'. Use force option or set a new default first.`
      );
    }

    this.projects.delete(id);

    // Update default project if needed
    if (this.defaultProjectId === id) {
      this.defaultProjectId = this.projects.size > 0 ? this.projects.keys().next().value : undefined;
    }

    await this.save();

    // Emit event
    if (emitEvent) {
      this.eventBus.emit({
        type: 'ProjectDeleted',
        projectId: id,
        project,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.info(`Removed project: ${id}`);
  }

  /**
   * Get a project by ID
   */
  async getProject(id: string): Promise<Project | null> {
    await this.ensureInitialized();
    return this.projects.get(id) ?? null;
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<Project[]> {
    await this.ensureInitialized();
    return Array.from(this.projects.values());
  }

  /**
   * Get the default project
   */
  async getDefaultProject(): Promise<Project | null> {
    await this.ensureInitialized();
    if (!this.defaultProjectId) return null;
    return this.projects.get(this.defaultProjectId) ?? null;
  }

  /**
   * Set the default project
   */
  async setDefaultProject(id: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.projects.has(id)) {
      throw new Error(`Project '${id}' not found`);
    }

    this.defaultProjectId = id;
    await this.save();
    this.logger.info(`Set default project: ${id}`);
  }

  /**
   * Check if a project exists
   */
  async hasProject(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.projects.has(id);
  }

  /**
   * Get project count
   */
  async count(): Promise<number> {
    await this.ensureInitialized();
    return this.projects.size;
  }

  // ============================================
  // Validation
  // ============================================

  /**
   * Validate project data
   */
  validateProject(project: Partial<Project>): ProjectValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!project.id) {
      errors.push('Project ID is required');
    } else {
      // ID format validation (kebab-case)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.id)) {
        errors.push('Project ID must be kebab-case (e.g., "frontend-app")');
      }
    }

    if (!project.name) {
      errors.push('Project name is required');
    }

    // Optional field validation
    if (project.techStack && !Array.isArray(project.techStack)) {
      errors.push('techStack must be an array');
    }

    if (project.keywords && !Array.isArray(project.keywords)) {
      errors.push('keywords must be an array');
    }

    // Warnings for optional but recommended fields
    if (!project.description) {
      warnings.push('Project description is recommended');
    }

    if (!project.techStack || project.techStack.length === 0) {
      warnings.push('Tech stack is recommended for intelligent detection');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================
  // Sync Status
  // ============================================

  /**
   * Get sync status for a project
   */
  async getSyncStatus(id: string): Promise<ProjectSyncStatus | null> {
    const project = await this.getProject(id);
    if (!project) return null;

    const tools: SyncStatus[] = [];

    // Helper to determine sync status from mapping
    const getStatus = (mapping: { lastSynced?: string; syncError?: string }): SyncStatus['status'] => {
      if (mapping.syncError) return 'error';
      if (mapping.lastSynced) return 'synced';
      return 'never';
    };

    if (project.external?.github) {
      tools.push({
        tool: 'github',
        lastSynced: project.external.github.lastSynced,
        status: getStatus(project.external.github),
        error: project.external.github.syncError,
      });
    }

    if (project.external?.ado) {
      tools.push({
        tool: 'ado',
        lastSynced: project.external.ado.lastSynced,
        status: getStatus(project.external.ado),
        error: project.external.ado.syncError,
      });
    }

    if (project.external?.jira) {
      tools.push({
        tool: 'jira',
        lastSynced: project.external.jira.lastSynced,
        status: getStatus(project.external.jira),
        error: project.external.jira.syncError,
      });
    }

    // Calculate overall status
    const overallStatus = this.calculateOverallStatus(tools);

    return { projectId: id, overallStatus, tools };
  }

  /**
   * Calculate overall sync status from individual tool statuses
   */
  private calculateOverallStatus(tools: SyncStatus[]): ProjectSyncStatus['overallStatus'] {
    if (tools.length === 0) return 'never';

    const hasErrors = tools.some((t) => t.status === 'error');
    if (hasErrors) return 'error';

    const allSynced = tools.every((t) => t.status === 'synced');
    if (allSynced) return 'synced';

    const hasSomeSynced = tools.some((t) => t.status === 'synced');
    if (hasSomeSynced) return 'partial';

    return 'never';
  }

  /**
   * Request sync for a project or all projects
   */
  async requestSync(
    projectId?: string,
    targets: ('github' | 'ado' | 'jira')[] = ['github', 'ado', 'jira']
  ): Promise<void> {
    await this.ensureInitialized();

    this.eventBus.emit({
      type: 'ProjectSyncRequested',
      projectId,
      targets,
      timestamp: new Date().toISOString(),
    });

    this.logger.info(`Sync requested for ${projectId || 'all projects'} to ${targets.join(', ')}`);
  }

  // ============================================
  // Event Bus Access
  // ============================================

  /**
   * Get the event bus for subscribing to events
   */
  getEventBus(): ProjectEventBus {
    return this.eventBus;
  }
}
