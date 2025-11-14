/**
 * Sync Event Logger
 *
 * Logs status synchronization events and conflict resolutions.
 * Provides audit trail for all sync operations.
 *
 * Events are logged to .specweave/logs/sync-events.json
 *
 * @module sync-event-logger
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Sync event (successful or failed sync)
 */
export interface SyncEvent {
  incrementId: string;
  tool: 'github' | 'jira' | 'ado';
  fromStatus: string;
  toStatus: string;
  timestamp: string; // ISO 8601
  triggeredBy: 'user' | 'auto-sync' | 'hook';
  success: boolean;
  direction: 'to-external' | 'from-external' | 'bidirectional';
  error?: string;
}

/**
 * Conflict resolution event
 */
export interface ConflictEvent {
  incrementId: string;
  tool: 'github' | 'jira' | 'ado';
  localStatus: string;
  remoteStatus: string;
  localTimestamp: string; // ISO 8601
  remoteTimestamp: string; // ISO 8601
  resolutionStrategy: 'prompt' | 'last-write-wins' | 'specweave-wins' | 'external-wins';
  resolvedTo: 'use-local' | 'use-remote';
  timestamp: string; // ISO 8601
  triggeredBy: 'user' | 'auto-sync' | 'hook';
  userChoice?: string; // If resolution was 'prompt', what user chose
}

/**
 * Union type for all event types
 */
export type AnyEvent = SyncEvent | ConflictEvent;

/**
 * Filter options for loading history
 */
export interface LoadHistoryOptions {
  incrementId?: string;
  tool?: 'github' | 'jira' | 'ado';
  success?: boolean;
}

/**
 * Sync Event Logger
 *
 * Logs and retrieves status synchronization events.
 */
export class SyncEventLogger {
  private projectRoot: string;
  private logsDir: string;
  private eventsFile: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.logsDir = path.join(projectRoot, '.specweave', 'logs');
    this.eventsFile = path.join(this.logsDir, 'sync-events.json');
  }

  /**
   * Log a sync event
   *
   * @param event - Sync event to log
   */
  async logSyncEvent(event: SyncEvent): Promise<void> {
    await this.ensureLogsDir();
    const events = await this.loadAllEvents();
    events.push(event);
    await this.writeEvents(events);
  }

  /**
   * Log a conflict resolution event
   *
   * @param event - Conflict event to log
   */
  async logConflictEvent(event: ConflictEvent): Promise<void> {
    await this.ensureLogsDir();
    const events = await this.loadAllEvents();
    events.push(event);
    await this.writeEvents(events);
  }

  /**
   * Load sync history
   *
   * @param options - Filter options
   * @returns Array of events (filtered if options provided)
   */
  async loadSyncHistory(options?: LoadHistoryOptions): Promise<AnyEvent[]> {
    const exists = await fs.pathExists(this.eventsFile);
    if (!exists) {
      return [];
    }

    let events: AnyEvent[] = await fs.readJson(this.eventsFile);

    // Apply filters
    if (options?.incrementId) {
      events = events.filter(e => e.incrementId === options.incrementId);
    }

    if (options?.tool) {
      events = events.filter(e => e.tool === options.tool);
    }

    if (options?.success !== undefined) {
      events = events.filter(e => {
        // Only SyncEvent has 'success' field
        if ('success' in e) {
          return e.success === options.success;
        }
        return false;
      });
    }

    return events;
  }

  /**
   * Ensure logs directory exists
   */
  private async ensureLogsDir(): Promise<void> {
    await fs.ensureDir(this.logsDir);
  }

  /**
   * Load all events from file
   *
   * @returns Array of all events
   */
  private async loadAllEvents(): Promise<AnyEvent[]> {
    const exists = await fs.pathExists(this.eventsFile);
    if (!exists) {
      return [];
    }

    return await fs.readJson(this.eventsFile);
  }

  /**
   * Write events to file
   *
   * @param events - Array of events to write
   */
  private async writeEvents(events: AnyEvent[]): Promise<void> {
    await fs.writeJson(this.eventsFile, events, { spaces: 2 });
  }
}
