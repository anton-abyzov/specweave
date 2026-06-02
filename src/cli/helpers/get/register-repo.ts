/**
 * Register Helper for `specweave get`
 *
 * Registers a repository in the umbrella config.json.
 * Uses persistUmbrellaConfig for dedup-safe merges.
 */

import * as fs from 'fs';
import * as path from 'path';
import { persistUmbrellaConfig } from '../../../core/living-docs/umbrella-detector.js';

export interface RegisterOptions {
  prefix?: string;
  role?: string;
  githubUrl?: string;
}

export interface RegisterResult {
  registered: boolean;
  alreadyRegistered: boolean;
}

/**
 * Register a repository in the umbrella config.
 * Idempotent: if repo is already in childRepos by id, returns alreadyRegistered=true.
 */
export async function registerRepo(
  projectRoot: string,
  owner: string,
  repoName: string,
  repoPath: string,
  options: RegisterOptions = {},
): Promise<RegisterResult> {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  let config: Record<string, any> | undefined;

  // Check for existing entry
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const existing = config?.workspace?.repos?.find((r: any) => r.id === repoName)
        || config?.umbrella?.childRepos?.find((r: any) => r.id === repoName);
      if (existing) {
        return { registered: false, alreadyRegistered: true };
      }
    } catch {
      // Proceed with registration if config is unreadable
    }
  }

  const prefix = options.prefix || repoName.substring(0, 3).toUpperCase();
  // Normalize path separators to forward slashes for config.json
  const normalizedPath = repoPath.replace(/\\/g, '/');

  if (config?.workspace) {
    const repoEntry: Record<string, any> = {
      id: repoName,
      path: normalizedPath,
      name: repoName,
      prefix,
    };
    if (options.role) repoEntry.role = options.role;
    if (owner) {
      repoEntry.sync = {
        github: { owner, repo: repoName },
      };
    }

    const nextConfig = {
      ...config,
      workspace: {
        ...config.workspace,
        repos: [...(config.workspace.repos ?? []), repoEntry],
      },
    };

    await fs.promises.writeFile(configPath, JSON.stringify(nextConfig, null, 2));
    return { registered: true, alreadyRegistered: false };
  }

  // Base registration via persistUmbrellaConfig (handles dedup-safe merge).
  // persistUmbrellaConfig uses a minimal ChildRepoConfig without prefix/role/githubUrl;
  // those are patched via read-modify-write below (same pattern as addRepoToUmbrella).
  await persistUmbrellaConfig(projectRoot, {
    enabled: true,
    childRepos: [{
      id: repoName,
      path: normalizedPath,
      name: repoName,
    }],
  });

  // Post-patch prefix, role, and githubUrl
  try {
    const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const repo = rawConfig.umbrella?.childRepos?.find((r: any) => r.id === repoName);
    if (repo) {
      repo.prefix = prefix;
      if (options.role) repo.role = options.role;
      if (options.githubUrl) repo.githubUrl = options.githubUrl;
      await fs.promises.writeFile(configPath, JSON.stringify(rawConfig, null, 2));
    }
  } catch {
    // Non-fatal: base registration succeeded
  }

  return { registered: true, alreadyRegistered: false };
}
