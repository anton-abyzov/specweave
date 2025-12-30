/**
 * Increment Queue Manager
 *
 * Manages the queue of increments to process in an auto session.
 * Handles:
 * - Queue ordering (by priority)
 * - Dependency validation
 * - WIP limit checking
 * - Transition between increments
 */

import * as fs from 'fs';
import * as path from 'path';

export interface QueuedIncrement {
  id: string;
  priority: 'P1' | 'P2' | 'P3';
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  dependencies: string[];
  taskCount: number;
  estimatedIterations: number;
}

export interface QueueConfig {
  /** Maximum active increments (WIP limit) */
  maxWIP: number;
  /** Skip increments with unmet dependencies */
  skipUnmetDependencies: boolean;
  /** Auto-close completed increments */
  autoClose: boolean;
}

const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxWIP: 1,
  skipUnmetDependencies: true,
  autoClose: true,
};

export class IncrementQueueManager {
  private projectRoot: string;
  private incrementsDir: string;
  private config: QueueConfig;
  private queue: QueuedIncrement[] = [];

  constructor(projectRoot: string, config: Partial<QueueConfig> = {}) {
    this.projectRoot = projectRoot;
    this.incrementsDir = path.join(projectRoot, '.specweave', 'increments');
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
  }

  /**
   * Initialize queue from increment IDs
   */
  initializeQueue(incrementIds: string[]): void {
    this.queue = [];

    for (const id of incrementIds) {
      const increment = this.loadIncrementInfo(id);
      if (increment) {
        this.queue.push(increment);
      }
    }

    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { P1: 0, P2: 1, P3: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Load increment information from disk
   */
  private loadIncrementInfo(incrementId: string): QueuedIncrement | null {
    const incDir = this.findIncrementDir(incrementId);
    if (!incDir) return null;

    const specPath = path.join(incDir, 'spec.md');
    const tasksPath = path.join(incDir, 'tasks.md');

    // Default values
    let priority: 'P1' | 'P2' | 'P3' = 'P2';
    let dependencies: string[] = [];
    let taskCount = 0;

    // Read spec for priority and dependencies
    if (fs.existsSync(specPath)) {
      const content = fs.readFileSync(specPath, 'utf-8');
      const priorityMatch = content.match(/priority:\s*(P[123])/);
      if (priorityMatch) {
        priority = priorityMatch[1] as 'P1' | 'P2' | 'P3';
      }

      const depsMatch = content.match(/dependencies:\s*\[(.*?)\]/s);
      if (depsMatch) {
        dependencies = depsMatch[1]
          .split(',')
          .map((d) => d.trim().replace(/['"]/g, ''))
          .filter((d) => d.length > 0);
      }
    }

    // Count tasks
    if (fs.existsSync(tasksPath)) {
      const content = fs.readFileSync(tasksPath, 'utf-8');
      taskCount = (content.match(/^### T-\d+:/gm) || []).length;
    }

    return {
      id: path.basename(incDir),
      priority,
      status: 'pending',
      dependencies,
      taskCount,
      estimatedIterations: Math.max(taskCount * 2, 5),
    };
  }

  /**
   * Find increment directory (handles prefix matching)
   */
  private findIncrementDir(incrementId: string): string | null {
    const direct = path.join(this.incrementsDir, incrementId);
    if (fs.existsSync(direct)) return direct;

    try {
      const entries = fs.readdirSync(this.incrementsDir);
      const match = entries.find((e) => e.startsWith(incrementId));
      if (match) return path.join(this.incrementsDir, match);
    } catch {
      // Directory doesn't exist
    }
    return null;
  }

  /**
   * Get all increments in queue
   */
  getQueue(): QueuedIncrement[] {
    return [...this.queue];
  }

  /**
   * Get current (first pending) increment
   */
  getCurrentIncrement(): QueuedIncrement | null {
    return this.queue.find((i) => i.status === 'pending' || i.status === 'active') || null;
  }

  /**
   * Mark current increment as active
   */
  activateCurrentIncrement(): QueuedIncrement | null {
    const current = this.queue.find((i) => i.status === 'pending');
    if (current) {
      current.status = 'active';
      return current;
    }
    return null;
  }

  /**
   * Mark increment as completed and move to next
   */
  completeIncrement(incrementId: string): QueuedIncrement | null {
    const index = this.queue.findIndex((i) => i.id === incrementId || i.id.startsWith(incrementId));
    if (index !== -1) {
      this.queue[index].status = 'completed';
    }

    // Return next pending increment
    return this.queue.find((i) => i.status === 'pending') || null;
  }

  /**
   * Mark increment as failed
   */
  failIncrement(incrementId: string, reason?: string): void {
    const index = this.queue.findIndex((i) => i.id === incrementId || i.id.startsWith(incrementId));
    if (index !== -1) {
      this.queue[index].status = 'failed';
    }
  }

  /**
   * Skip increment
   */
  skipIncrement(incrementId: string): QueuedIncrement | null {
    const index = this.queue.findIndex((i) => i.id === incrementId || i.id.startsWith(incrementId));
    if (index !== -1) {
      this.queue[index].status = 'skipped';
    }
    return this.queue.find((i) => i.status === 'pending') || null;
  }

  /**
   * Validate dependencies for an increment
   */
  validateDependencies(incrementId: string): { valid: boolean; unmet: string[] } {
    const increment = this.queue.find((i) => i.id === incrementId || i.id.startsWith(incrementId));
    if (!increment) {
      return { valid: false, unmet: ['Increment not found'] };
    }

    if (increment.dependencies.length === 0) {
      return { valid: true, unmet: [] };
    }

    const unmet: string[] = [];

    for (const dep of increment.dependencies) {
      // Check if dependency is completed in queue
      const depInQueue = this.queue.find((i) => i.id.startsWith(dep));
      if (depInQueue && depInQueue.status === 'completed') {
        continue;
      }

      // Check if dependency exists and is completed on disk
      const depDir = this.findIncrementDir(dep);
      if (depDir) {
        const metaPath = path.join(depDir, 'metadata.json');
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            if (meta.status === 'completed') {
              continue;
            }
          } catch {
            // Invalid metadata
          }
        }
      }

      unmet.push(dep);
    }

    return { valid: unmet.length === 0, unmet };
  }

  /**
   * Check WIP limits
   */
  checkWIPLimit(): { allowed: boolean; current: number; max: number } {
    // Count active increments across ALL increments (not just queue)
    let activeCount = 0;

    try {
      const entries = fs.readdirSync(this.incrementsDir);
      for (const entry of entries) {
        if (!entry.match(/^\d{4}/)) continue;

        const metaPath = path.join(this.incrementsDir, entry, 'metadata.json');
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            if (meta.status === 'active' || meta.status === 'in-progress') {
              activeCount++;
            }
          } catch {
            // Invalid metadata
          }
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return {
      allowed: activeCount < this.config.maxWIP,
      current: activeCount,
      max: this.config.maxWIP,
    };
  }

  /**
   * Get backlog increments (all planned/backlog status increments)
   */
  getBacklogIncrements(): string[] {
    const backlog: Array<{ id: string; priority: string }> = [];

    try {
      const entries = fs.readdirSync(this.incrementsDir);
      for (const entry of entries) {
        if (!entry.match(/^\d{4}/)) continue;

        const specPath = path.join(this.incrementsDir, entry, 'spec.md');
        const metaPath = path.join(this.incrementsDir, entry, 'metadata.json');

        let status = '';
        let priority = 'P2';

        // Check metadata first
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            status = meta.status || '';
          } catch {
            // Invalid metadata
          }
        }

        // Fall back to spec.md
        if (!status && fs.existsSync(specPath)) {
          const content = fs.readFileSync(specPath, 'utf-8');
          const statusMatch = content.match(/status:\s*(\w+)/);
          if (statusMatch) status = statusMatch[1];

          const priorityMatch = content.match(/priority:\s*(P[123])/);
          if (priorityMatch) priority = priorityMatch[1];
        }

        if (status === 'backlog' || status === 'planned') {
          backlog.push({ id: entry, priority });
        }
      }
    } catch {
      // Directory doesn't exist
    }

    // Sort by priority
    backlog.sort((a, b) => {
      const order = { P1: 0, P2: 1, P3: 2 };
      return (order[a.priority as keyof typeof order] || 2) - (order[b.priority as keyof typeof order] || 2);
    });

    return backlog.map((b) => b.id);
  }

  /**
   * Get queue summary for display
   */
  getSummary(): {
    total: number;
    pending: number;
    active: number;
    completed: number;
    failed: number;
    skipped: number;
  } {
    return {
      total: this.queue.length,
      pending: this.queue.filter((i) => i.status === 'pending').length,
      active: this.queue.filter((i) => i.status === 'active').length,
      completed: this.queue.filter((i) => i.status === 'completed').length,
      failed: this.queue.filter((i) => i.status === 'failed').length,
      skipped: this.queue.filter((i) => i.status === 'skipped').length,
    };
  }
}
