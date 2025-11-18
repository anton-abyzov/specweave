/**
 * Status Line Updater
 *
 * Synchronously updates status line cache by scanning spec.md files.
 * Equivalent to update-status-line.sh but runs SYNCHRONOUSLY.
 *
 * Purpose: Force-refresh status line when it appears stale
 *
 * Architecture:
 * 1. Scan all spec.md files for open increments (status = active/planning/in-progress)
 * 2. Sort by creation date (oldest first)
 * 3. Select first as current increment
 * 4. Parse tasks.md for progress (use TaskCounter for accuracy)
 * 5. Write cache atomically (.specweave/state/status-line.json)
 *
 * Performance: ~50-100ms (acceptable for user-facing commands)
 */

import fs from 'fs-extra';
import * as path from 'path';
import { StatusLineCache, CurrentIncrement } from './types.js';
import { TaskCounter } from './task-counter.js';

/**
 * Open increment metadata (from spec.md frontmatter)
 */
interface OpenIncrement {
  id: string;
  created: string;
  status: string;
}

/**
 * Task progress metadata
 */
interface TaskProgress {
  completed: number;
  total: number;
  percentage: number;
}

/**
 * Maximum number of active increments to display in status line
 * Aligned with ActiveIncrementManager maximum
 */
const MAX_ACTIVE_INCREMENTS_DISPLAY = 2;

/**
 * Status Line Updater
 *
 * Provides synchronous status line cache updates.
 */
export class StatusLineUpdater {
  constructor(private rootDir: string = process.cwd()) {}

  /**
   * Update status line cache synchronously
   *
   * This is the main entry point for force-refreshing the status line.
   * NOW supports up to 2 active increments (aligned with ActiveIncrementManager).
   */
  async update(): Promise<void> {
    // Step 1: Find all open increments (scan spec.md)
    const openIncrements = await this.findOpenIncrements();

    // Step 2: Sort by creation date (oldest first)
    const sorted = openIncrements.sort((a, b) => {
      const aTime = new Date(a.created).getTime();
      const bTime = new Date(b.created).getTime();
      return aTime - bTime; // Ascending (oldest first)
    });

    // Step 3: Take up to MAX_ACTIVE_INCREMENTS_DISPLAY active increments
    const activeIds = sorted.slice(0, MAX_ACTIVE_INCREMENTS_DISPLAY);

    // Step 4: Parse tasks.md for EACH active increment
    const activeIncrements: CurrentIncrement[] = await Promise.all(
      activeIds.map(async (inc) => {
        const progress = await this.parseTaskProgress(inc.id);
        return {
          id: inc.id,
          name: inc.id, // Format: "0043-spec-md-desync-fix"
          completed: progress.completed,
          total: progress.total,
          percentage: progress.percentage
        };
      })
    );

    // Step 5: Build cache object
    const cache: StatusLineCache = {
      activeIncrements,
      openCount: openIncrements.length,
      lastUpdate: new Date().toISOString(),

      // BACKWARD COMPATIBILITY: Set 'current' to first active increment
      current: activeIncrements[0] || null,

      // Add default state message when no active increments
      message: openIncrements.length === 0
        ? 'No active increments. Start with /specweave:increment "feature name"'
        : undefined
    };

    // Step 6: Write cache atomically
    await this.writeCache(cache);
  }

  /**
   * Find all open increments by scanning spec.md files
   *
   * Logic:
   * - Scan .specweave/increments/[id]/spec.md
   * - Parse YAML frontmatter for status field
   * - Filter: status === 'active' || 'planning' || 'in-progress'
   * - Extract: {id, created, status}
   */
  private async findOpenIncrements(): Promise<OpenIncrement[]> {
    const incrementsDir = path.join(this.rootDir, '.specweave/increments');

    if (!await fs.pathExists(incrementsDir)) {
      return [];
    }

    const entries = await fs.readdir(incrementsDir);
    const openIncrements: OpenIncrement[] = [];

    for (const entry of entries) {
      // Skip special directories (_archive, etc.)
      if (entry.startsWith('_')) {
        continue;
      }

      const specPath = path.join(incrementsDir, entry, 'spec.md');

      if (await fs.pathExists(specPath)) {
        const specContent = await fs.readFile(specPath, 'utf-8');
        const metadata = this.parseSpecMetadata(specContent);

        // Check if increment is open (active, planning, or in-progress)
        // ONLY accepts official IncrementStatus enum values
        if (
          metadata.status === 'active' ||
          metadata.status === 'planning' ||
          metadata.status === 'in-progress'
        ) {
          openIncrements.push({
            id: entry,
            created: metadata.created || '1970-01-01',
            status: metadata.status
          });
        }
      }
    }

    return openIncrements;
  }

  /**
   * Parse spec.md YAML frontmatter
   *
   * Extracts: status, created
   */
  private parseSpecMetadata(content: string): { status: string; created: string } {
    const metadata: { status: string; created: string } = {
      status: '',
      created: '1970-01-01'
    };

    // Extract YAML frontmatter (between --- markers)
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return metadata;
    }

    const frontmatter = frontmatterMatch[1];

    // Parse status field
    const statusMatch = frontmatter.match(/^status:\s*(.+)$/m);
    if (statusMatch) {
      metadata.status = statusMatch[1].trim();
    }

    // Parse created field
    const createdMatch = frontmatter.match(/^created:\s*(.+)$/m);
    if (createdMatch) {
      metadata.created = createdMatch[1].trim();
    }

    return metadata;
  }

  /**
   * Parse tasks.md for progress
   *
   * Uses TaskCounter for accurate counting (fixes overcounting bug)
   */
  private async parseTaskProgress(incrementId: string): Promise<TaskProgress> {
    const tasksPath = path.join(this.rootDir, '.specweave/increments', incrementId, 'tasks.md');

    if (!await fs.pathExists(tasksPath)) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    try {
      const tasksContent = await fs.readFile(tasksPath, 'utf-8');
      const counts = TaskCounter.countTasks(tasksContent);

      return {
        completed: counts.completed,
        total: counts.total,
        percentage: counts.percentage
      };
    } catch (error) {
      // Graceful degradation: If TaskCounter fails, return zeros
      console.warn(`⚠️  Failed to parse tasks.md for ${incrementId}:`, error);
      return { completed: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Write cache atomically
   *
   * Uses temp file → rename pattern to prevent corruption
   */
  private async writeCache(cache: StatusLineCache): Promise<void> {
    const cacheFile = path.join(this.rootDir, '.specweave/state/status-line.json');
    const cacheDir = path.dirname(cacheFile);

    // Ensure state directory exists
    await fs.ensureDir(cacheDir);

    // Atomic write: temp file → rename
    const tempFile = `${cacheFile}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(cache, null, 2), 'utf-8');
    await fs.rename(tempFile, cacheFile);
  }

  /**
   * Get current cache (for testing)
   */
  async getCurrentCache(): Promise<StatusLineCache | null> {
    const cacheFile = path.join(this.rootDir, '.specweave/state/status-line.json');

    if (!await fs.pathExists(cacheFile)) {
      return null;
    }

    try {
      const content = await fs.readFile(cacheFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
