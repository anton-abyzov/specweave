/**
 * JiraProjectAdapter - Map projects to JIRA projects
 *
 * Subscribes to project events and stores JIRA project key mappings.
 * Note: JIRA projects cannot be created via API, this is a read-only
 * mapping that validates existing JIRA projects.
 */

import { Logger, consoleLogger } from '../../../utils/logger.js';
import {
  Project,
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
  ProjectDeletedEvent,
  ProjectSyncRequestedEvent,
  JiraMapping,
} from '../types/project-types.js';
import { ProjectEventBus } from '../project-event-bus.js';
import { ProjectRegistry } from '../project-registry.js';

export interface JiraProjectAdapterOptions {
  logger?: Logger;
  domain: string;
  email?: string;
  apiToken?: string;
}

export class JiraProjectAdapter {
  private logger: Logger;
  private domain: string;
  private email?: string;
  private apiToken?: string;
  private registry?: ProjectRegistry;

  constructor(options: JiraProjectAdapterOptions) {
    this.logger = options.logger ?? consoleLogger;
    this.domain = options.domain;
    this.email = options.email || process.env.JIRA_EMAIL;
    this.apiToken = options.apiToken || process.env.JIRA_API_TOKEN;
  }

  /**
   * Subscribe to project events from the registry's event bus
   */
  subscribe(registry: ProjectRegistry): void {
    this.registry = registry;
    const eventBus = registry.getEventBus();

    eventBus.onProjectCreated(this.handleProjectCreated.bind(this));
    eventBus.onProjectUpdated(this.handleProjectUpdated.bind(this));
    eventBus.onProjectDeleted(this.handleProjectDeleted.bind(this));
    eventBus.onProjectSyncRequested(this.handleSyncRequested.bind(this));

    this.logger.debug('JiraProjectAdapter subscribed to project events');
  }

  /**
   * Handle ProjectCreated event - store JIRA mapping (no creation)
   */
  private async handleProjectCreated(event: ProjectCreatedEvent): Promise<void> {
    const { project } = event;

    // If JIRA mapping already provided, validate it
    if (project.external?.jira?.projectKey) {
      await this.validateAndStoreMapping(project);
    } else {
      // Try to guess JIRA project key from project ID
      const suggestedKey = this.suggestProjectKey(project.id);
      const exists = await this.projectKeyExists(suggestedKey);

      if (exists && this.registry) {
        await this.registry.updateProject(
          project.id,
          {
            external: {
              ...project.external,
              jira: {
                projectKey: suggestedKey,
                lastSynced: new Date().toISOString(),
              },
            },
          },
          { emitEvent: false }
        );
        this.logger.info(`Auto-mapped project to JIRA: ${project.id} → ${suggestedKey}`);
      } else {
        this.logger.debug(
          `No auto-mapping for JIRA (key ${suggestedKey} doesn't exist): ${project.id}`
        );
      }
    }
  }

  /**
   * Handle ProjectUpdated event - revalidate mapping
   */
  private async handleProjectUpdated(event: ProjectUpdatedEvent): Promise<void> {
    const { projectId, changes } = event;

    // Only sync if JIRA mapping changed
    if (!changes.external?.jira) {
      return;
    }

    try {
      const project = await this.registry?.getProject(projectId);
      if (!project) return;

      await this.validateAndStoreMapping(project);
    } catch (error) {
      this.logger.error(`Failed to update JIRA mapping for project ${projectId}: ${error}`);
    }
  }

  /**
   * Handle ProjectDeleted event - log removal
   */
  private async handleProjectDeleted(event: ProjectDeletedEvent): Promise<void> {
    const { projectId, project } = event;

    if (project.external?.jira?.projectKey) {
      this.logger.info(
        `Project ${projectId} deleted. JIRA project ${project.external.jira.projectKey} preserved.`
      );
    }
  }

