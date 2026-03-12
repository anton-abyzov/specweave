/**
 * Sync Resilience Audit Logger
 *
 * Append-only JSONL audit log for sync resilience events.
 * Tracks sync attempts (success, failure, skips) with rotation at 5MB.
 *
 * Separate from the existing SyncAuditLogger which tracks per-operation events.
 * This logger tracks per-sync-attempt events from the SyncResilience facade.
 *
 * @module core/sync/sync-resilience-audit-logger
 */

import { promises as fs } from 'fs';
import nodeFs from 'fs';
import path from 'path';

export interface ResilienceAuditEntry {
  timestamp: string;
  incrementId: string;
  provider: string;
  outcome: 'success' | 'failure' | 'skipped_circuit_open' | 'skipped_rate_limit' | 'retry_enqueued';
  error?: string;
  errorStack?: string;
  durationMs?: number;
  attemptNumber?: number;
}

export interface AppendParams {
  incrementId: string;
  provider: string;
  outcome: ResilienceAuditEntry['outcome'];
  error?: string;
  errorStack?: string;
  durationMs?: number;
  attemptNumber?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class SyncResilienceAuditLogger {
  private readonly filePath: string;
  private readonly statePath: string;

  constructor(options: { statePath: string }) {
    this.statePath = options.statePath;
    this.filePath = path.join(options.statePath, 'sync-audit.jsonl');
  }

  async append(params: AppendParams): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.statePath, { recursive: true });

      // Check rotation before writing
      await this.rotateIfNeeded();

      const entry: ResilienceAuditEntry = {
        timestamp: new Date().toISOString(),
        incrementId: params.incrementId,
        provider: params.provider,
        outcome: params.outcome,
        ...(params.error !== undefined && { error: params.error }),
        ...(params.errorStack !== undefined && { errorStack: params.errorStack }),
        ...(params.durationMs !== undefined && { durationMs: params.durationMs }),
        ...(params.attemptNumber !== undefined && { attemptNumber: params.attemptNumber }),
      };

      const line = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.filePath, line, 'utf-8');
    } catch {
      // Don't fail the sync operation if logging fails
    }
  }

  async readRecent(hours: number): Promise<ResilienceAuditEntry[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      return content
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line) as ResilienceAuditEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is ResilienceAuditEntry =>
          entry !== null && entry.timestamp >= cutoff
        );
    } catch {
      return [];
    }
  }

  private async rotateIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.filePath);
      if (stats.size >= MAX_FILE_SIZE) {
        await this.rotate();
      }
    } catch {
      // File doesn't exist yet — no rotation needed
    }
  }

  private async rotate(): Promise<void> {
    const rotatedPath = this.filePath + '.1';
    const oldRotated = this.filePath + '.2';

    // Remove the oldest rotated file if it exists
    try {
      await fs.unlink(oldRotated);
    } catch {
      // Doesn't exist
    }

    // Move current .1 to .2
    try {
      await fs.rename(rotatedPath, oldRotated);
    } catch {
      // Doesn't exist
    }

    // Move current to .1
    await fs.rename(this.filePath, rotatedPath);
  }
}
