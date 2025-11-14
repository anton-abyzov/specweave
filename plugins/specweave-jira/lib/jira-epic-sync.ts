/**
 * JIRA Epic Sync - Hierarchical synchronization for Epic folder structure
 *
 * Architecture:
 * - Epic (FS-001) → JIRA Epic
 * - Increment (0001-core-framework) → JIRA Story (with Epic Link field)
 *
 * This implements the Universal Hierarchy architecture for JIRA.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';
import { JiraClient, JiraIssue, JiraIssueCreate } from '../../../src/integrations/jira/jira-client.js';

interface EpicFrontmatter {
  id: string;
  title: string;
  type: 'epic';
  status: 'complete' | 'active' | 'planning' | 'archived';
  priority: string;
  created: string;
  last_updated: string;
  external_tools: {
    github: {
      type: 'milestone';
      id: number | null;
      url: string | null;
    };
    jira: {
      type: 'epic';
      key: string | null;
      url: string | null;
    };
    ado: {
      type: 'feature';
      id: number | null;
      url: string | null;
    };
  };
  increments: Array<{
    id: string;
    status: string;
    external: {
      github: number | null;
      jira: string | null;
      ado: number | null;
    };
  }>;
  total_increments: number;
  completed_increments: number;
  progress: string;
}

interface IncrementFrontmatter {
  id: string;
  epic: string;
  type?: string;
  status?: string;
  external?: {
    github?: {
      issue: number | null;
      url: string | null;
    };
    jira?: {
      story: string | null;
      url: string | null;
    };
    ado?: {
      user_story: number | null;
      url: string | null;
    };
  };
}

export class JiraEpicSync {
  private client: JiraClient;
  private specsDir: string;
  private projectKey: string;

  constructor(client: JiraClient, specsDir: string, projectKey: string) {
    this.client = client;
    this.specsDir = specsDir;
    this.projectKey = projectKey;
  }

  /**
   * Sync Epic folder to JIRA (Epic + Stories)
   */
  async syncEpicToJira(epicId: string): Promise<{
    epicKey: string;
    epicUrl: string;
    storiesCreated: number;
    storiesUpdated: number;
  }> {
    console.log(`\n🔄 Syncing Epic ${epicId} to JIRA...`);

    // 1. Load Epic README.md
    const epicFolder = await this.findEpicFolder(epicId);
    if (!epicFolder) {
      throw new Error(`Epic ${epicId} not found in ${this.specsDir}`);
    }

    const readmePath = path.join(epicFolder, 'README.md');
    const epicData = await this.parseEpicReadme(readmePath);

    console.log(`   📦 Epic: ${epicData.title}`);
    console.log(`   📊 Increments: ${epicData.total_increments}`);

    // 2. Create or update JIRA Epic
    let epicKey = epicData.external_tools.jira.key;
    let epicUrl = epicData.external_tools.jira.url;

    if (!epicKey) {
      console.log(`   🚀 Creating JIRA Epic...`);
      const epic = await this.createEpic(epicData);
      epicKey = epic.key;
      epicUrl = epic.url;
      console.log(`   ✅ Created Epic ${epicKey}`);

      // Update Epic README with JIRA key
      await this.updateEpicReadme(readmePath, {
        type: 'epic',
        key: epicKey,
        url: epicUrl,
      });
    } else {
      console.log(`   ♻️  Updating existing Epic ${epicKey}...`);
      await this.updateEpic(epicKey, epicData);
      console.log(`   ✅ Updated Epic ${epicKey}`);
    }

    // 3. Sync each increment as JIRA Story
    let storiesCreated = 0;
    let storiesUpdated = 0;

    console.log(`\n   📝 Syncing ${epicData.increments.length} increments...`);

    for (const increment of epicData.increments) {
      const incrementFile = path.join(epicFolder, `${increment.id}.md`);
      if (!(await fs.pathExists(incrementFile))) {
        console.log(`   ⚠️  Increment file not found: ${increment.id}.md`);
        continue;
      }

      const incrementData = await this.parseIncrementFile(incrementFile);
      const existingStory = increment.external.jira;

      if (!existingStory) {
        // Create new Story
        const storyKey = await this.createStory(
          epicData.id,
          incrementData,
          epicKey!
        );
        storiesCreated++;
        console.log(`   ✅ Created Story ${storyKey} for ${increment.id}`);

        // Update Epic README and Increment file
        await this.updateIncrementExternalLink(
          readmePath,
          incrementFile,
          increment.id,
          storyKey
        );
      } else {
        // Update existing Story
        await this.updateStory(
          epicData.id,
          existingStory,
          incrementData,
          epicKey!
        );
        storiesUpdated++;
        console.log(`   ♻️  Updated Story ${existingStory} for ${increment.id}`);
      }
    }

    console.log(`\n✅ Epic sync complete!`);
    console.log(`   Epic: ${epicUrl}`);
    console.log(`   Stories created: ${storiesCreated}`);
    console.log(`   Stories updated: ${storiesUpdated}`);

    return {
      epicKey: epicKey!,
      epicUrl: epicUrl!,
      storiesCreated,
      storiesUpdated,
    };
  }

  /**
   * Find Epic folder by ID (FS-001 or just 001)
   */
  private async findEpicFolder(epicId: string): Promise<string | null> {
    const normalizedId = epicId.startsWith('FS-')
      ? epicId
      : `FS-${epicId.padStart(3, '0')}`;

    const folders = await fs.readdir(this.specsDir);
    for (const folder of folders) {
      if (folder.startsWith(normalizedId)) {
        return path.join(this.specsDir, folder);
      }
    }

    return null;
  }

  /**
   * Parse Epic README.md to extract frontmatter
   */
  private async parseEpicReadme(readmePath: string): Promise<EpicFrontmatter> {
    const content = await fs.readFile(readmePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      throw new Error('Epic README.md missing YAML frontmatter');
    }

    const frontmatter = yaml.parse(match[1]) as EpicFrontmatter;
    return frontmatter;
  }

  /**
   * Parse increment file to extract title and overview
   */
  private async parseIncrementFile(
    filePath: string
  ): Promise<{
    id: string;
    title: string;
    overview: string;
    content: string;
    frontmatter: IncrementFrontmatter;
  }> {
    const content = await fs.readFile(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    let frontmatter: IncrementFrontmatter = { id: '', epic: '' };
    let bodyContent = content;

    if (match) {
      frontmatter = yaml.parse(match[1]) as IncrementFrontmatter;
      bodyContent = content.slice(match[0].length).trim();
    }

    // Extract title
    const titleMatch = bodyContent.match(/^#\s+(.+)$/m);
    const title = titleMatch
      ? titleMatch[1].trim()
      : frontmatter.id || path.basename(filePath, '.md');

    // Extract overview (first paragraph after title)
    const overviewMatch = bodyContent.match(/^#[^\n]+\n+([^\n]+)/);
    const overview = overviewMatch
      ? overviewMatch[1].trim()
      : 'No overview available';

    return {
      id: frontmatter.id,
      title,
      overview,
      content: bodyContent,
      frontmatter,
    };
  }

  /**
   * Create JIRA Epic
   */
  private async createEpic(epic: EpicFrontmatter): Promise<{
    key: string;
    url: string;
  }> {
    const summary = `[${epic.id}] ${epic.title}`;
    const description = `Epic: ${epic.title}\n\nProgress: ${epic.completed_increments}/${epic.total_increments} increments (${epic.progress})\n\nPriority: ${epic.priority}\nStatus: ${epic.status}`;

    const issueData: JiraIssueCreate = {
      issueType: 'Epic',
      summary,
      description,
      priority: this.mapPriorityToJira(epic.priority),
      labels: ['epic-sync', epic.id.toLowerCase()],
    };

    const issue = await this.client.createIssue(issueData, this.projectKey);

    return {
      key: issue.key,
      url: issue.self.replace('/rest/api/3/issue/', '/browse/'),
    };
  }

  /**
   * Update JIRA Epic
   */
  private async updateEpic(epicKey: string, epic: EpicFrontmatter): Promise<void> {
    const summary = `[${epic.id}] ${epic.title}`;
    const description = `Epic: ${epic.title}\n\nProgress: ${epic.completed_increments}/${epic.total_increments} increments (${epic.progress})\n\nPriority: ${epic.priority}\nStatus: ${epic.status}`;

    await this.client.updateIssue({
      key: epicKey,
      summary,
      description,
      priority: this.mapPriorityToJira(epic.priority),
      labels: ['epic-sync', epic.id.toLowerCase()],
    });
  }

  /**
   * Create JIRA Story for increment
   */
  private async createStory(
    epicId: string,
    increment: {
      id: string;
      title: string;
      overview: string;
      content: string;
    },
    epicKey: string
  ): Promise<string> {
    const summary = `[${epicId}] ${increment.title}`;
    const description = `${increment.overview}\n\n---\n\n**Increment**: ${increment.id}\n**Epic**: ${epicId} (${epicKey})\n\n🤖 Auto-created by SpecWeave Epic Sync`;

    const issueData: JiraIssueCreate = {
      issueType: 'Story',
      summary,
      description,
      epicKey, // Link to Epic via Epic Link field
      labels: ['increment', 'epic-sync'],
    };

    const issue = await this.client.createIssue(issueData, this.projectKey);
    return issue.key;
  }

  /**
   * Update JIRA Story for increment
   */
  private async updateStory(
    epicId: string,
    storyKey: string,
    increment: {
      id: string;
      title: string;
      overview: string;
      content: string;
    },
    epicKey: string
  ): Promise<void> {
    const summary = `[${epicId}] ${increment.title}`;
    const description = `${increment.overview}\n\n---\n\n**Increment**: ${increment.id}\n**Epic**: ${epicId} (${epicKey})\n\n🤖 Auto-updated by SpecWeave Epic Sync`;

    await this.client.updateIssue({
      key: storyKey,
      summary,
      description,
      labels: ['increment', 'epic-sync'],
    });
  }

  /**
   * Map SpecWeave priority to JIRA priority
   */
  private mapPriorityToJira(priority: string): string {
    const map: Record<string, string> = {
      P0: 'Highest',
      P1: 'High',
      P2: 'Medium',
      P3: 'Low',
    };
    return map[priority] || 'Medium';
  }

  /**
   * Update Epic README.md with JIRA Epic key
   */
  private async updateEpicReadme(
    readmePath: string,
    jira: { type: 'epic'; key: string; url: string }
  ): Promise<void> {
    const content = await fs.readFile(readmePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      throw new Error('Epic README.md missing YAML frontmatter');
    }

    const frontmatter = yaml.parse(match[1]) as EpicFrontmatter;
    frontmatter.external_tools.jira = jira;

    const newFrontmatter = yaml.stringify(frontmatter);
    const newContent = content.replace(
      /^---\n[\s\S]*?\n---/,
      `---\n${newFrontmatter}---`
    );

    await fs.writeFile(readmePath, newContent, 'utf-8');
  }

  /**
   * Update increment external link in both Epic README and increment file
   */
  private async updateIncrementExternalLink(
    readmePath: string,
    incrementFile: string,
    incrementId: string,
    storyKey: string
  ): Promise<void> {
    const storyUrl = `https://${this.client['credentials'].domain}/browse/${storyKey}`;

    // 1. Update Epic README.md
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    const readmeMatch = readmeContent.match(/^---\n([\s\S]*?)\n---/);

    if (readmeMatch) {
      const frontmatter = yaml.parse(readmeMatch[1]) as EpicFrontmatter;
      const increment = frontmatter.increments.find(
        (inc) => inc.id === incrementId
      );

      if (increment) {
        increment.external.jira = storyKey;
        const newFrontmatter = yaml.stringify(frontmatter);
        const newContent = readmeContent.replace(
          /^---\n[\s\S]*?\n---/,
          `---\n${newFrontmatter}---`
        );
        await fs.writeFile(readmePath, newContent, 'utf-8');
      }
    }

    // 2. Update increment file frontmatter
    const incrementContent = await fs.readFile(incrementFile, 'utf-8');
    const incrementMatch = incrementContent.match(/^---\n([\s\S]*?)\n---/);

    if (incrementMatch) {
      const frontmatter = yaml.parse(incrementMatch[1]) as IncrementFrontmatter;

      if (!frontmatter.external) {
        frontmatter.external = {};
      }

      frontmatter.external.jira = {
        story: storyKey,
        url: storyUrl,
      };

      const newFrontmatter = yaml.stringify(frontmatter);
      const newContent = incrementContent.replace(
        /^---\n[\s\S]*?\n---/,
        `---\n${newFrontmatter}---`
      );
      await fs.writeFile(incrementFile, newContent, 'utf-8');
    }
  }
}
