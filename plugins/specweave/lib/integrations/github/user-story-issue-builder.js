import { readFile } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { IssueStateManager } from "./IssueStateManager.js";
class UserStoryIssueBuilder {
  constructor(userStoryPath, projectRoot, featureId, repoInfo) {
    if (!featureId || featureId.trim() === "") {
      throw new Error(
        `UserStoryIssueBuilder: featureId is required but was empty.
This prevents incorrect issue titles like [undefined][US-XXX] or [SP-US-XXX].
Provide the correct Feature ID (e.g., "FS-047") when constructing this builder.`
      );
    }
    if (!/^FS-\d{3,}E?$/.test(featureId)) {
      throw new Error(
        `UserStoryIssueBuilder: Invalid featureId format "${featureId}".
Expected format: FS-XXX or FS-XXXE (e.g., "FS-047", "FS-123E", "FS-1000").
This prevents incorrect issue titles like [SP-US-XXX] or [${featureId}][US-XXX].`
      );
    }
    this.userStoryPath = userStoryPath;
    this.projectRoot = projectRoot;
    this.featureId = featureId;
    this.repoOwner = repoInfo?.owner;
    this.repoName = repoInfo?.repo;
    this.branch = repoInfo?.branch || "develop";
  }
  /**
   * Build GitHub issue body for a single User Story
   *
   * Format:
   * - User Story statement
   * - Acceptance Criteria (checkboxes)
   * - Tasks (checkboxes)
   * - Links (Feature, Increment, Spec file)
   */
  async buildIssueBody() {
    const frontmatter = await this.readUserStoryFrontmatter();
    const content = await readFile(this.userStoryPath, "utf-8");
    const bodyContent = content.slice(content.indexOf("---", 3) + 3).trim();
    const userStoryStatement = this.extractUserStoryStatement(bodyContent);
    const acceptanceCriteria = this.extractAcceptanceCriteria(bodyContent);
    const tasks = await this.extractTasks(bodyContent, frontmatter.id);
    const isExternal = await this.isExternalImport();
    const title = isExternal ? frontmatter.title : `[${this.featureId}][${frontmatter.id}] ${frontmatter.title}`;
    if (!isExternal) {
      const titlePattern = /^\[FS-\d{3,}E?\]\[US-(?:[A-Z]+-)?(\d{3,})E?\] .+$/;
      if (!titlePattern.test(title)) {
        throw new Error(
          `Generated issue title has incorrect format: "${title}"
Expected: [FS-XXX][US-YYY] or [FS-XXX][US-PREFIX-YYY] Title
This indicates a bug in UserStoryIssueBuilder or invalid frontmatter.
Feature ID: ${this.featureId}
User Story ID: ${frontmatter.id}`
        );
      }
    }
    const body = this.buildBody({
      frontmatter,
      userStoryStatement,
      acceptanceCriteria,
      tasks,
      bodyContent
    });
    const labels = this.buildLabels(frontmatter);
    return {
      title,
      body,
      labels,
      userStoryId: frontmatter.id
    };
  }
  /**
   * Read User Story frontmatter
   */
  async readUserStoryFrontmatter() {
    const content = await readFile(this.userStoryPath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error(`${this.userStoryPath}: Missing YAML frontmatter`);
    }
    return yaml.parse(match[1]);
  }
  /**
   * Extract "As a... I want... So that..." statement
   */
  extractUserStoryStatement(content) {
    const userStoryMatch = content.match(
      /##\s*User Story\s*\n+([\s\S]*?)(?=\n##|$)/i
    );
    if (userStoryMatch) {
      return userStoryMatch[1].trim();
    }
    const asAMatch = content.match(/(\*\*As a\*\*[\s\S]*?\*\*So that\*\*[^\n]*)/i);
    if (asAMatch) {
      return asAMatch[1].trim();
    }
    return "";
  }
  /**
   * Extract Acceptance Criteria with AC-IDs and checkbox state
   */
  extractAcceptanceCriteria(content) {
    const criteria = [];
    const acMatch = content.match(
      /##\s*Acceptance Criteria\s*\n+([\s\S]*?)(?=\n##|$)/i
    );
    if (!acMatch) {
      return criteria;
    }
    const acSection = acMatch[1];
    const acPatternWithCheckbox = /(?:^|\n)\s*[-*]\s+\[([x ])\]\s+\*\*(AC-(?:[A-Z0-9]+-)*(\d+))\*\*:\s*([^\n]+)/g;
    const acPatternNoCheckbox = /(?:^|\n)\s*[-*]?\s*\*\*(AC-(?:[A-Z0-9]+-)*(\d+))\*\*:\s*([^\n]+)/g;
    let match;
    let foundAny = false;
    while ((match = acPatternWithCheckbox.exec(acSection)) !== null) {
      foundAny = true;
      criteria.push({
        id: match[2],
        // e.g., "AC-US1-01" or "AC-001"
        description: match[4].trim(),
        completed: match[1] === "x"
        // ✅ Read checkbox state from source!
      });
    }
    if (!foundAny) {
      while ((match = acPatternNoCheckbox.exec(acSection)) !== null) {
        criteria.push({
          id: match[1],
          // e.g., "AC-US1-01" or "AC-001"
          description: match[3].trim(),
          completed: false
          // Default to not completed
        });
      }
    }
    return criteria;
  }
  /**
   * Extract tasks from user story's ## Tasks section (NEW architecture)
   *
   * Previously: Read from increment tasks.md (LEGACY)
   * Now: Read from user story's ## Tasks section directly
   *
   * This enables project-specific tasks with completion tracking per user story.
   */
  async extractTasks(userStoryContent, userStoryId) {
    const tasks = [];
    const tasksMatch = userStoryContent.match(
      /##\s+Tasks\s*\n+([\s\S]*?)(?=\n##|>?\s*\*\*Note\*\*:|---+|$)/i
    );
    if (!tasksMatch) {
      console.log(`   \u2139\uFE0F  No ## Tasks section found in ${userStoryId}, falling back to legacy extraction`);
      return this.extractTasksLegacy(userStoryContent, userStoryId);
    }
    const tasksSection = tasksMatch[1];
    const taskPattern = /^[-*]\s+\[([x ])\]\s+(?:\[(T-\d+)\]\([^)]+\)|\*\*(T-\d+)\*\*):\s+(.+)$/gm;
    let match;
    while ((match = taskPattern.exec(tasksSection)) !== null) {
      const completed = match[1] === "x";
      const taskId = match[2] || match[3];
      const taskTitle = match[4].trim();
      tasks.push({
        id: taskId,
        title: taskTitle,
        completed
        // ✅ Read checkbox state directly from user story!
      });
    }
    return tasks;
  }
  /**
   * LEGACY: Extract tasks from increment's tasks.md (backward compatibility)
   *
   * Used as fallback when user story file doesn't have ## Tasks section.
   */
  async extractTasksLegacy(userStoryContent, userStoryId) {
    const tasks = [];
    const implMatch = userStoryContent.match(
      /##\s*Implementation\s*\n+([\s\S]*?)(?=\n##|$)/i
    );
    if (!implMatch) {
      return tasks;
    }
    const implSection = implMatch[1];
    const incrementMatch = implSection.match(/\*\*Increment\*\*:\s*\[([^\]]+)\]/);
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
    const taskPattern = /###?\s+(T-\d+):\s*([^\n]+)\n([\s\S]*?)(?=\n###?\s+T-\d+:|$)/g;
    let match;
    while ((match = taskPattern.exec(tasksContent)) !== null) {
      const taskId = match[1];
      const taskTitle = match[2].trim();
      const taskBody = match[3];
      const acMatch = taskBody.match(/\*\*(?:Satisfies ACs?|AC)\*\*:\s*([^\n]+)/);
      if (!acMatch) {
        continue;
      }
      const acList = acMatch[1].trim();
      const belongsToThisUS = acList.split(",").map((ac) => ac.trim()).some((acId) => {
        const usMatch = acId.match(/AC-([A-Z]+\d+)-/);
        if (!usMatch) return false;
        return usMatch[1] === userStoryId.replace("US-", "US");
      });
      if (!belongsToThisUS) {
        continue;
      }
      const statusMatch = taskBody.match(/\*\*Status\*\*:\s*\[([x ])\]/);
      const completed = statusMatch ? statusMatch[1] === "x" : false;
      tasks.push({
        id: taskId,
        title: taskTitle,
        completed
      });
    }
    return tasks;
  }
  /**
   * Build complete issue body
   */
  buildBody(data) {
    const sections = [];
    const progress = IssueStateManager.calculateProgress(
      data.acceptanceCriteria,
      data.tasks
    );
    sections.push(IssueStateManager.formatProgressMarkdown(progress));
    sections.push("");
    if (data.userStoryStatement) {
      sections.push("## User Story");
      sections.push("");
      sections.push(data.userStoryStatement);
      sections.push("");
    }
    if (data.acceptanceCriteria.length > 0) {
      sections.push("## Acceptance Criteria");
      sections.push("");
      for (const ac of data.acceptanceCriteria) {
        const checkbox = ac.completed ? "[x]" : "[ ]";
        sections.push(`- ${checkbox} **${ac.id}**: ${ac.description}`);
      }
      sections.push("");
    }
    if (data.tasks.length > 0) {
      sections.push("## Tasks");
      sections.push("");
      for (const task of data.tasks) {
        const checkbox = task.completed ? "[x]" : "[ ]";
        sections.push(`- ${checkbox} **${task.id}**: ${task.title}`);
      }
      sections.push("");
    }
    const rationaleMatch = data.bodyContent.match(
      /##\s*Business Rationale\s*\n+([\s\S]*?)(?=\n##|$)/i
    );
    if (rationaleMatch) {
      sections.push("## Business Rationale");
      sections.push("");
      sections.push(rationaleMatch[1].trim());
      sections.push("");
    }
    const relatedMatch = data.bodyContent.match(
      /##\s*Related User Stories\s*\n+([\s\S]*?)(?=\n##|---+|$)/i
    );
    if (relatedMatch) {
      sections.push("## Related User Stories");
      sections.push("");
      let relatedContent = relatedMatch[1].trim();
      if (this.repoOwner && this.repoName) {
        const baseUrl = `https://github.com/${this.repoOwner}/${this.repoName}/blob/${this.branch}`;
        relatedContent = relatedContent.replace(
          /\(([^)]+\.md)\)/g,
          (match, filename) => {
            if (filename.startsWith("http")) {
              return match;
            }
            const projectMatch = this.userStoryPath.match(/\/specs\/([^/]+)\/FS-[^/]+\//);
            const project = projectMatch ? projectMatch[1] : "default";
            const featureId = this.featureId;
            return `(${baseUrl}/.specweave/docs/internal/specs/${project}/${featureId}/${filename})`;
          }
        );
      }
      sections.push(relatedContent);
      sections.push("");
    }
    const implMatch = data.bodyContent.match(
      /##\s*Implementation\s*\n+([\s\S]*?)(?=\n##|$)/i
    );
    if (implMatch) {
      sections.push("## Implementation");
      sections.push("");
      let implContent = implMatch[1].trim();
      if (this.repoOwner && this.repoName) {
        const baseUrl = `https://github.com/${this.repoOwner}/${this.repoName}/blob/${this.branch}`;
        implContent = implContent.replace(
          /\.\.(\/\.\.)+\/increments\/([\w-]+)\/([\w.-]+(?:#[\w-]+)?)/g,
          `${baseUrl}/.specweave/increments/$2/$3`
        );
        implContent = implContent.replace(
          /\.\.(\/\.\.)+\/specs\/([\w-]+)\/([\w-]+)\/([\w.-]+(?:#[\w-]+)?)/g,
          `${baseUrl}/.specweave/docs/internal/specs/$2/$3/$4`
        );
      }
      sections.push(implContent);
      sections.push("");
    }
    sections.push("---");
    sections.push("");
    sections.push("## Links");
    sections.push("");
    if (this.repoOwner && this.repoName) {
      const baseUrl = `https://github.com/${this.repoOwner}/${this.repoName}/blob/${this.branch}`;
      const incrementMatch = implMatch?.[1]?.match(/\*\*Increment\*\*:\s*\[([^\]]+)\]/);
      const incrementId = incrementMatch ? incrementMatch[1] : null;
      if (incrementId) {
        sections.push(`- **Feature Spec**: [${this.featureId}](${baseUrl}/.specweave/increments/${incrementId}/spec.md)`);
      } else {
        const pathMatch = this.userStoryPath.match(/specs\/([^/]+)\/FS-\d+\//);
        const projectFolder = pathMatch ? pathMatch[1] : "default";
        sections.push(`- **Feature Spec**: [${this.featureId}](${baseUrl}/.specweave/docs/internal/specs/${projectFolder}/${this.featureId}/FEATURE.md)`);
      }
      if (incrementId) {
        sections.push(`- **User Story File**: [${path.basename(this.userStoryPath)}](${baseUrl}/.specweave/increments/${incrementId}/spec.md)`);
      } else {
        const relativeUSPath = path.relative(this.projectRoot, this.userStoryPath);
        sections.push(`- **User Story File**: [${path.basename(this.userStoryPath)}](${baseUrl}/${relativeUSPath})`);
      }
      if (incrementId) {
        sections.push(`- **Increment**: [${incrementId}](${baseUrl}/.specweave/increments/${incrementId})`);
      }
    } else {
      const incrementMatch = implMatch?.[1]?.match(/\*\*Increment\*\*:\s*\[([^\]]+)\]/);
      const incrementId = incrementMatch ? incrementMatch[1] : null;
      if (incrementId) {
        sections.push(`- **Feature Spec**: [${this.featureId}](.specweave/increments/${incrementId}/spec.md)`);
        sections.push(`- **User Story File**: [${path.basename(this.userStoryPath)}](.specweave/increments/${incrementId}/spec.md)`);
      } else {
        const pathMatch = this.userStoryPath.match(/specs\/([^/]+)\/FS-\d+\//);
        const projectFolder = pathMatch ? pathMatch[1] : "default";
        sections.push(`- **Feature Spec**: [${this.featureId}](../.specweave/docs/internal/specs/${projectFolder}/${this.featureId}/FEATURE.md)`);
        sections.push(`- **User Story File**: [${path.basename(this.userStoryPath)}](${this.userStoryPath})`);
      }
    }
    sections.push("");
    sections.push("---");
    sections.push("");
    sections.push("\u{1F916} Auto-created by SpecWeave User Story Sync | Updates automatically");
    return sections.join("\n");
  }
  /**
   * Build labels for the issue
   *
   * CRITICAL: Label names must match repository labels exactly!
   * Repository uses: status:complete, status:active, status:not_started
   *
   * v0.35.0: Project derived from frontmatter.project in us-*.md files.
   * Living docs sync transforms spec.md **Project**: → us-*.md frontmatter project:
   */
  buildLabels(frontmatter) {
    const labels = ["user-story", "specweave"];
    if (frontmatter.status) {
      let statusLabel;
      switch (frontmatter.status) {
        case "completed":
        case "complete":
          statusLabel = "status:complete";
          break;
        case "active":
        case "in-progress":
          statusLabel = "status:active";
          break;
        case "planning":
        case "not-started":
          statusLabel = "status:not_started";
          break;
        default:
          statusLabel = `status:${frontmatter.status}`;
      }
      labels.push(statusLabel);
    }
    if (frontmatter.priority) {
      labels.push(frontmatter.priority.toLowerCase());
    }
    const project = frontmatter.project?.toLowerCase();
    if (project && project !== "default") {
      labels.push(`project:${project}`);
    }
    return labels;
  }
  /**
   * Check if this issue belongs to an externally imported increment.
   * External imports should preserve original titles without [FS-XXX] prefix.
   */
  async isExternalImport() {
    try {
      const incrementMatch = this.userStoryPath.match(/\.specweave\/increments\/([^/]+)\//);
      if (incrementMatch) {
        const metaPath = path.join(this.projectRoot, ".specweave/increments", incrementMatch[1], "metadata.json");
        if (existsSync(metaPath)) {
          const meta = JSON.parse(await readFile(metaPath, "utf-8"));
          return meta.origin === "external";
        }
      }
      const incrementsDir = path.join(this.projectRoot, ".specweave/increments");
      if (existsSync(incrementsDir)) {
        const { readdirSync } = await import("fs");
        for (const dir of readdirSync(incrementsDir)) {
          const metaPath = path.join(incrementsDir, dir, "metadata.json");
          if (existsSync(metaPath)) {
            const meta = JSON.parse(await readFile(metaPath, "utf-8"));
            if (meta.origin === "external") {
              const numMatch = dir.match(/^(\d+)/);
              if (numMatch) {
                const num = parseInt(numMatch[1], 10);
                const fid = `FS-${String(num).padStart(3, "0")}`;
                if (fid === this.featureId) return true;
              }
            }
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }
  /**
   * Capitalize first letter
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
export {
  UserStoryIssueBuilder
};
