/**
 * Analytics Collector
 *
 * Core class for collecting and storing usage analytics events.
 * Implements append-only JSONL storage with automatic rotation.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsConfig,
  DEFAULT_ANALYTICS_CONFIG,
  parseAnalyticsEvent,
} from './types.js';
import { maskCredentials, maskCredentialsInData } from '../../utils/credential-masker.js';

/**
 * Singleton analytics collector for tracking SpecWeave usage
 */
export class AnalyticsCollector {
  private static instances: Map<string, AnalyticsCollector> = new Map();
  private config: AnalyticsConfig;
  private analyticsDir: string;
  private eventsFile: string;
  private initialized: boolean = false;

  private constructor(projectRoot: string, config?: Partial<AnalyticsConfig>) {
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
    this.analyticsDir = path.join(projectRoot, '.specweave', 'state', 'analytics');
    this.eventsFile = path.join(this.analyticsDir, 'events.jsonl');
  }

  /**
   * Get or create an instance for the given project root
   */
  static getInstance(projectRoot?: string, config?: Partial<AnalyticsConfig>): AnalyticsCollector {
    const root = path.resolve(projectRoot || process.cwd());
    let instance = AnalyticsCollector.instances.get(root);
    if (!instance) {
      instance = new AnalyticsCollector(root, config);
      AnalyticsCollector.instances.set(root, instance);
    }
    return instance;
  }

  /**
   * Reset all instances (for testing)
   */
  static reset(): void {
    AnalyticsCollector.instances.clear();
  }

  /**
   * Initialize the analytics directory
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    try {
      if (!fs.existsSync(this.analyticsDir)) {
        fs.mkdirSync(this.analyticsDir, { recursive: true });
      }
      this.initialized = true;
    } catch {
      // Silently fail - analytics should never break the main flow
      // Leave initialized = false so next track() retries
    }
  }

  /**
   * Track a command invocation
   */
  trackCommand(
    name: string,
    options: {
      plugin?: string;
      increment?: string;
      duration?: number;
      success?: boolean;
      error?: string;
      args?: string[];
    } = {}
  ): void {
    this.track({
      type: 'command',
      name,
      plugin: options.plugin,
      increment: options.increment,
      duration: options.duration,
      success: options.success ?? true,
      error: options.error,
      metadata: options.args ? { args: options.args } : undefined,
    });
  }

  /**
   * Track a skill activation
   */
  trackSkill(
    name: string,
    options: {
      plugin?: string;
      increment?: string;
      duration?: number;
      success?: boolean;
      error?: string;
    } = {}
  ): void {
    this.track({
      type: 'skill',
      name,
      plugin: options.plugin,
      increment: options.increment,
      duration: options.duration,
      success: options.success ?? true,
      error: options.error,
    });
  }

  /**
   * Track an agent spawn
   */
  trackAgent(
    name: string,
    options: {
      plugin?: string;
      increment?: string;
      duration?: number;
      success?: boolean;
      error?: string;
      description?: string;
    } = {}
  ): void {
    this.track({
      type: 'agent',
      name,
      plugin: options.plugin,
      increment: options.increment,
      duration: options.duration,
      success: options.success ?? true,
      error: options.error,
      metadata: options.description ? { description: options.description } : undefined,
    });
  }

  /**
   * Track a generic event
   */
  track(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    if (!this.config.enabled) return;

    this.ensureInitialized();
    if (!this.initialized) return;

    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.appendEvent(sanitizeAnalyticsEvent(fullEvent));
    this.checkRotation();
  }

  /**
   * Append an event to the JSONL file
   */
  private appendEvent(event: AnalyticsEvent): void {
    try {
      const line = JSON.stringify(event) + '\n';
      fs.appendFileSync(this.eventsFile, line, 'utf-8');
    } catch {
      // Silently fail - analytics should never break the main flow
    }
  }

  /**
   * Check if log rotation is needed
   */
  private checkRotation(): void {
    try {
      if (!fs.existsSync(this.eventsFile)) return;

      const stats = fs.statSync(this.eventsFile);
      if (stats.size > this.config.maxLogSizeBytes) {
        this.rotateLog();
      }
    } catch {
      // Silently fail
    }
  }

