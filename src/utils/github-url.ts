/**
 * GitHub URL Utilities
 *
 * Utilities for converting local file paths to GitHub URLs.
 */

export interface GitHubUrlOptions {
  owner: string;
  repo: string;
  branch?: string;
}

/**
 * Convert local file path to GitHub URL
 *
 * @param localPath - Local file path (can start with ./ or be absolute)
 * @param options - GitHub repository options
 * @returns Full GitHub URL
 *
 * @example
 * ```typescript
 * toGitHubUrl('.specweave/docs/internal/specs/default/FS-001/FEATURE.md', {
 *   owner: 'anton-abyzov',
 *   repo: 'specweave',
 *   branch: 'develop'
 * });
 * // => 'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/default/FS-001/FEATURE.md'
 * ```
 */
export function toGitHubUrl(localPath: string, options: GitHubUrlOptions): string {
  const { owner, repo, branch = 'develop' } = options;

  // Remove leading ./ but keep .specweave folder name
  let cleanPath = localPath.replace(/^\.\//, '');

  // If path doesn't start with .specweave, add it
  if (!cleanPath.startsWith('.specweave')) {
    cleanPath = `.specweave/${cleanPath}`;
  }

  return `https://github.com/${owner}/${repo}/blob/${branch}/${cleanPath}`;
}

/**
 * Convert local directory path to GitHub tree URL
 *
 * @param localPath - Local directory path
 * @param options - GitHub repository options
 * @returns Full GitHub tree URL
 *
 * @example
 * ```typescript
 * toGitHubTreeUrl('.specweave/increments/0001-feature', {
 *   owner: 'anton-abyzov',
 *   repo: 'specweave',
 *   branch: 'develop'
 * });
 * // => 'https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments/0001-feature'
 * ```
 */
export function toGitHubTreeUrl(localPath: string, options: GitHubUrlOptions): string {
  const { owner, repo, branch = 'develop' } = options;

  // Remove leading ./ but keep .specweave folder name
  let cleanPath = localPath.replace(/^\.\//, '');

  // If path doesn't start with .specweave, add it
  if (!cleanPath.startsWith('.specweave')) {
    cleanPath = `.specweave/${cleanPath}`;
  }

  return `https://github.com/${owner}/${repo}/tree/${branch}/${cleanPath}`;
}

/**
 * Get GitHub URL options from git remote
 *
 * @returns GitHub URL options or null if not a GitHub repository
 */
export async function getGitHubOptions(): Promise<GitHubUrlOptions | null> {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    // Get remote URL
    const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin']);
    const remoteUrl = stdout.trim();

    // Parse GitHub URL (supports both HTTPS and SSH)
    // HTTPS: https://github.com/owner/repo.git
    // SSH: git@github.com:owner/repo.git
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);

    if (!match) {
      return null;
    }

    const [, owner, repo] = match;

    // Get current branch
    const { stdout: branchOutput } = await execFileAsync('git', ['branch', '--show-current']);
    const branch = branchOutput.trim() || 'develop';

    return { owner, repo, branch };
  } catch (error) {
    return null;
  }
}
