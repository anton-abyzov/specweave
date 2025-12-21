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
 */
export type IncrementEventType =
  | 'increment.created'
  | 'increment.done'
  | 'increment.archived'
  | 'increment.reopened'
  | 'user-story.completed'
  | 'user-story.reopened';

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
    const config: AdapterConfig = {};

    // Load .env file if exists
    const envPath = path.join(this.projectRoot, '.env');
    const envVars: Record<string, string> = {};

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          envVars[key] = value;
        }
      }
    }

    // Load config.json
    const configPath = path.join(this.projectRoot, '.specweave', 'config.json');
    let specweaveConfig: any = {};

    if (fs.existsSync(configPath)) {
      try {
        specweaveConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch {
        // Ignore parse errors
      }
    }

    // GitHub configuration
    const githubToken = envVars.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
    const githubOwner = specweaveConfig.sync?.github?.owner || envVars.GITHUB_OWNER || process.env.GITHUB_OWNER;
    const githubRepo = specweaveConfig.sync?.github?.repo || envVars.GITHUB_REPO || process.env.GITHUB_REPO;

    if (githubToken && githubOwner && githubRepo) {
      config.github = {
        enabled: specweaveConfig.sync?.github?.enabled !== false,
        owner: githubOwner,
        repo: githubRepo,
        token: githubToken,
      };
    }

    // ADO configuration
    const adoToken = envVars.AZURE_DEVOPS_PAT || process.env.AZURE_DEVOPS_PAT;
    const adoOrg = specweaveConfig.sync?.ado?.organization || envVars.AZURE_DEVOPS_ORG || process.env.AZURE_DEVOPS_ORG;
    const adoProject = specweaveConfig.sync?.ado?.project || envVars.AZURE_DEVOPS_PROJECT || process.env.AZURE_DEVOPS_PROJECT;

    if (adoToken && adoOrg && adoProject) {
      config.ado = {
        enabled: specweaveConfig.sync?.ado?.enabled !== false,
        organization: adoOrg,
        project: adoProject,
        token: adoToken,
      };
    }

    // JIRA configuration
    const jiraToken = envVars.JIRA_API_TOKEN || process.env.JIRA_API_TOKEN;
    const jiraDomain = specweaveConfig.sync?.jira?.domain || envVars.JIRA_DOMAIN || process.env.JIRA_DOMAIN;
    const jiraEmail = envVars.JIRA_EMAIL || process.env.JIRA_EMAIL;

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
    switch (eventType) {
      case 'increment.done':
        // When increment completes, request sync to external tools
        await this.registry.requestSync(projectId, ['github', 'ado', 'jira']);
        break;

      case 'increment.created':
        // New increment - may want to create project labels/areas
        // Only sync if this is a new project
        const project = await this.registry.getProject(projectId);
        if (project && !project.external?.github?.lastSynced) {
          await this.registry.requestSync(projectId, ['github']);
        }
        break;

      case 'increment.archived':
        // Archived increment - no immediate sync needed
        break;

      case 'increment.reopened':
        // Reopened increment - sync status update
        await this.registry.requestSync(projectId, ['github']);
        break;

      case 'user-story.completed':
      case 'user-story.reopened':
        // User story changes - could trigger issue updates
        // Currently handled by living-specs-handler directly
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

      return null;
    } catch {
      return null;
    }
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

    if (this.adapters.github) {
      try {
        const projects = await this.adapters.github.discoverProjects();
        if (projects.length > 0) {
          discovered.set('github', projects);
        }
      } catch (error) {
        this.logger.warn(`GitHub discovery failed: ${error}`);
      }
    }

    if (this.adapters.ado) {
      try {
        const projects = await this.adapters.ado.discoverProjects();
        if (projects.length > 0) {
          discovered.set('ado', projects);
        }
      } catch (error) {
        this.logger.warn(`ADO discovery failed: ${error}`);
      }
    }

    if (this.adapters.jira) {
      try {
        const projects = await this.adapters.jira.discoverProjects();
        if (projects.length > 0) {
          discovered.set('jira', projects);
        }
      } catch (error) {
        this.logger.warn(`JIRA discovery failed: ${error}`);
      }
    }

    return discovered;
  }
}
