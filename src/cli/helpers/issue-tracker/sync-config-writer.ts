/**
 * Sync Config Writer
 *
 * Writes sync configuration to .specweave/config.json for different trackers.
 * Extracted from issue-tracker/index.ts to reduce file size and improve maintainability.
 *
 * @module cli/helpers/issue-tracker/sync-config-writer
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import * as path from 'path';
import { getConfigManager } from '../../../core/config/index.js';
import { Logger, consoleLogger } from '../../../utils/logger.js';
import type { IssueTracker, TrackerCredentials, SyncSettings, SyncPermissions } from './types.js';

/**
 * Write sync config to .specweave/config.json
 *
 * This is CRITICAL for hooks to fire! Without this, the post-task-completion hook
 * won't sync to GitHub/Jira/ADO.
 *
 * @param projectPath - Path to project root
 * @param tracker - Issue tracker type (github, jira, ado)
 * @param credentials - Tracker credentials
 * @param syncSettings - Sync settings (status sync, auto-labels)
 * @param syncPermissions - Permission flags for sync operations
 * @param repositoryProfiles - Optional multi-repo profiles (GitHub only)
 * @param monorepoProjects - Optional monorepo projects (GitHub only)
 * @param logger - Optional logger (defaults to consoleLogger)
 */
export async function writeSyncConfig(
  projectPath: string,
  tracker: IssueTracker,
  credentials: TrackerCredentials,
  syncSettings: SyncSettings,
  syncPermissions: SyncPermissions,
  repositoryProfiles?: any[],
  monorepoProjects?: string[],
  logger: Logger = consoleLogger
): Promise<void> {
  const configManager = getConfigManager(projectPath);

  // Read existing config
  const config = await configManager.read();

  // Add hooks configuration (enables auto-sync!)
  config.hooks = {
    post_task_completion: {
      sync_living_docs: true,
      sync_tasks_md: true,
      external_tracker_sync: true
    },
    post_increment_planning: {
      auto_create_github_issue: tracker === 'github' // Only for GitHub
    }
  };

  // Build profiles and config based on tracker type
  const profiles: Record<string, any> = {};

  switch (tracker) {
    case 'github':
      await buildGitHubSyncConfig(
        config,
        profiles,
        projectPath,
        credentials,
        syncSettings,
        syncPermissions,
        repositoryProfiles,
        monorepoProjects
      );
      break;
    case 'jira':
      buildJiraSyncConfig(
        config,
        profiles,
        credentials,
        syncSettings,
        syncPermissions
      );
      break;
    case 'ado':
      buildAdoSyncConfig(
        config,
        profiles,
        credentials,
        syncSettings,
        syncPermissions
      );
      break;
  }

  // Write config using ConfigManager
  await configManager.write(config);

  logger.log(chalk.green(`✓ Sync config written to .specweave/config.json`));
  logger.log(chalk.gray(`   Provider: ${tracker}`));
  logger.log(chalk.gray(`   Auto-sync: enabled`));
  logger.log(chalk.gray(`   Status sync: ${syncSettings.includeStatus ? 'enabled' : 'disabled'}`));
  logger.log(chalk.gray(`   Auto-labeling: ${syncSettings.autoApplyLabels ? 'enabled' : 'disabled'}`));
  logger.log(chalk.gray(`   Hooks: post_task_completion, post_increment_planning`));
}

/**
 * Build GitHub sync configuration
 */
