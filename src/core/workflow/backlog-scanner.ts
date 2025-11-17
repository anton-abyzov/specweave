/**
 * Backlog Scanner - Intelligent backlog scanning and ranking
 *
 * Scans .specweave/increments/_backlog/ directory and ranks items
 * by priority, dependencies, and project match.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 *
 * @module core/workflow/backlog-scanner
 * @since v0.22.0
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Backlog item metadata
 */
export interface BacklogItem {
  /** Increment ID */
  incrementId: string;
  /** Full path to spec.md */
  specPath: string;
  /** Title */
  title: string;
  /** Priority (P0, P1, P2, P3) */
  priority: string;
  /** Project (if multi-project) */
  project?: string;
  /** Dependencies (other increment IDs) */
  dependencies: string[];
  /** Estimated effort (hours or weeks) */
  estimatedEffort?: string;
  /** Creation date */
  created?: string;
}

/**
 * Ranked backlog item with score
 */
export interface RankedBacklogItem extends BacklogItem {
  /** Ranking score (higher = better) */
  score: number;
  /** Ranking explanation */
  reason: string;
}

/**
 * Backlog recommendation
 */
export interface BacklogRecommendation {
  /** Recommended items (top N) */
  items: RankedBacklogItem[];
  /** Total backlog size */
  totalItems: number;
  /** Explanation */
  summary: string;
}

/**
 * Backlog Scanner - Scan and rank backlog items
 */
export class BacklogScanner {
  private backlogDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.backlogDir = path.join(rootDir, '.specweave/increments/_backlog');
  }

  /**
   * Scan backlog directory
   *
   * @returns Array of backlog items
   */
  async scanBacklog(): Promise<BacklogItem[]> {
    // Check if backlog directory exists
    if (!await fs.pathExists(this.backlogDir)) {
      return [];
    }

    const items: BacklogItem[] = [];
    const dirs = await fs.readdir(this.backlogDir);

    for (const dir of dirs) {
      const dirPath = path.join(this.backlogDir, dir);
      const stat = await fs.stat(dirPath);

      if (!stat.isDirectory()) {
        continue;
      }

      // Check if spec.md exists
      const specPath = path.join(dirPath, 'spec.md');
      if (!await fs.pathExists(specPath)) {
        continue;
      }

      // Parse spec.md frontmatter
      try {
        const item = await this.parseBacklogItem(dir, specPath);
        items.push(item);
      } catch (error) {
        console.warn(`Failed to parse backlog item ${dir}:`, error);
      }
    }

    return items;
  }

  /**
   * Parse backlog item from spec.md
   */
  private async parseBacklogItem(incrementId: string, specPath: string): Promise<BacklogItem> {
    const content = await fs.readFile(specPath, 'utf-8');

    // Extract YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      throw new Error('No YAML frontmatter found in spec.md');
    }

    const frontmatter: any = yaml.load(frontmatterMatch[1]);

    // Extract title from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : frontmatter.title || incrementId;

    return {
      incrementId,
      specPath,
      title,
      priority: frontmatter.priority || 'P2',
      project: frontmatter.project,
      dependencies: frontmatter.dependencies || [],
      estimatedEffort: frontmatter.estimated_effort || frontmatter.estimatedEffort,
      created: frontmatter.created
    };
  }

  /**
   * Rank backlog items by priority, dependencies, and project match
   *
   * Ranking algorithm:
   * - Priority: P0=10, P1=7, P2=5, P3=3
   * - Dependencies met: +5
   * - Project match: +3
   * - Recently created: +2
   *
   * @param items - Backlog items to rank
   * @param currentProject - Current project (for filtering)
   * @param completedIncrements - List of completed increment IDs
   * @returns Ranked items (sorted by score descending)
   */
  rankItems(
    items: BacklogItem[],
    currentProject?: string,
    completedIncrements: string[] = []
  ): RankedBacklogItem[] {
    const ranked: RankedBacklogItem[] = items.map(item => {
      let score = 0;
      const reasons: string[] = [];

      // Priority score
      const priorityScores: Record<string, number> = {
        'P0': 10,
        'P1': 7,
        'P2': 5,
        'P3': 3
      };
      const priorityScore = priorityScores[item.priority] || 3;
      score += priorityScore;
      reasons.push(`Priority ${item.priority} (${priorityScore} pts)`);

      // Dependencies met
      const unmetDeps = item.dependencies.filter(dep => !completedIncrements.includes(dep));
      if (unmetDeps.length === 0 && item.dependencies.length > 0) {
        score += 5;
        reasons.push('All dependencies met (+5 pts)');
      } else if (unmetDeps.length > 0) {
        reasons.push(`Blocked by: ${unmetDeps.join(', ')}`);
      }

      // Project match
      if (currentProject && item.project === currentProject) {
        score += 3;
        reasons.push(`Project match: ${currentProject} (+3 pts)`);
      }

      // Recently created (bonus for new items)
      if (item.created) {
        const createdDate = new Date(item.created);
        const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreated < 7) {
          score += 2;
          reasons.push('Recently created (+2 pts)');
        }
      }

      return {
        ...item,
        score,
        reason: reasons.join('; ')
      };
    });

    // Sort by score (descending)
    return ranked.sort((a, b) => b.score - a.score);
  }

  /**
   * Get top N recommendations
   *
   * @param n - Number of recommendations (default: 3)
   * @param currentProject - Current project filter
   * @param completedIncrements - Completed increments
   * @returns Backlog recommendations
   */
  async getTopRecommendations(
    n: number = 3,
    currentProject?: string,
    completedIncrements: string[] = []
  ): Promise<BacklogRecommendation> {
    const items = await this.scanBacklog();
    const ranked = this.rankItems(items, currentProject, completedIncrements);
    const topItems = ranked.slice(0, n);

    let summary = '';
    if (items.length === 0) {
      summary = 'No items in backlog. Use /specweave:increment to create new work.';
    } else if (topItems.length === 0) {
      summary = 'No actionable items found (all blocked by dependencies).';
    } else {
      summary = `Found ${items.length} items in backlog. Top ${topItems.length} recommendations based on priority and dependencies.`;
    }

    return {
      items: topItems,
      totalItems: items.length,
      summary
    };
  }
}
