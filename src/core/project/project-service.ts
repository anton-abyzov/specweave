/**
 * ProjectService - Singleton service for project-level EDA
 *
 * Provides a centralized service that:
 * 1. Initializes ProjectRegistry with subscribed adapters
 * 2. Bridges increment-level events to project-level events
 * 3. Manages adapter lifecycle (subscribe/unsubscribe)
 *
 * This service connects the two EDA layers:
 * - Increment-level EDA (shell hooks, detectors, handlers)
 * - Project-level EDA (ProjectRegistry, ProjectEventBus, Adapters)
 *
 * Usage:
 *   const service = await ProjectService.getInstance(projectRoot);
 *   await service.initialize(); // Subscribes adapters
 *   service.emitIncrementEvent('increment.done', '0145-project-registry');
 */

import path from 'path';
import * as fs from '../../utils/fs-native.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { ProjectRegistry } from './project-registry.js';
import { ProjectEventBus } from './project-event-bus.js';
import { GitHubProjectAdapter } from './adapters/github-project-adapter.js';
import { ADOProjectAdapter } from './adapters/ado-project-adapter.js';
import { JiraProjectAdapter } from './adapters/jira-project-adapter.js';

/**
 * Increment event types from hooks v2
 *
 * v1.0.144: Added spec.updated, task.updated, metadata.changed for universal
 * external tool sync (GitHub/JIRA/ADO) on AC completion and task updates.
 */
export type IncrementEventType =
  | 'increment.created'
  | 'increment.done'
  | 'increment.completed'
  | 'increment.archived'
  | 'increment.reopened'
  | 'increment.sync'
  | 'user-story.completed'
  | 'user-story.reopened'
  | 'spec.updated'
  | 'task.updated'
  | 'metadata.changed';

/**
 * Configuration for external tool adapters
 */
export interface AdapterConfig {
  github?: {
    enabled: boolean;
    owner: string;
    repo: string;
    token?: string;
  };
  ado?: {
    enabled: boolean;
    organization: string;
    project: string;
    token?: string;
  };
  jira?: {
    enabled: boolean;
    domain: string;
    email?: string;
    token?: string;
  };
}

/**
 * ProjectService - Singleton pattern for managing project EDA
 */
export class ProjectService {
  private static instances: Map<string, ProjectService> = new Map();

  private projectRoot: string;
  private registry: ProjectRegistry;
  private eventBus: ProjectEventBus;
  private logger: Logger;
  private adapters: {
    github?: GitHubProjectAdapter;
    ado?: ADOProjectAdapter;
    jira?: JiraProjectAdapter;
  } = {};
  private initialized = false;

  private constructor(projectRoot: string, logger?: Logger) {
    this.projectRoot = projectRoot;
    this.logger = logger ?? consoleLogger;
    this.eventBus = new ProjectEventBus({ logger: this.logger });
    this.registry = new ProjectRegistry(projectRoot, {
      logger: this.logger,
      eventBus: this.eventBus,
    });
  }

  /**
   * Get singleton instance for a project root
   */
  static getInstance(projectRoot: string, logger?: Logger): ProjectService {
    const normalizedPath = path.normalize(projectRoot);

    if (!ProjectService.instances.has(normalizedPath)) {
      ProjectService.instances.set(
        normalizedPath,
        new ProjectService(normalizedPath, logger)
      );
    }

    return ProjectService.instances.get(normalizedPath)!;
  }

  /**
   * Clear singleton instance (for testing)
   */
  static clearInstance(projectRoot: string): void {
    const normalizedPath = path.normalize(projectRoot);
    ProjectService.instances.delete(normalizedPath);
  }

  /**
   * Clear all instances (for testing)
   */
  static clearAllInstances(): void {
    ProjectService.instances.clear();
  }

