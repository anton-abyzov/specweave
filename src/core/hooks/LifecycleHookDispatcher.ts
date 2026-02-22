/**
 * Lifecycle Hook Dispatcher
 *
 * Reads hooks config from config.json and dispatches configured actions
 * at lifecycle points (increment planned, task completed, increment done).
 *
 * All dispatches are:
 * - Non-blocking (fire-and-forget async)
 * - Error-isolated (catch + log, never crash)
 * - Skipped in test environment (process.env.VITEST)
 *
 * Part of increment 0298: Hook Lifecycle Wiring
 */

import { ConfigManager } from '../config/config-manager.js';
import type { HookConfiguration } from '../config/types.js';

/**
 * Options for dispatch methods (internal use)
 */
export interface DispatchOptions {
  /** Bypass the test environment guard (for unit testing the dispatcher itself) */
  _bypassTestGuard?: boolean;
}

/**
 * Dispatches configured actions at lifecycle hook points.
 *
 * All dispatches are error-isolated (catch + log, never crash).
 * onIncrementDone is awaited by completeIncrement() for reliable post-closure sync.
 */
export class LifecycleHookDispatcher {
  /**
   * Dispatch post-increment-planning hooks.
   *
   * Checks hooks.post_increment_planning.auto_create_github_issue
   * and calls autoCreateExternalIssue if true.
   */
  static async onIncrementPlanned(
    projectRoot: string,
    incrementId: string,
    options: DispatchOptions = {},
  ): Promise<void> {
    if (LifecycleHookDispatcher.shouldSkip(options)) return;

    try {
      const hooks = await LifecycleHookDispatcher.readHooksConfig(projectRoot);
      const planningConfig = hooks?.post_increment_planning;
      if (!planningConfig) return;

      // Living docs sync FIRST (creates us-*.md files for proper sync pipeline)
      if (planningConfig.sync_living_docs) {
        try {
          const { LivingDocsSync } = await import(
            '../living-docs/living-docs-sync.js'
          );
          const sync = new LivingDocsSync(projectRoot);
          await sync.syncIncrement(incrementId);
        } catch (error) {
          // Living docs failure should not block external issue creation
          LifecycleHookDispatcher.logError('onIncrementPlanned:livingDocs', error);
        }
      }

      // External issue auto-creation SECOND
      if (planningConfig.auto_create_github_issue) {
        const { autoCreateExternalIssue } = await import(
          '../../sync/external-issue-auto-creator.js'
        );
        await autoCreateExternalIssue(projectRoot, incrementId);
      }
    } catch (error) {
      LifecycleHookDispatcher.logError('onIncrementPlanned', error);
    }
  }

  /**
   * Dispatch post-task-completion hooks.
   *
   * Checks hooks.post_task_completion for:
   * - sync_tasks_md: triggers LivingDocsSync.syncIncrement
   * - external_tracker_sync: triggers SyncCoordinator.syncIncrementClosure
   */
  static async onTaskCompleted(
    projectRoot: string,
    incrementId: string,
    options: DispatchOptions = {},
  ): Promise<void> {
    if (LifecycleHookDispatcher.shouldSkip(options)) return;

    try {
      const hooks = await LifecycleHookDispatcher.readHooksConfig(projectRoot);
      const taskConfig = hooks?.post_task_completion;
      if (!taskConfig) return;

      if (taskConfig.sync_tasks_md) {
        const { LivingDocsSync } = await import(
          '../living-docs/living-docs-sync.js'
        );
        const sync = new LivingDocsSync(projectRoot);
        await sync.syncIncrement(incrementId);
      }

      if (taskConfig.external_tracker_sync) {
        const { SyncCoordinator } = await import(
          '../../sync/sync-coordinator.js'
        );
        const coordinator = new SyncCoordinator({
          projectRoot,
          incrementId,
        });
        await coordinator.syncIncrementClosure();
      }
    } catch (error) {
      LifecycleHookDispatcher.logError('onTaskCompleted', error);
    }
  }

  /**
   * Dispatch post-increment-done hooks.
   *
   * Checks hooks.post_increment_done for:
   * - sync_living_docs: triggers LivingDocsSync.syncIncrement
   * - sync_to_github_project: triggers GitHubFeatureSync for the increment's feature
   * - close_github_issue: triggers SyncCoordinator.syncIncrementClosure
   * - update_living_docs_first: if true, living docs sync runs before closure
   */
  static async onIncrementDone(
    projectRoot: string,
    incrementId: string,
    options: DispatchOptions = {},
  ): Promise<void> {
    if (LifecycleHookDispatcher.shouldSkip(options)) return;

    try {
      const hooks = await LifecycleHookDispatcher.readHooksConfig(projectRoot);
      const doneConfig = hooks?.post_increment_done;
      if (!doneConfig) return;

      const shouldSyncLivingDocs = doneConfig.sync_living_docs === true;
      const shouldSyncGitHubProject = doneConfig.sync_to_github_project === true;
      const shouldCloseIssue = doneConfig.close_github_issue === true;
      const docsFirst = doneConfig.update_living_docs_first === true;

      const syncLivingDocs = async () => {
        if (!shouldSyncLivingDocs) return;
        const { LivingDocsSync } = await import(
          '../living-docs/living-docs-sync.js'
        );
        const sync = new LivingDocsSync(projectRoot);
        await sync.syncIncrement(incrementId);
      };

      const syncGitHubProject = async () => {
        if (!shouldSyncGitHubProject) return;
        try {
          const { resolveFeatureId } = await import('./feature-id-resolver.js');
          const featureId = await resolveFeatureId(projectRoot, incrementId);
          if (!featureId) return;

          const { syncFeatureToGitHub } = await import(
            './github-project-sync.js'
          );
          await syncFeatureToGitHub(projectRoot, featureId);
        } catch (error) {
          // GitHub plugin may not be installed — log and continue
          LifecycleHookDispatcher.logError('onIncrementDone:githubProject', error);
        }
      };

      const syncClosure = async () => {
        if (!shouldCloseIssue) return;
        const { SyncCoordinator } = await import(
          '../../sync/sync-coordinator.js'
        );
        const coordinator = new SyncCoordinator({
          projectRoot,
          incrementId,
        });
        await coordinator.syncIncrementClosure();
      };

      if (docsFirst && shouldSyncLivingDocs) {
        // Sequential: living docs first, then closure + github project
        await syncLivingDocs();
        await Promise.all([syncClosure(), syncGitHubProject()]);
      } else {
        // Parallel: all three
        await Promise.all([syncLivingDocs(), syncClosure(), syncGitHubProject()]);
      }
    } catch (error) {
      LifecycleHookDispatcher.logError('onIncrementDone', error);
    }
  }

  /**
   * Check if dispatch should be skipped (test environment guard)
   */
  private static shouldSkip(options: DispatchOptions): boolean {
    // Allow tests to bypass the guard to test the dispatcher itself
    if (options._bypassTestGuard === true) return false;

    // Skip in test environment
    if (process.env.VITEST || process.env.NODE_ENV === 'test') return true;

    return false;
  }

  /**
   * Read hooks configuration from config.json
   */
  private static async readHooksConfig(
    projectRoot: string,
  ): Promise<HookConfiguration | undefined> {
    const configManager = new ConfigManager(projectRoot);
    const config = await configManager.read();
    return config.hooks;
  }

  /**
   * Log error without propagating
   */
  private static logError(method: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    // Use stderr to avoid polluting stdout
    process.stderr.write(
      `[LifecycleHookDispatcher.${method}] Hook dispatch error: ${message}\n`,
    );
  }
}
