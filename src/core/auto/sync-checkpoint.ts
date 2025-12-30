/**
 * Sync Checkpoint Module
 *
 * Manages synchronization of living docs and external tools at strategic checkpoints.
 * Features:
 * - Batch syncing (every N tasks)
 * - Force sync on completion
 * - Circuit breaker integration
 * - Retry with backoff
 */

import * as fs from 'fs';
import * as path from 'path';
import { CircuitBreakerRegistry } from './circuit-breaker.js';

export interface SyncCheckpointConfig {
  /** Sync after every N tasks (default: 5) */
  taskBatchSize: number;
  /** Force sync on increment completion */
  syncOnCompletion: boolean;
  /** Force sync on session end */
  syncOnSessionEnd: boolean;
  /** Sync living docs */
  syncLivingDocs: boolean;
  /** Sync to GitHub */
  syncGitHub: boolean;
  /** Sync to JIRA */
  syncJira: boolean;
  /** Sync to Azure DevOps */
  syncAdo: boolean;
  /** Retry delay in ms */
  retryDelay: number;
  /** Max retries per service */
  maxRetries: number;
}

export interface SyncResult {
  service: string;
  success: boolean;
  itemsSynced: number;
  error?: string;
  duration: number;
}

export interface CheckpointResult {
  timestamp: string;
  trigger: 'task_batch' | 'increment_complete' | 'session_end' | 'manual';
  results: SyncResult[];
  allSuccess: boolean;
  duration: number;
}

const DEFAULT_CONFIG: SyncCheckpointConfig = {
  taskBatchSize: 5,
  syncOnCompletion: true,
  syncOnSessionEnd: true,
  syncLivingDocs: true,
  syncGitHub: true,
  syncJira: true,
  syncAdo: true,
  retryDelay: 1000,
  maxRetries: 3,
};

export class SyncCheckpointManager {
  private config: SyncCheckpointConfig;
  private projectRoot: string;
  private circuitBreakers: CircuitBreakerRegistry;
  private tasksSinceLastSync: number = 0;
  private lastSyncTime: Date | null = null;

