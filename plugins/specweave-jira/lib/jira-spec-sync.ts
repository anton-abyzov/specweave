/**
 * Jira Spec Sync
 *
 * CORRECT ARCHITECTURE:
 * - Syncs .specweave/docs/internal/specs/spec-*.md ↔ Jira Epics
 * - NOT increments ↔ Jira Issues (that was wrong!)
 *
 * Mapping:
 * - Spec → Jira Epic
 * - User Story → Jira Story (subtask of epic)
 * - Acceptance Criteria → Checklist in Story description
 *
 * @module jira-spec-sync
 */

import { SpecMetadataManager } from '../../../src/core/specs/spec-metadata-manager.js';
import { SpecParser } from '../../../src/core/specs/spec-parser.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  SpecContent,
  UserStory,
  SpecSyncResult,
  SpecSyncConflict
} from '../../../src/core/types/spec-metadata.js';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import { detectDeploymentType, getApiBaseUrl } from './jira-deployment-detector.js';
import { toDescription, AdfDocument } from './content-format-adapter.js';
import { getEpicLinkFieldForProject } from './jira-field-discovery.js';
import { searchAllIssues } from './jira-paginated-search.js';
import axios, { AxiosInstance } from 'axios';

export interface JiraEpic {
  id: string;
  key: string; // e.g., SPEC-1
  summary: string;
  description: string | AdfDocument;
  status: {
    name: string; // To Do, In Progress, Done
  };
  url: string;
}

export interface JiraStory {
  id: string;
  key: string; // e.g., SPEC-2
  summary: string;
  description: string;
  status: {
    name: string;
  };
  epicLink?: string; // Epic key
  labels: string[];
}

export interface JiraConfig {
  domain: string; // e.g., company.atlassian.net
  email: string;
  apiToken: string;
  projectKey: string; // e.g., SPEC
}

export class JiraSpecSync {
  private specManager: SpecMetadataManager;
  private client: AxiosInstance;
  private config: JiraConfig;

