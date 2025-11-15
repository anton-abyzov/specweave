/**
 * Recent Work Scanner
 *
 * Scans recently completed increments and tasks to detect what should be reopened
 * when users report issues.
 *
 * Part of smart reopen functionality (increment 0032)
 */

import fs from 'fs-extra';
import path from 'path';
import { MetadataManager } from './metadata-manager.js';
import { IncrementMetadata, IncrementStatus } from '../types/increment-metadata.js';

/**
 * Task match (task found in recent work)
 */
export interface TaskMatch {
  /** Task ID (e.g., "T-001") */
  id: string;

  /** Task title */
  title: string;

  /** Increment ID */
  incrementId: string;

  /** Task status */
  status: 'completed' | 'active' | 'pending';

  /** Completion date (if completed) */
  completedDate?: string;

  /** Task description/AC */
  description?: string;
}

/**
 * Recent work match (increment, task, or user story)
 */
export interface RecentWorkMatch {
  /** Type of match */
  type: 'increment' | 'task' | 'user-story';

  /** Item ID */
  id: string;

  /** Increment ID (for tasks/user stories) */
  incrementId: string;

  /** Item title */
  title: string;

  /** Completion date */
  completedDate: string;

  /** Relevance score (0-100) */
  relevanceScore: number;

  /** Matched keywords */
  matchedKeywords: string[];

  /** Match details (why it matched) */
  matchDetails?: string;
}

/**
 * Recent Work Scanner
 *
 * Provides smart detection of what should be reopened based on user reports
 */
export class RecentWorkScanner {
  /**
   * Scan increments completed in last N days
   *
   * @param days - Number of days to look back (default: 7)
   * @returns List of recently completed increments
   */
  static scanRecentIncrements(days: number = 7): IncrementMetadata[] {
    const allIncrements = MetadataManager.getCompleted();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allIncrements.filter(m => {
      const lastActivityDate = new Date(m.lastActivity);
      return lastActivityDate >= cutoffDate;
    });
  }

  /**
   * Scan active increments (always include in search)
   *
   * @returns List of active increments
   */
  static scanActiveIncrements(): IncrementMetadata[] {
    return MetadataManager.getActive();
  }

