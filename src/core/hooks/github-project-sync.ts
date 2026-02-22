/**
 * GitHub Project Sync Wrapper
 *
 * Thin wrapper that invokes the GitHub feature sync CLI script.
 * Separated from LifecycleHookDispatcher for testability and to avoid
 * importing the GitHubFeatureSync class directly (which requires
 * GitHubClientV2 construction and config loading).
 *
 * Part of increment 0313: Post-closure sync pipeline
 */

import { resolve } from 'path';
import { existsSync } from 'fs';

/**
 * Sync a feature to GitHub Project by invoking the CLI script.
 * Throws on failure (caller should catch).
 */
export async function syncFeatureToGitHub(
  projectRoot: string,
  featureId: string,
): Promise<void> {
  const { execFileNoThrow } = await import('../../utils/execFileNoThrow.js');

  // Find the CLI script — check multiple locations
  const candidates = [
    resolve(projectRoot, 'plugins/specweave-github/lib/github-feature-sync-cli.js'),
    resolve(projectRoot, 'dist/plugins/specweave-github/lib/github-feature-sync-cli.js'),
    resolve(projectRoot, 'node_modules/specweave/plugins/specweave-github/lib/github-feature-sync-cli.js'),
  ];

  const cliPath = candidates.find((p) => existsSync(p));
  if (!cliPath) {
    throw new Error('GitHub feature sync CLI not found — specweave-github plugin may not be installed');
  }

  const result = await execFileNoThrow('node', [cliPath, featureId], {
    cwd: projectRoot,
    timeout: 30000,
  });

  if (result.exitCode !== 0) {
    throw new Error(`GitHub feature sync failed: ${result.stderr || result.stdout}`);
  }
}
