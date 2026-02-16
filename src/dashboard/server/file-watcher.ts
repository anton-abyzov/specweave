import * as fs from 'fs';
import * as path from 'path';
import type { SSEEventType } from '../types.js';

export interface WatchEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
}

interface FileTarget {
  relativePath: string;
  eventType: SSEEventType;
}

export class FileWatcher {
  private watchers: fs.FSWatcher[] = [];
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private watchedFiles = new Set<string>();
  private fileTargets: FileTarget[];
  private retryInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private projectRoot: string,
    private onEvent: (event: WatchEvent) => void,
    private debounceMs = 300,
  ) {
    this.fileTargets = [
      { relativePath: '.specweave/state/dashboard.json', eventType: 'increment-update' },
      { relativePath: '.specweave/state/notifications.json', eventType: 'notification' },
      { relativePath: '.specweave/state/analytics/events.jsonl', eventType: 'analytics-event' },
      { relativePath: '.specweave/logs/costs.json', eventType: 'cost-update' },
      { relativePath: '.specweave/sync-metadata.json', eventType: 'sync-update' },
      { relativePath: '.specweave/config.json', eventType: 'config-changed' },
      { relativePath: '.specweave/state/prompt-health.json', eventType: 'error-detected' },
      { relativePath: '.specweave/state/prompt-health-alert.json', eventType: 'error-detected' },
    ];
    this.startWatching();
  }

  private startWatching(): void {
    // Watch specific state files (those that exist now)
    for (const target of this.fileTargets) {
      const fullPath = path.join(this.projectRoot, target.relativePath);
      this.watchFile(fullPath, target.eventType);
    }

    // Periodically retry missing files (every 30s, aligned with SSE heartbeat)
    this.retryInterval = setInterval(() => this.retryMissingFiles(), 30_000);

    // Watch increments directory recursively for metadata/task changes
    const incDir = path.join(this.projectRoot, '.specweave/increments');
    if (fs.existsSync(incDir)) {
      try {
        const watcher = fs.watch(incDir, { recursive: true }, (_event, filename) => {
          if (filename && (filename.endsWith('metadata.json') || filename.endsWith('tasks.md'))) {
            const incrementId = filename.split(path.sep)[0] || filename.split('/')[0];
            this.debouncedEmit('increment-update', incDir, {
              incrementId,
              file: filename,
            });
          }
        });
        this.watchers.push(watcher);
        watcher.on('error', () => {}); // Silently handle watcher errors
      } catch {
        // Directory may not exist or be watchable
      }
    }

    // Watch sync audit logs directory
    const syncLogDir = path.join(this.projectRoot, '.specweave/logs/sync');
    if (fs.existsSync(syncLogDir)) {
      try {
        const watcher = fs.watch(syncLogDir, (_event, filename) => {
          if (filename && filename.endsWith('.jsonl')) {
            this.debouncedEmit('sync-audit', syncLogDir, { file: filename });
          }
        });
        this.watchers.push(watcher);
        watcher.on('error', () => {});
      } catch {
        // Silent
      }
    }
  }

  /** Retry watching files that didn't exist at startup */
  private retryMissingFiles(): void {
    for (const target of this.fileTargets) {
      const fullPath = path.join(this.projectRoot, target.relativePath);
      if (!this.watchedFiles.has(fullPath)) {
        this.watchFile(fullPath, target.eventType);
      }
    }
  }

  private watchFile(fullPath: string, eventType: SSEEventType): void {
    if (this.watchedFiles.has(fullPath)) return;
    if (!fs.existsSync(fullPath)) return;
    try {
      const watcher = fs.watch(fullPath, () => {
        this.debouncedEmit(eventType, fullPath, { file: path.basename(fullPath) });
      });
      this.watchers.push(watcher);
      this.watchedFiles.add(fullPath);
      watcher.on('error', () => {
        this.watchedFiles.delete(fullPath);
      });
    } catch {
      // File may not be watchable
    }
  }

  private debouncedEmit(
    eventType: SSEEventType,
    source: string,
    data: Record<string, unknown>,
  ): void {
    const key = `${eventType}:${source}`;
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(
      key,
      setTimeout(() => {
        this.debounceTimers.delete(key);
        this.onEvent({
          type: eventType,
          data: { ...data, source, timestamp: new Date().toISOString() },
        });
      }, this.debounceMs),
    );
  }

  /** Stop all watchers and clear timers */
  close(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    for (const w of this.watchers) {
      try { w.close(); } catch { /* already closed */ }
    }
    this.watchers = [];
    this.watchedFiles.clear();
    for (const t of this.debounceTimers.values()) clearTimeout(t);
    this.debounceTimers.clear();
  }
}
