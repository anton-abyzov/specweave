import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { GitHubClient } from "./github-client";
import { TaskParser } from "./task-parser";
class TaskSync {
  constructor(incrementPath, repo) {
    this.incrementPath = incrementPath;
    this.client = new GitHubClient(repo);
  }
  /**
   * Sync all tasks to GitHub (main entry point)
   */
  async syncTasks(options = {}) {
    const {
      force = false,
      dryRun = false,
      batchDelay = 6e3,
      batchSize = 10,
      milestoneDays = 2,
      // SpecWeave default: 2 days (AI velocity)
      projectName,
      fastMode = false
    } = options;
    console.log(`
\u{1F504} Syncing increment to GitHub...`);
    const ghCheck = GitHubClient.checkGitHubCLI();
    if (!ghCheck.installed || !ghCheck.authenticated) {
      throw new Error(ghCheck.error || "GitHub CLI check failed");
    }
    const metadata = this.loadIncrementMetadata();
    console.log(`\u{1F4E6} Increment: ${metadata.id} - ${metadata.title}`);
    const tasks = TaskParser.parseTasksFile(this.incrementPath);
    console.log(`\u{1F4CB} Found ${tasks.length} tasks`);
    if (dryRun) {
      console.log(`
\u{1F50D} DRY RUN MODE - No changes will be made`);
      this.printDryRunSummary(tasks, metadata);
      return {
        epic: {},
        tasks: [],
        errors: []
      };
    }
    if (metadata.github?.epic_issue && !force) {
      console.log(`
\u26A0\uFE0F  Increment already synced to GitHub (epic #${metadata.github.epic_issue})`);
      console.log(`   Use --force to re-sync (WARNING: will create duplicate issues)`);
      throw new Error("Already synced. Use --force to override.");
    }
    const errors = [];
    try {
      const milestoneTitle = this.getMilestoneTitle(metadata);
      console.log(`
\u{1F4CD} Creating milestone: ${milestoneTitle} (due in ${milestoneDays} days)`);
      const milestone = await this.client.createOrGetMilestone(
        milestoneTitle,
        `Milestone for increment ${metadata.id}`,
        milestoneDays
      );
      console.log(`   \u2705 Milestone #${milestone.number}: ${milestone.title}`);
      console.log(`
\u{1F3AF} Creating epic issue for increment ${metadata.id}...`);
      const epicBody = this.generateEpicBody(metadata, tasks);
      const epic = await this.client.createEpicIssue(
        `[INC-${metadata.id}] ${metadata.title}`,
        epicBody,
        milestone.title,
        ["increment", "specweave", metadata.priority.toLowerCase()]
      );
      console.log(`   \u2705 Epic issue #${epic.number}: ${epic.html_url}`);
      const useFastMode = fastMode || tasks.length < 10;
      const effectiveDelay = useFastMode ? 0 : batchDelay;
      if (useFastMode) {
        console.log(`
\u{1F4DD} Creating ${tasks.length} task issues (fast mode - no rate limiting)...`);
      } else {
        console.log(`
\u{1F4DD} Creating ${tasks.length} task issues (batch size: ${batchSize}, delay: ${effectiveDelay}ms)...`);
      }
      const taskIssues = [];
      const issueData = tasks.map((task) => ({
        title: `[${task.id}] ${task.title}`,
        body: this.generateTaskBody(task),
        labels: ["task", task.priority.toLowerCase(), ...task.phase ? [this.slugify(task.phase)] : []]
      }));
      const createdIssues = await this.client.batchCreateIssues(
        issueData,
        milestone.title,
        epic.number,
        { batchSize, delayMs: effectiveDelay }
      );
      for (let i = 0; i < tasks.length; i++) {
        if (createdIssues[i]) {
          taskIssues.push({
            taskId: tasks[i].id,
            issue: createdIssues[i]
          });
          console.log(`   \u2705 #${createdIssues[i].number}: [${tasks[i].id}] ${tasks[i].title}`);
        } else {
          errors.push({
            taskId: tasks[i].id,
            error: "Failed to create issue"
          });
          console.log(`   \u274C [${tasks[i].id}] ${tasks[i].title} - Failed`);
        }
      }
      console.log(`
\u{1F4C4} Updating tasks.md with GitHub issue numbers...`);
      const taskIssueMap = {};
      taskIssues.forEach(({ taskId, issue }) => {
        taskIssueMap[taskId] = issue.number;
      });
      TaskParser.updateTasksWithGitHubIssues(this.incrementPath, taskIssueMap);
      console.log(`   \u2705 Updated tasks.md`);
      console.log(`
\u{1F4BE} Saving sync mapping...`);
      this.saveSyncMapping({
        milestone: milestone.number,
        epic_issue: epic.number,
        task_issues: taskIssueMap,
        last_sync: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`   \u2705 Saved to .github-sync.yaml`);
      metadata.github = {
        milestone: milestone.number,
        epic_issue: epic.number,
        task_issues: taskIssueMap,
        last_sync: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.saveIncrementMetadata(metadata);
      console.log(`
\u{1F389} GitHub sync complete!`);
      console.log(`   \u{1F4CD} Milestone: #${milestone.number} ${milestone.title}`);
      console.log(`   \u{1F3AF} Epic: #${epic.number} ${epic.html_url}`);
      console.log(`   \u{1F4DD} Tasks: #${createdIssues[0]?.number}-#${createdIssues[createdIssues.length - 1]?.number} (${createdIssues.length} issues)`);
      return {
        milestone,
        epic,
        tasks: taskIssues,
        errors
      };
    } catch (error) {
      console.error(`
\u274C Sync failed:`, error.message);
      throw error;
    }
  }
  /**
   * Generate epic issue body
   */
  generateEpicBody(metadata, tasks) {
    const specPath = path.join(this.incrementPath, "spec.md");
    let summary = "No summary available";
    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, "utf-8");
      const summaryMatch = specContent.match(/## Executive Summary\s+(.+?)(?=\n##|$)/s);
      summary = summaryMatch?.[1]?.trim() || summary;
    }
    const phases = /* @__PURE__ */ new Map();
    tasks.forEach((task) => {
      const phase = task.phase || "Other";
      if (!phases.has(phase)) {
        phases.set(phase, []);
      }
      phases.get(phase).push(task);
    });
    let phaseChecklist = "";
    for (const [phase, phaseTasks] of phases.entries()) {
      phaseChecklist += `
### ${phase}

`;
      phaseTasks.forEach((task) => {
        phaseChecklist += `- [ ] [${task.id}] ${task.title} (${task.estimate})
`;
      });
    }
    return `# [Increment ${metadata.id}] ${metadata.title}

**Status**: ${metadata.status}
**Priority**: ${metadata.priority}
**Created**: ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}

## Summary

${summary}

## Tasks (${tasks.length} total)
${phaseChecklist}

## SpecWeave Increment

This epic tracks SpecWeave increment \`${metadata.id}\`.

- **Spec**: [\`spec.md\`](${this.getGitHubFileURL("spec.md")})
- **Plan**: [\`plan.md\`](${this.getGitHubFileURL("plan.md")})
- **Tasks**: [\`tasks.md\`](${this.getGitHubFileURL("tasks.md")})

---

\u{1F916} Auto-synced by [SpecWeave](https://spec-weave.com)`;
  }
  /**
   * Generate task issue body
   */
  generateTaskBody(task) {
    let body = `**Priority**: ${task.priority}
**Estimate**: ${task.estimate}
**Phase**: ${task.phase || "N/A"}

## Description

${task.description}
`;
    if (task.subtasks && task.subtasks.length > 0) {
      body += `
## Subtasks

`;
      task.subtasks.forEach((subtask) => {
        const checked = subtask.completed ? "x" : " ";
        body += `- [${checked}] ${subtask.id}: ${subtask.description} (${subtask.estimate})
`;
      });
    }
    if (task.filesToCreate && task.filesToCreate.length > 0) {
      body += `
## Files to Create

`;
      task.filesToCreate.forEach((file) => {
        body += `- \`${file}\`
`;
      });
    }
    if (task.filesToModify && task.filesToModify.length > 0) {
      body += `
## Files to Modify

`;
      task.filesToModify.forEach((file) => {
        body += `- \`${file}\`
`;
      });
    }
    if (task.implementation) {
      body += `
## Implementation

\`\`\`typescript
${task.implementation}
\`\`\`
`;
    }
    if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
      body += `
## Acceptance Criteria

`;
      task.acceptanceCriteria.forEach((criterion) => {
        body += `- \u2705 ${criterion}
`;
      });
    }
    if (task.dependencies && task.dependencies.length > 0) {
      body += `
## Dependencies

This task depends on:
`;
      task.dependencies.forEach((dep) => {
        body += `- ${dep} (must complete first)
`;
      });
    }
    if (task.blocks && task.blocks.length > 0) {
      body += `
## Blocks

This task blocks:
`;
      task.blocks.forEach((blocked) => {
        body += `- ${blocked} (waiting on this)
`;
      });
    }
    body += `
---

\u{1F916} Synced from SpecWeave increment \`${path.basename(this.incrementPath)}\`
`;
    body += `- **Tasks**: [\`tasks.md\`](${this.getGitHubFileURL("tasks.md")})
`;
    return body;
  }
  /**
   * Load increment metadata
   */
  loadIncrementMetadata() {
    const metadataPath = path.join(this.incrementPath, ".metadata.yaml");
    if (fs.existsSync(metadataPath)) {
      const content = fs.readFileSync(metadataPath, "utf-8");
      return yaml.load(content);
    }
    const incrementId = path.basename(this.incrementPath);
    const specPath = path.join(this.incrementPath, "spec.md");
    let title = "Unknown";
    let priority = "P1";
    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, "utf-8");
      const titleMatch = specContent.match(/\*\*Title\*\*:\s*(.+)/);
      const priorityMatch = specContent.match(/\*\*Priority\*\*:\s*(P[0-3])/);
      title = titleMatch?.[1]?.trim() || title;
      priority = priorityMatch?.[1] || priority;
    }
    return {
      id: incrementId,
      title,
      priority,
      status: "planning"
    };
  }
  /**
   * Save increment metadata
   */
  saveIncrementMetadata(metadata) {
    const metadataPath = path.join(this.incrementPath, ".metadata.yaml");
    fs.writeFileSync(metadataPath, yaml.dump(metadata), "utf-8");
  }
  /**
   * Save sync mapping
   */
  saveSyncMapping(githubData) {
    const syncPath = path.join(this.incrementPath, ".github-sync.yaml");
    fs.writeFileSync(syncPath, yaml.dump(githubData), "utf-8");
  }
  /**
   * Get milestone title from metadata
   */
  getMilestoneTitle(metadata) {
    return metadata.version ? `v${metadata.version}` : `Increment ${metadata.id}`;
  }
  /**
   * Get GitHub file URL
   */
  getGitHubFileURL(filename) {
    try {
      const remote = this.client["detectRepo"]();
      const incrementId = path.basename(this.incrementPath);
      return `https://github.com/${remote}/blob/develop/.specweave/increments/${incrementId}/${filename}`;
    } catch {
      return `#`;
    }
  }
  /**
   * Convert string to slug
   */
  slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  /**
   * Print dry run summary
   */
  printDryRunSummary(tasks, metadata) {
    console.log(`
\u{1F4CA} Dry Run Summary:`);
    console.log(`   Milestone: ${this.getMilestoneTitle(metadata)}`);
    console.log(`   Epic: [INC-${metadata.id}] ${metadata.title}`);
    console.log(`   Task Issues: ${tasks.length}`);
    console.log(`
\u{1F4DD} Would create:`);
    tasks.forEach((task, i) => {
      console.log(`   ${i + 1}. [${task.id}] ${task.title} (${task.estimate})`);
    });
  }
}
export {
  TaskSync
};
