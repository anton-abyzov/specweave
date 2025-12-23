/**
 * Repository Structure Manager
 *
 * Handles various repository architectures for SpecWeave projects:
 * - Single repository
 * - Multi-repository (polyrepo/microservices) - all repos are equal, first is default
 * - Monorepo (single repo with multiple projects)
 *
 * v1.0.13: REMOVED parent repo concept - all repos are equal.
 *
 * Provides capabilities to:
 * - Create GitHub repositories via API
 * - Initialize git repositories locally
 * - Configure proper folder structure
 * - Organize specs per project/team
 * - Split tasks between repositories
 */

import { existsSync } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { select, input, confirm } from '@inquirer/prompts';
import ora from 'ora';
import { execSync } from 'child_process';
import { SetupStateManager, SetupState, type SetupArchitecture } from './setup-state-manager.js';
import { generateEnvFile, type EnvConfig } from '../../utils/env-file-generator.js';
import { generateSetupSummary } from './setup-summary.js';
import {
  getArchitecturePrompt,
  getVisibilityPrompt,
  getUrlTypePrompt,
  type ArchitectureChoice
} from './prompt-consolidator.js';
import { initializeProviders } from './providers/index.js';
import { getPlatformRegistry } from './platform-registry.js';
import type { GitProvider, GitPlatformType } from './git-provider.js';
import { getPlatformSelectionPrompt } from './prompt-consolidator.js';
// Extracted modules to reduce file size and prevent crashes
import { configureMultiRepo } from './multi-repo-configurator.js';
import {
  initializeLocalRepos as initLocalRepos,
  createSpecWeaveStructure as createSpecWeaveStruct
} from './repo-initializer.js';

/** v1.0.13: 'parent' is deprecated - kept for backward compatibility */
export type RepoArchitecture = 'single' | 'multi-repo' | 'monorepo' | 'parent';

export interface RepoStructureConfig {
  architecture: RepoArchitecture;
  urlType: 'ssh' | 'https';  // Git remote URL format (SSH recommended)
  platform: GitPlatformType;  // Git hosting platform (github, gitlab, bitbucket, etc.)
  provider: GitProvider;      // Git provider instance for API operations
  /** @deprecated v1.0.13 - Parent repo concept removed. Kept for backward compatibility. */
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
   * @param preSelectedPlatform - Optional pre-selected platform to skip duplicate prompts (v1.0.7)
   * @param preSelectedUrlType - Optional pre-selected URL type to skip duplicate prompts (v1.0.7)
   */
  async promptStructure(
    preSelectedArchitecture?: ArchitectureChoice,
    preSelectedPlatform?: GitPlatformType,
    preSelectedUrlType?: 'ssh' | 'https'
  ): Promise<RepoStructureConfig> {
    // CRITICAL (v1.0.5): Skip header when architecture is pre-selected (already shown in repo setup)
    if (!preSelectedArchitecture) {
      console.log(chalk.cyan.bold('\n🏗️  Repository Architecture Setup\n'));
      console.log(chalk.gray('Let\'s configure your repository structure for optimal organization.\n'));
    }

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

    // Step 2: Ask about Git hosting platform (SKIP if pre-selected - v1.0.7)
    const registry = getPlatformRegistry();
    let platform: GitPlatformType;
    let provider: GitProvider;

    if (preSelectedPlatform) {
      // Platform already selected (e.g., user chose GitHub for repos AND GitHub Issues)
      platform = preSelectedPlatform;
      const resolvedProvider = registry.getProvider(platform);
      if (!resolvedProvider) {
        throw new Error(`Platform ${platform} is not available. This should not happen!`);
      }
      provider = resolvedProvider;
      console.log(chalk.green(`✓ Using ${provider.config.name} as Git hosting platform\n`));
    } else {
      // Ask user for platform choice
      const platformOptions = registry.getPlatformOptions(true); // Include unsupported platforms
      const platformPromptData = getPlatformSelectionPrompt();

      console.log(chalk.cyan('\n' + platformPromptData.message));

      platform = await select({
        message: platformPromptData.question,
        choices: platformOptions.map(opt => ({
          name: opt.disabled
            ? `${opt.name}\n${chalk.gray(opt.description)}\n${chalk.yellow('⚠️  ' + opt.disabled)}`
            : `${opt.name}\n${chalk.gray(opt.description)}`,
          value: opt.value,
          disabled: opt.disabled ? opt.disabled : false
        })),
        default: 'github'
      }) as GitPlatformType;

      // Get provider instance
      const resolvedProvider = registry.getProvider(platform);
      if (!resolvedProvider) {
        throw new Error(`Platform ${platform} is not available. This should not happen!`);
      }
      provider = resolvedProvider;

      console.log(chalk.green(`\n✓ Using ${provider.config.name} as Git hosting platform\n`));
    }

    // Step 3: Ask about Git remote URL format (SKIP if pre-selected - v1.0.7)
    let urlType: 'ssh' | 'https';

    if (preSelectedUrlType) {
      // URL type already selected
      urlType = preSelectedUrlType;
      console.log(chalk.green(`✓ Using ${urlType.toUpperCase()} remote URLs\n`));
    } else {
      // Ask user for URL type choice
      const urlTypePromptData = getUrlTypePrompt();
      urlType = await select({
        message: urlTypePromptData.question,
        choices: urlTypePromptData.options.map(opt => ({
          name: `${opt.label}\n${chalk.gray(opt.description)}`,
          value: opt.value
        })),
        default: urlTypePromptData.default
      }) as 'ssh' | 'https';

      console.log(chalk.green(`\n✓ Using ${urlType.toUpperCase()} remote URLs\n`));
    }

    // Map ArchitectureChoice to internal architecture
    const mappedArch = this.mapArchitectureChoice(architecture as ArchitectureChoice);

    switch (mappedArch) {
      case 'single':
        return this.configureSingleRepo(urlType, platform as GitPlatformType, provider);
      case 'multi-repo':
        // Multi-repo: all repos are equal, first is default
        return configureMultiRepo({
          projectPath: this.projectPath,
          githubToken: this.githubToken,
          stateManager: this.stateManager,
          urlType,
          platform: platform as GitPlatformType,
          provider
        });
      default:
        throw new Error(`Unknown architecture: ${architecture}`);
    }
  }

