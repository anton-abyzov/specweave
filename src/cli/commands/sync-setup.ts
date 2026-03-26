/**
 * sync-setup command
 *
 * Interactive terminal wizard to connect GitHub Issues, JIRA, or Azure DevOps.
 * This is the CLI counterpart of the sw:sync-setup Claude skill.
 *
 * Thin wrapper around the existing setupIssueTracker() helper which handles
 * all credential collection, validation, and config writing.
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import type { SupportedLanguage } from '../../core/i18n/types.js';
import { setupIssueTracker } from '../helpers/issue-tracker/index.js';
import type { RepositoryHosting } from '../helpers/issue-tracker/types.js';
import { runHealthChecksForConfig, formatHealthCheckResults } from './sync-health.js';
import { runProjectMappingWizard, applyMappingsToWorkspace, type MappingProvider } from '../helpers/issue-tracker/project-mapping-wizard.js';
import type { WorkspaceConfig } from '../../core/config/types.js';

export type SyncSetupProvider = 'github' | 'jira' | 'ado';

export interface SyncSetupOptions {
  /** Pre-select a provider and skip the selection prompt */
  provider?: SyncSetupProvider;
  /** Non-interactive mode: print hint and exit 0 */
  quick?: boolean;
}

/**
 * Map --provider flag to a RepositoryHosting hint so setupIssueTracker
 * can pre-select the right default in the tracker selection prompt.
 */
function providerToHostingHint(provider: SyncSetupProvider): RepositoryHosting {
  switch (provider) {
    case 'github': return 'github';
    case 'jira':   return 'other';
    case 'ado':    return 'ado';
  }
}

/**
 * Run the sync-setup wizard.
 *
 * Delegates entirely to setupIssueTracker() which handles:
 *   - Provider selection (GitHub / JIRA / ADO)
 *   - Credential collection (tokens, domains, project keys)
 *   - Permission preset
 *   - Umbrella per-repo target configuration
 *   - Writing .env + .specweave/config.json
 *
 * @param options - CLI options (--provider, --quick)
 */
export async function syncSetupCommand(options: SyncSetupOptions = {}): Promise<void> {
  const projectPath = process.cwd();

  // Guard: must be a SpecWeave project
  const configPath = path.join(projectPath, '.specweave', 'config.json');
  if (!fs.existsSync(configPath)) {
    console.error(chalk.red('✗ No SpecWeave project found in current directory.'));
    console.error(chalk.gray('  Run specweave init first to initialize this project.'));
    process.exitCode = 1;
    return;
  }

  // Quick / non-interactive mode
  const isNonTTY = !process.stdin.isTTY;
  if (options.quick || isNonTTY) {
    // Validate existing config instead of just printing a hint
    try {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (raw.sync?.enabled && raw.sync?.provider) {
        console.log(chalk.green(`✓ Sync already configured: ${raw.sync.provider}`));

        // Run health checks to validate the configuration
        const results = await runHealthChecksForConfig(raw, projectPath);
        if (results.length > 0) {
          console.log(formatHealthCheckResults(results));
        }

        const failedChecks = results.filter((r: any) => r.status === 'fail');
        if (failedChecks.length === 0) {
          console.log(chalk.green('✓ All health checks passed'));
        } else {
          console.log(chalk.yellow(`⚠ ${failedChecks.length} health check(s) failed. Run specweave sync-setup interactively to fix.`));
        }
        return;
      }
    } catch {
      // Config read failed, fall through to hint
    }

    console.log(chalk.gray('⏭️  Run specweave sync-setup interactively to configure external sync.'));
    console.log(chalk.gray('   Supported providers: GitHub Issues, JIRA, Azure DevOps'));
    return;
  }

  // Detect language from config for i18n
  let language: SupportedLanguage = 'en';
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const lang = raw?.i18n?.language || raw?.language;
    if (lang) language = lang as SupportedLanguage;
  } catch {
    // fall back to English
  }

  console.log('');
  console.log(chalk.cyan.bold('🔗 External Tool Sync Setup'));
  console.log(chalk.gray('   Connect GitHub Issues, JIRA, or Azure DevOps to your SpecWeave project.'));
  console.log('');

  const success = await setupIssueTracker({
    projectPath,
    language,
    isCI: false,
    repositoryHosting: options.provider ? providerToHostingHint(options.provider) : undefined,
  });

  if (success) {
    // After credentials validated, run repo-mapping step if workspace has repos (T-026)
    try {
      const updatedRaw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const workspace: WorkspaceConfig | undefined = updatedRaw.workspace;

      if (workspace && workspace.repos.length > 0) {
        const provider = (updatedRaw.sync?.provider || options.provider || 'github') as MappingProvider;

        // Extract authenticated owner from sync profiles for auto-detect
        // profiles is Record<string, any>, not an array — use Object.values()
        const profilesObj = updatedRaw.sync?.profiles || {};
        const firstProfile = Object.values(profilesObj)[0] as any;
        const authenticatedOwner = firstProfile?.config?.owner || undefined;

        const wizardResult = await runProjectMappingWizard({
          provider,
          workspace,
          authenticatedOwner,
          projectPath,
        });

        // Apply mappings to workspace config and write back (T-027)
        if (wizardResult.mappings.length > 0) {
          updatedRaw.workspace = applyMappingsToWorkspace(workspace, wizardResult);

          // Propagate mapping owner/repo back into sync profiles so they stay in sync
          if (provider === 'github' && updatedRaw.sync?.profiles) {
            for (const mapping of wizardResult.mappings) {
              if (mapping.isRoot || !mapping.target.github) continue;
              const profileKey = Object.keys(updatedRaw.sync.profiles).find(
                k => updatedRaw.sync.profiles[k]?.config?.repo === mapping.repoId ||
                     k === mapping.repoId
              );
              if (profileKey) {
                updatedRaw.sync.profiles[profileKey].config.owner = mapping.target.github.owner;
                updatedRaw.sync.profiles[profileKey].config.repo = mapping.target.github.repo;
              }
            }
          }

          fs.writeFileSync(configPath, JSON.stringify(updatedRaw, null, 2));
          console.log(chalk.green('   ✓ Repo mappings saved to workspace config'));
        }
      }
    } catch (err) {
      // Mapping wizard failure is non-critical — credentials are already saved
      const msg = err instanceof Error ? err.message : String(err);
      console.log(chalk.gray(`   ⚠ Could not run repo mapping wizard. Edit config.json manually.`));
      console.log(chalk.gray(`     Reason: ${msg}`));
    }

    console.log('');
    console.log(chalk.green.bold('✅ Sync setup complete!'));
    console.log('');

    // Run health checks for the configured provider(s)
    try {
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const results = await runHealthChecksForConfig(updatedConfig, projectPath);
      if (results.length > 0) {
        console.log(formatHealthCheckResults(results));
      }
    } catch (err) {
      // Health check failure should not block setup success
      const msg = err instanceof Error ? err.message : String(err);
      console.log(chalk.gray('   ⚠ Could not run health checks. Run specweave sync-health manually.'));
      console.log(chalk.gray(`     Reason: ${msg}`));
    }

    console.log(chalk.gray('   Run specweave sync-health to re-check integration health.'));
    console.log(chalk.gray('   Run specweave sync-progress to push increment progress to external tools.'));
    console.log('');
  }
}
