/**
 * Git Utilities for SpecWeave
 *
 * Provides utilities for:
 * - Getting recent commits
 * - Generating commit URLs for different providers
 * - Finding PRs containing commits
 * - Detecting repository information
 */

import { execFileNoThrow } from './execFileNoThrow.js';
import path from 'path';

export interface GitCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: Date;
  url?: string;
}

export interface GitRepository {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'unknown';
  owner: string;
  repo: string;
  url: string;
}

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed' | 'merged';
}

/**
 * Get recent commits since a specific date/SHA
 */
export async function getRecentCommits(
  since?: string,
  sinceCommit?: string,
  cwd?: string
): Promise<GitCommit[]> {
  const args = [
    'log',
    '--pretty=format:%H|%h|%s|%an|%aI',
    '--no-merges',
  ];

  if (sinceCommit) {
    // Get commits since specific commit (exclusive)
    args.push(`${sinceCommit}..HEAD`);
  } else if (since) {
    // Get commits since date
    args.push(`--since=${since}`);
  } else {
    // Default: last 24 hours
    args.push('--since=24.hours');
  }

  const result = await execFileNoThrow('git', args, { cwd });

  if (result.exitCode !== 0) {
    throw new Error(`Failed to get git commits: ${result.stderr || result.stdout}`);
  }

  const lines = result.stdout.trim().split('\n').filter(line => line.length > 0);

  return lines.map(line => {
    const [sha, shortSha, message, author, dateStr] = line.split('|');
    return {
      sha,
      shortSha,
      message,
      author,
      date: new Date(dateStr),
    };
  });
}

/**
 * Get commits between two refs (e.g., last sync to HEAD)
 */
export async function getCommitsBetween(
  fromRef: string,
  toRef: string = 'HEAD',
  cwd?: string
): Promise<GitCommit[]> {
  const args = [
    'log',
    '--pretty=format:%H|%h|%s|%an|%aI',
    '--no-merges',
    `${fromRef}..${toRef}`,
  ];

  const result = await execFileNoThrow('git', args, { cwd });

  if (result.exitCode !== 0) {
    throw new Error(`Failed to get git commits: ${result.stderr || result.stdout}`);
  }

  const lines = result.stdout.trim().split('\n').filter(line => line.length > 0);

  return lines.map(line => {
    const [sha, shortSha, message, author, dateStr] = line.split('|');
    return {
      sha,
      shortSha,
      message,
      author,
      date: new Date(dateStr),
    };
  });
}

/**
 * Detect repository information from git remote
 */
export async function detectRepository(
  remoteName: string = 'origin',
  cwd?: string
): Promise<GitRepository | null> {
  // Get remote URL
  const result = await execFileNoThrow('git', [
    'remote',
    'get-url',
    remoteName,
  ], { cwd });

  if (result.exitCode !== 0) {
    return null;
  }

  const remoteUrl = result.stdout.trim();

  // Parse different URL formats
  return parseGitRemoteUrl(remoteUrl);
}

/**
 * Parse git remote URL to extract provider, owner, repo
 */
export function parseGitRemoteUrl(url: string): GitRepository | null {
  // GitHub patterns
  const githubHttps = url.match(/https:\/\/github\.com\/(.+?)\/(.+?)(?:\.git)?$/);
  const githubSsh = url.match(/git@github\.com:(.+?)\/(.+?)(?:\.git)?$/);

  if (githubHttps || githubSsh) {
    const match = githubHttps || githubSsh;
    return {
      provider: 'github',
      owner: match![1],
      repo: match![2],
      url: `https://github.com/${match![1]}/${match![2]}`,
    };
  }

  // GitLab patterns
  const gitlabHttps = url.match(/https:\/\/gitlab\.com\/(.+?)\/(.+?)(?:\.git)?$/);
  const gitlabSsh = url.match(/git@gitlab\.com:(.+?)\/(.+?)(?:\.git)?$/);

  if (gitlabHttps || gitlabSsh) {
    const match = gitlabHttps || gitlabSsh;
    return {
      provider: 'gitlab',
      owner: match![1],
      repo: match![2],
      url: `https://gitlab.com/${match![1]}/${match![2]}`,
    };
  }

  // Bitbucket patterns
  const bitbucketHttps = url.match(/https:\/\/bitbucket\.org\/(.+?)\/(.+?)(?:\.git)?$/);
  const bitbucketSsh = url.match(/git@bitbucket\.org:(.+?)\/(.+?)(?:\.git)?$/);

  if (bitbucketHttps || bitbucketSsh) {
    const match = bitbucketHttps || bitbucketSsh;
    return {
      provider: 'bitbucket',
      owner: match![1],
      repo: match![2],
      url: `https://bitbucket.org/${match![1]}/${match![2]}`,
    };
  }

  // Azure DevOps patterns
  const azureHttps = url.match(/https:\/\/dev\.azure\.com\/(.+?)\/_git\/(.+?)(?:\.git)?$/);
  const azureSsh = url.match(/git@ssh\.dev\.azure\.com:v3\/(.+?)\/(.+?)\/(.+?)(?:\.git)?$/);

  if (azureHttps) {
    return {
      provider: 'azure',
      owner: azureHttps[1],
      repo: azureHttps[2],
      url: `https://dev.azure.com/${azureHttps[1]}/_git/${azureHttps[2]}`,
    };
  }

  if (azureSsh) {
    return {
      provider: 'azure',
      owner: azureSsh[1],
      repo: azureSsh[3],
      url: `https://dev.azure.com/${azureSsh[1]}/_git/${azureSsh[3]}`,
    };
  }

  return null;
}

