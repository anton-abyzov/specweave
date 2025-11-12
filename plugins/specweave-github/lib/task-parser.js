import * as fs from "fs";
import * as path from "path";
class TaskParser {
  /**
   * Parse tasks.md file and extract all tasks
   */
  static parseTasksFile(incrementPath) {
    const tasksPath = path.join(incrementPath, "tasks.md");
    if (!fs.existsSync(tasksPath)) {
      throw new Error(`tasks.md not found at ${tasksPath}`);
    }
    const content = fs.readFileSync(tasksPath, "utf-8");
    return this.parseTasks(content);
  }
  /**
   * Parse task content into structured Task objects
   */
  static parseTasks(content) {
    const tasks = [];
    const taskPattern = /###\s+(T-\d+(?:-[A-Z])?):\s+(.+?)$/gm;
    const matches = [...content.matchAll(taskPattern)];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const taskId = match[1];
      const taskTitle = match[2].trim();
      const startIndex = match.index;
      const endIndex = i < matches.length - 1 ? matches[i + 1].index : content.length;
      const taskContent = content.substring(startIndex, endIndex);
      const task = this.parseTask(taskId, taskTitle, taskContent);
      if (task) {
        tasks.push(task);
      }
    }
    return tasks;
  }
  /**
   * Parse individual task section
   */
  static parseTask(taskId, taskTitle, content) {
    try {
      const task = {
        id: taskId,
        title: taskTitle,
        priority: this.extractPriority(content),
        estimate: this.extractEstimate(content),
        status: this.extractStatus(content),
        description: this.extractDescription(content)
      };
      task.githubIssue = this.extractGitHubIssue(content);
      task.assignee = this.extractAssignee(content);
      task.subtasks = this.extractSubtasks(content);
      task.filesToCreate = this.extractFiles(content, "Files to Create");
      task.filesToModify = this.extractFiles(content, "Files to Modify");
      task.implementation = this.extractImplementation(content);
      task.acceptanceCriteria = this.extractAcceptanceCriteria(content);
      task.dependencies = this.extractDependencies(content);
      task.blocks = this.extractBlocks(content);
      task.phase = this.extractPhase(content);
      return task;
    } catch (error) {
      console.error(`Error parsing task ${taskId}:`, error);
      return null;
    }
  }
  static extractPriority(content) {
    const match = content.match(/\*\*Priority\*\*:\s+(P[0-3])/);
    return match?.[1] || "P1";
  }
  static extractEstimate(content) {
    const match = content.match(/\*\*Estimate\*\*:\s+(.+?)$/m);
    return match?.[1]?.trim() || "Unknown";
  }
  static extractStatus(content) {
    const match = content.match(/\*\*Status\*\*:\s+(\w+)/);
    const status = match?.[1];
    if (status === "pending" || status === "in_progress" || status === "completed" || status === "blocked") {
      return status;
    }
    return "pending";
  }
  static extractDescription(content) {
    const match = content.match(/\*\*Description\*\*:\s*\n(.+?)(?=\n\*\*|$)/s);
    return match?.[1]?.trim() || "";
  }
  static extractGitHubIssue(content) {
    const match = content.match(/\*\*GitHub Issue\*\*:\s+#(\d+)/);
    return match ? parseInt(match[1], 10) : void 0;
  }
  static extractAssignee(content) {
    const match = content.match(/\*\*Assignee\*\*:\s+@?(\w+)/);
    return match?.[1];
  }
  static extractSubtasks(content) {
    const subtaskSection = content.match(/\*\*Subtasks\*\*:?\s*\n((?:- \[.\] .+\n?)+)/);
    if (!subtaskSection) return void 0;
    const subtaskLines = subtaskSection[1].match(/- \[(x| )\] (.+?)(?:\((.+?)\))?$/gm);
    if (!subtaskLines) return void 0;
    return subtaskLines.map((line) => {
      const match = line.match(/- \[(x| )\] (.+?)(?:\((.+?)\))?$/);
      if (!match) return null;
      const completed = match[1] === "x";
      const description = match[2].trim();
      const estimate = match[3]?.trim() || "Unknown";
      const idMatch = description.match(/^(S-\d+-\d+):\s*(.+)/);
      const id = idMatch ? idMatch[1] : `S-${Date.now()}`;
      const cleanDescription = idMatch ? idMatch[2] : description;
      return {
        id,
        description: cleanDescription,
        estimate,
        completed
      };
    }).filter((st) => st !== null);
  }
  static extractFiles(content, section) {
    const pattern = new RegExp(`\\*\\*${section}\\*\\*:?\\s*\\n((?:- \`.+?\`\\n?)+)`, "s");
    const match = content.match(pattern);
    if (!match) return void 0;
    const files = match[1].match(/- `(.+?)`/g);
    return files?.map((f) => f.replace(/- `(.+?)`/, "$1"));
  }
  static extractImplementation(content) {
    const match = content.match(/\*\*Implementation\*\*:?\s*\n```[\w]*\n([\s\S]+?)\n```/);
    return match?.[1]?.trim();
  }
  static extractAcceptanceCriteria(content) {
    const match = content.match(/\*\*Acceptance Criteria\*\*:?\s*\n((?:- .+\n?)+)/);
    if (!match) return void 0;
    const criteria = match[1].match(/- (.+)/g);
    return criteria?.map((c) => c.replace(/^- /, "").replace(/^✅\s*/, ""));
  }
  static extractDependencies(content) {
    const match = content.match(/\*\*Dependencies\*\*:?\s*\n((?:- .+\n?)+)/);
    if (!match) return void 0;
    const deps = match[1].match(/- (T-\d+(?:-[A-Z])?)/g);
    return deps?.map((d) => d.replace(/^- /, "").match(/(T-\d+(?:-[A-Z])?)/)?.[1]).filter((d) => !!d);
  }
  static extractBlocks(content) {
    const match = content.match(/\*\*Blocks\*\*:?\s*\n((?:- .+\n?)+)/);
    if (!match) return void 0;
    const blocks = match[1].match(/- (T-\d+(?:-[A-Z])?)/g);
    return blocks?.map((b) => b.replace(/^- /, "").match(/(T-\d+(?:-[A-Z])?)/)?.[1]).filter((b) => !!b);
  }
  static extractPhase(content) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("##") && !line.startsWith("###")) {
        const phaseMatch = line.match(/##\s+(.+?)(?:\s+-\s+\d+\s+tasks)?$/);
        if (phaseMatch) {
          return phaseMatch[1].trim();
        }
      }
    }
    return void 0;
  }
  /**
   * Update tasks.md file with GitHub issue numbers
   */
  static updateTasksWithGitHubIssues(incrementPath, taskIssueMap) {
    const tasksPath = path.join(incrementPath, "tasks.md");
    let content = fs.readFileSync(tasksPath, "utf-8");
    for (const [taskId, issueNumber] of Object.entries(taskIssueMap)) {
      const taskHeaderPattern = new RegExp(`(###\\s+${taskId}:.+?$)`, "m");
      const match = content.match(taskHeaderPattern);
      if (!match) continue;
      const taskStart = match.index;
      const nextTaskPattern = /###\s+T-\d+(?:-[A-Z])?:/g;
      nextTaskPattern.lastIndex = taskStart + match[0].length;
      const nextMatch = nextTaskPattern.exec(content);
      const taskEnd = nextMatch ? nextMatch.index : content.length;
      const taskSection = content.substring(taskStart, taskEnd);
      if (taskSection.includes("**GitHub Issue**:")) {
        const updatedSection = taskSection.replace(
          /\*\*GitHub Issue\*\*:.+$/m,
          `**GitHub Issue**: #${issueNumber}`
        );
        content = content.substring(0, taskStart) + updatedSection + content.substring(taskEnd);
      } else {
        const statusLinePattern = /(\*\*Status\*\*:.+?$)/m;
        const statusMatch = taskSection.match(statusLinePattern);
        if (statusMatch) {
          const insertPoint = taskStart + taskSection.indexOf(statusMatch[0]) + statusMatch[0].length;
          const insertion = `
**GitHub Issue**: #${issueNumber}`;
          content = content.substring(0, insertPoint) + insertion + content.substring(insertPoint);
        }
      }
    }
    fs.writeFileSync(tasksPath, content, "utf-8");
  }
}
export {
  TaskParser
};
