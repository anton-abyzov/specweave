/**
 * Multi-Repository Configuration
 *
 * Extracted from repo-structure-manager.ts to reduce file size and prevent crashes.
 * Handles configuration of multi-repository setups with repository discovery.
 *
 * v1.0.13: REMOVED parent repo concept - all repos are equal, first is default.
 */

import path from 'path';
import chalk from 'chalk';
import { select, input, confirm, number } from '@inquirer/prompts';
import { Octokit } from '@octokit/rest';
import { normalizeRepoName, suggestRepoName } from './repo-id-generator.js';
import { SetupStateManager, SetupState, type SetupArchitecture } from './setup-state-manager.js';
import {
  getVisibilityPrompt,
} from './prompt-consolidator.js';
import { detectRepositoryHints } from './folder-detector.js';
import { discoverRepositories, type BulkDiscoveryResult, type DiscoveredRepo } from './repo-bulk-discovery.js';
import type { GitProvider, GitPlatformType } from './git-provider.js';
import type { RepoStructureConfig } from './repo-structure-manager.js';

export interface MultiRepoConfigOptions {
  projectPath: string;
  githubToken?: string;
  stateManager: SetupStateManager;
  urlType?: 'ssh' | 'https';
  platform?: GitPlatformType;
  provider: GitProvider;
}

/**
 * Save setup state for Ctrl+C recovery
 */
async function saveSetupState(stateManager: SetupStateManager, state: SetupState): Promise<void> {
  try {
    await stateManager.saveState(state);
  } catch (error: any) {
    console.warn(chalk.yellow(`Warning: Failed to save setup state: ${error.message}`));
  }
}

/**
 * Greenfield flow: define repos that don't exist yet using prefix + service names.
 * Generates repo definitions without GitHub existence validation.
 */
async function configureGreenfieldRepos(
  owner: string,
  platform: GitPlatformType
): Promise<RepoStructureConfig['repositories']> {
  console.log(chalk.cyan('\n 🌱 Define New Repositories (Greenfield)\n'));
  console.log(chalk.gray('Define repositories to create later. No GitHub validation required.\n'));

  const prefix = await input({
    message: 'Common prefix for all repos (e.g., sw-ecom-):',
    validate: (val: string) => val.trim() ? true : 'Prefix is required'
  });

  const trimmedPrefix = prefix.trim().replace(/-$/, '') + '-';

  const serviceNamesInput = await input({
    message: 'Service/component names (comma-separated, e.g., web, api, gateway, shared):',
    validate: (val: string) => {
      const names = val.split(',').map(n => n.trim()).filter(Boolean);
      if (names.length < 2) return 'Need at least 2 services';
      if (names.length > 10) return 'Maximum 10 services';
      return true;
    }
  });

  const serviceNames = serviceNamesInput.split(',').map(n => n.trim()).filter(Boolean);
  const repos = serviceNames.map(name => `${trimmedPrefix}${name}`);

  console.log(chalk.cyan('\n📋 Planned repositories:\n'));
  repos.forEach((repo, i) => {
    console.log(`   ${i + 1}. ${chalk.white(repo)}${i === 0 ? chalk.yellow(' (default)') : ''}`);
  });
  console.log('');

  const confirmed = await confirm({
    message: `Create these ${repos.length} repository definitions?`,
    default: true
  });

  if (!confirmed) {
    // Retry
    return configureGreenfieldRepos(owner, platform);
  }

  return repos.map((repoName, i) => {
    const id = normalizeRepoName(repoName);
    console.log(chalk.green(`   ✓ ${repoName} ${chalk.gray(`(id: ${id})`)}`));
    return {
      id,
      name: repoName,
      owner,
      description: `${serviceNames[i]} service`,
      path: `repositories/${owner}/${repoName}`,
      visibility: 'private' as const,
      createOnGitHub: true,
      isNested: false
    };
  });
}

/**
 * Configure multi-repository architecture
 * v1.0.13: All repos are equal - no parent concept. First repo is default.
 * @param options - Configuration options
 */
