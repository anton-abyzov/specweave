/**
 * Git Providers Index
 *
 * Exports all Git provider implementations and provides
 * initialization functions.
 *
 * @module providers
 */

export { GitHubProvider, createGitHubProvider } from './github-provider.js';
export { GitLabProvider, createGitLabProvider } from './gitlab-provider.js';
export { BitbucketProvider, createBitbucketProvider } from './bitbucket-provider.js';

import { getPlatformRegistry } from '../platform-registry.js';
import { createGitHubProvider } from './github-provider.js';
import { createGitLabProvider } from './gitlab-provider.js';
import { createBitbucketProvider } from './bitbucket-provider.js';

/**
 * Initialize and register all Git providers
 *
 * Call this once during application initialization to make
 * all providers available through the platform registry.
 */
export function initializeProviders(): void {
  const registry = getPlatformRegistry();

  // Register GitHub provider (fully supported)
  registry.registerProvider('github', createGitHubProvider());

  // Register GitLab provider (stub - coming soon)
  registry.registerProvider('gitlab', createGitLabProvider());

  // Register Bitbucket provider (stub - coming soon)
  registry.registerProvider('bitbucket', createBitbucketProvider());
}

/**
 * Get provider by platform type (convenience function)
 *
 * @param platform - Platform type
 * @returns Provider instance or undefined
 */
export function getProvider(platform: 'github' | 'gitlab' | 'bitbucket') {
  const registry = getPlatformRegistry();
  return registry.getProvider(platform);
}
