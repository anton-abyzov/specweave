/**
 * Jira ↔ SpecWeave Bidirectional Mapper
 *
 * Handles conversion between Jira issues and SpecWeave documentation structure:
 * - Jira Epic → SpecWeave Increment (RFC folder)
 * - Jira Story → SpecWeave User Story (RFC document)
 * - Jira Sub-task → SpecWeave Task (tasks.md)
 *
 * Syncs with:
 * - .specweave/increments/{id}/ - Increment folder
 * - .specweave/docs/internal/architecture/rfc/ - RFC documents for detailed specs
 * - .specweave/docs/internal/architecture/adr/ - Architecture decisions (ADRs)
 */

import { JiraClient, JiraIssue } from './jira-client.js';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface SpecWeaveIncrement {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'P1' | 'P2' | 'P3';
  created_at: string;
  updated_at: string;
  jira?: {
    epic_key: string;
    epic_id: string;
    epic_url: string;
    last_sync: string;
    sync_direction: 'import' | 'export' | 'bidirectional';
  };
  user_stories: SpecWeaveUserStory[];
}

export interface SpecWeaveUserStory {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  jira?: {
    key: string;
    id: string;
    url: string;
  };
  tasks: SpecWeaveTask[];
}

export interface SpecWeaveTask {
  id: string;
  description: string;
  completed: boolean;
  jira?: {
    key: string;
    id: string;
  };
}

export interface SyncResult {
  success: boolean;
  operation: 'import' | 'export' | 'sync';
  direction: 'jira-to-specweave' | 'specweave-to-jira' | 'bidirectional';
  changes: {
    created: number;
    updated: number;
    deleted: number;
  };
  conflicts: SyncConflict[];
  summary: string;
}

export interface SyncConflict {
  type: 'title' | 'description' | 'status' | 'priority';
  jira_value: string;
  specweave_value: string;
  resolution?: 'jira' | 'specweave' | 'manual';
}

export class JiraMapper {
  private client: JiraClient;
  private projectRoot: string;

  constructor(client: JiraClient, projectRoot: string = process.cwd()) {
    this.client = client;
    this.projectRoot = projectRoot;
  }

  /**
   * Import Jira Epic as SpecWeave Increment with RFC documentation
   */
  public async importEpicAsIncrement(epicKey: string): Promise<SyncResult> {
    console.log(`\n📥 Importing Jira Epic ${epicKey} as SpecWeave Increment...`);

    try {
      // 1. Fetch Epic from Jira
      const epic = await this.client.getIssue(epicKey);
      console.log(`   ✅ Fetched Epic: ${epic.fields.summary}`);

      // 2. Fetch all Stories linked to this Epic
      const stories = await this.client.searchIssues({
        jql: `parent = ${epicKey} AND issuetype = Story`,
        maxResults: 100
      });
      console.log(`   ✅ Found ${stories.length} stories`);

      // 3. Fetch all Sub-tasks for each Story
      const storyTasks = await Promise.all(
        stories.map(async (story) => {
          const subtasks = await this.client.searchIssues({
            jql: `parent = ${story.key} AND issuetype = Sub-task`,
            maxResults: 50
          });
          return { story, subtasks };
        })
      );

      // 4. Auto-number next increment
      const incrementId = this.getNextIncrementId();
      console.log(`   ✅ Auto-numbered as Increment ${incrementId}`);

      // 4.1. Validate increment before creation (check for duplicates)
      const { MetadataManager } = await import('../../core/increment/metadata-manager.js');
      await MetadataManager.validateBeforeCreate(incrementId, this.projectRoot);
      console.log(`   ✅ Validated increment ID (no duplicates)`);

      // 5. Create increment folder structure
      const incrementFolder = path.join(
        this.projectRoot,
        '.specweave',
        'increments',
        incrementId
      );
      this.ensureDir(incrementFolder);

      // 6. Generate spec.md
      await this.generateSpecMd(incrementFolder, epic, stories, incrementId);
      console.log(`   ✅ Generated spec.md`);

      // 7. Generate tasks.md
      await this.generateTasksMd(incrementFolder, storyTasks);
      console.log(`   ✅ Generated tasks.md`);

      // 8. Generate RFC document (detailed spec)
      await this.generateRFC(epic, stories, incrementId);
      console.log(`   ✅ Generated RFC document`);

      // 9. Generate context-manifest.yaml
      await this.generateContextManifest(incrementFolder);
      console.log(`   ✅ Generated context-manifest.yaml`);

      // 10. Update Epic in Jira with SpecWeave ID
      await this.client.updateIssue({
        key: epicKey,
        customFields: {
          'SpecWeave-Increment-ID': incrementId
        }
      });

      return {
        success: true,
        operation: 'import',
        direction: 'jira-to-specweave',
        changes: {
          created: 1 + stories.length + storyTasks.reduce((sum, st) => sum + st.subtasks.length, 0),
          updated: 1, // Updated Epic with SpecWeave ID
          deleted: 0
        },
        conflicts: [],
        summary: `Successfully imported Epic ${epicKey} as Increment ${incrementId} with ${stories.length} stories and ${storyTasks.reduce((sum, st) => sum + st.subtasks.length, 0)} tasks`
      };
    } catch (error: any) {
      console.error(`   ❌ Import failed:`, error.message);
      return {
        success: false,
        operation: 'import',
        direction: 'jira-to-specweave',
        changes: { created: 0, updated: 0, deleted: 0 },
        conflicts: [],
        summary: `Import failed: ${error.message}`
      };
    }
  }

