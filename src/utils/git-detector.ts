/**
 * Git Remote Detection Utilities
 *
 * Detects and parses git remotes to auto-configure repository settings
 *
 * @module utils/git-detector
 */

import { execFileNoThrowSync } from './execFileNoThrow.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a parsed git remote
 */
export interface GitRemote {
  name: string;        // e.g., "origin", "upstream"
  url: string;         // Full URL
  owner?: string;      // Extracted owner/organization
  repo?: string;       // Extracted repo name
  provider: 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'unknown';
}

/**
 * Result of git remote detection
 */
export interface GitDetectionResult {
  remotes: GitRemote[];
  hasGit: boolean;
  error?: string;
}

/**
 * Parse a git URL to extract provider, owner, and repo
 *
 * Supports:
 * - HTTPS: https://github.com/owner/repo.git
 * - SSH: git@github.com:owner/repo.git
 * - SSH with protocol: ssh://git@github.com/owner/repo.git
 * - GitHub Enterprise: https://github.company.com/owner/repo.git
 *
 * @param url - Git remote URL
 * @returns Parsed remote information
 */
export function parseGitUrl(url: string): Partial<GitRemote> {
  const result: Partial<GitRemote> = {
    url,
    provider: 'unknown'
  };

  // Remove trailing .git if present
  const cleanUrl = url.replace(/\.git$/, '');

  // GitHub patterns
  const githubPatterns = [
    // HTTPS: https://github.com/owner/repo
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)$/,
    // SSH: git@github.com:owner/repo
    /^git@github\.com:([^\/]+)\/([^\/]+)$/,
    // SSH with protocol: ssh://git@github.com/owner/repo
    /^ssh:\/\/git@github\.com\/([^\/]+)\/([^\/]+)$/,
    // GitHub Enterprise: https://github.company.com/owner/repo
    /^https?:\/\/github\.[^\/]+\/([^\/]+)\/([^\/]+)$/,
    // GitHub Enterprise SSH: git@github.company.com:owner/repo
    /^git@github\.[^:]+:([^\/]+)\/([^\/]+)$/
  ];

  for (const pattern of githubPatterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      result.provider = 'github';
      result.owner = match[1];
      result.repo = match[2];
      return result;
    }
  }

  // GitLab patterns
  const gitlabPatterns = [
    // HTTPS: https://gitlab.com/owner/repo
    /^https?:\/\/gitlab\.com\/([^\/]+)\/([^\/]+)$/,
    // SSH: git@gitlab.com:owner/repo
    /^git@gitlab\.com:([^\/]+)\/([^\/]+)$/,
    // Self-hosted GitLab
    /^https?:\/\/gitlab\.[^\/]+\/([^\/]+)\/([^\/]+)$/,
    /^git@gitlab\.[^:]+:([^\/]+)\/([^\/]+)$/
  ];

  for (const pattern of gitlabPatterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      result.provider = 'gitlab';
      result.owner = match[1];
      result.repo = match[2];
      return result;
    }
  }

  // Bitbucket patterns
  const bitbucketPatterns = [
    // HTTPS: https://bitbucket.org/owner/repo
    /^https?:\/\/bitbucket\.org\/([^\/]+)\/([^\/]+)$/,
    // SSH: git@bitbucket.org:owner/repo
    /^git@bitbucket\.org:([^\/]+)\/([^\/]+)$/
  ];

  for (const pattern of bitbucketPatterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      result.provider = 'bitbucket';
      result.owner = match[1];
      result.repo = match[2];
      return result;
    }
  }

  // Azure DevOps patterns
  const azurePatterns = [
    // HTTPS: https://dev.azure.com/org/project/_git/repo
    /^https?:\/\/dev\.azure\.com\/([^\/]+)\/[^\/]+\/_git\/([^\/]+)$/,
    // SSH: git@ssh.dev.azure.com:v3/org/project/repo
    /^git@ssh\.dev\.azure\.com:v3\/([^\/]+)\/[^\/]+\/([^\/]+)$/,
    // Old visualstudio.com format
    /^https?:\/\/([^\.]+)\.visualstudio\.com\/[^\/]+\/_git\/([^\/]+)$/
  ];

  for (const pattern of azurePatterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      result.provider = 'azure';
      result.owner = match[1];
      result.repo = match[2];
      return result;
    }
  }

  return result;
}

