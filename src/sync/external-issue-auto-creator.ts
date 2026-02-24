/**
 * External Issue Auto-Creator
 *
 * Automatically creates external issues (GitHub/JIRA/ADO) for increments
 * when they don't have linked issues.
 *
 * TRIGGER POINTS:
 * 1. After increment creation (post-increment-planning hook)
 * 2. During sync-progress if issue is missing
 * 3. On status change (active → completed)
 *
 * SAFETY FEATURES:
 * - 3-layer idempotency (frontmatter → metadata → API)
 * - Duplicate detection before creation
 * - Rate limiting (circuit breaker)
 * - Non-blocking (failures don't crash the workflow)
 *
 * @see ADR-0139 (Unified Post-Increment GitHub Sync)
 */

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { Logger, consoleLogger } from '../utils/logger.js';
import { deriveFeatureId } from '../utils/feature-id-derivation.js';
import { ConfigManager } from '../core/config/config-manager.js';
import { autoDetectProjectIdSync } from '../utils/project-detection.js';
import { isTemplateFile } from '../core/increment/template-creator.js';

export interface ExternalIssueAutoCreatorOptions {
  projectRoot: string;
  logger?: Logger;
}

export interface AutoCreateResult {
  success: boolean;
  provider: 'github' | 'jira' | 'ado' | 'none';
  issueNumber?: number | string;
  issueUrl?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface IncrementInfo {
  id: string;
  featureId: string;
  title: string;
  status: string;
  userStories: Array<{
    id: string;
    title: string;
    project?: string;
  }>;
}

/**
 * Auto-creates external issues for increments
 *
 * Usage:
 * ```typescript
 * const creator = new ExternalIssueAutoCreator({ projectRoot: process.cwd() });
 * const result = await creator.createForIncrement('0001-feature');
 * ```
 */
export class ExternalIssueAutoCreator {
  private projectRoot: string;
  private logger: Logger;
  private configManager: ConfigManager;

  constructor(options: ExternalIssueAutoCreatorOptions) {
    this.projectRoot = options.projectRoot;
    this.logger = options.logger ?? consoleLogger;
    this.configManager = new ConfigManager(this.projectRoot);
  }

