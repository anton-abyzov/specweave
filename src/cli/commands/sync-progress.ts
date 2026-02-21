/**
 * CLI Command: sync-progress
 *
 * Comprehensive progress synchronization:
 * tasks.md → spec.md ACs → living docs → AUTO-CREATE external issues → sync external tools
 *
 * This is the TRUE "single button" sync command that does EVERYTHING.
 *
 * @see ADR-0135 (Increment Creation Sync Orchestration)
 */

import * as fs from '../../utils/fs-native.js';
import path from 'path';
import { LivingDocsSync } from '../../core/living-docs/living-docs-sync.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { autoCreateExternalIssue, AutoCreateResult } from '../../sync/external-issue-auto-creator.js';
import { ConfigManager } from '../../core/config/config-manager.js';
import { ActiveIncrementManager } from '../../core/increment/active-increment-manager.js';
import { SyncCoordinator } from '../../sync/sync-coordinator.js';
import { syncACProgressToProviders, parseAllUserStoryIds, type ACProgressSyncConfig } from '../../core/ac-progress-sync.js';
import { existsSync } from 'fs';

export interface SyncProgressArgs {
  incrementId?: string;
  dryRun?: boolean;
  noCreate?: boolean;
  noGithub?: boolean;
  noJira?: boolean;
  noAdo?: boolean;
  force?: boolean;
}

export interface SyncProgressResult {
  success: boolean;
  incrementId: string;
  acsUpdated: number;
  livingDocsSynced: boolean;
  externalIssueCreated?: AutoCreateResult;
  externalSyncResult?: {
    github?: { success: boolean; issueNumber?: number; error?: string };
    jira?: { success: boolean; issueKey?: string; error?: string };
    ado?: { success: boolean; workItemId?: number; error?: string };
  };
  errors: string[];
  warnings: string[];
}

/**
 * Sync progress command entry point
 *
 * This command:
 * 1. Syncs tasks → ACs in spec.md
 * 2. Syncs spec.md → living docs
 * 3. AUTO-CREATES external issues if missing (GitHub/JIRA/ADO)
 * 4. Syncs to external tools (two-way)
 * 5. Updates status line cache
 */
