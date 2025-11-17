#!/usr/bin/env node

/**
 * Migration Script: Copy-Based Sync
 *
 * Migrates existing increments to copy-based sync format by:
 * 1. Scanning all increments in .specweave/increments/
 * 2. For each increment, finding User Stories in living docs
 * 3. Adding ## Implementation section if missing
 * 4. Copying Tasks from increment tasks.md (filtered by AC-ID)
 *
 * Usage:
 * - Dry run (preview): npm run migrate:copy-sync -- --dry-run
 * - Migrate all: npm run migrate:copy-sync
 * - Migrate specific: npm run migrate:copy-sync -- 0031
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * Increment info
 */
interface IncrementInfo {
  id: string;
  path: string;
  userStories: UserStoryInfo[];
}

/**
 * User Story info
 */
interface UserStoryInfo {
  id: string;
  path: string;
  hasImplementationSection: boolean;
  acIds: string[];
}

/**
 * Task info
 */
interface TaskInfo {
  id: string;
  title: string;
  completed: boolean;
  acIds: string[];
}

/**
 * Migration options
 */
interface MigrationOptions {
  dryRun?: boolean;
  incrementId?: string;
}

/**
 * Migration script
 */
class CopyBasedSyncMigration {
  private projectRoot: string;
  private incrementsPath: string;
  private livingDocsPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.incrementsPath = path.join(projectRoot, '.specweave', 'increments');
    this.livingDocsPath = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');
  }

  /**
   * Run migration
   */
  async migrate(options: MigrationOptions = {}): Promise<void> {
    console.log('🔄 Copy-Based Sync Migration');
    console.log('============================\n');

    if (options.dryRun) {
      console.log('ℹ️  DRY RUN MODE - No files will be modified\n');
    }

    // 1. Scan increments
    const increments = await this.scanIncrements(options.incrementId);
    console.log(`📦 Found ${increments.length} increment(s)\n`);

    if (increments.length === 0) {
      console.log('✅ No increments to migrate');
      return;
    }

    // 2. Migrate each increment
    let totalUserStoriesUpdated = 0;

    for (const increment of increments) {
      console.log(`\n📂 Processing increment: ${increment.id}`);

      // Read increment tasks
      const tasks = await this.readIncrementTasks(increment.path);
      console.log(`   Found ${tasks.length} tasks`);

      // Migrate each user story
      for (const userStory of increment.userStories) {
        if (userStory.hasImplementationSection) {
          console.log(`   ✓ ${userStory.id} - Already has ## Implementation section`);
          continue;
        }

        // Filter tasks by AC-IDs
        const userStoryTasks = tasks.filter(task =>
          task.acIds.some(acId => userStory.acIds.includes(acId))
        );

        if (userStoryTasks.length === 0) {
          console.log(`   ⚠️  ${userStory.id} - No tasks found for this user story`);
          continue;
        }

        // Add ## Implementation section
        if (!options.dryRun) {
          await this.addImplementationSection(userStory.path, userStoryTasks);
        }

        console.log(`   ✅ ${userStory.id} - Added ## Implementation with ${userStoryTasks.length} tasks`);
        totalUserStoriesUpdated++;
      }
    }

    console.log(`\n============================`);
    console.log(`✅ Migration complete: ${totalUserStoriesUpdated} user stories updated`);

    if (options.dryRun) {
      console.log(`\nTo apply changes, run without --dry-run flag`);
    }
  }

  /**
   * Scan increments
   */
  private async scanIncrements(specificIncrementId?: string): Promise<IncrementInfo[]> {
    const increments: IncrementInfo[] = [];

    if (!existsSync(this.incrementsPath)) {
      return increments;
    }

    const entries = await fs.readdir(this.incrementsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const incrementId = entry.name;

      // Filter by specific increment if provided
      if (specificIncrementId && incrementId !== specificIncrementId) {
        continue;
      }

      const incrementPath = path.join(this.incrementsPath, incrementId);
      const tasksPath = path.join(incrementPath, 'tasks.md');

      // Skip if no tasks.md
      if (!existsSync(tasksPath)) {
        continue;
      }

      // Find user stories for this increment
      const userStories = await this.findUserStories(incrementId);

      if (userStories.length > 0) {
        increments.push({
          id: incrementId,
          path: incrementPath,
          userStories
        });
      }
    }

    return increments;
  }

  /**
   * Find user stories for an increment
   */
  private async findUserStories(incrementId: string): Promise<UserStoryInfo[]> {
    const userStories: UserStoryInfo[] = [];

    // Search in living docs
    const userStoryFiles = await this.findMarkdownFiles(this.livingDocsPath, 'us-*.md');

    for (const filePath of userStoryFiles) {
      const content = await fs.readFile(filePath, 'utf-8');

      // Check if this user story belongs to the increment
      if (content.includes(incrementId)) {
        const userStoryId = await this.extractUserStoryId(content);
        const hasImplementationSection = this.hasImplementationSection(content);
        const acIds = this.extractAcIds(content);

        userStories.push({
          id: userStoryId,
          path: filePath,
          hasImplementationSection,
          acIds
        });
      }
    }

    return userStories;
  }

  /**
   * Read tasks from increment tasks.md
   */
  private async readIncrementTasks(incrementPath: string): Promise<TaskInfo[]> {
    const tasks: TaskInfo[] = [];
    const tasksPath = path.join(incrementPath, 'tasks.md');

    if (!existsSync(tasksPath)) {
      return tasks;
    }

    const content = await fs.readFile(tasksPath, 'utf-8');

    // Parse tasks
    const taskPattern = /### (T-\d+):.*?(?=###|$)/gs;
    const matches = content.matchAll(taskPattern);

    for (const match of matches) {
      const taskId = match[1];
      const taskContent = match[0];

      // Extract title
      const titleMatch = taskContent.match(/### T-\d+:\s*(.+?)$/m);
      const title = titleMatch ? titleMatch[1].trim() : '';

      // Extract AC-IDs
      const acIdMatches = taskContent.matchAll(/AC-([\w]+-\d+)/g);
      const acIds = Array.from(acIdMatches, m => `AC-${m[1]}`);

      // Check completion status
      const completedMatch = taskContent.match(/\*\*Completed\*\*:\s*(\d{4}-\d{2}-\d{2})/);
      const completed = !!completedMatch;

      tasks.push({
        id: taskId,
        title,
        completed,
        acIds
      });
    }

    return tasks;
  }

  /**
   * Add ## Implementation section to user story
   */
  private async addImplementationSection(
    userStoryPath: string,
    tasks: TaskInfo[]
  ): Promise<void> {
    let content = await fs.readFile(userStoryPath, 'utf-8');

    // Build ## Implementation section
    const implementationSection = this.buildImplementationSection(tasks);

    // Find insertion point (before ## Business Rationale or at end)
    const insertBefore = content.search(/##\s*Business Rationale/i);

    if (insertBefore !== -1) {
      // Insert before Business Rationale
      content = content.slice(0, insertBefore) + implementationSection + '\n' + content.slice(insertBefore);
    } else {
      // Append at end
      content = content.trimEnd() + '\n\n' + implementationSection;
    }

    await fs.writeFile(userStoryPath, content, 'utf-8');
  }

  /**
   * Build ## Implementation section
   */
  private buildImplementationSection(tasks: TaskInfo[]): string {
    const lines: string[] = [];

    lines.push('## Implementation');
    lines.push('');

    for (const task of tasks) {
      const checkbox = task.completed ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} **${task.id}**: ${task.title}`);
    }

    lines.push('');
    lines.push('> **Note**: Tasks are project-specific. See increment tasks.md for full list.');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Find markdown files matching pattern
   */
  private async findMarkdownFiles(dir: string, pattern: string): Promise<string[]> {
    const files: string[] = [];

    if (!existsSync(dir)) {
      return files;
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...await this.findMarkdownFiles(fullPath, pattern));
      } else if (entry.isFile() && this.matchPattern(entry.name, pattern)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Match file name against pattern
   */
  private matchPattern(fileName: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(fileName);
  }

  /**
   * Extract user story ID from content
   */
  private async extractUserStoryId(content: string): Promise<string> {
    const match = content.match(/id:\s*([^\n]+)/);
    return match ? match[1].trim() : 'Unknown';
  }

  /**
   * Check if user story has ## Implementation section
   */
  private hasImplementationSection(content: string): boolean {
    return /##\s*Implementation/i.test(content);
  }

  /**
   * Extract AC-IDs from user story
   */
  private extractAcIds(content: string): string[] {
    const acIds: string[] = [];
    const matches = content.matchAll(/AC-([A-Z0-9]+-\d+)/g);

    for (const match of matches) {
      const acId = `AC-${match[1]}`;
      if (!acIds.includes(acId)) {
        acIds.push(acId);
      }
    }

    return acIds;
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const incrementId = args.find(arg => !arg.startsWith('--'));

  const projectRoot = process.cwd();
  const migration = new CopyBasedSyncMigration(projectRoot);

  try {
    await migration.migrate({ dryRun, incrementId });
  } catch (error) {
    console.error(`\n❌ Migration failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
