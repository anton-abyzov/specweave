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
import * as fs from 'fs';
import { Logger, consoleLogger } from './logger.js';

export interface DriftStatus {
  hasDrift: boolean;
  lastSyncTime: Date | null;
  hoursSinceSync: number | null;
  externalToolsConfigured: boolean;
  recommendation: string;
}

export class ExternalToolDriftDetector {
  private projectRoot: string;
  private logger: Logger;

  constructor(projectRoot: string, options: { logger?: Logger } = {}) {
    this.projectRoot = projectRoot;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Detect drift for a specific increment
   *
   * @param incrementId - Increment ID (e.g., "0053-safe-feature-deletion")
   * @returns Drift status with recommendations
   */
  async detectDrift(incrementId: string): Promise<DriftStatus> {
    try {
      // Read metadata.json to check last external sync time
      const metadataPath = path.join(
        this.projectRoot,
        '.specweave/increments',
        incrementId,
        'metadata.json'
      );

      if (!fs.existsSync(metadataPath)) {
        return {
          hasDrift: false,
          lastSyncTime: null,
          hoursSinceSync: null,
          externalToolsConfigured: false,
          recommendation: 'No metadata found'
        };
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

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

      // Get last sync time from metadata
      let lastSyncTime: Date | null = null;

      if (hasGitHub && metadata.github.lastSync) {
        lastSyncTime = new Date(metadata.github.lastSync);
      } else if (hasJira && metadata.jira.lastSync) {
        lastSyncTime = new Date(metadata.jira.lastSync);
      } else if (hasADO && metadata.ado.lastSync) {
        lastSyncTime = new Date(metadata.ado.lastSync);
      }

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

      // Drift threshold: 24 hours
      const DRIFT_THRESHOLD_HOURS = 24;
      const hasDrift = hoursSinceSync > DRIFT_THRESHOLD_HOURS;

      let recommendation = '';
      if (hasDrift) {
        if (hoursSinceSync < 48) {
          recommendation = 'External tools synced 1-2 days ago - consider running /specweave:sync-progress';
        } else if (hoursSinceSync < 168) {
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
      this.logger.error(`Error detecting drift for ${incrementId}:`, error);
      return {
        hasDrift: false,
        lastSyncTime: null,
        hoursSinceSync: null,
        externalToolsConfigured: false,
        recommendation: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