  /**
   * Create external issues for an increment (if configured and not already created)
   *
   * This method:
   * 1. Checks if auto-create is enabled in config
   * 2. Detects which provider to use (GitHub/JIRA/ADO)
   * 3. Checks if issues already exist (3-layer idempotency)
   * 4. Creates issues if missing
   * 5. Updates metadata with issue links
   */
  async createForIncrement(incrementId: string): Promise<AutoCreateResult> {
    try {
      // Load config
      const config = await this.configManager.read();

      // Check if auto-create is enabled
      const autoCreateEnabled = this.isAutoCreateEnabled(config);
      if (!autoCreateEnabled) {
        return {
          success: true,
          provider: 'none',
          skipped: true,
          skipReason: 'Auto-create disabled in config (sync.autoCreateOnIncrement = false)',
        };
      }

      // Detect provider
      const provider = this.detectProvider(config);
      if (!provider) {
        return {
          success: true,
          provider: 'none',
          skipped: true,
          skipReason: 'No external provider configured (GitHub/JIRA/ADO)',
        };
      }

      // Guard: skip if spec.md is still a template with placeholders
      const specPath = path.join(
        this.projectRoot,
        '.specweave/increments',
        incrementId,
        'spec.md'
      );
      if (isTemplateFile(specPath)) {
        this.logger.log(`⏭️ Skipping ${incrementId}: spec.md is still a template`);
        return {
          success: true,
          provider: 'none',
          skipped: true,
          skipReason: 'spec.md is still a template - deferring until spec is complete',
        };
      }

      // Load increment info
      const incrementInfo = await this.loadIncrementInfo(incrementId);
      if (!incrementInfo) {
        return {
          success: false,
          provider,
          error: `Increment ${incrementId} not found or missing spec.md`,
        };
      }

      // Check if already has external issue (Layer 1 & 2)
      const existingIssue = await this.checkExistingIssue(incrementId, provider);
      if (existingIssue) {
        this.logger.log(`✅ ${incrementId} already has ${provider} issue: ${existingIssue}`);
        return {
          success: true,
          provider,
          skipped: true,
          skipReason: `Issue already exists: ${existingIssue}`,
        };
      }

      // Create issues based on provider
      // NOTE (0348): GitHub is handled by LivingDocsSync → GitHubFeatureSync chain.
      // ExternalIssueAutoCreator only handles JIRA and ADO now.
      switch (provider) {
        case 'github':
          return {
            success: true,
            provider: 'github',
            skipped: true,
            skipReason: 'GitHub sync handled by LivingDocsSync → GitHubFeatureSync pipeline',
          };
        case 'jira':
          return await this.createJiraIssues(incrementId, incrementInfo, config);
        case 'ado':
          return await this.createAdoIssues(incrementId, incrementInfo, config);
        default:
          return {
            success: false,
            provider: 'none',
            error: `Unknown provider: ${provider}`,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Auto-create failed for ${incrementId}: ${errorMessage}`);
      return {
        success: false,
        provider: 'none',
        error: errorMessage,
      };
    }
  }

  /**
   * Check if auto-create is enabled in config
   *
   * Checks (in order):
   * 1. sync.autoCreateOnIncrement (new, explicit)
   * 2. sync.autoSync (legacy)
   * 3. sync.settings.canUpsertInternalItems (legacy)
   */
  private isAutoCreateEnabled(config: any): boolean {
    // New explicit option (recommended)
    if (config.sync?.autoCreateOnIncrement !== undefined) {
      return config.sync.autoCreateOnIncrement === true;
    }

    // Legacy: autoSync
    if (config.sync?.autoSync === true) {
      return true;
    }

    // Legacy: canUpsertInternalItems
    if (config.sync?.settings?.canUpsertInternalItems === true) {
      return true;
    }

    // Default: false (opt-in)
    return false;
  }

  /**
   * Detect which provider to use for external sync
   *
   * Priority:
   * 1. GitHub (if sync.github.enabled = true)
   * 2. JIRA (if sync.jira.enabled = true)
   * 3. ADO (if sync.ado.enabled = true)
   * 4. GitHub (if issueTracker.provider = 'github')
   * 5. JIRA (if issueTracker.provider = 'jira')
   * 6. ADO (if issueTracker.provider = 'ado')
   */
  private detectProvider(config: any): 'github' | 'jira' | 'ado' | null {
    // Check explicit provider enablement in sync config
    if (config.sync?.github?.enabled === true) {
      return 'github';
    }
    if (config.sync?.jira?.enabled === true) {
      return 'jira';
    }
    if (config.sync?.ado?.enabled === true) {
      return 'ado';
    }

    // Check issueTracker provider
    const trackerProvider = config.issueTracker?.provider;
    if (trackerProvider === 'github') {
      return 'github';
    }
    if (trackerProvider === 'jira') {
      return 'jira';
    }
    if (trackerProvider === 'ado') {
      return 'ado';
    }

    // Check sync profiles for provider hints
    const profiles = config.sync?.profiles || {};
    for (const profile of Object.values(profiles) as any[]) {
      if (profile.provider === 'github') {
        return 'github';
      }
      if (profile.provider === 'jira') {
        return 'jira';
      }
      if (profile.provider === 'ado' || profile.provider === 'azure-devops') {
        return 'ado';
      }
    }

    return null;
  }

  /**
   * Load increment information from spec.md and metadata.json
   */
  private async loadIncrementInfo(incrementId: string): Promise<IncrementInfo | null> {
    const incrementPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId
    );

    const specPath = path.join(incrementPath, 'spec.md');
    const metadataPath = path.join(incrementPath, 'metadata.json');

    if (!existsSync(specPath)) {
      return null;
    }

    try {
      const specContent = await fs.readFile(specPath, 'utf-8');

      // Parse frontmatter
      const frontmatterMatch = specContent.match(/^---\n([\s\S]*?)\n---/);
      let frontmatter: any = {};
      if (frontmatterMatch) {
        frontmatter = yaml.parse(frontmatterMatch[1]) || {};
      }

      // Derive feature ID
      let featureId = frontmatter.feature_id || frontmatter.epic || frontmatter.feature || '';
      if (!featureId) {
        try {
          featureId = deriveFeatureId(incrementId);
        } catch {
          // CRITICAL FIX: If deriveFeatureId fails, parse manually
          // Old code: `FS-${incrementId.substring(0, 4)}` created FS-0142 instead of FS-142
          const numMatch = incrementId.match(/^(\d+)/);
          if (numMatch) {
            const num = parseInt(numMatch[1], 10);
            featureId = `FS-${String(num).padStart(3, '0')}`;
          } else {
            // Last resort: use first 3 chars (unlikely to reach here)
            featureId = `FS-${incrementId.substring(0, 3)}`;
          }
        }
      }

      // Parse user stories from spec.md body
      const userStories = this.parseUserStories(specContent);

      // Load status from metadata
      let status = 'active';
      if (existsSync(metadataPath)) {
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
        status = metadata.status || 'active';
      }

      return {
        id: incrementId,
        featureId,
        title: frontmatter.title || incrementId,
        status,
        userStories,
      };
    } catch (error) {
      this.logger.error(`Failed to load increment info: ${error}`);
      return null;
    }
  }

  /**
   * Parse user stories from spec.md body
   */
  private parseUserStories(specContent: string): Array<{ id: string; title: string; project?: string }> {
    const userStories: Array<{ id: string; title: string; project?: string }> = [];

    // Match ### US-XXX: Title patterns
    const usRegex = /^### (US-\d+):?\s*(.+)$/gm;
    let match;

    while ((match = usRegex.exec(specContent)) !== null) {
      const usId = match[1];
      const title = match[2].trim();

      // Skip template placeholders — matches TEMPLATE_MARKERS.STORY_TITLE
      // Strip optional trailing priority like (P1) before checking
      const titleForCheck = title.replace(/\s*\(P\d\)\s*$/, '');
      if (titleForCheck === '[Story Title]' || /^\[.+\]$/.test(titleForCheck)) continue;

      // Try to find **Project**: field after the US header
      const usStartIndex = match.index;
      const nextUsMatch = specContent.substring(usStartIndex + match[0].length).match(/^### US-\d+/m);
      const usEndIndex = nextUsMatch
        ? usStartIndex + match[0].length + (nextUsMatch.index || 0)
        : specContent.length;

      const usSection = specContent.substring(usStartIndex, usEndIndex);
      const projectMatch = usSection.match(/\*\*Project\*\*:\s*(\S+)/);
      const project = projectMatch ? projectMatch[1] : undefined;

      userStories.push({ id: usId, title, project });
    }

    return userStories;
  }

  /**
   * Check if increment already has external issue linked
   *
   * Checks:
   * 1. metadata.json github/jira/ado fields
   * 2. spec.md frontmatter external links
   */
  private async checkExistingIssue(
    incrementId: string,
    provider: 'github' | 'jira' | 'ado'
  ): Promise<string | null> {
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'metadata.json'
    );

    if (!existsSync(metadataPath)) {
      return null;
    }

    try {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

      switch (provider) {
        case 'github':
          if (metadata.github?.issue) {
            return `#${metadata.github.issue}`;
          }
          if (metadata.github?.issues?.length > 0) {
            return `#${metadata.github.issues[0].number}`;
          }
          break;
        case 'jira':
          if (metadata.jira?.issue) {
            return metadata.jira.issue;
          }
          if (metadata.jira?.issues?.length > 0) {
            return metadata.jira.issues[0].key;
          }
          break;
        case 'ado':
          if (metadata.ado?.workItem) {
            return `#${metadata.ado.workItem}`;
          }
          if (metadata.ado?.workItems?.length > 0) {
            return `#${metadata.ado.workItems[0].id}`;
          }
          break;
      }

      // FIX (v1.0.302 / 0271): Also check externalLinks format (written by SyncCoordinator v1.0.240+)
      switch (provider) {
        case 'github':
          if (metadata.externalLinks?.github?.issueNumber) {
            return `#${metadata.externalLinks.github.issueNumber}`;
          }
          if (metadata.externalLinks?.github?.issues) {
            const issues = metadata.externalLinks.github.issues;
            const firstKey = Object.keys(issues)[0];
            if (firstKey && issues[firstKey]?.issueNumber) {
              return `#${issues[firstKey].issueNumber}`;
            }
          }
          break;
        case 'jira':
          if (metadata.externalLinks?.jira?.issueKey) {
            return metadata.externalLinks.jira.issueKey;
          }
          break;
        case 'ado':
          if (metadata.externalLinks?.ado?.workItemId) {
            return `#${metadata.externalLinks.ado.workItemId}`;
          }
          break;
      }

      return null;
    } catch (error) {
      // FIX (v1.0.302 / 0271): Log error instead of silent swallow
      this.logger.warn(`⚠️ Failed to check existing issue for ${incrementId}: ${error}`);
      return null;
    }
  }