/**
 * Generate commit URL for different providers
 */
export function getCommitUrl(
  commit: GitCommit,
  repo: GitRepository
): string {
  switch (repo.provider) {
    case 'github':
      return `${repo.url}/commit/${commit.sha}`;
    case 'gitlab':
      return `${repo.url}/-/commit/${commit.sha}`;
    case 'bitbucket':
      return `${repo.url}/commits/${commit.sha}`;
    case 'azure':
      return `${repo.url}/commit/${commit.sha}`;
    default:
      return commit.sha;
  }
}

/**
 * Find PR containing a commit (GitHub only for now)
 */
export async function findPRForCommit(
  commitSha: string,
  owner: string,
  repo: string
): Promise<PullRequest | null> {
  // Check if gh CLI is available
  const ghCheck = await execFileNoThrow('gh', ['--version']);
  if (ghCheck.exitCode !== 0) {
    return null;
  }

  // Search for PR containing this commit
  const result = await execFileNoThrow('gh', [
    'pr',
    'list',
    '--repo',
    `${owner}/${repo}`,
    '--search',
    commitSha,
    '--json',
    'number,title,url,state',
    '--limit',
    '1',
  ]);

  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return null;
  }

  try {
    const prs = JSON.parse(result.stdout);
    if (prs.length === 0) {
      return null;
    }

    const pr = prs[0];
    return {
      number: pr.number,
      title: pr.title,
      url: pr.url,
      state: pr.state.toLowerCase() as 'open' | 'closed' | 'merged',
    };
  } catch {
    return null;
  }
}

/**
 * Get last sync commit SHA from metadata
 */
export async function getLastSyncCommit(
  metadataPath: string
): Promise<string | null> {
  try {
    const fs = await import('fs/promises');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    return metadata.lastSyncCommit || null;
  } catch {
    return null;
  }
}

/**
 * Update last sync commit in metadata
 */
export async function updateLastSyncCommit(
  metadataPath: string,
  commitSha: string
): Promise<void> {
  try {
    const fs = await import('fs/promises');
    let metadata: any = {};

    try {
      metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    } catch {
      // File doesn't exist or invalid JSON, start fresh
    }

    metadata.lastSyncCommit = commitSha;
    metadata.lastSyncDate = new Date().toISOString();

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  } catch (error: any) {
    throw new Error(`Failed to update last sync commit: ${error.message}`);
  }
}

/**
 * Get current HEAD commit SHA
 */
export async function getCurrentCommitSha(cwd?: string): Promise<string> {
  const result = await execFileNoThrow('git', ['rev-parse', 'HEAD'], { cwd });

  if (result.exitCode !== 0) {
    throw new Error(`Failed to get current commit SHA: ${result.stderr || result.stdout}`);
  }

  return result.stdout.trim();
}

/**
 * Check if working directory is clean
 */
export async function isWorkingDirectoryClean(cwd?: string): Promise<boolean> {
  const result = await execFileNoThrow('git', ['status', '--porcelain'], { cwd });

  return result.exitCode === 0 && result.stdout.trim().length === 0;
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(cwd?: string): Promise<string> {
  const result = await execFileNoThrow('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });

  if (result.exitCode !== 0) {
    throw new Error(`Failed to get current branch: ${result.stderr || result.stdout}`);
  }

  return result.stdout.trim();
}