  /**
   * Handle ProjectSyncRequested event - validate mappings
   */
  private async handleSyncRequested(event: ProjectSyncRequestedEvent): Promise<void> {
    if (!event.targets.includes('jira')) {
      return;
    }

    try {
      if (event.projectId) {
        const project = await this.registry?.getProject(event.projectId);
        if (project) {
          await this.syncProject(project);
        }
      } else {
        const projects = await this.registry?.listProjects();
        if (projects) {
          for (const project of projects) {
            await this.syncProject(project);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to handle JIRA sync request: ${error}`);
    }
  }

  /**
   * Sync a project - validate JIRA mapping
   */
  private async syncProject(project: Project): Promise<void> {
    if (!project.external?.jira?.projectKey) {
      this.logger.debug(`No JIRA mapping for project: ${project.id}`);
      return;
    }

    await this.validateAndStoreMapping(project);
  }

  /**
   * Validate and store JIRA mapping
   */
  private async validateAndStoreMapping(project: Project): Promise<void> {
    const projectKey = project.external?.jira?.projectKey;
    if (!projectKey) return;

    const exists = await this.projectKeyExists(projectKey);

    if (this.registry) {
      await this.registry.updateProject(
        project.id,
        {
          external: {
            ...project.external,
            jira: {
              ...project.external?.jira,
              projectKey,
              lastSynced: new Date().toISOString(),
              syncError: exists ? undefined : `JIRA project ${projectKey} not found`,
            },
          },
        },
        { emitEvent: false }
      );
    }

    if (exists) {
      this.logger.info(`Validated JIRA mapping: ${project.id} → ${projectKey}`);
    } else {
      this.logger.warn(`JIRA project not found: ${projectKey}`);
    }
  }

  // ============================================
  // JIRA API Operations
  // ============================================

  /**
   * Suggest JIRA project key from project ID
   */
  private suggestProjectKey(projectId: string): string {
    // Convert kebab-case to uppercase abbreviation
    // e.g., "frontend-app" → "FRONT" or "FA"
    const words = projectId.split('-');

    if (words.length === 1) {
      // Single word: use first 4-5 letters
      return words[0].substring(0, 5).toUpperCase();
    }

    // Multiple words: use initials
    return words.map((w) => w[0]).join('').toUpperCase();
  }

  /**
   * Get authorization header
   */
  private getAuthHeader(): string {
    if (!this.email || !this.apiToken) {
      return '';
    }
    return `Basic ${Buffer.from(`${this.email}:${this.apiToken}`).toString('base64')}`;
  }

  /**
   * Check if JIRA project key exists
   */
  private async projectKeyExists(projectKey: string): Promise<boolean> {
    if (!this.email || !this.apiToken) {
      this.logger.debug('No JIRA credentials configured, cannot validate project key');
      return false;
    }

    try {
      const url = `https://${this.domain}/rest/api/3/project/${projectKey}`;

      const response = await fetch(url, {
        headers: {
          Authorization: this.getAuthHeader(),
          Accept: 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      this.logger.debug(`Failed to check JIRA project: ${error}`);
      return false;
    }
  }

  /**
   * Discover JIRA projects
   */
  async discoverProjects(): Promise<Partial<Project>[]> {
    if (!this.email || !this.apiToken) {
      this.logger.warn('No JIRA credentials configured, cannot discover projects');
      return [];
    }

    try {
      const url = `https://${this.domain}/rest/api/3/project/search?maxResults=100`;

      const response = await fetch(url, {
        headers: {
          Authorization: this.getAuthHeader(),
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const projects = data.values || [];

      return projects.map((jp: any) => {
        const id = jp.key.toLowerCase();
        return {
          id,
          name: jp.name,
          description: jp.description,
          external: {
            jira: {
              projectKey: jp.key,
            },
          },
        };
      });
    } catch (error) {
      this.logger.error(`Failed to discover JIRA projects: ${error}`);
      return [];
    }
  }
}
