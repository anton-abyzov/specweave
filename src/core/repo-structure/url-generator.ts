/**
 * Git Remote URL Generator
 *
 * Generates platform-agnostic Git remote URLs in SSH or HTTPS format.
 * Supports GitHub, GitLab, Bitbucket, and custom Git platforms.
 *
 * @module url-generator
 */

export type UrlType = 'ssh' | 'https';

export interface GitPlatform {
  host: string;  // e.g., 'github.com', 'gitlab.com', 'bitbucket.org'
  sshUser?: string;  // e.g., 'git' (default), 'hg' for Bitbucket
}

/**
 * Generate Git remote URL in SSH or HTTPS format
 *
 * @param owner - Repository owner/organization
 * @param repo - Repository name
 * @param urlType - 'ssh' or 'https'
 * @param platform - Git platform configuration
 * @returns Formatted Git remote URL
 *
 * @example
 * ```typescript
 * // SSH format
 * generateGitRemoteUrl('myorg', 'myrepo', 'ssh', { host: 'github.com' })
 * // => 'git@github.com:myorg/myrepo.git'
 *
 * // HTTPS format
 * generateGitRemoteUrl('myorg', 'myrepo', 'https', { host: 'github.com' })
 * // => 'https://github.com/myorg/myrepo.git'
 *
 * // GitLab SSH
 * generateGitRemoteUrl('myorg', 'myrepo', 'ssh', { host: 'gitlab.com' })
 * // => 'git@gitlab.com:myorg/myrepo.git'
 *
 * // Self-hosted GitLab HTTPS
 * generateGitRemoteUrl('myorg', 'myrepo', 'https', { host: 'gitlab.company.com' })
 * // => 'https://gitlab.company.com/myorg/myrepo.git'
 * ```
 */
export function generateGitRemoteUrl(
  owner: string,
  repo: string,
  urlType: UrlType,
  platform: GitPlatform = { host: 'github.com' }
): string {
  const sshUser = platform.sshUser || 'git';

  if (urlType === 'ssh') {
    return `${sshUser}@${platform.host}:${owner}/${repo}.git`;
  } else {
    return `https://${platform.host}/${owner}/${repo}.git`;
  }
}

/**
 * Parse existing Git remote URL to extract components
 *
 * @param url - Git remote URL (SSH or HTTPS)
 * @returns Parsed components or null if invalid
 *
 * @example
 * ```typescript
 * parseGitRemoteUrl('git@github.com:myorg/myrepo.git')
 * // => { owner: 'myorg', repo: 'myrepo', urlType: 'ssh', host: 'github.com' }
 *
 * parseGitRemoteUrl('https://gitlab.com/myorg/myrepo.git')
 * // => { owner: 'myorg', repo: 'myrepo', urlType: 'https', host: 'gitlab.com' }
 * ```
 */
export function parseGitRemoteUrl(url: string): {
  owner: string;
  repo: string;
  urlType: UrlType;
  host: string;
} | null {
  // SSH format: git@github.com:owner/repo.git
  const sshMatch = url.match(/^(?:[\w-]+)@([\w.-]+):([\w-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (sshMatch) {
    return {
      host: sshMatch[1],
      owner: sshMatch[2],
      repo: sshMatch[3],
      urlType: 'ssh'
    };
  }

  // HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = url.match(/^https?:\/\/([\w.-]+)\/([\w-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return {
      host: httpsMatch[1],
      owner: httpsMatch[2],
      repo: httpsMatch[3],
      urlType: 'https'
    };
  }

  return null;
}

/**
 * Detect Git platform from hostname
 *
 * @param host - Hostname (e.g., 'github.com', 'gitlab.company.com')
 * @returns Platform name or 'unknown'
 *
 * @example
 * ```typescript
 * detectGitPlatform('github.com')       // => 'github'
 * detectGitPlatform('gitlab.com')       // => 'gitlab'
 * detectGitPlatform('bitbucket.org')    // => 'bitbucket'
 * detectGitPlatform('gitlab.internal')  // => 'gitlab' (self-hosted)
 * detectGitPlatform('git.company.com')  // => 'unknown'
 * ```
 */
export function detectGitPlatform(host: string): 'github' | 'gitlab' | 'bitbucket' | 'azure-devops' | 'unknown' {
  if (host.includes('github')) return 'github';
  if (host.includes('gitlab')) return 'gitlab';
  if (host.includes('bitbucket')) return 'bitbucket';
  if (host.includes('dev.azure.com') || host.includes('visualstudio.com')) return 'azure-devops';
  return 'unknown';
}
