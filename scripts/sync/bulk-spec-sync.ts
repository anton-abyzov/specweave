#!/usr/bin/env node
/**
 * Bulk Spec Sync to GitHub
 *
 * Syncs ALL permanent specs to GitHub issues with:
 * - Readable titles (not folder names)
 * - User stories as checkboxes
 * - Tasks from increments as checkboxes
 * - Auto-update capability via hooks
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { GitHubClientV2 } from '../dist/plugins/specweave-github/lib/github-client-v2.js';

interface UserStory {
  id: string;
  title: string;
  file: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  incrementId: string;
  userStories: string[];
  completed: boolean;
}

interface Feature {
  id: string;
  folder: string;
  title: string;
  status: string;
  userStories: UserStory[];
  tasks: Task[];
  increments: string[];
}

const SPECS_DIR = '.specweave/docs/internal/specs/default';
const INCREMENTS_DIR = '.specweave/increments';

async function main() {
  const owner = 'anton-abyzov';
  const repo = 'specweave';
  const client = GitHubClientV2.fromRepo(owner, repo);

  console.log('🔍 Scanning all features in', SPECS_DIR);

  // Find all feature folders
  const entries = await fs.readdir(SPECS_DIR, { withFileTypes: true });
  const featureFolders = entries
    .filter(e => e.isDirectory() && e.name.startsWith('FS-'))
    .map(e => e.name)
    .sort();

  console.log(`\n📦 Found ${featureFolders.length} features\n`);

  for (const folder of featureFolders) {
    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Processing: ${folder}`);
      console.log('='.repeat(80));

      const feature = await parseFeature(folder);

      if (!feature) {
        console.log(`⚠️  Skipping ${folder} (no FEATURE.md or invalid)`);
        continue;
      }

      console.log(`\n📄 Feature: ${feature.title}`);
      console.log(`   User Stories: ${feature.userStories.length}`);
      console.log(`   Tasks: ${feature.tasks.length}`);
      console.log(`   Increments: ${feature.increments.join(', ')}`);

      // Build GitHub issue content
      const issueTitle = buildIssueTitle(feature);
      const issueBody = await buildIssueBody(feature);

      // Determine labels based on feature status
      const labels = ['specweave']; // Always include specweave to differentiate from user issues
      if (feature.status === 'complete' || feature.status === 'closed') {
        labels.push('enhancement'); // Completed features
      } else if (feature.status === 'active' || feature.status === 'planning') {
        labels.push('enhancement'); // Active features
      } else {
        labels.push('enhancement'); // Default to enhancement
      }

      console.log(`\n📝 Creating GitHub issue...`);
      console.log(`   Title: ${issueTitle}`);
      console.log(`   Labels: ${labels.join(', ')}`);

      // Create GitHub issue
      const issue = await client.createEpicIssue(
        issueTitle,
        issueBody,
        undefined,
        labels
      );

      console.log(`✅ Created issue #${issue.number}`);
      console.log(`   URL: ${issue.html_url}`);

      // Update FEATURE.md with GitHub link
      await updateFeatureWithGitHubLink(folder, issue.number, issue.html_url);
      console.log(`✅ Updated FEATURE.md with GitHub link`);

      // Close issue if feature is complete (all user stories + tasks done)
      const allUsComplete = feature.userStories.length > 0 &&
                           feature.userStories.every(us => us.completed);
      const allTasksComplete = feature.tasks.length > 0 &&
                               feature.tasks.every(t => t.completed);
      const featureComplete = feature.status === 'complete' &&
                             allUsComplete &&
                             (feature.tasks.length === 0 || allTasksComplete);

      if (featureComplete) {
        console.log(`\n🔒 Feature is complete - closing GitHub issue...`);
        await client.closeIssue(issue.number, '✅ Feature complete - all user stories and tasks implemented.');
        console.log(`✅ GitHub issue #${issue.number} closed`);
      }

    } catch (error: any) {
      console.error(`❌ Error processing ${folder}:`, error.message);
      continue;
    }
  }

  console.log(`\n\n${'='.repeat(80)}`);
  console.log('✅ Bulk sync complete!');
  console.log('='.repeat(80));
}

async function parseFeature(folder: string): Promise<Feature | null> {
  const featurePath = path.join(SPECS_DIR, folder);
  const featureFilePath = path.join(featurePath, 'FEATURE.md');

  try {
    await fs.access(featureFilePath);
  } catch {
    return null; // No FEATURE.md
  }

  const content = await fs.readFile(featureFilePath, 'utf-8');
  const { data: frontmatter, content: markdownContent } = matter(content);

  // Extract title
  const titleMatch = markdownContent.match(/^# (.+)/m);
  const title = frontmatter.title || titleMatch?.[1] || folder;

  // Find user stories
  const userStories = await parseUserStories(featurePath);

  // Find increments from implementation history
  const increments = extractIncrements(markdownContent);

  // Load tasks from increments
  const tasks = await loadTasksFromIncrements(increments);

  return {
    id: folder,
    folder,
    title,
    status: frontmatter.status || 'unknown',
    userStories,
    tasks,
    increments
  };
}

async function parseUserStories(featurePath: string): Promise<UserStory[]> {
  const userStories: UserStory[] = [];

  try {
    const files = await fs.readdir(featurePath);
    const usFiles = files.filter(f => f.startsWith('us-') && f.endsWith('.md')).sort();

    for (const file of usFiles) {
      const content = await fs.readFile(path.join(featurePath, file), 'utf-8');
      const { data: frontmatter } = matter(content);

      const titleMatch = content.match(/^# (US-\d+): (.+)/m);
      const usId = frontmatter.id || titleMatch?.[1] || file.replace('.md', '');
      const usTitle = frontmatter.title || titleMatch?.[2] || file.replace('.md', '');

      userStories.push({
        id: usId,
        title: usTitle,
        file,
        completed: frontmatter.status === 'complete'
      });
    }
  } catch {
    // No user stories
  }

  return userStories;
}

function extractIncrements(markdown: string): string[] {
  const increments: string[] = [];

  // Match increment links in implementation history
  const incrementRegex = /\[(\d{4}-[a-z-]+)\]/g;
  let match;

  while ((match = incrementRegex.exec(markdown)) !== null) {
    if (!increments.includes(match[1])) {
      increments.push(match[1]);
    }
  }

  return increments.sort();
}

async function loadTasksFromIncrements(incrementIds: string[]): Promise<Task[]> {
  const allTasks: Task[] = [];

  for (const incrementId of incrementIds) {
    const tasksPath = path.join(INCREMENTS_DIR, incrementId, 'tasks.md');
    const metadataPath = path.join(INCREMENTS_DIR, incrementId, 'metadata.json');

    // Check if increment is complete by reading metadata.json
    let incrementComplete = false;
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      incrementComplete = metadata.status === 'complete' || metadata.status === 'closed';
    } catch {
      // No metadata, check tasks individually
    }

    try {
      const content = await fs.readFile(tasksPath, 'utf-8');

      // Parse tasks (### heading level)
      const taskRegex = /^### (T-\d+): (.+)$/gm;
      let match;

      while ((match = taskRegex.exec(content)) !== null) {
        const taskId = match[1];
        const title = match[2];

        // Extract task section
        const taskSection = extractTaskSection(content, taskId);

        // Extract user stories from AC field
        const userStories = extractUserStoriesFromTask(taskSection);

        // Check if completed - improved detection
        const completed = incrementComplete || // If increment is complete, all tasks are complete
                         taskSection.includes('[x] Completed') ||
                         taskSection.includes('✅') ||
                         taskSection.includes('Status: ✅ Complete') ||
                         title.includes('✅');

        allTasks.push({
          id: taskId,
          title,
          incrementId,
          userStories,
          completed
        });
      }
    } catch {
      // Increment doesn't have tasks.md
    }
  }

  return allTasks;
}

function extractTaskSection(content: string, taskId: string): string {
  const startRegex = new RegExp(`^###\\s+${taskId}:`, 'm');
  const startMatch = content.match(startRegex);

  if (!startMatch) return '';

  const startIndex = startMatch.index!;
  const nextTaskMatch = content.slice(startIndex + 1).match(/^###\s+T-\d+:/m);
  const endIndex = nextTaskMatch
    ? startIndex + 1 + nextTaskMatch.index!
    : content.length;

  return content.slice(startIndex, endIndex);
}

function extractUserStoriesFromTask(taskSection: string): string[] {
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

function buildIssueTitle(feature: Feature): string {
  // Extract FS-YY-MM-DD prefix only
  const fsPrefix = feature.folder.match(/^(FS-\d{2}-\d{2}-\d{2})/)?.[1] || feature.id;

  // Use title from frontmatter or extract from folder name
  let title = feature.title;

  // If title is the folder name, make it readable
  if (title === feature.folder || title.startsWith('FS-')) {
    // Remove FS-XX-XX-XX- prefix
    title = feature.folder.replace(/^FS-\d{2}-\d{2}-\d{2}-/, '');

    // Convert kebab-case to Title Case
    title = title
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Return only [FS-YY-MM-DD] prefix, not full folder name
  return `[${fsPrefix}] ${title}`;
}

async function buildIssueBody(feature: Feature): Promise<string> {
  const sections: string[] = [];

  // Feature Overview
  sections.push(`## Feature Overview\n\n${feature.title}\n\n**Status**: ${feature.status}`);

  // User Stories
  if (feature.userStories.length > 0) {
    sections.push(`## User Stories\n`);

    const usItems = feature.userStories.map(us => {
      const checkbox = us.completed ? '[x]' : '[ ]';
      return `- ${checkbox} [${us.id}: ${us.title}](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/default/${feature.folder}/${us.file})`;
    });

    sections.push(usItems.join('\n'));

    const completedUs = feature.userStories.filter(us => us.completed).length;
    const totalUs = feature.userStories.length;
    const usProgress = totalUs > 0 ? Math.round((completedUs / totalUs) * 100) : 0;

    sections.push(`\n**User Stories Progress**: ${completedUs}/${totalUs} (${usProgress}%)`);
  }

  // Tasks from Increments
  if (feature.tasks.length > 0) {
    sections.push(`## Implementation Tasks\n`);

    // Group tasks by increment
    const tasksByIncrement = new Map<string, Task[]>();
    for (const task of feature.tasks) {
      if (!tasksByIncrement.has(task.incrementId)) {
        tasksByIncrement.set(task.incrementId, []);
      }
      tasksByIncrement.get(task.incrementId)!.push(task);
    }

    for (const [incrementId, tasks] of tasksByIncrement) {
      // Validate increment exists before creating link
      const incrementPath = path.join(INCREMENTS_DIR, incrementId);
      let incrementLink = incrementId; // Default to plain text
      try {
        await fs.access(incrementPath);
        // Increment exists, create link
        incrementLink = `[${incrementId}](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments/${incrementId})`;
      } catch {
        // Increment doesn't exist, use plain text
        console.warn(`⚠️  Increment ${incrementId} not found, using plain text`);
      }

      sections.push(`\n### Increment: ${incrementLink}\n`);

      const taskItems = tasks.map(t => {
        const checkbox = t.completed ? '[x]' : '[ ]';
        const usLinks = t.userStories.length > 0
          ? ` (${t.userStories.join(', ')})`
          : '';
        return `- ${checkbox} **${t.id}**: ${t.title}${usLinks}`;
      });

      sections.push(taskItems.join('\n'));
    }

    const completedTasks = feature.tasks.filter(t => t.completed).length;
    const totalTasks = feature.tasks.length;
    const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    sections.push(`\n**Tasks Progress**: ${completedTasks}/${totalTasks} (${taskProgress}%)`);
  }

  // Implementation History
  if (feature.increments.length > 0) {
    sections.push(`## Implementation History\n`);
    sections.push(`| Increment | Status |`);
    sections.push(`|-----------|--------|`);

    for (const incrementId of feature.increments) {
      const incrementTasks = feature.tasks.filter(t => t.incrementId === incrementId);
      const completedIncrementTasks = incrementTasks.filter(t => t.completed).length;
      const status = completedIncrementTasks === incrementTasks.length && incrementTasks.length > 0
        ? '✅ Complete'
        : '🔄 In Progress';

      // Validate increment exists before creating link
      const incrementPath = path.join(INCREMENTS_DIR, incrementId);
      let incrementCell = incrementId;
      try {
        await fs.access(incrementPath);
        incrementCell = `[${incrementId}](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments/${incrementId})`;
      } catch {
        // Increment doesn't exist, use plain text
      }

      sections.push(`| ${incrementCell} | ${status} |`);
    }
  }

  // Links
  sections.push(`## Links\n`);
  sections.push(`- **Spec**: [\`FEATURE.md\`](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/default/${feature.folder}/FEATURE.md)`);
  sections.push(`- **User Stories**: [View all](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/docs/internal/specs/default/${feature.folder})`);

  // Footer
  sections.push(`\n---\n\n🔗 This issue tracks the **permanent feature spec**.`);
  sections.push(`Tasks auto-update when increments progress.`);

  return sections.join('\n\n');
}

async function updateFeatureWithGitHubLink(folder: string, issueNumber: number, issueUrl: string): Promise<void> {
  const featureFilePath = path.join(SPECS_DIR, folder, 'FEATURE.md');

  let content = await fs.readFile(featureFilePath, 'utf-8');

  // Check if External Tool Integration section exists
  if (content.includes('## External Tool Integration')) {
    // Update existing section
    content = content.replace(
      /\*\*GitHub (?:Project|Issue)\*\*: .*/,
      `**GitHub Issue**: [#${issueNumber} - Feature](${issueUrl})`
    );
  } else {
    // Add new section before the end
    content += `\n\n## External Tool Integration\n\n`;
    content += `**GitHub Issue**: [#${issueNumber} - Feature](${issueUrl})\n`;
  }

  await fs.writeFile(featureFilePath, content);
}

// Run
main().catch(console.error);
