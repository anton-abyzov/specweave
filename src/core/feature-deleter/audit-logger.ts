/**
 * Audit Logger for Feature Deletion
 * Increment: 0053-safe-feature-deletion
 * Tasks: T-030, T-031, T-032, T-033
 */

import { Logger, consoleLogger } from '../../utils/logger.js';
import { DeletionEvent } from './types.js';
import fs from 'fs/promises';
import path from 'path';
import { execFileNoThrow } from '../../utils/execFileNoThrow.js';

/**
 * Feature Deletion Audit Logger
 * Writes deletion events to JSON Lines log with rotation
 */
export class FeatureDeletionAuditLogger {
  private logger: Logger;
  private logFile: string;
  private readonly MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(projectRoot: string, logger?: Logger) {
    this.logger = logger || consoleLogger;
    this.logFile = path.join(projectRoot, '.specweave/logs/feature-deletions.log');
  }

  /**
   * T-030, T-032, T-033: Log deletion event (JSON Lines format)
   */
  async logDeletion(event: Omit<DeletionEvent, 'timestamp' | 'user'>): Promise<void> {
    try {
      // T-031: Check log size and rotate if needed
      await this.rotateIfNeeded();

      // Get user from git config or environment
      const user = await this.getUser();

      // Create full event
      const fullEvent: DeletionEvent = {
        ...event,
        timestamp: new Date().toISOString(),
        user
      };

      // Append JSON line to log
      const logLine = JSON.stringify(fullEvent) + '\n';
      const logDir = path.dirname(this.logFile);

      await fs.mkdir(logDir, { recursive: true });
      await fs.appendFile(this.logFile, logLine);

      this.logger.log(`Audit log written: ${event.featureId} (${event.status})`);
    } catch (error) {
      this.logger.warn(`Failed to write audit log: ${error}`);
    }
  }

  /**
   * T-031: Rotate log if size exceeds 10MB
   */
  private async rotateIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.logFile);

      if (stats.size > this.MAX_LOG_SIZE) {
        this.logger.log('Rotating audit log (>10MB)');

        const rotatedFile = this.logFile + '.1';

        // Rename current log to .1 (overwrite if exists)
        await fs.rename(this.logFile, rotatedFile);

        this.logger.log(`Log rotated: ${path.basename(rotatedFile)}`);
      }
    } catch (error) {
      // Log file doesn't exist yet - not an error
    }
  }

  /**
   * Get user from git config or environment
   */
  private async getUser(): Promise<string> {
    const result = await execFileNoThrow('git', ['config', 'user.name']);
    return result.stdout.trim() || process.env.USER || 'unknown';
  }
}
