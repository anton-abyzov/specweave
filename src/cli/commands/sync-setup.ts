/**
 * sync-setup command
 *
 * Interactive terminal wizard to connect GitHub Issues, JIRA, or Azure DevOps.
 * This is the CLI counterpart of the /sw:sync-setup Claude skill.
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
    case 'github': return 'github-single';
    case 'jira':   return 'other-single';
    case 'ado':    return 'ado-single';
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
    } catch {
      // Health check failure should not block setup success
      console.log(chalk.gray('   ⚠ Could not run health checks. Run specweave sync-health manually.'));
    }

    console.log(chalk.gray('   Run specweave sync-health to re-check integration health.'));
    console.log(chalk.gray('   Run specweave sync-progress to push increment progress to external tools.'));
    console.log('');
  }
}