  /**
   * Map ArchitectureChoice to internal RepoArchitecture (2 options)
   * v1.0.13: github-parent now maps to multi-repo (no parent concept)
   */
  private mapArchitectureChoice(choice: ArchitectureChoice): RepoArchitecture {
    switch (choice) {
      case 'single':
        return 'single';
      case 'github-parent':
        return 'multi-repo'; // v1.0.13: No parent concept, all repos equal
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
        return 'Multiple repositories (equal, first is default)';
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
    // v1.0.13: Map old 'parent' architecture to 'multi-repo'
    const arch = state.architecture === 'parent' ? 'multi-repo' : state.architecture;
    const config: RepoStructureConfig = {
      architecture: arch as RepoArchitecture,
      urlType: 'ssh',  // Default to SSH for resumed setups
      platform: 'github',  // Default to GitHub for backward compatibility
      provider: provider,
      repositories: state.repos.map(r => ({
        id: r.id,
        name: r.repo,
        owner: r.owner,
        description: '', // Not saved in state
        // For multi-repo, path should include repositories/ prefix
        // Fallback to constructed path if state.path is missing (legacy state files)
        path: r.path || (state.architecture === 'multi-repo' || state.architecture === 'parent'
          ? `repositories/${r.owner}/${r.repo}`
          : r.id),
        visibility: r.visibility,
        createOnGitHub: r.created !== true,
        isNested: false
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

    // Create repositories (v1.0.13: no parent concept, all repos equal)
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
      await this.stateManager.saveState({
        version: '1.0.0',
        architecture: config.architecture as SetupArchitecture,
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
   * Initialize local git repositories
   * Delegates to extracted repo-initializer module
   */
  async initializeLocalRepos(config: RepoStructureConfig): Promise<void> {
    return initLocalRepos(config, this.projectPath, this.githubToken);
  }

  /**
   * Create SpecWeave project structure
   * Delegates to extracted repo-initializer module
   */
  async createSpecWeaveStructure(config: RepoStructureConfig): Promise<void> {
    return createSpecWeaveStruct(config, this.projectPath);
  }
}