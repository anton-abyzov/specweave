/**
 * Azure DevOps Multi-Project Sync
 *
 * Supports two patterns:
 * 1. **Multiple Projects**: Separate ADO projects for each team (FE, BE, MOBILE)
 * 2. **Single Project + Area Paths**: One ADO project with area paths per team
 *
 * Hierarchical work item types:
 * - Epic (> 13 story points): Large feature area
 * - Feature (8-13 story points): Medium feature
 * - User Story (3-7 story points): Standard user story
 * - Task (1-2 story points): Small implementation task
 *
 * @module ado-multi-project-sync
 */

import axios, { AxiosInstance } from 'axios';
import {
  UserStory,
  getPrimaryProject,
  suggestJiraItemType,
  mapUserStoryToProjects
} from '../../../src/utils/project-mapper.js';
import { parseSpecFile } from '../../../src/utils/spec-splitter.js';

export interface AdoMultiProjectConfig {
  organization: string;
  pat: string;  // Personal Access Token

  // Pattern 1: Multiple projects (simple)
  projects?: string[];  // ['FE-Project', 'BE-Project', 'MOBILE-Project']

  // Pattern 2: Single project + area paths (advanced)
  project?: string;  // 'Shared-Project'
  areaPaths?: string[];  // ['FE', 'BE', 'MOBILE']

  // Work item type mapping (optional)
  workItemTypes?: {
    epic: string;    // Default: 'Epic'
    feature: string; // Default: 'Feature'
    story: string;   // Default: 'User Story'
    task: string;    // Default: 'Task'
  };

  // Settings
  intelligentMapping?: boolean;  // Default: true (auto-classify user stories)
  autoCreateEpics?: boolean;     // Default: true (create epic per project)
}

export interface AdoWorkItem {
  id: number;
  rev: number;
  fields: Record<string, any>;
  url: string;
}

export interface AdoSyncResult {
  project: string;
  workItemId: number;
  workItemType: string;
  title: string;
  url: string;
  action: 'created' | 'updated' | 'skipped';
  confidence?: number;  // Classification confidence (0.0-1.0)
}

/**
 * Azure DevOps Multi-Project Sync Client
 */
export class AdoMultiProjectSync {
  private client: AxiosInstance;
  private config: AdoMultiProjectConfig;

  constructor(config: AdoMultiProjectConfig) {
    this.config = config;

    // Create axios instance with ADO authentication
    this.client = axios.create({
      baseURL: `https://dev.azure.com/${config.organization}`,
      headers: {
        'Content-Type': 'application/json-patch+json',
        'Authorization': `Basic ${Buffer.from(':' + config.pat).toString('base64')}`
      }
    });
  }

  /**
   * Sync spec to ADO projects with intelligent mapping
   *
   * @param specPath Path to spec file
   * @returns Array of sync results
   */
  async syncSpec(specPath: string): Promise<AdoSyncResult[]> {
    const results: AdoSyncResult[] = [];

    // Parse spec
    const parsedSpec = await parseSpecFile(specPath);

    // Determine sync pattern
    const isAreaPathBased = !!this.config.project && !!this.config.areaPaths;

    if (isAreaPathBased) {
      // Pattern 2: Single project + area paths
      results.push(...await this.syncAreaPathBased(parsedSpec));
    } else if (this.config.projects) {
      // Pattern 1: Multiple projects
      results.push(...await this.syncMultipleProjects(parsedSpec));
    } else {
      throw new Error('Invalid config: Must specify projects[] or project+areaPaths[]');
    }

    return results;
  }

  /**
   * Pattern 1: Sync to multiple ADO projects (simple)
   *
   * Each team → separate ADO project
   * - FE user stories → FE-Project
   * - BE user stories → BE-Project
   * - MOBILE user stories → MOBILE-Project
   */
  private async syncMultipleProjects(parsedSpec: any): Promise<AdoSyncResult[]> {
    const results: AdoSyncResult[] = [];

    // Step 1: Create epic per project (if enabled)
    const epicsByProject = new Map<string, number>();  // projectName → epicId

    if (this.config.autoCreateEpics !== false) {
      for (const projectName of this.config.projects!) {
        const epicResult = await this.createEpicForProject(parsedSpec, projectName);
        epicsByProject.set(projectName, epicResult.workItemId);
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
          const projectName = this.findProjectForId(primary.projectId);

          if (projectName) {
            const existing = projectStories.get(projectName) || [];
            existing.push({ story: userStory, confidence: primary.confidence });
            projectStories.set(projectName, existing);
          }
        } else {
          // No confident match - assign to first project or skip
          console.warn(`⚠️  Low confidence for ${userStory.id} (${(mappings[0]?.confidence || 0) * 100}%) - assigning to ${this.config.projects![0]}`);
          const fallback = this.config.projects![0];
          const existing = projectStories.get(fallback) || [];
          existing.push({ story: userStory, confidence: mappings[0]?.confidence || 0 });
          projectStories.set(fallback, existing);
        }
      }
    }

