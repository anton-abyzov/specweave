/**
 * Jira Incremental Mapper - Granular Work Item Management
 *
 * Supports adding individual Jira items (Story, Bug, Task) to increments:
 * - Add single story/bug/task to existing increment
 * - Create increment from cherry-picked items across multiple Epics
 * - Handle different work item types appropriately
 * - Update RFC documentation when items are added
 */

import { JiraClient, JiraIssue } from './jira-client';
import { FlexibleRFCGenerator, FlexibleWorkItem, FlexibleRFCContent } from '../../core/rfc-generator-v2';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface WorkItem {
  type: 'story' | 'bug' | 'task' | 'epic';
  id: string;  // e.g., US0003-001, BUG0003-001, TASK0003-001
  jira_key: string;  // e.g., SCRUM-1
  jira_id: string;
  title: string;
  description: string;
  status: 'planned' | 'in-progress' | 'completed';
  priority: 'P1' | 'P2' | 'P3';
  assignee?: string;
  labels?: string[];
  parent_epic?: {
    key: string;
    title: string;
  };
}

export interface IncrementWorkItems {
  stories: WorkItem[];
  bugs: WorkItem[];
  tasks: WorkItem[];
}

export class JiraIncrementalMapper {
  private client: JiraClient;
  private projectRoot: string;
  private rfcGenerator: FlexibleRFCGenerator;

  constructor(client: JiraClient, projectRoot: string = process.cwd()) {
    this.client = client;
    this.projectRoot = projectRoot;
    this.rfcGenerator = new FlexibleRFCGenerator(projectRoot);
  }

