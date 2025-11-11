/**
 * JIRA Multi-Project Sync with Intelligent Mapping
 *
 * Automatically maps user stories to JIRA projects based on content analysis:
 * - FE user stories → JIRA Project FE
 * - BE user stories → JIRA Project BE
 * - MOBILE user stories → JIRA Project MOBILE
 *
 * Supports hierarchical issue types:
 * - Epic (> 13 story points): Large feature area
 * - Story (3-13 story points): Standard user story
 * - Task (1-2 story points): Small implementation task
 * - Subtask (< 1 story point): Granular work item
 *
 * @module jira-multi-project-sync
 */

import { JiraClient, JiraIssue } from '../../../src/integrations/jira/jira-client.js';
import {
  UserStory,
  getPrimaryProject,
  suggestJiraItemType,
  mapUserStoryToProjects
} from '../../../src/utils/project-mapper.js';
import { parseSpecFile } from '../../../src/utils/spec-splitter.js';

export interface JiraMultiProjectConfig {
  domain: string;
  email: string;
  apiToken: string;

  // Simple: List of JIRA projects
  projects: string[];  // ['FE', 'BE', 'MOBILE']

  // Item type mapping (optional)
  itemTypeMapping?: {
    epic: string;    // Default: 'Epic'
    story: string;   // Default: 'Story'
    task: string;    // Default: 'Task'
    subtask: string; // Default: 'Sub-task'
  };

  // Settings
  intelligentMapping?: boolean;  // Default: true (auto-classify user stories)
  autoCreateEpics?: boolean;     // Default: true (create epic per project)
}

export interface JiraSyncResult {
  project: string;
  issueKey: string;
  issueType: string;
  summary: string;
  url: string;
  action: 'created' | 'updated' | 'skipped';
  confidence?: number;  // Classification confidence (0.0-1.0)
}

/**
 * JIRA Multi-Project Sync Client
 */
export class JiraMultiProjectSync {
  private client: JiraClient;
  private config: JiraMultiProjectConfig;

  constructor(config: JiraMultiProjectConfig) {
    this.config = config;
    this.client = new JiraClient({
      domain: config.domain,
      email: config.email,
      apiToken: config.apiToken
    });
  }

