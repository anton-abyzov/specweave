/**
 * Spec Parser
 *
 * Advanced parsing utilities for spec.md files
 * Extracts user stories, acceptance criteria, increments, etc.
 *
 * @module spec-parser
 */

import matter from 'gray-matter';
import {
  UserStory,
  AcceptanceCriteria,
  IncrementReference,
  SpecMetadata
} from '../types/spec-metadata.js';

export class SpecParser {
  /**
   * Parse complete user story including acceptance criteria
   */
  static parseUserStory(markdown: string, usId: string): UserStory | null {
    const usPattern = new RegExp(`\\*\\*${usId}\\*\\*:\\s*(.+?)(?=\\n|$)`, 'g');
    const match = usPattern.exec(markdown);

    if (!match) {
      return null;
    }

    const title = match[1].trim();
    const acceptanceCriteria = this.parseAcceptanceCriteria(markdown, usId);
    const status = this.determineStatusFromAC(acceptanceCriteria);
    const priority = this.extractPriority(markdown, usId);

    return { id: usId, title, status, priority, acceptanceCriteria };
  }

  /**
   * Determine user story status based on acceptance criteria completion
   */
  private static determineStatusFromAC(acceptanceCriteria: AcceptanceCriteria[]): 'todo' | 'in-progress' | 'done' {
    if (acceptanceCriteria.length === 0) {
      return 'todo';
    }
    const completedCount = acceptanceCriteria.filter(ac => ac.status === 'done').length;
    if (completedCount === acceptanceCriteria.length) {
      return 'done';
    }
    if (completedCount > 0) {
      return 'in-progress';
    }
    return 'todo';
  }

  /**
   * Extract priority from markdown near a user story
   */
  private static extractPriority(markdown: string, usId: string): 'P1' | 'P2' | 'P3' {
    const priorityMatch = markdown.match(new RegExp(`${usId}[\\s\\S]{0,200}?\\(P([123])\\)`));
    return priorityMatch ? `P${priorityMatch[1]}` as 'P1' | 'P2' | 'P3' : 'P1';
  }

  /**
   * Parse all user stories from markdown
   */
  static parseAllUserStories(markdown: string): UserStory[] {
    const usPattern = /\*\*US-(\d+)\*\*:/g;
    const processedIds = new Set<string>();

    return [...markdown.matchAll(usPattern)]
      .map(match => `US-${match[1]}`)
      .filter(usId => {
        if (processedIds.has(usId)) return false;
        processedIds.add(usId);
        return true;
      })
      .map(usId => this.parseUserStory(markdown, usId))
      .filter((story): story is UserStory => story !== null);
  }

  /**
   * Parse acceptance criteria for a user story
   */
  static parseAcceptanceCriteria(markdown: string, usId: string): AcceptanceCriteria[] {
    const usNumber = usId.replace('US-', '');
    const acPattern = new RegExp(
      `- \\[([x ])\\] \\*\\*AC-${usNumber}-(\\d+)\\*\\*:\\s*(.+?)(?=\\n|$)`,
      'g'
    );

    return [...markdown.matchAll(acPattern)].map(match => {
      const description = match[3].trim();
      const { priority, testable, cleanDescription } = this.parseACMetadata(description);

      return {
        id: `AC-${usNumber}-${match[2]}`,
        description: cleanDescription,
        status: match[1] === 'x' ? 'done' : 'todo',
        priority,
        testable
      } as AcceptanceCriteria;
    });
  }

  /**
   * Parse metadata from AC description (priority, testability)
   */
  private static parseACMetadata(description: string): {
    priority: 'P1' | 'P2' | 'P3' | undefined;
    testable: boolean | undefined;
    cleanDescription: string;
  } {
    const metaMatch = description.match(/\(([^)]+)\)/);
    if (!metaMatch) {
      return { priority: undefined, testable: undefined, cleanDescription: description };
    }

    const meta = metaMatch[1];
    let priority: 'P1' | 'P2' | 'P3' | undefined;
    if (meta.includes('P1')) priority = 'P1';
    else if (meta.includes('P2')) priority = 'P2';
    else if (meta.includes('P3')) priority = 'P3';

    let testable: boolean | undefined;
    if (meta.includes('not testable')) testable = false;
    else if (meta.includes('testable')) testable = true;