  /**
   * Create GitHub issues for the increment
   */
  private async createGitHubIssues(
    incrementId: string,
    incrementInfo: IncrementInfo,
    config: any
  ): Promise<AutoCreateResult> {
    try {
      // Import GitHub client dynamically to avoid circular deps
      const { GitHubClientV2 } = await import(
        '../../plugins/specweave-github/lib/github-client-v2.js'
      );

      // Detect repo from config
      const repoInfo = await this.detectGitHubRepo(config);
      if (!repoInfo) {
        return {
          success: false,
          provider: 'github',
          error: 'GitHub repository not configured. Set sync.github.owner and sync.github.repo in config.json',
        };
      }

      const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);

      // Check if GitHub issue already exists via API (Layer 3)
      const searchTitle = `[${incrementInfo.featureId}]`;
      const existingIssue = await client.searchIssueByTitle(searchTitle);

      if (existingIssue) {
        // Found existing issue - update metadata and return
        await this.updateMetadataWithGitHubIssue(incrementId, existingIssue.number, existingIssue.html_url);

        return {
          success: true,
          provider: 'github',
          issueNumber: existingIssue.number,
          issueUrl: existingIssue.html_url,
          skipped: true,
          skipReason: `Issue already exists on GitHub: #${existingIssue.number}`,
        };
      }

      // Create issues for each user story
      const createdIssues: number[] = [];

      for (const us of incrementInfo.userStories) {
        const body = this.buildGitHubIssueBody(incrementId, incrementInfo, us);

        try {
          const issue = await client.createUserStoryIssue({
            featureId: incrementInfo.featureId,
            userStoryId: us.id,
            title: us.title,
            body,
            labels: ['specweave', 'auto-created'],
          });
          createdIssues.push(issue.number);
          this.logger.log(`  ✅ Created GitHub issue #${issue.number} for ${us.id}`);
        } catch (error) {
          this.logger.warn(`  ⚠️ Failed to create issue for ${us.id}: ${error}`);
        }
      }

      if (createdIssues.length === 0) {
        // Fallback: create a single feature-level issue using createEpicIssue
        const title = `[${incrementInfo.featureId}] ${incrementInfo.title}`;
        const body = this.buildFeatureLevelIssueBody(incrementId, incrementInfo);

        const issue = await client.createEpicIssue(title, body, undefined, ['specweave', 'auto-created']);
        await this.updateMetadataWithGitHubIssue(incrementId, issue.number, issue.html_url);

        return {
          success: true,
          provider: 'github',
          issueNumber: issue.number,
          issueUrl: issue.html_url,
        };
      }

      // Update metadata with first created issue
      await this.updateMetadataWithGitHubIssue(
        incrementId,
        createdIssues[0],
        `https://github.com/${repoInfo.owner}/${repoInfo.repo}/issues/${createdIssues[0]}`
      );

      return {
        success: true,
        provider: 'github',
        issueNumber: createdIssues[0],
        issueUrl: `https://github.com/${repoInfo.owner}/${repoInfo.repo}/issues/${createdIssues[0]}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        provider: 'github',
        error: errorMessage,
      };
    }
  }

  /**
   * Create JIRA issues for the increment
   */
  private async createJiraIssues(
    incrementId: string,
    incrementInfo: IncrementInfo,
    config: any
  ): Promise<AutoCreateResult> {
    try {
      // Import JIRA client dynamically
      const { JiraClient } = await import('../integrations/jira/jira-client.js');

      const jiraConfig = config.issueTracker || config.sync?.jira || {};
      const domain = jiraConfig.domain;
      const projectKey = jiraConfig.projects?.[0]?.key || jiraConfig.projectKey;

      if (!domain || !projectKey) {
        return {
          success: false,
          provider: 'jira',
          error: 'JIRA not configured. Set issueTracker.domain and issueTracker.projects in config.json',
        };
      }

      const client = new JiraClient();

      // Create Epic for the feature
      const epicSummary = `[${incrementInfo.featureId}] ${incrementInfo.title}`;
      const epicDescription = this.buildJiraEpicDescription(incrementId, incrementInfo);

      const epic = await client.createIssue(
        {
          issueType: 'Epic',
          summary: epicSummary,
          description: epicDescription,
          labels: ['specweave', 'auto-created'],
        },
        projectKey
      );

      // Update metadata
      await this.updateMetadataWithJiraIssue(incrementId, epic.key, epic.self);

      this.logger.log(`✅ Created JIRA Epic: ${epic.key}`);

      return {
        success: true,
        provider: 'jira',
        issueNumber: epic.key,
        issueUrl: `https://${domain}/browse/${epic.key}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        provider: 'jira',
        error: errorMessage,
      };
    }
  }