/**
 * Detect git remotes in a project directory
 *
 * @param projectPath - Path to the project directory
 * @returns Detection result with all remotes
 */
export async function detectGitRemotes(projectPath: string): Promise<GitDetectionResult> {
  // Check if .git directory exists
  const gitDir = path.join(projectPath, '.git');
  if (!fs.existsSync(gitDir)) {
    return {
      remotes: [],
      hasGit: false,
      error: 'Not a git repository'
    };
  }

  // Run git remote -v to get all remotes
  const result = execFileNoThrowSync('git', ['remote', '-v'], {
    cwd: projectPath
  });

  if (!result.success) {
    return {
      remotes: [],
      hasGit: true,
      error: result.stderr || 'Failed to get git remotes'
    };
  }

  // Parse the output
  const lines = (result.stdout || '').split('\n').filter(line => line.trim());
  const remotesMap = new Map<string, GitRemote>();

  for (const line of lines) {
    // Format: origin  https://github.com/owner/repo.git (fetch)
    // Format: origin  git@github.com:owner/repo.git (push)
    const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (match) {
      const [, name, url, type] = match;

      // We only care about fetch URLs (avoid duplicates)
      if (type === 'fetch') {
        const parsedInfo = parseGitUrl(url);
        const remote: GitRemote = {
          name,
          url,
          provider: parsedInfo.provider || 'unknown',
          owner: parsedInfo.owner,
          repo: parsedInfo.repo
        };
        remotesMap.set(name, remote);
      }
    }
  }

  return {
    remotes: Array.from(remotesMap.values()),
    hasGit: true
  };
}

/**
 * Get GitHub remotes only
 *
 * @param projectPath - Path to the project directory
 * @returns Array of GitHub remotes
 */
export async function detectGitHubRemotes(projectPath: string): Promise<GitRemote[]> {
  const result = await detectGitRemotes(projectPath);
  return result.remotes.filter(r => r.provider === 'github');
}

/**
 * Detect primary GitHub remote (prefer 'origin')
 *
 * @param projectPath - Path to the project directory
 * @returns Primary GitHub remote or null
 */
export async function detectPrimaryGitHubRemote(projectPath: string): Promise<GitRemote | null> {
  const githubRemotes = await detectGitHubRemotes(projectPath);

  if (githubRemotes.length === 0) {
    return null;
  }

  // Prefer 'origin' if it exists
  const origin = githubRemotes.find(r => r.name === 'origin');
  if (origin) {
    return origin;
  }

  // Otherwise return the first GitHub remote
  return githubRemotes[0];
}

/**
 * Check if project has multiple GitHub remotes
 *
 * @param projectPath - Path to the project directory
 * @returns True if multiple GitHub remotes exist
 */
export async function hasMultipleGitHubRemotes(projectPath: string): Promise<boolean> {
  const githubRemotes = await detectGitHubRemotes(projectPath);
  return githubRemotes.length > 1;
}

/**
 * Format git remote for display
 *
 * @param remote - Git remote to format
 * @returns Formatted string for display
 */
export function formatGitRemote(remote: GitRemote): string {
  if (remote.owner && remote.repo) {
    return `${remote.name}: ${remote.owner}/${remote.repo} (${remote.provider})`;
  }
  return `${remote.name}: ${remote.url} (${remote.provider})`;
}

/**
 * Get unique repository identifiers from remotes
 *
 * @param remotes - Array of git remotes
 * @returns Array of unique owner/repo combinations
 */
export function getUniqueRepositories(remotes: GitRemote[]): Array<{ owner: string; repo: string }> {
  const seen = new Set<string>();
  const unique: Array<{ owner: string; repo: string }> = [];

  for (const remote of remotes) {
    if (remote.owner && remote.repo) {
      const key = `${remote.owner}/${remote.repo}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({ owner: remote.owner, repo: remote.repo });
      }
    }
  }

  return unique;
}