    return {
      priority,
      testable,
      cleanDescription: description.replace(/\s*\([^)]+\)\s*$/, '').trim()
    };
  }

  /**
   * Parse increment references from markdown
   */
  static parseIncrementReferences(markdown: string): IncrementReference[] {
    const tablePattern = /\|\s*\*\*(\d{4}-[\w-]+)\*\*\s*\|\s*([✅❌⏳])?\s*(\w+)\s*\|\s*([0-9-]+)?\s*\|\s*(.+?)\s*\|/g;

    return [...markdown.matchAll(tablePattern)].map(match => {
      const notes = match[5]?.trim();
      const userStories = notes ? [...notes.matchAll(/US-\d+/g)].map(m => m[0]) : [];

      return {
        id: match[1],
        status: this.parseIncrementStatus(match[2], match[3]),
        completedAt: match[4] || undefined,
        userStories,
        notes
      };
    });
  }

  /**
   * Parse increment status from icon and text
   */
  private static parseIncrementStatus(
    icon: string | undefined,
    text: string
  ): 'planned' | 'in-progress' | 'complete' | 'abandoned' {
    const statusText = text.toLowerCase();

    if (statusText.includes('complete') || icon === '✅') return 'complete';
    if (statusText.includes('progress') || statusText.includes('active') || icon === '⏳') return 'in-progress';
    if (statusText.includes('abandon') || statusText.includes('cancel') || icon === '❌') return 'abandoned';
    return 'planned';
  }

  /**
   * Extract frontmatter from markdown
   */
  static extractFrontmatter(markdown: string): Partial<SpecMetadata> {
    try {
      return matter(markdown).data as Partial<SpecMetadata>;
    } catch {
      return {};
    }
  }

  /**
   * Extract overview section
   */
  static extractOverview(markdown: string): string {
    const overviewMatch = markdown.match(/##\s+Overview\s+([\s\S]*?)(?=\n##\s+|\n---\s+|$)/);
    return overviewMatch ? overviewMatch[1].trim() : '';
  }

  /**
   * Extract external references section
   */
  static extractExternalReferences(markdown: string): {
    github?: string;
    jira?: string;
    ado?: string;
  } {
    const extRefSection = markdown.match(/##\s+External References\s+([\s\S]*?)(?=\n##\s+|\n---\s+|$)/);
    if (!extRefSection) {
      return {};
    }

    const content = extRefSection[1];
    return {
      github: content.match(/GitHub Project:\s*(.+)/)?.[1]?.trim(),
      jira: content.match(/Jira Epic:\s*(.+)/)?.[1]?.trim(),
      ado: content.match(/(?:ADO|Azure DevOps) Feature:\s*(.+)/)?.[1]?.trim()
    };
  }

  /**
   * Calculate overall progress
   */
  static calculateProgress(userStories: UserStory[]): {
    totalUserStories: number;
    completedUserStories: number;
    inProgressUserStories: number;
    todoUserStories: number;
    percentComplete: number;
  } {
    const total = userStories?.length ?? 0;
    if (total === 0) {
      return { totalUserStories: 0, completedUserStories: 0, inProgressUserStories: 0, todoUserStories: 0, percentComplete: 0 };
    }

    const completedUserStories = userStories.filter(us => us.status === 'done').length;
    return {
      totalUserStories: total,
      completedUserStories,
      inProgressUserStories: userStories.filter(us => us.status === 'in-progress').length,
      todoUserStories: userStories.filter(us => us.status === 'todo').length,
      percentComplete: Math.round((completedUserStories / total) * 100)
    };
  }

  /**
   * Find user stories by status
   */
  static filterUserStories(
    userStories: UserStory[],
    status?: 'todo' | 'in-progress' | 'done',
    priority?: 'P1' | 'P2' | 'P3'
  ): UserStory[] {
    return userStories.filter(us =>
      (!status || us.status === status) && (!priority || us.priority === priority)
    );
  }

  /**
   * Find user story by ID
   */
  static findUserStory(userStories: UserStory[], usId: string): UserStory | undefined {
    return userStories.find(us => us.id === usId);
  }

  /**
   * Update user story status in markdown by checking/unchecking AC boxes
   */
  static updateUserStoryStatus(
    markdown: string,
    usId: string,
    newStatus: 'todo' | 'in-progress' | 'done'
  ): string {
    const usNumber = usId.replace('US-', '');

    if (newStatus === 'done') {
      return markdown.replace(
        new RegExp(`- \\[ \\] \\*\\*AC-${usNumber}-(\\d+)\\*\\*:`, 'g'),
        `- [x] **AC-${usNumber}-$1**:`
      );
    }

    if (newStatus === 'todo') {
      return markdown.replace(
        new RegExp(`- \\[x\\] \\*\\*AC-${usNumber}-(\\d+)\\*\\*:`, 'g'),
        `- [ ] **AC-${usNumber}-$1**:`
      );
    }

    return markdown;
  }
}
