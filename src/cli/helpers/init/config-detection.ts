/**
 * Configuration detection utilities
 * Detects GitHub, JIRA, and Azure DevOps configurations
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import { parseEnvFile } from '../../../utils/env-file.js';
import type { GitHubRemote, JiraConfig, ADOConfig } from './types.js';

/**
 * Get environment variable from process.env or .env file
 */
function getEnvVar(targetDir: string, ...varNames: string[]): string | undefined {
  // Check process.env first
  for (const name of varNames) {
    if (process.env[name]) {
      return process.env[name];
    }
  }

  // Check .env file
  const envPath = path.join(targetDir, '.env');
  if (!fs.existsSync(envPath)) {
    return undefined;
  }

  try {
    const envVars = parseEnvFile(fs.readFileSync(envPath, 'utf-8'));
    for (const name of varNames) {
      if (envVars[name]) {
        return envVars[name];
      }
    }
  } catch {
    // Ignore parse errors
  }

  return undefined;
}

/**
 * Detect GitHub repository owner and name from git remote
 * Parses .git/config to extract GitHub remote URL
 *
 * @param targetDir - Project directory to check
 * @returns GitHub remote info or null if not detected
 */
export function detectGitHubRemote(targetDir: string): GitHubRemote | null {
  try {
    const gitConfigPath = path.join(targetDir, '.git', 'config');
    if (!fs.existsSync(gitConfigPath)) {
      return null;
    }

    const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');

    // Match GitHub remote URLs (both HTTPS and SSH)
    // HTTPS: https://github.com/owner/repo.git
    // SSH: git@github.com:owner/repo.git
    const httpsMatch = gitConfig.match(/https:\/\/github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?(?:\s|$)/);
    const sshMatch = gitConfig.match(/git@github\.com:([^/]+)\/([^/\s]+?)(?:\.git)?(?:\s|$)/);

    const match = httpsMatch || sshMatch;
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '')
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect JIRA configuration from environment or .env file
 *
 * @param targetDir - Project directory to check
 * @returns JIRA config or null if not detected
 */
export function detectJiraConfig(targetDir: string): JiraConfig | null {
  const host = getEnvVar(targetDir, 'JIRA_HOST');
  const email = getEnvVar(targetDir, 'JIRA_EMAIL');
  const apiToken = getEnvVar(targetDir, 'JIRA_API_TOKEN');

  if (host && email && apiToken) {
    return { host, email, apiToken };
  }

  return null;
}

/**
 * Detect Azure DevOps configuration from config.json + .env
 *
 * NEW (v0.28.x): ADO config is split:
 * - PAT (secret) → .env as AZURE_DEVOPS_PAT
 * - org/project/teams/areas (non-secret) → config.json sync profiles
 *
 * CRITICAL FIX (2025-12-01): Aggregate ALL ADO profiles into projects array
 * Bug: Only one profile was being read, causing multi-project selection to be ignored
 * Fix: Find all ADO profiles and build projects array from each profile's config
 *
 * @param targetDir - Project directory to check
 * @returns ADO config or null if not detected
 */
export function detectADOConfig(targetDir: string): ADOConfig | null {
  try {
    // 1. Get PAT from environment or .env (secret)
    const pat = getEnvVar(targetDir, 'AZURE_DEVOPS_PAT', 'ADO_PAT');
    if (!pat) {
      return null;
    }

    // 2. Get org/project from config.json (non-secrets)
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // CRITICAL FIX: Find ALL ADO profiles and aggregate into projects array
      // Each profile represents one ADO project with its area paths
      const profiles = config.sync?.profiles || {};
      const adoProfiles = Object.entries(profiles).filter(
        ([, p]: [string, any]) => p.provider === 'ado'
      ) as Array<[string, any]>;

      if (adoProfiles.length > 0) {
        // Get organization from first profile (all profiles share the same org)
        const firstProfile = adoProfiles[0][1];
        const organization = firstProfile.config?.organization;

        if (!organization) {
          return null;
        }

        // Build projects array from ALL ADO profiles
        const projectsFromProfiles: Array<{
          name: string;
          areaPaths?: string[];
          isDefault?: boolean;
          isUmbrella?: boolean;
        }> = [];

        for (const [profileId, profile] of adoProfiles) {
          const profileConfig = profile.config || {};
          const projectName = profileConfig.project;

          if (projectName) {
            projectsFromProfiles.push({
              name: projectName,
              areaPaths: profileConfig.areaPaths,
              isDefault: profileId === config.sync?.defaultProfile,
              isUmbrella: profileConfig.isUmbrella
            });
          }
        }

        // Determine primary project for backwards compatibility
        const defaultProject = projectsFromProfiles.find(p => p.isDefault) || projectsFromProfiles[0];
        const primaryProject = defaultProject?.name;

        if (primaryProject) {
          // Get additional fields from first profile for backwards compat
          const { teams, strategy } = firstProfile.config || {};

          return {
            orgUrl: `https://dev.azure.com/${organization}`,
            project: primaryProject,
            pat,
            teams,
            areaPaths: defaultProject?.areaPaths,
            strategy,
            // Pass the aggregated projects array for multi-project import
            projects: projectsFromProfiles.length > 0 ? projectsFromProfiles : undefined
          };
        }
      }
    }

    // 3. Fallback: Check env vars (AZURE_DEVOPS_* and ADO_* patterns)
    const orgUrl = getEnvVar(targetDir, 'AZURE_DEVOPS_ORG_URL', 'ADO_ORG_URL', 'AZURE_DEVOPS_ORG');
    const project = getEnvVar(targetDir, 'AZURE_DEVOPS_PROJECT', 'ADO_PROJECT');
    const projects = getEnvVar(targetDir, 'AZURE_DEVOPS_PROJECTS', 'ADO_PROJECTS');

    if (orgUrl && (project || projects)) {
      // Parse org name from URL if needed (https://dev.azure.com/ORG -> ORG)
      const normalizedOrgUrl = orgUrl.startsWith('https://') ? orgUrl : `https://dev.azure.com/${orgUrl}`;
      return {
        orgUrl: normalizedOrgUrl,
        project: project || projects?.split(',')[0]?.trim() || '',
        pat
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect all available external tool configurations
 *
 * @param targetDir - Project directory to check
 * @returns Object with detected configurations
 */
export function detectAllConfigs(targetDir: string): {
  github: GitHubRemote | null;
  jira: JiraConfig | null;
  ado: ADOConfig | null;
  availableTools: string[];
} {
  const github = detectGitHubRemote(targetDir);
  const jira = detectJiraConfig(targetDir);
  const ado = detectADOConfig(targetDir);

  const availableTools: string[] = [];
  if (github) availableTools.push('GitHub');
  if (jira) availableTools.push('JIRA');
  if (ado) availableTools.push('Azure DevOps');

  return { github, jira, ado, availableTools };
}
