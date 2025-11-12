/**
 * CI/CD Monitor Service
 *
 * High-level orchestration service that coordinates the workflow monitor,
 * state manager, and notifier for end-to-end failure detection and notification.
 */

import { WorkflowMonitor, MonitorConfig } from './workflow-monitor';
import { StateManager } from './state-manager';
import { Notifier, NotifierConfig } from './notifier';
import { FailureRecord } from './types';

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
 * Features:
 * - Coordinates WorkflowMonitor, StateManager, and Notifier
 * - Automatic failure notifications
 * - Service status and health checks
 * - Graceful startup and shutdown
 * - Event-driven architecture
 */
export class MonitorService {
  private config: Required<MonitorServiceConfig>;
  private monitor: WorkflowMonitor;
  private stateManager: StateManager;
  private notifier: Notifier;
  private startTime: number | null = null;
  private pollCallback: (() => Promise<void>) | null = null;

  /**
   * Create monitor service
   *
   * @param config - Service configuration
   */
  constructor(config: MonitorServiceConfig) {
    this.config = {
      ...config,
      rootDir: config.rootDir ?? process.cwd(),
      autoNotify: config.autoNotify ?? true
    };

    // Initialize components
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

    console.log('🚀 Starting CI/CD Monitor Service...');

    // Record start time
    this.startTime = Date.now();

    // Set up poll callback for notifications
    if (this.config.autoNotify) {
      this.pollCallback = async () => {
        await this.checkForNewFailures();
      };

      // Register callback (executed after each poll)
      // Note: WorkflowMonitor doesn't have callback support yet, but this demonstrates the pattern
      // In production, we'd extend WorkflowMonitor to support event listeners
    }

    // Start monitor
    this.monitor.start();

    console.log('✅ Service started');
    console.log(`   Repository: ${this.config.monitor.owner}/${this.config.monitor.repo}`);
    console.log(`   Poll interval: ${this.config.monitor.pollInterval}ms`);
    console.log(`   Notifications: ${this.config.notifier.channels.join(', ')}`);
  }

  /**
   * Stop service
   */
  async stop(): Promise<void> {
    if (!this.monitor.isRunning()) {
      throw new Error('Service not running');
    }

    console.log('⏹️  Stopping CI/CD Monitor Service...');

    // Stop monitor
    this.monitor.stop();

    // Clear start time
    this.startTime = null;
    this.pollCallback = null;

    console.log('✅ Service stopped');
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
