/**
 * External Change Puller
 *
 * Pulls changes from external tools (ADO, JIRA, GitHub) back to SpecWeave.
 * Implements the pull direction of bidirectional sync.
 *
 * Features:
 * - Fetch recent changes from all configured platforms
 * - Map external changes to living docs format
 * - Support for timestamp-based filtering
 *
 * @module sync/external-change-puller
 */

import { Logger, consoleLogger } from '../utils/logger.js';
import { AdoExternalChange } from '../integrations/ado/ado-client.js';
import { JiraExternalChange } from '../integrations/jira/jira-client.js';

/**
 * Generic external change interface
 * Unifies changes from ADO, JIRA, and GitHub
 */
export interface ExternalChange {
  platform: 'ado' | 'jira' | 'github';
  externalId: string;
  changedAt: string;        // ISO timestamp
  changedBy: string;        // Email/username
  changedFields: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  currentState: {
    status: string;
    priority: string | number | null;
    assignee: string | null;
  };
}

/**
 * External change puller options
 */
export interface ExternalChangePullerOptions {
  /**
   * Project root directory
   */
  projectRoot: string;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Platforms to pull from
   */
  platforms?: Array<'ado' | 'jira' | 'github'>;
}

/**
 * ExternalChangePuller - Fetches changes from external tools
 *
 * Aggregates changes from all configured external tools and
 * transforms them into a unified format for processing.
 */
export class ExternalChangePuller {
  private readonly projectRoot: string;
  private readonly logger: Logger;
  private readonly platforms: Array<'ado' | 'jira' | 'github'>;

  constructor(options: ExternalChangePullerOptions) {
    this.projectRoot = options.projectRoot;
    this.logger = options.logger ?? consoleLogger;
    this.platforms = options.platforms ?? ['ado', 'jira', 'github'];
  }

  /**
   * Fetch recent changes from all configured platforms
   *
   * @param since - Timestamp to query changes from
   * @param linkedItems - Optional map of platform -> item IDs to filter
   * @returns Array of external changes from all platforms
   */
  async fetchRecentChanges(
    since: Date,
    linkedItems?: {
      ado?: number[];
      jira?: string[];
      github?: number[];
    }
  ): Promise<ExternalChange[]> {
    const allChanges: ExternalChange[] = [];

    this.logger.log(`⬇️  Fetching changes since ${since.toISOString()}`);

    // Fetch from each platform in parallel
    const fetchPromises: Promise<void>[] = [];

    if (this.platforms.includes('ado')) {
      fetchPromises.push(
        this.fetchAdoChanges(since, linkedItems?.ado)
          .then(changes => { allChanges.push(...changes); })
          .catch(err => { this.logger.warn(`ADO fetch failed: ${err.message}`); })
      );
    }

    if (this.platforms.includes('jira')) {
      fetchPromises.push(
        this.fetchJiraChanges(since, linkedItems?.jira)
          .then(changes => { allChanges.push(...changes); })
          .catch(err => { this.logger.warn(`JIRA fetch failed: ${err.message}`); })
      );
    }

    if (this.platforms.includes('github')) {
      fetchPromises.push(
        this.fetchGitHubChanges(since, linkedItems?.github)
          .then(changes => { allChanges.push(...changes); })
          .catch(err => { this.logger.warn(`GitHub fetch failed: ${err.message}`); })
      );
    }

    await Promise.all(fetchPromises);

    // Sort by changedAt (most recent first)
    allChanges.sort((a, b) =>
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );

    this.logger.log(`📥 Fetched ${allChanges.length} changes from external tools`);

    return allChanges;
  }