  constructor(config: JiraConfig, projectRoot: string = process.cwd(), projectId?: string) {
    this.specManager = new SpecMetadataManager(projectRoot, projectId);
    this.config = config;

    // Create Jira API client — baseURL set dynamically via init()
    this.client = axios.create({
      baseURL: getApiBaseUrl(config.domain),
      auth: {
        username: config.email,
        password: config.apiToken
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Initialize: detect deployment type and update client baseURL
   */
  async init(): Promise<void> {
    const deployment = await detectDeploymentType(this.config.domain, {
      email: this.config.email,
      apiToken: this.config.apiToken,
    });
    this.client.defaults.baseURL = deployment.baseUrl;
  }

  /**
   * Sync spec to Jira Epic (CREATE or UPDATE)
   */
  async syncSpecToJira(specId: string): Promise<SpecSyncResult> {
    console.log(`\n🔄 Syncing spec ${specId} to Jira Epic...`);

    try {
      // 1. Load spec
      const spec = await this.specManager.loadSpec(specId);
      if (!spec) {
        return {
          success: false,
          specId,
          provider: 'jira',
          error: `Spec ${specId} not found`
        };
      }

      // 2. Check if spec already linked to Jira Epic
      const existingLink = spec.metadata.externalLinks?.jira;

      let epic: JiraEpic;

      if (existingLink?.epicKey) {
        // UPDATE existing epic
        console.log(`   Found existing Jira Epic ${existingLink.epicKey}`);
        epic = await this.updateJiraEpic(existingLink.epicKey, spec);
      } else {
        // CREATE new epic
        console.log('   Creating new Jira Epic...');
        epic = await this.createJiraEpic(spec);

        // Link spec to epic
        await this.specManager.linkToExternal(specId, 'jira', {
          id: epic.key,
          url: epic.url,
          projectKey: this.config.projectKey,
          domain: this.config.domain
        });
      }

      // 3. Sync user stories as Jira Stories
      const changes = await this.syncUserStories(epic.key, spec);

      console.log('✅ Sync complete!');

      return {
        success: true,
        specId,
        provider: 'jira',
        externalId: epic.key,
        url: epic.url,
        changes
      };

    } catch (error: any) {
      const axiosData = error?.response?.data;
      const detail = axiosData ? JSON.stringify(axiosData) : '';
      console.error('❌ Error syncing to Jira:', error?.message || error, detail ? `\n   Response: ${detail}` : '');
      return {
        success: false,
        specId,
        provider: 'jira',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync FROM Jira Epic to spec (bidirectional)
   */
  async syncFromJira(specId: string): Promise<SpecSyncResult> {
    console.log(`\n🔄 Syncing FROM Jira to spec ${specId}...`);

    try {
      // 1. Load spec
      const spec = await this.specManager.loadSpec(specId);
      if (!spec) {
        return {
          success: false,
          specId,
          provider: 'jira',
          error: `Spec ${specId} not found`
        };
      }

      // 2. Get Jira Epic link
      const jiraLink = spec.metadata.externalLinks?.jira;
      if (!jiraLink?.epicKey) {
        return {
          success: false,
          specId,
          provider: 'jira',
          error: 'Spec not linked to Jira Epic'
        };
      }

      // 3. Fetch Jira Epic state
      const epic = await this.fetchJiraEpic(jiraLink.epicKey);

      // 4. Detect conflicts
      const conflicts = await this.detectConflicts(spec, epic);

      if (conflicts.length === 0) {
        console.log('✅ No conflicts - spec and Jira in sync');
        return {
          success: true,
          specId,
          provider: 'jira',
          externalId: epic.key,
          url: epic.url
        };
      }

      console.log(`⚠️  Detected ${conflicts.length} conflict(s)`);

      // 5. Write conflict report
      await this.writeConflictReport(specId, conflicts);

      // 6. Resolve conflicts using configurable strategy (default: manual)
      await this.resolveConflicts(spec, conflicts);

      console.log('✅ Sync FROM Jira complete!');

      return {
        success: true,
        specId,
        provider: 'jira',
        externalId: epic.key,
        url: epic.url,
        conflicts
      };

    } catch (error) {
      console.error('❌ Error syncing FROM Jira:', error);
      return {
        success: false,
        specId,
        provider: 'jira',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create new Jira Epic for spec
   */
  private async createJiraEpic(spec: SpecContent): Promise<JiraEpic> {
    const epicSummary = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    const epicDescription = toDescription(this.generateEpicDescription(spec), this.config.domain);

    // Determine issue type based on spec type (supports Bug for bug-type specs)
    const issueType = this.mapTypeToJira(spec.metadata.type, 'Epic');

    const payload: {
      fields: {
        project: { key: string };
        summary: string;
        description: any;
        issuetype: { name: string };
        labels: string[];
        priority?: { name: string };
      };
    } = {
      fields: {
        project: {
          key: this.config.projectKey
        },
        summary: epicSummary,
        description: epicDescription,
        issuetype: {
          name: issueType
        },
        labels: [`spec:${spec.metadata.id}`, `priority:${spec.metadata.priority}`],
        // Set native JIRA priority field (P0→Highest, P1→High, P2→Medium, P3→Low)
        priority: {
          name: this.mapPriorityToJira(spec.metadata.priority)
        }
      }
    };

    const response = await this.client.post('/issue', payload);
    const epicData = response.data;

    const epicKey = epicData.key;
    const epicUrl = `https://${this.config.domain}/browse/${epicKey}`;

    console.log(`   ✅ Created Jira Epic ${epicKey}: ${epicUrl}`);

    return {
      id: epicData.id,
      key: epicKey,
      summary: epicSummary,
      description: epicDescription,
      status: { name: 'To Do' },
      url: epicUrl
    };
  }

  /**
   * Update existing Jira Epic
   */
  private async updateJiraEpic(epicKey: string, spec: SpecContent): Promise<JiraEpic> {
    const epicSummary = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    const epicDescription = toDescription(this.generateEpicDescription(spec), this.config.domain);

    const payload = {
      fields: {
        summary: epicSummary,
        description: epicDescription
      }
    };

    await this.client.put(`/issue/${epicKey}`, payload);

    // Fetch updated epic
    const response = await this.client.get(`/issue/${epicKey}`);
    const epicData = response.data;

    console.log(`   ✅ Updated Jira Epic ${epicKey}`);

    return {
      id: epicData.id,
      key: epicKey,
      summary: epicData.fields.summary,
      description: epicData.fields.description,
      status: epicData.fields.status,
      url: `https://${this.config.domain}/browse/${epicKey}`
    };
  }

  /**
   * Sync user stories as Jira Stories
   */
  private async syncUserStories(
    epicKey: string,
    spec: SpecContent
  ): Promise<{ created: string[]; updated: string[]; deleted: string[] }> {
    const created: string[] = [];
    const updated: string[] = [];
    const deleted: string[] = [];

    if (!spec.metadata.userStories || spec.metadata.userStories.length === 0) {
      console.log('   ℹ️  No user stories to sync');
      return { created, updated, deleted };
    }

    console.log(`   Syncing ${spec.metadata.userStories.length} user stories...`);

    for (const us of spec.metadata.userStories) {
      // Create or update Jira Story for each user story
      const storySummary = `[${us.id}] ${us.title}`;
      const storyDescription = this.generateStoryDescription(us);

      // Check if story already exists (scoped to this spec to avoid US-ID collisions)
      const existingStory = await this.findStoryByTitle(us.id, spec.metadata.id);

      if (existingStory) {
        // UPDATE existing story (also set epicLink to fix orphaned stories)
        await this.updateStory(existingStory.key, {
          summary: storySummary,
          description: storyDescription,
          status: us.status === 'done' ? 'Done' : us.status === 'in-progress' ? 'In Progress' : 'To Do',
          epicLink: epicKey
        });

        updated.push(us.id);
        console.log(`   ✅ Updated ${us.id}`);
      } else {
        // CREATE new story
        const newStory = await this.createStory({
          summary: storySummary,
          description: storyDescription,
          epicLink: epicKey,
          labels: [`user-story`, `spec:${spec.metadata.id}`, `priority:${us.priority}`],
          priority: us.priority
        });

        created.push(us.id);
        console.log(`   ✅ Created ${us.id} → Story ${newStory.key}`);
      }
    }

    return { created, updated, deleted };
  }

  /**
   * Generate epic description from spec
   */
  private generateEpicDescription(spec: SpecContent): string {
    const progress = spec.metadata.progress;
    const progressText = progress
      ? `*Progress*: ${progress.percentComplete}% (${progress.completedUserStories}/${progress.totalUserStories} user stories)`
      : '*Progress*: N/A';

    return `
h1. ${spec.metadata.title}

*Spec ID*: ${spec.metadata.id}

*Priority*: ${spec.metadata.priority}

*Status*: ${spec.metadata.status}

${progressText}

----

${SpecParser.extractOverview(spec.markdown)}

----

h2. User Stories

${spec.metadata.userStories?.length || 0} user stories tracked in this epic.

----

Last updated: ${new Date().toISOString()}
`.trim();
  }

  /**
   * Generate story description from user story
   */
  private generateStoryDescription(us: UserStory): string {
    const acList = us.acceptanceCriteria
      .map(ac => `* ${ac.status === 'done' ? '(/)' : '(x)'} ${ac.description}`)
      .join('\n');

    return `
h2. User Story

${us.title}

h2. Acceptance Criteria

${acList}

----

*Priority*: ${us.priority}
*Status*: ${us.status}
`.trim();
  }

  /**
   * Detect conflicts between spec and Jira
   */
  private async detectConflicts(
    spec: SpecContent,
    epic: JiraEpic
  ): Promise<SpecSyncConflict[]> {
    const conflicts: SpecSyncConflict[] = [];

    // Compare epic summary
    const expectedSummary = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    if (epic.summary !== expectedSummary) {
      conflicts.push({
        type: 'metadata',
        field: 'title',
        localValue: spec.metadata.title,
        remoteValue: epic.summary,
        resolution: 'remote-wins',
        description: 'Epic summary differs from spec title'
      });
    }

    // TODO: Compare user stories and their statuses

    return conflicts;
  }

  /**
   * Resolve conflicts based on configurable strategy.
   *
   * Strategies:
   * - 'manual' (default): Halt sync, report conflicts to user, no auto-resolve
   * - 'remote-wins': Auto-resolve in favor of JIRA (remote)
   * - 'local-wins': Auto-resolve in favor of spec (local)
   * - 'report-only': Log conflicts, continue without resolving
   */
  private async resolveConflicts(
    spec: SpecContent,
    conflicts: SpecSyncConflict[],
    strategy: 'manual' | 'remote-wins' | 'local-wins' | 'report-only' = 'manual'
  ): Promise<void> {
    if (strategy === 'manual') {
      console.log(`   ⚠️  ${conflicts.length} conflict(s) require manual resolution.`);
      for (const conflict of conflicts) {
        console.log(`   - ${conflict.field}: local="${conflict.localValue}" vs remote="${conflict.remoteValue}"`);
      }
      console.log(`   Sync halted. Review conflicts and resolve manually.`);
      return;
    }

    if (strategy === 'report-only') {
      console.log(`   ℹ️  ${conflicts.length} conflict(s) detected (report-only mode):`);
      for (const conflict of conflicts) {
        console.log(`   - ${conflict.field}: local="${conflict.localValue}" vs remote="${conflict.remoteValue}"`);
      }
      return;
    }

    for (const conflict of conflicts) {
      if (strategy === 'remote-wins') {
        console.log(`   🔄 Resolving: ${conflict.description} (Jira wins)`);
        if (conflict.field === 'title') {
          await this.specManager.saveMetadata(spec.metadata.id, {
            title: conflict.remoteValue
          });
        }
      } else if (strategy === 'local-wins') {
        console.log(`   🔄 Resolving: ${conflict.description} (local wins — no remote update)`);
        // Local wins: keep spec as-is, no action needed
      }
    }
  }

  /**
   * Write conflict report JSON file for detected conflicts.
   */
  private async writeConflictReport(
    specId: string,
    conflicts: SpecSyncConflict[]
  ): Promise<void> {
    try {
      const report = {
        specId,
        provider: 'jira',
        timestamp: new Date().toISOString(),
        conflicts: conflicts.map((c) => ({
          field: c.field,
          localValue: c.localValue,
          remoteValue: c.remoteValue,
          description: c.description,
        })),
      };

      const reportsDir = path.join(
        (this.specManager as any).projectRoot || process.cwd(),
        '.specweave',
        'reports'
      );
      await fs.mkdir(reportsDir, { recursive: true });
      const reportPath = path.join(reportsDir, 'conflict-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`   📄 Conflict report written to ${reportPath}`);
    } catch (err) {
      console.warn('   ⚠️  Failed to write conflict report:', (err as Error).message);
    }
  }

  /**
   * Fetch Jira Epic details
   */
  private async fetchJiraEpic(epicKey: string): Promise<JiraEpic> {
    const response = await this.client.get(`/issue/${epicKey}`);
    const epicData = response.data;

    return {
      id: epicData.id,
      key: epicKey,
      summary: epicData.fields.summary,
      description: epicData.fields.description,
      status: epicData.fields.status,
      url: `https://${this.config.domain}/browse/${epicKey}`
    };
  }

  /**
   * Find story by title pattern scoped to a specific spec (via label).
   * US IDs like "US-001" are reused across features, so we must scope to
   * the spec label (e.g. "spec:FS-526") to avoid false matches.
   */
  private async findStoryByTitle(usId: string, specId?: string): Promise<JiraStory | null> {
    // Scope to spec label when available — prevents matching same US-ID from another feature
    const specFilter = specId ? ` AND labels = "spec:${specId}"` : '';
    // NOTE: POST /search/jql doesn't support != operator — use "not in (Epic)" instead.
    const jql = `project = ${this.config.projectKey} AND summary ~ "[${usId}]"${specFilter} AND issuetype not in (Epic)`;

    const issues = await searchAllIssues(this.client, {
      jql,
      fields: 'summary,description,status,labels',
      maxResults: 1,
    });

    return issues.length > 0 ? {
      id: issues[0].id,
      key: issues[0].key,
      summary: issues[0].fields.summary,
      description: issues[0].fields.description,
      status: issues[0].fields.status,
      labels: issues[0].fields.labels || []
    } : null;
  }

  /**
   * Create Jira Story
   */
  private async createStory(story: {
    summary: string;
    description: string;
    epicLink: string;
    labels: string[];
    priority?: string;
    type?: string;
  }): Promise<JiraStory> {
    // Determine issue type with fallback for projects that lack "Story"
    const preferredType = this.mapTypeToJira(story.type, 'Story');
    const issueType = await this.resolveIssueType(preferredType);

    // Discover epic link field dynamically based on project style
    const { field: epicField, style } = await getEpicLinkFieldForProject(
      this.config.domain,
      this.config.projectKey,
      { email: this.config.email, apiToken: this.config.apiToken }
    );

    const fields: any = {
      project: {
        key: this.config.projectKey
      },
      summary: story.summary,
      description: toDescription(story.description, this.config.domain),
      issuetype: {
        name: issueType
      },
      labels: story.labels,
      priority: {
        name: this.mapPriorityToJira(story.priority)
      }
    };

    // Link to epic using the correct field for project style
    if (style === 'next-gen') {
      fields.parent = { key: story.epicLink };
    } else {
      fields[epicField] = story.epicLink;
    }

    const payload = { fields };

    const response = await this.client.post('/issue', payload);
    const storyData = response.data;

    return {
      id: storyData.id,
      key: storyData.key,
      summary: story.summary,
      description: story.description,
      status: { name: 'To Do' },
      labels: story.labels
    };
  }

  /**
   * Update Jira Story
   */
  private async updateStory(
    storyKey: string,
    updates: { summary?: string; description?: string; status?: string; epicLink?: string }
  ): Promise<void> {
    const payload: any = {
      fields: {}
    };

    if (updates.summary) {
      payload.fields.summary = updates.summary;
    }

    if (updates.description) {
      payload.fields.description = toDescription(updates.description, this.config.domain);
    }

    if (updates.epicLink) {
      const { field: epicField, style } = await getEpicLinkFieldForProject(
        this.config.domain,
        this.config.projectKey,
        { email: this.config.email, apiToken: this.config.apiToken }
      );
      if (style === 'next-gen') {
        payload.fields.parent = { key: updates.epicLink };
      } else {
        payload.fields[epicField] = updates.epicLink;
      }
    }

    await this.client.put(`/issue/${storyKey}`, payload);

    // Handle status transition if needed
    if (updates.status) {
      await this.transitionIssue(storyKey, updates.status);
    }
  }

  /**
   * Transition issue to new status
   */
  private async transitionIssue(issueKey: string, targetStatus: string): Promise<void> {
    // Get available transitions
    const transitionsResponse = await this.client.get(`/issue/${issueKey}/transitions`);
    const transitions = transitionsResponse.data.transitions;

    // Find transition matching target status
    const transition = transitions.find(
      (t: any) => t.to.name.toLowerCase() === targetStatus.toLowerCase()
    );

    if (!transition) {
      console.warn(`   ⚠️  Cannot transition ${issueKey} to ${targetStatus} (no valid transition)`);
      return;
    }

    // Execute transition
    await this.client.post(`/issue/${issueKey}/transitions`, {
      transition: {
        id: transition.id
      }
    });
  }

  /**
   * Resolve the actual issue type name available in this project.
   * Falls back through preferred → alternatives if the preferred type doesn't exist.
   */
  private async resolveIssueType(preferred: string): Promise<string> {
    try {
      const response = await this.client.get(
        `/issue/createmeta/${this.config.projectKey}/issuetypes`
      );
      const types: Array<{ name: string; subtask: boolean }> = response.data.issueTypes || [];
      const available = types.filter(t => !t.subtask).map(t => t.name);

      if (available.includes(preferred)) return preferred;

      // Fallback chain: Story → Task → New Feature → first available
      const fallbacks = ['Story', 'Task', 'New Feature', 'Improvement'];
      for (const fb of fallbacks) {
        if (available.includes(fb)) {
          console.log(`   ℹ️  Issue type "${preferred}" not available, using "${fb}"`);
          return fb;
        }
      }

      if (available.length > 0) {
        console.log(`   ℹ️  Issue type "${preferred}" not available, using "${available[0]}"`);
        return available[0];
      }
    } catch {
      // If createmeta fails, just use preferred and let the create call handle it
    }
    return preferred;
  }

  /**
   * Map SpecWeave priority to JIRA priority name
   *
   * JIRA standard priority names: Highest, High, Medium, Low, Lowest
   */
  private mapPriorityToJira(priority?: string): string {
    if (!priority) return 'Medium';

    const map: Record<string, string> = {
      P0: 'Highest',
      P1: 'High',
      P2: 'Medium',
      P3: 'Low',
      p0: 'Highest',
      p1: 'High',
      p2: 'Medium',
      p3: 'Low'
    };

    return map[priority] || 'Medium';
  }

  /**
   * Map SpecWeave type to JIRA issue type
   *
   * Supports: Epic, Story, Bug, Task
   */
  private mapTypeToJira(type?: string, defaultType: string = 'Story'): string {
    if (!type) return defaultType;

    const normalizedType = type.toLowerCase();

    const map: Record<string, string> = {
      bug: 'Bug',
      feature: 'Epic',
      epic: 'Epic',
      story: 'Story',
      task: 'Task',
      enhancement: 'Story'
    };

    return map[normalizedType] || defaultType;
  }
}
