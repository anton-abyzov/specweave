/**
 * Folder Mapper for Multi-Team Sync
 *
 * Maps sync profiles (ADO teams, Jira projects/components) to SpecWeave folder structure
 */

import path from 'path';
import {
  SyncProfile,
  AdoConfig,
  JiraConfig,
  GitHubConfig,
} from '../types/sync-profile.js';
import { slugify } from '../../utils/string-utils.js';

/**
 * Get specs folders for a sync profile
 *
 * Returns array of folders for multi-team profiles:
 * - ADO with teams: Multiple folders (one per team)
 * - Jira project-per-team: Multiple folders (one per project)
 * - Jira shared-project-with-components: Multiple folders (one per component)
 * - GitHub: Single folder (repo name)
 *
 * @param profile - Sync profile
 * @returns Array of folder paths relative to project root
 */
export function getSpecsFoldersForProfile(profile: SyncProfile): string[] {
  const folders: string[] = [];

  if (profile.provider === 'ado') {
    const config = profile.config as AdoConfig;

    // v0.13.0+ architecture
    if (config.projects && config.projects.length > 0) {
      // Multiple projects → multiple folders
      for (const project of config.projects) {
        const folderName = slugify(project);
        folders.push(`.specweave/docs/internal/specs/${folderName}`);
      }
    } else if (config.areaPaths && config.areaPaths.length > 0) {
      // Single project + area paths → multiple folders
      for (const areaPath of config.areaPaths) {
        const folderName = slugify(areaPath);
        folders.push(`.specweave/docs/internal/specs/${folderName}`);
      }
    } else {
      // Single project → default folder
      const folderName = slugify(config.project || 'default');
      folders.push(`.specweave/docs/internal/specs/${folderName}`);
    }
  } else if (profile.provider === 'jira') {
    const config = profile.config as JiraConfig;

    // v0.13.0+ architecture
    if (config.projects && config.projects.length > 0) {
      // Multiple projects → multiple folders
      for (const projectKey of config.projects) {
        const folderName = slugify(projectKey);
        folders.push(`.specweave/docs/internal/specs/${folderName}`);
      }
    } else {
      // Single project → single folder
      const folderName = slugify(config.projectKey || 'default');
      folders.push(`.specweave/docs/internal/specs/${folderName}`);
    }
  } else if (profile.provider === 'github') {
    const config = profile.config as GitHubConfig;

    // v0.13.0+ architecture
    if (config.repos && config.repos.length > 0) {
      // Multiple repos → multiple folders
      for (const repo of config.repos) {
        const folderName = slugify(repo);
        folders.push(`.specweave/docs/internal/specs/${folderName}`);
      }
    } else {
      // Single repo → single folder
      const folderName = slugify(config.repo || 'default');
      folders.push(`.specweave/docs/internal/specs/${folderName}`);
    }
  }

  return folders;
}

/**
 * Get Area Path for ADO team
 *
 * ADO Area Path format: "Project\\Team Name"
 * Special case: If team name matches project name, use just project name
 *
 * Examples:
 * - getAreaPathForTeam("League Scheduler", "League Scheduler Team") → "League Scheduler"
 * - getAreaPathForTeam("League Scheduler", "Platform Engineering Team") → "League Scheduler\\Platform Engineering Team"
 *
 * @param project - ADO project name
 * @param team - Team name
 * @returns Area Path string
 */
export function getAreaPathForTeam(project: string, team: string): string {
  // Special case: If team name contains project name, use just project name
  // "League Scheduler Team" in "League Scheduler" project → "League Scheduler"
  const teamLower = team.toLowerCase();
  const projectLower = project.toLowerCase();

  if (teamLower.includes(projectLower) && teamLower.replace(/\s+team\s*$/i, '') === projectLower) {
    return project;
  }

  // Default: "Project\\Team Name"
  return `${project}\\${team}`;
}

/**
 * Generate Area Paths map for ADO profile
 *
 * Creates mapping from team folder names to ADO Area Paths
 *
 * Example:
 * Input: project="League Scheduler", teams=["Platform Engineering Team", "QA Team"]
 * Output: {
 *   "platform-engineering-team": "League Scheduler\\Platform Engineering Team",
 *   "qa-team": "League Scheduler\\QA Team"
 * }
 *
 * @param project - ADO project name
 * @param teams - Array of team names
 * @returns Map of folder names to Area Paths
 */
export function generateAreaPaths(
  project: string,
  teams: string[]
): Record<string, string> {
  const areaPaths: Record<string, string> = {};

  for (const team of teams) {
    const folderName = slugify(team);
    areaPaths[folderName] = getAreaPathForTeam(project, team);
  }

  return areaPaths;
}

/**
 * Get team folder name from Area Path
 *
 * Reverse mapping: "League Scheduler\\Platform Engineering Team" → "platform-engineering-team"
 *
 * @param areaPath - ADO Area Path
 * @returns Folder name (kebab-case)
 */
export function getFolderNameFromAreaPath(areaPath: string): string {
  // Extract team name from "Project\\Team Name"
  const parts = areaPath.split('\\');
  const teamName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return slugify(teamName);
}

/**
 * Get team/project identifier from folder name
 *
 * Maps folder name back to original team/project name
 *
 * @param profile - Sync profile
 * @param folderName - Folder name (kebab-case)
 * @returns Original team/project name, or null if not found
 */
export function getTeamFromFolder(
  profile: SyncProfile,
  folderName: string
): string | null {
  if (profile.provider === 'ado') {
    const config = profile.config as AdoConfig;

    // v0.13.0+: Check projects[]
    const projects = config.projects || [];
    for (const project of projects) {
      if (slugify(project) === folderName) {
        return project;
      }
    }

    // v0.13.0+: Check areaPaths[]
    const areaPaths = config.areaPaths || [];
    for (const areaPath of areaPaths) {
      if (slugify(areaPath) === folderName) {
        return areaPath;
      }
    }
  } else if (profile.provider === 'jira') {
    const config = profile.config as JiraConfig;

    // v0.13.0+: Check projects[]
    const projects = config.projects || [];
    for (const projectKey of projects) {
      if (slugify(projectKey) === folderName) {
        return projectKey;
      }
    }

    // Fallback to projectKey
    if (config.projectKey && slugify(config.projectKey) === folderName) {
      return config.projectKey;
    }
  } else if (profile.provider === 'github') {
    const config = profile.config as GitHubConfig;

    // v0.13.0+: Check repos[]
    const repos = config.repos || [];
    for (const repo of repos) {
      if (slugify(repo) === folderName) {
        return repo;
      }
    }

    // Fallback to single repo
    if (config.repo && slugify(config.repo) === folderName) {
      return config.repo;
    }
  }

  return null;
}

// NOTE: The following was removed in v0.13.0+ migration:
// - config.teams (ADO): Use projects[] or areaPaths[] instead
// - config.strategy (Jira): Removed, use intelligent mapping
// - config.components (Jira): Use projects[] instead
// Please update any code that still references these fields.