  /**
   * Fetch changes from Azure DevOps
   */
  private async fetchAdoChanges(
    since: Date,
    linkedItemIds?: number[]
  ): Promise<ExternalChange[]> {
    try {
      // Dynamic import to avoid initialization errors when ADO is not configured
      const { AdoClient } = await import('../integrations/ado/ado-client.js');
      const client = new AdoClient();

      const adoChanges: AdoExternalChange[] = await client.fetchRecentChanges(since, linkedItemIds);

      // Map to unified format
      return adoChanges.map(change => ({
        platform: 'ado' as const,
        externalId: change.externalId,
        changedAt: change.changedAt,
        changedBy: change.changedBy,
        changedFields: change.changedFields,
        currentState: {
          status: change.currentState.status,
          priority: change.currentState.priority,
          assignee: change.currentState.assignee,
        },
      }));
    } catch (err: any) {
      this.logger.debug(`ADO not configured or error: ${err.message}`);
      return [];
    }
  }

  /**
   * Fetch changes from JIRA
   */
  private async fetchJiraChanges(
    since: Date,
    linkedIssueKeys?: string[]
  ): Promise<ExternalChange[]> {
    try {
      // Dynamic import to avoid initialization errors when JIRA is not configured
      const { JiraClient } = await import('../integrations/jira/jira-client.js');
      const client = new JiraClient();

      const jiraChanges: JiraExternalChange[] = await client.fetchRecentChanges(since, linkedIssueKeys);

      // Map to unified format
      return jiraChanges.map(change => ({
        platform: 'jira' as const,
        externalId: change.externalId,
        changedAt: change.changedAt,
        changedBy: change.changedBy,
        changedFields: change.changedFields,
        currentState: {
          status: change.currentState.status,
          priority: change.currentState.priority,
          assignee: change.currentState.assignee,
        },
      }));
    } catch (err: any) {
      this.logger.debug(`JIRA not configured or error: ${err.message}`);
      return [];
    }
  }

  /**
   * Fetch changes from GitHub
   */
  private async fetchGitHubChanges(
    since: Date,
    linkedIssueNumbers?: number[]
  ): Promise<ExternalChange[]> {
    try {
      // Dynamic import to avoid initialization errors when GitHub is not configured
      const { GitHubClientV2 } = await import('../../plugins/specweave-github/lib/github-client-v2.js');

      // Detect repo from git remote
      const detected = await GitHubClientV2.detectRepo(this.projectRoot);
      if (!detected) {
        this.logger.debug('GitHub: No git remote detected');
        return [];
      }

      const client = GitHubClientV2.fromRepo(detected.owner, detected.repo);
      const githubChanges = await client.fetchRecentChanges(since, linkedIssueNumbers);

      // Map to unified format (GitHub returns slightly different format)
      return githubChanges.map(change => ({
        platform: 'github' as const,
        externalId: change.externalId,
        changedAt: change.changedAt,
        changedBy: change.changedBy,
        changedFields: change.changedFields,
        currentState: {
          status: change.currentState.status,
          priority: null as string | number | null, // GitHub doesn't have priority
          assignee: change.currentState.assignee,
        },
      }));
    } catch (err: any) {
      this.logger.debug(`GitHub not configured or error: ${err.message}`);
      return [];
    }
  }

  /**
   * Map external status to SpecWeave status
   *
   * Converts platform-specific status values to SpecWeave's status taxonomy.
   */
  mapToSpecWeaveStatus(
    platform: 'ado' | 'jira' | 'github',
    externalStatus: string
  ): string {
    // Status mapping by platform
    const statusMaps: Record<string, Record<string, string>> = {
      ado: {
        'New': 'pending',
        'Active': 'in_progress',
        'Resolved': 'completed',
        'Closed': 'completed',
        'Removed': 'cancelled',
      },
      jira: {
        'To Do': 'pending',
        'In Progress': 'in_progress',
        'Done': 'completed',
        'Closed': 'completed',
        'Won\'t Do': 'cancelled',
      },
      github: {
        'open': 'in_progress',
        'closed': 'completed',
      },
    };

    const map = statusMaps[platform] || {};
    return map[externalStatus] || externalStatus.toLowerCase().replace(/\s+/g, '_');
  }
}
