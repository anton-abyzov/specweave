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
 * Result from onIncrementDone with sync status details.
 * Callers can inspect this to display sync outcome to the user.
 */
export interface IncrementDoneResult {
  syncErrors: string[];
  syncSuccess: string[];
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

      // (0348) GitHub issue creation now handled by LivingDocsSync → GitHubFeatureSync.
      // If auto_create_github_issue is set but sync_living_docs wasn't, ensure living docs sync runs.
      if (planningConfig.auto_create_github_issue && !planningConfig.sync_living_docs) {
        try {
          const { LivingDocsSync } = await import(
            '../living-docs/living-docs-sync.js'
          );
          const sync = new LivingDocsSync(projectRoot);
          await sync.syncIncrement(incrementId);
        } catch (error) {
          LifecycleHookDispatcher.logError('onIncrementPlanned:autoCreateFallback', error);
        }
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

      // (0348) external_tracker_sync now routes through LivingDocsSync → GitHubFeatureSync
      // for GitHub. JIRA/ADO still handled by SyncCoordinator for non-GitHub closure.
      if (taskConfig.external_tracker_sync) {
        // Ensure living docs sync runs (which chains to GitHub via GitHubFeatureSync)
        if (!taskConfig.sync_tasks_md) {
          try {
            const { LivingDocsSync } = await import(
              '../living-docs/living-docs-sync.js'
            );
            const sync = new LivingDocsSync(projectRoot);
            await sync.syncIncrement(incrementId);
          } catch (error) {
            LifecycleHookDispatcher.logError('onTaskCompleted:livingDocsFallback', error);
          }
        }
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
  ): Promise<IncrementDoneResult> {
    const result: IncrementDoneResult = { syncErrors: [], syncSuccess: [] };

    if (LifecycleHookDispatcher.shouldSkip(options)) return result;

    try {
      const hooks = await LifecycleHookDispatcher.readHooksConfig(projectRoot);
      const doneConfig = hooks?.post_increment_done;
      if (!doneConfig) return result;

      const shouldSyncLivingDocs = doneConfig.sync_living_docs === true;
      const shouldSyncGitHubProject = doneConfig.sync_to_github_project === true;
      // v1.0.357: Support closing issues for ALL providers (JIRA/ADO/GitHub)
      // close_github_issue is the legacy flag; close_external_issue is the new generic one.
      // SyncCoordinator handles ALL providers despite the legacy flag name.
      const shouldCloseIssue = doneConfig.close_github_issue === true
        || doneConfig.close_external_issue === true
        || doneConfig.close_jira_issue === true;

      // STEP 1: Living docs sync MUST run first.
      // It updates living docs files AND chains to GitHub via syncToExternalTools().
      // GitHubFeatureSync has a 30s sync lock, so running GitHub sync in parallel
      // would cause a race condition where stale data wins.
      if (shouldSyncLivingDocs) {
        try {
          const { LivingDocsSync } = await import(
            '../living-docs/living-docs-sync.js'
          );
          const sync = new LivingDocsSync(projectRoot);
          const syncResult = await sync.syncIncrement(incrementId);
          result.syncSuccess.push('Living docs synced');

          // STEP 1b: Update cross-references in existing docs after feature specs are created.
          // This ensures FEATURE-CATALOG, module docs, and specs README contain links
          // to the newly created feature spec files. Without this, the link update is
          // deferred to the AI skill step (sw:docs-updater) which may not always run.
          if (syncResult.success && syncResult.featureId) {
            try {
              await LifecycleHookDispatcher.updateDocsLinks(
                projectRoot,
                syncResult.featureId,
                sync.getProjectId(),
              );
              result.syncSuccess.push('Docs links updated');
            } catch (linkError) {
              const linkMsg = linkError instanceof Error ? linkError.message : String(linkError);
              result.syncErrors.push(`Docs link update failed: ${linkMsg}`);
              LifecycleHookDispatcher.logError('onIncrementDone:docsLinks', linkError);
            }
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          result.syncErrors.push(`Living docs sync failed: ${msg}`);
          LifecycleHookDispatcher.logError('onIncrementDone:livingDocs', error);
        }
      }

      // STEP 2: After living docs are updated, run closure and direct GitHub sync in parallel.
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
          result.syncSuccess.push('GitHub project synced');
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          result.syncErrors.push(`GitHub project sync failed: ${msg}`);
          LifecycleHookDispatcher.logError('onIncrementDone:githubProject', error);
        }
      };

      // SyncCoordinator only handles JIRA/ADO closure (GitHub handled by step 1)
      const syncClosure = async () => {
        if (!shouldCloseIssue) return;
        try {
          const { SyncCoordinator } = await import(
            '../../sync/sync-coordinator.js'
          );
          const coordinator = new SyncCoordinator({
            projectRoot,
            incrementId,
          });
          await coordinator.syncIncrementClosure();
          result.syncSuccess.push('Closure sync completed');
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          result.syncErrors.push(`Closure sync failed: ${msg}`);
          LifecycleHookDispatcher.logError('onIncrementDone:closure', error);
        }
      };

      await Promise.all([syncClosure(), syncGitHubProject()]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.syncErrors.push(`Hook dispatch failed: ${msg}`);
      LifecycleHookDispatcher.logError('onIncrementDone', error);
    }

    return result;
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
   * Update cross-references in existing living docs after feature specs are created.
   *
   * Lightweight post-sync step that:
   * 1. Updates specs/{project}/README.md with links to the new FS-XXX folder
   * 2. Logs verification of FEATURE.md existence
   *
   * This runs automatically so the link update doesn't depend on the AI skill step.
   */
  private static async updateDocsLinks(
    projectRoot: string,
    featureId: string,
    projectId: string,
  ): Promise<void> {
    const { existsSync, promises: fs } = await import('fs');
    const path = await import('path');

    const specsDir = path.join(
      projectRoot,
      '.specweave/docs/internal/specs',
      projectId,
    );
    const featureDir = path.join(specsDir, featureId);
    const featureFile = path.join(featureDir, 'FEATURE.md');

    // Verify feature spec was actually created
    if (!existsSync(featureFile)) {
      process.stderr.write(
        `[LifecycleHookDispatcher.updateDocsLinks] Feature spec missing: ${featureFile}\n`,
      );
      return;
    }

    // Read feature title from FEATURE.md first line (# Title)
    let featureTitle = featureId;
    try {
      const content = await fs.readFile(featureFile, 'utf-8');
      const titleMatch = content.match(/^#\s+(.+)/m);
      if (titleMatch) {
        featureTitle = titleMatch[1].replace(/\s*\(FS-\d+\)/, '').trim();
      }
    } catch {
      // Use featureId as fallback title
    }

    // Update specs/{project}/README.md with link to the new feature
    const readmePath = path.join(specsDir, 'README.md');
    if (existsSync(readmePath)) {
      try {
        let readme = await fs.readFile(readmePath, 'utf-8');
        const featureLink = `- [${featureId}: ${featureTitle}](${featureId}/FEATURE.md)`;

        // Check if this feature is already linked
        if (!readme.includes(`${featureId}/FEATURE.md`)) {
          // Find or create the feature list section
          if (readme.includes('## Active Features')) {
            // Append to existing section
            readme = readme.replace(
              /(## Active Features\n(?:[\s\S]*?))((?:\n## |\n---|\Z))/,
              `$1${featureLink}\n$2`,
            );
          } else {
            // Add section before the footer or at end
            const footerIdx = readme.lastIndexOf('\n---\n');
            const section = `\n## Active Features\n\n${featureLink}\n`;
            if (footerIdx !== -1) {
              readme =
                readme.substring(0, footerIdx) +
                section +
                readme.substring(footerIdx);
            } else {
              readme += section;
            }
          }
          await fs.writeFile(readmePath, readme, 'utf-8');
        }
      } catch (readmeError) {
        // Non-fatal: README update is best-effort
        const msg = readmeError instanceof Error ? readmeError.message : String(readmeError);
        process.stderr.write(
          `[LifecycleHookDispatcher.updateDocsLinks] README update warning: ${msg}\n`,
        );
      }
    }
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
