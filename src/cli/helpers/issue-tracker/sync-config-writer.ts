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
import * as fs from 'fs';
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

  // CRITICAL FIX (v1.0.37): Remove parent project folder for GitHub multi-repo setups
  // During init, scaffold creates specs/{projectName}/ folder before we know the repo structure.
  // For GitHub multi-repo, each repo should be a separate project folder at specs/ root level,
  // NOT nested under a parent umbrella folder.
  if (tracker === 'github' && repositoryProfiles && repositoryProfiles.length > 1) {
    await cleanupParentProjectFolder(projectPath, config, repositoryProfiles, logger);
  }

  logger.log(chalk.green(`✓ Sync config written to .specweave/config.json`));
  logger.log(chalk.gray(`   Provider: ${tracker}`));
  logger.log(chalk.gray(`   Auto-sync: enabled`));
  logger.log(chalk.gray(`   Status sync: ${syncSettings.includeStatus ? 'enabled' : 'disabled'}`));
  logger.log(chalk.gray(`   Auto-labeling: ${syncSettings.autoApplyLabels ? 'enabled' : 'disabled'}`));
  logger.log(chalk.gray(`   Hooks: post_task_completion, post_increment_planning`));
}

/**
 * Clean up parent project folder for GitHub multi-repo setups
 *
 * CRITICAL FIX (v1.0.37): For GitHub multi-repo setups, the scaffold creates
 * a parent folder (specs/{projectName}/) during init before we know the structure.
 * For GitHub multi-repo, each repo should be a top-level folder in specs/, NOT
 * nested under a parent umbrella folder.
 *
 * This function removes the parent folder if:
 * 1. We're setting up multiple GitHub repos (multi-repo)
 * 2. The parent folder exists
 * 3. The parent folder is empty or only contains README.md
 *
 * @param projectPath - Path to project root
 * @param config - Current config object
 * @param repositoryProfiles - Array of repository profiles
 * @param logger - Logger instance
 */
