/**
 * Repository Structure Manager
 *
 * Handles various repository architectures for SpecWeave projects:
 * - Single repository
 * - Multi-repository (polyrepo/microservices)
 * - Monorepo (single repo with multiple projects)
 * - Parent repository approach (parent folder with .specweave + nested implementation repos)
 *
 * Provides capabilities to:
 * - Create GitHub repositories via API
 * - Initialize git repositories locally
 * - Configure proper folder structure
 * - Organize specs per project/team
 * - Split tasks between repositories
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { select, input, confirm, number } from '@inquirer/prompts';
import ora from 'ora';
import { execSync } from 'child_process';
import { execFileNoThrowSync } from '../../utils/execFileNoThrow.js';
import { generateRepoId, generateRepoIdSmart, ensureUniqueId, validateRepoId, suggestRepoName } from './repo-id-generator.js';
import { SetupStateManager, SetupState, type SetupArchitecture, type ParentRepoConfig } from './setup-state-manager.js';
import { validateRepository, validateOwner } from './github-validator.js';
import { generateEnvFile, type EnvConfig } from '../../utils/env-file-generator.js';
import { generateSetupSummary, type SummaryConfig } from './setup-summary.js';
import {
  getArchitecturePrompt,
  getParentRepoBenefits,
  getRepoCountClarification,
  getVisibilityPrompt,
  getUrlTypePrompt,
  type ArchitectureChoice
} from './prompt-consolidator.js';
import { generateGitRemoteUrl } from './url-generator.js';
import { detectRepositoryHints } from './folder-detector.js';
import { discoverRepositories, type BulkDiscoveryResult, type DiscoveredRepo, type DiscoveryOptions } from './repo-bulk-discovery.js';
import { Octokit } from '@octokit/rest';
import { initializeProviders } from './providers/index.js';
import { getPlatformRegistry } from './platform-registry.js';
import type { GitProvider, GitPlatformType } from './git-provider.js';
import { getPlatformSelectionPrompt } from './prompt-consolidator.js';

export type RepoArchitecture = 'single' | 'multi-repo' | 'monorepo' | 'parent';

export interface RepoStructureConfig {
  architecture: RepoArchitecture;
  urlType: 'ssh' | 'https';  // Git remote URL format (SSH recommended)
  platform: GitPlatformType;  // Git hosting platform (github, gitlab, bitbucket, etc.)
  provider: GitProvider;      // Git provider instance for API operations
  parentRepo?: {
    name: string;
    owner: string;
    description: string;
    visibility: 'private' | 'public';
    createOnGitHub: boolean;
  };
  repositories: Array<{
    id: string;           // e.g., 'frontend', 'backend', 'shared'
    name: string;          // e.g., 'my-app-frontend'
    owner: string;         // e.g., 'myorg'
    description: string;
    path: string;          // Relative path from parent
    visibility: 'private' | 'public';
    createOnGitHub: boolean;
    isNested: boolean;     // True for multi-repo nested repos
  }>;
  monorepoProjects?: string[];  // For monorepo: ['frontend', 'backend', 'shared']
}

export class RepoStructureManager {
  private projectPath: string;
  private githubToken?: string;
  private stateManager: SetupStateManager;

  constructor(projectPath: string, githubToken?: string) {
    this.projectPath = projectPath;
    this.githubToken = githubToken;
    this.stateManager = new SetupStateManager(projectPath);

    // Initialize Git providers on instantiation
    initializeProviders();
  }

  /**
   * Prompt user for repository structure decisions
   *
   * @param preSelectedArchitecture - Optional pre-selected architecture to skip duplicate prompts
   */
  async promptStructure(preSelectedArchitecture?: ArchitectureChoice): Promise<RepoStructureConfig> {
    console.log(chalk.cyan.bold('\n🏗️  Repository Architecture Setup\n'));
    console.log(chalk.gray('Let\'s configure your repository structure for optimal organization.\n'));

    // Check for resumed setup
    const resumedState = await this.stateManager.detectAndResumeSetup();
    if (resumedState) {
      console.log(chalk.yellow('\n⏸️  Detected interrupted setup!'));
      console.log(chalk.gray(`   Last step: ${resumedState.currentStep}`));
      console.log(chalk.gray(`   Time: ${new Date(resumedState.timestamp).toLocaleString()}\n`));

      const shouldResume = await confirm({
        message: 'Resume previous setup?',
        default: true
      });

      if (shouldResume) {
        return this.resumeSetup(resumedState);
      } else {
        // Delete old state and start fresh
        await this.stateManager.deleteState();
      }
    }

    // Step 1: Ask about architecture type using consolidator (SKIP if pre-selected)
    let architecture: ArchitectureChoice;

    if (preSelectedArchitecture) {
      // Architecture already selected - skip duplicate prompt
      architecture = preSelectedArchitecture;
      console.log(chalk.green(`✓ Architecture: ${this.formatArchitectureForDisplay(architecture)}\n`));
    } else {
      // Ask user for architecture choice
      const promptData = getArchitecturePrompt();
      architecture = await select<ArchitectureChoice>({
        message: promptData.question,
        choices: promptData.options.map(opt => ({
          name: `${opt.label}\n${chalk.gray(opt.description)}\n${chalk.dim(opt.example)}`,
          value: opt.value as ArchitectureChoice
        })),
        default: 'single'
      });
    }

    // Step 2: Ask about Git hosting platform
    const registry = getPlatformRegistry();
    const platformOptions = registry.getPlatformOptions(true); // Include unsupported platforms
    const platformPromptData = getPlatformSelectionPrompt();

    console.log(chalk.cyan('\n' + platformPromptData.message));

    const platform = await select({
      message: platformPromptData.question,
      choices: platformOptions.map(opt => ({
        name: opt.disabled
          ? `${opt.name}\n${chalk.gray(opt.description)}\n${chalk.yellow('⚠️  ' + opt.disabled)}`
          : `${opt.name}\n${chalk.gray(opt.description)}`,
        value: opt.value,
        disabled: opt.disabled ? opt.disabled : false
      })),
      default: 'github'
    });

    // Get provider instance
    const provider = registry.getProvider(platform as GitPlatformType);
    if (!provider) {
      throw new Error(`Platform ${platform} is not available. This should not happen!`);
    }

    console.log(chalk.green(`\n✓ Using ${provider.config.name} as Git hosting platform\n`));

    // Step 3: Ask about Git remote URL format (SSH vs HTTPS)
    const urlTypePromptData = getUrlTypePrompt();
    const urlType = await select({
      message: urlTypePromptData.question,
      choices: urlTypePromptData.options.map(opt => ({
        name: `${opt.label}\n${chalk.gray(opt.description)}`,
        value: opt.value
      })),
      default: urlTypePromptData.default
    });

    console.log(chalk.green(`\n✓ Using ${urlType.toUpperCase()} remote URLs\n`));

    // Map ArchitectureChoice to internal architecture
    const mappedArch = this.mapArchitectureChoice(architecture as ArchitectureChoice);

    switch (mappedArch) {
      case 'single':
        return this.configureSingleRepo(urlType, platform as GitPlatformType, provider);
      case 'parent':
        // GitHub parent repo (pushed to GitHub)
        return this.configureMultiRepo(true, false, urlType, platform as GitPlatformType, provider);
      default:
        throw new Error(`Unknown architecture: ${architecture}`);
    }
  }

  /**
   * Map ArchitectureChoice to internal RepoArchitecture (2 options)
   */
  private mapArchitectureChoice(choice: ArchitectureChoice): RepoArchitecture {
    switch (choice) {
      case 'single':
        return 'single';
      case 'github-parent':
        return 'parent'; // GitHub parent repo (pushed to GitHub)
      default:
        return 'single';
    }
  }

  /**
   * Format architecture choice for display
   *
   * @param choice - Architecture choice
   * @returns Human-readable format
   */
  private formatArchitectureForDisplay(choice: ArchitectureChoice): string {
    switch (choice) {
      case 'single':
        return 'Single repository';
      case 'github-parent':
        return 'Parent repo + nested repos (GitHub)';
      default:
        return choice;
    }
  }

  /**
   * Resume setup from saved state
   */
  private async resumeSetup(state: SetupState): Promise<RepoStructureConfig> {
    // Default to GitHub platform for resumed setups (backward compatibility)
    const registry = getPlatformRegistry();
    const provider = registry.getProvider('github');
    if (!provider) {
      throw new Error('GitHub provider not available. This should not happen!');
    }

    // Convert saved state back to config format
    const config: RepoStructureConfig = {
      architecture: state.architecture as RepoArchitecture,
      urlType: 'ssh',  // Default to SSH for resumed setups
      platform: 'github',  // Default to GitHub for backward compatibility
      provider: provider,
      parentRepo: state.parentRepo,
      repositories: state.repos.map(r => ({
        id: r.id,
        name: r.repo,
        owner: r.owner,
        description: '', // Not saved in state
        path: r.path || r.id,
        visibility: r.visibility,
        createOnGitHub: r.created !== true,
        isNested: state.architecture === 'parent'
      })),
      monorepoProjects: state.monorepoProjects
    };

    console.log(chalk.green('✅ Setup resumed from previous session\n'));
    return config;
  }

  /**
   * Configure single repository
   */
  private async configureSingleRepo(
    urlType: 'ssh' | 'https' = 'ssh',
    platform: GitPlatformType = 'github',
    provider: GitProvider
  ): Promise<RepoStructureConfig> {
    console.log(chalk.cyan('\n📦 Single Repository Configuration\n'));

    // Check if repo already exists
    const hasGit = existsSync(path.join(this.projectPath, '.git'));

    if (hasGit) {
      // Try to detect existing remote
      try {
        const remote = execSync('git remote get-url origin', {
          cwd: this.projectPath,
          encoding: 'utf-8'
        }).trim();

        const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
        if (match) {
          const owner = match[1];
          const repo = match[2];

          console.log(chalk.green(`✓ Existing repository detected: ${owner}/${repo}`));

          const useExisting = await confirm({
            message: 'Use existing repository?',
            default: true
          });

          if (useExisting) {
            // Fetch description and visibility from GitHub API
            let description = `${repo} - SpecWeave project`;
            let visibility: 'private' | 'public' = 'private';
            if (this.githubToken) {
              try {
                const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                  headers: {
                    'Authorization': `Bearer ${this.githubToken}`,
                    'Accept': 'application/vnd.github+json'
                  }
                });
                if (response.ok) {
                  const data = await response.json() as any;
                  description = data.description || description;
                  visibility = data.private ? 'private' : 'public';
                }
              } catch {
                // Use defaults if fetch fails
              }
            }

            return {
              architecture: 'single',
              urlType,
              platform,
              provider,
              repositories: [{
                id: 'main',
                name: repo,
                owner: owner,
                description: description,
                path: '.',
                visibility: visibility, // Fetched from GitHub API
                createOnGitHub: false,
                isNested: false
              }]
            };
          }
        }
      } catch {
        // No remote or error, continue with manual config
      }
    }

    // Manual configuration
    const ownerAnswer = await input({
      message: 'GitHub owner/organization:',
      validate: (val: string) => !!val.trim() || 'Owner is required'
    });

    const repoAnswer = await input({
      message: 'Repository name:',
      default: path.basename(this.projectPath),
      validate: (val: string) => !!val.trim() || 'Repository name is required'
    });

    const descriptionAnswer = await input({
      message: 'Repository description:',
      default: 'My SpecWeave project'
    });

    const createOnGitHubAnswer = await confirm({
      message: 'Create repository on GitHub?',
      default: !hasGit
    });

    const answers = {
      owner: ownerAnswer,
      repo: repoAnswer,
      description: descriptionAnswer,
      createOnGitHub: createOnGitHubAnswer
    };

    // Ask about visibility only if creating a new repository
    let visibility: 'private' | 'public' = 'private';
    if (answers.createOnGitHub) {
      const visibilityPrompt = getVisibilityPrompt(answers.repo);
      visibility = await select({
        message: visibilityPrompt.question,
        choices: visibilityPrompt.options.map(opt => ({
          name: `${opt.label}\n${chalk.gray(opt.description)}`,
          value: opt.value as 'private' | 'public'
        })),
        default: visibilityPrompt.default
      });
    }

    return {
      architecture: 'single',
      urlType,
      platform,
      provider,
      repositories: [{
        id: 'main',
        name: answers.repo,
        owner: answers.owner,
        description: answers.description,
        path: '.',
        visibility: visibility,
        createOnGitHub: answers.createOnGitHub,
        isNested: false
      }]
    };
  }

  /**
   * Configure multi-repository architecture
   * @param useParent - Whether to use parent repository/folder
   * @param isLocalParent - If true, parent folder is local only (NOT pushed to GitHub)
   * @param urlType - Git remote URL format (ssh or https)
   * @param platform - Git hosting platform type
   * @param provider - Git provider instance for API operations
   *
   * NOTE: This is primarily user-facing output (console.log/console.error).
   * All console.* calls in this method are legitimate user-facing exceptions
   * as defined in CONTRIBUTING.md (colored messages, confirmations, formatted output).
   */
  private async configureMultiRepo(
    useParent: boolean = true,
    isLocalParent: boolean = false,
    urlType: 'ssh' | 'https' = 'ssh',
    platform: GitPlatformType = 'github',
    provider: GitProvider
  ): Promise<RepoStructureConfig> {
    console.log(chalk.cyan('\n🎯 Multi-Repository Configuration\n'));
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
    await this.saveSetupState({
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

    if (!isLocalParent && this.githubToken && useParent) {
      console.log(chalk.cyan('\n🚀 Repository Discovery\n'));
      console.log(chalk.gray('You\'re setting up multiple repositories. We can discover them automatically!\n'));

      const configMethod = await select({
        message: 'How do you want to configure repositories?',
        choices: [
          {
            name: [
              chalk.bold.green('🎯 Bulk Discovery (RECOMMENDED)'),
              chalk.gray('  Automatically discover repos from ' + provider.config.name),
              chalk.gray('  • Select parent from discovered list'),
              chalk.gray('  • Auto-configure implementation repos'),
              chalk.gray('  • Supports: all, pattern, regex filtering'),
              ''
            ].join('\n'),
            value: 'bulk-discovery'
          },
          {
            name: [
              chalk.bold('✏️  Manual Entry'),
              chalk.gray('  Enter each repository manually'),
              chalk.gray('  • Full control over settings'),
              chalk.gray('  • Best for new repos or custom setup'),
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
      console.log(chalk.cyan('\n👤 Repository Owner\n'));

      owner = await input({
        message: `${provider.config.name} owner/organization:`,
        validate: async (val: string) => {
          if (!val.trim()) return 'Owner is required';

          // Validate owner exists on the platform
          if (this.githubToken) {
            const result = await provider.validateOwner(val, this.githubToken);
            if (!result.valid) {
              return result.error || `Invalid ${provider.config.name} owner`;
            }
          }
          return true;
        }
      });

      // Discover repositories via pattern matching
      const octokit = new Octokit({ auth: this.githubToken });
      const isOrg = await provider.isOrganization(owner, this.githubToken);

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
        console.log(chalk.cyan('\n🏠 Select Parent Repository\n'));
        console.log(chalk.gray('Choose which repository will be the parent (contains .specweave/ structure)\n'));

        const parentChoices = [
          ...discoveredRepos.map((repo, index) => ({
            name: `${chalk.bold(repo.name)}\n${chalk.gray(repo.description || '(no description)')}`,
            value: index.toString(),
            short: repo.name
          })),
          {
            name: `${chalk.yellow('✏️  Enter parent manually')} ${chalk.gray('(not in discovered list)')}`,
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
                'Authorization': `Bearer ${this.githubToken}`,
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

          console.log(chalk.green(`\n✓ Using existing repository: ${owner}/${selectedParent.name}\n`));
          console.log(chalk.gray(`✓ Implementation repositories: ${discoveredRepos.length}\n`));

          // Save state: parent repo configured
          await this.saveSetupState({
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
        console.log(chalk.blue('\n💡 Local Parent Folder Setup'));
        console.log(chalk.gray('This folder will contain .specweave/ but will NOT be pushed to GitHub.\n'));

        const parentNameAnswer = await input({
          message: 'Parent folder name:',
          default: `${path.basename(this.projectPath)}`,
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
            if (this.githubToken) {
              const result = await provider.validateOwner(val, this.githubToken);
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
          console.log(chalk.cyan('\n📋 Existing Parent Repository\n'));

          // Ask for owner first
          const existingOwner = await input({
            message: `${provider.config.name} owner/organization:`,
            validate: async (val: string) => {
              if (!val.trim()) return 'Owner is required';

              // Validate owner exists on the platform
              if (this.githubToken) {
                const result = await provider.validateOwner(val, this.githubToken);
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
            default: `${path.basename(this.projectPath)}-parent`,
            validate: async (val: string) => {
              if (!val.trim()) return 'Repository name is required';

              // Validate repository EXISTS on the platform
              if (this.githubToken && ownerPrompt.owner) {
                const result = await provider.validateRepository(ownerPrompt.owner, val, this.githubToken);
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
          if (this.githubToken) {
            try {
              const response = await fetch(`https://api.github.com/repos/${ownerPrompt.owner}/${repoPrompt.parentName}`, {
                headers: {
                  'Authorization': `Bearer ${this.githubToken}`,
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

          console.log(chalk.green(`\n✓ Using existing repository: ${ownerPrompt.owner}/${repoPrompt.parentName}\n`));

        } else {
          // Creating new parent repository
          console.log(chalk.cyan('\n✨ New Parent Repository\n'));

          // Ask for owner (separate prompt to avoid validator issues)
          const newOwner = await input({
            message: `${provider.config.name} owner/organization for ALL repos:`,
            validate: async (val: string) => {
              if (!val.trim()) return 'Owner is required';

              // Validate owner exists on the platform
              if (this.githubToken) {
                const result = await provider.validateOwner(val, this.githubToken);
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
            default: `${path.basename(this.projectPath)}-parent`,
            validate: async (val: string) => {
              if (!val.trim()) return 'Repository name is required';

              // Validate repository DOESN'T exist
              if (this.githubToken && ownerPrompt.owner) {
                const result = await provider.validateRepository(ownerPrompt.owner, val, this.githubToken);
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
      await this.saveSetupState({
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
      console.log(chalk.green(`\n✓ Total repositories: ${repoCount + 1} (1 parent + ${repoCount} implementation)\n`));
    } else {
      // Manual entry: ask for count
      // Auto-detect existing folders
      const hints = await detectRepositoryHints(this.projectPath);

      if (hints.detectedFolders.length > 0) {
        console.log(chalk.green(`\n✓ Detected ${hints.detectedFolders.length} service folder(s):`));
        hints.detectedFolders.forEach(f => console.log(chalk.gray(`  • ${f}`)));
        console.log('');
      }

      // Show repository count clarification BEFORE asking
      if (useParent && config.parentRepo) {
        console.log(chalk.cyan('\n📊 Repository Count\n'));
        console.log(chalk.gray('You will create:'));
        if (isLocalParent) {
          console.log(chalk.white('  • 1 parent FOLDER (local only, .specweave/ gitignored)'));
          console.log(chalk.white('  • N implementation repositories (your services/apps on GitHub)'));
        } else {
          console.log(chalk.white('  • 1 parent repository (specs, docs, increments)'));
          console.log(chalk.white('  • N implementation repositories (your services/apps)'));
        }
        console.log(chalk.gray('\nNext question asks for: IMPLEMENTATION repositories ONLY (not counting parent)\n'));
      }

      // Ask how many implementation repositories
      const repoCountAnswer = await number({
        message: useParent
          ? '📦 How many IMPLEMENTATION repositories? (not counting parent)'
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
          console.log(chalk.green(`\n✓ Total repositories to create: ${repoCount} implementation repos`));
          console.log(chalk.gray(`  (Parent folder is local only, not counted)\n`));
        } else {
          const totalRepos = 1 + repoCount;
          console.log(chalk.green(`\n✓ Total repositories to create: ${totalRepos} (1 parent + ${repoCount} implementation)\n`));
        }
      }

      // Bulk repository discovery for manual flow (old behavior)
      if (this.githubToken && config.parentRepo && discoveryStrategy === 'manual') {
        const octokit = new Octokit({ auth: this.githubToken });
        const owner = config.parentRepo.owner;
        const isOrg = await provider.isOrganization(owner, this.githubToken);

        // Retry loop for pattern adjustment
        let discoveryResult: BulkDiscoveryResult | null = null;
        while (discoveryResult === null) {
          discoveryResult = await discoverRepositories(octokit, owner, isOrg, repoCount);
          // If null, user selected "go back and adjust pattern", loop will retry
          // If user selected "manual", discoveryResult will be { repositories: [], strategy: 'manual' }
        }

        if (discoveryResult) {
          bulkDiscoveryStrategy = discoveryResult.strategy;

          if (discoveryResult.strategy !== 'manual') {
            discoveredRepos = discoveryResult.repositories;

            // Update repoCount to match discovered repos
            if (discoveredRepos.length !== repoCount) {
              console.log(chalk.yellow(`\n📝 Adjusting repository count from ${repoCount} to ${discoveredRepos.length} (based on discovery)\n`));
              repoCount = discoveredRepos.length;
            }
          }
        }
      }
    }

    // Configure each repository
    console.log(chalk.cyan('\n📦 Configure Each Repository:\n'));

    const usedIds = new Set<string>();
    const configuredRepoNames: string[] = []; // Track configured repo names for smart ID generation

    for (let i = 0; i < repoCount; i++) {
      const discoveredRepo = discoveredRepos[i]; // May be undefined if manual
      const isDiscovered = bulkDiscoveryStrategy !== 'manual' && discoveredRepo;

      console.log(chalk.white(`\nRepository ${i + 1} of ${repoCount}:`));

      // Smart suggestion for ALL repos (not just first one!)
      const projectName = path.basename(this.projectPath);
      const suggestedName = isDiscovered ? discoveredRepo.name : suggestRepoName(projectName, i, repoCount);

      // If discovered, auto-use without confirmation (repos exist on GitHub)
      if (isDiscovered) {
        const smartId = generateRepoIdSmart(discoveredRepo.name, configuredRepoNames);
        const { id: suggestedId } = ensureUniqueId(smartId, usedIds);

        console.log(chalk.green(`   ✓ Using: ${chalk.bold(discoveredRepo.name)} ${chalk.gray(`(id: ${suggestedId})`)}`));

        usedIds.add(suggestedId);
        configuredRepoNames.push(discoveredRepo.name);

        config.repositories.push({
          id: suggestedId,
          name: discoveredRepo.name,
          owner: discoveredRepo.owner,
          description: discoveredRepo.description || `${discoveredRepo.name} service`,
          path: discoveredRepo.name, // Use full repo name as folder (not short ID)
          visibility: discoveredRepo.private ? 'private' : 'public',
          createOnGitHub: false, // Already exists!
          isNested: useParent
        });

        continue; // Skip manual prompts
      }

      // Manual entry (original behavior)
      const repoName = await input({
        message: 'Repository name:',
        default: suggestedName,
        validate: async (val: string) => {
          if (!val.trim()) return 'Repository name is required';

          // Validate repository doesn't exist (skip for discovered repos)
          if (!isDiscovered && this.githubToken && config.parentRepo) {
            const result = await provider.validateRepository(config.parentRepo.owner, val, this.githubToken);
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

      // Smart auto-generate ID from repository name (context-aware)
      const smartId = generateRepoIdSmart(repoAnswers.name, configuredRepoNames);
      const { id: suggestedId, wasModified } = ensureUniqueId(smartId, usedIds);

      // Auto-assign ID (no prompt unless conflict detected)
      let id = suggestedId;

      // Only prompt if ID was modified due to conflict
      if (wasModified) {
        console.log(chalk.yellow(`   ⚠️  ID conflict detected: "${smartId}" already used`));
        console.log(chalk.gray(`   → Suggested unique ID: "${suggestedId}"`));

        const confirmIdAnswer = await confirm({
          message: `Use "${suggestedId}" as repository ID?`,
          default: true
        });

        if (!confirmIdAnswer) {
          const customId = await input({
            message: 'Enter custom repository ID:',
            default: suggestedId,
            validate: (val: string) => {
              // Validate format
              const validation = validateRepoId(val);
              if (!validation.valid) {
                return validation.error || 'Invalid repository ID';
              }

              // Validate uniqueness
              if (usedIds.has(val)) {
                return 'Repository ID must be unique';
              }

              return true;
            }
          });
          id = customId;
        }
      } else {
        // Show auto-generated ID (no prompt)
        console.log(chalk.green(`   ✓ Repository ID: ${chalk.bold(id)} ${chalk.gray('(auto-generated)')}`));
      }

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
      await this.saveSetupState({
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

  /**
   * Save setup state for Ctrl+C recovery
   */
  private async saveSetupState(state: SetupState): Promise<void> {
    try {
      await this.stateManager.saveState(state);
    } catch (error: any) {
      console.warn(chalk.yellow(`⚠️  Failed to save setup state: ${error.message}`));
    }
  }

  /**
   * Configure monorepo
   */
  private async configureMonorepo(
    urlType: 'ssh' | 'https' = 'ssh',
    platform: GitPlatformType = 'github',
    provider: GitProvider
  ): Promise<RepoStructureConfig> {
    console.log(chalk.cyan('\n📚 Monorepo Configuration\n'));
    console.log(chalk.gray('Single repository with multiple projects/packages.\n'));

    const monoOwner = await input({
      message: 'GitHub owner/organization:',
      validate: (val: string) => !!val.trim() || 'Owner is required'
    });

    const monoRepo = await input({
      message: 'Repository name:',
      default: path.basename(this.projectPath),
      validate: (val: string) => !!val.trim() || 'Repository name is required'
    });

    const monoDescription = await input({
      message: 'Repository description:',
      default: 'Monorepo project'
    });

    const monoProjects = await input({
      message: 'Project names (comma-separated, e.g., frontend,backend,shared):',
      validate: (val: string) => {
        const projects = val.split(',').map(p => p.trim()).filter(Boolean);
        if (projects.length < 2) {
          return 'Monorepo should have at least 2 projects';
        }
        return true;
      }
    });

    const monoCreateOnGitHub = await confirm({
      message: 'Create repository on GitHub?',
      default: !existsSync(path.join(this.projectPath, '.git'))
    });

    const answers = {
      owner: monoOwner,
      repo: monoRepo,
      description: monoDescription,
      projects: monoProjects,
      createOnGitHub: monoCreateOnGitHub
    };

    // Ask about visibility only if creating a new repository
    let visibility: 'private' | 'public' = 'private';
    if (answers.createOnGitHub) {
      const visibilityPrompt = getVisibilityPrompt(answers.repo);
      visibility = await select({
        message: visibilityPrompt.question,
        choices: visibilityPrompt.options.map(opt => ({
          name: `${opt.label}\n${chalk.gray(opt.description)}`,
          value: opt.value as 'private' | 'public'
        })),
        default: visibilityPrompt.default
      });
    }

    const projects = answers.projects.split(',').map((p: string) => p.trim());

    return {
      architecture: 'monorepo',
      urlType,
      platform,
      provider,
      repositories: [{
        id: 'main',
        name: answers.repo,
        owner: answers.owner,
        description: answers.description,
        path: '.',
        visibility: visibility,
        createOnGitHub: answers.createOnGitHub,
        isNested: false
      }],
      monorepoProjects: projects
    };
  }

  /**
   * Create repositories on Git hosting platform via API
   */
  async createRepositories(config: RepoStructureConfig): Promise<void> {
    if (!this.githubToken) {
      console.log(chalk.yellow(`\n⚠️  No ${config.provider.config.name} token available`));
      console.log(chalk.gray(`   Skipping ${config.provider.config.name} repository creation`));
      console.log(chalk.gray('   You can create repositories manually later\n'));
      return;
    }

    const spinner = ora(`Creating ${config.provider.config.name} repositories...`).start();
    const created: string[] = [];
    const failed: string[] = [];

    // Create parent repository if needed
    if (config.parentRepo?.createOnGitHub) {
      try {
        await config.provider.createRepository({
          owner: config.parentRepo.owner,
          name: config.parentRepo.name,
          description: config.parentRepo.description,
          visibility: config.parentRepo.visibility
        }, this.githubToken);
        created.push(`${config.parentRepo.owner}/${config.parentRepo.name}`);

        // Save state: parent repo created
        await this.saveSetupState({
          version: '1.0.0',
          architecture: config.architecture as SetupArchitecture,
          parentRepo: { ...config.parentRepo!, url: config.provider.getRemoteUrl(config.parentRepo!.owner, config.parentRepo!.name, config.urlType) },
          repos: [],
          currentStep: 'parent-repo-created',
          timestamp: new Date().toISOString(),
          envCreated: false
        });
      } catch (error: any) {
        failed.push(`${config.parentRepo.owner}/${config.parentRepo.name}: ${error.message}`);
      }
    }

    // Create implementation repositories
    for (const repo of config.repositories) {
      if (repo.createOnGitHub) {
        try {
          await config.provider.createRepository({
            owner: repo.owner,
            name: repo.name,
            description: repo.description,
            visibility: repo.visibility
          }, this.githubToken);
          created.push(`${repo.owner}/${repo.name}`);
        } catch (error: any) {
          failed.push(`${repo.owner}/${repo.name}: ${error.message}`);
        }
      }
    }

    spinner.stop();

    if (created.length > 0) {
      console.log(chalk.green('\n✅ Created repositories:'));
      created.forEach(repo => {
        console.log(chalk.gray(`   • ${repo}`));
      });
    }

    if (failed.length > 0) {
      console.log(chalk.red('\n❌ Failed to create:'));
      failed.forEach(msg => {
        console.log(chalk.gray(`   • ${msg}`));
      });
    }

    // Generate and save .env file
    await this.generateEnvFile(config);

    // Show setup summary
    await this.showSetupSummary(config);

    // Delete state file (setup complete)
    await this.stateManager.deleteState();
  }

  /**
   * Generate .env file with GitHub token (only when gh CLI not available)
   */
  private async generateEnvFile(config: RepoStructureConfig): Promise<void> {
    const spinner = ora('Generating .env configuration...').start();

    try {
      // .env now only contains secrets (token)
      // All other config goes to config.json
      const envConfig: EnvConfig = {
        githubToken: this.githubToken,
      };

      await generateEnvFile(this.projectPath, envConfig);

      spinner.succeed('.env file created (token only)');
      console.log(chalk.gray('   File: .env (permissions: 0600)'));
      console.log(chalk.gray('   TIP: gh CLI auth is recommended over tokens'));
      console.log(chalk.yellow('   ⚠️  DO NOT commit .env to git (contains secrets!)'));

      // Save state: env created
      await this.saveSetupState({
        version: '1.0.0',
        architecture: config.architecture as SetupArchitecture,
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
        currentStep: 'env-created',
        timestamp: new Date().toISOString(),
        envCreated: true
      });
    } catch (error: any) {
      spinner.fail(`Failed to generate .env: ${error.message}`);
    }
  }

  /**
   * Show setup completion summary
   */
  private async showSetupSummary(config: RepoStructureConfig): Promise<void> {
    const projectName = path.basename(this.projectPath);

    const state: SetupState = {
      version: '1.0.0',
      architecture: config.architecture as SetupArchitecture,
      parentRepo: config.parentRepo,
      repos: config.repositories.map(r => ({
        id: r.id,
        repo: r.name,
        owner: r.owner,
        path: r.path,
        visibility: r.visibility,
        displayName: r.name,
        url: config.provider.getRemoteUrl(r.owner, r.name, config.urlType),
        created: false
      })),
      currentStep: 'complete',
      timestamp: new Date().toISOString(),
      envCreated: true
    };

    const summary = generateSetupSummary({
      projectName,
      state,
      folderStructure: config.repositories.map(r => r.path)
    });

    console.log('');
    console.log(summary);
  }

  /**
   * Create a single GitHub repository via API
   */
  private async createGitHubRepo(owner: string, name: string, description: string, visibility: 'private' | 'public' = 'private'): Promise<void> {
    // Check if it's an organization or user
    const isOrg = await this.isGitHubOrganization(owner);
    const endpoint = isOrg
      ? `https://api.github.com/orgs/${owner}/repos`
      : `https://api.github.com/user/repos`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        name,
        description,
        private: visibility === 'private',
        auto_init: false,
        has_issues: true,
        has_projects: true,
        has_wiki: false
      })
    });

    if (!response.ok) {
      const error = await response.json() as any;
      if (error.errors?.[0]?.message?.includes('already exists')) {
        // Repository already exists, not an error
        return;
      }
      throw new Error(error.message || `Failed to create repository: ${response.status}`);
    }
  }

  /**
   * Check if a GitHub account is an organization
   */
  private async isGitHubOrganization(account: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.github.com/users/${account}`, {
        headers: {
          'Authorization': `Bearer ${this.githubToken}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (response.ok) {
        const data = await response.json() as any;
        return data.type === 'Organization';
      }
    } catch {
      // Assume user if we can't determine
    }
    return false;
  }

  /**
   * Check if a repository exists on GitHub
   */
  private async repositoryExistsOnGitHub(owner: string, repo: string): Promise<boolean> {
    if (!this.githubToken) {
      return false;
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Authorization': `Bearer ${this.githubToken}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Clone or initialize a repository
   * If the repo exists on the platform, clone it; otherwise, init + add remote
   */
  private async cloneOrInitRepository(
    repoPath: string,
    owner: string,
    name: string,
    createOnGitHub: boolean,
    urlType: 'ssh' | 'https' = 'ssh',
    provider: GitProvider
  ): Promise<void> {
    // If .git already exists, skip
    if (existsSync(path.join(repoPath, '.git'))) {
      return;
    }

    const remoteUrl = provider.getRemoteUrl(owner, name, urlType);

    // Check if repository exists on GitHub
    const repoExists = await this.repositoryExistsOnGitHub(owner, name);

    if (repoExists) {
      // Repository exists - clone it
      console.log(chalk.gray(`   → Cloning existing repository from GitHub...`));

      try {
        // Remove directory if it exists and is empty
        if (existsSync(repoPath)) {
          const files = require('fs').readdirSync(repoPath);
          if (files.length === 0) {
            require('fs').rmdirSync(repoPath);
          }
        }

        // Clone the repository
        const parentDir = path.dirname(repoPath);
        const repoName = path.basename(repoPath);

        execFileNoThrowSync('git', ['clone', remoteUrl, repoName], { cwd: parentDir });
        console.log(chalk.green(`   ✓ Cloned ${owner}/${name}`));
      } catch (error: any) {
        console.log(chalk.yellow(`   ⚠️  Clone failed: ${error.message}`));
        console.log(chalk.gray(`   → Falling back to init + remote`));

        // Fallback: init + add remote
        if (!existsSync(repoPath)) {
          mkdirSync(repoPath, { recursive: true });
        }
        execFileNoThrowSync('git', ['init'], { cwd: repoPath });
        execFileNoThrowSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: repoPath });
      }
    } else {
      // Repository doesn't exist - init + add remote
      if (!createOnGitHub) {
        console.log(chalk.gray(`   → Repository will be created later (skipping for now)`));
        return;
      }

      console.log(chalk.gray(`   → Initializing empty git repository...`));

      if (!existsSync(repoPath)) {
        mkdirSync(repoPath, { recursive: true });
      }

      execFileNoThrowSync('git', ['init'], { cwd: repoPath });
      execFileNoThrowSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: repoPath });
      console.log(chalk.green(`   ✓ Initialized ${owner}/${name}`));
    }
  }

  /**
   * Initialize local git repositories
   */
  async initializeLocalRepos(config: RepoStructureConfig): Promise<void> {
    const spinner = ora('Initializing local repositories...').start();

    // Create directory structure based on architecture
    if (config.architecture === 'parent') {
      // Parent repo approach: ROOT-LEVEL cloning (not services/!)
      // Initialize parent repo at root
      if (!existsSync(path.join(this.projectPath, '.git'))) {
        execFileNoThrowSync('git', ['init'], { cwd: this.projectPath });

        if (config.parentRepo) {
          const remoteUrl = config.provider.getRemoteUrl(config.parentRepo.owner, config.parentRepo.name, config.urlType);
          execFileNoThrowSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: this.projectPath });
        }
      }

      // Initialize implementation repos at ROOT LEVEL
      for (const repo of config.repositories) {
        const repoPath = path.join(this.projectPath, repo.path);

        // Clone or initialize repository
        await this.cloneOrInitRepository(repoPath, repo.owner, repo.name, repo.createOnGitHub, config.urlType, config.provider);

        // Create basic structure (only if repo was just initialized, not cloned)
        if (!repo.createOnGitHub || !await this.repositoryExistsOnGitHub(repo.owner, repo.name)) {
          this.createBasicRepoStructure(repoPath, repo.id);
        }
      }
    } else if (config.architecture === 'multi-repo') {
      // Standard multi-repo: repos as subdirectories
      for (const repo of config.repositories) {
        const repoPath = path.join(this.projectPath, repo.path);

        // Clone or initialize repository
        await this.cloneOrInitRepository(repoPath, repo.owner, repo.name, repo.createOnGitHub, config.urlType, config.provider);

        // Create basic structure (only if repo was just initialized, not cloned)
        if (!repo.createOnGitHub || !await this.repositoryExistsOnGitHub(repo.owner, repo.name)) {
          this.createBasicRepoStructure(repoPath, repo.id);
        }
      }
    } else {
      // Single repo or monorepo
      if (!existsSync(path.join(this.projectPath, '.git'))) {
        execFileNoThrowSync('git', ['init'], { cwd: this.projectPath });

        const repo = config.repositories[0];
        if (repo) {
          const remoteUrl = config.provider.getRemoteUrl(repo.owner, repo.name, config.urlType);
          execFileNoThrowSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: this.projectPath });
        }
      }

      // For monorepo, create project directories
      if (config.architecture === 'monorepo' && config.monorepoProjects) {
        for (const project of config.monorepoProjects) {
          const projectPath = path.join(this.projectPath, 'packages', project);
          if (!existsSync(projectPath)) {
            mkdirSync(projectPath, { recursive: true });
          }
          this.createBasicRepoStructure(projectPath, project);
        }
      }
    }

    spinner.succeed('Local repositories initialized');
  }

  /**
   * Create basic structure for a repository/project
   *
   * NOTE: Only creates src/ and tests/ folders for nested projects.
   * Documentation lives in .specweave/docs/internal/specs/{project-id}/ (source of truth)
   */
  private createBasicRepoStructure(repoPath: string, projectId: string): void {
    // Create basic directories (NO docs/ - documentation lives in .specweave/)
    const dirs = ['src', 'tests'];
    for (const dir of dirs) {
      const dirPath = path.join(repoPath, dir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
    }

    // Create README.md
    const readmePath = path.join(repoPath, 'README.md');
    if (!existsSync(readmePath)) {
      const readmeContent = `# ${projectId}\n\n${projectId} service/component.\n\nPart of SpecWeave multi-repository project.\n`;
      writeFileSync(readmePath, readmeContent);
    }

    // Create .gitignore
    const gitignorePath = path.join(repoPath, '.gitignore');
    if (!existsSync(gitignorePath)) {
      const gitignoreContent = `node_modules/\ndist/\n.env\n.DS_Store\n*.log\n`;
      writeFileSync(gitignorePath, gitignoreContent);
    }
  }

  /**
   * Create SpecWeave project structure (simplified - ONLY specs folders)
   *
   * NOTE: As of v0.X.X (increment 0026), we ONLY create specs/ folders.
   * No modules/, team/, architecture/, legacy/ folders.
   */
  async createSpecWeaveStructure(config: RepoStructureConfig): Promise<void> {
    const specweavePath = path.join(this.projectPath, '.specweave');

    // Create project-specific spec folders (ONLY specs/, no nested folders)
    if (config.architecture === 'monorepo' && config.monorepoProjects) {
      // Monorepo: create specs folder for each project
      for (const project of config.monorepoProjects) {
        const projectSpecPath = path.join(
          specweavePath,
          'docs',
          'internal',
          'specs',
          project.toLowerCase()
        );

        if (!existsSync(projectSpecPath)) {
          mkdirSync(projectSpecPath, { recursive: true });
        }

        console.log(chalk.gray(`   ✓ Created project structure: ${project}`));
      }
    } else if (config.architecture === 'multi-repo' || config.architecture === 'parent') {
      // Multi-repo: create specs folder for each repository
      for (const repo of config.repositories) {
        const projectSpecPath = path.join(
          specweavePath,
          'docs',
          'internal',
          'specs',
          repo.id
        );

        if (!existsSync(projectSpecPath)) {
          mkdirSync(projectSpecPath, { recursive: true });
        }

        console.log(chalk.gray(`   ✓ Created project structure: ${repo.path}`));
      }
    }
  }
}