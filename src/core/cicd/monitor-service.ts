/**
 * CI/CD Monitor Service
 *
 * High-level orchestration service that coordinates the workflow monitor,
 * state manager, and notifier for end-to-end failure detection and notification.
 */

import { WorkflowMonitor, MonitorConfig } from './workflow-monitor.js';
import { StateManager } from './state-manager.js';
import { Notifier, NotifierConfig } from './notifier.js';
import { FailureRecord } from './types.js';

/**
 * Service configuration
 */
export interface MonitorServiceConfig {
  /** Monitor configuration */
  monitor: MonitorConfig;

  /** Notifier configuration */
  notifier: NotifierConfig;

  /** State manager root directory (optional) */
  rootDir?: string;

  /** Auto-notify on failure detection */
  autoNotify?: boolean;
}

/**
 * Service status
 */
export interface ServiceStatus {
  /** Is service running */
  running: boolean;

  /** Monitor uptime (milliseconds) */
  uptime: number;

  /** Total failures detected */
  totalFailures: number;

  /** Unprocessed failures */
  unprocessedFailures: number;

  /** Last poll timestamp */
  lastPoll: string | null;
}

/**
 * MonitorService - Orchestrates CI/CD monitoring components
 *
 * Coordinates WorkflowMonitor, StateManager, and Notifier for
 * automatic failure detection and notification.
 */
export class MonitorService {
  private readonly config: Required<MonitorServiceConfig>;
  private readonly monitor: WorkflowMonitor;
  private readonly stateManager: StateManager;
  private readonly notifier: Notifier;
  private startTime: number | null = null;

  /**
   * Create monitor service
   */
  constructor(config: MonitorServiceConfig) {
    this.config = {
      ...config,
      rootDir: config.rootDir ?? process.cwd(),
      autoNotify: config.autoNotify ?? true
    };

    this.stateManager = new StateManager(this.config.rootDir);
    this.notifier = new Notifier(this.config.notifier);
    this.monitor = new WorkflowMonitor(this.config.monitor, this.stateManager);
  }

  /**
   * Start service
   */
  async start(): Promise<void> {
    if (this.monitor.isRunning()) {
      throw new Error('Service already running');
    }

    console.log('Starting CI/CD Monitor Service...');
    this.startTime = Date.now();
    this.monitor.start();

    console.log('Service started');
    console.log(`  Repository: ${this.config.monitor.owner}/${this.config.monitor.repo}`);
    console.log(`  Poll interval: ${this.config.monitor.pollInterval}ms`);
    console.log(`  Notifications: ${this.config.notifier.channels.join(', ')}`);
  }

  /**
   * Stop service
   */
  async stop(): Promise<void> {
    if (!this.monitor.isRunning()) {
      throw new Error('Service not running');
    }

    console.log('Stopping CI/CD Monitor Service...');
    this.monitor.stop();
    this.startTime = null;
    console.log('Service stopped');
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<ServiceStatus> {
    const state = await this.stateManager.loadState();
    const unprocessed = await this.stateManager.getUnprocessedFailures();

    return {
      running: this.monitor.isRunning(),
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      totalFailures: state.totalFailures,
      unprocessedFailures: unprocessed.length,
      lastPoll: state.lastPoll
    };
  }

  /**
   * Check for new failures and send notifications
   */
  private async checkForNewFailures(): Promise<void> {
    const unprocessed = await this.stateManager.getUnprocessedFailures();

    for (const failure of unprocessed) {
      // Send notification
      await this.notifier.notifyFailureDetected(failure);

      // Mark as processed (notification sent)
      await this.stateManager.markProcessed(failure.runId);
    }
  }

  /**
   * Manually trigger notification for a failure
   *
   * @param runId - Workflow run ID
   */
  async notifyFailure(runId: number): Promise<void> {
    const state = await this.stateManager.loadState();
    const failure = state.failures[runId];

    if (!failure) {
      throw new Error(`Failure not found: ${runId}`);
    }

    await this.notifier.notifyFailureDetected(failure);
  }

  /**
   * Get all unprocessed failures
   */
  async getUnprocessedFailures(): Promise<FailureRecord[]> {
    return this.stateManager.getUnprocessedFailures();
  }

  /**
   * Mark failure as processed
   */
  async markProcessed(runId: number): Promise<void> {
    await this.stateManager.markProcessed(runId);
  }
}