  /**
   * Initialize the service with adapters
   *
   * Loads adapter configuration from:
   * 1. .specweave/config.json (sync section)
   * 2. Environment variables (GITHUB_TOKEN, etc.)
   * 3. .env file
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.debug('Initializing ProjectService...');

    // Load adapter configuration
    const config = await this.loadAdapterConfig();

    // Initialize and subscribe adapters
    if (config.github?.enabled) {
      this.adapters.github = new GitHubProjectAdapter({
        logger: this.logger,
        owner: config.github.owner,
        repo: config.github.repo,
        token: config.github.token,
      });
      this.adapters.github.subscribe(this.registry);
      this.logger.debug('GitHub adapter subscribed');
    }

    if (config.ado?.enabled) {
      this.adapters.ado = new ADOProjectAdapter({
        logger: this.logger,
        organization: config.ado.organization,
        project: config.ado.project,
        pat: config.ado.token, // ADO adapter uses 'pat' not 'token'
      });
      this.adapters.ado.subscribe(this.registry);
      this.logger.debug('ADO adapter subscribed');
    }

    if (config.jira?.enabled) {
      this.adapters.jira = new JiraProjectAdapter({
        logger: this.logger,
        domain: config.jira.domain,
        email: config.jira.email,
        apiToken: config.jira.token, // JIRA adapter uses 'apiToken' not 'token'
      });
      this.adapters.jira.subscribe(this.registry);
      this.logger.debug('JIRA adapter subscribed');
    }

    this.initialized = true;
    this.logger.info('ProjectService initialized');
  }

  /**
   * Load adapter configuration from various sources
   */
  private async loadAdapterConfig(): Promise<AdapterConfig> {
    const envVars = this.loadEnvFile();
    const specweaveConfig = this.loadSpecweaveConfig();
    const config: AdapterConfig = {};

    // Helper to get value from multiple sources
    const getEnv = (key: string): string | undefined =>
      envVars[key] || process.env[key];

    const getConfigValue = (section: string, key: string, envKey: string): string | undefined =>
      specweaveConfig.sync?.[section]?.[key] || getEnv(envKey);

    // GitHub configuration
    const githubToken = getEnv('GITHUB_TOKEN');
    const githubOwner = getConfigValue('github', 'owner', 'GITHUB_OWNER');
    const githubRepo = getConfigValue('github', 'repo', 'GITHUB_REPO');

    if (githubToken && githubOwner && githubRepo) {
      config.github = {
        enabled: specweaveConfig.sync?.github?.enabled !== false,
        owner: githubOwner,
        repo: githubRepo,
        token: githubToken,
      };
    }

    // ADO configuration
    const adoToken = getEnv('AZURE_DEVOPS_PAT');
    const adoOrg = getConfigValue('ado', 'organization', 'AZURE_DEVOPS_ORG');
    const adoProject = getConfigValue('ado', 'project', 'AZURE_DEVOPS_PROJECT');

    if (adoToken && adoOrg && adoProject) {
      config.ado = {
        enabled: specweaveConfig.sync?.ado?.enabled !== false,
        organization: adoOrg,
        project: adoProject,
        token: adoToken,
      };
    }

    // JIRA configuration
    const jiraToken = getEnv('JIRA_API_TOKEN');
    const jiraDomain = getConfigValue('jira', 'domain', 'JIRA_DOMAIN');
    const jiraEmail = getEnv('JIRA_EMAIL');

    if (jiraToken && jiraDomain) {
      config.jira = {
        enabled: specweaveConfig.sync?.jira?.enabled !== false,
        domain: jiraDomain,
        email: jiraEmail,
        token: jiraToken,
      };
    }

    return config;
  }

  /**
   * Load and parse .env file
   */
  private loadEnvFile(): Record<string, string> {
    const envPath = path.join(this.projectRoot, '.env');
    const envVars: Record<string, string> = {};

    if (!fs.existsSync(envPath)) {
      return envVars;
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    }

    return envVars;
  }

