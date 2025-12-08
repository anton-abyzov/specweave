/**
 * External Tool Drift Detector
 *
 * Detects when external tools (GitHub/JIRA/ADO) haven't been synced recently,
 * indicating potential drift between living docs and external systems.
 *
 * Used by:
 * - /specweave:done (validation warning if drift > 24h)
 * - Status line (show "sync pending" indicator)
 * - /specweave:progress (show last sync time)
 *
 * See: ADR-0131 (External Tool Sync Context Detection)
 */

import * as path from 'path';
import { promises as fs } from 'fs';
import { Logger, consoleLogger } from './logger.js';

// Drift thresholds (extracted constants for P0-5 fix)
const DRIFT_THRESHOLD_HOURS = 24;      // Warning threshold
const WARNING_THRESHOLD_HOURS = 48;    // Elevated warning
const CRITICAL_THRESHOLD_HOURS = 168;  // 7 days - critical staleness

export interface DriftStatus {
  hasDrift: boolean;
  lastSyncTime: Date | null;
  hoursSinceSync: number | null;
  externalToolsConfigured: boolean;
  recommendation: string;
  error?: string;  // P0-5: Expose errors instead of masking
}

export class ExternalToolDriftDetector {
  private projectRoot: string;
  private logger: Logger;

  constructor(projectRoot: string, options: { logger?: Logger } = {}) {
    this.projectRoot = projectRoot;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Validate increment ID format to prevent path traversal attacks
   * P0-1: Path traversal vulnerability fix
   *
   * @param incrementId - Increment ID to validate (e.g., "0053-feature" or "0111E-external")
   * @throws Error if increment ID format is invalid
   */
  private validateIncrementId(incrementId: string): void {
    // Expected format: 4 digits + optional E suffix + hyphen + kebab-case
    // CRITICAL (v0.33.0): Allow E suffix for external increments (e.g., 0111E-name)
    if (!/^\d{4}E?-[a-z0-9-]+$/i.test(incrementId)) {
      throw new Error(`Invalid increment ID format: ${incrementId}. Expected format: XXXX-kebab-case or XXXXE-kebab-case`);
    }

    // Additional safety: reject path traversal attempts
    if (incrementId.includes('..') || incrementId.includes('/') || incrementId.includes('\\')) {
      throw new Error(`Path traversal attempt detected in increment ID: ${incrementId}`);
    }
  }

  /**
   * Safely parse and validate metadata.json
   * P0-2: JSON injection protection
   *
   * @param metadataPath - Path to metadata.json
   * @returns Parsed metadata object
   * @throws Error if JSON is invalid or malformed
   */
  private async readAndValidateMetadata(metadataPath: string): Promise<any> {
    const content = await fs.readFile(metadataPath, 'utf-8');

    let metadata;
    try {
      metadata = JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in metadata file: ${error instanceof Error ? error.message : 'Parse error'}`);
    }

    // Validate JSON structure
    if (typeof metadata !== 'object' || metadata === null) {
      throw new Error('Metadata must be a valid JSON object');
    }

    return metadata;
  }

  /**
   * Get most recent sync time across ALL external tools
   * P1-1: Check all tools instead of just first configured tool
   *
   * @param metadata - Parsed metadata.json
   * @returns Most recent sync date or null if no syncs found
   */
  private getMostRecentSync(metadata: any): Date | null {
    const syncTimes: Date[] = [];

    // Collect all sync times from configured external tools
    if (metadata.github?.lastSync) {
      const date = this.parseSafeDate(metadata.github.lastSync);
      if (date) syncTimes.push(date);
    }

    if (metadata.jira?.lastSync) {
      const date = this.parseSafeDate(metadata.jira.lastSync);
      if (date) syncTimes.push(date);
    }

    if (metadata.ado?.lastSync) {
      const date = this.parseSafeDate(metadata.ado.lastSync);
      if (date) syncTimes.push(date);
    }

    if (syncTimes.length === 0) {
      return null;
    }

    // Return most recent sync time (sort descending, take first)
    return syncTimes.sort((a, b) => b.getTime() - a.getTime())[0];
  }

  /**
   * Safely parse date string with validation
   *
   * @param dateString - ISO date string
   * @returns Date object or null if invalid
   */
  private parseSafeDate(dateString: string): Date | null {
    if (typeof dateString !== 'string') return null;

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      this.logger.warn(`Invalid date format: ${dateString}`);
      return null;
    }

    return date;
  }

  /**
   * Detect drift for a specific increment
   *
   * @param incrementId - Increment ID (e.g., "0053-safe-feature-deletion")
   * @returns Drift status with recommendations
   */
  async detectDrift(incrementId: string): Promise<DriftStatus> {
    try {
      // P0-1: Validate increment ID to prevent path traversal
      this.validateIncrementId(incrementId);

      // P0-4: Use async fs operations (replaced existsSync/readFileSync)
      const metadataPath = path.join(
        this.projectRoot,
        '.specweave/increments',
        incrementId,
        'metadata.json'
      );

      // Check if metadata exists (async)
      try {
        await fs.access(metadataPath);
      } catch {
        return {
          hasDrift: false,
          lastSyncTime: null,
          hoursSinceSync: null,
          externalToolsConfigured: false,
          recommendation: 'No metadata found'
        };
      }

      // P0-2: Safe JSON parsing with validation
      const metadata = await this.readAndValidateMetadata(metadataPath);

      // Check if external tools are configured
      const hasGitHub = metadata.github && metadata.github.issues && metadata.github.issues.length > 0;
      const hasJira = metadata.jira && metadata.jira.issues && metadata.jira.issues.length > 0;
      const hasADO = metadata.ado && metadata.ado.workItems && metadata.ado.workItems.length > 0;

      const externalToolsConfigured = hasGitHub || hasJira || hasADO;

      if (!externalToolsConfigured) {
        return {
          hasDrift: false,
          lastSyncTime: null,
          hoursSinceSync: null,
          externalToolsConfigured: false,
          recommendation: 'No external tools configured'
        };
      }

      // P1-1: Get most recent sync time across ALL external tools (not just first one)
      const lastSyncTime = this.getMostRecentSync(metadata);

      if (!lastSyncTime) {
        return {
          hasDrift: true,
          lastSyncTime: null,
          hoursSinceSync: null,
          externalToolsConfigured: true,
          recommendation: 'External tools never synced - run /specweave:sync-progress'
        };
      }

      // Calculate hours since last sync
      const now = new Date();
      const hoursSinceSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);

      // Use extracted constants (P0-5 fix)
      const hasDrift = hoursSinceSync > DRIFT_THRESHOLD_HOURS;

      let recommendation = '';
      if (hasDrift) {
        if (hoursSinceSync < WARNING_THRESHOLD_HOURS) {
          recommendation = 'External tools synced 1-2 days ago - consider running /specweave:sync-progress';
        } else if (hoursSinceSync < CRITICAL_THRESHOLD_HOURS) {
          recommendation = `External tools synced ${Math.floor(hoursSinceSync / 24)} days ago - run /specweave:sync-progress soon`;
        } else {
          recommendation = `External tools synced ${Math.floor(hoursSinceSync / 168)} weeks ago - URGENT: run /specweave:sync-progress`;
        }
      } else {
        recommendation = `External tools synced ${Math.floor(hoursSinceSync)} hours ago - up to date`;
      }

      return {
        hasDrift,
        lastSyncTime,
        hoursSinceSync,
        externalToolsConfigured,
        recommendation
      };
    } catch (error) {
      // P0-5: Don't mask errors - expose them in return value
      this.logger.error(`Error detecting drift for ${incrementId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        hasDrift: false,
        lastSyncTime: null,
        hoursSinceSync: null,
        externalToolsConfigured: false,
        recommendation: `Error detecting drift: ${errorMessage}`,
        error: errorMessage  // Expose error for caller to handle
      };
    }
  }

  /**
   * Get human-readable drift message for display
   *
   * @param drift - Drift status from detectDrift()
   * @returns Formatted message with emoji indicator
   */
  getDriftMessage(drift: DriftStatus): string {
    if (!drift.externalToolsConfigured) {
      return '';
    }

    if (!drift.lastSyncTime) {
      return '⚠️  External tools never synced';
    }

    if (drift.hasDrift) {
      if (drift.hoursSinceSync && drift.hoursSinceSync < 48) {
        return `⚠️  External sync: ${Math.floor(drift.hoursSinceSync)}h ago`;
      } else if (drift.hoursSinceSync && drift.hoursSinceSync < 168) {
        return `🔴 External sync: ${Math.floor(drift.hoursSinceSync / 24)}d ago`;
      } else {
        return `🔴 External sync: ${Math.floor((drift.hoursSinceSync || 0) / 168)}w ago (STALE)`;
      }
    }

    return `✅ External sync: ${Math.floor(drift.hoursSinceSync || 0)}h ago`;
  }
}
