/**
 * Sync Retry Queue
 *
 * File-based retry queue for failed external sync operations.
 * Persists to .specweave/state/sync-retry-queue.json with atomic writes.
 *
 * Features:
 * - Exponential backoff: 1m, 5m, 30m
 * - 100-entry cap with FIFO eviction
 * - 7-day auto-prune on every write
 * - Atomic write via temp file + rename
 *
 * @module core/sync/sync-retry-queue
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface RetryEntry {
  id: string;
  incrementId: string;
  provider: string;
  featureId: string;
  projectPath: string;
  projectName: string;
  error: string;
  attemptCount: number;
  maxAttempts: number;
  status: 'pending' | 'failed';
  createdAt: string;
  nextRetryAt: string;
  lastAttemptAt: string;
}

interface QueueFile {
  version: number;
  entries: RetryEntry[];
  lastPruned?: string;
}

export interface EnqueueParams {
  incrementId: string;
  provider: string;
  featureId: string;
  projectPath: string;
  projectName: string;
  error: string;
  attemptCount?: number;
}

const BACKOFF_INTERVALS_MS = [
  60 * 1000,       // 1 minute
  5 * 60 * 1000,   // 5 minutes
  30 * 60 * 1000,  // 30 minutes
];

const MAX_ENTRIES = 100;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class SyncRetryQueue {
  private readonly filePath: string;
  private readonly statePath: string;

  constructor(options: { statePath: string }) {
    this.statePath = options.statePath;
    this.filePath = path.join(options.statePath, 'sync-retry-queue.json');
  }

  async enqueue(params: EnqueueParams): Promise<RetryEntry> {
    const data = await this.read();
    const attemptCount = params.attemptCount ?? 1;
    const backoffIndex = Math.min(attemptCount - 1, BACKOFF_INTERVALS_MS.length - 1);
    const backoffMs = BACKOFF_INTERVALS_MS[backoffIndex];

    const entry: RetryEntry = {
      id: crypto.randomUUID(),
      incrementId: params.incrementId,
      provider: params.provider,
      featureId: params.featureId,
      projectPath: params.projectPath,
      projectName: params.projectName,
      error: params.error,
      attemptCount,
      maxAttempts: 3,
      status: 'pending',
      createdAt: new Date().toISOString(),
      nextRetryAt: new Date(Date.now() + backoffMs).toISOString(),
      lastAttemptAt: new Date().toISOString(),
    };

    data.entries.push(entry);
    this.prune(data);
    this.enforceCapPending(data);
    await this.write(data);
    return entry;
  }

  async getAll(): Promise<RetryEntry[]> {
    const data = await this.read();
    return data.entries;
  }

  async getByIncrement(incrementId: string): Promise<RetryEntry[]> {
    const data = await this.read();
    return data.entries.filter((e) => e.incrementId === incrementId);
  }

  async getByProvider(provider: string): Promise<RetryEntry[]> {
    const data = await this.read();
    return data.entries.filter((e) => e.provider === provider);
  }

  async markFailed(id: string): Promise<void> {
    const data = await this.read();
    const entry = data.entries.find((e) => e.id === id);
    if (entry) {
      entry.status = 'failed';
      await this.write(data);
    }
  }

  async remove(id: string): Promise<void> {
    const data = await this.read();
    data.entries = data.entries.filter((e) => e.id !== id);
    await this.write(data);
  }

  async size(): Promise<number> {
    const data = await this.read();
    return data.entries.length;
  }

  private prune(data: QueueFile): void {
    const cutoff = Date.now() - MAX_AGE_MS;
    data.entries = data.entries.filter(
      (e) => new Date(e.createdAt).getTime() > cutoff
    );
    data.lastPruned = new Date().toISOString();
  }

  private enforceCapPending(data: QueueFile): void {
    if (data.entries.length > MAX_ENTRIES) {
      // Remove oldest entries first (FIFO)
      data.entries.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      data.entries = data.entries.slice(data.entries.length - MAX_ENTRIES);
    }
  }

  private async read(): Promise<QueueFile> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as QueueFile;
    } catch {
      return { version: 1, entries: [] };
    }
  }

  private async write(data: QueueFile): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(this.statePath, { recursive: true });

    // Atomic write: temp file then rename
    const tmpPath = this.filePath + '.tmp.' + crypto.randomUUID().slice(0, 8);
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpPath, this.filePath);
  }
}