  /**
   * Load SpecWeave config.json
   */
  private loadSpecweaveConfig(): any {
    const configPath = path.join(this.projectRoot, '.specweave', 'config.json');

    if (!fs.existsSync(configPath)) {
      return {};
    }

    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      return {};
    }
  }

  /**
   * Get the project registry
   */
  getRegistry(): ProjectRegistry {
    return this.registry;
  }

  /**
   * Get the event bus
   */
  getEventBus(): ProjectEventBus {
    return this.eventBus;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Bridge increment-level events to project-level events
   *
   * Called by the project-bridge-handler when increment events occur.
   * Maps increment changes to project sync requests.
   *
   * @param eventType - Increment event type
   * @param eventData - Increment ID or INC_ID:US_ID format
   */
  async emitIncrementEvent(eventType: IncrementEventType, eventData: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Parse event data
    const incId = eventData.includes(':') ? eventData.split(':')[0] : eventData;

    this.logger.debug(`Processing increment event: ${eventType} for ${incId}`);

    // Get project associated with this increment
    const projectId = await this.getProjectForIncrement(incId);

    if (!projectId) {
      this.logger.debug(`No project found for increment ${incId}`);
      return;
    }

    // Map increment events to project sync requests
    // v1.0.144: All events now sync to ALL enabled external tools (GitHub/JIRA/ADO)
    // for universal AC completion and task status updates.
    switch (eventType) {
      case 'increment.done':
      case 'increment.completed':
        // When increment completes, request sync to ALL external tools
        // increment.completed is an alias — shell hooks may send raw status value
        await this.registry.requestSync(projectId, ['github', 'ado', 'jira']);
        break;

      case 'increment.created':
        // New increment created - sync to ALL external tools to create issues
        // v1.0.144: Changed from GitHub-only to ALL tools for universal sync
        // Note: increment.created fires when metadata.json is first written, which may be
        // before spec.md has User Stories. The handlers will also trigger on
        // spec.updated events to ensure issues are created after USs are defined.
        await this.registry.requestSync(projectId, ['github', 'ado', 'jira']);
        break;

      case 'increment.archived':
        // Archived increment - sync status to ALL external tools
        // v1.0.144: Now syncs to close/archive external issues
        await this.registry.requestSync(projectId, ['github', 'ado', 'jira']);
        break;

      case 'increment.reopened':
        // Reopened increment - sync status update to ALL tools
        // v1.0.144: Changed from GitHub-only to ALL tools
        await this.registry.requestSync(projectId, ['github', 'ado', 'jira']);
        break;

      case 'user-story.completed':
      case 'user-story.reopened':
        // User story changes - sync to ALL external tools
        // v1.0.144: Now properly syncs US completion to JIRA/ADO, not just GitHub
        await this.registry.requestSync(projectId, ['github', 'ado', 'jira']);
        break;

      case 'spec.updated':
        // Spec updated - sync AC status to ALL external tools
        // v1.0.144: NEW - ensures AC checkbox updates propagate to JIRA/ADO
        // This is critical for keeping external tool AC status in sync
        await this.registry.requestSync(projectId, ['github', 'ado', 'jira']);
        break;

      case 'task.updated':
        // Task updated - sync task completion to ALL external tools
        // v1.0.144: NEW - ensures task completion updates propagate to JIRA/ADO
        await this.registry.requestSync(projectId, ['github', 'ado', 'jira']);
        break;

      case 'metadata.changed':
        // Metadata changed - sync to ALL external tools
        // v1.0.144: NEW - ensures metadata changes propagate universally
        await this.registry.requestSync(projectId, ['github', 'ado', 'jira']);
        break;

      case 'increment.sync':
        // Catch-all sync event - sent by stop-sync.sh at session end
        // v1.0.257: NEW - ensures queued events are processed
        await this.registry.requestSync(projectId, ['github', 'ado', 'jira']);
        break;
    }
  }

  /**
   * Get project ID associated with an increment
   *
   * Reads the increment's spec.md to find the project field
   */
  private async getProjectForIncrement(incId: string): Promise<string | null> {
    const specPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incId,
      'spec.md'
    );

    if (!fs.existsSync(specPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(specPath, 'utf-8');

      // Look for project field in YAML frontmatter or body
      const projectMatch = content.match(/^project:\s*["']?([^"'\n]+)["']?/m);
      if (projectMatch) {
        return projectMatch[1].trim();
      }

      // Also check for **Project**: field
      const projectFieldMatch = content.match(/\*\*Project\*\*:\s*([^\n]+)/);
      if (projectFieldMatch) {
        // Extract project ID from format like "project-name" or "Project Name (project-id)"
        const projectField = projectFieldMatch[1].trim();
        const idMatch = projectField.match(/\(([^)]+)\)$/);
        if (idMatch) {
          return idMatch[1];
        }
        return projectField.toLowerCase().replace(/\s+/g, '-');
      }

      // Fallback: derive project from config when spec.md has no project field
      return this.getProjectIdFromConfig();
    } catch {
      // Even on read error, try config-based fallback
      return this.getProjectIdFromConfig();
    }
  }

  /**
   * Derive a project ID from .specweave/config.json
   *
   * Fallback chain:
   * 1. project.name from config
   * 2. sync.github.owner/repo -> "owner/repo" slug
   * 3. null if nothing configured
   */
  private getProjectIdFromConfig(): string | null {
    const config = this.loadSpecweaveConfig();

    // Try project.name first
    if (config.project?.name) {
      return config.project.name.toLowerCase().replace(/\s+/g, '-');
    }

    // Derive from GitHub owner/repo
    if (config.sync?.github?.owner && config.sync?.github?.repo) {
      return `${config.sync.github.owner}/${config.sync.github.repo}`;
    }

    // Derive from JIRA project key
    if (config.sync?.jira?.projectKey) {
      return config.sync.jira.projectKey.toLowerCase();
    }

    // Derive from ADO organization/project
    if (config.sync?.ado?.organization && config.sync?.ado?.project) {
      return `${config.sync.ado.organization}/${config.sync.ado.project}`.toLowerCase();
    }

    return null;
  }

  /**
   * Request sync for all projects
   */
  async syncAllProjects(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    await this.registry.requestSync(undefined, ['github', 'ado', 'jira']);
  }

  /**
   * Discover projects from external tools
   */
  async discoverProjects(): Promise<Map<string, any[]>> {
    const discovered = new Map<string, any[]>();

    const adapterEntries: Array<[string, { discoverProjects: () => Promise<any[]> } | undefined]> = [
      ['github', this.adapters.github],
      ['ado', this.adapters.ado],
      ['jira', this.adapters.jira],
    ];

    for (const [name, adapter] of adapterEntries) {
      if (!adapter) continue;

      try {
        const projects = await adapter.discoverProjects();
        if (projects.length > 0) {
          discovered.set(name, projects);
        }
      } catch (error) {
        this.logger.warn(`${name.toUpperCase()} discovery failed: ${error}`);
      }
    }

    return discovered;
  }
}