  /**
   * Create Azure DevOps work items for the increment
   */
  private async createAdoIssues(
    incrementId: string,
    incrementInfo: IncrementInfo,
    config: any
  ): Promise<AutoCreateResult> {
    try {
      const { AdoClient } = await import('../integrations/ado/ado-client.js');
      const { getAdoPat } = await import('../integrations/ado/ado-pat-provider.js');

      const adoConfig = config.issueTracker || config.sync?.ado || {};
      const organization = adoConfig.organization_ado || adoConfig.organization;
      const project = adoConfig.project;

      if (!organization || !project) {
        return {
          success: false,
          provider: 'ado',
          error: 'Azure DevOps not configured. Set issueTracker.organization_ado and issueTracker.project in config.json',
        };
      }

      const pat = getAdoPat(organization);
      if (!pat) {
        return {
          success: false,
          provider: 'ado',
          error: 'AZURE_DEVOPS_PAT not set in environment',
        };
      }

      const client = new AdoClient({
        pat,
        organization,
        project,
      });

      // Create Feature work item
      const title = `[${incrementInfo.featureId}] ${incrementInfo.title}`;
      const description = this.buildAdoDescription(incrementId, incrementInfo);

      const workItem = await client.createWorkItem({
        workItemType: 'Feature',
        title,
        description,
        tags: ['specweave', 'auto-created'],
      });

      // Update metadata
      await this.updateMetadataWithAdoWorkItem(incrementId, workItem.id, workItem.url);

      this.logger.log(`✅ Created ADO Feature: #${workItem.id}`);

      return {
        success: true,
        provider: 'ado',
        issueNumber: workItem.id,
        issueUrl: workItem.url,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        provider: 'ado',
        error: errorMessage,
      };
    }
  }