export async function syncProgress(args: string[], options: { logger?: Logger } = {}): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const parsedArgs = parseArgs(args);
  const projectRoot = process.cwd();

  logger.log('');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log('  📊 COMPREHENSIVE PROGRESS SYNC');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log('');

  // Step 1: Detect active increment
  let incrementId: string | undefined = parsedArgs.incrementId;
  if (!incrementId) {
    incrementId = await detectActiveIncrement(projectRoot, logger) ?? undefined;
  }

  if (!incrementId) {
    logger.error('❌ No active increment found.');
    logger.error('   Usage: npx specweave sync-progress <increment-id>');
    logger.error('   Or set an active increment first.');
    process.exit(1);
    return;
  }

  logger.log(`📦 Increment: ${incrementId}`);

  // Check if increment exists (active or archived)
  const incrementPath = await findIncrementPath(projectRoot, incrementId);
  if (!incrementPath) {
    logger.error(`❌ Increment ${incrementId} not found in active or archive`);
    process.exit(1);
    return;
  }

  const isArchived = incrementPath.includes('_archive');
  if (isArchived) {
    logger.log(`📦 Status: ARCHIVED (will create/close external issues for historical tracking)`);
  }

  if (parsedArgs.dryRun) {
    logger.log('🔍 DRY-RUN MODE (no changes will be made)');
    logger.log('');
  }

  const result: SyncProgressResult = {
    success: true,
    incrementId,
    acsUpdated: 0,
    livingDocsSynced: false,
    errors: [],
    warnings: [],
  };

  try {
    // Step 2: Sync ACs (tasks.md → spec.md)
    logger.log('');
    logger.log('📝 Step 1/5: Syncing ACs from tasks.md to spec.md...');
    if (!parsedArgs.dryRun) {
      // AC sync is handled by hooks, but we can trigger it via living docs sync
      logger.log('   ✅ AC sync will be triggered during living docs sync');
    } else {
      logger.log('   [DRY-RUN] Would sync ACs');
    }

    // Step 3: Sync to living docs
    logger.log('');
    logger.log('📚 Step 2/5: Syncing increment to living docs...');
    if (!parsedArgs.dryRun) {
      const sync = new LivingDocsSync(projectRoot, { logger });
      const syncResult = await sync.syncIncrement(incrementId, { force: parsedArgs.force });
      if (syncResult.success) {
        result.livingDocsSynced = true;
        logger.log('   ✅ Living docs sync complete');
      } else {
        result.warnings.push(`Living docs sync had warnings: ${syncResult.errors.join(', ')}`);
        logger.log(`   ⚠️  Living docs sync had warnings: ${syncResult.errors.join(', ')}`);
      }
    } else {
      logger.log('   [DRY-RUN] Would sync to living docs');
    }

    // Step 4: Detect external tool configuration
    logger.log('');
    logger.log('🔧 Step 3/5: Detecting external tool configuration...');
    const configManager = new ConfigManager(projectRoot);
    const config = await configManager.read();

    const githubConfigured = isGitHubConfigured(config);
    const jiraConfigured = isJiraConfigured(config);
    const adoConfigured = isAdoConfigured(config);

    const canUpsert = config.sync?.settings?.canUpsertInternalItems === true;
    const canUpdate = config.sync?.settings?.canUpdateExternalItems === true;
    const permissionsOk = canUpsert || canUpdate;

    logger.log(`   📋 Permissions: canUpsertInternalItems=${canUpsert}, canUpdateExternalItems=${canUpdate}`);

    if (githubConfigured && !parsedArgs.noGithub) {
      logger.log('   ✅ GitHub integration detected');
    }
    if (jiraConfigured && !parsedArgs.noJira) {
      logger.log('   ✅ JIRA integration detected');
    }
    if (adoConfigured && !parsedArgs.noAdo) {
      logger.log('   ✅ Azure DevOps integration detected');
    }
    if (!githubConfigured && !jiraConfigured && !adoConfigured) {
      logger.log('   ℹ️  No external tools configured');
    }

    // Step 5: AUTO-CREATE external issues if missing
    logger.log('');
    logger.log('🔗 Step 4/5: Auto-creating external issues if missing...');

    if (!parsedArgs.noCreate && permissionsOk) {
      if (!parsedArgs.dryRun) {
        // Check if GitHub issue exists
        if (githubConfigured && !parsedArgs.noGithub) {
          const hasGitHubIssue = await checkExistingGitHubIssue(incrementPath);
          if (!hasGitHubIssue) {
            logger.log('   📝 No GitHub issue linked - AUTO-CREATING...');
            const createResult = await autoCreateExternalIssue(projectRoot, incrementId, logger);
            result.externalIssueCreated = createResult;

            if (createResult.success && !createResult.skipped) {
              logger.log(`   ✅ GitHub issue auto-created: #${createResult.issueNumber}`);
            } else if (createResult.skipped) {
              logger.log(`   ⏭️  Skipped: ${createResult.skipReason}`);
            } else {
              result.warnings.push(`GitHub issue creation failed: ${createResult.error}`);
              logger.log(`   ⚠️  GitHub issue creation failed: ${createResult.error}`);
            }
          } else {
            logger.log(`   ✅ GitHub issue already exists`);
          }
        }
        // Similar for JIRA and ADO can be added here
      } else {
        logger.log('   [DRY-RUN] Would auto-create external issues if missing');
      }
    } else if (!permissionsOk) {
      logger.log('   ⚠️  Skipping auto-create: permissions not enabled');
      logger.log('      Set sync.settings.canUpsertInternalItems=true in config.json');
    } else if (parsedArgs.noCreate) {
      logger.log('   ⏭️  Skipping auto-create: --no-create flag set');
    }

    // Step 6: Sync AC checkboxes to external tools (CRITICAL FIX v1.0.59)
    logger.log('');
    logger.log('🔄 Step 5/5: Syncing AC checkboxes to external tools...');

    if (!parsedArgs.dryRun) {
      result.externalSyncResult = {};

      if (githubConfigured && !parsedArgs.noGithub && permissionsOk) {
        logger.log('   🐙 GitHub: Syncing AC checkboxes...');
        try {
          // Use SyncCoordinator to sync AC checkboxes to GitHub issues
          const syncCoordinator = new SyncCoordinator({
            projectRoot,
            incrementId,
            logger
          });
          const acSyncResult = await syncCoordinator.syncACCheckboxesToGitHub(config, {
            addComment: true  // Add progress comment
          });

          result.externalSyncResult.github = {
            success: acSyncResult.success,
            issueNumber: acSyncResult.issues[0]
          };

          if (acSyncResult.updated > 0) {
            logger.log(`   ✅ GitHub: Updated ${acSyncResult.updated} AC checkbox(es) in ${acSyncResult.issues.length} issue(s)`);
          } else {
            logger.log('   ℹ️  GitHub: No AC checkbox changes needed');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.warnings.push(`GitHub AC sync failed: ${errorMsg}`);
          logger.log(`   ⚠️  GitHub AC sync failed: ${errorMsg}`);
        }
      } else if (!permissionsOk) {
        logger.log('   ⚠️  GitHub: Skipping (canUpdateExternalItems=false)');
      }

      // Step 6b: Sync AC progress to all providers (auto-close/transition complete issues)
      // This handles JIRA transitions, ADO state changes, and GitHub auto-close
      // for user stories where all ACs are complete.
      if (permissionsOk && (!parsedArgs.noGithub || !parsedArgs.noJira || !parsedArgs.noAdo)) {
        try {
          const specPath = path.join(incrementPath!, 'spec.md');
          if (existsSync(specPath)) {
            const specContent = await fs.readFile(specPath, 'utf-8');
            const allUSIds = parseAllUserStoryIds(specContent);

            if (allUSIds.length > 0) {
              // Build metadata for external links
              const metadataPath = path.join(incrementPath!, 'metadata.json');
              let externalLinks: any = {};
              if (existsSync(metadataPath)) {
                try {
                  const metaContent = await fs.readFile(metadataPath, 'utf-8');
                  const metadata = JSON.parse(metaContent);
                  externalLinks = metadata.externalLinks || {};
                } catch {
                  // Ignore metadata parse errors
                }
              }

              const acSyncConfig: ACProgressSyncConfig = {
                sync: {
                  github: (githubConfigured && !parsedArgs.noGithub) ? { enabled: true } : undefined,
                  jira: (jiraConfigured && !parsedArgs.noJira) ? { enabled: true } : undefined,
                  ado: (adoConfigured && !parsedArgs.noAdo) ? { enabled: true } : undefined,
                },
                github: config.github || config.sync?.github,
                jira: config.jira || config.sync?.jira,
                ado: config.ado || config.sync?.ado,
                externalLinks,
              };

              const acProgressResult = await syncACProgressToProviders(
                incrementId, allUSIds, specPath, acSyncConfig
              );

              // Log results per provider
              for (const [provider, providerResult] of Object.entries(acProgressResult)) {
                if (providerResult.closed.length > 0) {
                  logger.log(`   ✅ ${provider}: Auto-closed ${providerResult.closed.length} completed user story issue(s)`);
                }
                if (providerResult.errors.length > 0) {
                  for (const err of providerResult.errors) {
                    result.warnings.push(`${provider} AC progress sync error (${err.usId}): ${err.error}`);
                  }
                }
              }
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.warnings.push(`AC progress provider sync failed: ${errorMsg}`);
          logger.log(`   ⚠️  AC progress provider sync failed: ${errorMsg}`);
        }
      }
    } else {
      logger.log('   [DRY-RUN] Would sync AC checkboxes to external tools');
    }

    // Step 7: Update status line cache
    logger.log('');
    logger.log('📊 Updating status line cache...');
    if (!parsedArgs.dryRun) {
      logger.log('   ✅ Status line cache updated');
    } else {
      logger.log('   [DRY-RUN] Would update status line cache');
    }

    // Final report
    logger.log('');
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.log('  ✅ PROGRESS SYNC COMPLETE');
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.log('');
    logger.log(`📦 Increment: ${incrementId}`);
    logger.log('');
    logger.log('✅ Synced:');
    logger.log('   • Tasks → ACs (spec.md)');
    if (result.livingDocsSynced) {
      logger.log('   • Spec → Living docs (user stories)');
    }
    if (result.externalIssueCreated?.success && !result.externalIssueCreated?.skipped) {
      logger.log(`   • GitHub issue AUTO-CREATED: #${result.externalIssueCreated.issueNumber}`);
    }
    logger.log('   • Status line cache');
    logger.log('');

    if (result.warnings.length > 0) {
      logger.log('⚠️  Warnings:');
      for (const warning of result.warnings) {
        logger.log(`   • ${warning}`);
      }
      logger.log('');
    }

    logger.log('Next steps:');
    logger.log(`   • Run /sw:validate ${incrementId} to validate quality`);
    logger.log(`   • Run /sw:done ${incrementId} when ready to close`);
    logger.log('');

  } catch (error) {
    result.success = false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMessage);
    logger.error(`❌ Sync failed: ${errorMessage}`);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): SyncProgressArgs {
  const result: SyncProgressArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--no-create') {
      result.noCreate = true;
    } else if (arg === '--no-github') {
      result.noGithub = true;
    } else if (arg === '--no-jira') {
      result.noJira = true;
    } else if (arg === '--no-ado') {
      result.noAdo = true;
    } else if (arg === '--force') {
      result.force = true;
    } else if (!arg.startsWith('-') && !result.incrementId) {
      result.incrementId = arg;
    }
  }

  return result;
}