  /**
   * Export SpecWeave Increment to Jira Epic
   */
  public async exportIncrementAsEpic(incrementId: string, projectKey: string): Promise<SyncResult> {
    console.log(`\n📤 Exporting Increment ${incrementId} to Jira...`);

    try {
      // 1. Read increment spec.md
      const incrementFolder = path.join(
        this.projectRoot,
        '.specweave',
        'increments',
        incrementId
      );
      const specPath = path.join(incrementFolder, 'spec.md');
      const specContent = fs.readFileSync(specPath, 'utf-8');

      // 2. Parse frontmatter and content
      const parsed = this.parseMarkdownWithFrontmatter(specContent);
      console.log(`   ✅ Parsed spec.md: ${parsed.frontmatter.title}`);

      // 3. Check if already synced
      if (parsed.frontmatter.jira?.epic_key) {
        console.log(`   ⚠️  Already synced to Jira Epic ${parsed.frontmatter.jira.epic_key}`);
        return this.syncIncrement(incrementId);
      }

      // 4. Create Epic in Jira
      const epic = await this.client.createIssue({
        issueType: 'Epic',
        summary: `[Increment ${incrementId}] ${parsed.frontmatter.title}`,
        description: this.extractDescription(parsed.content),
        priority: this.mapPriorityToJira(parsed.frontmatter.priority),
        labels: ['specweave', `increment-${incrementId}`]
      }, projectKey);
      console.log(`   ✅ Created Epic ${epic.key}`);

      // 5. Create Stories for each User Story
      const userStories = this.extractUserStories(parsed.content);
      const createdStories: JiraIssue[] = [];

      for (const us of userStories) {
        const story = await this.client.createIssue({
          issueType: 'Story',
          summary: us.title,
          description: us.description,
          priority: this.mapPriorityToJira(parsed.frontmatter.priority),
          labels: ['specweave', `user-story-${us.id}`],
          epicKey: epic.key
        }, projectKey);
        createdStories.push(story);
        console.log(`   ✅ Created Story ${story.key}: ${us.title}`);
      }

      // 6. Create Sub-tasks from tasks.md
      const tasksPath = path.join(incrementFolder, 'tasks.md');
      if (fs.existsSync(tasksPath)) {
        const tasks = this.parseTasksMd(tasksPath);
        let taskCount = 0;

        for (const storyId in tasks) {
          const storyIndex = userStories.findIndex(us => us.id === storyId);
          if (storyIndex >= 0 && createdStories[storyIndex]) {
            for (const task of tasks[storyId]) {
              await this.client.createIssue({
                issueType: 'Sub-task',
                summary: task.description,
                parentKey: createdStories[storyIndex].key,
                labels: ['specweave', 'task']
              }, projectKey);
              taskCount++;
            }
          }
        }
        console.log(`   ✅ Created ${taskCount} sub-tasks`);
      }

      // 7. Update spec.md with Jira metadata
      await this.updateSpecWithJiraMetadata(specPath, epic, createdStories);
      console.log(`   ✅ Updated spec.md with Jira metadata`);

      return {
        success: true,
        operation: 'export',
        direction: 'specweave-to-jira',
        changes: {
          created: 1 + createdStories.length,
          updated: 1, // Updated spec.md
          deleted: 0
        },
        conflicts: [],
        summary: `Successfully exported Increment ${incrementId} as Epic ${epic.key} with ${createdStories.length} stories`
      };
    } catch (error: any) {
      console.error(`   ❌ Export failed:`, error.message);
      return {
        success: false,
        operation: 'export',
        direction: 'specweave-to-jira',
        changes: { created: 0, updated: 0, deleted: 0 },
        conflicts: [],
        summary: `Export failed: ${error.message}`
      };
    }
  }

