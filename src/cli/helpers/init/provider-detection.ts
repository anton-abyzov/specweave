/**
 * Provider and credential auto-detection for init flow
 *
 * Detects git provider from .git/config remote URL and
 * checks for existing credentials (gh auth, .env, env vars).
 *
 * Part of 0200-init-two-phase-redesign
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import { parseEnvFile } from '../../../utils/env-file.js';
import { execFileNoThrowSync } from '../../../utils/execFileNoThrow.js';

export interface ProviderInfo {
  provider: 'github' | 'ado' | 'bitbucket';
  owner?: string;
  repo?: string;
  organization?: string;
}

/**
 * Detect git provider from .git/config remote URL
 *
 * Supports GitHub, Azure DevOps, and Bitbucket remotes (HTTPS + SSH).
 */
export function detectProvider(targetDir: string): ProviderInfo | null {
  try {
    const gitConfigPath = path.join(targetDir, '.git', 'config');
    if (!fs.existsSync(gitConfigPath)) {
      return null;
    }

    const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');

    // GitHub HTTPS: https://github.com/owner/repo.git
    const ghHttps = gitConfig.match(/https:\/\/github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?(?:\s|$)/);
    if (ghHttps) {
      return { provider: 'github', owner: ghHttps[1], repo: ghHttps[2].replace(/\.git$/, '') };
    }

    // GitHub SSH: git@github.com:owner/repo.git
    const ghSsh = gitConfig.match(/git@github\.com:([^/]+)\/([^/\s]+?)(?:\.git)?(?:\s|$)/);
    if (ghSsh) {
      return { provider: 'github', owner: ghSsh[1], repo: ghSsh[2].replace(/\.git$/, '') };
    }

    // ADO HTTPS: https://dev.azure.com/org/project/_git/repo
    const adoHttps = gitConfig.match(/https:\/\/dev\.azure\.com\/([^/]+)\//);
    if (adoHttps) {
      return { provider: 'ado', organization: adoHttps[1] };
    }

    // ADO SSH: git@ssh.dev.azure.com:v3/org/project/repo
    const adoSsh = gitConfig.match(/git@ssh\.dev\.azure\.com:v3\/([^/]+)\//);
    if (adoSsh) {
      return { provider: 'ado', organization: adoSsh[1] };
    }

    // ADO legacy: https://org.visualstudio.com/project/_git/repo
    const adoLegacy = gitConfig.match(/https:\/\/([^.]+)\.visualstudio\.com\//);
    if (adoLegacy) {
      return { provider: 'ado', organization: adoLegacy[1] };
    }

    // Bitbucket HTTPS: https://bitbucket.org/workspace/repo.git
    const bbHttps = gitConfig.match(/https:\/\/bitbucket\.org\/([^/]+)\/([^/\s]+?)(?:\.git)?(?:\s|$)/);
    if (bbHttps) {
      return { provider: 'bitbucket', owner: bbHttps[1], repo: bbHttps[2].replace(/\.git$/, '') };
    }

    // Bitbucket SSH: git@bitbucket.org:workspace/repo.git
    const bbSsh = gitConfig.match(/git@bitbucket\.org:([^/]+)\/([^/\s]+?)(?:\.git)?(?:\s|$)/);
    if (bbSsh) {
      return { provider: 'bitbucket', owner: bbSsh[1], repo: bbSsh[2].replace(/\.git$/, '') };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get environment variable from process.env or .env file
 */
function getEnvVar(targetDir: string, ...varNames: string[]): string | undefined {
  for (const name of varNames) {
    if (process.env[name]) {
      return process.env[name];
    }
  }

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
 * Detect existing credentials for a given provider
 *
 * Priority: gh auth token → .env → process.env
 * Returns the token string or null if not found.
 */
export function detectCredentials(targetDir: string, provider: string): string | null {
  if (provider === 'github') {
    // Try gh auth token first (fastest path for GitHub users)
    try {
      const result = execFileNoThrowSync('gh', ['auth', 'token']);
      const token = result.stdout?.trim();
      if (token && result.exitCode === 0) {
        return token;
      }
    } catch {
      // gh not installed or not authenticated
    }

    // Check .env and process.env
    const envToken = getEnvVar(targetDir, 'GITHUB_TOKEN', 'GH_TOKEN');
    return envToken || null;
  }

  if (provider === 'ado') {
    const pat = getEnvVar(targetDir, 'AZURE_DEVOPS_PAT', 'ADO_PAT');
    return pat || null;
  }

  if (provider === 'bitbucket') {
    const token = getEnvVar(targetDir, 'BITBUCKET_TOKEN', 'BITBUCKET_APP_PASSWORD');
    return token || null;
  }

  return null;
}