  /**
   * Sync spec to JIRA projects with intelligent mapping
   *
   * @param specPath Path to spec file
   * @returns Array of sync results
   */
  async syncSpec(specPath: string): Promise<JiraSyncResult[]> {
    const results: JiraSyncResult[] = [];

    // Parse spec
    const parsedSpec = await parseSpecFile(specPath);

    // Step 1: Create epic per project (if enabled)
    const epicsByProject = new Map<string, string>();  // projectId → epicKey

    if (this.config.autoCreateEpics !== false) {
      for (const project of this.config.projects) {
        const epicResult = await this.createEpicForProject(parsedSpec, project);
        epicsByProject.set(project, epicResult.issueKey);
        results.push(epicResult);
      }
    }

    // Step 2: Classify user stories by project
    const projectStories = new Map<string, Array<{ story: UserStory; confidence: number }>>();

    for (const userStory of parsedSpec.userStories) {
      if (this.config.intelligentMapping !== false) {
        // Intelligent mapping (default)
        const mappings = mapUserStoryToProjects(userStory);

        if (mappings.length > 0 && mappings[0].confidence >= 0.3) {
          const primary = mappings[0];
          const existing = projectStories.get(primary.projectId) || [];
          existing.push({ story: userStory, confidence: primary.confidence });
          projectStories.set(primary.projectId, existing);
        } else {
          // No confident match - assign to first project or skip
          console.warn(`⚠️  Low confidence for ${userStory.id} (${(mappings[0]?.confidence || 0) * 100}%) - assigning to ${this.config.projects[0]}`);
          const fallback = this.config.projects[0];
          const existing = projectStories.get(fallback) || [];
          existing.push({ story: userStory, confidence: mappings[0]?.confidence || 0 });
          projectStories.set(fallback, existing);
        }
      } else {
        // Manual mapping (user specified project in frontmatter)
        const projectHint = this.extractProjectHint(userStory);

        if (projectHint && this.config.projects.includes(projectHint)) {
          const existing = projectStories.get(projectHint) || [];
          existing.push({ story: userStory, confidence: 1.0 });
          projectStories.set(projectHint, existing);
        } else {
          // No hint - assign to first project
          const fallback = this.config.projects[0];
          const existing = projectStories.get(fallback) || [];
          existing.push({ story: userStory, confidence: 0 });
          projectStories.set(fallback, existing);
        }
      }
    }

    // Step 3: Create issues in each project
    for (const [projectId, stories] of projectStories.entries()) {
      const epicKey = epicsByProject.get(projectId);

      for (const { story, confidence } of stories) {
        const result = await this.createIssueForUserStory(projectId, story, epicKey, confidence);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Create epic for project
   */
  private async createEpicForProject(parsedSpec: any, projectId: string): Promise<JiraSyncResult> {
    const summary = `${parsedSpec.metadata.title} - ${projectId}`;

    const description = `h2. ${projectId} Implementation

*Status*: ${parsedSpec.metadata.status}
*Priority*: ${parsedSpec.metadata.priority}
*Estimated Effort*: ${parsedSpec.metadata.estimatedEffort || parsedSpec.metadata.estimated_effort}

h3. Executive Summary

${parsedSpec.executiveSummary}

h3. Scope (${projectId})

This epic covers all ${projectId}-related user stories for "${parsedSpec.metadata.title}".

User stories will be added as child issues.

---

🤖 Auto-generated by SpecWeave
`;

    const issue = await this.client.createIssue({
      project: { key: projectId },
      summary,
      description,
      issuetype: { name: this.config.itemTypeMapping?.epic || 'Epic' }
    });

    return {
      project: projectId,
      issueKey: issue.key,
      issueType: 'Epic',
      summary,
      url: `https://${this.config.domain}/browse/${issue.key}`,
      action: 'created'
    };
  }

  /**
   * Create issue for user story
   */
  private async createIssueForUserStory(
    projectId: string,
    userStory: UserStory,
    epicKey?: string,
    confidence?: number
  ): Promise<JiraSyncResult> {
    const summary = `${userStory.id}: ${userStory.title}`;

    // Determine issue type based on story points
    const itemType = suggestJiraItemType(userStory);

    const description = `h3. ${userStory.title}

${userStory.description}

h4. Acceptance Criteria

${userStory.acceptanceCriteria.map((ac, i) => `* ${ac}`).join('\n')}

${userStory.technicalContext ? `\nh4. Technical Context\n\n${userStory.technicalContext}\n` : ''}

${confidence !== undefined ? `\n_Classification confidence: ${(confidence * 100).toFixed(0)}%_\n` : ''}

🤖 Auto-generated by SpecWeave
`;

    const issueData: any = {
      project: { key: projectId },
      summary,
      description,
      issuetype: { name: this.getIssueTypeName(itemType) }
    };

    // Link to epic if provided
    if (epicKey) {
      issueData.parent = { key: epicKey };
    }

    const issue = await this.client.createIssue(issueData);

    return {
      project: projectId,
      issueKey: issue.key,
      issueType: itemType,
      summary,
      url: `https://${this.config.domain}/browse/${issue.key}`,
      action: 'created',
      confidence
    };
  }

  /**
   * Get JIRA issue type name from suggested type
   */
  private getIssueTypeName(itemType: 'Epic' | 'Story' | 'Task' | 'Subtask'): string {
    const mapping = this.config.itemTypeMapping || {};

    switch (itemType) {
      case 'Epic':
        return mapping.epic || 'Epic';
      case 'Story':
        return mapping.story || 'Story';
      case 'Task':
        return mapping.task || 'Task';
      case 'Subtask':
        return mapping.subtask || 'Sub-task';
      default:
        return 'Story';
    }
  }

  /**
   * Extract project hint from user story (manual override)
   *
   * Looks for hints like:
   * - Title: "[FE] Login UI"
   * - Description: "Project: FE"
   * - Technical context: "Frontend: React"
   */
  private extractProjectHint(userStory: UserStory): string | undefined {
    // Check title for [PROJECT] prefix
    const titleMatch = userStory.title.match(/^\[([A-Z]+)\]/);
    if (titleMatch) {
      return titleMatch[1];
    }

    // Check description for "Project: XXX"
    const descMatch = userStory.description.match(/Project:\s*([A-Z]+)/i);
    if (descMatch) {
      return descMatch[1].toUpperCase();
    }

    return undefined;
  }
}

/**
 * Format JIRA sync results for display
 */
export function formatJiraSyncResults(results: JiraSyncResult[]): string {
  const lines: string[] = [];

  lines.push('📊 JIRA Multi-Project Sync Results:\n');

  const byProject = new Map<string, JiraSyncResult[]>();

  for (const result of results) {
    const existing = byProject.get(result.project) || [];
    existing.push(result);
    byProject.set(result.project, existing);
  }

  for (const [project, projectResults] of byProject.entries()) {
    lines.push(`\n**JIRA Project ${project}**:`);

    for (const result of projectResults) {
      const icon = result.action === 'created' ? '✅' : result.action === 'updated' ? '🔄' : '⏭️';
      const confidence = result.confidence !== undefined ? ` (${(result.confidence * 100).toFixed(0)}% confidence)` : '';
      lines.push(`  ${icon} ${result.issueKey} [${result.issueType}]: ${result.summary}${confidence}`);
      lines.push(`     ${result.url}`);
    }
  }

  lines.push(`\n✅ Total: ${results.length} issues synced\n`);

  // Show classification summary
  const epicCount = results.filter(r => r.issueType === 'Epic').length;
  const storyCount = results.filter(r => r.issueType === 'Story').length;
  const taskCount = results.filter(r => r.issueType === 'Task').length;
  const subtaskCount = results.filter(r => r.issueType === 'Subtask').length;

  lines.push('📈 Item Type Distribution:');
  if (epicCount > 0) lines.push(`  - Epics: ${epicCount}`);
  if (storyCount > 0) lines.push(`  - Stories: ${storyCount}`);
  if (taskCount > 0) lines.push(`  - Tasks: ${taskCount}`);
  if (subtaskCount > 0) lines.push(`  - Subtasks: ${subtaskCount}`);

  return lines.join('\n');
}

/**
 * Validate JIRA projects exist
 *
 * @param client JIRA client
 * @param projectKeys Array of project keys to validate
 * @returns Validation results (missing projects)
 */
export async function validateJiraProjects(
  client: JiraClient,
  projectKeys: string[]
): Promise<string[]> {
  const missing: string[] = [];

  for (const key of projectKeys) {
    try {
      await client.getProject(key);
    } catch (error) {
      missing.push(key);
    }
  }

  return missing;
}