    // Step 3: Create work items in each project
    for (const [projectName, stories] of projectStories.entries()) {
      const epicId = epicsByProject.get(projectName);

      for (const { story, confidence } of stories) {
        const result = await this.createWorkItemForUserStory(projectName, story, epicId, confidence);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Pattern 2: Sync to single project with area paths (advanced)
   *
   * - Single ADO project with area paths for teams
   * - Epic-level: Root area path
   * - Story-level: Team-specific area paths
   *
   * Example:
   * ADO Project: Shared-Project
   *   Epic: User Authentication (Root area path)
   *     User Story: Login UI (Area Path: Shared-Project\FE)
   *     User Story: Auth API (Area Path: Shared-Project\BE)
   *     User Story: Mobile Auth (Area Path: Shared-Project\MOBILE)
   */
  private async syncAreaPathBased(parsedSpec: any): Promise<AdoSyncResult[]> {
    const results: AdoSyncResult[] = [];

    if (!this.config.project || !this.config.areaPaths) {
      throw new Error('Area path mode requires project and areaPaths');
    }

    // Step 1: Create epic in root area path
    const epicResult = await this.createEpicInRootArea(parsedSpec);
    results.push(epicResult);

    // Step 2: Classify user stories by area path
    const areaPathStories = new Map<string, UserStory[]>();

    for (const userStory of parsedSpec.userStories) {
      const primaryProject = getPrimaryProject(userStory);

      if (primaryProject) {
        const areaPath = this.findAreaPathForProjectId(primaryProject.projectId);

        if (areaPath) {
          const existing = areaPathStories.get(areaPath) || [];
          existing.push(userStory);
          areaPathStories.set(areaPath, existing);
        }
      }
    }

    // Step 3: Create work items in respective area paths
    for (const [areaPath, stories] of areaPathStories.entries()) {
      for (const story of stories) {
        const result = await this.createWorkItemInAreaPath(areaPath, story, epicResult.workItemId);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Create epic for project (Pattern 1: Multiple Projects)
   */
  private async createEpicForProject(parsedSpec: any, projectName: string): Promise<AdoSyncResult> {
    const title = `${parsedSpec.metadata.title} - ${projectName}`;

    const description = `<h2>${projectName} Implementation</h2>

<strong>Status</strong>: ${parsedSpec.metadata.status}<br/>
<strong>Priority</strong>: ${parsedSpec.metadata.priority}<br/>
<strong>Estimated Effort</strong>: ${parsedSpec.metadata.estimatedEffort || parsedSpec.metadata.estimated_effort}

<h3>Executive Summary</h3>

${parsedSpec.executiveSummary}

<h3>Scope (${projectName})</h3>

This epic covers all ${projectName}-related user stories for "${parsedSpec.metadata.title}".

User stories will be added as child work items.

---

🤖 Auto-generated by SpecWeave
`;

    const workItem = await this.createWorkItem(projectName, this.config.workItemTypes?.epic || 'Epic', {
      'System.Title': title,
      'System.Description': description,
      'System.State': 'New'
    });

    return {
      project: projectName,
      workItemId: workItem.id,
      workItemType: 'Epic',
      title,
      url: workItem.url,
      action: 'created'
    };
  }

  /**
   * Create epic in root area path (Pattern 2: Area Paths)
   */
  private async createEpicInRootArea(parsedSpec: any): Promise<AdoSyncResult> {
    const title = parsedSpec.metadata.title;

    const description = `<h2>${parsedSpec.metadata.title}</h2>

<strong>Status</strong>: ${parsedSpec.metadata.status}<br/>
<strong>Priority</strong>: ${parsedSpec.metadata.priority}<br/>
<strong>Estimated Effort</strong>: ${parsedSpec.metadata.estimatedEffort || parsedSpec.metadata.estimated_effort}

<h3>Executive Summary</h3>

${parsedSpec.executiveSummary}

<h3>User Stories (${parsedSpec.userStories.length} total)</h3>

<ul>
${parsedSpec.userStories.map((s: UserStory, i: number) => `<li>${i + 1}. ${s.id}: ${s.title}</li>`).join('\n')}
</ul>

---

🤖 Auto-generated by SpecWeave
`;

    const workItem = await this.createWorkItem(this.config.project!, this.config.workItemTypes?.epic || 'Epic', {
      'System.Title': title,
      'System.Description': description,
      'System.AreaPath': this.config.project!,  // Root area path
      'System.State': 'New'
    });

    return {
      project: this.config.project!,
      workItemId: workItem.id,
      workItemType: 'Epic',
      title,
      url: workItem.url,
      action: 'created'
    };
  }

  /**
   * Create work item for user story (Pattern 1: Multiple Projects)
   */
  private async createWorkItemForUserStory(
    projectName: string,
    userStory: UserStory,
    epicId?: number,
    confidence?: number
  ): Promise<AdoSyncResult> {
    const title = `${userStory.id}: ${userStory.title}`;

    // Determine work item type based on story points
    const itemType = this.mapItemTypeToAdo(suggestJiraItemType(userStory));

    const description = `<h3>${userStory.title}</h3>

${userStory.description}

<h4>Acceptance Criteria</h4>

<ul>
${userStory.acceptanceCriteria.map((ac, i) => `<li>${ac}</li>`).join('\n')}
</ul>

${userStory.technicalContext ? `<h4>Technical Context</h4>\n\n${userStory.technicalContext}\n` : ''}

${confidence !== undefined ? `<p><em>Classification confidence: ${(confidence * 100).toFixed(0)}%</em></p>\n` : ''}

<p>🤖 Auto-generated by SpecWeave</p>
`;

    const fields: Record<string, any> = {
      'System.Title': title,
      'System.Description': description,
      'System.State': 'New'
    };

    const workItem = await this.createWorkItem(projectName, itemType, fields);

    // Link to epic if provided
    if (epicId) {
      await this.linkWorkItems(workItem.id, epicId, 'System.LinkTypes.Hierarchy-Reverse');
    }

    return {
      project: projectName,
      workItemId: workItem.id,
      workItemType: itemType,
      title,
      url: workItem.url,
      action: 'created',
      confidence
    };
  }

  /**
   * Create work item in area path (Pattern 2: Area Paths)
   */
  private async createWorkItemInAreaPath(
    areaPath: string,
    userStory: UserStory,
    epicId?: number
  ): Promise<AdoSyncResult> {
    const title = `${userStory.id}: ${userStory.title}`;

    // Determine work item type based on story points
    const itemType = this.mapItemTypeToAdo(suggestJiraItemType(userStory));

    const description = `<h3>${userStory.title}</h3>

${userStory.description}

<h4>Acceptance Criteria</h4>

<ul>
${userStory.acceptanceCriteria.map((ac, i) => `<li>${ac}</li>`).join('\n')}
</ul>

${userStory.technicalContext ? `<h4>Technical Context</h4>\n\n${userStory.technicalContext}\n` : ''}

<p>🤖 Auto-generated by SpecWeave</p>
`;

    const fields: Record<string, any> = {
      'System.Title': title,
      'System.Description': description,
      'System.AreaPath': `${this.config.project}\\${areaPath}`,  // Team-specific area path
      'System.State': 'New'
    };

    const workItem = await this.createWorkItem(this.config.project!, itemType, fields);

    // Link to epic if provided
    if (epicId) {
      await this.linkWorkItems(workItem.id, epicId, 'System.LinkTypes.Hierarchy-Reverse');
    }

    return {
      project: this.config.project!,
      workItemId: workItem.id,
      workItemType: itemType,
      title,
      url: workItem.url,
      action: 'created'
    };
  }

  /**
   * Create work item via ADO REST API
   */
  private async createWorkItem(
    project: string,
    workItemType: string,
    fields: Record<string, any>
  ): Promise<AdoWorkItem> {
    // Build JSON patch document
    const patchDocument = Object.entries(fields).map(([key, value]) => ({
      op: 'add',
      path: `/fields/${key}`,
      value
    }));

    const response = await this.client.post(
      `/${project}/_apis/wit/workitems/$${workItemType}?api-version=7.0`,
      patchDocument
    );

    return response.data;
  }

  /**
   * Link work items (parent-child relationship)
   */
  private async linkWorkItems(
    sourceId: number,
    targetId: number,
    linkType: string
  ): Promise<void> {
    const patchDocument = [
      {
        op: 'add',
        path: '/relations/-',
        value: {
          rel: linkType,
          url: `https://dev.azure.com/${this.config.organization}/_apis/wit/workItems/${targetId}`
        }
      }
    ];

    await this.client.patch(
      `/_apis/wit/workitems/${sourceId}?api-version=7.0`,
      patchDocument
    );
  }

  /**
   * Map Jira-style item type to ADO work item type
   */
  private mapItemTypeToAdo(itemType: 'Epic' | 'Story' | 'Task' | 'Subtask'): string {
    const mapping = this.config.workItemTypes || {};

    switch (itemType) {
      case 'Epic':
        return mapping.epic || 'Epic';
      case 'Story':
        return mapping.story || 'User Story';
      case 'Task':
        return mapping.task || 'Task';
      case 'Subtask':
        return mapping.task || 'Task';  // ADO doesn't have subtasks, use Task
      default:
        return 'User Story';
    }
  }

  /**
   * Find ADO project name for project ID
   *
   * Maps project IDs to ADO project names:
   * - FE → FE-Project
   * - BE → BE-Project
   * - MOBILE → MOBILE-Project
   */
  private findProjectForId(projectId: string): string | undefined {
    if (!this.config.projects) return undefined;

    // Try exact match first
    let match = this.config.projects.find(project => project.toLowerCase().includes(projectId.toLowerCase()));

    if (!match) {
      // Try fuzzy match (FE → frontend, BE → backend, MOBILE → mobile)
      const fuzzyMap: Record<string, string[]> = {
        FE: ['frontend', 'web', 'ui', 'client', 'fe'],
        BE: ['backend', 'api', 'server', 'be'],
        MOBILE: ['mobile', 'app', 'ios', 'android'],
        INFRA: ['infra', 'infrastructure', 'devops', 'platform']
      };

      const keywords = fuzzyMap[projectId] || [];

      match = this.config.projects.find(project =>
        keywords.some(keyword => project.toLowerCase().includes(keyword))
      );
    }

    return match;
  }

  /**
   * Find area path for project ID
   *
   * Maps project IDs to area paths:
   * - FE → FE
   * - BE → BE
   * - MOBILE → MOBILE
   */
  private findAreaPathForProjectId(projectId: string): string | undefined {
    if (!this.config.areaPaths) return undefined;

    // Try exact match first
    let match = this.config.areaPaths.find(areaPath => areaPath.toLowerCase() === projectId.toLowerCase());

    if (!match) {
      // Try fuzzy match
      const fuzzyMap: Record<string, string[]> = {
        FE: ['frontend', 'web', 'ui', 'client', 'fe'],
        BE: ['backend', 'api', 'server', 'be'],
        MOBILE: ['mobile', 'app', 'ios', 'android'],
        INFRA: ['infra', 'infrastructure', 'devops', 'platform']
      };

      const keywords = fuzzyMap[projectId] || [];

      match = this.config.areaPaths.find(areaPath =>
        keywords.some(keyword => areaPath.toLowerCase().includes(keyword))
      );
    }

    return match;
  }
}

/**
 * Format ADO sync results for display
 */
export function formatAdoSyncResults(results: AdoSyncResult[]): string {
  const lines: string[] = [];

  lines.push('📊 Azure DevOps Multi-Project Sync Results:\n');

  const byProject = new Map<string, AdoSyncResult[]>();

  for (const result of results) {
    const existing = byProject.get(result.project) || [];
    existing.push(result);
    byProject.set(result.project, existing);
  }

  for (const [project, projectResults] of byProject.entries()) {
    lines.push(`\n**ADO Project ${project}**:`);

    for (const result of projectResults) {
      const icon = result.action === 'created' ? '✅' : result.action === 'updated' ? '🔄' : '⏭️';
      const confidence = result.confidence !== undefined ? ` (${(result.confidence * 100).toFixed(0)}% confidence)` : '';
      lines.push(`  ${icon} #${result.workItemId} [${result.workItemType}]: ${result.title}${confidence}`);
      lines.push(`     ${result.url}`);
    }
  }

  lines.push(`\n✅ Total: ${results.length} work items synced\n`);

  // Show work item type distribution
  const epicCount = results.filter(r => r.workItemType === 'Epic').length;
  const featureCount = results.filter(r => r.workItemType === 'Feature').length;
  const storyCount = results.filter(r => r.workItemType === 'User Story').length;
  const taskCount = results.filter(r => r.workItemType === 'Task').length;

  lines.push('📈 Work Item Type Distribution:');
  if (epicCount > 0) lines.push(`  - Epics: ${epicCount}`);
  if (featureCount > 0) lines.push(`  - Features: ${featureCount}`);
  if (storyCount > 0) lines.push(`  - User Stories: ${storyCount}`);
  if (taskCount > 0) lines.push(`  - Tasks: ${taskCount}`);

  return lines.join('\n');
}

/**
 * Validate ADO projects exist
 *
 * @param config ADO configuration
 * @param projectNames Array of project names to validate
 * @returns Validation results (missing projects)
 */
export async function validateAdoProjects(
  config: AdoMultiProjectConfig,
  projectNames: string[]
): Promise<string[]> {
  const missing: string[] = [];

  const client = axios.create({
    baseURL: `https://dev.azure.com/${config.organization}`,
    headers: {
      'Authorization': `Basic ${Buffer.from(':' + config.pat).toString('base64')}`
    }
  });

  for (const name of projectNames) {
    try {
      await client.get(`/_apis/projects/${name}?api-version=7.0`);
    } catch (error) {
      missing.push(name);
    }
  }

  return missing;
}