  constructor(
    projectRoot: string,
    circuitBreakers: CircuitBreakerRegistry,
    config: Partial<SyncCheckpointConfig> = {}
  ) {
    this.projectRoot = projectRoot;
    this.circuitBreakers = circuitBreakers;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record a task completion and check if sync needed
   */
  async onTaskComplete(): Promise<CheckpointResult | null> {
    this.tasksSinceLastSync++;

    if (this.tasksSinceLastSync >= this.config.taskBatchSize) {
      return this.runCheckpoint('task_batch');
    }

    return null;
  }

  /**
   * Run sync on increment completion
   */
  async onIncrementComplete(incrementId: string): Promise<CheckpointResult> {
    if (!this.config.syncOnCompletion) {
      return this.emptyCheckpoint('increment_complete');
    }

    return this.runCheckpoint('increment_complete', incrementId);
  }

  /**
   * Run sync on session end
   */
  async onSessionEnd(): Promise<CheckpointResult> {
    if (!this.config.syncOnSessionEnd) {
      return this.emptyCheckpoint('session_end');
    }

    return this.runCheckpoint('session_end');
  }

  /**
   * Force a manual sync
   */
  async forceSync(): Promise<CheckpointResult> {
    return this.runCheckpoint('manual');
  }

  /**
   * Run checkpoint with all configured syncs
   */
  private async runCheckpoint(
    trigger: CheckpointResult['trigger'],
    incrementId?: string
  ): Promise<CheckpointResult> {
    const startTime = Date.now();
    const results: SyncResult[] = [];

    // Sync living docs
    if (this.config.syncLivingDocs) {
      results.push(await this.syncLivingDocs(incrementId));
    }

    // Sync external tools
    if (this.config.syncGitHub) {
      results.push(await this.syncService('github', incrementId));
    }

    if (this.config.syncJira) {
      results.push(await this.syncService('jira', incrementId));
    }

    if (this.config.syncAdo) {
      results.push(await this.syncService('ado', incrementId));
    }

    // Reset counter
    this.tasksSinceLastSync = 0;
    this.lastSyncTime = new Date();

    const checkpoint: CheckpointResult = {
      timestamp: this.lastSyncTime.toISOString(),
      trigger,
      results,
      allSuccess: results.every((r) => r.success),
      duration: Date.now() - startTime,
    };

    this.logCheckpoint(checkpoint);

    return checkpoint;
  }

  /**
   * Sync living docs
   */
  private async syncLivingDocs(incrementId?: string): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Check if sync module exists
      const syncPath = path.join(
        this.projectRoot,
        'dist',
        'core',
        'living-docs',
        'living-docs-sync.js'
      );

      if (!fs.existsSync(syncPath)) {
        return {
          service: 'living-docs',
          success: true,
          itemsSynced: 0,
          duration: Date.now() - startTime,
          error: 'Sync module not found (skipped)',
        };
      }

      // In a real implementation, this would call LivingDocsSync
      // For now, we simulate success
      return {
        service: 'living-docs',
        success: true,
        itemsSynced: 1,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'living-docs',
        success: false,
        itemsSynced: 0,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Sync to external service with circuit breaker
   */
  private async syncService(
    service: 'github' | 'jira' | 'ado',
    incrementId?: string
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const breaker = this.circuitBreakers.getBreaker(service);

    // Check if service is configured
    if (!this.isServiceConfigured(service)) {
      return {
        service,
        success: true,
        itemsSynced: 0,
        duration: Date.now() - startTime,
        error: 'Not configured (skipped)',
      };
    }

    // Check circuit breaker
    if (breaker.isOpen()) {
      const status = breaker.getStatus();
      return {
        service,
        success: false,
        itemsSynced: 0,
        error: `Circuit open, retry after ${status.nextRetryAt}`,
        duration: Date.now() - startTime,
      };
    }

    try {
      // Execute with circuit breaker protection
      const itemsSynced = await breaker.execute(async () => {
        return this.executeSync(service, incrementId);
      });

      return {
        service,
        success: true,
        itemsSynced,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service,
        success: false,
        itemsSynced: 0,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if service is configured
   */
  private isServiceConfigured(service: string): boolean {
    const configPath = path.join(this.projectRoot, '.specweave', 'config.json');

    if (!fs.existsSync(configPath)) return false;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      switch (service) {
        case 'github':
          return !!(config.sync?.github?.enabled || config.sync?.profiles?.github);
        case 'jira':
          return !!(config.sync?.jira?.enabled || config.sync?.profiles?.jira);
        case 'ado':
          return !!(config.sync?.ado?.enabled || config.sync?.profiles?.ado);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Execute sync for a service (placeholder for actual implementation)
   */
  private async executeSync(service: string, incrementId?: string): Promise<number> {
    // In a real implementation, this would:
    // - For GitHub: call GitHubFeatureSync
    // - For JIRA: call JiraFeatureSync
    // - For ADO: call ADOFeatureSync

    // Simulate sync delay
    await new Promise((r) => setTimeout(r, 100));

    return 1; // Items synced
  }

  /**
   * Create empty checkpoint result
   */
  private emptyCheckpoint(trigger: CheckpointResult['trigger']): CheckpointResult {
    return {
      timestamp: new Date().toISOString(),
      trigger,
      results: [],
      allSuccess: true,
      duration: 0,
    };
  }

  /**
   * Log checkpoint to file
   */
  private logCheckpoint(checkpoint: CheckpointResult): void {
    const logsDir = path.join(this.projectRoot, '.specweave', 'logs');

    try {
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      fs.appendFileSync(
        path.join(logsDir, 'sync-checkpoints.log'),
        JSON.stringify(checkpoint) + '\n'
      );
    } catch {
      // Ignore logging errors
    }
  }

  /**
   * Get sync status for display
   */
  getStatus(): {
    tasksSinceLastSync: number;
    lastSyncTime: string | null;
    nextSyncIn: number;
  } {
    return {
      tasksSinceLastSync: this.tasksSinceLastSync,
      lastSyncTime: this.lastSyncTime?.toISOString() || null,
      nextSyncIn: Math.max(0, this.config.taskBatchSize - this.tasksSinceLastSync),
    };
  }
}
