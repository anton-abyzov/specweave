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
import { maskCredentials } from '../utils/credential-masker.js';

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

export interface ExternalPullFailure {
  platform: ExternalChange['platform'];
  message: string;
}

/** A rejected fetch must not be mistaken for a complete synchronization. */
export class ExternalPullError extends Error {
  constructor(
    public readonly changes: ExternalChange[],
    public readonly failures: ExternalPullFailure[],
    public readonly completedPlatforms: ExternalChange['platform'][],
  ) {
    super(`External pull incomplete: ${failures.map(f => f.platform).join(', ')}.`);
    this.name = 'ExternalPullError';
  }
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
  /** Explicit tracker repository; takes precedence over the checkout remote. */
  github?: { owner: string; repo: string; token?: string };
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
  private readonly github?: ExternalChangePullerOptions['github'];

  constructor(options: ExternalChangePullerOptions) {
    this.projectRoot = options.projectRoot;
    this.logger = options.logger ?? consoleLogger;
    this.platforms = options.platforms ?? ['ado', 'jira', 'github'];
    this.github = options.github;
  }

  /**
   * Fetch recent changes from all configured platforms
   *
   * @param since - Timestamp to query changes from
   * @param linkedItems - Optional map of platform -> item IDs to filter
   * @returns Array of external changes from all platforms
   * @throws ExternalPullError with successful results when any provider fails
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
    const failures: ExternalPullFailure[] = [];
    const recordFailure = (platform: ExternalChange['platform'], error: unknown) => {
      const message = maskCredentials(error instanceof Error ? error.message : String(error));
      failures.push({ platform, message });
      this.logger.warn(`${platform} fetch failed: ${message}`);
    };

    this.logger.log(`⬇️  Fetching changes since ${since.toISOString()}`);

    // Fetch from each platform in parallel
    const fetchPromises: Promise<void>[] = [];

    if (this.platforms.includes('ado')) {
      fetchPromises.push(
        this.fetchAdoChanges(since, linkedItems?.ado)
          .then(changes => { allChanges.push(...changes); })
          .catch(err => { recordFailure('ado', err); })
      );
    }

    if (this.platforms.includes('jira')) {
      fetchPromises.push(
        this.fetchJiraChanges(since, linkedItems?.jira)
          .then(changes => { allChanges.push(...changes); })
          .catch(err => { recordFailure('jira', err); })
      );
    }

    if (this.platforms.includes('github')) {
      fetchPromises.push(
        this.fetchGitHubChanges(since, linkedItems?.github)
          .then(changes => { allChanges.push(...changes); })
          .catch(err => { recordFailure('github', err); })
      );
    }

    await Promise.all(fetchPromises);

    // Sort by changedAt (most recent first)
    allChanges.sort((a, b) =>
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );

    if (failures.length > 0) {
      failures.sort((a, b) => a.platform.localeCompare(b.platform));
      const completed = this.platforms.filter(platform => !failures.some(f => f.platform === platform));
      throw new ExternalPullError(allChanges, failures, completed);
    }
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
  }

  /**
   * Fetch changes from JIRA
   */
  private async fetchJiraChanges(
    since: Date,
    linkedIssueKeys?: string[]
  ): Promise<ExternalChange[]> {
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
  }

  /**
   * Fetch changes from GitHub
   */
  private async fetchGitHubChanges(
    since: Date,
    linkedIssueNumbers?: number[]
  ): Promise<ExternalChange[]> {
    // Dynamic import to avoid initialization errors when GitHub is not configured
    const { GitHubClientV2 } = await import('../../plugins/specweave/lib/integrations/github/github-client-v2.js');

    // Detect repo from git remote
    const detected = this.github ?? await GitHubClientV2.detectRepo(this.projectRoot);
    if (!detected) {
      throw new Error('No GitHub repository configured and no GitHub remote detected. Run specweave sync setup.');
    }

    const client = new GitHubClientV2({
      provider: 'github',
      displayName: `${detected.owner}/${detected.repo}`,
      config: { owner: detected.owner, repo: detected.repo, ...(this.github?.token ? { token: this.github.token } : {}) },
      timeRange: { default: '1M', max: '6M' },
    }, this.projectRoot);
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
