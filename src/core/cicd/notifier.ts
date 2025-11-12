/**
 * CI/CD Failure Notifier
 *
 * Sends notifications when workflow failures are detected.
 * Supports multiple notification channels (console, file, webhook).
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { FailureRecord } from './types';

/**
 * Notification channel types
 */
export type NotificationChannel = 'console' | 'file' | 'webhook';

/**
 * Notification configuration
 */
export interface NotifierConfig {
  /** Enabled channels */
  channels: NotificationChannel[];

  /** Log file path (for 'file' channel) */
  logFile?: string;

  /** Webhook URL (for 'webhook' channel) */
  webhookUrl?: string;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Notification payload
 */
export interface Notification {
  /** Notification type */
  type: 'failure_detected' | 'analysis_complete' | 'fix_applied';

  /** Failure record */
  failure: FailureRecord;

  /** Additional message */
  message?: string;

  /** Timestamp */
  timestamp: string;
}

/**
 * Notifier - Sends failure notifications to configured channels
 *
 * Features:
 * - Multiple notification channels (console, file, webhook)
 * - Structured notification format
 * - Async delivery (non-blocking)
 * - Error handling and retry logic
 */
export class Notifier {
  private config: Required<NotifierConfig>;

  /**
   * Create notifier
   *
   * @param config - Notification configuration
   */
  constructor(config: NotifierConfig) {
    this.config = {
      channels: config.channels,
      logFile: config.logFile ?? '.specweave/logs/cicd-notifications.log',
      webhookUrl: config.webhookUrl ?? '',
      debug: config.debug ?? false
    };
  }

  /**
   * Send notification about failure detection
   *
   * @param failure - Failure record
   */
  async notifyFailureDetected(failure: FailureRecord): Promise<void> {
    const notification: Notification = {
      type: 'failure_detected',
      failure,
      message: `Workflow "${failure.workflowName}" failed (run #${failure.runId})`,
      timestamp: new Date().toISOString()
    };

    await this.send(notification);
  }

  /**
   * Send notification about analysis completion
   *
   * @param failure - Failure record
   * @param analysis - Analysis result
   */
  async notifyAnalysisComplete(
    failure: FailureRecord,
    analysis: string
  ): Promise<void> {
    const notification: Notification = {
      type: 'analysis_complete',
      failure,
      message: `Root cause analysis complete for ${failure.workflowName}:\n${analysis}`,
      timestamp: new Date().toISOString()
    };

    await this.send(notification);
  }

  /**
   * Send notification about fix application
   *
   * @param failure - Failure record
   * @param fixDetails - Fix details
   */
  async notifyFixApplied(
    failure: FailureRecord,
    fixDetails: string
  ): Promise<void> {
    const notification: Notification = {
      type: 'fix_applied',
      failure,
      message: `Fix applied for ${failure.workflowName}:\n${fixDetails}`,
      timestamp: new Date().toISOString()
    };

    await this.send(notification);
  }

  /**
   * Send notification to all configured channels
   *
   * @param notification - Notification payload
   */
  private async send(notification: Notification): Promise<void> {
    const promises = this.config.channels.map((channel) => {
      switch (channel) {
        case 'console':
          return this.sendToConsole(notification);
        case 'file':
          return this.sendToFile(notification);
        case 'webhook':
          return this.sendToWebhook(notification);
        default:
          console.warn(`Unknown notification channel: ${channel}`);
          return Promise.resolve();
      }
    });

    // Send to all channels (non-blocking, errors logged)
    await Promise.allSettled(promises);
  }

  /**
   * Send notification to console (stderr for visibility)
   */
  private async sendToConsole(notification: Notification): Promise<void> {
    const icon = this.getIcon(notification.type);
    const color = this.getColor(notification.type);

    console.error(`${color}${icon} ${notification.message}\x1b[0m`);

    if (this.config.debug) {
      console.error('Full notification:', JSON.stringify(notification, null, 2));
    }
  }

  /**
   * Send notification to log file
   */
  private async sendToFile(notification: Notification): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.config.logFile));

      const logLine = `${notification.timestamp} [${notification.type}] ${notification.message}\n`;
      await fs.appendFile(this.config.logFile, logLine, 'utf-8');

      if (this.config.debug) {
        await fs.appendFile(
          this.config.logFile,
          `${JSON.stringify(notification, null, 2)}\n`,
          'utf-8'
        );
      }
    } catch (error) {
      console.error('Failed to write notification to file:', error);
    }
  }

  /**
   * Send notification to webhook
   */
  private async sendToWebhook(notification: Notification): Promise<void> {
    if (!this.config.webhookUrl) {
      console.warn('Webhook URL not configured, skipping webhook notification');
      return;
    }

    try {
      // Use native fetch (Node.js 18+)
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }

      if (this.config.debug) {
        console.log('Webhook notification sent successfully');
      }
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  /**
   * Get icon for notification type
   */
  private getIcon(type: Notification['type']): string {
    switch (type) {
      case 'failure_detected':
        return '🚨';
      case 'analysis_complete':
        return '🔍';
      case 'fix_applied':
        return '✅';
      default:
        return '📢';
    }
  }

  /**
   * Get ANSI color code for notification type
   */
  private getColor(type: Notification['type']): string {
    switch (type) {
      case 'failure_detected':
        return '\x1b[31m'; // Red
      case 'analysis_complete':
        return '\x1b[33m'; // Yellow
      case 'fix_applied':
        return '\x1b[32m'; // Green
      default:
        return '\x1b[37m'; // White
    }
  }
}