  /**
   * Scan tasks completed in last N days (across all increments)
   *
   * @param days - Number of days to look back (default: 7)
   * @returns List of recently completed tasks
   */
  static scanRecentTasks(days: number = 7): TaskMatch[] {
    const tasks: TaskMatch[] = [];

    // Get active + recently completed increments
    const activeIncrements = this.scanActiveIncrements();
    const recentIncrements = this.scanRecentIncrements(days);
    const allIncrements = [...activeIncrements, ...recentIncrements];

    // Remove duplicates
    const uniqueIncrements = Array.from(
      new Map(allIncrements.map(m => [m.id, m])).values()
    );

    // Parse tasks from each increment
    for (const increment of uniqueIncrements) {
      const incrementTasks = this.parseTasksFromIncrement(increment.id);
      tasks.push(...incrementTasks);
    }

    // Filter tasks completed in last N days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return tasks.filter(task => {
      if (!task.completedDate) return false;
      const completedDate = new Date(task.completedDate);
      return completedDate >= cutoffDate;
    });
  }

  /**
   * Pattern match: Find items related to keywords
   *
   * @param keywords - List of keywords to match
   * @param days - Number of days to look back (default: 7)
   * @returns List of matches, sorted by relevance
   */
  static matchKeywords(keywords: string[], days: number = 7): RecentWorkMatch[] {
    const matches: RecentWorkMatch[] = [];

    // 1. Match increments
    const recentIncrements = this.scanRecentIncrements(days);
    const activeIncrements = this.scanActiveIncrements();
    const allIncrements = [...activeIncrements, ...recentIncrements];

    for (const increment of allIncrements) {
      const score = this.scoreIncrementMatch(increment, keywords);

      if (score.score > 0) {
        matches.push({
          type: 'increment',
          id: increment.id,
          incrementId: increment.id,
          title: increment.id,
          completedDate: increment.lastActivity,
          relevanceScore: score.score,
          matchedKeywords: score.matchedKeywords,
          matchDetails: score.details
        });
      }
    }

    // 2. Match tasks
    const recentTasks = this.scanRecentTasks(days);

    for (const task of recentTasks) {
      const score = this.scoreTaskMatch(task, keywords);

      if (score.score > 0) {
        matches.push({
          type: 'task',
          id: task.id,
          incrementId: task.incrementId,
          title: task.title,
          completedDate: task.completedDate || new Date().toISOString(),
          relevanceScore: score.score,
          matchedKeywords: score.matchedKeywords,
          matchDetails: score.details
        });
      }
    }

    // Sort by relevance score (descending)
    matches.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return matches;
  }

  /**
   * Parse tasks from increment's tasks.md
   *
   * @param incrementId - Increment ID
   * @returns List of tasks
   */
  private static parseTasksFromIncrement(incrementId: string): TaskMatch[] {
    const tasks: TaskMatch[] = [];

    try {
      const incrementPath = path.join(
        process.cwd(),
        '.specweave',
        'increments',
        incrementId
      );
      const tasksPath = path.join(incrementPath, 'tasks.md');

      if (!fs.existsSync(tasksPath)) {
        return tasks;
      }

      const tasksContent = fs.readFileSync(tasksPath, 'utf-8');

      // Pattern: ## T-001: Task Title or ### T-001: Task Title
      const taskPattern = /^(#{2,3}) (T-\d+): (.+)$/gm;
      const statusPattern = /\*\*Status\*\*: \[([x ])\]/;

      const lines = tasksContent.split('\n');
      let currentTask: TaskMatch | null = null;
      let currentDescription: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const taskMatch = line.match(taskPattern);

        if (taskMatch) {
          // Save previous task
          if (currentTask) {
            currentTask.description = currentDescription.join('\n');
            tasks.push(currentTask);
          }

          // Start new task
          currentTask = {
            id: taskMatch[2],
            title: taskMatch[3],
            incrementId,
            status: 'pending'
          };
          currentDescription = [];
        } else if (currentTask) {
          // Check for status line
          const statusMatch = line.match(statusPattern);
          if (statusMatch) {
            currentTask.status = statusMatch[1] === 'x' ? 'completed' : 'pending';

            // Extract completion date if present (pattern: "Completed: YYYY-MM-DD")
            const completedMatch = line.match(/Completed: (\d{4}-\d{2}-\d{2})/);
            if (completedMatch) {
              currentTask.completedDate = completedMatch[1] + 'T00:00:00Z';
            }
          } else {
            // Add to description
            currentDescription.push(line);
          }
        }
      }

      // Save last task
      if (currentTask) {
        currentTask.description = currentDescription.join('\n');
        tasks.push(currentTask);
      }

    } catch (error) {
      console.error(`Error parsing tasks from ${incrementId}: ${error}`);
    }

    return tasks;
  }

  /**
   * Score increment match against keywords
   *
   * @param increment - Increment metadata
   * @param keywords - Keywords to match
   * @returns Match score and details
   */
  private static scoreIncrementMatch(
    increment: IncrementMetadata,
    keywords: string[]
  ): { score: number; matchedKeywords: string[]; details: string } {
    let score = 0;
    const matchedKeywords: string[] = [];
    const details: string[] = [];

    const incrementIdLower = increment.id.toLowerCase();

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();

      // Exact match in increment ID → +10 points
      if (incrementIdLower === keywordLower) {
        score += 10;
        matchedKeywords.push(keyword);
        details.push(`Exact match: "${keyword}" in increment ID`);
      }
      // Partial match in increment ID → +5 points
      else if (incrementIdLower.includes(keywordLower)) {
        score += 5;
        matchedKeywords.push(keyword);
        details.push(`Partial match: "${keyword}" in increment ID`);
      }
    }

    return { score, matchedKeywords, details: details.join('; ') };
  }

  /**
   * Score task match against keywords
   *
   * @param task - Task match
   * @param keywords - Keywords to match
   * @returns Match score and details
   */
  private static scoreTaskMatch(
    task: TaskMatch,
    keywords: string[]
  ): { score: number; matchedKeywords: string[]; details: string } {
    let score = 0;
    const matchedKeywords: string[] = [];
    const details: string[] = [];

    const titleLower = task.title.toLowerCase();
    const descriptionLower = (task.description || '').toLowerCase();

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();

      // Exact match in title → +10 points
      if (titleLower === keywordLower) {
        score += 10;
        matchedKeywords.push(keyword);
        details.push(`Exact match: "${keyword}" in title`);
      }
      // Partial match in title → +7 points
      else if (titleLower.includes(keywordLower)) {
        score += 7;
        matchedKeywords.push(keyword);
        details.push(`Partial match: "${keyword}" in title`);
      }
      // Match in description/AC → +3 points
      else if (descriptionLower.includes(keywordLower)) {
        score += 3;
        matchedKeywords.push(keyword);
        details.push(`Match: "${keyword}" in description`);
      }
    }

    return { score, matchedKeywords, details: details.join('; ') };
  }

  /**
   * Format matches for display
   *
   * @param matches - List of matches
   * @param maxResults - Maximum results to return (default: 5)
   * @returns Formatted string
   */
  static formatMatches(matches: RecentWorkMatch[], maxResults: number = 5): string {
    if (matches.length === 0) {
      return '🔍 No related work found in recent activity';
    }

    const topMatches = matches.slice(0, maxResults);
    let output = `🔍 Found ${matches.length} related item(s) in recent work:\n\n`;

    for (const match of topMatches) {
      const icon = match.type === 'increment' ? '📦' : '✓';
      const typeLabel = match.type.toUpperCase();
      const daysAgo = this.getDaysAgo(match.completedDate);

      output += `${icon} ${typeLabel}: ${match.title}\n`;
      output += `   Increment: ${match.incrementId}\n`;
      output += `   Completed: ${daysAgo}\n`;
      output += `   Relevance: ${match.relevanceScore} points\n`;
      output += `   Matched: ${match.matchedKeywords.join(', ')}\n\n`;
    }

    // Suggest reopen command
    const topMatch = topMatches[0];
    output += `\n💡 Suggested action:\n`;

    if (topMatch.type === 'increment') {
      output += `   /specweave:reopen ${topMatch.incrementId} --reason "Your issue description"`;
    } else if (topMatch.type === 'task') {
      output += `   /specweave:reopen ${topMatch.incrementId} --task ${topMatch.id} --reason "Your issue description"`;
    }

    return output;
  }

  /**
   * Get "N days ago" string from date
   *
   * @param dateStr - ISO date string
   * @returns Human-readable string
   */
  private static getDaysAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }
}
