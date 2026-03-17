import { readFile } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import * as yaml from "yaml";
class ProgressCommentBuilder {
  constructor(userStoryPath, projectRoot = process.cwd()) {
    this.userStoryPath = userStoryPath;
    this.projectRoot = projectRoot;
  }
  /**
   * Build complete progress comment
   */
  async buildProgressComment(incrementId) {
    const summary = await this.calculateProgressSummary();
    const frontmatter = await this.extractFrontmatter();
    let comment = "";
    comment += `\u{1F4CA} **Progress Update from Increment ${incrementId}**

`;
    comment += `**Status**: ${summary.statusSummary} (${summary.completedACs}/${summary.totalACs} AC implemented - ${summary.percentage}%)

`;
    if (summary.completedCriteria.length > 0) {
      comment += `## \u2705 Completed Acceptance Criteria

`;
      for (const ac of summary.completedCriteria) {
        const priority = ac.priority ? ` (${ac.priority})` : "";
        const testable = ac.testable ? " [testable]" : "";
        comment += `- [x] **${ac.id}**: ${ac.description}${priority}${testable}
`;
      }
      comment += "\n";
    }
    if (summary.remainingCriteria.length > 0) {
      const p1 = summary.remainingCriteria.filter((ac) => ac.priority === "P1");
      const p2 = summary.remainingCriteria.filter((ac) => ac.priority === "P2");
      const p3 = summary.remainingCriteria.filter((ac) => ac.priority === "P3");
      if (p1.length > 0) {
        comment += `## \u{1F534} Remaining Work (P1 - Critical)

`;
        for (const ac of p1) {
          const testable = ac.testable ? " [testable]" : "";
          comment += `- [ ] **${ac.id}**: ${ac.description} (P1)${testable}
`;
        }
        comment += "\n";
      }
      if (p2.length > 0 || p3.length > 0) {
        comment += `## \u23F3 Remaining Work (P2-P3)

`;
        for (const ac of [...p2, ...p3]) {
          const priority = ac.priority ? ` (${ac.priority})` : "";
          const testable = ac.testable ? " [testable]" : "";
          comment += `- [ ] **${ac.id}**: ${ac.description}${priority}${testable}
`;
        }
        comment += "\n";
      }
    }
    if (summary.tasks.length > 0) {
      const completedTasks = summary.tasks.filter((t) => t.status).length;
      const totalTasks = summary.tasks.length;
      comment += `## \u{1F4CB} Implementation Tasks (${completedTasks}/${totalTasks})

`;
      for (const task of summary.tasks) {
        const checkbox = task.status ? "[x]" : "[ ]";
        comment += `- ${checkbox} ${task.id}: ${task.title}
`;
      }
      comment += "\n";
    }
    comment += `---

`;
    comment += `\u{1F916} Auto-synced by SpecWeave | `;
    comment += `[View increment](../../increments/${incrementId}) | `;
    comment += `${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
`;
    return comment;
  }
  /**
   * Calculate progress summary
   */
  async calculateProgressSummary() {
    const content = await readFile(this.userStoryPath, "utf-8");
    const acceptanceCriteria = this.extractAcceptanceCriteria(content);
    const tasks = await this.extractTasks(content);
    const completedCriteria = acceptanceCriteria.filter((ac) => ac.completed);
    const remainingCriteria = acceptanceCriteria.filter((ac) => !ac.completed);
    const totalACs = acceptanceCriteria.length;
    const completedACs = completedCriteria.length;
    const percentage = totalACs > 0 ? Math.round(completedACs / totalACs * 100) : 0;
    let statusSummary = "In Progress";
    if (completedACs === totalACs && totalACs > 0) {
      statusSummary = "Complete";
    } else if (completedACs > 0) {
      const p1Criteria = acceptanceCriteria.filter((ac) => ac.priority === "P1");
      const p1Completed = p1Criteria.filter((ac) => ac.completed).length;
      if (p1Completed === p1Criteria.length && p1Criteria.length > 0) {
        statusSummary = "Core Complete";
      }
    }
    return {
      totalACs,
      completedACs,
      percentage,
      statusSummary,
      completedCriteria,
      remainingCriteria,
      tasks
    };
  }
  /**
   * Format AC checkboxes (for inline display)
   */
  formatACCheckboxes() {
    return "";
  }
  /**
   * Format task checkboxes (for inline display)
   */
  formatTaskCheckboxes() {
    return "";
  }
  /**
   * Calculate progress percentage
   */
  async calculateProgressPercentage() {
    const summary = await this.calculateProgressSummary();
    return summary.percentage;
  }
  /**
   * Extract frontmatter from user story file
   */
  async extractFrontmatter() {
    const content = await readFile(this.userStoryPath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error(`User story file missing YAML frontmatter: ${this.userStoryPath}`);
    }
    return yaml.parse(match[1]);
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
        priority: metadata.includes("P1") ? "P1" : metadata.includes("P2") ? "P2" : metadata.includes("P3") ? "P3" : "",
        testable: metadata.includes("testable")
      });
    }
    return criteria;
  }
  /**
   * Extract tasks from Implementation section
   */
  async extractTasks(content) {
    const tasks = [];
    const incrementMatch = content.match(/\*\*Increment\*\*:\s*\[([^\]]+)\]/);
    if (!incrementMatch) {
      return tasks;
    }
    const incrementId = incrementMatch[1];
    const tasksPath = path.join(
      this.projectRoot,
      ".specweave",
      "increments",
      incrementId,
      "tasks.md"
    );
    if (!existsSync(tasksPath)) {
      return tasks;
    }
    const tasksContent = await readFile(tasksPath, "utf-8");
    const taskLinkPattern = /- \[([T-\d]+):\s*([^\]]+)\]/g;
    let match;
    while ((match = taskLinkPattern.exec(content)) !== null) {
      const taskId = match[1];
      const taskTitle = match[2].trim();
      const taskPattern = new RegExp(`### ${taskId}[:\\s].*?\\n\\*\\*Status\\*\\*:\\s*\\[([x ]?)\\]`, "s");
      const taskMatch = tasksContent.match(taskPattern);
      const completed = taskMatch ? taskMatch[1] === "x" : false;
      tasks.push({
        id: taskId,
        title: taskTitle,
        status: completed
      });
    }
    return tasks;
  }
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.error("Usage: node progress-comment-builder.js --user-story <path> --increment <id>");
    process.exit(1);
  }
  const userStoryPath = args[args.indexOf("--user-story") + 1];
  const incrementId = args[args.indexOf("--increment") + 1];
  const builder = new ProgressCommentBuilder(userStoryPath);
  const comment = await builder.buildProgressComment(incrementId);
  console.log(comment);
}
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Error generating progress comment:", error.message);
    process.exit(1);
  });
}
export {
  ProgressCommentBuilder,
  main
};