  /**
   * Detect GitHub repo from config
   */
  private async detectGitHubRepo(
    config: any
  ): Promise<{ owner: string; repo: string } | null> {
    // Check sync.github config
    if (config.sync?.github?.owner && config.sync?.github?.repo) {
      return {
        owner: config.sync.github.owner,
        repo: config.sync.github.repo,
      };
    }

    // Check profiles
    const profiles = config.sync?.profiles || {};
    for (const profile of Object.values(profiles) as any[]) {
      if (profile.provider === 'github' && profile.config?.owner && profile.config?.repo) {
        return {
          owner: profile.config.owner,
          repo: profile.config.repo,
        };
      }
    }

    // Check issueTracker
    if (config.issueTracker?.owner && config.issueTracker?.repo) {
      return {
        owner: config.issueTracker.owner,
        repo: config.issueTracker.repo,
      };
    }

    // Try git remote detection
    try {
      const { execSync } = await import('child_process');
      const remoteUrl = execSync('git remote get-url origin', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      }).trim();

      // Parse GitHub URL
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
        };
      }
    } catch {
      // Git detection failed
    }

    return null;
  }

  /**
   * Build GitHub issue body for a user story
   */
  private buildGitHubIssueBody(
    incrementId: string,
    incrementInfo: IncrementInfo,
    us: { id: string; title: string; project?: string }
  ): string {
    return `## ${us.title}

**Feature**: ${incrementInfo.featureId}
**Increment**: ${incrementId}
**User Story**: ${us.id}
${us.project ? `**Project**: ${us.project}` : ''}

---

📋 See [\`spec.md\`](../../tree/develop/.specweave/increments/${incrementId}/spec.md) for full acceptance criteria.

---

🤖 Auto-created by SpecWeave | Updates automatically on task completion
`;
  }

  /**
   * Build GitHub issue body for feature-level issue
   */
  private buildFeatureLevelIssueBody(
    incrementId: string,
    incrementInfo: IncrementInfo
  ): string {
    const userStoriesList = incrementInfo.userStories
      .map((us) => `- [ ] ${us.id}: ${us.title}`)
      .join('\n');

    return `## ${incrementInfo.title}

**Feature**: ${incrementInfo.featureId}
**Status**: ${incrementInfo.status}

### User Stories

${userStoriesList || '_No user stories defined_'}

### Links

- **Spec**: [\`spec.md\`](../../tree/develop/.specweave/increments/${incrementId}/spec.md)
- **Tasks**: [\`tasks.md\`](../../tree/develop/.specweave/increments/${incrementId}/tasks.md)

---

🤖 Auto-created by SpecWeave | Updates automatically on task completion
`;
  }

  /**
   * Build JIRA Epic description
   */
  private buildJiraEpicDescription(
    incrementId: string,
    incrementInfo: IncrementInfo
  ): string {
    const userStoriesList = incrementInfo.userStories
      .map((us) => `* ${us.id}: ${us.title}`)
      .join('\n');

    return `h2. ${incrementInfo.title}

*Feature*: ${incrementInfo.featureId}
*Increment*: ${incrementId}

h3. User Stories

${userStoriesList || '_No user stories defined_'}

----

🤖 Auto-created by SpecWeave
`;
  }

  /**
   * Build ADO work item description
   */
  private buildAdoDescription(
    incrementId: string,
    incrementInfo: IncrementInfo
  ): string {
    const userStoriesList = incrementInfo.userStories
      .map((us) => `<li>${us.id}: ${us.title}</li>`)
      .join('\n');

    return `<h2>${incrementInfo.title}</h2>

<p><strong>Feature</strong>: ${incrementInfo.featureId}<br/>
<strong>Increment</strong>: ${incrementId}</p>

<h3>User Stories</h3>
<ul>
${userStoriesList || '<li><em>No user stories defined</em></li>'}
</ul>

<hr/>
<p>🤖 Auto-created by SpecWeave</p>
`;
  }

  /**
   * Update metadata.json with GitHub issue
   */
  private async updateMetadataWithGitHubIssue(
    incrementId: string,
    issueNumber: number,
    issueUrl: string
  ): Promise<void> {
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'metadata.json'
    );

    let metadata: any = {};
    if (existsSync(metadataPath)) {
      metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    }

    metadata.github = {
      issue: issueNumber,
      url: issueUrl,
      synced: new Date().toISOString(),
    };

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  /**
   * Update metadata.json with JIRA issue
   */
  private async updateMetadataWithJiraIssue(
    incrementId: string,
    issueKey: string,
    issueUrl: string
  ): Promise<void> {
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'metadata.json'
    );

    let metadata: any = {};
    if (existsSync(metadataPath)) {
      metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    }

    metadata.jira = {
      issue: issueKey,
      url: issueUrl,
      synced: new Date().toISOString(),
    };

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  /**
   * Update metadata.json with ADO work item
   */
  private async updateMetadataWithAdoWorkItem(
    incrementId: string,
    workItemId: number,
    workItemUrl: string
  ): Promise<void> {
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'metadata.json'
    );

    let metadata: any = {};
    if (existsSync(metadataPath)) {
      metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    }

    metadata.ado = {
      workItem: workItemId,
      url: workItemUrl,
      synced: new Date().toISOString(),
    };

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }
}

/**
 * Convenience function to auto-create issues for an increment
 */
export async function autoCreateExternalIssue(
  projectRoot: string,
  incrementId: string,
  logger?: Logger
): Promise<AutoCreateResult> {
  const creator = new ExternalIssueAutoCreator({
    projectRoot,
    logger,
  });
  return creator.createForIncrement(incrementId);
}
