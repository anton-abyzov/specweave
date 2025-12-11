/**
 * GitHubProjectAdapter - Sync projects to GitHub labels
 *
 * Subscribes to project events and creates/updates/archives
 * project labels in GitHub repositories.
 *
 * Label format: project:{project-id}
 */

import { Logger, consoleLogger } from '../../../utils/logger.js';
import { execFileNoThrow } from '../../../utils/execFileNoThrow.js';
import {
  Project,
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
  ProjectDeletedEvent,
  ProjectSyncRequestedEvent,
  GitHubMapping,
} from '../types/project-types.js';
import { ProjectEventBus } from '../project-event-bus.js';
import { ProjectRegistry } from '../project-registry.js';

const DEFAULT_LABEL_COLOR = '0052CC'; // Blue

export interface GitHubProjectAdapterOptions {
  logger?: Logger;
  /** GitHub repository owner (optional for discovery-only mode) */
  owner?: string;
  /** GitHub repository name (optional for discovery-only mode) */
  repo?: string;
  token?: string;
}

export class GitHubProjectAdapter {
  private logger: Logger;
  private owner: string;
  private repo: string;
  private token?: string;
  private registry?: ProjectRegistry;

  constructor(options: GitHubProjectAdapterOptions) {
    this.logger = options.logger ?? consoleLogger;
    this.owner = options.owner || '';
    this.repo = options.repo || '';
    this.token = options.token;
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

    this.logger.debug('GitHubProjectAdapter subscribed to project events');
  }

