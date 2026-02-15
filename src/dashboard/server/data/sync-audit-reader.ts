import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export interface SyncAuditEntry {
  timestamp: string;
  platform: string;
  operation: string;
  itemId: string;
  result: 'success' | 'denied' | 'error' | 'skipped';
  direction: 'push' | 'pull';
  duration?: number;
  message?: string;
  conflict?: boolean;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

/**
 * Reads sync audit JSONL log files from .specweave/logs/sync/
 */
export class SyncAuditReader {
  private auditDir: string;

  constructor(projectRoot: string) {
    this.auditDir = path.join(projectRoot, '.specweave/logs/sync');
  }

  /** Get recent audit entries, optionally filtered */
  async getRecentEntries(options: {
    limit?: number;
    platform?: string;
    result?: string;
    since?: string;
  } = {}): Promise<SyncAuditEntry[]> {
    const { limit = 100, platform, result, since } = options;
    const files = this.getAuditFiles();
    const entries: SyncAuditEntry[] = [];

    // Read files in reverse order (newest first)
    for (let i = files.length - 1; i >= 0 && entries.length < limit; i--) {
      const fileEntries = await this.parseAuditFile(files[i]);
      for (let j = fileEntries.length - 1; j >= 0 && entries.length < limit; j--) {
        const entry = fileEntries[j];
        if (platform && entry.platform !== platform) continue;
        if (result && entry.result !== result) continue;
        if (since && entry.timestamp < since) continue;
        entries.push(entry);
      }
    }

    return entries;
  }

  /** Get audit summary per platform */
  async getSummary(): Promise<Record<string, {
    total: number;
    success: number;
    errors: number;
    denied: number;
    lastEntry?: string;
  }>> {
    const entries = await this.getRecentEntries({ limit: 500 });
    const summary: Record<string, { total: number; success: number; errors: number; denied: number; lastEntry?: string }> = {};

    for (const entry of entries) {
      if (!summary[entry.platform]) {
        summary[entry.platform] = { total: 0, success: 0, errors: 0, denied: 0 };
      }
      const s = summary[entry.platform];
      s.total++;
      if (entry.result === 'success') s.success++;
      if (entry.result === 'error') s.errors++;
      if (entry.result === 'denied') s.denied++;
      if (!s.lastEntry || entry.timestamp > s.lastEntry) s.lastEntry = entry.timestamp;
    }

    return summary;
  }

  private async parseAuditFile(filePath: string): Promise<SyncAuditEntry[]> {
    const entries: SyncAuditEntry[] = [];
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        entries.push({
          timestamp: data.timestamp || '',
          platform: data.platform || 'unknown',
          operation: data.operation || data.action || '',
          itemId: data.itemId || data.id || '',
          result: data.result || 'success',
          direction: data.direction || 'push',
          duration: data.duration,
          message: data.message || data.error,
          conflict: data.conflict || false,
          oldValues: data.oldValues,
          newValues: data.newValues,
        });
      } catch { /* skip malformed */ }
    }

    return entries;
  }

  private getAuditFiles(): string[] {
    if (!fs.existsSync(this.auditDir)) return [];
    try {
      return fs.readdirSync(this.auditDir)
        .filter(f => f.endsWith('.jsonl'))
        .sort()
        .map(f => path.join(this.auditDir, f));
    } catch { return []; }
  }
}