async function buildGitHubSyncConfig(
  config: any,
  profiles: Record<string, any>,
  projectPath: string,
  credentials: TrackerCredentials,
  syncSettings: SyncSettings,
  syncPermissions: SyncPermissions,
  repositoryProfiles?: any[],
  monorepoProjects?: string[]
): Promise<void> {
  let owner = '';
  let repo = '';

  // Try to detect from git remote
  try {
    const remote = execSync('git remote get-url origin', {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();

    // Parse owner/repo from: https://github.com/owner/repo.git or git@github.com:owner/repo.git
    const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
    if (match) {
      owner = match[1];
      repo = match[2];
    }
  } catch {
    // Fallback to current directory name
    repo = path.basename(projectPath);
    owner = 'YOUR_GITHUB_USERNAME'; // User must update manually
  }

  // Handle multiple repository profiles
  if (repositoryProfiles && repositoryProfiles.length > 0) {
    for (const profile of repositoryProfiles) {
      profiles[profile.id] = {
        provider: 'github',
        displayName: profile.displayName,
        config: {
          owner: profile.owner,
          repo: profile.repo
        },
        timeRange: {
          default: '1M',
          max: '6M'
        },
        rateLimits: {
          maxItemsPerSync: 500,
          warnThreshold: 100
        }
      };
    }

    // Handle monorepo projects if present
    if (monorepoProjects && monorepoProjects.length > 0) {
      const mainProfile = Object.values(profiles)[0] as any;
      if (mainProfile) {
        mainProfile.config.monorepoProjects = monorepoProjects;
      }
    }

    const defaultProfileObj = repositoryProfiles.find(p => p.isDefault) || repositoryProfiles[0];
    config.sync = {
      enabled: true,
      direction: 'bidirectional' as const,
      autoSync: false,
      provider: 'github',
      includeStatus: syncSettings.includeStatus,
      autoApplyLabels: syncSettings.autoApplyLabels,
      // v0.31.0+: Use defaultProfile (renamed from activeProfile for clarity)
      defaultProfile: defaultProfileObj?.id || 'main',
      settings: {
        canUpsertInternalItems: syncPermissions.canUpsertInternalItems,
        canUpdateExternalItems: syncPermissions.canUpdateExternalItems,
        canUpdateStatus: syncPermissions.canUpdateStatus
      },
      profiles
    };
  } else {
    // Fallback for legacy single-repo configuration
    profiles['github-default'] = {
      provider: 'github',
      displayName: 'GitHub Default',
      config: {
        owner,
        repo
      },
      timeRange: {
        default: '1M',
        max: '6M'
      },
      rateLimits: {
        maxItemsPerSync: 500,
        warnThreshold: 100
      }
    };

    config.sync = {
      enabled: true,
      direction: 'bidirectional' as const,
      autoSync: false,
      provider: 'github',
      includeStatus: syncSettings.includeStatus,
      autoApplyLabels: syncSettings.autoApplyLabels,
      // v0.31.0+: Use defaultProfile (renamed from activeProfile for clarity)
      defaultProfile: 'github-default',
      settings: {
        canUpsertInternalItems: syncPermissions.canUpsertInternalItems,
        canUpdateExternalItems: syncPermissions.canUpdateExternalItems,
        canUpdateStatus: syncPermissions.canUpdateStatus
      },
      profiles
    };
  }
}

/**
 * Build JIRA sync configuration
 */
function buildJiraSyncConfig(
  config: any,
  profiles: Record<string, any>,
  credentials: TrackerCredentials,
  syncSettings: SyncSettings,
  syncPermissions: SyncPermissions
): void {
  const jiraCreds = credentials as any;
  const domain = jiraCreds.domain || '';

  // Handle different Jira strategies
  let project: string | string[] = '';
  if (jiraCreds.strategy === 'project-per-team' && jiraCreds.projects) {
    project = jiraCreds.projects; // Array of project keys
  } else {
    project = jiraCreds.projectKey || jiraCreds.project || '';
  }

  profiles['jira-default'] = {
    provider: 'jira',
    displayName: 'Jira Default',
    config: {
      domain,
      // Handle both single project (string) and multiple projects (array)
      ...(Array.isArray(project)
        ? { projects: project }
        : { projectKey: project }
      )
    },
    timeRange: {
      default: '1M',
      max: '6M'
    }
  };

  config.sync = {
    enabled: true,
    direction: 'bidirectional' as const,
    autoSync: false,
    provider: 'jira',
    includeStatus: syncSettings.includeStatus,
    autoApplyLabels: syncSettings.autoApplyLabels,
    // v0.31.0+: Use defaultProfile (renamed from activeProfile for clarity)
    defaultProfile: 'jira-default',
    settings: {
      canUpsertInternalItems: syncPermissions.canUpsertInternalItems,
      canUpdateExternalItems: syncPermissions.canUpdateExternalItems,
      canUpdateStatus: syncPermissions.canUpdateStatus
    },
    profiles
  };
}

/**
 * Build ADO sync configuration
 */
function buildAdoSyncConfig(
  config: any,
  profiles: Record<string, any>,
  credentials: TrackerCredentials,
  syncSettings: SyncSettings,
  syncPermissions: SyncPermissions
): void {
  const adoCreds = credentials as any;
  const organization = adoCreds.org || '';
  const project = adoCreds.project || '';

  // Handle multi-project configuration (v0.28.x+)
  if (adoCreds.projects && adoCreds.projects.length > 0) {
    let defaultProfileName = '';

    for (const proj of adoCreds.projects) {
      const profileId = `ado-${proj.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      profiles[profileId] = {
        provider: 'ado',
        displayName: `Azure DevOps - ${proj.name}`,
        config: {
          organization,
          project: proj.name,
          ...(proj.areaPaths?.length ? { areaPaths: proj.areaPaths } : {}),
          ...(adoCreds.strategy ? { strategy: adoCreds.strategy } : {}),
          ...(proj.isUmbrella ? { isUmbrella: true } : {})
        },
        timeRange: {
          default: '1M',
          max: '6M'
        }
      };

      // Set default profile (skip umbrella projects)
      if (proj.isDefault && !proj.isUmbrella) {
        defaultProfileName = profileId;
      }
    }

    // Fallback to first profile if no default set
    if (!defaultProfileName) {
      defaultProfileName = Object.keys(profiles)[0];
    }

    config.sync = {
      enabled: true,
      direction: 'bidirectional' as const,
      autoSync: false,
      provider: 'ado',
      includeStatus: syncSettings.includeStatus,
      autoApplyLabels: syncSettings.autoApplyLabels,
      // v0.31.0+: Use defaultProfile (renamed from activeProfile for clarity)
      defaultProfile: defaultProfileName,
      settings: {
        canUpsertInternalItems: syncPermissions.canUpsertInternalItems,
        canUpdateExternalItems: syncPermissions.canUpdateExternalItems,
        canUpdateStatus: syncPermissions.canUpdateStatus
      },
      profiles
    };

    // Set multiProject.enabled for ADO multi-project setups
    const defaultProject = adoCreds.projects.find((p: any) => p.isDefault && !p.isUmbrella) || adoCreds.projects[0];
    (config as any).multiProject = {
      enabled: true,
      activeProject: defaultProject.name.toLowerCase().replace(/\s+/g, '-')
    };
  } else {
    // Single project configuration (backward compatibility)
    profiles['ado-default'] = {
      provider: 'ado',
      displayName: 'Azure DevOps Default',
      config: {
        organization,
        project,
        ...(adoCreds.team ? { team: adoCreds.team } : {}),
        ...(adoCreds.teams?.length ? { teams: adoCreds.teams } : {}),
        ...(adoCreds.areaPaths?.length ? { areaPaths: adoCreds.areaPaths } : {}),
        ...(adoCreds.strategy ? { strategy: adoCreds.strategy } : {})
      },
      timeRange: {
        default: '1M',
        max: '6M'
      }
    };

    config.sync = {
      enabled: true,
      direction: 'bidirectional' as const,
      autoSync: false,
      provider: 'ado',
      includeStatus: syncSettings.includeStatus,
      autoApplyLabels: syncSettings.autoApplyLabels,
      // v0.31.0+: Use defaultProfile (renamed from activeProfile for clarity)
      defaultProfile: 'ado-default',
      settings: {
        canUpsertInternalItems: syncPermissions.canUpsertInternalItems,
        canUpdateExternalItems: syncPermissions.canUpdateExternalItems,
        canUpdateStatus: syncPermissions.canUpdateStatus
      },
      profiles
    };
  }
}