  /**
   * Handle ProjectCreated event - create label in GitHub
   */
  private async handleProjectCreated(event: ProjectCreatedEvent): Promise<void> {
    const { project } = event;

    try {
      const labelName = this.getLabelName(project.id);
      const labelColor = project.external?.github?.labelColor ?? DEFAULT_LABEL_COLOR;

      await this.createLabel(labelName, labelColor, `Project: ${project.name}`);

      // Update registry with sync status
      if (this.registry) {
        await this.registry.updateProject(
          project.id,
          {
            external: {
              ...project.external,
              github: {
                labelName,
                labelColor,
                lastSynced: new Date().toISOString(),
              },
            },
          },
          { emitEvent: false }
        );
      }

      this.logger.info(`Created GitHub label: ${labelName}`);
    } catch (error) {
      this.logger.error(`Failed to create GitHub label for project ${project.id}: ${error}`);

      // Update registry with error
      if (this.registry) {
        await this.registry.updateProject(
          project.id,
          {
            external: {
              ...project.external,
              github: {
                labelName: this.getLabelName(project.id),
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
   * Handle ProjectUpdated event - update label in GitHub
   */
  private async handleProjectUpdated(event: ProjectUpdatedEvent): Promise<void> {
    const { projectId, changes } = event;

    // Only sync if name or relevant fields changed
    if (!changes.name && !changes.external?.github) {
      return;
    }

    try {
      const project = await this.registry?.getProject(projectId);
      if (!project) return;

      const labelName = this.getLabelName(projectId);

      // Update label description if name changed
      if (changes.name) {
        await this.updateLabel(labelName, { description: `Project: ${changes.name}` });
      }

      // Update sync timestamp
      if (this.registry) {
        await this.registry.updateProject(
          projectId,
          {
            external: {
              ...project.external,
              github: {
                ...project.external?.github,
                labelName,
                lastSynced: new Date().toISOString(),
                syncError: undefined,
              },
            },
          },
          { emitEvent: false }
        );
      }

      this.logger.info(`Updated GitHub label: ${labelName}`);
    } catch (error) {
      this.logger.error(`Failed to update GitHub label for project ${projectId}: ${error}`);
    }
  }

  /**
   * Handle ProjectDeleted event - archive label in GitHub
   */
  private async handleProjectDeleted(event: ProjectDeletedEvent): Promise<void> {
    const { projectId } = event;

    try {
      const oldLabelName = this.getLabelName(projectId);
      const archivedLabelName = `_archived_${oldLabelName}`;

      // Rename label to archived
      await this.updateLabel(oldLabelName, { name: archivedLabelName });

      this.logger.info(`Archived GitHub label: ${oldLabelName} → ${archivedLabelName}`);
    } catch (error) {
      this.logger.error(`Failed to archive GitHub label for project ${projectId}: ${error}`);
    }
  }

  /**
   * Handle ProjectSyncRequested event - force sync to GitHub
   */
  private async handleSyncRequested(event: ProjectSyncRequestedEvent): Promise<void> {
    if (!event.targets.includes('github')) {
      return;
    }

    try {
      if (event.projectId) {
        // Sync single project
        const project = await this.registry?.getProject(event.projectId);
        if (project) {
          await this.syncProject(project);
        }
      } else {
        // Sync all projects
        const projects = await this.registry?.listProjects();
        if (projects) {
          for (const project of projects) {
            await this.syncProject(project);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to handle sync request: ${error}`);
    }
  }

  /**
   * Sync a project to GitHub
   */
  private async syncProject(project: Project): Promise<void> {
    const labelName = this.getLabelName(project.id);

    // Check if label exists
    const exists = await this.labelExists(labelName);

    if (exists) {
      // Update existing label
      await this.updateLabel(labelName, {
        description: `Project: ${project.name}`,
      });
    } else {
      // Create new label
      const labelColor = project.external?.github?.labelColor ?? DEFAULT_LABEL_COLOR;
      await this.createLabel(labelName, labelColor, `Project: ${project.name}`);
    }

    // Update registry
    if (this.registry) {
      await this.registry.updateProject(
        project.id,
        {
          external: {
            ...project.external,
            github: {
              ...project.external?.github,
              labelName,
              lastSynced: new Date().toISOString(),
              syncError: undefined,
            },
          },
        },
        { emitEvent: false }
      );
    }

    this.logger.info(`Synced project to GitHub: ${project.id}`);
  }

  // ============================================
  // GitHub API Operations
  // ============================================

  /**
   * Get label name for a project
   */
  private getLabelName(projectId: string): string {
    return `project:${projectId}`;
  }

  /**
   * Get environment with token
   */
  private getGhEnv(): NodeJS.ProcessEnv {
    return this.token ? { ...process.env, GH_TOKEN: this.token } : process.env;
  }

  /**
   * Check if a label exists
   */
  private async labelExists(labelName: string): Promise<boolean> {
    const result = await execFileNoThrow('gh', [
      'label',
      'list',
      '--repo',
      `${this.owner}/${this.repo}`,
      '--search',
      labelName,
      '--json',
      'name',
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      return false;
    }

    try {
      const labels = JSON.parse(result.stdout);
      return labels.some((l: { name: string }) => l.name === labelName);
    } catch {
      return false;
    }
  }

  /**
   * Create a label in GitHub
   */
  private async createLabel(name: string, color: string, description: string): Promise<void> {
    const result = await execFileNoThrow('gh', [
      'label',
      'create',
      name,
      '--repo',
      `${this.owner}/${this.repo}`,
      '--color',
      color,
      '--description',
      description,
      '--force', // Update if exists
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw new Error(`Failed to create label: ${result.stderr}`);
    }
  }

  /**
   * Update a label in GitHub
   */
  private async updateLabel(
    name: string,
    updates: { name?: string; color?: string; description?: string }
  ): Promise<void> {
    const args = [
      'label',
      'edit',
      name,
      '--repo',
      `${this.owner}/${this.repo}`,
    ];

    if (updates.name) {
      args.push('--name', updates.name);
    }
    if (updates.color) {
      args.push('--color', updates.color);
    }
    if (updates.description) {
      args.push('--description', updates.description);
    }

    const result = await execFileNoThrow('gh', args, { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw new Error(`Failed to update label: ${result.stderr}`);
    }
  }

  /**
   * Discover project labels from GitHub
   */
  async discoverProjects(): Promise<Partial<Project>[]> {
    const result = await execFileNoThrow('gh', [
      'label',
      'list',
      '--repo',
      `${this.owner}/${this.repo}`,
      '--search',
      'project:',
      '--json',
      'name,description,color',
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      this.logger.error(`Failed to discover labels: ${result.stderr}`);
      return [];
    }

    try {
      const labels = JSON.parse(result.stdout) as Array<{
        name: string;
        description: string;
        color: string;
      }>;

      return labels
        .filter((l) => l.name.startsWith('project:'))
        .map((l) => {
          const id = l.name.replace('project:', '');
          const name = l.description?.replace('Project: ', '') || id;

          return {
            id,
            name,
            external: {
              github: {
                labelName: l.name,
                labelColor: l.color,
              },
            },
          };
        });
    } catch {
      return [];
    }
  }
}
