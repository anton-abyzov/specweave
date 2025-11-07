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

    if (config.teams && config.teams.length > 0) {
      // Multiple teams → multiple folders
      for (const team of config.teams) {
        const folderName = slugify(team); // "Platform Engineering Team" → "platform-engineering-team"
        folders.push(`.specweave/docs/internal/specs/${folderName}`);
      }
    } else {
      // Single project, no teams specified → default folder
      const folderName = slugify(config.project);
      folders.push(`.specweave/docs/internal/specs/${folderName}`);
    }
  } else if (profile.provider === 'jira') {
    const config = profile.config as JiraConfig;

    if (config.strategy === 'project-per-team') {
      // Multiple projects → multiple folders
      for (const projectKey of config.projects || []) {
        const folderName = slugify(projectKey); // "FRONTEND" → "frontend"
        folders.push(`.specweave/docs/internal/specs/${folderName}`);
      }
    } else if (config.strategy === 'shared-project-with-components') {
      // Components → multiple folders
      for (const component of config.components || []) {
        const folderName = slugify(component); // "Frontend" → "frontend"
        folders.push(`.specweave/docs/internal/specs/${folderName}`);
      }
    } else {
      // Fallback: single project → single folder
      const folderName = slugify(config.projectKey || 'default');
      folders.push(`.specweave/docs/internal/specs/${folderName}`);
    }
  } else if (profile.provider === 'github') {
    const config = profile.config as GitHubConfig;
    const folderName = slugify(config.repo); // "specweave" → "specweave"
    folders.push(`.specweave/docs/internal/specs/${folderName}`);
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
    const teams = config.teams || [];

    for (const team of teams) {
      if (slugify(team) === folderName) {
        return team;
      }
    }
  } else if (profile.provider === 'jira') {
    const config = profile.config as JiraConfig;

    if (config.strategy === 'project-per-team') {
      const projects = config.projects || [];
      for (const projectKey of projects) {
        if (slugify(projectKey) === folderName) {
          return projectKey;
        }
      }
    } else if (config.strategy === 'shared-project-with-components') {
      const components = config.components || [];
      for (const component of components) {
        if (slugify(component) === folderName) {
          return component;
        }
      }
    }
  }

  return null;
}
