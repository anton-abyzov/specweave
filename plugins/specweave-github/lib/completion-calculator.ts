/**
 * Completion Calculator - Verifies actual work completion from markdown checkboxes
 *
 * CRITICAL FIX: Prevents premature GitHub issue closure by verifying actual
 * AC and Task completion state, not just frontmatter status.
 *
 * Problem:
 * - OLD: Issues closed based on frontmatter `status: complete`
 * - Issue #574: Closed with 0/5 ACs complete!
 *
 * Solution:
 * - NEW: Parse actual checkbox states ([x] vs [ ])
 * - Close ONLY when ALL ACs and ALL tasks are verified [x]
 *
 * Architecture:
 * - Acceptance Criteria: Read from us-*.md files
 * - Tasks: Read from increment's tasks.md
 * - Verification Gate: 100% completion required
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

/**
 * Acceptance Criteria with completion status
 */
export interface AcceptanceCriteria {
  id: string; // e.g., "AC-US1-01" or "AC-020"
  description: string;
  completed: boolean; // ✅ Read from [x] or [ ] checkbox
}

/**
 * Implementation Task with completion status
 */
export interface Task {
  id: string; // e.g., "T-001"
  title: string;
  completed: boolean; // ✅ Read from **Status**: [x] or [ ]
  userStories: string[]; // ACs this task implements (e.g., ["AC-US1-01", "AC-US1-02"])
}

/**
 * Complete verification status
 */
export interface CompletionStatus {
  // Acceptance Criteria metrics
  acsTotal: number;
  acsCompleted: number;
  acsPercentage: number;

  // Task metrics
  tasksTotal: number;
  tasksCompleted: number;
  tasksPercentage: number;

  // Overall completion gate
  overallComplete: boolean; // true ONLY if ALL ACs AND tasks are [x]

  // Blocking items (for reopen)
  blockingAcs: string[]; // List of incomplete AC-IDs
  blockingTasks: string[]; // List of incomplete Task-IDs
}

/**
 * User Story Frontmatter
 */
interface UserStoryFrontmatter {
  id: string;
  feature: string;
  title: string;
  status: 'complete' | 'active' | 'planning' | 'not-started';
  project?: string;
}

export class CompletionCalculator {
  private projectRoot: string;

