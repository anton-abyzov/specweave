/**
 * Configuration detection utilities
 * Detects GitHub, JIRA, and Azure DevOps configurations
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import { parseEnvFile } from '../../../utils/env-file.js';
import type { GitHubRemote, JiraConfig, ADOConfig } from './types.js';

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
  try {
    // Check environment variables first
    const envHost = process.env.JIRA_HOST;
    const envEmail = process.env.JIRA_EMAIL;
    const envToken = process.env.JIRA_API_TOKEN;

    if (envHost && envEmail && envToken) {
      return { host: envHost, email: envEmail, apiToken: envToken };
    }

    // Check .env file
    const envPath = path.join(targetDir, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envVars = parseEnvFile(envContent);

      const fileHost = envVars.JIRA_HOST;
      const fileEmail = envVars.JIRA_EMAIL;
      const fileToken = envVars.JIRA_API_TOKEN;

      if (fileHost && fileEmail && fileToken) {
        return { host: fileHost, email: fileEmail, apiToken: fileToken };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect Azure DevOps configuration from environment or .env file
 *
 * @param targetDir - Project directory to check
 * @returns ADO config or null if not detected
 */
export function detectADOConfig(targetDir: string): ADOConfig | null {
  try {
    // Check environment variables first
    const envOrgUrl = process.env.ADO_ORG_URL;
    const envProject = process.env.ADO_PROJECT;
    const envPat = process.env.ADO_PAT || process.env.AZURE_DEVOPS_PAT;

    if (envOrgUrl && envProject && envPat) {
      return { orgUrl: envOrgUrl, project: envProject, pat: envPat };
    }

    // Check .env file
    const envPath = path.join(targetDir, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envVars = parseEnvFile(envContent);

      const fileOrgUrl = envVars.ADO_ORG_URL;
      const fileProject = envVars.ADO_PROJECT;
      const filePat = envVars.ADO_PAT || envVars.AZURE_DEVOPS_PAT;

      if (fileOrgUrl && fileProject && filePat) {
        return { orgUrl: fileOrgUrl, project: fileProject, pat: filePat };
      }
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
