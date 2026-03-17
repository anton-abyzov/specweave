import { readFile } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import * as yaml from "yaml";
class UserStoryContentBuilder {
  constructor(userStoryPath, projectRoot) {
    this.userStoryPath = userStoryPath;
    this.projectRoot = projectRoot;
  }
  /**
   * Parse user story file and extract all content
   */
  async parse() {
    const content = await readFile(this.userStoryPath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error("User story file missing YAML frontmatter");
    }
    const frontmatter = yaml.parse(match[1]);
    const bodyContent = content.slice(match[0].length).trim();
    const featureId = this.extractFeatureId(frontmatter.epic, this.userStoryPath);
    const userStoryDescription = this.extractUserStoryDescription(bodyContent);
    const acceptanceCriteria = this.extractAcceptanceCriteria(bodyContent);
    const incrementId = this.extractIncrementId(bodyContent);
    const tasks = incrementId ? await this.extractTasks(bodyContent, incrementId, frontmatter.id) : [];
    return {
      frontmatter,
      userStoryDescription,
      acceptanceCriteria,
      tasks,
      incrementId,
      featureId
    };
  }
  /**
   * Build GitHub issue body from user story content
   *
   * @param githubRepo Optional GitHub repo in format "owner/repo" for generating URLs
   * @param branch Optional branch name for URL generation (defaults to 'main')
   */
  async buildIssueBody(githubRepo, branch) {
    const content = await this.parse();
    let body = "";
    const repo = githubRepo || await this.detectGitHubRepo();
    const branchName = branch || "main";
    const completedACs = content.acceptanceCriteria.filter((ac) => ac.completed).length;
    const totalACs = content.acceptanceCriteria.length;
    const completedTasks = content.tasks.filter((t) => t.status).length;
    const totalTasks = content.tasks.length;
    const overallPercentage = totalACs + totalTasks > 0 ? Math.round((completedACs + completedTasks) / (totalACs + totalTasks) * 100) : 0;
    body += `## Progress

`;
    body += `**Acceptance Criteria**: ${completedACs}/${totalACs} (${totalACs > 0 ? Math.round(completedACs / totalACs * 100) : 0}%)
`;
    body += `**Tasks**: ${completedTasks}/${totalTasks} (${totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0}%)
`;
    body += `**Overall**: ${overallPercentage}%

`;
    const filledBlocks = Math.floor(overallPercentage / 5);
    const emptyBlocks = 20 - filledBlocks;
    body += `${"\u2588".repeat(filledBlocks)}${"\u2591".repeat(emptyBlocks)} ${overallPercentage}%

`;
    body += `---

`;
    body += `## User Story

`;
    if (content.userStoryDescription) {
      body += `**As a** ${content.userStoryDescription.asA}
`;
      body += `**I want** ${content.userStoryDescription.iWant}
`;
      body += `**So that** ${content.userStoryDescription.soThat}

`;
    } else {
      body += `*User story description not found*

`;
    }
    const usFilename = path.basename(this.userStoryPath);
    if (repo) {
      const relativePath = this.userStoryPath.replace(this.projectRoot, "").replace(/^\//, "");
      body += `\u{1F4C4} View full story: [\`${usFilename}\`](https://github.com/${repo}/tree/${branchName}/${relativePath})

`;
    }
    body += `---

`;
    body += `## Acceptance Criteria

`;
    if (content.acceptanceCriteria.length > 0) {
      const completed = content.acceptanceCriteria.filter((ac) => ac.completed).length;
      const total = content.acceptanceCriteria.length;
      const percentage = total > 0 ? Math.round(completed / total * 100) : 0;
      body += `Progress: ${completed}/${total} criteria met (${percentage}%)

`;
      for (const ac of content.acceptanceCriteria) {
        const checkbox = ac.completed ? "[x]" : "[ ]";
        const priority = ac.priority ? ` (${ac.priority})` : "";
        const testable = ac.testable ? " [testable]" : "";
        body += `- ${checkbox} **${ac.id}**: ${ac.description}${priority}${testable}
`;
      }
      body += "\n";
    } else {
      body += `*No acceptance criteria defined*

`;
    }
    body += `---

`;
    body += `## Implementation Tasks

`;
    if (content.tasks.length > 0) {
      const completed = content.tasks.filter((t) => t.status).length;
      const total = content.tasks.length;
      const percentage = total > 0 ? Math.round(completed / total * 100) : 0;
      body += `Progress: ${completed}/${total} tasks complete (${percentage}%)

`;
      if (content.incrementId) {
        if (repo) {
          body += `**Increment**: [${content.incrementId}](https://github.com/${repo}/tree/${branchName}/.specweave/increments/${content.incrementId})

`;
        } else {
          body += `**Increment**: ${content.incrementId}

`;
        }
      }
      for (const task of content.tasks) {
        const checkbox = task.status ? "[x]" : "[ ]";
        let taskLink = task.link;
        if (repo && taskLink.startsWith("../../")) {
          const relativePath = taskLink.replace(/^\.\.\/\.\.\//, ".specweave/");
          taskLink = `https://github.com/${repo}/tree/${branchName}/${relativePath}`;
        }
        body += `- ${checkbox} [${task.id}: ${task.title}](${taskLink})
`;
      }
      body += "\n";
    } else {
      body += `*No tasks defined yet*

`;
    }
    body += `---

`;
    body += `\u{1F916} Auto-synced by SpecWeave User Story Sync`;
    return body;
  }
  /**
   * Extract feature ID from epic or path
   */
  extractFeatureId(epic, filePath) {
    if (epic && epic.startsWith("FS-")) {
      return epic;
    }
    const match = filePath.match(/FS-\d+/);
    return match ? match[0] : "FS-UNKNOWN";
  }
  /**
   * Extract user story description (As a... I want... So that...)
   */
  extractUserStoryDescription(content) {
    const asAMatch = content.match(/\*\*As a\*\*\s+([^\n]+)/);
    const iWantMatch = content.match(/\*\*I want\*\*\s+([^\n]+)/);
    const soThatMatch = content.match(/\*\*So that\*\*\s+([^\n]+)/);
    if (asAMatch && iWantMatch && soThatMatch) {
      return {
        asA: asAMatch[1].trim(),
        iWant: iWantMatch[1].trim(),
        soThat: soThatMatch[1].trim()
      };
    }
    return null;
  }
  /**
   * Extract acceptance criteria from content
   */
  extractAcceptanceCriteria(content) {
    const criteria = [];
    const acPattern = /- \[([ x])\] \*\*AC-US(\d+)-(\d+)\*\*:\s*([^(]+)(?:\(([^)]+)\))?/g;
    let match;
    while ((match = acPattern.exec(content)) !== null) {
      const completed = match[1] === "x";
      const usNumber = match[2];
      const acNumber = match[3];
      const description = match[4].trim();
      const metadata = match[5] || "";
      criteria.push({
        id: `AC-US${usNumber}-${acNumber}`,
        description,
        completed,
        priority: metadata.includes("P1") ? "P1" : metadata.includes("P2") ? "P2" : "",
        testable: metadata.includes("testable")
      });
    }
    return criteria;
  }
  /**
   * Extract increment ID from Implementation section
   */
  extractIncrementId(content) {
    const match = content.match(/\*\*Increment\*\*:\s*\[([^\]]+)\]/);
    return match ? match[1] : null;
  }
  /**
   * Extract tasks for this user story from increment tasks.md
   */
  async extractTasks(content, incrementId, userStoryId) {
    const tasks = [];
    const incrementFolder = path.join(
      this.projectRoot,
      ".specweave",
      "increments",
      incrementId
    );
    if (!existsSync(incrementFolder)) {
      console.warn(`   \u26A0\uFE0F  Increment folder not found: ${incrementId}`);
      return [];
    }
    const tasksPath = path.join(incrementFolder, "tasks.md");
    if (!existsSync(tasksPath)) {
      console.warn(`   \u26A0\uFE0F  tasks.md not found in ${incrementId}`);
      return [];
    }
    const tasksContent = await readFile(tasksPath, "utf-8");
    const taskLinkPattern = /- \[([T-\d]+):\s*([^\]]+)\]/g;
    let match;
    while ((match = taskLinkPattern.exec(content)) !== null) {
      const taskId = match[1];
      const taskTitle = match[2].trim();
      const taskPattern = new RegExp(
        `###\\s+${taskId}:\\s*([^\\n]+)[\\s\\S]*?\\*\\*Status\\*\\*:\\s*\\[([x\\s])\\]`,
        "i"
      );
      const taskMatch = tasksContent.match(taskPattern);
      const isCompleted = taskMatch ? taskMatch[2] === "x" : false;
      const taskAnchor = taskId.toLowerCase() + "-" + taskTitle.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      const link = `../../increments/${incrementId}/tasks.md#${taskAnchor}`;
      tasks.push({
        id: taskId,
        title: taskTitle,
        status: isCompleted,
        link
      });
    }
    return tasks;
  }
  /**
   * Extract highest priority from acceptance criteria
   * Priority order: P1 > P2 > P3
   */
  extractPriorityFromACs(acceptanceCriteria) {
    if (acceptanceCriteria.length === 0) {
      return null;
    }
    if (acceptanceCriteria.some((ac) => ac.priority === "P1")) {
      return "P1";
    }
    if (acceptanceCriteria.some((ac) => ac.priority === "P2")) {
      return "P2";
    }
    if (acceptanceCriteria.some((ac) => ac.priority === "P3")) {
      return "P3";
    }
    return null;
  }
  /**
   * Detect GitHub repository from git remote
   * Returns "owner/repo" format
   */
  async detectGitHubRepo() {
    try {
      const { execFileNoThrow } = await import("../../../../../src/utils/execFileNoThrow.js");
      const result = await execFileNoThrow("git", ["remote", "get-url", "origin"]);
      if (result.exitCode !== 0 || !result.stdout) {
        return null;
      }
      const remoteUrl = result.stdout.trim();
      const githubMatch = remoteUrl.match(/github\.com[:/](.+\/.+?)(?:\.git)?$/);
      if (githubMatch) {
        return githubMatch[1];
      }
      return null;
    } catch {
      return null;
    }
  }
}
export {
  UserStoryContentBuilder
};