async function cleanupParentProjectFolder(
  projectPath: string,
  config: any,
  repositoryProfiles: any[],
  logger: Logger
): Promise<void> {
  try {
    // Get the parent project name from config
    const parentProjectName = config.project?.name;
    if (!parentProjectName) {
      return;
    }

    // Normalize to lowercase for folder matching
    const normalizedParentName = parentProjectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Check if parent folder exists in specs/
    const specsPath = path.join(projectPath, '.specweave', 'docs', 'internal', 'specs');
    const parentFolderPath = path.join(specsPath, normalizedParentName);

    if (!fs.existsSync(parentFolderPath)) {
      return; // No parent folder to clean up
    }

    // Check if any repository profile matches the parent folder name
    // If so, this is a valid repo folder, not a parent umbrella folder
    const isRepoFolder = repositoryProfiles.some(p => {
      const repoName = (p.repo || p.id || '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
      return repoName === normalizedParentName;
    });

    if (isRepoFolder) {
      return; // This is a valid repo folder, don't remove
    }

    // Check if parent folder is empty or only contains README.md
    const contents = fs.readdirSync(parentFolderPath);
    const isEmptyOrReadmeOnly = contents.length === 0 ||
      (contents.length === 1 && contents[0] === 'README.md');

    if (isEmptyOrReadmeOnly) {
      // Safe to remove - it's just the scaffold placeholder
      fs.rmSync(parentFolderPath, { recursive: true, force: true });
      logger.log(chalk.gray(`   ✓ Removed parent folder: specs/${normalizedParentName}/ (multi-repo mode)`));
    } else {
      // Has content - warn but don't remove
      logger.log(chalk.yellow(`   ⚠️  Parent folder specs/${normalizedParentName}/ has content - not removed`));
      logger.log(chalk.gray(`      Consider moving files to individual repo folders`));
    }
  } catch (error) {
    // Non-blocking - log warning but continue
    logger.log(chalk.gray(`   Note: Could not clean up parent folder: ${error}`));
  }
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
 *
 * NEW (v0.33.0): Supports 2-level structure (project → boards) similar to ADO (project → areaPaths)
 * Uses projectConfigs[] when available for per-project board configuration.
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

  // NEW (v0.33.0): Handle multi-project with boards (2-level structure)
  if (jiraCreds.projectConfigs && jiraCreds.projectConfigs.length > 0) {
    let defaultProfileName = '';

    for (const projConfig of jiraCreds.projectConfigs) {
      const profileId = `jira-${projConfig.key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      // CRITICAL SIMPLIFICATION (v0.35.3): Remove boards from config
      // JIRA boards are views, not organizational structure
      // Use 1-level mapping: JIRA Project → SpecWeave Project

      profiles[profileId] = {
        provider: 'jira',
        displayName: `Jira - ${projConfig.key}`,
        config: {
          domain,
          projectKey: projConfig.key,
          projectName: projConfig.name,
          projectId: projConfig.id,
          // boards: REMOVED (v0.35.3) - not needed for 1-level structure
          // strategy: REMOVED (v0.35.3) - legacy field
        },
        timeRange: {
          default: '1M',
          max: '6M'
        }
      };

      // Set default profile (first project with isDefault flag, or first project)
      if (projConfig.isDefault) {
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
      provider: 'jira',
      includeStatus: syncSettings.includeStatus,
      autoApplyLabels: syncSettings.autoApplyLabels,
      defaultProfile: defaultProfileName,
      settings: {
        canUpsertInternalItems: syncPermissions.canUpsertInternalItems,
        canUpdateExternalItems: syncPermissions.canUpdateExternalItems,
        canUpdateStatus: syncPermissions.canUpdateStatus
      },
      profiles
    };

    // Set multiProject.enabled for JIRA multi-project setups (like ADO)
    const defaultProject = jiraCreds.projectConfigs.find((p: any) => p.isDefault) || jiraCreds.projectConfigs[0];
    (config as any).multiProject = {
      enabled: true,
      activeProject: defaultProject.key.toLowerCase().replace(/\s+/g, '-')
    };

    return;
  }

  // Legacy: Handle single project or string array of projects
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
 * Deduplicate an array preserving order (first occurrence wins)
 * Works for both primitive arrays (strings) and object arrays (by key)
 *
 * Exported for use in other modules (e.g., index.ts writeSyncConfigHelper)
 */
export function deduplicateArray<T>(arr: T[] | undefined, keyFn?: (item: T) => string): T[] {
  if (!arr || arr.length === 0) return [];
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of arr) {
    const key = keyFn ? keyFn(item) : String(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/**
 * Build ADO sync configuration
 *
 * CRITICAL FIX (v0.31.x): Deduplicates areaPaths to prevent duplicates
 * Bug: Multiple init steps could add the same areaPaths multiple times
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

      // Deduplicate areaPaths - handles both string[] and object[] formats
      const dedupedAreaPaths = proj.areaPaths?.length
        ? deduplicateArray(proj.areaPaths, (item: any) =>
            typeof item === 'string' ? item : (item.id || item.path || item.name || JSON.stringify(item))
          )
        : undefined;

      profiles[profileId] = {
        provider: 'ado',
        displayName: `Azure DevOps - ${proj.name}`,
        config: {
          organization,
          project: proj.name,
          ...(dedupedAreaPaths?.length ? { areaPaths: dedupedAreaPaths } : {}),
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
    // Deduplicate areaPaths for single project too
    const dedupedAreaPaths = adoCreds.areaPaths?.length
      ? deduplicateArray(adoCreds.areaPaths, (item: any) =>
          typeof item === 'string' ? item : (item.id || item.path || item.name || JSON.stringify(item))
        )
      : undefined;

    profiles['ado-default'] = {
      provider: 'ado',
      displayName: 'Azure DevOps Default',
      config: {
        organization,
        project,
        ...(dedupedAreaPaths?.length ? { areaPaths: dedupedAreaPaths } : {}),
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