  /**
   * Bidirectional sync between SpecWeave Increment and Jira Epic
   */
  public async syncIncrement(incrementId: string): Promise<SyncResult> {
    console.log(`\n🔄 Syncing Increment ${incrementId} with Jira...`);

    try {
      // 1. Read increment spec.md
      const incrementFolder = path.join(
        this.projectRoot,
        '.specweave',
        'increments',
        incrementId
      );
      const specPath = path.join(incrementFolder, 'spec.md');
      const specContent = fs.readFileSync(specPath, 'utf-8');
      const parsed = this.parseMarkdownWithFrontmatter(specContent);

      if (!parsed.frontmatter.jira?.epic_key) {
        throw new Error('Increment not linked to Jira Epic. Export first.');
      }

      const epicKey = parsed.frontmatter.jira.epic_key;
      const lastSync = new Date(parsed.frontmatter.jira.last_sync || 0);

      // 2. Fetch Epic from Jira
      const epic = await this.client.getIssue(epicKey);

      // 3. Detect changes since last sync
      const conflicts: SyncConflict[] = [];
      const changes = { created: 0, updated: 0, deleted: 0 };

      // Compare title
      const specTitle = parsed.frontmatter.title;
      const jiraTitle = epic.fields.summary.replace(/^\[Increment \d+\] /, '');
      if (specTitle !== jiraTitle) {
        conflicts.push({
          type: 'title',
          jira_value: jiraTitle,
          specweave_value: specTitle
        });
      }

      // Compare status
      const specStatus = parsed.frontmatter.status;
      const jiraStatus = this.mapJiraStatusToSpecWeave(epic.fields.status.name);
      if (specStatus !== jiraStatus) {
        conflicts.push({
          type: 'status',
          jira_value: epic.fields.status.name,
          specweave_value: specStatus
        });
      }

      // 4. Resolve conflicts (for now, Jira wins)
      if (conflicts.length > 0) {
        console.log(`   ⚠️  Found ${conflicts.length} conflicts`);
        for (const conflict of conflicts) {
          console.log(`      - ${conflict.type}: Jira="${conflict.jira_value}" vs SpecWeave="${conflict.specweave_value}"`);
          conflict.resolution = 'jira'; // TODO: Ask user for resolution
        }

        // Update SpecWeave with Jira values
        if (conflicts.some(c => c.type === 'title')) {
          parsed.frontmatter.title = jiraTitle;
          changes.updated++;
        }
        if (conflicts.some(c => c.type === 'status')) {
          parsed.frontmatter.status = jiraStatus;
          changes.updated++;
        }

        // Write updated spec.md
        const updatedContent = this.serializeMarkdownWithFrontmatter(parsed.frontmatter, parsed.content);
        fs.writeFileSync(specPath, updatedContent, 'utf-8');
      }

      // 5. Update last sync timestamp
      parsed.frontmatter.jira.last_sync = new Date().toISOString();
      parsed.frontmatter.jira.sync_direction = 'bidirectional';
      const updatedContent = this.serializeMarkdownWithFrontmatter(parsed.frontmatter, parsed.content);
      fs.writeFileSync(specPath, updatedContent, 'utf-8');

      console.log(`   ✅ Sync complete`);

      return {
        success: true,
        operation: 'sync',
        direction: 'bidirectional',
        changes,
        conflicts,
        summary: `Synced Increment ${incrementId} with Epic ${epicKey}. ${conflicts.length} conflicts resolved.`
      };
    } catch (error: any) {
      console.error(`   ❌ Sync failed:`, error.message);
      return {
        success: false,
        operation: 'sync',
        direction: 'bidirectional',
        changes: { created: 0, updated: 0, deleted: 0 },
        conflicts: [],
        summary: `Sync failed: ${error.message}`
      };
    }
  }

