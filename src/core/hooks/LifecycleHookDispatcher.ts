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

import { appendFileSync, mkdirSync } from 'fs';
import path from 'path';
import { ConfigManager } from '../config/config-manager.js';
import type { HookConfiguration, SpecWeaveConfig } from '../config/types.js';
import type { IncrementMetadataV2 } from '../types/increment-metadata.js';

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
   * 2.0: no-op. Kept so callers (create-increment) need no change.
   */
  static async onIncrementPlanned(
    _projectRoot: string,
    _incrementId: string,
    _options: DispatchOptions = {},
  ): Promise<void> {
    // 2.0: nothing runs at planning time. Living docs are `livingDocs: 'onDone'`
    // only, and external issues are created explicitly (`specweave sync push`).
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
    options: DispatchOptions & { taskId?: string } = {},
  ): Promise<void> {
    if (LifecycleHookDispatcher.shouldSkip(options)) return;

    try {
      const hooks = await LifecycleHookDispatcher.readHooksConfig(projectRoot);
      const taskConfig = hooks?.post_task_completion;
      if (!taskConfig) return;

      // AC Gate: determine if external sync should fire
      // Living docs sync always fires (internal, cheap). External sync only fires
      // when a NEW AC transitions from unchecked to fully satisfied.
      let skipExternalSync = false;
      if (options.taskId) {
        try {
          const { ACGate } = await import('../sync/ac-gate.js');
          const fs = await import('fs');
          const path = await import('path');

          const incDir = await LifecycleHookDispatcher.resolveIncrementDir(projectRoot, incrementId);
          const specPath = path.join(incDir, 'spec.md');
          const tasksPath = path.join(incDir, 'tasks.md');

          if (fs.existsSync(specPath) && fs.existsSync(tasksPath)) {
            const specContent = fs.readFileSync(specPath, 'utf-8');
            const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
            const gateResult = ACGate.shouldSyncExternal(specContent, tasksContent, options.taskId);
            skipExternalSync = !gateResult.shouldSync;
          }
        } catch (error) {
          // AC Gate failures should not block sync — fall through to sync
          LifecycleHookDispatcher.logError('onTaskCompleted:acGate', error);
        }
      }

      const syncOptions = skipExternalSync ? { skipExternalSync: true } : {};

      if (taskConfig.sync_tasks_md) {
        const { LivingDocsSync } = await import(
          '../living-docs/living-docs-sync.js'
        );
        const sync = new LivingDocsSync(projectRoot);
        await sync.syncIncrement(incrementId, syncOptions);
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
            await sync.syncIncrement(incrementId, syncOptions);
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
   * Living docs run when config `livingDocs` is 'onDone'.
   * Checks hooks.post_increment_done for:
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

      // NOTE: `hooks.post_increment_done` is a 1.x config key that 2.0 `init`
      // no longer writes. Returning early on its absence made `livingDocs:
      // 'onDone'` a dead setting in every 2.0 project. The config key itself is
      // now the switch; the hook block only adds the external-closure steps.
      // Global skip: autoSyncOnCompletion flag (defaults to true)
      // Living docs run only when `livingDocs: 'onDone'` (2.0 default: false).
      let autoSync = true;
      let livingDocs: SpecWeaveConfig['livingDocs'] = false;
      try {
        const configManager = new ConfigManager(projectRoot);
        const fullConfig = await configManager.read();
        autoSync = fullConfig.sync?.settings?.autoSyncOnCompletion ?? true;
        livingDocs = fullConfig.livingDocs ?? false;
      } catch {
        // Default: sync enabled, living docs off
      }

      // Per-increment skip: skipLivingDocsSync flag in metadata.json
      let perIncrementSkip = false;
      if (autoSync) {
        try {
          const { MetadataManager } = await import(
            '../increment/metadata-manager.js'
          );
          const metadata = MetadataManager.read(incrementId) as IncrementMetadataV2;
          if (metadata.skipLivingDocsSync === true) {
            perIncrementSkip = true;
          }
        } catch {
          // Metadata read failure shouldn't block — default: don't skip
        }
      }

      const shouldSyncLivingDocs = livingDocs === 'onDone' && autoSync && !perIncrementSkip;
      if (!doneConfig && !shouldSyncLivingDocs) return result;
      // v1.0.357 + 0696: Support closing issues for ALL providers (JIRA/ADO/GitHub).
      // close_github_issue is the legacy flag; close_external_issue is the new generic one.
      // SyncCoordinator.syncIncrementClosure() closes every enabled provider using a
      // four-source fallback for the issue key:
      //   1. per-US frontmatter external_tools.{jira.key|ado.id}
      //   2. per-US external_id
      //   3. metadata.{jira.issue | ado.work_item_id} (legacy)
      //   4. metadata.externalLinks.{jira.epicKey | ado.workItemId|featureId} (current standard)
      // Per-provider closure errors are pushed into the returned SyncResult.errors[]
      // and forwarded into result.syncErrors (and .specweave/logs/hooks.log) below.
      const shouldCloseIssue = doneConfig?.close_github_issue === true
        || doneConfig?.close_external_issue === true
        || doneConfig?.close_jira_issue === true;

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
          // deferred to the done step which may not always run.
          // Issue #1925: cross-project increments write specs under per-US project
          // paths, not the umbrella project id — loop over what the sync resolved.
          if (syncResult.success && syncResult.featureId) {
            try {
              const targets = syncResult.projectIds && syncResult.projectIds.length > 0
                ? syncResult.projectIds
                : [sync.getProjectId()];
              for (const target of targets) {
                await LifecycleHookDispatcher.updateDocsLinks(
                  projectRoot,
                  syncResult.featureId,
                  target,
                );
              }
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

      // STEP 2: Run closure sync for JIRA/ADO (GitHub already handled by Step 1 via LivingDocsSync).
      // 0696 hotfix: forward per-provider errors from SyncCoordinator into result.syncErrors
      // AND persist them to .specweave/logs/hooks.log via logError.
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
          const closureResult = await coordinator.syncIncrementClosure();
          result.syncSuccess.push('Closure sync completed');
          if (closureResult && Array.isArray(closureResult.errors) && closureResult.errors.length > 0) {
            for (const err of closureResult.errors) {
              result.syncErrors.push(err);
            }
            LifecycleHookDispatcher.logError(
              'onIncrementDone:closure',
              new Error(`Provider closure errors for ${incrementId}: ${closureResult.errors.join('; ')}`),
              projectRoot,
            );
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          result.syncErrors.push(`Closure sync failed: ${msg}`);
          LifecycleHookDispatcher.logError('onIncrementDone:closure', error, projectRoot);
        }
      };

      await syncClosure();

      // STEP 3: Drain retry queue for this increment before closure completes.
      // Failed syncs queued during the increment's lifetime get one final attempt.
      try {
        const { drainRetryQueueForIncrement } = await import(
          '../../cli/commands/sync-retry.js'
        );
        const drainResult = await drainRetryQueueForIncrement(
          projectRoot,
          incrementId,
        );
        if (drainResult.attempted > 0) {
          result.syncSuccess.push(
            `Retry queue drained: ${drainResult.succeeded}/${drainResult.attempted} succeeded`,
          );
        }
      } catch (error) {
        // Retry queue drain failure must not block closure
        const msg = error instanceof Error ? error.message : String(error);
        result.syncErrors.push(`Retry queue drain failed: ${msg}`);
        LifecycleHookDispatcher.logError('onIncrementDone:retryDrain', error);
      }

      // STEP 4: Signal collection + suggestion (non-blocking, error-isolated)
      // Detects recurring patterns from living docs and optionally suggests skill generation.
      // Respects skillGen.detection config — "off" skips entirely.
      try {
        const configPath = `${projectRoot}/.specweave/config.json`;
        let detection = 'on-close';
        try {
          const { readFile: rf } = await import('fs/promises');
          const cfg = JSON.parse(await rf(configPath, 'utf-8'));
          detection = cfg?.skillGen?.detection ?? 'on-close';
        } catch {
          // Config missing — use default
        }

        if (detection !== 'off') {
          const { SignalCollector } = await import('../skill-gen/signal-collector.js');
          const { SuggestionEngine } = await import('../skill-gen/suggestion-engine.js');

          const collector = new SignalCollector(projectRoot);
          await collector.collect(incrementId);

          const engine = new SuggestionEngine(projectRoot);
          await engine.evaluate();
        }
      } catch (error) {
        LifecycleHookDispatcher.logError('onIncrementDone:skillSignals', error);
      }
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
   * Resolve increment directory path from incrementId.
   * Handles both full IDs ("0499-feature") and short IDs ("0499").
   */
  private static async resolveIncrementDir(
    projectRoot: string,
    incrementId: string,
  ): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');

    const incBase = path.join(projectRoot, '.specweave', 'increments');

    // Try exact match first
    const exactPath = path.join(incBase, incrementId);
    if (fs.existsSync(exactPath)) return exactPath;

    // Try prefix match (e.g., "0499" → "0499-external-sync-resilience")
    const prefix = incrementId.match(/^\d+/)?.[0];
    if (prefix) {
      const entries = fs.readdirSync(incBase);
      const match = entries.find((e) => e.startsWith(prefix));
      if (match) return path.join(incBase, match);
    }

    return exactPath; // Fall through — caller checks existence
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
   * Log error without propagating.
   *
   * 0696 hotfix: when projectRoot is provided, also persist the error
   * (with full stack) to .specweave/logs/hooks.log. Both the directory
   * creation and the file append are wrapped in try/catch so a locked
   * filesystem or missing directory never blocks hook execution.
   */
  private static logError(method: string, error: unknown, projectRoot?: string): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error && error.stack ? error.stack : '';
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [LifecycleHookDispatcher.${method}] Hook dispatch error: ${message}`;

    // Always write to stderr first (backwards-compatible behavior).
    try {
      process.stderr.write(`${logLine}\n`);
    } catch {
      // Ignore stderr write failures (tests often replace streams).
    }

    // 0696: persist to .specweave/logs/hooks.log when projectRoot is known.
    if (!projectRoot) return;
    try {
      const logsDir = path.join(projectRoot, '.specweave', 'logs');
      try {
        mkdirSync(logsDir, { recursive: true });
      } catch {
        // Directory already exists or cannot be created — appendFileSync
        // will raise below if the path is truly unusable.
      }
      const logFile = path.join(logsDir, 'hooks.log');
      const payload = stack
        ? `${logLine}\n${stack}\n`
        : `${logLine}\n`;
      appendFileSync(logFile, payload, 'utf8');
    } catch (writeErr) {
      // Swallow-and-fallback: best-effort persistence must never throw.
      try {
        const m = writeErr instanceof Error ? writeErr.message : String(writeErr);
        process.stderr.write(
          `[LifecycleHookDispatcher.logError] hooks.log write failed: ${m}\n`,
        );
      } catch {
        // Truly give up.
      }
    }
  }
}
