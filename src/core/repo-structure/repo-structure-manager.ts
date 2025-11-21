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

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { execSync } from 'child_process';
import { execFileNoThrowSync } from '../../utils/execFileNoThrow.js';
import { generateRepoId, generateRepoIdSmart, ensureUniqueId, validateRepoId, suggestRepoName } from './repo-id-generator.js';
import { SetupStateManager, SetupState, type SetupArchitecture, type ParentRepoConfig } from './setup-state-manager.js';
import { validateRepository, validateOwner } from './github-validator.js';
import { generateEnvFile, type EnvConfig, type RepoMapping } from '../../utils/env-file-generator.js';
import { generateSetupSummary, type SummaryConfig } from './setup-summary.js';
import {
  getArchitecturePrompt,
  getParentRepoBenefits,
  getRepoCountClarification,
  getVisibilityPrompt,
  type ArchitectureChoice
} from './prompt-consolidator.js';
import { detectRepositoryHints } from './folder-detector.js';

export type RepoArchitecture = 'single' | 'multi-repo' | 'monorepo' | 'parent';

export interface RepoStructureConfig {
  architecture: RepoArchitecture;
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
  }

  /**
   * Prompt user for repository structure decisions
   */
  async promptStructure(): Promise<RepoStructureConfig> {
    console.log(chalk.cyan.bold('\n🏗️  Repository Architecture Setup\n'));
    console.log(chalk.gray('Let\'s configure your repository structure for optimal organization.\n'));

    // Check for resumed setup
    const resumedState = await this.stateManager.detectAndResumeSetup();
    if (resumedState) {
      console.log(chalk.yellow('\n⏸️  Detected interrupted setup!'));
      console.log(chalk.gray(`   Last step: ${resumedState.currentStep}`));
      console.log(chalk.gray(`   Time: ${new Date(resumedState.timestamp).toLocaleString()}\n`));

      const { shouldResume } = await inquirer.prompt([{
        type: 'confirm',
        name: 'shouldResume',
        message: 'Resume previous setup?',
        default: true
      }]);

      if (shouldResume) {
        return this.resumeSetup(resumedState);
      } else {
        // Delete old state and start fresh
        await this.stateManager.deleteState();
      }
    }

    // Step 1: Ask about architecture type using consolidator
    const promptData = getArchitecturePrompt();
    const { architecture } = await inquirer.prompt([{
      type: 'list',
      name: 'architecture',
      message: promptData.question,
      choices: promptData.options.map(opt => ({
        name: `${opt.label}\n${chalk.gray(opt.description)}\n${chalk.dim(opt.example)}`,
        value: opt.value,
        short: opt.label
      })),
      default: 'single'
    }]);

    // Map ArchitectureChoice to internal architecture
    const mappedArch = this.mapArchitectureChoice(architecture as ArchitectureChoice);

    switch (mappedArch) {
      case 'single':
        return this.configureSingleRepo();
      case 'parent':
        // GitHub parent repo (pushed to GitHub)
        return this.configureMultiRepo(true, false);
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
   * Resume setup from saved state
   */
  private async resumeSetup(state: SetupState): Promise<RepoStructureConfig> {
    // Convert saved state back to config format
    const config: RepoStructureConfig = {
      architecture: state.architecture as RepoArchitecture,
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
  private async configureSingleRepo(): Promise<RepoStructureConfig> {
    console.log(chalk.cyan('\n📦 Single Repository Configuration\n'));

    // Check if repo already exists
    const hasGit = fs.existsSync(path.join(this.projectPath, '.git'));

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

          const { useExisting } = await inquirer.prompt([{
            type: 'confirm',
            name: 'useExisting',
            message: 'Use existing repository?',
            default: true
          }]);

          if (useExisting) {
            return {
              architecture: 'single',
              repositories: [{
                id: 'main',
                name: repo,
                owner: owner,
                description: `${repo} - SpecWeave project`,
                path: '.',
                visibility: 'private', // Default for existing repo
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
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'owner',
        message: 'GitHub owner/organization:',
        validate: (input: string) => !!input.trim() || 'Owner is required'
      },
      {
        type: 'input',
        name: 'repo',
        message: 'Repository name:',
        default: path.basename(this.projectPath),
        validate: (input: string) => !!input.trim() || 'Repository name is required'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Repository description:',
        default: 'My SpecWeave project'
      },
      {
        type: 'confirm',
        name: 'createOnGitHub',
        message: 'Create repository on GitHub?',
        default: !hasGit
      }
    ]);

    // Ask about visibility
    const visibilityPrompt = getVisibilityPrompt(answers.repo);
    const { visibility } = await inquirer.prompt([{
      type: 'list',
      name: 'visibility',
      message: visibilityPrompt.question,
      choices: visibilityPrompt.options.map(opt => ({
        name: `${opt.label}\n${chalk.gray(opt.description)}`,
        value: opt.value,
        short: opt.label
      })),
      default: visibilityPrompt.default
    }]);

    return {
      architecture: 'single',
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
   *
   * NOTE: This is primarily user-facing output (console.log/console.error).
   * All console.* calls in this method are legitimate user-facing exceptions
   * as defined in CONTRIBUTING.md (colored messages, confirmations, formatted output).
   */
  private async configureMultiRepo(useParent: boolean = true, isLocalParent: boolean = false): Promise<RepoStructureConfig> {
    console.log(chalk.cyan('\n🎯 Multi-Repository Configuration\n'));
    console.log(chalk.gray('This creates separate repositories for each service/component.\n'));

    // Show parent repo benefits if using parent approach
    if (useParent) {
      console.log(chalk.blue(getParentRepoBenefits()));
      console.log('');
    }

    const config: RepoStructureConfig = {
      architecture: useParent ? 'parent' : 'multi-repo',
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

    // Configure parent repository if using that approach
    if (useParent) {
      let parentAnswers: any;

      if (isLocalParent) {
        // Local parent: Skip GitHub questions, just ask for folder name
        console.log(chalk.blue('\n💡 Local Parent Folder Setup'));
        console.log(chalk.gray('This folder will contain .specweave/ but will NOT be pushed to GitHub.\n'));

        parentAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'parentName',
            message: 'Parent folder name:',
            default: `${path.basename(this.projectPath)}`,
            validate: (input: string) => {
              if (!input.trim()) return 'Folder name is required';
              return true;
            }
          },
          {
            type: 'input',
            name: 'owner',
            message: 'GitHub owner/organization for IMPLEMENTATION repos:',
            validate: async (input: string) => {
              if (!input.trim()) return 'Owner is required';

              // Validate owner exists on GitHub
              if (this.githubToken) {
                const result = await validateOwner(input, this.githubToken);
                if (!result.valid) {
                  return result.error || 'Invalid GitHub owner';
                }
              }
              return true;
            }
          }
        ]);

        // Set defaults for local parent
        parentAnswers.description = 'Local parent folder (not synced to GitHub)';
        parentAnswers.createOnGitHub = false; // Never create GitHub repo for local parent
      } else {
        // GitHub parent: First ask if using existing or creating new
        const { parentChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'parentChoice',
            message: 'Parent repository setup:',
            choices: [
              {
                name: `${chalk.green('Use existing parent repository')}\n${chalk.gray('Connect to an existing GitHub repo that already has .specweave/ structure')}`,
                value: 'existing',
                short: 'Use existing'
              },
              {
                name: `${chalk.blue('Create new parent repository')}\n${chalk.gray('Create a new GitHub repo for specs, docs, and architecture')}`,
                value: 'new',
                short: 'Create new'
              }
            ],
            default: 'new'
          }
        ]);

        if (parentChoice === 'existing') {
          // Using existing parent repository
          console.log(chalk.cyan('\n📋 Existing Parent Repository\n'));

          // Ask for owner first
          const ownerPrompt = await inquirer.prompt([
            {
              type: 'input',
              name: 'owner',
              message: 'GitHub owner/organization:',
              validate: async (input: string) => {
                if (!input.trim()) return 'Owner is required';

                // Validate owner exists on GitHub
                if (this.githubToken) {
                  const result = await validateOwner(input, this.githubToken);
                  if (!result.valid) {
                    return result.error || 'Invalid GitHub owner';
                  }
                }
                return true;
              }
            }
          ]);

          // Ask for existing repo name
          const repoPrompt = await inquirer.prompt([
            {
              type: 'input',
              name: 'parentName',
              message: 'Existing parent repository name:',
              default: `${path.basename(this.projectPath)}-parent`,
              validate: async (input: string) => {
                if (!input.trim()) return 'Repository name is required';

                // Validate repository EXISTS on GitHub
                if (this.githubToken && ownerPrompt.owner) {
                  const result = await validateRepository(ownerPrompt.owner, input, this.githubToken);
                  if (!result.exists) {
                    return `Repository ${ownerPrompt.owner}/${input} not found on GitHub. Please check the name or choose 'Create new'.`;
                  }
                }
                return true;
              }
            }
          ]);

          // Fetch description from GitHub API (or use default)
          let description = 'SpecWeave parent repository - specs, docs, and architecture';
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
              }
            } catch {
              // Use default if fetch fails
            }
          }

          parentAnswers = {
            owner: ownerPrompt.owner,
            parentName: repoPrompt.parentName,
            description: description,
            createOnGitHub: false // Don't create, it already exists!
          };

          console.log(chalk.green(`\n✓ Using existing repository: ${ownerPrompt.owner}/${repoPrompt.parentName}\n`));

        } else {
          // Creating new parent repository
          console.log(chalk.cyan('\n✨ New Parent Repository\n'));

          // Ask for owner (separate prompt to avoid validator issues)
          const ownerPrompt = await inquirer.prompt([
            {
              type: 'input',
              name: 'owner',
              message: 'GitHub owner/organization for ALL repos:',
              validate: async (input: string) => {
                if (!input.trim()) return 'Owner is required';

                // Validate owner exists on GitHub
                if (this.githubToken) {
                  const result = await validateOwner(input, this.githubToken);
                  if (!result.valid) {
                    return result.error || 'Invalid GitHub owner';
                  }
                }
                return true;
              }
            }
          ]);

          // Now ask remaining questions, using the owner value
          const remainingAnswers = await inquirer.prompt([
            {
              type: 'input',
              name: 'parentName',
              message: 'Parent repository name:',
              default: `${path.basename(this.projectPath)}-parent`,
              validate: async (input: string) => {
                if (!input.trim()) return 'Repository name is required';

                // Validate repository DOESN'T exist
                if (this.githubToken && ownerPrompt.owner) {
                  const result = await validateRepository(ownerPrompt.owner, input, this.githubToken);
                  if (result.exists) {
                    return `Repository ${ownerPrompt.owner}/${input} already exists at ${result.url}. Please choose 'Use existing' or pick a different name.`;
                  }
                }
                return true;
              }
            },
            {
              type: 'input',
              name: 'description',
              message: 'Parent repository description:',
              default: 'SpecWeave parent repository - specs, docs, and architecture'
            },
            {
              type: 'confirm',
              name: 'createOnGitHub',
              message: 'Create parent repository on GitHub?',
              default: true
            }
          ] as any);

          // Merge the answers
          parentAnswers = { ...ownerPrompt, ...remainingAnswers };
        }
      }

      // Ask about visibility for parent repo (only if creating on GitHub)
      let parentVisibility: 'private' | 'public' = 'private';
      if (!isLocalParent) {
        const parentVisibilityPrompt = getVisibilityPrompt(parentAnswers.parentName);
        const result = await inquirer.prompt([{
          type: 'list',
          name: 'parentVisibility',
          message: parentVisibilityPrompt.question,
          choices: parentVisibilityPrompt.options.map(opt => ({
            name: `${opt.label}\n${chalk.gray(opt.description)}`,
            value: opt.value,
            short: opt.label
          })),
          default: parentVisibilityPrompt.default
        }]);
        parentVisibility = result.parentVisibility;
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
    const { repoCount } = await inquirer.prompt([{
      type: 'number',
      name: 'repoCount',
      message: useParent
        ? '📦 How many IMPLEMENTATION repositories? (not counting parent)'
        : 'How many repositories?',
      default: hints.suggestedCount,  // Use auto-detected count
      validate: (input: number) => {
        if (input < 1) return useParent
          ? 'Need at least 1 implementation repository'
          : 'Need at least 2 repositories';
        if (input > 10) return 'Maximum 10 repositories supported';
        return true;
      }
    }]);

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

    // Configure each repository
    console.log(chalk.cyan('\n📦 Configure Each Repository:\n'));

    const usedIds = new Set<string>();
    const configuredRepoNames: string[] = []; // Track configured repo names for smart ID generation

    for (let i = 0; i < repoCount; i++) {
      console.log(chalk.white(`\nRepository ${i + 1} of ${repoCount}:`));

      // Smart suggestion for ALL repos (not just first one!)
      const projectName = path.basename(this.projectPath);
      const suggestedName = suggestRepoName(projectName, i, repoCount);

      const repoAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Repository name:',
          default: suggestedName,  // Now suggests for ALL repos!
          validate: async (input: string) => {
            if (!input.trim()) return 'Repository name is required';

            // Validate repository doesn't exist
            if (this.githubToken && config.parentRepo) {
              const result = await validateRepository(config.parentRepo.owner, input, this.githubToken);
              if (result.exists) {
                return `Repository ${config.parentRepo.owner}/${input} already exists at ${result.url}`;
              }
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'description',
          message: 'Repository description:',
          default: (answers: any) => `${path.basename(answers.name)} service`
        },
        {
          type: 'confirm',
          name: 'createOnGitHub',
          message: 'Create this repository on GitHub?',
          default: true
        }
      ]);

      // Smart auto-generate ID from repository name (context-aware)
      const smartId = generateRepoIdSmart(repoAnswers.name, configuredRepoNames);
      const { id: suggestedId, wasModified } = ensureUniqueId(smartId, usedIds);

      // Auto-assign ID (no prompt unless conflict detected)
      let id = suggestedId;

      // Only prompt if ID was modified due to conflict
      if (wasModified) {
        console.log(chalk.yellow(`   ⚠️  ID conflict detected: "${smartId}" already used`));
        console.log(chalk.gray(`   → Suggested unique ID: "${suggestedId}"`));

        const { confirmId } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmId',
          message: `Use "${suggestedId}" as repository ID?`,
          default: true
        }]);

        if (!confirmId) {
          const { customId } = await inquirer.prompt([{
            type: 'input',
            name: 'customId',
            message: 'Enter custom repository ID:',
            default: suggestedId,
            validate: (input: string) => {
              // Validate format
              const validation = validateRepoId(input);
              if (!validation.valid) {
                return validation.error || 'Invalid repository ID';
              }

              // Validate uniqueness
              if (usedIds.has(input)) {
                return 'Repository ID must be unique';
              }

              return true;
            }
          }]);
          id = customId;
        }
      } else {
        // Show auto-generated ID (no prompt)
        console.log(chalk.green(`   ✓ Repository ID: ${chalk.bold(id)} ${chalk.gray('(auto-generated)')}`));
      }

      usedIds.add(id);
      configuredRepoNames.push(repoAnswers.name);

      // Ask about visibility
      const visibilityPrompt = getVisibilityPrompt(repoAnswers.name);
      const { visibility } = await inquirer.prompt([{
        type: 'list',
        name: 'visibility',
        message: visibilityPrompt.question,
        choices: visibilityPrompt.options.map(opt => ({
          name: `${opt.label}\n${chalk.gray(opt.description)}`,
          value: opt.value,
          short: opt.label
        })),
        default: visibilityPrompt.default
      }]);

      config.repositories.push({
        id: id,
        name: repoAnswers.name,
        owner: config.parentRepo?.owner || '',
        description: repoAnswers.description,
        path: useParent ? id : id, // Root-level cloning (not services/)
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
  private async configureMonorepo(): Promise<RepoStructureConfig> {
    console.log(chalk.cyan('\n📚 Monorepo Configuration\n'));
    console.log(chalk.gray('Single repository with multiple projects/packages.\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'owner',
        message: 'GitHub owner/organization:',
        validate: (input: string) => !!input.trim() || 'Owner is required'
      },
      {
        type: 'input',
        name: 'repo',
        message: 'Repository name:',
        default: path.basename(this.projectPath),
        validate: (input: string) => !!input.trim() || 'Repository name is required'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Repository description:',
        default: 'Monorepo project'
      },
      {
        type: 'input',
        name: 'projects',
        message: 'Project names (comma-separated, e.g., frontend,backend,shared):',
        validate: (input: string) => {
          const projects = input.split(',').map(p => p.trim()).filter(Boolean);
          if (projects.length < 2) {
            return 'Monorepo should have at least 2 projects';
          }
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'createOnGitHub',
        message: 'Create repository on GitHub?',
        default: !fs.existsSync(path.join(this.projectPath, '.git'))
      }
    ]);

    // Ask about visibility
    const visibilityPrompt = getVisibilityPrompt(answers.repo);
    const { visibility } = await inquirer.prompt([{
      type: 'list',
      name: 'visibility',
      message: visibilityPrompt.question,
      choices: visibilityPrompt.options.map(opt => ({
        name: `${opt.label}\n${chalk.gray(opt.description)}`,
        value: opt.value,
        short: opt.label
      })),
      default: visibilityPrompt.default
    }]);

    const projects = answers.projects.split(',').map((p: string) => p.trim());

    return {
      architecture: 'monorepo',
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
   * Create repositories on GitHub via API
   */
  async createGitHubRepositories(config: RepoStructureConfig): Promise<void> {
    if (!this.githubToken) {
      console.log(chalk.yellow('\n⚠️  No GitHub token available'));
      console.log(chalk.gray('   Skipping GitHub repository creation'));
      console.log(chalk.gray('   You can create repositories manually later\n'));
      return;
    }

    const spinner = ora('Creating GitHub repositories...').start();
    const created: string[] = [];
    const failed: string[] = [];

    // Create parent repository if needed
    if (config.parentRepo?.createOnGitHub) {
      try {
        await this.createGitHubRepo(
          config.parentRepo.owner,
          config.parentRepo.name,
          config.parentRepo.description,
          config.parentRepo.visibility
        );
        created.push(`${config.parentRepo.owner}/${config.parentRepo.name}`);

        // Save state: parent repo created
        await this.saveSetupState({
          version: '1.0.0',
          architecture: config.architecture as SetupArchitecture,
          parentRepo: { ...config.parentRepo!, url: `https://github.com/${config.parentRepo!.owner}/${config.parentRepo!.name}` },
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
          await this.createGitHubRepo(
            repo.owner,
            repo.name,
            repo.description,
            repo.visibility
          );
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
   * Generate .env file with GitHub configuration
   */
  private async generateEnvFile(config: RepoStructureConfig): Promise<void> {
    const spinner = ora('Generating .env configuration...').start();

    try {
      const envConfig: EnvConfig = {
        githubToken: this.githubToken,
        githubOwner: config.parentRepo?.owner || config.repositories[0]?.owner,
        repos: config.repositories.map(r => ({
          id: r.id,
          repo: r.name
        })),
        syncEnabled: true,
        autoCreateIssue: true,
        syncDirection: 'bidirectional'
      };

      await generateEnvFile(this.projectPath, envConfig);

      spinner.succeed('.env file created');
      console.log(chalk.gray('   File: .env (permissions: 0600)'));
      console.log(chalk.gray('   File: .env.example (safe to commit)'));
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
        url: `https://github.com/${r.owner}/${r.name}`,
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
   */
  async initializeLocalRepos(config: RepoStructureConfig): Promise<void> {
    const spinner = ora('Initializing local repositories...').start();

    // Create directory structure based on architecture
    if (config.architecture === 'parent') {
      // Parent repo approach: ROOT-LEVEL cloning (not services/!)
      // Initialize parent repo at root
      if (!fs.existsSync(path.join(this.projectPath, '.git'))) {
        execFileNoThrowSync('git', ['init'], { cwd: this.projectPath });

        if (config.parentRepo) {
          const remoteUrl = `https://github.com/${config.parentRepo.owner}/${config.parentRepo.name}.git`;
          execFileNoThrowSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: this.projectPath });
        }
      }

      // Initialize implementation repos at ROOT LEVEL
      for (const repo of config.repositories) {
        const repoPath = path.join(this.projectPath, repo.path);

        // Create directory if needed
        if (!fs.existsSync(repoPath)) {
          fs.mkdirSync(repoPath, { recursive: true });
        }

        // Initialize git
        if (!fs.existsSync(path.join(repoPath, '.git'))) {
          execFileNoThrowSync('git', ['init'], { cwd: repoPath });

          const remoteUrl = `https://github.com/${repo.owner}/${repo.name}.git`;
          execFileNoThrowSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: repoPath });
        }

        // Create basic structure
        this.createBasicRepoStructure(repoPath, repo.id);
      }
    } else if (config.architecture === 'multi-repo') {
      // Standard multi-repo: repos as subdirectories
      for (const repo of config.repositories) {
        const repoPath = path.join(this.projectPath, repo.path);

        if (!fs.existsSync(repoPath)) {
          fs.mkdirSync(repoPath, { recursive: true });
        }

        if (!fs.existsSync(path.join(repoPath, '.git'))) {
          execFileNoThrowSync('git', ['init'], { cwd: repoPath });

          const remoteUrl = `https://github.com/${repo.owner}/${repo.name}.git`;
          execFileNoThrowSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: repoPath });
        }

        this.createBasicRepoStructure(repoPath, repo.id);
      }
    } else {
      // Single repo or monorepo
      if (!fs.existsSync(path.join(this.projectPath, '.git'))) {
        execFileNoThrowSync('git', ['init'], { cwd: this.projectPath });

        const repo = config.repositories[0];
        if (repo) {
          const remoteUrl = `https://github.com/${repo.owner}/${repo.name}.git`;
          execFileNoThrowSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: this.projectPath });
        }
      }

      // For monorepo, create project directories
      if (config.architecture === 'monorepo' && config.monorepoProjects) {
        for (const project of config.monorepoProjects) {
          const projectPath = path.join(this.projectPath, 'packages', project);
          if (!fs.existsSync(projectPath)) {
            fs.mkdirSync(projectPath, { recursive: true });
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
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Create README.md
    const readmePath = path.join(repoPath, 'README.md');
    if (!fs.existsSync(readmePath)) {
      const readmeContent = `# ${projectId}\n\n${projectId} service/component.\n\nPart of SpecWeave multi-repository project.\n`;
      fs.writeFileSync(readmePath, readmeContent);
    }

    // Create .gitignore
    const gitignorePath = path.join(repoPath, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      const gitignoreContent = `node_modules/\ndist/\n.env\n.DS_Store\n*.log\n`;
      fs.writeFileSync(gitignorePath, gitignoreContent);
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

        if (!fs.existsSync(projectSpecPath)) {
          fs.mkdirSync(projectSpecPath, { recursive: true });
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

        if (!fs.existsSync(projectSpecPath)) {
          fs.mkdirSync(projectSpecPath, { recursive: true });
        }

        console.log(chalk.gray(`   ✓ Created project structure: ${repo.id}`));
      }
    }
  }
}