  constructor(projectRoot: string) {
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
  async calculateCompletion(userStoryPath: string): Promise<CompletionStatus> {
    // Step 1: Read and parse user story
    const content = await readFile(userStoryPath, 'utf-8');
    const frontmatter = this.parseUserStoryFrontmatter(content);

    // Step 2: Extract Acceptance Criteria
    const acs = this.extractAcceptanceCriteria(content);

    // Step 3: Extract Tasks from increment (if linked)
    const tasks = await this.extractTasks(content, frontmatter.id);

    // Step 4: Calculate metrics
    const acsCompleted = acs.filter((ac) => ac.completed).length;
    const tasksCompleted = tasks.filter((t) => t.completed).length;

    // Step 5: Determine overall completion
    // MUST have:
    // - At least 1 AC (no empty user stories)
    // - ALL ACs completed
    // - ALL Tasks completed (or no tasks if not implemented yet)
    const overallComplete =
      acs.length > 0 &&
      acsCompleted === acs.length &&
      (tasks.length === 0 || tasksCompleted === tasks.length);

    return {
      acsTotal: acs.length,
      acsCompleted,
      acsPercentage: acs.length > 0 ? (acsCompleted / acs.length) * 100 : 0,
      tasksTotal: tasks.length,
      tasksCompleted,
      tasksPercentage: tasks.length > 0 ? (tasksCompleted / tasks.length) * 100 : 0,
      overallComplete,
      blockingAcs: acs.filter((ac) => !ac.completed).map((ac) => ac.id),
      blockingTasks: tasks.filter((t) => !t.completed).map((t) => t.id),
    };
  }

  /**
   * Parse User Story frontmatter
   */
  private parseUserStoryFrontmatter(content: string): UserStoryFrontmatter {
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      throw new Error('Missing YAML frontmatter in user story');
    }

    return yaml.parse(match[1]) as UserStoryFrontmatter;
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
  private extractAcceptanceCriteria(content: string): AcceptanceCriteria[] {
    const criteria: AcceptanceCriteria[] = [];

    // Look for "Acceptance Criteria" section
    const acMatch = content.match(/##\s*Acceptance Criteria\s*\n+([\s\S]*?)(?=\n##|$)/i);

    if (!acMatch) {
      return criteria;
    }

    const acSection = acMatch[1];

    // Pattern with checkboxes (PREFERRED)
    // Matches: - [x] **AC-US1-01**: Description
    //          - [ ] **AC-020**: Description
    const acPatternWithCheckbox =
      /(?:^|\n)\s*[-*]\s+\[([x ])\]\s+\*\*([A-Z]+-(?:[A-Z]+\d+-)?(\d+))\*\*:\s*([^\n]+)/g;

    // Pattern without checkboxes (FALLBACK)
    // Matches: - **AC-US1-01**: Description
    const acPatternNoCheckbox =
      /(?:^|\n)\s*[-*]?\s*\*\*([A-Z]+-(?:[A-Z]+\d+-)?(\d+))\*\*:\s*([^\n]+)/g;

    // First try pattern with checkboxes
    let match;
    let foundAny = false;

    while ((match = acPatternWithCheckbox.exec(acSection)) !== null) {
      foundAny = true;
      criteria.push({
        id: match[2], // e.g., "AC-US1-01" or "AC-020"
        description: match[4].trim(),
        completed: match[1] === 'x', // ✅ Read checkbox state from source!
      });
    }

    // If no checkboxes found, try pattern without checkboxes
    if (!foundAny) {
      while ((match = acPatternNoCheckbox.exec(acSection)) !== null) {
        criteria.push({
          id: match[1], // e.g., "AC-US1-01" or "AC-020"
          description: match[3].trim(),
          completed: false, // Default to not completed
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
  private async extractTasks(userStoryContent: string, userStoryId: string): Promise<Task[]> {
    const tasks: Task[] = [];

    // Look for "Implementation" section with increment link
    const implMatch = userStoryContent.match(/##\s*Implementation\s*\n+([\s\S]*?)(?=\n##|$)/i);

    if (!implMatch) {
      return tasks; // No implementation yet
    }

    const implSection = implMatch[1];

    // Extract increment ID from Implementation section
    // Pattern: **Increment**: [0031-external-tool-status-sync](...)
    const incrementMatch = implSection.match(/\*\*Increment\*\*:\s*\[([^\]]+)\]/);

    if (!incrementMatch) {
      return tasks; // No increment linked
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
      return tasks; // Increment has no tasks.md yet
    }

    const tasksContent = await readFile(tasksPath, 'utf-8');

    // Normalize the current user story ID for comparison
    // Handles: "US-001", "US-1", "US001", "001"
    const normalizeUsId = (id: string): string => {
      const num = id.replace(/^US-?0*/, ''); // Remove "US-", "US", and leading zeros
      return `US-${num.padStart(3, '0')}`; // Normalize to "US-001" format
    };
    const normalizedCurrentUs = normalizeUsId(userStoryId);

    // Extract tasks that reference this User Story
    // Pattern:
    // ### T-001: Task Title
    // **User Story**: US-001, US-002  ← Check this FIRST!
    // **Satisfies ACs**: AC-US1-01, AC-US1-02 (or "All")
    // **Status**: [x] completed
    const taskPattern = /###?\s+(T-\d+):\s*([^\n]+)\n([\s\S]*?)(?=\n###?\s+T-\d+:|$)/g;
    let match;

    while ((match = taskPattern.exec(tasksContent)) !== null) {
      const taskId = match[1];
      const taskTitle = match[2].trim();
      const taskBody = match[3];

      // PRIORITY 1: Check **User Story** field directly (handles multi-story tasks!)
      // Pattern: **User Story**: US-001, US-002, US-003
      const userStoryFieldMatch = taskBody.match(/\*\*User Story\*\*:\s*([^\n]+)/);
      let belongsToThisUS = false;

      if (userStoryFieldMatch) {
        const userStoryList = userStoryFieldMatch[1].trim();
        // Split by comma and check if any matches current user story
        const userStoryIds = userStoryList.split(',').map((us) => us.trim());
        belongsToThisUS = userStoryIds.some((usId) => {
          return normalizeUsId(usId) === normalizedCurrentUs;
        });
      }

      // PRIORITY 2: Fall back to AC-based filtering (legacy support)
      if (!belongsToThisUS) {
        const acMatch = taskBody.match(/\*\*(?:Satisfies ACs?|AC)\*\*:\s*([^\n]+)/);
        if (acMatch) {
          const acList = acMatch[1].trim();

          // Handle special "All" case - if "All", include task if User Story field matched
          // (already handled above), otherwise skip AC-based check for "All"
          if (acList.toLowerCase() !== 'all') {
            const acIds = acList.split(',').map((ac) => ac.trim());
            belongsToThisUS = acIds.some((acId) => {
              // Extract US ID from AC-ID: AC-US1-01 → US-001
              const usMatch = acId.match(/AC-([A-Z]+\d+)-/);
              if (!usMatch) return false;

              const extractedUsId = usMatch[1]; // e.g., "US1" or "US001"
              return normalizeUsId(extractedUsId) === normalizedCurrentUs;
            });
          }
        }
      }

      if (!belongsToThisUS) {
        continue;
      }

      // ✅ Extract completion status from **Status**: [x] or [ ]
      const statusMatch = taskBody.match(/\*\*Status\*\*:\s*\[([x ])\]/);
      const completed = statusMatch ? statusMatch[1] === 'x' : false;

      // Extract AC list for userStories field (for backward compatibility)
      const acMatch = taskBody.match(/\*\*(?:Satisfies ACs?|AC)\*\*:\s*([^\n]+)/);
      const acIds = acMatch ? acMatch[1].trim().split(',').map((ac) => ac.trim()) : [];

      tasks.push({
        id: taskId,
        title: taskTitle,
        completed, // ✅ Now reads actual completion status!
        userStories: acIds,
      });
    }

    return tasks;
  }

  /**
   * Build completion comment for GitHub issue closure
   *
   * Used when closing issue after verification
   */
  buildCompletionComment(completion: CompletionStatus): string {
    return `✅ **User Story Verified Complete**

**Completion Status**:
- ✅ Acceptance Criteria: ${completion.acsCompleted}/${completion.acsTotal} (100%)
- ✅ Implementation Tasks: ${completion.tasksCompleted}/${completion.tasksTotal} (100%)

All work has been verified and completed. This issue is now closed.

🤖 Auto-verified by SpecWeave AC Completion Gate`;
  }

  /**
   * Build progress comment for GitHub issue update
   *
   * Used when issue stays open (not 100% complete)
   */
  buildProgressComment(completion: CompletionStatus): string {
    const sections: string[] = [];

    sections.push('📊 **Progress Update**');
    sections.push('');

    // AC progress
    const acIcon = completion.acsPercentage === 100 ? '✅' : '🔄';
    sections.push(
      `${acIcon} **Acceptance Criteria**: ${completion.acsCompleted}/${completion.acsTotal} (${completion.acsPercentage.toFixed(0)}%)`
    );

    if (completion.blockingAcs.length > 0) {
      sections.push('');
      sections.push('**Incomplete ACs**:');
      for (const acId of completion.blockingAcs) {
        sections.push(`- [ ] ${acId}`);
      }
    }

    sections.push('');

    // Task progress
    const taskIcon = completion.tasksPercentage === 100 ? '✅' : '🔄';
    sections.push(
      `${taskIcon} **Implementation Tasks**: ${completion.tasksCompleted}/${completion.tasksTotal} (${completion.tasksPercentage.toFixed(0)}%)`
    );

    if (completion.blockingTasks.length > 0) {
      sections.push('');
      sections.push('**Incomplete Tasks**:');
      for (const taskId of completion.blockingTasks) {
        sections.push(`- [ ] ${taskId}`);
      }
    }

    sections.push('');
    sections.push('---');
    sections.push('🤖 Auto-updated by SpecWeave AC Completion Gate');

    return sections.join('\n');
  }

  /**
   * Build reopen comment for GitHub issue
   *
   * Used when reopening prematurely closed issue
   */
  buildReopenComment(
    completion: CompletionStatus,
    reason: string = 'Work verification failed'
  ): string {
    const sections: string[] = [];

    sections.push(`🔄 **Reopening Issue - ${reason}**`);
    sections.push('');

    sections.push('**Current Status**:');
    sections.push(
      `- Acceptance Criteria: ${completion.acsCompleted}/${completion.acsTotal} (${completion.acsPercentage.toFixed(0)}%)`
    );
    sections.push(
      `- Implementation Tasks: ${completion.tasksCompleted}/${completion.tasksTotal} (${completion.tasksPercentage.toFixed(0)}%)`
    );

    const totalBlocking = completion.blockingAcs.length + completion.blockingTasks.length;

    if (totalBlocking > 0) {
      sections.push('');
      sections.push(`**Blocking Items** (${totalBlocking}):`);

      if (completion.blockingAcs.length > 0) {
        sections.push('');
        sections.push('**Acceptance Criteria**:');
        for (const acId of completion.blockingAcs) {
          sections.push(`- [ ] ${acId}`);
        }
      }

      if (completion.blockingTasks.length > 0) {
        sections.push('');
        sections.push('**Implementation Tasks**:');
        for (const taskId of completion.blockingTasks) {
          sections.push(`- [ ] ${taskId}`);
        }
      }
    }

    sections.push('');
    sections.push('⚠️ This issue cannot be closed until all ACs and tasks are verified complete.');
    sections.push('');
    sections.push('🤖 Auto-reopened by SpecWeave AC Completion Gate');

    return sections.join('\n');
  }
}
