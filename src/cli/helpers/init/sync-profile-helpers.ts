/**
 * Sync Profile Helpers
 *
 * Helper functions for reading and processing sync profiles from config.json
 * Used by external import functionality.
 *
 * Extracted from external-import.ts to reduce file size and improve maintainability.
 *
 * @module cli/helpers/init/sync-profile-helpers
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import type { ADOConfig, JiraConfig, JiraProjectConfig } from './types.js';
import { parseEnvFile } from '../../../utils/env-file.js';

/**
 * Type alias for backwards compatibility
 * JiraConfig in types.ts now includes multi-project support
 */
export type JiraConfigExtended = JiraConfig;

/**
 * Get existing sync profiles from config.json
 * Returns array of "owner/repo" strings if profiles exist
 *
 * CRITICAL FIX (2025-11-26): Also includes parent repo from umbrella config
 * Bug: Parent repo was NOT being imported in umbrella mode - only child repos were processed
 */
export function getExistingSyncProfiles(targetDir: string): string[] | null {
  try {
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const repos: string[] = [];

    // Check for sync.profiles structure (umbrella repo setup - child repos)
    if (config.sync?.profiles && typeof config.sync.profiles === 'object') {
      const profiles = config.sync.profiles;

      for (const [profileId, profile] of Object.entries(profiles)) {
        const p = profile as { config?: { owner?: string; repo?: string } };
        if (p.config?.owner && p.config?.repo) {
          repos.push(`${p.config.owner}/${p.config.repo}`);
        }
      }
    }

    // CRITICAL FIX: Also include parent repo from umbrella config
    // Parent repo may have issues/items that need to be imported too!
    if (config.umbrella?.enabled && config.umbrella?.parentRepo) {
      // parentRepo can be "owner/repo" or just "repo" (same owner as git remote)
      let parentRepoFullName = config.umbrella.parentRepo;

      // If parentRepo is just the repo name, try to get owner from git remote or first child repo
      if (!parentRepoFullName.includes('/')) {
        // Try to find owner from sync profiles (same owner as child repos)
        const firstProfile = Object.values(config.sync?.profiles || {})[0] as { config?: { owner?: string } } | undefined;
        const owner = firstProfile?.config?.owner;
        if (owner) {
          parentRepoFullName = `${owner}/${parentRepoFullName}`;
        }
      }

      // Add parent repo if not already in the list
      if (parentRepoFullName.includes('/') && !repos.includes(parentRepoFullName)) {
        repos.push(parentRepoFullName);
      }
    }

    return repos.length > 0 ? repos : null;
  } catch (error) {
    // Log warning for debugging - config parsing errors shouldn't be silent
    console.warn(chalk.yellow(`   ⚠️  Failed to read sync profiles: ${error instanceof Error ? error.message : String(error)}`));
    return null;
  }
}

/**
 * Check if umbrella mode is enabled from config.json
 * Returns true if sync.profiles exist OR umbrella.enabled is true
 *
 * CRITICAL: Used to force global collision detection even for single-group batches
 */
