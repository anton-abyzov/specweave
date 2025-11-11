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

export type RepoArchitecture = 'single' | 'multi-repo' | 'monorepo' | 'parent';

export interface RepoStructureConfig {
  architecture: RepoArchitecture;
  parentRepo?: {
    name: string;
    owner: string;
    description: string;
    createOnGitHub: boolean;
  };
  repositories: Array<{
    id: string;           // e.g., 'frontend', 'backend', 'shared'
    name: string;          // e.g., 'my-app-frontend'
    owner: string;         // e.g., 'myorg'
    description: string;
    path: string;          // Relative path from parent
    createOnGitHub: boolean;
    isNested: boolean;     // True for multi-repo nested repos
  }>;
  monorepoProjects?: string[];  // For monorepo: ['frontend', 'backend', 'shared']
}

export class RepoStructureManager {
  private projectPath: string;
  private githubToken?: string;

  constructor(projectPath: string, githubToken?: string) {
    this.projectPath = projectPath;
    this.githubToken = githubToken;
  }

  /**
   * Prompt user for repository structure decisions
   */
  async promptStructure(): Promise<RepoStructureConfig> {
    console.log(chalk.cyan.bold('\n🏗️  Repository Architecture Setup\n'));
    console.log(chalk.gray('Let\'s configure your repository structure for optimal organization.\n'));

    // Step 1: Ask about architecture type
    const { architecture } = await inquirer.prompt([{
      type: 'list',
      name: 'architecture',
      message: 'What repository architecture do you want to use?',
      choices: [
        {
          name: '📦 Single repository (everything in one repo)',
          value: 'single',
          short: 'Single'
        },
        {
          name: '🎯 Multi-repository (separate repos for each service)',
          value: 'multi-repo',
          short: 'Multi-repo'
        },
        {
          name: '📚 Monorepo (single repo with multiple projects)',
          value: 'monorepo',
          short: 'Monorepo'
        }
      ],
      default: 'single'
    }]);

    switch (architecture) {
      case 'single':
        return this.configureSingleRepo();
      case 'multi-repo':
        return this.configureMultiRepo();
      case 'monorepo':
        return this.configureMonorepo();
      default:
        throw new Error(`Unknown architecture: ${architecture}`);
    }
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

    return {
      architecture: 'single',
      repositories: [{
        id: 'main',
        name: answers.repo,
        owner: answers.owner,
        description: answers.description,
        path: '.',
        createOnGitHub: answers.createOnGitHub,
        isNested: false
      }]
    };
  }

  /**
   * Configure multi-repository architecture
   */
  private async configureMultiRepo(): Promise<RepoStructureConfig> {
    console.log(chalk.cyan('\n🎯 Multi-Repository Configuration\n'));
    console.log(chalk.gray('This creates separate repositories for each service/component.\n'));

    // Ask about parent repository approach
    const { useParent } = await inquirer.prompt([{
      type: 'confirm',
      name: 'useParent',
      message: 'Use parent repository approach? (Recommended)',
      default: true
    }]);

    if (useParent) {
      console.log(chalk.blue('\n📋 Parent Repository Benefits:'));
      console.log(chalk.gray('  • Central .specweave/ folder for all specs and documentation'));
      console.log(chalk.gray('  • Living docs sync to parent repo (single source of truth)'));
      console.log(chalk.gray('  • Implementation repos stay clean and focused'));
      console.log(chalk.gray('  • Better for enterprise/multi-team projects\n'));
    }

    const config: RepoStructureConfig = {
      architecture: useParent ? 'parent' : 'multi-repo',
      repositories: []
    };

    // Configure parent repository if using that approach
    if (useParent) {
      const parentAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'owner',
          message: 'GitHub owner/organization for ALL repos:',
          validate: (input: string) => !!input.trim() || 'Owner is required'
        },
        {
          type: 'input',
          name: 'parentName',
          message: 'Parent repository name:',
          default: `${path.basename(this.projectPath)}-parent`,
          validate: (input: string) => !!input.trim() || 'Repository name is required'
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
      ]);

