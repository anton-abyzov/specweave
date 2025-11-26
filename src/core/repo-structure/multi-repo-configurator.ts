/**
 * Multi-Repository Configuration
 *
 * Extracted from repo-structure-manager.ts to reduce file size and prevent crashes.
 * Handles configuration of multi-repository setups including parent repos and discovery.
 */

import path from 'path';
import chalk from 'chalk';
import { select, input, confirm, number } from '@inquirer/prompts';
import { Octokit } from '@octokit/rest';
import { normalizeRepoName, suggestRepoName } from './repo-id-generator.js';
import { SetupStateManager, SetupState, type SetupArchitecture } from './setup-state-manager.js';
import {
  getParentRepoBenefits,
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
  useParent?: boolean;
  isLocalParent?: boolean;
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
 * Configure multi-repository architecture
 * @param options - Configuration options
 */
export async function configureMultiRepo(options: MultiRepoConfigOptions): Promise<RepoStructureConfig> {
  const {
    projectPath,
    githubToken,
    stateManager,
    useParent = true,
    isLocalParent = false,
    urlType = 'ssh',
    platform = 'github',
    provider
  } = options;

  console.log(chalk.cyan('\n Multi-Repository Configuration\n'));
  console.log(chalk.gray('This creates separate repositories for each service/component.\n'));

  // Show parent repo benefits if using parent approach
  if (useParent) {
    console.log(chalk.blue(getParentRepoBenefits()));
    console.log('');
  }

  const config: RepoStructureConfig = {
    architecture: useParent ? 'parent' : 'multi-repo',
    urlType,
    platform,
    provider,
    repositories: []
  };

  // Save state: architecture selected
  await saveSetupState(stateManager, {
    version: '1.0.0',
    architecture: useParent ? 'parent' : 'multi-repo',
    parentRepo: undefined,
    repos: [],
    currentStep: 'architecture-selected',
    timestamp: new Date().toISOString(),
    envCreated: false
  });

  // ========== NEW FLOW: Ask discovery strategy FIRST (before parent questions!) ==========

  // Step 1: Ask how to configure implementation repositories (BEFORE parent questions)
  let discoveryStrategy: 'manual' | 'bulk-discovery' = 'manual';
  let discoveredRepos: DiscoveredRepo[] = [];
  let owner: string = '';

  if (!isLocalParent && githubToken && useParent) {
    console.log(chalk.cyan('\n Repository Discovery\n'));
    console.log(chalk.gray('You\'re setting up multiple repositories. We can discover them automatically!\n'));

    const configMethod = await select({
      message: 'How do you want to configure repositories?',
      choices: [
        {
          name: [
            chalk.bold.green(' Bulk Discovery (RECOMMENDED)'),
            chalk.gray('  Automatically discover repos from ' + provider.config.name),
            chalk.gray('  - Select parent from discovered list'),
            chalk.gray('  - Auto-configure implementation repos'),
            chalk.gray('  - Supports: all, pattern, regex filtering'),
            ''
          ].join('\n'),
          value: 'bulk-discovery'
        },
        {
          name: [
            chalk.bold(' Manual Entry'),
            chalk.gray('  Enter each repository manually'),
            chalk.gray('  - Full control over settings'),
            chalk.gray('  - Best for new repos or custom setup'),
            ''
          ].join('\n'),
          value: 'manual'
        }
      ],
      default: 'bulk-discovery'
    });

    discoveryStrategy = configMethod as 'manual' | 'bulk-discovery';
  }

  // Step 2: If bulk discovery, discover repos FIRST, then ask which is parent
  if (discoveryStrategy === 'bulk-discovery') {
    // Get owner FIRST (needed for discovery)
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

    if (discoveryResult && discoveryResult.strategy !== 'manual') {
      discoveredRepos = discoveryResult.repositories;

      // Now ask: Which repo is the parent?
      console.log(chalk.cyan('\n Select Parent Repository\n'));
      console.log(chalk.gray('Choose which repository will be the parent (contains .specweave/ structure)\n'));

      const parentChoices = [
        ...discoveredRepos.map((repo, index) => ({
          name: `${chalk.bold(repo.name)}\n${chalk.gray(repo.description || '(no description)')}`,
          value: index.toString(),
          short: repo.name
        })),
        {
          name: `${chalk.yellow(' Enter parent manually')} ${chalk.gray('(not in discovered list)')}`,
          value: 'manual',
          short: 'Enter manually'
        }
      ];

      const parentSelection = await select({
        message: 'Which repository is the parent?',
        choices: parentChoices,
        pageSize: 15
      });

      if (parentSelection === 'manual') {
        // User wants to enter parent manually - fall back to old flow
        discoveryStrategy = 'manual';
        discoveredRepos = []; // Clear discovered repos
      } else {
        // User selected a parent from discovered list
        const parentIndex = parseInt(parentSelection);
        const selectedParent = discoveredRepos[parentIndex];

        // Fetch full repo details from GitHub API
        let description = selectedParent.description || 'SpecWeave parent repository - specs, docs, and architecture';
        let existingVisibility: 'private' | 'public' = selectedParent.private ? 'private' : 'public';

        try {
          const response = await fetch(`https://api.github.com/repos/${owner}/${selectedParent.name}`, {
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github+json'
            }
          });
          if (response.ok) {
            const data = await response.json() as any;
            description = data.description || description;
            existingVisibility = data.private ? 'private' : 'public';
          }
        } catch {
          // Use defaults if fetch fails
        }

        // Set parent config
        config.parentRepo = {
          name: selectedParent.name,
          owner: owner,
          description: description,
          visibility: existingVisibility,
          createOnGitHub: false // Already exists!
        };

        // Remove parent from discovered repos (implementation repos = discovered - parent)
        discoveredRepos.splice(parentIndex, 1);

        console.log(chalk.green(`\n Using existing repository: ${owner}/${selectedParent.name}\n`));
        console.log(chalk.gray(` Implementation repositories: ${discoveredRepos.length}\n`));

        // Save state: parent repo configured
        await saveSetupState(stateManager, {
          version: '1.0.0',
          architecture: useParent ? 'parent' : 'multi-repo',
          parentRepo: config.parentRepo,
          repos: [],
          currentStep: 'parent-repo-configured',
          timestamp: new Date().toISOString(),
          envCreated: false
        });

        // Skip to repository configuration (lines 794+)
        // We'll continue below with discoveredRepos
      }
    } else {
      // User selected manual - fall back to old flow
      discoveryStrategy = 'manual';
    }
  }

  // Step 3: Manual flow (existing logic) - only runs if discoveryStrategy === 'manual'
  if (discoveryStrategy === 'manual' && useParent) {
    let parentAnswers: any;

    if (isLocalParent) {
      // Local parent: Skip GitHub questions, just ask for folder name
      console.log(chalk.blue('\n Local Parent Folder Setup'));
      console.log(chalk.gray('This folder will contain .specweave/ but will NOT be pushed to GitHub.\n'));

      const parentNameAnswer = await input({
        message: 'Parent folder name:',
        default: `${path.basename(projectPath)}`,
        validate: (val: string) => {
          if (!val.trim()) return 'Folder name is required';
          return true;
        }
      });

      const ownerForLocalAnswer = await input({
        message: `${provider.config.name} owner/organization for IMPLEMENTATION repos:`,
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

      parentAnswers = {
        parentName: parentNameAnswer,
        owner: ownerForLocalAnswer
      };

      // Set defaults for local parent
      parentAnswers.description = 'Local parent folder (not synced to GitHub)';
      parentAnswers.createOnGitHub = false; // Never create GitHub repo for local parent
    } else {
      // GitHub parent: First ask if using existing or creating new
      const parentChoice = await select({
        message: 'Parent repository setup:',
        choices: [
          {
            name: `${chalk.green('Use existing parent repository')}\n${chalk.gray('Connect to an existing GitHub repo that already has .specweave/ structure')}`,
            value: 'existing'
          },
          {
            name: `${chalk.blue('Create new parent repository')}\n${chalk.gray('Create a new GitHub repo for specs, docs, and architecture')}`,
            value: 'new'
          }
        ],
        default: 'new'
      });

      if (parentChoice === 'existing') {
        // Using existing parent repository
        console.log(chalk.cyan('\n Existing Parent Repository\n'));

        // Ask for owner first
        const existingOwner = await input({
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
        const ownerPrompt = { owner: existingOwner };

        // Ask for existing repo name
        const existingParentName = await input({
          message: 'Existing parent repository name:',
          default: `${path.basename(projectPath)}-parent`,
          validate: async (val: string) => {
            if (!val.trim()) return 'Repository name is required';

            // Validate repository EXISTS on the platform
            if (githubToken && ownerPrompt.owner) {
              const result = await provider.validateRepository(ownerPrompt.owner, val, githubToken);
              if (!result.exists) {
                return `Repository ${ownerPrompt.owner}/${val} not found on ${provider.config.name}. Please check the name or choose 'Create new'.`;
              }
            }
            return true;
          }
        });
        const repoPrompt = { parentName: existingParentName };

        // Fetch description and visibility from GitHub API (or use defaults)
        let description = 'SpecWeave parent repository - specs, docs, and architecture';
        let existingVisibility: 'private' | 'public' = 'private';
        if (githubToken) {
          try {
            const response = await fetch(`https://api.github.com/repos/${ownerPrompt.owner}/${repoPrompt.parentName}`, {
              headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github+json'
              }
            });
            if (response.ok) {
              const data = await response.json() as any;
              description = data.description || description;
              existingVisibility = data.private ? 'private' : 'public';
            }
          } catch {
            // Use defaults if fetch fails
          }
        }

        parentAnswers = {
          owner: ownerPrompt.owner,
          parentName: repoPrompt.parentName,
          description: description,
          createOnGitHub: false, // Don't create, it already exists!
          visibility: existingVisibility // Use existing visibility from GitHub
        };

        console.log(chalk.green(`\n Using existing repository: ${ownerPrompt.owner}/${repoPrompt.parentName}\n`));

      } else {
        // Creating new parent repository
        console.log(chalk.cyan('\n New Parent Repository\n'));

        // Ask for owner (separate prompt to avoid validator issues)
        const newOwner = await input({
          message: `${provider.config.name} owner/organization for ALL repos:`,
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
        const ownerPrompt = { owner: newOwner };

        // Now ask remaining questions, using the owner value
        const newParentName = await input({
          message: 'Parent repository name:',
          default: `${path.basename(projectPath)}-parent`,
          validate: async (val: string) => {
            if (!val.trim()) return 'Repository name is required';

            // Validate repository DOESN'T exist
            if (githubToken && ownerPrompt.owner) {
              const result = await provider.validateRepository(ownerPrompt.owner, val, githubToken);
              if (result.exists) {
                return `Repository ${ownerPrompt.owner}/${val} already exists at ${result.url}. Please choose 'Use existing' or pick a different name.`;
              }
            }
            return true;
          }
        });

        const newParentDesc = await input({
          message: 'Parent repository description:',
          default: 'SpecWeave parent repository - specs, docs, and architecture'
        });

        const createParentOnGitHub = await confirm({
          message: 'Create parent repository on GitHub?',
          default: true
        });

        // Merge the answers
        parentAnswers = {
          ...ownerPrompt,
          parentName: newParentName,
          description: newParentDesc,
          createOnGitHub: createParentOnGitHub
        };
      }
    }

    // Ask about visibility for parent repo (only if creating NEW repo on GitHub)
    let parentVisibility: 'private' | 'public' = 'private';
    if (!isLocalParent && parentAnswers.createOnGitHub) {
      // Only prompt for visibility when creating a NEW repository
      const parentVisibilityPrompt = getVisibilityPrompt(parentAnswers.parentName);
      parentVisibility = await select({
        message: parentVisibilityPrompt.question,
        choices: parentVisibilityPrompt.options.map(opt => ({
          name: `${opt.label}\n${chalk.gray(opt.description)}`,
          value: opt.value as 'private' | 'public'
        })),
        default: parentVisibilityPrompt.default
      });
    } else if (!isLocalParent && parentAnswers.visibility) {
      // Use existing repository's visibility (fetched from GitHub API)
      parentVisibility = parentAnswers.visibility;
    }

    config.parentRepo = {
      name: parentAnswers.parentName,
      owner: parentAnswers.owner,
      description: parentAnswers.description,
      visibility: parentVisibility,
      createOnGitHub: parentAnswers.createOnGitHub
    };

    // Save state: parent repo configured
    await saveSetupState(stateManager, {
      version: '1.0.0',
      architecture: useParent ? 'parent' : 'multi-repo',
      parentRepo: config.parentRepo,
      repos: [],
      currentStep: 'parent-repo-configured',
      timestamp: new Date().toISOString(),
      envCreated: false
    });
  }

  // Step 4: Repository count and discovery (skip count question if using bulk discovery)
  let repoCount: number;
  let bulkDiscoveryStrategy: BulkDiscoveryResult['strategy'] = discoveryStrategy === 'bulk-discovery' ? 'pattern' : 'manual';

  if (discoveryStrategy === 'bulk-discovery' && discoveredRepos.length > 0) {
    // Bulk discovery: repos already discovered, skip count question
    repoCount = discoveredRepos.length;
    console.log(chalk.green(`\n Total repositories: ${repoCount + 1} (1 parent + ${repoCount} implementation)\n`));
  } else {
    // Manual entry: ask for count
    // Auto-detect existing folders
    const hints = await detectRepositoryHints(projectPath);

    if (hints.detectedFolders.length > 0) {
      console.log(chalk.green(`\n Detected ${hints.detectedFolders.length} service folder(s):`));
      hints.detectedFolders.forEach(f => console.log(chalk.gray(`  - ${f}`)));
      console.log('');
    }

    // Show repository count clarification BEFORE asking
    if (useParent && config.parentRepo) {
      console.log(chalk.cyan('\n Repository Count\n'));
      console.log(chalk.gray('You will create:'));
      if (isLocalParent) {
        console.log(chalk.white('  - 1 parent FOLDER (local only, .specweave/ gitignored)'));
        console.log(chalk.white('  - N implementation repositories (your services/apps on GitHub)'));
      } else {
        console.log(chalk.white('  - 1 parent repository (specs, docs, increments)'));
        console.log(chalk.white('  - N implementation repositories (your services/apps)'));
      }
      console.log(chalk.gray('\nNext question asks for: IMPLEMENTATION repositories ONLY (not counting parent)\n'));
    }

    // Ask how many implementation repositories
    const repoCountAnswer = await number({
      message: useParent
        ? ' How many IMPLEMENTATION repositories? (not counting parent)'
        : 'How many repositories?',
      default: hints.suggestedCount,  // Use auto-detected count
      validate: (val: number | undefined) => {
        if (val === undefined || val < 1) return useParent
          ? 'Need at least 1 implementation repository'
          : 'Need at least 2 repositories';
        if (val > 10) return 'Maximum 10 repositories supported';
        return true;
      }
    });
    repoCount = repoCountAnswer ?? hints.suggestedCount;

    // Show summary AFTER for confirmation
    if (useParent && config.parentRepo) {
      if (isLocalParent) {
        console.log(chalk.green(`\n Total repositories to create: ${repoCount} implementation repos`));
        console.log(chalk.gray(`  (Parent folder is local only, not counted)\n`));
      } else {
        const totalRepos = 1 + repoCount;
        console.log(chalk.green(`\n Total repositories to create: ${totalRepos} (1 parent + ${repoCount} implementation)\n`));
      }
    }

    // Bulk repository discovery for manual flow (old behavior)
    if (githubToken && config.parentRepo && discoveryStrategy === 'manual') {
      const octokit = new Octokit({ auth: githubToken });
      const discoveryOwner = config.parentRepo.owner;
      const isOrg = await provider.isOrganization(discoveryOwner, githubToken);

      // Retry loop for pattern adjustment
      let discoveryResult: BulkDiscoveryResult | null = null;
      while (discoveryResult === null) {
        discoveryResult = await discoverRepositories(octokit, discoveryOwner, isOrg, repoCount);
        // If null, user selected "go back and adjust pattern", loop will retry
        // If user selected "manual", discoveryResult will be { repositories: [], strategy: 'manual' }
      }

      if (discoveryResult) {
        bulkDiscoveryStrategy = discoveryResult.strategy;

        if (discoveryResult.strategy !== 'manual') {
          discoveredRepos = discoveryResult.repositories;

          // Update repoCount to match discovered repos
          if (discoveredRepos.length !== repoCount) {
            console.log(chalk.yellow(`\n Adjusting repository count from ${repoCount} to ${discoveredRepos.length} (based on discovery)\n`));
            repoCount = discoveredRepos.length;
          }
        }
      }
    }
  }

  // Configure each repository
  console.log(chalk.cyan('\n Configure Each Repository:\n'));

  const usedIds = new Set<string>();
  const configuredRepoNames: string[] = []; // Track configured repo names for smart ID generation

  for (let i = 0; i < repoCount; i++) {
    const discoveredRepo = discoveredRepos[i]; // May be undefined if manual
    const isDiscovered = bulkDiscoveryStrategy !== 'manual' && discoveredRepo;

    console.log(chalk.white(`\nRepository ${i + 1} of ${repoCount}:`));

    // Smart suggestion for ALL repos (not just first one!)
    const projectName = path.basename(projectPath);
    const suggestedName = isDiscovered ? discoveredRepo.name : suggestRepoName(projectName, i, repoCount);

    // If discovered, auto-use without confirmation (repos exist on GitHub)
    if (isDiscovered) {
      // Use normalized repo name as ID (repo names are unique in GitHub)
      const repoId = normalizeRepoName(discoveredRepo.name);

      console.log(chalk.green(`    Using: ${chalk.bold(discoveredRepo.name)} ${chalk.gray(`(id: ${repoId})`)}`));

      usedIds.add(repoId);
      configuredRepoNames.push(discoveredRepo.name);

      config.repositories.push({
        id: repoId,
        name: discoveredRepo.name,
        owner: discoveredRepo.owner,
        description: discoveredRepo.description || `${discoveredRepo.name} service`,
        path: discoveredRepo.name,
        visibility: discoveredRepo.private ? 'private' : 'public',
        createOnGitHub: false,
        isNested: useParent
      });

      continue;
    }

    // Manual entry (original behavior)
    const repoName = await input({
      message: 'Repository name:',
      default: suggestedName,
      validate: async (val: string) => {
        if (!val.trim()) return 'Repository name is required';

        // Validate repository doesn't exist (skip for discovered repos)
        if (!isDiscovered && githubToken && config.parentRepo) {
          const result = await provider.validateRepository(config.parentRepo.owner, val, githubToken);
          if (result.exists) {
            return `Repository ${config.parentRepo.owner}/${val} already exists at ${result.url}`;
          }
        }
        return true;
      }
    });

    const repoDescription = await input({
      message: 'Repository description:',
      default: `${path.basename(repoName)} service`
    });

    // Skip "Create on GitHub?" for discovered repos - they already exist!
    let repoCreateOnGitHub = false;
    if (!isDiscovered) {
      repoCreateOnGitHub = await confirm({
        message: 'Create this repository on GitHub?',
        default: true
      });
    }

    const repoAnswers = {
      name: repoName,
      description: repoDescription,
      createOnGitHub: repoCreateOnGitHub
    };

    // Use normalized repo name as ID (repo names are unique)
    const id = normalizeRepoName(repoAnswers.name);
    console.log(chalk.green(`    Repository ID: ${chalk.bold(id)}`))

    usedIds.add(id);
    configuredRepoNames.push(repoAnswers.name);

    // Ask about visibility only if creating a new repository
    let visibility: 'private' | 'public' = 'private';
    if (repoAnswers.createOnGitHub) {
      const visibilityPrompt = getVisibilityPrompt(repoAnswers.name);
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
      name: repoAnswers.name,
      owner: config.parentRepo?.owner || '',
      description: repoAnswers.description,
      path: repoAnswers.name, // Use full repo name as folder (not short ID)
      visibility: visibility,
      createOnGitHub: repoAnswers.createOnGitHub,
      isNested: useParent
    });

    // Save state after each repo
    await saveSetupState(stateManager, {
      version: '1.0.0',
      architecture: useParent ? 'parent' : 'multi-repo',
      parentRepo: config.parentRepo,
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