  /**
   * Add a specific Jira item (Story, Bug, Task) to an existing increment
   */
  public async addItemToIncrement(
    incrementId: string,
    jiraKey: string
  ): Promise<{ success: boolean; message: string; workItem?: WorkItem }> {
    console.log(`\n📥 Adding Jira item ${jiraKey} to Increment ${incrementId}...`);

    try {
      // 1. Fetch Jira issue
      const issue = await this.client.getIssue(jiraKey);
      console.log(`   ✅ Fetched: ${issue.fields.summary}`);

      // 2. Determine work item type
      const itemType = this.mapJiraTypeToWorkItemType(issue.fields.issuetype.name);
      console.log(`   ✅ Type: ${itemType}`);

      // 3. Check if increment exists
      const incrementFolder = path.join(
        this.projectRoot,
        '.specweave',
        'increments',
        incrementId
      );

      if (!fs.existsSync(incrementFolder)) {
        throw new Error(`Increment ${incrementId} not found`);
      }

      // 4. Read existing spec.md
      const specPath = path.join(incrementFolder, 'spec.md');
      const specContent = fs.readFileSync(specPath, 'utf-8');
      const parsed = this.parseMarkdownWithFrontmatter(specContent);

      // 5. Create work item
      const workItem = this.createWorkItemFromIssue(issue, itemType, incrementId);

      // 6. Add to spec.md
      const updatedSpec = this.addWorkItemToSpec(parsed, workItem);
      fs.writeFileSync(specPath, updatedSpec, 'utf-8');
      console.log(`   ✅ Updated spec.md`);

      // 7. Update tasks.md if needed
      if (itemType !== 'epic') {
        await this.addWorkItemToTasks(incrementFolder, workItem);
        console.log(`   ✅ Updated tasks.md`);
      }

      // 8. Update RFC document
      await this.updateRFCWithWorkItem(incrementId, workItem);
      console.log(`   ✅ Updated RFC`);

      return {
        success: true,
        message: `Added ${itemType} ${jiraKey} to increment ${incrementId}`,
        workItem
      };
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`);
      return {
        success: false,
        message: `Failed to add ${jiraKey}: ${error.message}`
      };
    }
  }

  /**
   * Create new increment from multiple Jira items (cherry-picked)
   */
  public async createIncrementFromItems(
    title: string,
    jiraKeys: string[]
  ): Promise<{ success: boolean; incrementId: string; message: string }> {
    console.log(`\n📦 Creating increment "${title}" from ${jiraKeys.length} items...`);

    try {
      // 1. Fetch all issues
      const issues = await Promise.all(
        jiraKeys.map(key => this.client.getIssue(key))
      );
      console.log(`   ✅ Fetched ${issues.length} issues`);

      // 2. Auto-number increment
      const incrementId = this.getNextIncrementId();
      console.log(`   ✅ Auto-numbered as Increment ${incrementId}`);

      // 3. Create increment folder
      const incrementFolder = path.join(
        this.projectRoot,
        '.specweave',
        'increments',
        incrementId
      );
      this.ensureDir(incrementFolder);

      // 4. Group by type
      const workItems: IncrementWorkItems = {
        stories: [],
        bugs: [],
        tasks: []
      };

      issues.forEach(issue => {
        const itemType = this.mapJiraTypeToWorkItemType(issue.fields.issuetype.name);
        const workItem = this.createWorkItemFromIssue(issue, itemType, incrementId);

        if (itemType === 'story') workItems.stories.push(workItem);
        else if (itemType === 'bug') workItems.bugs.push(workItem);
        else if (itemType === 'task') workItems.tasks.push(workItem);
      });

      console.log(`   ✅ Grouped: ${workItems.stories.length} stories, ${workItems.bugs.length} bugs, ${workItems.tasks.length} tasks`);

      // 5. Generate spec.md
      await this.generateSpecFromWorkItems(incrementFolder, incrementId, title, workItems, issues);
      console.log(`   ✅ Generated spec.md`);

      // 6. Generate tasks.md
      await this.generateTasksFromWorkItems(incrementFolder, workItems);
      console.log(`   ✅ Generated tasks.md`);

      // 7. Generate RFC
      await this.generateRFCFromWorkItems(incrementId, title, workItems);
      console.log(`   ✅ Generated RFC`);

      // 8. Generate context-manifest
      await this.generateContextManifest(incrementFolder);
      console.log(`   ✅ Generated context-manifest.yaml`);

      return {
        success: true,
        incrementId,
        message: `Created increment ${incrementId} with ${issues.length} work items`
      };
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`);
      return {
        success: false,
        incrementId: '',
        message: `Failed to create increment: ${error.message}`
      };
    }
  }

  /**
   * List all work items in an increment grouped by type
   */
  public getIncrementWorkItems(incrementId: string): IncrementWorkItems {
    const specPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'spec.md'
    );

    const content = fs.readFileSync(specPath, 'utf-8');
    const parsed = this.parseMarkdownWithFrontmatter(content);

    const workItems: IncrementWorkItems = {
      stories: [],
      bugs: [],
      tasks: []
    };

    if (parsed.frontmatter.work_items) {
      parsed.frontmatter.work_items.forEach((item: any) => {
        if (item.type === 'story') workItems.stories.push(item);
        else if (item.type === 'bug') workItems.bugs.push(item);
        else if (item.type === 'task') workItems.tasks.push(item);
      });
    }

    return workItems;
  }

  // ========== Helper Methods ==========

  private mapJiraTypeToWorkItemType(jiraType: string): 'story' | 'bug' | 'task' | 'epic' {
    const typeLower = jiraType.toLowerCase();
    if (typeLower.includes('story')) return 'story';
    if (typeLower.includes('bug')) return 'bug';
    if (typeLower.includes('task') || typeLower.includes('sub-task')) return 'task';
    if (typeLower.includes('epic')) return 'epic';
    return 'task'; // Default
  }

  private createWorkItemFromIssue(
    issue: JiraIssue,
    itemType: 'story' | 'bug' | 'task' | 'epic',
    incrementId: string
  ): WorkItem {
    // Count existing items of this type to generate ID
    const incrementFolder = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId
    );

    let count = 1;
    if (fs.existsSync(path.join(incrementFolder, 'spec.md'))) {
      const existing = this.getIncrementWorkItems(incrementId);
      if (itemType === 'story') count = existing.stories.length + 1;
      else if (itemType === 'bug') count = existing.bugs.length + 1;
      else if (itemType === 'task') count = existing.tasks.length + 1;
    }

    const prefix = itemType === 'story' ? 'US' :
                   itemType === 'bug' ? 'BUG' :
                   'TASK';

    return {
      type: itemType,
      id: `${prefix}${incrementId}-${String(count).padStart(3, '0')}`,
      jira_key: issue.key,
      jira_id: issue.id,
      title: issue.fields.summary,
      description: this.extractTextFromJiraDescription(issue.fields.description),
      status: this.mapJiraStatusToSpecWeave(issue.fields.status.name),
      priority: this.mapJiraPriorityToSpecWeave(issue.fields.priority?.name),
      assignee: issue.fields.assignee?.displayName,
      labels: issue.fields.labels,
      parent_epic: issue.fields.parent ? {
        key: issue.fields.parent.key,
        title: issue.fields.parent.fields.summary
      } : undefined
    };
  }

  private addWorkItemToSpec(parsed: any, workItem: WorkItem): string {
    // Initialize work_items array if not exists
    if (!parsed.frontmatter.work_items) {
      parsed.frontmatter.work_items = [];
    }

    // Add work item to frontmatter
    parsed.frontmatter.work_items.push(workItem);

    // Add to content based on type
    let newContent = parsed.content;

    if (workItem.type === 'story') {
      const storySection = `\n### ${workItem.id}: ${workItem.title}\n\n${workItem.description}\n\n**Jira**: [${workItem.jira_key}](https://${process.env.JIRA_DOMAIN}/browse/${workItem.jira_key})\n`;

      if (newContent.includes('## User Stories')) {
        newContent = newContent.replace('## User Stories\n', `## User Stories\n${storySection}`);
      } else {
        newContent += `\n## User Stories\n${storySection}`;
      }
    } else if (workItem.type === 'bug') {
      const bugSection = `\n### ${workItem.id}: ${workItem.title}\n\n${workItem.description}\n\n**Priority**: ${workItem.priority}\n**Jira**: [${workItem.jira_key}](https://${process.env.JIRA_DOMAIN}/browse/${workItem.jira_key})\n`;

      if (newContent.includes('## Bugs')) {
        newContent = newContent.replace('## Bugs\n', `## Bugs\n${bugSection}`);
      } else {
        newContent += `\n## Bugs\n${bugSection}`;
      }
    } else if (workItem.type === 'task') {
      const taskSection = `\n### ${workItem.id}: ${workItem.title}\n\n${workItem.description}\n\n**Jira**: [${workItem.jira_key}](https://${process.env.JIRA_DOMAIN}/browse/${workItem.jira_key})\n`;

      if (newContent.includes('## Technical Tasks')) {
        newContent = newContent.replace('## Technical Tasks\n', `## Technical Tasks\n${taskSection}`);
      } else {
        newContent += `\n## Technical Tasks\n${taskSection}`;
      }
    }

    return this.serializeMarkdownWithFrontmatter(parsed.frontmatter, newContent);
  }

  private async addWorkItemToTasks(incrementFolder: string, workItem: WorkItem): Promise<void> {
    const tasksPath = path.join(incrementFolder, 'tasks.md');
    let content = '';

    if (fs.existsSync(tasksPath)) {
      content = fs.readFileSync(tasksPath, 'utf-8');
    } else {
      content = '# Tasks\n\n';
    }

    const sectionTitle = workItem.type === 'story' ? 'User Story' :
                        workItem.type === 'bug' ? 'Bug Fix' : 'Technical Task';

    const taskEntry = `\n## ${sectionTitle}: ${workItem.id}\n\n- [ ] ${workItem.title} (Jira: ${workItem.jira_key})\n`;

    content += taskEntry;
    fs.writeFileSync(tasksPath, content, 'utf-8');
  }

  private async updateRFCWithWorkItem(incrementId: string, workItem: WorkItem): Promise<void> {
    const rfcFolder = path.join(this.projectRoot, '.specweave', 'docs', 'rfcs');
    const rfcFiles = fs.readdirSync(rfcFolder).filter(f => f.startsWith(`rfc-${incrementId}`));

    if (rfcFiles.length === 0) return;

    const rfcPath = path.join(rfcFolder, rfcFiles[0]);
    let content = fs.readFileSync(rfcPath, 'utf-8');

    const workItemSection = `\n### ${workItem.type.toUpperCase()}: ${workItem.title}\n\n${workItem.description}\n\n**Jira**: [${workItem.jira_key}](https://${process.env.JIRA_DOMAIN}/browse/${workItem.jira_key})\n`;

    if (content.includes('## Detailed Design')) {
      content = content.replace('## Detailed Design\n', `## Detailed Design\n${workItemSection}`);
    } else {
      content += `\n## Detailed Design\n${workItemSection}`;
    }

    fs.writeFileSync(rfcPath, content, 'utf-8');
  }

  private async generateSpecFromWorkItems(
    incrementFolder: string,
    incrementId: string,
    title: string,
    workItems: IncrementWorkItems,
    issues: JiraIssue[]
  ): Promise<void> {
    const frontmatter = {
      increment_id: incrementId,
      title,
      status: 'planned',
      priority: 'P2',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      work_items: [
        ...workItems.stories,
        ...workItems.bugs,
        ...workItems.tasks
      ],
      jira: {
        source_issues: issues.map(i => ({
          key: i.key,
          type: i.fields.issuetype.name,
          url: `https://${process.env.JIRA_DOMAIN}/browse/${i.key}`
        })),
        last_sync: new Date().toISOString(),
        sync_direction: 'import'
      }
    };

    let content = `# ${title}\n\n`;

    if (workItems.stories.length > 0) {
      content += `## User Stories\n\n`;
      workItems.stories.forEach(story => {
        content += `### ${story.id}: ${story.title}\n\n${story.description}\n\n`;
        content += `**Jira**: [${story.jira_key}](https://${process.env.JIRA_DOMAIN}/browse/${story.jira_key})\n\n`;
      });
    }

    if (workItems.bugs.length > 0) {
      content += `## Bugs\n\n`;
      workItems.bugs.forEach(bug => {
        content += `### ${bug.id}: ${bug.title}\n\n${bug.description}\n\n`;
        content += `**Priority**: ${bug.priority} | **Jira**: [${bug.jira_key}](https://${process.env.JIRA_DOMAIN}/browse/${bug.jira_key})\n\n`;
      });
    }

    if (workItems.tasks.length > 0) {
      content += `## Technical Tasks\n\n`;
      workItems.tasks.forEach(task => {
        content += `### ${task.id}: ${task.title}\n\n${task.description}\n\n`;
        content += `**Jira**: [${task.jira_key}](https://${process.env.JIRA_DOMAIN}/browse/${task.jira_key})\n\n`;
      });
    }

    const specMd = this.serializeMarkdownWithFrontmatter(frontmatter, content);
    fs.writeFileSync(path.join(incrementFolder, 'spec.md'), specMd, 'utf-8');
  }

  private async generateTasksFromWorkItems(
    incrementFolder: string,
    workItems: IncrementWorkItems
  ): Promise<void> {
    let content = '# Tasks\n\n';

    const allItems = [...workItems.stories, ...workItems.bugs, ...workItems.tasks];

    allItems.forEach(item => {
      const sectionTitle = item.type === 'story' ? 'User Story' :
                          item.type === 'bug' ? 'Bug Fix' : 'Technical Task';
      content += `## ${sectionTitle}: ${item.id}\n\n`;
      content += `- [ ] ${item.title} (Jira: ${item.jira_key})\n\n`;
    });

    fs.writeFileSync(path.join(incrementFolder, 'tasks.md'), content, 'utf-8');
  }

  private async generateRFCFromWorkItems(
    incrementId: string,
    title: string,
    workItems: IncrementWorkItems
  ): Promise<void> {
    // Convert WorkItem to FlexibleWorkItem format (V2)
    const flexibleWorkItems: FlexibleWorkItem[] = [
      ...workItems.stories.map(item => ({
        type: 'story',
        id: item.id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        source_key: item.jira_key,
        source_url: `https://${process.env.JIRA_DOMAIN}/browse/${item.jira_key}`,
        parent: item.parent_epic ? {
          type: 'Epic',
          key: item.parent_epic.key,
          title: item.parent_epic.title
        } : undefined,
        labels: item.labels
      })),
      ...workItems.bugs.map(item => ({
        type: 'bug',
        id: item.id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        source_key: item.jira_key,
        source_url: `https://${process.env.JIRA_DOMAIN}/browse/${item.jira_key}`,
        parent: item.parent_epic ? {
          type: 'Epic',
          key: item.parent_epic.key,
          title: item.parent_epic.title
        } : undefined,
        labels: item.labels
      })),
      ...workItems.tasks.map(item => ({
        type: 'task',
        id: item.id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        source_key: item.jira_key,
        source_url: `https://${process.env.JIRA_DOMAIN}/browse/${item.jira_key}`,
        parent: item.parent_epic ? {
          type: 'Epic',
          key: item.parent_epic.key,
          title: item.parent_epic.title
        } : undefined,
        labels: item.labels
      }))
    ];

    // Prepare RFC content for V2
    const rfcContent: FlexibleRFCContent = {
      metadata: {
        incrementId,
        title,
        status: 'draft',
        source: 'jira',
        created: new Date().toISOString().split('T')[0]
      },
      sourceMetadata: {
        source_type: 'jira'
      },
      summary: `This increment addresses ${workItems.stories.length} user stories, ${workItems.bugs.length} bugs, and ${workItems.tasks.length} technical tasks.`,
      motivation: `Implementation plan for ${title}.`,
      workItems: flexibleWorkItems  // V2 uses single array, auto-groups by strategy
    };

    // Generate RFC using flexible generator (V2)
    await this.rfcGenerator.generateRFC(rfcContent);
  }

  // ... (rest of helper methods: getNextIncrementId, ensureDir, parseMarkdownWithFrontmatter, etc.)

  private getNextIncrementId(): string {
    const incrementsDir = path.join(this.projectRoot, '.specweave', 'increments');
    this.ensureDir(incrementsDir);

    const existing = fs.readdirSync(incrementsDir)
      .filter(name => /^\d{4}/.test(name))
      .map(name => parseInt(name.split('-')[0]))
      .sort((a, b) => b - a);

    const nextNum = existing.length > 0 ? existing[0] + 1 : 1;
    return String(nextNum).padStart(4, '0');
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private parseMarkdownWithFrontmatter(content: string): { frontmatter: any; content: string } {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (frontmatterMatch) {
      const frontmatter = yaml.load(frontmatterMatch[1]) as any;
      const markdownContent = frontmatterMatch[2];
      return { frontmatter, content: markdownContent };
    }
    return { frontmatter: {}, content };
  }

  private serializeMarkdownWithFrontmatter(frontmatter: any, content: string): string {
    const frontmatterYaml = yaml.dump(frontmatter);
    return `---\n${frontmatterYaml}---\n\n${content}`;
  }

  private extractTextFromJiraDescription(description: any): string {
    if (!description) return '';
    if (typeof description === 'object' && description.type === 'doc') {
      const texts: string[] = [];
      const extractText = (node: any) => {
        if (node.type === 'text') texts.push(node.text);
        else if (node.content) node.content.forEach(extractText);
      };
      description.content?.forEach(extractText);
      return texts.join(' ');
    }
    return String(description);
  }

  private mapJiraStatusToSpecWeave(jiraStatus: string): 'planned' | 'in-progress' | 'completed' {
    const statusLower = jiraStatus.toLowerCase();
    if (statusLower.includes('to do') || statusLower.includes('backlog')) return 'planned';
    if (statusLower.includes('in progress')) return 'in-progress';
    if (statusLower.includes('done')) return 'completed';
    return 'planned';
  }

  private mapJiraPriorityToSpecWeave(jiraPriority: string | undefined): 'P1' | 'P2' | 'P3' {
    if (!jiraPriority) return 'P3';
    const priorityLower = jiraPriority.toLowerCase();
    if (priorityLower.includes('highest') || priorityLower.includes('critical')) return 'P1';
    if (priorityLower.includes('high')) return 'P2';
    return 'P3';
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  private async generateContextManifest(incrementFolder: string): Promise<void> {
    const manifest = {
      spec_sections: [],
      documentation: [],
      max_context_tokens: 10000,
      priority: 'high',
      auto_refresh: false
    };
    const manifestYaml = yaml.dump(manifest);
    fs.writeFileSync(
      path.join(incrementFolder, 'context-manifest.yaml'),
      `---\n${manifestYaml}---\n`,
      'utf-8'
    );
  }
}
