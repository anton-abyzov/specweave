/**
 * Spec-to-Increment Mapper
 *
 * Maps permanent living docs specs to specific increment tasks.
 * Enables traceability: "Which increment implemented US-001?"
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export interface TaskInfo {
  id: string;
  title: string;
  incrementId: string;
  userStories: string[];
  githubIssue?: number;
  status?: 'pending' | 'in-progress' | 'completed';
}

export interface IncrementInfo {
  id: string;
  tasks: TaskInfo[];
  specId?: string;
}

export interface SpecIncrementMapping {
  specId: string;
  increments: IncrementInfo[];
  userStoryMappings: Record<string, TaskInfo[]>; // US-001 -> [T-001, T-002]
}

export interface TraceabilityReport {
  specId: string;
  totalUserStories: number;
  totalIncrements: number;
  totalTasks: number;
  coverage: number; // Percentage of user stories with task mappings
  unmappedUserStories: string[];
  mappingDetails: Record<string, { incrementId: string; taskIds: string[] }[]>;
}

export class SpecIncrementMapper {
  constructor(private rootDir: string = process.cwd()) {}

  /**
   * Map a spec to all increments that implement it
   */
  async mapSpecToIncrements(specId: string): Promise<SpecIncrementMapping> {
    const increments = await this.findIncrementsForSpec(specId);
    const userStoryMappings: Record<string, TaskInfo[]> = {};

    // Build user story to task mappings
    for (const increment of increments) {
      for (const task of increment.tasks) {
        for (const userStoryId of task.userStories) {
          if (!userStoryMappings[userStoryId]) {
            userStoryMappings[userStoryId] = [];
          }
          userStoryMappings[userStoryId].push(task);
        }
      }
    }

    return {
      specId,
      increments,
      userStoryMappings
    };
  }

  /**
   * Find all increments that implement a specific user story
   */
  async findIncrementsByUserStory(userStoryId: string): Promise<IncrementInfo[]> {
    const incrementsDir = path.join(this.rootDir, '.specweave/increments');

    try {
      const entries = await fs.readdir(incrementsDir, { withFileTypes: true });
      const incrementDirs = entries
        .filter(e => e.isDirectory() && /^\d{4}-/.test(e.name))
        .map(e => e.name);

      const results: IncrementInfo[] = [];

      for (const incrementId of incrementDirs) {
        const tasks = await this.getTasksFromIncrement(incrementId);
        const relevantTasks = tasks.filter(t => t.userStories.includes(userStoryId));

        if (relevantTasks.length > 0) {
          results.push({
            id: incrementId,
            tasks: relevantTasks
          });
        }
      }

      return results;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all tasks that implement a specific user story
   */
  async getTasksForUserStory(userStoryId: string): Promise<TaskInfo[]> {
    const increments = await this.findIncrementsByUserStory(userStoryId);
    const tasks: TaskInfo[] = [];

    for (const increment of increments) {
      tasks.push(...increment.tasks);
    }

    return tasks;
  }

  /**
   * Update spec with increment links in frontmatter (Forward link)
   */
  async updateSpecWithIncrementLinks(specId: string, incrementId: string): Promise<boolean> {
    const specPath = await this.findSpecPath(specId);

    if (!specPath) {
      return false;
    }

    try {
      const content = await fs.readFile(specPath, 'utf-8');
      const { data: frontmatter, content: markdownContent } = matter(content);

      // Initialize linked_increments if not exists
      if (!frontmatter.linked_increments) {
        frontmatter.linked_increments = [];
      }

      // Check if already linked
      if (frontmatter.linked_increments.includes(incrementId)) {
        return false; // Already linked
      }

      // Add new increment link
      frontmatter.linked_increments.push(incrementId);

      // Write back
      const updated = matter.stringify(markdownContent, frontmatter);
      await fs.writeFile(specPath, updated);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update increment with spec link in frontmatter (Backward link)
   */
  async updateIncrementWithSpecLink(incrementId: string, specId: string): Promise<boolean> {
    const incrementSpecPath = path.join(
      this.rootDir,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    try {
      await fs.access(incrementSpecPath);
    } catch {
      return false; // Increment spec.md doesn't exist
    }

    try {
      const content = await fs.readFile(incrementSpecPath, 'utf-8');
      const { data: frontmatter, content: markdownContent } = matter(content);

      // Check if already linked
      if (frontmatter.spec_id === specId || frontmatter.source_spec === specId) {
        return false; // Already linked
      }

      // Add spec link
      frontmatter.source_spec = specId;

      // Write back
      const updated = matter.stringify(markdownContent, frontmatter);
      await fs.writeFile(incrementSpecPath, updated);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create bidirectional link between spec and increment (atomic operation)
   */
  async createBidirectionalLink(specId: string, incrementId: string): Promise<{
    success: boolean;
    forwardLink: boolean;
    backwardLink: boolean;
  }> {
    const forwardLink = await this.updateSpecWithIncrementLinks(specId, incrementId);
    const backwardLink = await this.updateIncrementWithSpecLink(incrementId, specId);

    return {
      success: forwardLink || backwardLink,
      forwardLink,
      backwardLink
    };
  }

  /**
   * Get spec for a given increment (reverse lookup)
   */
  async getSpecForIncrement(incrementId: string): Promise<string | null> {
    const incrementSpecPath = path.join(
      this.rootDir,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    try {
      const content = await fs.readFile(incrementSpecPath, 'utf-8');
      const { data: frontmatter } = matter(content);

      // Check both field names for compatibility
      return frontmatter.source_spec || frontmatter.spec_id || null;
    } catch {
      return null;
    }
  }

  /**
   * Validate bidirectional links and detect broken references
   */
  async validateLinks(): Promise<{
    valid: boolean;
    brokenForwardLinks: { specId: string; incrementId: string }[];
    brokenBackwardLinks: { incrementId: string; specId: string }[];
    orphanedIncrements: string[];
  }> {
    const brokenForwardLinks: { specId: string; incrementId: string }[] = [];
    const brokenBackwardLinks: { incrementId: string; specId: string }[] = [];
    const orphanedIncrements: string[] = [];

    const incrementsDir = path.join(this.rootDir, '.specweave/increments');

    try {
      const entries = await fs.readdir(incrementsDir, { withFileTypes: true });
      const incrementDirs = entries
        .filter(e => e.isDirectory() && /^\d{4}-/.test(e.name))
        .map(e => e.name);

      for (const incrementId of incrementDirs) {
        // Check backward link
        const specId = await this.getSpecForIncrement(incrementId);

        if (!specId) {
          orphanedIncrements.push(incrementId);
          continue;
        }

        // Validate forward link exists
        const specPath = await this.findSpecPath(specId);
        if (specPath) {
          const content = await fs.readFile(specPath, 'utf-8');
          const { data: frontmatter } = matter(content);

          if (!frontmatter.linked_increments?.includes(incrementId)) {
            brokenBackwardLinks.push({ incrementId, specId });
          }
        } else {
          brokenBackwardLinks.push({ incrementId, specId });
        }
      }

      // Check specs for broken forward links
      const specsDir = path.join(this.rootDir, '.specweave/docs/internal/specs');
      const projects = await fs.readdir(specsDir, { withFileTypes: true });

      for (const project of projects.filter(e => e.isDirectory())) {
        const specs = await fs.readdir(path.join(specsDir, project.name));

        for (const specFile of specs.filter(f => f.endsWith('.md'))) {
          const specPath = path.join(specsDir, project.name, specFile);
          const content = await fs.readFile(specPath, 'utf-8');
          const { data: frontmatter } = matter(content);

          if (frontmatter.linked_increments) {
            for (const incrementId of frontmatter.linked_increments) {
              const incrementPath = path.join(incrementsDir, incrementId, 'spec.md');
              try {
                await fs.access(incrementPath);
              } catch {
                brokenForwardLinks.push({
                  specId: specFile.replace('.md', ''),
                  incrementId
                });
              }
            }
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or other error
    }

    return {
      valid: brokenForwardLinks.length === 0 &&
             brokenBackwardLinks.length === 0 &&
             orphanedIncrements.length === 0,
      brokenForwardLinks,
      brokenBackwardLinks,
      orphanedIncrements
    };
  }

  /**
   * Build complete traceability report for a spec
   */
  async buildTraceabilityReport(specId: string): Promise<TraceabilityReport> {
    const mapping = await this.mapSpecToIncrements(specId);
    const userStories = await this.getUserStoriesFromSpec(specId);

    const totalUserStories = userStories.length;
    const totalIncrements = mapping.increments.length;
    const totalTasks = mapping.increments.reduce((sum, inc) => sum + inc.tasks.length, 0);

    const mappedUserStories = Object.keys(mapping.userStoryMappings).filter(us => userStories.includes(us));
    const unmappedUserStories = userStories.filter(us => !mappedUserStories.includes(us));
    const coverage = totalUserStories > 0
      ? Math.min(100, (mappedUserStories.length / totalUserStories) * 100)
      : 0;

    // Build detailed mapping
    const mappingDetails: Record<string, { incrementId: string; taskIds: string[] }[]> = {};
    for (const [userStoryId, tasks] of Object.entries(mapping.userStoryMappings)) {
      const incrementGroups: Record<string, string[]> = {};

      for (const task of tasks) {
        if (!incrementGroups[task.incrementId]) {
          incrementGroups[task.incrementId] = [];
        }
        incrementGroups[task.incrementId].push(task.id);
      }

      mappingDetails[userStoryId] = Object.entries(incrementGroups).map(([incrementId, taskIds]) => ({
        incrementId,
        taskIds
      }));
    }

    return {
      specId,
      totalUserStories,
      totalIncrements,
      totalTasks,
      coverage,
      unmappedUserStories,
      mappingDetails
    };
  }

  // Private helper methods

  private async findIncrementsForSpec(specId: string): Promise<IncrementInfo[]> {
    const incrementsDir = path.join(this.rootDir, '.specweave/increments');

    try {
      const entries = await fs.readdir(incrementsDir, { withFileTypes: true });
      const incrementDirs = entries
        .filter(e => e.isDirectory() && /^\d{4}-/.test(e.name))
        .map(e => e.name);

      const results: IncrementInfo[] = [];

      for (const incrementId of incrementDirs) {
        const specPath = path.join(incrementsDir, incrementId, 'spec.md');

        try {
          const content = await fs.readFile(specPath, 'utf-8');
          const { data: frontmatter } = matter(content);

          // Check if this increment references our spec
          if (frontmatter.spec_id === specId || content.includes(`spec-${specId}`)) {
            const tasks = await this.getTasksFromIncrement(incrementId);
            results.push({
              id: incrementId,
              tasks,
              specId
            });
          }
        } catch {
          // Skip if spec.md doesn't exist
        }
      }

      return results;
    } catch (error) {
      return [];
    }
  }

  private async getTasksFromIncrement(incrementId: string): Promise<TaskInfo[]> {
    const tasksPath = path.join(this.rootDir, '.specweave/increments', incrementId, 'tasks.md');

    try {
      const content = await fs.readFile(tasksPath, 'utf-8');
      const { data: frontmatter } = matter(content);
      const tasks: TaskInfo[] = [];

      // Parse tasks from markdown
      const taskRegex = /^##\s+(T-\d+):\s+(.+)$/gm;
      let match;

      while ((match = taskRegex.exec(content)) !== null) {
        const taskId = match[1];
        const title = match[2];

        // Extract user stories for this task
        const taskSection = this.extractTaskSection(content, taskId);
        const userStories = this.extractUserStoriesFromTask(taskSection);
        const githubIssue = this.extractGithubIssue(taskSection);
        const status = this.extractTaskStatus(taskSection);

        tasks.push({
          id: taskId,
          title,
          incrementId,
          userStories,
          githubIssue,
          status
        });
      }

      return tasks;
    } catch (error) {
      return [];
    }
  }

  private extractTaskSection(content: string, taskId: string): string {
    const startRegex = new RegExp(`^##\\s+${taskId}:`, 'm');
    const startMatch = content.match(startRegex);

    if (!startMatch) return '';

    const startIndex = startMatch.index!;
    const nextTaskMatch = content.slice(startIndex + 1).match(/^##\s+T-\d+:/m);
    const endIndex = nextTaskMatch
      ? startIndex + 1 + nextTaskMatch.index!
      : content.length;

    return content.slice(startIndex, endIndex);
  }

  private extractUserStoriesFromTask(taskSection: string): string[] {
    // Look for AC references: AC-US1-01, AC-US2-01, etc.
    const acRegex = /AC-US(\d+)-\d+/g;
    const matches = [...taskSection.matchAll(acRegex)];
    const userStoryNumbers = new Set(matches.map(m => m[1]));

    // Also look for explicit "Implements: US-001, US-002"
    const implementsMatch = taskSection.match(/Implements:\s*([^\n]+)/);
    if (implementsMatch) {
      const usMatches = implementsMatch[1].matchAll(/US-(\d+)/g);
      for (const match of usMatches) {
        userStoryNumbers.add(match[1]);
      }
    }

    return Array.from(userStoryNumbers).map(num => `US-${num}`);
  }

  private extractGithubIssue(taskSection: string): number | undefined {
    const match = taskSection.match(/github.*#(\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private extractTaskStatus(taskSection: string): 'pending' | 'in-progress' | 'completed' {
    if (taskSection.includes('[x] Completed') || taskSection.includes('✅')) {
      return 'completed';
    }
    if (taskSection.includes('[ ] In Progress') || taskSection.includes('🔄')) {
      return 'in-progress';
    }
    return 'pending';
  }

  private async findSpecPath(specId: string): Promise<string | null> {
    const specsDir = path.join(this.rootDir, '.specweave/docs/internal/specs');

    try {
      // Try default project first
      const defaultPath = path.join(specsDir, 'default', `${specId}.md`);
      try {
        await fs.access(defaultPath);
        return defaultPath;
      } catch {
        // Not in default, search all projects
      }

      // Search all project folders
      const entries = await fs.readdir(specsDir, { withFileTypes: true });
      const projectDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

      for (const project of projectDirs) {
        const specPath = path.join(specsDir, project, `${specId}.md`);
        try {
          await fs.access(specPath);
          return specPath;
        } catch {
          continue;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async getUserStoriesFromSpec(specId: string): Promise<string[]> {
    const specPath = await this.findSpecPath(specId);

    if (!specPath) {
      return [];
    }

    try {
      const content = await fs.readFile(specPath, 'utf-8');
      const userStoryRegex = /\*\*(US-\d+)\*\*:/g;
      const matches = [...content.matchAll(userStoryRegex)];
      return matches.map(m => m[1]);
    } catch (error) {
      return [];
    }
  }
}
