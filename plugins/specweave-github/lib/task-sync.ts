/**
 * Task-level GitHub synchronization
 * Orchestrates syncing tasks.md to GitHub issues
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { GitHubClient } from './github-client';
import { TaskParser } from './task-parser';
import { Task, IncrementMetadata, SyncResult, GitHubSyncOptions } from './types';

export class TaskSync {
  private client: GitHubClient;
  private incrementPath: string;

  constructor(incrementPath: string, repo?: string) {
    this.incrementPath = incrementPath;
    this.client = new GitHubClient(repo);
  }

  /**
   * Sync all tasks to GitHub (main entry point)
   */
  async syncTasks(options: GitHubSyncOptions = {}): Promise<SyncResult> {
    const {
      force = false,
      dryRun = false,
      batchDelay = 6000,
      batchSize = 10,
      milestoneDays = 2, // SpecWeave default: 2 days (AI velocity)
      projectName,
      fastMode = false
    } = options;

    console.log(`\n🔄 Syncing increment to GitHub...`);

    // 1. Check prerequisites
    const ghCheck = GitHubClient.checkGitHubCLI();
    if (!ghCheck.installed || !ghCheck.authenticated) {
      throw new Error(ghCheck.error || 'GitHub CLI check failed');
    }

    // 2. Load increment metadata
    const metadata = this.loadIncrementMetadata();
    console.log(`📦 Increment: ${metadata.id} - ${metadata.title}`);

    // 3. Parse tasks
    const tasks = TaskParser.parseTasksFile(this.incrementPath);
    console.log(`📋 Found ${tasks.length} tasks`);

    if (dryRun) {
      console.log(`\n🔍 DRY RUN MODE - No changes will be made`);
      this.printDryRunSummary(tasks, metadata);
      return {
        epic: {} as any,
        tasks: [],
        errors: []
      };
    }

    // 4. Check if already synced (and force not set)
    if (metadata.github?.epic_issue && !force) {
      console.log(`\n⚠️  Increment already synced to GitHub (epic #${metadata.github.epic_issue})`);
      console.log(`   Use --force to re-sync (WARNING: will create duplicate issues)`);
      throw new Error('Already synced. Use --force to override.');
    }

    const errors: Array<{ taskId?: string; error: string }> = [];

    try {
      // 5. Create or get milestone (with SpecWeave AI velocity: 1-2 days)
      const milestoneTitle = this.getMilestoneTitle(metadata);
      console.log(`\n📍 Creating milestone: ${milestoneTitle} (due in ${milestoneDays} days)`);
      const milestone = await this.client.createOrGetMilestone(
        milestoneTitle,
        `Milestone for increment ${metadata.id}`,
        milestoneDays
      );
      console.log(`   ✅ Milestone #${milestone.number}: ${milestone.title}`);

      // 6. Create epic issue
      console.log(`\n🎯 Creating epic issue for increment ${metadata.id}...`);

      // Get issue prefix from metadata.json (with created date)
      const issuePrefix = this.getIssuePrefix(metadata.id);

      const epicBody = this.generateEpicBody(metadata, tasks);
      const epic = await this.client.createEpicIssue(
        `[${issuePrefix}] ${metadata.title}`,
        epicBody,
        milestone.title,
        ['increment', 'specweave', metadata.priority.toLowerCase()]
      );
      console.log(`   ✅ Epic issue #${epic.number}: ${epic.html_url}`);

      // 7. Create task issues (with smart rate limiting)
      // Fast mode: Skip delays for small increments (< 10 tasks) or when explicitly requested
      const useFastMode = fastMode || tasks.length < 10;
      const effectiveDelay = useFastMode ? 0 : batchDelay;

      if (useFastMode) {
        console.log(`\n📝 Creating ${tasks.length} task issues (fast mode - no rate limiting)...`);
      } else {
        console.log(`\n📝 Creating ${tasks.length} task issues (batch size: ${batchSize}, delay: ${effectiveDelay}ms)...`);
      }

      const taskIssues: Array<{ taskId: string; issue: any }> = [];
      const issueData = tasks.map(task => ({
        title: `[${task.id}] ${task.title}`,
        body: this.generateTaskBody(task),
        labels: ['task', task.priority.toLowerCase(), ...(task.phase ? [this.slugify(task.phase)] : [])]
      }));

      const createdIssues = await this.client.batchCreateIssues(
        issueData,
        milestone.title,
        epic.number,
        { batchSize, delayMs: effectiveDelay }
      );

      // TODO: GitHub Projects integration (if projectName provided)
      // if (projectName) {
      //   await this.addIssuesToProject(projectName, [epic, ...createdIssues]);
      // }

      // Map issues to tasks
      for (let i = 0; i < tasks.length; i++) {
        if (createdIssues[i]) {
          taskIssues.push({
            taskId: tasks[i].id,
            issue: createdIssues[i]
          });
          console.log(`   ✅ #${createdIssues[i].number}: [${tasks[i].id}] ${tasks[i].title}`);
        } else {
          errors.push({
            taskId: tasks[i].id,
            error: 'Failed to create issue'
          });
          console.log(`   ❌ [${tasks[i].id}] ${tasks[i].title} - Failed`);
        }
      }

      // 8. Update tasks.md with GitHub issue numbers
      console.log(`\n📄 Updating tasks.md with GitHub issue numbers...`);
      const taskIssueMap: Record<string, number> = {};
      taskIssues.forEach(({ taskId, issue }) => {
        taskIssueMap[taskId] = issue.number;
      });
      TaskParser.updateTasksWithGitHubIssues(this.incrementPath, taskIssueMap);
      console.log(`   ✅ Updated tasks.md`);

      // 9. Save sync mapping
      console.log(`\n💾 Saving sync mapping...`);
      this.saveSyncMapping({
        milestone: milestone.number,
        epic_issue: epic.number,
        task_issues: taskIssueMap,
        last_sync: new Date().toISOString()
      });
      console.log(`   ✅ Saved to .github-sync.yaml`);

      // 10. Update increment metadata
      metadata.github = {
        milestone: milestone.number,
        epic_issue: epic.number,
        task_issues: taskIssueMap,
        last_sync: new Date().toISOString()
      };
      this.saveIncrementMetadata(metadata);

      // Success summary
      console.log(`\n🎉 GitHub sync complete!`);
      console.log(`   📍 Milestone: #${milestone.number} ${milestone.title}`);
      console.log(`   🎯 Epic: #${epic.number} ${epic.html_url}`);
      console.log(`   📝 Tasks: #${createdIssues[0]?.number}-#${createdIssues[createdIssues.length - 1]?.number} (${createdIssues.length} issues)`);

      return {
        milestone,
        epic,
        tasks: taskIssues,
        errors
      };

    } catch (error: any) {
      console.error(`\n❌ Sync failed:`, error.message);
      throw error;
    }
  }

  /**
   * Generate epic issue body
   */
  private generateEpicBody(metadata: IncrementMetadata, tasks: Task[]): string {
    const specPath = path.join(this.incrementPath, 'spec.md');
    let summary = 'No summary available';

    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, 'utf-8');
      const summaryMatch = specContent.match(/## Executive Summary\s+(.+?)(?=\n##|$)/s);
      summary = summaryMatch?.[1]?.trim() || summary;
    }

    // Group tasks by phase
    const phases = new Map<string, Task[]>();
    tasks.forEach(task => {
      const phase = task.phase || 'Other';
      if (!phases.has(phase)) {
        phases.set(phase, []);
      }
      phases.get(phase)!.push(task);
    });

    let phaseChecklist = '';
    for (const [phase, phaseTasks] of phases.entries()) {
      phaseChecklist += `\n### ${phase}\n\n`;
      phaseTasks.forEach(task => {
        phaseChecklist += `- [ ] [${task.id}] ${task.title} (${task.estimate})\n`;
      });
    }

    return `# [Increment ${metadata.id}] ${metadata.title}

**Status**: ${metadata.status}
**Priority**: ${metadata.priority}
**Created**: ${new Date().toISOString().split('T')[0]}

## Summary

${summary}

## Tasks (${tasks.length} total)
${phaseChecklist}

## SpecWeave Increment

This epic tracks SpecWeave increment \`${metadata.id}\`.

- **Spec**: [\`spec.md\`](${this.getGitHubFileURL('spec.md')})
- **Plan**: [\`plan.md\`](${this.getGitHubFileURL('plan.md')})
- **Tasks**: [\`tasks.md\`](${this.getGitHubFileURL('tasks.md')})

---

🤖 Auto-synced by [SpecWeave](https://spec-weave.com)`;
  }

  /**
   * Generate task issue body
   */
  private generateTaskBody(task: Task): string {
    let body = `**Priority**: ${task.priority}
**Estimate**: ${task.estimate}
**Phase**: ${task.phase || 'N/A'}

## Description

${task.description}
`;

    if (task.subtasks && task.subtasks.length > 0) {
      body += `\n## Subtasks\n\n`;
      task.subtasks.forEach(subtask => {
        const checked = subtask.completed ? 'x' : ' ';
        body += `- [${checked}] ${subtask.id}: ${subtask.description} (${subtask.estimate})\n`;
      });
    }

    if (task.filesToCreate && task.filesToCreate.length > 0) {
      body += `\n## Files to Create\n\n`;
      task.filesToCreate.forEach(file => {
        body += `- \`${file}\`\n`;
      });
    }

    if (task.filesToModify && task.filesToModify.length > 0) {
      body += `\n## Files to Modify\n\n`;
      task.filesToModify.forEach(file => {
        body += `- \`${file}\`\n`;
      });
    }

    if (task.implementation) {
      body += `\n## Implementation\n\n\`\`\`typescript\n${task.implementation}\n\`\`\`\n`;
    }

    if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
      body += `\n## Acceptance Criteria\n\n`;
      task.acceptanceCriteria.forEach(criterion => {
        body += `- ✅ ${criterion}\n`;
      });
    }

    if (task.dependencies && task.dependencies.length > 0) {
      body += `\n## Dependencies\n\nThis task depends on:\n`;
      task.dependencies.forEach(dep => {
        body += `- ${dep} (must complete first)\n`;
      });
    }

    if (task.blocks && task.blocks.length > 0) {
      body += `\n## Blocks\n\nThis task blocks:\n`;
      task.blocks.forEach(blocked => {
        body += `- ${blocked} (waiting on this)\n`;
      });
    }

    body += `\n---\n\n🤖 Synced from SpecWeave increment \`${path.basename(this.incrementPath)}\`\n`;
    body += `- **Tasks**: [\`tasks.md\`](${this.getGitHubFileURL('tasks.md')})\n`;

    return body;
  }

  /**
   * Load increment metadata
   */
  private loadIncrementMetadata(): IncrementMetadata {
    const metadataPath = path.join(this.incrementPath, '.metadata.yaml');

    if (fs.existsSync(metadataPath)) {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      return yaml.load(content) as IncrementMetadata;
    }

    // Fallback: extract from directory name and spec
    const incrementId = path.basename(this.incrementPath);
    const specPath = path.join(this.incrementPath, 'spec.md');
    let title = 'Unknown';
    let priority: 'P0' | 'P1' | 'P2' | 'P3' = 'P1';

    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, 'utf-8');
      const titleMatch = specContent.match(/\*\*Title\*\*:\s*(.+)/);
      const priorityMatch = specContent.match(/\*\*Priority\*\*:\s*(P[0-3])/);
      title = titleMatch?.[1]?.trim() || title;
      priority = (priorityMatch?.[1] as any) || priority;
    }

    return {
      id: incrementId,
      title,
      priority,
      status: 'planning'
    };
  }

  /**
   * Save increment metadata
   */
  private saveIncrementMetadata(metadata: IncrementMetadata): void {
    const metadataPath = path.join(this.incrementPath, '.metadata.yaml');
    fs.writeFileSync(metadataPath, yaml.dump(metadata), 'utf-8');
  }

  /**
   * Get issue prefix from metadata.json (with created date)
   * Returns FS-YY-MM-DD format or fallback to FS-UNKNOWN
   */
  private getIssuePrefix(incrementId: string): string {
    const metadataJsonPath = path.join(this.incrementPath, 'metadata.json');

    // Try to read metadata.json for created date
    if (fs.existsSync(metadataJsonPath)) {
      try {
        const metadataContent = fs.readFileSync(metadataJsonPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        if (metadata.created) {
          // Extract YY-MM-DD from date (e.g., "2025-11-12T12:46:00Z" -> "25-11-12")
          const dateMatch = metadata.created.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            const year = dateMatch[1].slice(2); // "2025" -> "25"
            const month = dateMatch[2]; // "11"
            const day = dateMatch[3]; // "12"
            return `FS-${year}-${month}-${day}`;
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not parse metadata.json: ${error}`);
      }
    }

    // Fallback: use increment number if available
    const incrementNumber = incrementId.match(/^(\d+)/)?.[1];
    if (incrementNumber) {
      return `FS-${incrementNumber}`;
    }

    return 'FS-UNKNOWN';
  }

  /**
   * Save sync mapping
   */
  private saveSyncMapping(githubData: any): void {
    const syncPath = path.join(this.incrementPath, '.github-sync.yaml');
    fs.writeFileSync(syncPath, yaml.dump(githubData), 'utf-8');
  }

  /**
   * Get milestone title from metadata
   */
  private getMilestoneTitle(metadata: IncrementMetadata): string {
    return metadata.version ? `v${metadata.version}` : `Increment ${metadata.id}`;
  }

  /**
   * Get GitHub file URL
   */
  private getGitHubFileURL(filename: string): string {
    try {
      const remote = this.client['detectRepo']();
      const incrementId = path.basename(this.incrementPath);
      return `https://github.com/${remote}/blob/develop/.specweave/increments/${incrementId}/${filename}`;
    } catch {
      return `#`;
    }
  }

  /**
   * Convert string to slug
   */
  private slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Print dry run summary
   */
  private printDryRunSummary(tasks: Task[], metadata: IncrementMetadata): void {
    const issuePrefix = this.getIssuePrefix(metadata.id);
    console.log(`\n📊 Dry Run Summary:`);
    console.log(`   Milestone: ${this.getMilestoneTitle(metadata)}`);
    console.log(`   Epic: [${issuePrefix}] ${metadata.title}`);
    console.log(`   Task Issues: ${tasks.length}`);
    console.log(`\n📝 Would create:`);
    tasks.forEach((task, i) => {
      console.log(`   ${i + 1}. [${task.id}] ${task.title} (${task.estimate})`);
    });
  }
}
