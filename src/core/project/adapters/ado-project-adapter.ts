/**
 * ADOProjectAdapter - Sync projects to Azure DevOps area paths
 *
 * Subscribes to project events and maps SpecWeave projects
 * to ADO area paths. Note: Creating area paths may require
 * admin permissions in ADO.
 */

import { Logger, consoleLogger } from '../../../utils/logger.js';
import {
  Project,
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
  ProjectDeletedEvent,
  ProjectSyncRequestedEvent,
  ADOMapping,
} from '../types/project-types.js';
import { ProjectEventBus } from '../project-event-bus.js';
import { ProjectRegistry } from '../project-registry.js';

export interface ADOProjectAdapterOptions {
  logger?: Logger;
  organization: string;
  project: string;
  pat?: string;
}

export class ADOProjectAdapter {
  private logger: Logger;
  private organization: string;
  private project: string;
  private pat?: string;
  private registry?: ProjectRegistry;

  constructor(options: ADOProjectAdapterOptions) {
    this.logger = options.logger ?? consoleLogger;
    this.organization = options.organization;
    this.project = options.project;
    this.pat = options.pat || process.env.AZURE_DEVOPS_PAT;
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

    this.logger.debug('ADOProjectAdapter subscribed to project events');
  }

  /**
   * Handle ProjectCreated event - map to ADO area path
   */
  private async handleProjectCreated(event: ProjectCreatedEvent): Promise<void> {
    const { project } = event;

    try {
      const areaPath = this.getAreaPath(project.id);

      // Try to create area path (may fail if no permissions)
      const created = await this.createAreaPath(areaPath);

      // Update registry with mapping
      if (this.registry) {
        await this.registry.updateProject(
          project.id,
          {
            external: {
              ...project.external,
              ado: {
                areaPath,
                lastSynced: new Date().toISOString(),
                syncError: created ? undefined : 'Area path creation requires admin permissions',
              },
            },
          },
          { emitEvent: false }
        );
      }

      if (created) {
        this.logger.info(`Created ADO area path: ${areaPath}`);
      } else {
        this.logger.warn(`ADO area path mapping saved (creation requires admin): ${areaPath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle ADO mapping for project ${project.id}: ${error}`);

      if (this.registry) {
        await this.registry.updateProject(
          project.id,
          {
            external: {
              ...project.external,
              ado: {
                areaPath: this.getAreaPath(project.id),
                syncError: String(error),
              },
            },
          },
          { emitEvent: false }
        );
      }
    }
  }

  /**
   * Handle ProjectUpdated event - update area path mapping
   */
  private async handleProjectUpdated(event: ProjectUpdatedEvent): Promise<void> {
    const { projectId, changes } = event;

    // Only sync if relevant fields changed
    if (!changes.name && !changes.external?.ado) {
      return;
    }

    try {
      const project = await this.registry?.getProject(projectId);
      if (!project) return;

      // Note: ADO area paths can't be renamed easily, just update the mapping
      const areaPath = this.getAreaPath(projectId);

      if (this.registry) {
        await this.registry.updateProject(
          projectId,
          {
            external: {
              ...project.external,
              ado: {
                ...project.external?.ado,
                areaPath,
                lastSynced: new Date().toISOString(),
                syncError: undefined,
              },
            },
          },
          { emitEvent: false }
        );
      }

      this.logger.info(`Updated ADO mapping for project: ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to update ADO mapping for project ${projectId}: ${error}`);
    }
  }

  /**
   * Handle ProjectDeleted event - note the mapping deletion
   */
  private async handleProjectDeleted(event: ProjectDeletedEvent): Promise<void> {
    const { projectId } = event;

    // Note: We don't delete ADO area paths as they may have work items
    // Just log the deletion
    this.logger.info(`Project ${projectId} deleted. ADO area path preserved for work item history.`);
  }

  /**
   * Handle ProjectSyncRequested event - verify mappings
   */
  private async handleSyncRequested(event: ProjectSyncRequestedEvent): Promise<void> {
    if (!event.targets.includes('ado')) {
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
      this.logger.error(`Failed to handle ADO sync request: ${error}`);
    }
  }

  /**
   * Sync a project to ADO
   */
  private async syncProject(project: Project): Promise<void> {
    const areaPath = this.getAreaPath(project.id);

    // Verify area path exists
    const exists = await this.areaPathExists(areaPath);

    if (this.registry) {
      await this.registry.updateProject(
        project.id,
        {
          external: {
            ...project.external,
            ado: {
              ...project.external?.ado,
              areaPath,
              lastSynced: new Date().toISOString(),
              syncError: exists ? undefined : 'Area path does not exist in ADO',
            },
          },
        },
        { emitEvent: false }
      );
    }

    this.logger.info(`Synced project to ADO: ${project.id} (exists: ${exists})`);
  }

  // ============================================
  // ADO API Operations
  // ============================================

  /**
   * Get area path for a project
   */
  private getAreaPath(projectId: string): string {
    // Convert kebab-case to PascalCase for area path
    const pascalCase = projectId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    return `${this.project}\\${pascalCase}`;
  }

  /**
   * Get authorization header
   */
  private getAuthHeader(): string {
    const token = this.pat || '';
    return `Basic ${Buffer.from(`:${token}`).toString('base64')}`;
  }

  /**
   * Check if area path exists
   */
  private async areaPathExists(areaPath: string): Promise<boolean> {
    if (!this.pat) {
      this.logger.debug('No PAT configured, cannot verify area path');
      return false;
    }

    try {
      const url = `https://dev.azure.com/${this.organization}/${this.project}/_apis/wit/classificationnodes/areas?api-version=7.0&$depth=2`;

      const response = await fetch(url, {
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      // Check if our area path exists in the tree
      return this.findAreaPath(data, areaPath.split('\\').slice(1));
    } catch (error) {
      this.logger.debug(`Failed to check area path: ${error}`);
      return false;
    }
  }

  /**
   * Find area path in classification nodes
   */
  private findAreaPath(node: any, pathParts: string[]): boolean {
    if (pathParts.length === 0) return true;

    const children = node.children || [];
    const target = pathParts[0];

    for (const child of children) {
      if (child.name === target) {
        return this.findAreaPath(child, pathParts.slice(1));
      }
    }

    return false;
  }

  /**
   * Create area path (requires admin permissions)
   */
  private async createAreaPath(areaPath: string): Promise<boolean> {
    if (!this.pat) {
      this.logger.debug('No PAT configured, cannot create area path');
      return false;
    }

    try {
      const pathParts = areaPath.split('\\').slice(1); // Remove project prefix
      const areaName = pathParts[pathParts.length - 1];

      const url = `https://dev.azure.com/${this.organization}/${this.project}/_apis/wit/classificationnodes/areas?api-version=7.0`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: areaName,
        }),
      });

      if (response.status === 201 || response.status === 200) {
        return true;
      }

      if (response.status === 403) {
        this.logger.warn('Insufficient permissions to create area path');
        return false;
      }

      return false;
    } catch (error) {
      this.logger.debug(`Failed to create area path: ${error}`);
      return false;
    }
  }

  /**
   * Discover area paths from ADO
   */
  async discoverProjects(): Promise<Partial<Project>[]> {
    if (!this.pat) {
      this.logger.warn('No PAT configured, cannot discover ADO projects');
      return [];
    }

    try {
      const url = `https://dev.azure.com/${this.organization}/${this.project}/_apis/wit/classificationnodes/areas?api-version=7.0&$depth=1`;

      const response = await fetch(url, {
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const children = data.children || [];

      return children.map((child: any) => {
        const id = child.name.toLowerCase().replace(/\s+/g, '-');
        return {
          id,
          name: child.name,
          external: {
            ado: {
              areaPath: `${this.project}\\${child.name}`,
            },
          },
        };
      });
    } catch (error) {
      this.logger.error(`Failed to discover ADO area paths: ${error}`);
      return [];
    }
  }
}
