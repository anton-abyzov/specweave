/**
 * User Story Issue Builder - Creates GitHub issue content for individual User Stories
 *
 * Architecture (Universal Hierarchy):
 * - Feature (FS-033) → GitHub Milestone
 * - User Story (US-001) → GitHub Issue (this builder creates the body)
 * - Tasks (T-001, T-002) → Checkboxes in issue body
 *
 * Key Features:
 * - Reads single us-*.md file
 * - Extracts acceptance criteria as checkboxes
 * - Maps tasks from increment's tasks.md
 * - Generates GitHub issue body with proper formatting
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface UserStoryFrontmatter {
  id: string;
  feature: string;
  title: string;
  status: 'complete' | 'active' | 'planning' | 'not-started';
  project?: string;  // ✅ Optional - not all user stories specify project
  priority?: string;
  created: string;
  completed?: string;
}

interface AcceptanceCriteria {
  id: string; // e.g., "AC-US1-01"
  description: string;
  completed: boolean;
}

interface Task {
  id: string; // e.g., "T-001"
  title: string;
  completed: boolean;
}

export class UserStoryIssueBuilder {
  private userStoryPath: string;
  private projectRoot: string;
  private featureId: string;
  private repoOwner?: string;
  private repoName?: string;
  private branch?: string;

  constructor(
    userStoryPath: string,
    projectRoot: string,
    featureId: string,
    repoInfo?: { owner: string; repo: string; branch?: string }
  ) {
    this.userStoryPath = userStoryPath;
    this.projectRoot = projectRoot;
    this.featureId = featureId;
    this.repoOwner = repoInfo?.owner;
    this.repoName = repoInfo?.repo;
    this.branch = repoInfo?.branch || 'develop';
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
  async buildIssueBody(): Promise<{
    title: string;
    body: string;
    labels: string[];
    userStoryId: string;
    status?: string;
  }> {
    // 1. Read User Story metadata
    const frontmatter = await this.readUserStoryFrontmatter();
    const content = await readFile(this.userStoryPath, 'utf-8');
    const bodyContent = content.slice(content.indexOf('---', 3) + 3).trim();

    // 2. Extract sections
    const userStoryStatement = this.extractUserStoryStatement(bodyContent);
    const acceptanceCriteria = this.extractAcceptanceCriteria(bodyContent);
    const tasks = await this.extractTasks(bodyContent, frontmatter.id);

    // 3. Build issue title
    const title = `[${this.featureId}][${frontmatter.id}] ${frontmatter.title}`;

    // 4. Build issue body
    const body = this.buildBody({
      frontmatter,
      userStoryStatement,
      acceptanceCriteria,
      tasks,
      bodyContent
    });

    // 5. Determine labels
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
  private async readUserStoryFrontmatter(): Promise<UserStoryFrontmatter> {
    const content = await readFile(this.userStoryPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      throw new Error(`${this.userStoryPath}: Missing YAML frontmatter`);
    }

    return yaml.parse(match[1]) as UserStoryFrontmatter;
  }

  /**
   * Extract "As a... I want... So that..." statement
   */
  private extractUserStoryStatement(content: string): string {
    // Look for "User Story" section or "As a" pattern
    const userStoryMatch = content.match(
      /##\s*User Story\s*\n+([\s\S]*?)(?=\n##|$)/i
    );

    if (userStoryMatch) {
      return userStoryMatch[1].trim();
    }

    // Fallback: Look for "As a" pattern
    const asAMatch = content.match(/(\*\*As a\*\*[\s\S]*?\*\*So that\*\*[^\n]*)/i);
    if (asAMatch) {
      return asAMatch[1].trim();
    }

    return '';
  }

  /**
   * Extract Acceptance Criteria with AC-IDs and checkbox state
   */
  private extractAcceptanceCriteria(content: string): AcceptanceCriteria[] {
    const criteria: AcceptanceCriteria[] = [];

    // Look for "Acceptance Criteria" section
    const acMatch = content.match(
      /##\s*Acceptance Criteria\s*\n+([\s\S]*?)(?=\n##|$)/i
    );

    if (!acMatch) {
      return criteria;
    }

    const acSection = acMatch[1];

    // ✅ FIX: Extract checkbox state and AC-IDs
    // Supports TWO formats:
    // Format 1 (preferred): AC-US1-01, AC-US1-02, etc.
    // Format 2 (legacy): AC-001, AC-002, etc.
    // Patterns:
    // - [x] **AC-US1-01**: Description (completed)
    // - [ ] **AC-US1-01**: Description (not completed)
    // - [x] **AC-001**: Description (legacy format, completed)
    // - **AC-US1-01**: Description (no checkbox, default to not completed)
    const acPatternWithCheckbox = /(?:^|\n)\s*[-*]\s+\[([x ])\]\s+\*\*([A-Z]+-(?:[A-Z]+\d+-)?(\d+))\*\*:\s*([^\n]+)/g;
    const acPatternNoCheckbox = /(?:^|\n)\s*[-*]?\s*\*\*([A-Z]+-(?:[A-Z]+\d+-)?(\d+))\*\*:\s*([^\n]+)/g;

    // First try pattern with checkboxes
    let match;
    let foundAny = false;

    while ((match = acPatternWithCheckbox.exec(acSection)) !== null) {
      foundAny = true;
      criteria.push({
        id: match[2], // e.g., "AC-US1-01" or "AC-001"
        description: match[4].trim(),
        completed: match[1] === 'x' // ✅ Read checkbox state from source!
      });
    }

    // If no checkboxes found, try pattern without checkboxes
    if (!foundAny) {
      while ((match = acPatternNoCheckbox.exec(acSection)) !== null) {
        criteria.push({
          id: match[1], // e.g., "AC-US1-01" or "AC-001"
          description: match[3].trim(),
          completed: false // Default to not completed
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
  private async extractTasks(
    userStoryContent: string,
    userStoryId: string
  ): Promise<Task[]> {
    const tasks: Task[] = [];

    // ✅ NEW: Look for ## Tasks section in user story file
    const tasksMatch = userStoryContent.match(
      /##\s+Tasks\s*\n+([\s\S]*?)(?=\n##|>?\s*\*\*Note\*\*:|---+|$)/i
    );

    if (!tasksMatch) {
      // FALLBACK: Try old architecture (read from increment tasks.md)
      console.log(`   ℹ️  No ## Tasks section found in ${userStoryId}, falling back to legacy extraction`);
      return this.extractTasksLegacy(userStoryContent, userStoryId);
    }

    const tasksSection = tasksMatch[1];

    // Pattern: - [x] **T-001**: Task title or - [ ] **T-001**: Task title
    const taskPattern = /^[-*]\s+\[([x ])\]\s+\*\*(T-\d+)\*\*:\s+(.+)$/gm;

    let match;
    while ((match = taskPattern.exec(tasksSection)) !== null) {
      const completed = match[1] === 'x';
      const taskId = match[2];
      const taskTitle = match[3].trim();

      tasks.push({
        id: taskId,
        title: taskTitle,
        completed // ✅ Read checkbox state directly from user story!
      });
    }

    return tasks;
  }

  /**
   * LEGACY: Extract tasks from increment's tasks.md (backward compatibility)
   *
   * Used as fallback when user story file doesn't have ## Tasks section.
   */
  private async extractTasksLegacy(
    userStoryContent: string,
    userStoryId: string
  ): Promise<Task[]> {
    const tasks: Task[] = [];

    // Look for "Implementation" section with increment link
    const implMatch = userStoryContent.match(
      /##\s*Implementation\s*\n+([\s\S]*?)(?=\n##|$)/i
    );

    if (!implMatch) {
      return tasks;
    }

    const implSection = implMatch[1];

    // Extract increment ID from Implementation section
    // Pattern: **Increment**: [0031-external-tool-status-sync](...)
    const incrementMatch = implSection.match(/\*\*Increment\*\*:\s*\[([^\]]+)\]/);

    if (!incrementMatch) {
      return tasks;
    }

    const incrementId = incrementMatch[1];

    // Try to read increment's tasks.md
    const tasksPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'tasks.md'
    );

    if (!existsSync(tasksPath)) {
      return tasks;
    }

    const tasksContent = await readFile(tasksPath, 'utf-8');

    // Extract tasks that reference this User Story via AC-IDs
    // Pattern: ### T-001: Task Title\n**User Story**: ...\n\n**Status**: [x] (100% - Completed)\n\n**AC**: AC-US1-01
    // Note: Status field format: **Status**: [x] or [ ]
    const taskPattern = /###?\s+(T-\d+):\s*([^\n]+)\n([\s\S]*?)(?=\n###?\s+T-\d+:|$)/g;
    let match;

    while ((match = taskPattern.exec(tasksContent)) !== null) {
      const taskId = match[1];
      const taskTitle = match[2].trim();
      const taskBody = match[3];

      // Extract AC list
      const acMatch = taskBody.match(/\*\*AC\*\*:\s*([^\n]+)/);
      if (!acMatch) {
        continue; // Skip tasks without AC field
      }
      const acList = acMatch[1].trim();

      // Check if any AC in this task belongs to current User Story
      // AC-US1-01 → US-001
      const belongsToThisUS = acList
        .split(',')
        .map((ac) => ac.trim())
        .some((acId) => {
          const usMatch = acId.match(/AC-([A-Z]+\d+)-/);
          if (!usMatch) return false;
          return usMatch[1] === userStoryId.replace('US-', 'US');
        });

      if (!belongsToThisUS) {
        continue;
      }

      // ✅ Extract completion status from **Status**: [x] or [ ]
      const statusMatch = taskBody.match(/\*\*Status\*\*:\s*\[([x ])\]/);
      const completed = statusMatch ? statusMatch[1] === 'x' : false;

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
  private buildBody(data: {
    frontmatter: UserStoryFrontmatter;
    userStoryStatement: string;
    acceptanceCriteria: AcceptanceCriteria[];
    tasks: Task[];
    bodyContent: string;
  }): string {
    const sections: string[] = [];

    // Header with metadata
    sections.push(`**Feature**: ${this.featureId}`);
    sections.push(`**Status**: ${this.capitalize(data.frontmatter.status)}`);
    sections.push(`**Priority**: ${data.frontmatter.priority || 'P2'}`);
    // ✅ FIX: Only output Project if defined and not "default"
    if (data.frontmatter.project && data.frontmatter.project !== 'default') {
      sections.push(`**Project**: ${data.frontmatter.project}`);
    }
    sections.push('');

    // User Story statement
    if (data.userStoryStatement) {
      sections.push('## User Story');
      sections.push('');
      sections.push(data.userStoryStatement);
      sections.push('');
    }

    // Acceptance Criteria
    if (data.acceptanceCriteria.length > 0) {
      sections.push('## Acceptance Criteria');
      sections.push('');
      for (const ac of data.acceptanceCriteria) {
        const checkbox = ac.completed ? '[x]' : '[ ]';
        sections.push(`- ${checkbox} **${ac.id}**: ${ac.description}`);
      }
      sections.push('');
    }

    // Tasks
    if (data.tasks.length > 0) {
      sections.push('## Tasks');
      sections.push('');
      for (const task of data.tasks) {
        const checkbox = task.completed ? '[x]' : '[ ]';
        sections.push(`- ${checkbox} **${task.id}**: ${task.title}`);
      }
      sections.push('');
    }

    // Extract Business Rationale if present
    const rationaleMatch = data.bodyContent.match(
      /##\s*Business Rationale\s*\n+([\s\S]*?)(?=\n##|$)/i
    );
    if (rationaleMatch) {
      sections.push('## Business Rationale');
      sections.push('');
      sections.push(rationaleMatch[1].trim());
      sections.push('');
    }

    // ✅ NEW: Extract Related User Stories if present
    const relatedMatch = data.bodyContent.match(
      /##\s*Related User Stories\s*\n+([\s\S]*?)(?=\n##|---+|$)/i
    );
    if (relatedMatch) {
      sections.push('## Related User Stories');
      sections.push('');

      // Convert relative paths to GitHub blob URLs
      let relatedContent = relatedMatch[1].trim();
      if (this.repoOwner && this.repoName) {
        const baseUrl = `https://github.com/${this.repoOwner}/${this.repoName}/blob/${this.branch}`;

        // Replace relative links like us-002-*.md to proper GitHub URLs
        // Pattern: - [US-002: Title](us-002-file-name.md)
        relatedContent = relatedContent.replace(
          /\(([^)]+\.md)\)/g,
          (match, filename) => {
            // If it's already an absolute URL, don't change it
            if (filename.startsWith('http')) {
              return match;
            }
            // Get the project folder from the current user story path
            const projectMatch = this.userStoryPath.match(/\/specs\/([^/]+)\/FS-[^/]+\//);
            const project = projectMatch ? projectMatch[1] : 'default';
            const featureId = this.featureId;
            return `(${baseUrl}/.specweave/docs/internal/specs/${project}/${featureId}/${filename})`;
          }
        );
      }

      sections.push(relatedContent);
      sections.push('');
    }

    // ✅ FIX: Extract Implementation section if present
    const implMatch = data.bodyContent.match(
      /##\s*Implementation\s*\n+([\s\S]*?)(?=\n##|$)/i
    );
    if (implMatch) {
      sections.push('## Implementation');
      sections.push('');

      // Convert relative paths to GitHub blob URLs
      let implContent = implMatch[1].trim();
      if (this.repoOwner && this.repoName) {
        const baseUrl = `https://github.com/${this.repoOwner}/${this.repoName}/blob/${this.branch}`;

        // Replace relative paths like ../../../../../increments/0031-*/tasks.md
        // Pattern: ../ repeated multiple times, then increments/XXXX-name/tasks.md or spec.md
        implContent = implContent.replace(
          /\.\.(\/\.\.)+\/increments\/([\w-]+)\/([\w.-]+(?:#[\w-]+)?)/g,
          `${baseUrl}/.specweave/increments/$2/$3`
        );

        // Replace relative paths to specs like ../../specs/default/FS-XXX/...
        implContent = implContent.replace(
          /\.\.(\/\.\.)+\/specs\/([\w-]+)\/([\w-]+)\/([\w.-]+(?:#[\w-]+)?)/g,
          `${baseUrl}/.specweave/docs/internal/specs/$2/$3/$4`
        );
      }

      sections.push(implContent);
      sections.push('');
    }

    // Links
    sections.push('---');
    sections.push('');
    sections.push('## Links');
    sections.push('');

    // Generate proper GitHub blob URLs
    if (this.repoOwner && this.repoName) {
      const baseUrl = `https://github.com/${this.repoOwner}/${this.repoName}/blob/${this.branch}`;

      // Feature Spec link
      sections.push(`- **Feature Spec**: [${this.featureId}](${baseUrl}/.specweave/docs/internal/specs/_features/${this.featureId}/FEATURE.md)`);

      // User Story File link (relative to project root)
      const relativeUSPath = path.relative(this.projectRoot, this.userStoryPath);
      sections.push(`- **User Story File**: [${path.basename(this.userStoryPath)}](${baseUrl}/${relativeUSPath})`);

      // Increment link (extracted from Implementation section)
      const incrementMatch = implMatch?.[1]?.match(/\*\*Increment\*\*:\s*\[([^\]]+)\]/);
      if (incrementMatch) {
        const incrementId = incrementMatch[1];
        sections.push(`- **Increment**: [${incrementId}](${baseUrl}/.specweave/increments/${incrementId})`);
      }
    } else {
      // Fallback to relative links if repo info not provided
      sections.push(`- **Feature Spec**: [${this.featureId}](../.specweave/docs/internal/specs/_features/${this.featureId}/FEATURE.md)`);
      sections.push(`- **User Story File**: [${path.basename(this.userStoryPath)}](${this.userStoryPath})`);
    }

    sections.push('');
    sections.push('---');
    sections.push('');
    sections.push('🤖 Auto-created by SpecWeave User Story Sync | Updates automatically');

    return sections.join('\n');
  }

  /**
   * Build labels for the issue
   */
  private buildLabels(frontmatter: UserStoryFrontmatter): string[] {
    const labels: string[] = ['user-story', 'specweave'];

    // Add status label
    if (frontmatter.status) {
      labels.push(`status:${frontmatter.status}`);
    }

    // Add priority label
    if (frontmatter.priority) {
      labels.push(frontmatter.priority.toLowerCase());
    }

    // Add project label
    if (frontmatter.project && frontmatter.project !== 'default') {
      labels.push(`project:${frontmatter.project}`);
    }

    return labels;
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