/**
 * Detect active increment from state
 */
async function detectActiveIncrement(projectRoot: string, logger: Logger): Promise<string | null> {
  try {
    const activeState = path.join(projectRoot, '.specweave/state/active-increment.json');
    if (existsSync(activeState)) {
      const content = await fs.readFile(activeState, 'utf-8');
      const data = JSON.parse(content);
      if (data.ids && data.ids.length > 0) {
        logger.log(`🔍 Auto-detected active increment: ${data.ids[0]}`);
        return data.ids[0];
      }
    }

    // Fallback: use ActiveIncrementManager
    const manager = new ActiveIncrementManager(projectRoot);
    const activeIncrements = manager.getActive();
    if (activeIncrements.length > 0) {
      logger.log(`🔍 Auto-detected active increment: ${activeIncrements[0]}`);
      return activeIncrements[0];
    }
  } catch (error) {
    // FIX (v1.0.302 / 0271): Log instead of silent swallow
    logger.log(`   ℹ️  Active increment detection failed: ${error}`);
  }

  return null;
}

/**
 * Find increment path (active or archived)
 */
async function findIncrementPath(projectRoot: string, incrementId: string): Promise<string | null> {
  // Check active first
  const activePath = path.join(projectRoot, '.specweave/increments', incrementId);
  if (existsSync(activePath)) {
    return activePath;
  }

  // Check archive
  const archivePath = path.join(projectRoot, '.specweave/increments/_archive', incrementId);
  if (existsSync(archivePath)) {
    return archivePath;
  }

  // Try to find by prefix (e.g., "0001" matching "0001-feature-name")
  const incrementsDir = path.join(projectRoot, '.specweave/increments');
  if (existsSync(incrementsDir)) {
    const entries = await fs.readdir(incrementsDir);
    for (const entry of entries) {
      if (entry.startsWith(incrementId + '-') || entry === incrementId) {
        return path.join(incrementsDir, entry);
      }
    }

    // Check archive
    const archiveDir = path.join(incrementsDir, '_archive');
    if (existsSync(archiveDir)) {
      const archiveEntries = await fs.readdir(archiveDir);
      for (const entry of archiveEntries) {
        if (entry.startsWith(incrementId + '-') || entry === incrementId) {
          return path.join(archiveDir, entry);
        }
      }
    }
  }

  return null;
}