export async function configureMultiRepo(options: MultiRepoConfigOptions): Promise<RepoStructureConfig> {
  const {
    projectPath,
    githubToken,
    stateManager,
    urlType = 'ssh',
    platform = 'github',
    provider
  } = options;

  console.log(chalk.cyan('\n Multi-Repository Configuration\n'));
  console.log(chalk.gray('This creates separate repositories for each service/component.\n'));
  console.log(chalk.gray('All repositories are equal - first one will be the default for issues.\n'));

  const config: RepoStructureConfig = {
    architecture: 'multi-repo',
    urlType,
    platform,
    provider,
    repositories: []
  };

  // Save state: architecture selected
  await saveSetupState(stateManager, {
    version: '1.0.0',
    architecture: 'multi-repo',
    repos: [],
    currentStep: 'architecture-selected',
    timestamp: new Date().toISOString(),
    envCreated: false
  });

  // Ask discovery strategy
  let discoveryStrategy: 'manual' | 'bulk-discovery' | 'greenfield' = 'manual';
  let discoveredRepos: DiscoveredRepo[] = [];
  let owner: string = '';

  if (githubToken) {
    console.log(chalk.cyan('\n Repository Discovery\n'));
    console.log(chalk.gray('You\'re setting up multiple repositories. We can discover them automatically!\n'));

    const configMethod = await select({
      message: 'How do you want to configure repositories?',
      choices: [
        {
          name: [
            chalk.bold.green(' Bulk Discovery (RECOMMENDED)'),
            chalk.gray('  Automatically discover repos from ' + provider.config.name),
            chalk.gray('  - Auto-configure all repos'),
            chalk.gray('  - Supports: all, pattern, regex filtering'),
            ''
          ].join('\n'),
          value: 'bulk-discovery'
        },
        {
          name: [
            chalk.bold(' Define New Repos (Greenfield)'),
            chalk.gray('  Plan repos that don\'t exist yet'),
            chalk.gray('  - Prefix + service names for bulk definition'),
            chalk.gray('  - Repos will be created on GitHub later'),
            ''
          ].join('\n'),
          value: 'greenfield'
        },
        {
          name: [
            chalk.bold(' Manual Entry'),
            chalk.gray('  Enter each repository manually'),
            chalk.gray('  - Full control over settings'),
            chalk.gray('  - Works for both new and existing repos'),
            ''
          ].join('\n'),
          value: 'manual'
        }
      ],
      default: 'bulk-discovery'
    });

    discoveryStrategy = configMethod as 'manual' | 'bulk-discovery' | 'greenfield';
  }

  // Greenfield flow (from top-level selection)
  if (discoveryStrategy === 'greenfield') {
    // Ask for owner if not already known
    if (!owner) {
      console.log(chalk.cyan('\n Repository Owner\n'));
      owner = await input({
        message: `${provider.config.name} owner/organization:`,
        validate: (val: string) => val.trim() ? true : 'Owner is required'
      });
    }

    const greenfieldConfig = await configureGreenfieldRepos(owner, platform);
    config.repositories = greenfieldConfig;

    await saveSetupState(stateManager, {
      version: '1.0.0',
      architecture: 'multi-repo',
      repos: config.repositories.map(r => ({
        id: r.id,
        repo: r.name,
        owner: r.owner,
        path: r.path,
        visibility: r.visibility,
        displayName: r.name,
        created: false
      })),
      currentStep: 'repos-configured',
      timestamp: new Date().toISOString(),
      envCreated: false
    });

    return config;
  }

  // Bulk discovery flow
  if (discoveryStrategy === 'bulk-discovery') {
    // Get owner first (needed for discovery)
    console.log(chalk.cyan('\n Repository Owner\n'));

    owner = await input({
      message: `${provider.config.name} owner/organization:`,
      validate: async (val: string) => {
        if (!val.trim()) return 'Owner is required';

        // Validate owner exists on the platform
        if (githubToken) {
          const result = await provider.validateOwner(val, githubToken);
          if (!result.valid) {
            return result.error || `Invalid ${provider.config.name} owner`;
          }
        }
        return true;
      }
    });

    // Discover repositories via pattern matching
    const octokit = new Octokit({ auth: githubToken });
    const isOrg = await provider.isOrganization(owner, githubToken);

    // Retry loop for pattern adjustment
    let discoveryResult: BulkDiscoveryResult | null = null;
    while (discoveryResult === null) {
      // Discovery-first flow: skip count validation since user discovers THEN selects
      discoveryResult = await discoverRepositories(octokit, owner, isOrg, 0, { skipValidation: true });
      // If null, user selected "go back and adjust pattern", loop will retry
      // If user selected "manual", discoveryResult will be { repositories: [], strategy: 'manual' }
    }

    if (discoveryResult && discoveryResult.strategy === 'greenfield') {
      // Greenfield flow: define repos that don't exist yet
      const greenfieldConfig = await configureGreenfieldRepos(owner, platform);
      config.repositories = greenfieldConfig;

      // Save state
      await saveSetupState(stateManager, {
        version: '1.0.0',
        architecture: 'multi-repo',
        repos: config.repositories.map(r => ({
          id: r.id,
          repo: r.name,
          owner: r.owner,
          path: r.path,
          visibility: r.visibility,
          displayName: r.name,
          created: false
        })),
        currentStep: 'repos-configured',
        timestamp: new Date().toISOString(),
        envCreated: false
      });

      return config;
    }

    if (discoveryResult && discoveryResult.strategy !== 'manual') {
      discoveredRepos = discoveryResult.repositories;
      console.log(chalk.green(`\n Discovered ${discoveredRepos.length} repositories\n`));

      // Configure all discovered repos - first is default
      for (let i = 0; i < discoveredRepos.length; i++) {
        const repo = discoveredRepos[i];
        const repoId = normalizeRepoName(repo.name);

        config.repositories.push({
          id: repoId,
          name: repo.name,
          owner: repo.owner,
          description: repo.description || `${repo.name} service`,
          path: `repositories/${repo.owner}/${repo.name}`,
          visibility: repo.private ? 'private' : 'public',
          createOnGitHub: false,
          isNested: false
        });

        console.log(chalk.green(`    ${i === 0 ? '(default) ' : ''}${repo.name} ${chalk.gray(`(id: ${repoId})`)}`));
      }

      // Save state
      await saveSetupState(stateManager, {
        version: '1.0.0',
        architecture: 'multi-repo',
        repos: config.repositories.map(r => ({
          id: r.id,
          repo: r.name,
          owner: r.owner,
          path: r.path,
          visibility: r.visibility,
          displayName: r.name,
          created: false
        })),
        currentStep: 'repos-configured',
        timestamp: new Date().toISOString(),
        envCreated: false
      });

      return config;
    } else {
      // User selected manual - fall back to manual flow
      discoveryStrategy = 'manual';
    }
  }

  // Manual flow
  // Ask for owner
  if (!owner) {
    console.log(chalk.cyan('\n Repository Owner\n'));

    owner = await input({
      message: `${provider.config.name} owner/organization:`,
      validate: async (val: string) => {
        if (!val.trim()) return 'Owner is required';

        // Validate owner exists on the platform
        if (githubToken) {
          const result = await provider.validateOwner(val, githubToken);
          if (!result.valid) {
            return result.error || `Invalid ${provider.config.name} owner`;
          }
        }
        return true;
      }
    });
  }

  // Auto-detect existing folders
  const hints = await detectRepositoryHints(projectPath);

  if (hints.detectedFolders.length > 0) {
    console.log(chalk.green(`\n Detected ${hints.detectedFolders.length} service folder(s):`));
    hints.detectedFolders.forEach(f => console.log(chalk.gray(`  - ${f}`)));
    console.log('');
  }

  // Ask how many repositories
  const repoCountAnswer = await number({
    message: 'How many repositories?',
    default: hints.suggestedCount >= 2 ? hints.suggestedCount : 2,
    validate: (val: number | undefined) => {
      if (val === undefined || val < 2) return 'Need at least 2 repositories';
      if (val > 10) return 'Maximum 10 repositories supported';
      return true;
    }
  });
  const repoCount = repoCountAnswer ?? 2;

  // Configure each repository
  console.log(chalk.cyan('\n Configure Each Repository:\n'));
  console.log(chalk.gray('First repository will be the default for issue tracking.\n'));

  const usedIds = new Set<string>();

  for (let i = 0; i < repoCount; i++) {
    console.log(chalk.white(`\nRepository ${i + 1} of ${repoCount}${i === 0 ? chalk.yellow(' (default)') : ''}:`));

    // Smart suggestion
    const projectName = path.basename(projectPath);
    const suggestedName = suggestRepoName(projectName, i, repoCount);

    // Manual entry
    let repoAlreadyExists = false;
    const repoName = await input({
      message: 'Repository name:',
      default: suggestedName,
      validate: async (val: string) => {
        if (!val.trim()) return 'Repository name is required';
        return true;
      }
    });

    // Check if repo exists on GitHub (informational, not blocking)
    if (githubToken) {
      const result = await provider.validateRepository(owner, repoName, githubToken);
      if (result.exists) {
        repoAlreadyExists = true;
        console.log(chalk.green(`   ✓ Repository ${owner}/${repoName} exists at ${result.url}`));
      }
    }

    const repoDescription = await input({
      message: 'Repository description:',
      default: `${path.basename(repoName)} service`
    });

    // Only ask about creating on GitHub if the repo doesn't already exist
    let repoCreateOnGitHub = false;
    if (repoAlreadyExists) {
      console.log(chalk.gray('   Repository already exists on GitHub, skipping creation.'));
    } else {
      repoCreateOnGitHub = await confirm({
        message: 'Create this repository on GitHub?',
        default: true
      });
    }

    // Use normalized repo name as ID (repo names are unique)
    const id = normalizeRepoName(repoName);
    console.log(chalk.green(`    Repository ID: ${chalk.bold(id)}`));

    usedIds.add(id);

    // Ask about visibility only if creating a new repository
    let visibility: 'private' | 'public' = 'private';
    if (repoCreateOnGitHub) {
      const visibilityPrompt = getVisibilityPrompt(repoName);
      visibility = await select({
        message: visibilityPrompt.question,
        choices: visibilityPrompt.options.map(opt => ({
          name: `${opt.label}\n${chalk.gray(opt.description)}`,
          value: opt.value as 'private' | 'public'
        })),
        default: visibilityPrompt.default
      });
    }

    config.repositories.push({
      id: id,
      name: repoName,
      owner: owner,
      description: repoDescription,
      path: `repositories/${owner}/${repoName}`,
      visibility: visibility,
      createOnGitHub: repoCreateOnGitHub,
      isNested: false
    });

    // Save state after each repo
    await saveSetupState(stateManager, {
      version: '1.0.0',
      architecture: 'multi-repo',
      repos: config.repositories.map(r => ({
        id: r.id,
        repo: r.name,
        owner: r.owner,
        path: r.path,
        visibility: r.visibility,
        displayName: r.name,
        created: false
      })),
      currentStep: `repo-${i + 1}-configured`,
      timestamp: new Date().toISOString(),
      envCreated: false
    });
  }

  return config;
}