  /**
   * Rotate the log file, keeping only recent events
   */
  private rotateLog(): void {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
      const cutoffTimestamp = cutoffDate.toISOString();

      const content = fs.readFileSync(this.eventsFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const recentLines: string[] = [];
      const oldLines: string[] = [];

      for (const line of lines) {
        try {
          const event = parseAnalyticsEvent(JSON.parse(line));
          if (!event) continue;
          (event.timestamp >= cutoffTimestamp ? recentLines : oldLines).push(line);
        } catch {
          // Skip malformed lines
        }
      }

      // Archive old events if any
      if (oldLines.length > 0) {
        const archiveDir = path.join(this.analyticsDir, 'archive');
        if (!fs.existsSync(archiveDir)) {
          fs.mkdirSync(archiveDir, { recursive: true });
        }
        const archiveFile = path.join(
          archiveDir,
          `events-${new Date().toISOString().split('T')[0]}.jsonl`
        );
        fs.appendFileSync(archiveFile, oldLines.join('\n') + '\n', 'utf-8');
      }

      // Atomic write: temp file then rename to prevent data loss from concurrent writers
      const tempFile = `${this.eventsFile}.tmp.${Date.now()}`;
      try {
        fs.writeFileSync(tempFile, recentLines.join('\n') + '\n', 'utf-8');
        fs.renameSync(tempFile, this.eventsFile);
      } catch {
        try { fs.unlinkSync(tempFile); } catch { /* ignore cleanup failure */ }
      }
    } catch {
      // Silently fail
    }
  }

  /**
   * Read all events from the log
   */
  readEvents(): AnalyticsEvent[] {
    this.ensureInitialized();
    if (!this.initialized) return [];

    try {
      if (!fs.existsSync(this.eventsFile)) return [];

      const content = fs.readFileSync(this.eventsFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const events: AnalyticsEvent[] = [];
      for (const line of lines) {
        try {
          const event = parseAnalyticsEvent(JSON.parse(line));
          if (event) events.push(event);
        } catch {
          // Skip malformed lines
        }
      }

      return events;
    } catch {
      return [];
    }
  }

  /**
   * Read events filtered by date range and type
   */
  readEventsFiltered(options: {
    since?: string;
    until?: string;
    type?: AnalyticsEventType;
    plugin?: string;
  }): AnalyticsEvent[] {
    const events = this.readEvents();

    // Normalize date-only strings for inclusive date range filtering
    const since = options.since && !options.since.includes('T')
      ? options.since + 'T00:00:00.000Z' : options.since;
    const until = options.until && !options.until.includes('T')
      ? options.until + 'T23:59:59.999Z' : options.until;

    return events.filter((event) => {
      if (since && event.timestamp < since) return false;
      if (until && event.timestamp > until) return false;
      if (options.type && event.type !== options.type) return false;
      if (options.plugin && event.plugin !== options.plugin) return false;
      return true;
    });
  }

  /**
   * Get the analytics directory path
   */
  getAnalyticsDir(): string {
    return this.analyticsDir;
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Disable analytics collection
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Enable analytics collection
   */
  enable(): void {
    this.config.enabled = true;
  }
}

function sanitizeAnalyticsEvent(event: AnalyticsEvent): AnalyticsEvent {
  return {
    ...event,
    error: event.error ? maskCredentials(event.error) : event.error,
    metadata: event.metadata ? maskCredentialsInData(event.metadata) : event.metadata,
  };
}

/**
 * Convenience function to track a command
 */
export function trackCommand(
  name: string,
  options?: Parameters<AnalyticsCollector['trackCommand']>[1]
): void {
  try {
    AnalyticsCollector.getInstance().trackCommand(name, options);
  } catch {
    // Never throw from analytics
  }
}

/**
 * Convenience function to track a skill
 */
export function trackSkill(
  name: string,
  options?: Parameters<AnalyticsCollector['trackSkill']>[1]
): void {
  try {
    AnalyticsCollector.getInstance().trackSkill(name, options);
  } catch {
    // Never throw from analytics
  }
}

/**
 * Convenience function to track an agent
 */
export function trackAgent(
  name: string,
  options?: Parameters<AnalyticsCollector['trackAgent']>[1]
): void {
  try {
    AnalyticsCollector.getInstance().trackAgent(name, options);
  } catch {
    // Never throw from analytics
  }
}