      config.parentRepo = {
        name: parentAnswers.parentName,
        owner: parentAnswers.owner,
        description: parentAnswers.description,
        createOnGitHub: parentAnswers.createOnGitHub
      };
    }

    // Ask how many implementation repositories
    const { repoCount } = await inquirer.prompt([{
      type: 'number',
      name: 'repoCount',
      message: 'How many implementation repositories?',
      default: 3,
      validate: (input: number) => {
        if (input < 2) return 'Multi-repo needs at least 2 repositories';
        if (input > 10) return 'Maximum 10 repositories supported';
        return true;
      }
    }]);

    // Configure each repository
    console.log(chalk.cyan('\n📦 Configure Each Repository:\n'));

    for (let i = 0; i < repoCount; i++) {
      console.log(chalk.white(`\nRepository ${i + 1} of ${repoCount}:`));

      const repoAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'id',
          message: 'Repository ID (e.g., frontend, backend, shared):',
          validate: (input: string) => {
            if (!input.trim()) return 'ID is required';
            if (config.repositories.some(r => r.id === input)) {
              return 'ID must be unique';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'name',
          message: 'Repository name:',
          default: (answers: any) => `${path.basename(this.projectPath)}-${answers.id}`,
          validate: (input: string) => !!input.trim() || 'Repository name is required'
        },
        {
          type: 'input',
          name: 'description',
          message: 'Repository description:',
          default: (answers: any) => `${answers.id} service`
        },
        {
          type: 'confirm',
          name: 'createOnGitHub',
          message: 'Create this repository on GitHub?',
          default: true
        }
      ]);

      config.repositories.push({
        id: repoAnswers.id,
        name: repoAnswers.name,
        owner: config.parentRepo?.owner || '',
        description: repoAnswers.description,
        path: useParent ? `services/${repoAnswers.id}` : repoAnswers.id,
        createOnGitHub: repoAnswers.createOnGitHub,
        isNested: useParent
      });
    }

    return config;
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

    const projects = answers.projects.split(',').map((p: string) => p.trim());

    return {
      architecture: 'monorepo',
      repositories: [{
        id: 'main',
        name: answers.repo,
        owner: answers.owner,
        description: answers.description,
        path: '.',
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
          config.parentRepo.description
        );
        created.push(`${config.parentRepo.owner}/${config.parentRepo.name}`);
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
            repo.description
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
  }

  /**
   * Create a single GitHub repository via API
   */
  private async createGitHubRepo(owner: string, name: string, description: string): Promise<void> {
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
        private: false,
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
      // Parent repo approach: create services/ directory for nested repos
      const servicesDir = path.join(this.projectPath, 'services');
      if (!fs.existsSync(servicesDir)) {
        fs.mkdirSync(servicesDir, { recursive: true });
      }

      // Initialize parent repo at root
      if (!fs.existsSync(path.join(this.projectPath, '.git'))) {
        execFileNoThrowSync('git', ['init'], { cwd: this.projectPath });

        if (config.parentRepo) {
          const remoteUrl = `https://github.com/${config.parentRepo.owner}/${config.parentRepo.name}.git`;
          execFileNoThrowSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: this.projectPath });
        }
      }

      // Initialize nested repos
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
   */
  private createBasicRepoStructure(repoPath: string, projectId: string): void {
    // Create basic directories
    const dirs = ['src', 'tests', 'docs'];
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
   * Create SpecWeave project structure
   */
  async createSpecWeaveStructure(config: RepoStructureConfig): Promise<void> {
    const specweavePath = path.join(this.projectPath, '.specweave');

    // Create project-specific spec folders
    if (config.architecture === 'monorepo' && config.monorepoProjects) {
      // Monorepo: create project folders
      for (const project of config.monorepoProjects) {
        const projectSpecPath = path.join(
          specweavePath,
          'docs',
          'internal',
          'projects',
          project.toLowerCase()
        );

        const subfolders = ['specs', 'modules', 'team', 'architecture', 'legacy'];
        for (const subfolder of subfolders) {
          const folderPath = path.join(projectSpecPath, subfolder);
          if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
          }
        }

        console.log(chalk.gray(`   ✓ Created project structure: ${project}`));
      }
    } else if (config.architecture === 'multi-repo' || config.architecture === 'parent') {
      // Multi-repo: create folders for each repository
      for (const repo of config.repositories) {
        const projectSpecPath = path.join(
          specweavePath,
          'docs',
          'internal',
          'projects',
          repo.id
        );

        const subfolders = ['specs', 'modules', 'team', 'architecture', 'legacy'];
        for (const subfolder of subfolders) {
          const folderPath = path.join(projectSpecPath, subfolder);
          if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
          }
        }

        console.log(chalk.gray(`   ✓ Created project structure: ${repo.id}`));
      }
    }
  }
}