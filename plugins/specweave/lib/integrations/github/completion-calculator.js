import { readFile } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import * as yaml from "yaml";
class CompletionCalculator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  /**
   * Calculate ACTUAL completion from markdown checkboxes
   *
   * Returns true only if:
   * - All ACs have [x] (not [ ])
   * - All Tasks have **Status**: [x] (not [ ])
   * - At least 1 AC exists (no empty user stories)
   *
   * @param userStoryPath - Path to us-*.md file
   * @returns Completion status with detailed metrics
   */
  async calculateCompletion(userStoryPath) {
    const content = await readFile(userStoryPath, "utf-8");
    const frontmatter = this.parseUserStoryFrontmatter(content);
    const acs = this.extractAcceptanceCriteria(content);
    const tasks = await this.extractTasks(content, frontmatter.id);
    const acsCompleted = acs.filter((ac) => ac.completed).length;
    const tasksCompleted = tasks.filter((t) => t.completed).length;
    const overallComplete = acs.length > 0 && acsCompleted === acs.length && (tasks.length === 0 || tasksCompleted === tasks.length);
    return {
      acsTotal: acs.length,
      acsCompleted,
      acsPercentage: acs.length > 0 ? acsCompleted / acs.length * 100 : 0,
      tasksTotal: tasks.length,
      tasksCompleted,
      tasksPercentage: tasks.length > 0 ? tasksCompleted / tasks.length * 100 : 0,
      overallComplete,
      blockingAcs: acs.filter((ac) => !ac.completed).map((ac) => ac.id),
      blockingTasks: tasks.filter((t) => !t.completed).map((t) => t.id),
      // v0.35.1: Include frontmatter status for external-origin USs fallback
      frontmatterStatus: frontmatter.status
    };
  }
  /**
   * Parse User Story frontmatter
   */
  parseUserStoryFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error("Missing YAML frontmatter in user story");
    }
    return yaml.parse(match[1]);
  }
  /**
   * Extract Acceptance Criteria with checkbox state
   *
   * Supports TWO formats:
   * - Format 1 (preferred): AC-US1-01, AC-US1-02 (project-specific)
   * - Format 2 (legacy): AC-001, AC-002, AC-020 (global)
   *
   * Patterns:
   * - [x] **AC-US1-01**: Description (completed)
   * - [ ] **AC-US1-01**: Description (not completed)
   * - **AC-US1-01**: Description (no checkbox, default to not completed)
   */
  extractAcceptanceCriteria(content) {
    const criteria = [];
    const acMatch = content.match(/##\s*Acceptance Criteria\s*\n+([\s\S]*?)(?=\n##|$)/i);
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
        // e.g., "AC-US1-01" or "AC-020"
        description: match[4].trim(),
        completed: match[1] === "x"
        // ✅ Read checkbox state from source!
      });
    }
    if (!foundAny) {
      while ((match = acPatternNoCheckbox.exec(acSection)) !== null) {
        criteria.push({
          id: match[1],
          // e.g., "AC-US1-01" or "AC-020"
          description: match[3].trim(),
          completed: false
          // Default to not completed
        });
      }
    }
    return criteria;
  }
  /**
   * Extract tasks from increment's tasks.md that map to this User Story
   *
   * Process:
   * 1. Find increment link in user story's "Implementation" section
   * 2. Read increment's tasks.md
   * 3. Filter tasks that reference this user story (via **User Story** field OR AC-IDs)
   * 4. Extract completion status from **Status**: [x] or [ ]
   *
   * IMPORTANT: Checks **User Story** field FIRST (handles multi-story tasks like "US-001, US-002"),
   * then falls back to AC-based filtering. Also handles "Satisfies ACs: All" correctly.
   */
  async extractTasks(userStoryContent, userStoryId) {
    const tasks = [];
    const implMatch = userStoryContent.match(/##\s*Implementation\s*\n+([\s\S]*?)(?=\n##|$)/i);
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
    const normalizeUsId = (id) => {
      const num = id.replace(/^US-?0*/, "");
      return `US-${num.padStart(3, "0")}`;
    };
    const normalizedCurrentUs = normalizeUsId(userStoryId);
    const taskPattern = /###?\s+(T-\d+):\s*([^\n]+)\n([\s\S]*?)(?=\n###?\s+T-\d+:|$)/g;
    let match;
    while ((match = taskPattern.exec(tasksContent)) !== null) {
      const taskId = match[1];
      const taskTitle = match[2].trim();
      const taskBody = match[3];
      const userStoryFieldMatch = taskBody.match(/\*\*User Story\*\*:\s*([^\n]+)/);
      let belongsToThisUS = false;
      if (userStoryFieldMatch) {
        const userStoryList = userStoryFieldMatch[1].trim();
        const userStoryIds = userStoryList.split(",").map((us) => us.trim());
        belongsToThisUS = userStoryIds.some((usId) => {
          return normalizeUsId(usId) === normalizedCurrentUs;
        });
      }
      if (!belongsToThisUS) {
        const acMatch2 = taskBody.match(/\*\*(?:Satisfies ACs?|AC)\*\*:\s*([^\n]+)/);
        if (acMatch2) {
          const acList = acMatch2[1].trim();
          if (acList.toLowerCase() !== "all") {
            const acIds2 = acList.split(",").map((ac) => ac.trim());
            belongsToThisUS = acIds2.some((acId) => {
              const usMatch = acId.match(/AC-([A-Z]+\d+)-/);
              if (!usMatch) return false;
              const extractedUsId = usMatch[1];
              return normalizeUsId(extractedUsId) === normalizedCurrentUs;
            });
          }
        }
      }
      if (!belongsToThisUS) {
        continue;
      }
      const statusMatch = taskBody.match(/\*\*Status\*\*:\s*\[([x ])\]/);
      const completed = statusMatch ? statusMatch[1] === "x" : false;
      const acMatch = taskBody.match(/\*\*(?:Satisfies ACs?|AC)\*\*:\s*([^\n]+)/);
      const acIds = acMatch ? acMatch[1].trim().split(",").map((ac) => ac.trim()) : [];
      tasks.push({
        id: taskId,
        title: taskTitle,
        completed,
        // ✅ Now reads actual completion status!
        userStories: acIds
      });
    }
    return tasks;
  }
  /**
   * Build completion comment for GitHub issue closure
   *
   * Used when closing issue after verification
   */
  buildCompletionComment(completion) {
    return `\u2705 **User Story Verified Complete**

**Completion Status**:
- \u2705 Acceptance Criteria: ${completion.acsCompleted}/${completion.acsTotal} (100%)
- \u2705 Implementation Tasks: ${completion.tasksCompleted}/${completion.tasksTotal} (100%)

All work has been verified and completed. This issue is now closed.

\u{1F916} Auto-verified by SpecWeave AC Completion Gate`;
  }
  /**
   * Build progress comment for GitHub issue update
   *
   * Used when issue stays open (not 100% complete)
   */
  buildProgressComment(completion) {
    const sections = [];
    sections.push("\u{1F4CA} **Progress Update**");
    sections.push("");
    const acIcon = completion.acsPercentage === 100 ? "\u2705" : "\u{1F504}";
    sections.push(
      `${acIcon} **Acceptance Criteria**: ${completion.acsCompleted}/${completion.acsTotal} (${completion.acsPercentage.toFixed(0)}%)`
    );
    if (completion.blockingAcs.length > 0) {
      sections.push("");
      sections.push("**Incomplete ACs**:");
      for (const acId of completion.blockingAcs) {
        sections.push(`- [ ] ${acId}`);
      }
    }
    sections.push("");
    const taskIcon = completion.tasksPercentage === 100 ? "\u2705" : "\u{1F504}";
    sections.push(
      `${taskIcon} **Implementation Tasks**: ${completion.tasksCompleted}/${completion.tasksTotal} (${completion.tasksPercentage.toFixed(0)}%)`
    );
    if (completion.blockingTasks.length > 0) {
      sections.push("");
      sections.push("**Incomplete Tasks**:");
      for (const taskId of completion.blockingTasks) {
        sections.push(`- [ ] ${taskId}`);
      }
    }
    sections.push("");
    sections.push("---");
    sections.push("\u{1F916} Auto-updated by SpecWeave AC Completion Gate");
    return sections.join("\n");
  }
  /**
   * Build reopen comment for GitHub issue
   *
   * Used when reopening prematurely closed issue
   */
  buildReopenComment(completion, reason = "Work verification failed") {
    const sections = [];
    sections.push(`\u{1F504} **Reopening Issue - ${reason}**`);
    sections.push("");
    sections.push("**Current Status**:");
    sections.push(
      `- Acceptance Criteria: ${completion.acsCompleted}/${completion.acsTotal} (${completion.acsPercentage.toFixed(0)}%)`
    );
    sections.push(
      `- Implementation Tasks: ${completion.tasksCompleted}/${completion.tasksTotal} (${completion.tasksPercentage.toFixed(0)}%)`
    );
    const totalBlocking = completion.blockingAcs.length + completion.blockingTasks.length;
    if (totalBlocking > 0) {
      sections.push("");
      sections.push(`**Blocking Items** (${totalBlocking}):`);
      if (completion.blockingAcs.length > 0) {
        sections.push("");
        sections.push("**Acceptance Criteria**:");
        for (const acId of completion.blockingAcs) {
          sections.push(`- [ ] ${acId}`);
        }
      }
      if (completion.blockingTasks.length > 0) {
        sections.push("");
        sections.push("**Implementation Tasks**:");
        for (const taskId of completion.blockingTasks) {
          sections.push(`- [ ] ${taskId}`);
        }
      }
    }
    sections.push("");
    sections.push("\u26A0\uFE0F This issue cannot be closed until all ACs and tasks are verified complete.");
    sections.push("");
    sections.push("\u{1F916} Auto-reopened by SpecWeave AC Completion Gate");
    return sections.join("\n");
  }
}
export {
  CompletionCalculator
};