export function isUmbrellaModeFromConfig(targetDir: string): boolean {
  try {
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return false;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Check 1: umbrella.enabled is explicitly true
    if (config.umbrella?.enabled === true) {
      return true;
    }

    // Check 2: sync.profiles has multiple entries (umbrella repo setup)
    if (config.sync?.profiles && typeof config.sync.profiles === 'object') {
      const profileCount = Object.keys(config.sync.profiles).length;
      if (profileCount >= 2) {
        return true;
      }
    }

    // Check 3: multiProject.enabled is true
    if (config.multiProject?.enabled === true) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get sync profile providers from config.json
 * Returns array of provider names ('github', 'jira', 'ado') from sync profiles
 */
export function getSyncProfileProviders(targetDir: string): string[] {
  try {
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return [];
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const providers = new Set<string>();

    // Check sync.profiles structure
    if (config.sync?.profiles && typeof config.sync.profiles === 'object') {
      for (const profile of Object.values(config.sync.profiles)) {
        const p = profile as { provider?: string };
        if (p.provider) {
          providers.add(p.provider.toLowerCase());
        }
      }
    }

    // Also check top-level sync.provider
    if (config.sync?.provider) {
      providers.add(config.sync.provider.toLowerCase());
    }

    return Array.from(providers);
  } catch {
    return [];
  }
}

/**
 * Load ADO config from sync profile when detectAllConfigs() fails
 * This ensures work items are imported even when the main detection fails
 *
 * CRITICAL FIX (2025-11-29): This fixes the bug where ADO folders were created
 * but no work items were imported because ado was null in the import flow.
 *
 * ENHANCED (2025-11-30): Now supports multi-project ADO setups by collecting
 * ALL ADO profiles and building the projects array for multi-project import.
 */
export function loadAdoConfigFromSyncProfile(targetDir: string): ADOConfig | null {
  try {
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Load PAT from .env file (needed for all profiles)
    let pat: string | undefined;
    const envPath = path.join(targetDir, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envVars = parseEnvFile(envContent);
      pat = envVars.AZURE_DEVOPS_PAT || envVars.ADO_PAT;
    }
    // Also check environment variables
    if (!pat) {
      pat = process.env.AZURE_DEVOPS_PAT || process.env.ADO_PAT;
    }

    if (!pat) {
      return null;
    }

    // Collect ALL ADO profiles for multi-project support
    const adoProjects: Array<{ name: string; areaPaths?: string[]; isDefault?: boolean; isUmbrella?: boolean }> = [];
    let organization: string | undefined;
    let strategy: string | undefined;

    if (config.sync?.profiles && typeof config.sync.profiles === 'object') {
      const defaultProfileId = config.sync.defaultProfile;

      for (const [profileId, profile] of Object.entries(config.sync.profiles)) {
        const p = profile as { provider?: string; config?: { organization?: string; project?: string; areaPaths?: string[]; strategy?: string; isUmbrella?: boolean } };
        if (p.provider?.toLowerCase() === 'ado' && p.config) {
          const profileConfig = p.config;

          if (profileConfig.organization && profileConfig.project) {
            // Use first organization found (they should all be the same)
            if (!organization) {
              organization = profileConfig.organization;
            }
            // Use first strategy found
            if (!strategy && profileConfig.strategy) {
              strategy = profileConfig.strategy;
            }

            adoProjects.push({
              name: profileConfig.project,
              areaPaths: profileConfig.areaPaths,
              isDefault: profileId === defaultProfileId,
              isUmbrella: profileConfig.isUmbrella
            });
          }
        }
      }
    }

    // Return null if no ADO projects found
    if (adoProjects.length === 0 || !organization) {
      return null;
    }

    // Return multi-project config
    const defaultProject = adoProjects.find(p => p.isDefault) || adoProjects[0];
    return {
      orgUrl: `https://dev.azure.com/${organization}`,
      project: defaultProject.name,  // Primary project for backwards compatibility
      pat,
      strategy,
      projects: adoProjects  // Multi-project support
    };
  } catch {
    return null;
  }
}

/**
 * Get umbrella project names from config.json
 * Umbrella projects are folder-structure-only (no items imported)
 */
export function getUmbrellaProjects(targetDir: string): string[] {
  try {
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return [];
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const umbrellaProjects: string[] = [];

    // Check sync.profiles for ADO profiles with isUmbrella flag
    if (config.sync?.profiles && typeof config.sync.profiles === 'object') {
      for (const profile of Object.values(config.sync.profiles)) {
        const p = profile as { provider?: string; config?: { project?: string; isUmbrella?: boolean } };
        if (p.provider === 'ado' && p.config?.isUmbrella && p.config?.project) {
          umbrellaProjects.push(p.config.project);
        }
      }
    }

    return umbrellaProjects;
  } catch {
    return [];
  }
}

/**
 * Load JIRA config from sync profiles in config.json
 *
 * MIRRORS loadAdoConfigFromSyncProfile for JIRA multi-project support.
 *
 * CRITICAL FIX (2025-12-09): This fixes the bug where JIRA folders were created
 * but no work items were imported because jira was null in the import flow.
 *
 * ENHANCED (2025-12-09): Supports multi-project JIRA setups by collecting
 * ALL JIRA profiles and building the projects array for multi-project import.
 */
export function loadJiraConfigFromSyncProfile(targetDir: string): JiraConfigExtended | null {
  try {
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Load API token and email from .env file (needed for all profiles)
    let apiToken: string | undefined;
    let email: string | undefined;
    const envPath = path.join(targetDir, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envVars = parseEnvFile(envContent);
      apiToken = envVars.JIRA_API_TOKEN || envVars.JIRA_TOKEN;
      email = envVars.JIRA_EMAIL;
    }
    // Also check environment variables
    if (!apiToken) {
      apiToken = process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN;
    }
    if (!email) {
      email = process.env.JIRA_EMAIL;
    }

    if (!apiToken || !email) {
      return null;
    }

    // Collect ALL JIRA profiles for multi-project support
    const jiraProjects: JiraProjectConfig[] = [];
    let domain: string | undefined;
    let strategy: string | undefined;

    if (config.sync?.profiles && typeof config.sync.profiles === 'object') {
      const defaultProfileId = config.sync.defaultProfile;

      for (const [profileId, profile] of Object.entries(config.sync.profiles)) {
        const p = profile as {
          provider?: string;
          config?: {
            domain?: string;
            projectKey?: string;
            projectName?: string;
            projectId?: string;
            boards?: Array<{ id: string; name?: string }>;
            strategy?: string;
          }
        };

        if (p.provider?.toLowerCase() === 'jira' && p.config) {
          const profileConfig = p.config;

          if (profileConfig.domain && profileConfig.projectKey) {
            // Use first domain found (they should all be the same)
            if (!domain) {
              domain = profileConfig.domain;
            }
            // Use first strategy found
            if (!strategy && profileConfig.strategy) {
              strategy = profileConfig.strategy;
            }

            jiraProjects.push({
              key: profileConfig.projectKey,
              name: profileConfig.projectName,
              id: profileConfig.projectId,
              boards: profileConfig.boards,
              isDefault: profileId === defaultProfileId
            });
          }
        }
      }
    }

    // Return null if no JIRA projects found
    if (jiraProjects.length === 0 || !domain) {
      return null;
    }

    // Return multi-project config
    const defaultProject = jiraProjects.find(p => p.isDefault) || jiraProjects[0];
    return {
      host: domain,
      email,
      apiToken,
      strategy,
      projects: jiraProjects
    };
  } catch {
    return null;
  }
}
