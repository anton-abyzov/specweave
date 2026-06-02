/**
 * sync-health command
 *
 * Standalone health check for configured external integrations.
 * Validates credentials, permissions, and project access for GitHub, JIRA, and ADO.
 *
 * Exit codes:
 *   0 - All checks pass
 *   1 - One or more checks failed
 *   2 - No providers configured
 *
 * @module cli/commands/sync-health
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import {
  checkJiraIntegration,
  checkAdoIntegration,
  checkGitHubIntegration,
  formatHealthCheckResults as formatResults,
  type HealthCheckResult,
} from '../../sync/integration-health-check.js';
import { parseEnvFile } from '../../utils/env-file.js';
import { ADO_PAT_ALIASES, resolveAdoPat } from '../../core/credentials/credentials-manager.js';

export interface SyncHealthOptions {
  /** Output results as JSON */
  json?: boolean;
  /** Check only a specific provider */
  provider?: 'github' | 'jira' | 'ado';
}

/**
 * Determine which providers are enabled from config
 */
function getEnabledProviders(config: any): Array<'github' | 'jira' | 'ado'> {
  const providers: Array<'github' | 'jira' | 'ado'> = [];
  const add = (provider: 'github' | 'jira' | 'ado') => {
    if (!providers.includes(provider)) providers.push(provider);
  };

  // Check sync section
  if (config.sync?.github?.enabled !== false && (config.sync?.github?.enabled || config.repository?.provider === 'github')) {
    add('github');
  }
  if (config.sync?.jira?.enabled || config.issueTracker?.provider === 'jira') {
    add('jira');
  }
  if (config.sync?.ado?.enabled || ['ado', 'azure-devops'].includes(config.issueTracker?.provider)) {
    add('ado');
  }

  for (const profile of Object.values(config.sync?.profiles ?? {}) as any[]) {
    if (profile.provider === 'github') add('github');
    if (profile.provider === 'jira') add('jira');
    if (['ado', 'azure-devops'].includes(profile.provider)) add('ado');
  }

  if (config.umbrella?.sync?.github) add('github');
  if (config.umbrella?.sync?.jira) add('jira');
  if (config.umbrella?.sync?.ado) add('ado');
  for (const child of config.umbrella?.childRepos ?? []) {
    if (child.sync?.github) add('github');
    if (child.sync?.jira) add('jira');
    if (child.sync?.ado) add('ado');
  }

  return providers;
}