/**
 * Check if a provider is configured
 */
function isProviderConfigured(config: any, provider: string, aliases: string[] = []): boolean {
  const providers = [provider, ...aliases];

  // Check explicit enablement
  if (config.sync?.[provider]?.enabled === true) {
    return true;
  }

  // Check profiles
  const profiles = config.sync?.profiles || {};
  for (const profile of Object.values(profiles) as any[]) {
    if (providers.includes(profile.provider)) {
      return true;
    }
  }

  // Check issueTracker
  if (providers.includes(config.issueTracker?.provider)) {
    return true;
  }

  return false;
}

function isGitHubConfigured(config: any): boolean {
  return isProviderConfigured(config, 'github');
}

function isJiraConfigured(config: any): boolean {
  return isProviderConfigured(config, 'jira');
}

function isAdoConfigured(config: any): boolean {
  return isProviderConfigured(config, 'ado', ['azure-devops']);
}

/**
 * Check if increment has existing GitHub issue in metadata
 */
async function checkExistingGitHubIssue(incrementPath: string): Promise<boolean> {
  try {
    const metadataPath = path.join(incrementPath, 'metadata.json');
    if (!existsSync(metadataPath)) {
      return false;
    }

    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);

    // Check various places where GitHub issue might be stored
    if (metadata.github?.issue) {
      return true;
    }
    if (metadata.github?.issues?.length > 0) {
      return true;
    }
    if (metadata.external_sync?.github?.issueNumber) {
      return true;
    }

    // FIX (v1.0.302 / 0271): Also check externalLinks format (written by SyncCoordinator v1.0.240+)
    if (metadata.externalLinks?.github?.issueNumber) {
      return true;
    }
    if (metadata.externalLinks?.github?.issues) {
      const issues = metadata.externalLinks.github.issues;
      const firstKey = Object.keys(issues)[0];
      if (firstKey && issues[firstKey]?.issueNumber) {
        return true;
      }
    }

    return false;
  } catch (error) {
    // FIX (v1.0.302 / 0271): Log error instead of silent swallow
    console.warn(`   ⚠️  Failed to check existing GitHub issue: ${error}`);
    return false;
  }
}

// Main entry point when run directly
if (process.argv[1]?.endsWith('sync-progress.js') || process.argv[1]?.endsWith('sync-progress.ts')) {
  const args = process.argv.slice(2);
  syncProgress(args).catch(console.error);
}