  // ========== Helper Methods ==========

  private getNextIncrementId(): string {
    // UPDATED: Use centralized IncrementNumberManager to prevent gaps when increments are archived
    // This now scans ALL directories: main, _archive, _abandoned, _paused
    const { IncrementNumberManager } = require('../../core/increment-utils.js');
    return IncrementNumberManager.getNextIncrementNumber(this.projectRoot, false);
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private async generateSpecMd(
    incrementFolder: string,
    epic: JiraIssue,
    stories: JiraIssue[],
    incrementId: string
  ): Promise<void> {
    const frontmatter = {
      increment_id: incrementId,
      title: epic.fields.summary,
      status: this.mapJiraStatusToSpecWeave(epic.fields.status.name),
      priority: this.mapJiraPriorityToSpecWeave(epic.fields.priority?.name),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      jira: {
        epic_key: epic.key,
        epic_id: epic.id,
        epic_url: `https://${process.env.JIRA_DOMAIN}/browse/${epic.key}`,
        imported_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        sync_direction: 'import' as const
      }
    };

    let content = `# ${epic.fields.summary}\n\n`;
    content += this.extractTextFromJiraDescription(epic.fields.description) + '\n\n';

    content += `## User Stories\n\n`;
    stories.forEach((story, index) => {
      const usId = `US${incrementId}-${String(index + 1).padStart(3, '0')}`;
      content += `### ${usId}: ${story.fields.summary}\n\n`;
      content += this.extractTextFromJiraDescription(story.fields.description) + '\n\n';
      content += `**Jira Story**: [${story.key}](https://${process.env.JIRA_DOMAIN}/browse/${story.key})\n\n`;
    });

    const specMd = this.serializeMarkdownWithFrontmatter(frontmatter, content);
    fs.writeFileSync(path.join(incrementFolder, 'spec.md'), specMd, 'utf-8');
  }

  private async generateTasksMd(
    incrementFolder: string,
    storyTasks: Array<{ story: JiraIssue; subtasks: JiraIssue[] }>
  ): Promise<void> {
    let content = `# Tasks\n\n`;

    storyTasks.forEach(({ story, subtasks }, storyIndex) => {
      if (subtasks.length === 0) return;

      const usId = `US-${String(storyIndex + 1).padStart(3, '0')}`;
      content += `## User Story: ${usId}\n\n`;

      subtasks.forEach(subtask => {
        const checked = subtask.fields.status.name.toLowerCase() === 'done' ? 'x' : ' ';
        content += `- [${checked}] ${subtask.fields.summary} (Jira: ${subtask.key})\n`;
      });

      content += '\n';
    });

    fs.writeFileSync(path.join(incrementFolder, 'tasks.md'), content, 'utf-8');
  }

  private async generateRFC(epic: JiraIssue, stories: JiraIssue[], incrementId: string): Promise<void> {
    const rfcFolder = path.join(this.projectRoot, '.specweave', 'docs', 'rfcs');
    this.ensureDir(rfcFolder);

    const rfcPath = path.join(rfcFolder, `rfc-${incrementId}-${this.slugify(epic.fields.summary)}.md`);

    let content = `# RFC ${incrementId}: ${epic.fields.summary}\n\n`;
    content += `**Status**: Draft\n`;
    content += `**Created**: ${new Date().toISOString().split('T')[0]}\n`;
    content += `**Jira Epic**: [${epic.key}](https://${process.env.JIRA_DOMAIN}/browse/${epic.key})\n\n`;

    content += `## Summary\n\n`;
    content += this.extractTextFromJiraDescription(epic.fields.description) + '\n\n';

    content += `## Motivation\n\n`;
    content += `This RFC outlines the implementation plan for ${epic.fields.summary}.\n\n`;

    content += `## Detailed Design\n\n`;
    stories.forEach((story, index) => {
      content += `### ${index + 1}. ${story.fields.summary}\n\n`;
      content += this.extractTextFromJiraDescription(story.fields.description) + '\n\n';
    });

    content += `## Alternatives Considered\n\n`;
    content += `(To be filled in during design phase)\n\n`;

    content += `## Implementation Plan\n\n`;
    content += `See increment ${incrementId} in \`.specweave/increments/${incrementId}/\`\n`;

    fs.writeFileSync(rfcPath, content, 'utf-8');
  }

  private async generateContextManifest(incrementFolder: string): Promise<void> {
    const manifest = {
      spec_sections: [] as string[],
      documentation: [] as string[],
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

    // Handle Atlassian Document Format (ADF)
    if (typeof description === 'object' && description.type === 'doc') {
      const texts: string[] = [];
      const extractText = (node: any) => {
        if (node.type === 'text') {
          texts.push(node.text);
        } else if (node.content) {
          node.content.forEach(extractText);
        }
      };
      description.content?.forEach(extractText);
      return texts.join(' ');
    }

    return String(description);
  }

  private extractDescription(content: string): string {
    const lines = content.split('\n').slice(0, 5);
    return lines.join('\n').trim();
  }

  private extractUserStories(content: string): Array<{ id: string; title: string; description: string }> {
    const stories: Array<{ id: string; title: string; description: string }> = [];
    const lines = content.split('\n');

    let currentStory: any = null;
    for (const line of lines) {
      const match = line.match(/^###\s+(US\d+-\d+):\s+(.+)$/);
      if (match) {
        if (currentStory) stories.push(currentStory);
        currentStory = { id: match[1], title: match[2], description: '' };
      } else if (currentStory && line.trim()) {
        currentStory.description += line + '\n';
      }
    }
    if (currentStory) stories.push(currentStory);

    return stories;
  }

  private parseTasksMd(tasksPath: string): Record<string, Array<{ description: string; completed: boolean }>> {
    const content = fs.readFileSync(tasksPath, 'utf-8');
    const tasks: Record<string, Array<{ description: string; completed: boolean }>> = {};

    let currentStoryId: string | null = null;
    const lines = content.split('\n');

    for (const line of lines) {
      const storyMatch = line.match(/^##\s+User Story:\s+(US-\d+)/);
      if (storyMatch) {
        currentStoryId = storyMatch[1];
        tasks[currentStoryId] = [];
      } else if (currentStoryId) {
        const taskMatch = line.match(/^-\s+\[([ x])\]\s+(.+?)(?:\s+\(Jira: .+\))?$/);
        if (taskMatch) {
          tasks[currentStoryId].push({
            description: taskMatch[2],
            completed: taskMatch[1] === 'x'
          });
        }
      }
    }

    return tasks;
  }

  private async updateSpecWithJiraMetadata(
    specPath: string,
    epic: JiraIssue,
    stories: JiraIssue[]
  ): Promise<void> {
    const content = fs.readFileSync(specPath, 'utf-8');
    const parsed = this.parseMarkdownWithFrontmatter(content);

    parsed.frontmatter.jira = {
      epic_key: epic.key,
      epic_id: epic.id,
      epic_url: `https://${process.env.JIRA_DOMAIN}/browse/${epic.key}`,
      stories: stories.map(s => ({ key: s.key, id: s.id })),
      last_sync: new Date().toISOString(),
      sync_direction: 'export'
    };

    const updated = this.serializeMarkdownWithFrontmatter(parsed.frontmatter, parsed.content);
    fs.writeFileSync(specPath, updated, 'utf-8');
  }

  private mapJiraStatusToSpecWeave(jiraStatus: string): 'planned' | 'in-progress' | 'completed' | 'cancelled' {
    const statusLower = jiraStatus.toLowerCase();
    if (statusLower.includes('to do') || statusLower.includes('backlog')) return 'planned';
    if (statusLower.includes('in progress')) return 'in-progress';
    if (statusLower.includes('done') || statusLower.includes('complete')) return 'completed';
    return 'planned';
  }

  private mapJiraPriorityToSpecWeave(jiraPriority: string | undefined): 'P1' | 'P2' | 'P3' {
    if (!jiraPriority) return 'P3';
    const priorityLower = jiraPriority.toLowerCase();
    if (priorityLower.includes('highest') || priorityLower.includes('critical')) return 'P1';
    if (priorityLower.includes('high')) return 'P2';
    return 'P3';
  }

  private mapPriorityToJira(priority: string): string {
    if (priority === 'P1') return 'Highest';
    if (priority === 'P2') return 'High';
    return 'Medium';
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