function loadProjectEnv(projectPath: string): Record<string, string> {
  const envPath = path.join(projectPath, '.env');
  if (!fs.existsSync(envPath)) return {};

  try {
    return parseEnvFile(fs.readFileSync(envPath, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Run health checks for all enabled providers based on config.
 * Shared between sync-setup (post-setup) and sync-health (on-demand).
 */
export async function runHealthChecksForConfig(
  config: any,
  projectPath: string
): Promise<HealthCheckResult[]> {
  const providers = getEnabledProviders(config);
  const env = loadProjectEnv(projectPath);
  const results: HealthCheckResult[] = [];

  for (const provider of providers) {
    switch (provider) {
      case 'github':
        results.push(await checkGitHubIntegration());
        break;

      case 'jira': {
        const domain = config.issueTracker?.domain || config.sync?.jira?.domain || env.JIRA_DOMAIN || process.env.JIRA_DOMAIN || '';
        const projectKey = config.issueTracker?.projects?.[0]?.key
          || config.sync?.jira?.projectKey || env.JIRA_PROJECT_KEY || process.env.JIRA_PROJECT_KEY || '';
        const email = env.JIRA_EMAIL || process.env.JIRA_EMAIL || '';
        const apiToken = env.JIRA_API_TOKEN || process.env.JIRA_API_TOKEN || '';

        if (domain && email && apiToken) {
          results.push(await checkJiraIntegration({ domain, projectKey, email, apiToken }));
        } else {
          results.push({
            provider: 'jira',
            checks: [{
              name: 'Credentials',
              status: 'fail',
              message: 'Missing JIRA credentials',
              fix: 'Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN in .env',
            }],
            healthy: false,
          });
        }
        break;
      }

      case 'ado': {
        const organization = config.issueTracker?.organization_ado
          || config.issueTracker?.organization
          || config.sync?.ado?.organization
          || env.AZURE_DEVOPS_ORG
          || env.ADO_ORGANIZATION
          || env.ADO_ORG
          || process.env.AZURE_DEVOPS_ORG
          || process.env.ADO_ORGANIZATION
          || process.env.ADO_ORG
          || '';
        const project = config.issueTracker?.project
          || config.sync?.ado?.project
          || env.AZURE_DEVOPS_PROJECT
          || env.ADO_PROJECT
          || process.env.AZURE_DEVOPS_PROJECT
          || process.env.ADO_PROJECT
          || '';
        // 0865 T-006: resolve the PAT through the SAME canonical alias surface
        // the ADO runtime resolver uses (ADO_PAT_ALIASES / resolveAdoPat), so
        // health can never report green while runtime writes throw "PAT not found".
        // Project `.env` values (loaded into `env`) take precedence, then
        // process.env via resolveAdoPat().
        const pat = ADO_PAT_ALIASES.map((alias) => env[alias]).find(Boolean)
          || resolveAdoPat()
          || '';

        if (organization && project && pat) {
          results.push(await checkAdoIntegration({ organization, project, pat }));
        } else {
          results.push({
            provider: 'ado',
            checks: [{
              name: 'Credentials',
              status: 'fail',
              message: 'Missing Azure DevOps credentials',
              fix: 'Set AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT, and AZURE_DEVOPS_PAT in .env',
            }],
            healthy: false,
          });
        }
        break;
      }
    }
  }

  return results;
}

/**
 * Re-export formatHealthCheckResults for sync-setup import
 */
export { formatResults as formatHealthCheckResults };

/**
 * Run the sync-health command.
 */
export async function syncHealthCommand(options: SyncHealthOptions = {}): Promise<number> {
  const projectPath = process.cwd();
  const configPath = path.join(projectPath, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    if (options.json) {
      console.log(JSON.stringify({ error: 'Not a SpecWeave project', results: [], healthy: false }));
    } else {
      console.error(chalk.red('✗ No SpecWeave project found in current directory.'));
      console.error(chalk.gray('  Run specweave init first to initialize this project.'));
    }
    return 1;
  }

  let config: any;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    if (options.json) {
      console.log(JSON.stringify({ error: 'Invalid config.json', results: [], healthy: false }));
    } else {
      console.error(chalk.red('✗ Failed to read .specweave/config.json'));
    }
    return 1;
  }

  // Filter to specific provider if requested
  if (options.provider) {
    const providers = getEnabledProviders(config);
    if (!providers.includes(options.provider)) {
      if (options.json) {
        console.log(JSON.stringify({
          error: `Provider ${options.provider} is not configured`,
          results: [],
          healthy: false,
        }));
      } else {
        console.error(chalk.red(`✗ Provider ${options.provider} is not configured.`));
        console.error(chalk.gray('  Run specweave sync-setup to configure it.'));
      }
      return 2;
    }
  }

  const results = await runHealthChecksForConfig(config, projectPath);

  // Filter by provider if specified
  const filteredResults = options.provider
    ? results.filter(r => r.provider === options.provider)
    : results;

  if (filteredResults.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ results: [], healthy: false, error: 'No providers configured' }));
    } else {
      console.log(chalk.yellow('⚠ No external sync providers configured.'));
      console.log(chalk.gray('  Run specweave sync-setup to connect GitHub, JIRA, or ADO.'));
    }
    return 2;
  }

  const allHealthy = filteredResults.every(r => r.healthy);

  if (options.json) {
    console.log(JSON.stringify({
      results: filteredResults,
      healthy: allHealthy,
    }, null, 2));
  } else {
    console.log(formatResults(filteredResults));
  }

  return allHealthy ? 0 : 1;
}
