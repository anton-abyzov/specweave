/**
 * Repository Initialization
 *
 * Extracted from repo-structure-manager.ts to reduce file size and prevent crashes.
 * Handles cloning, git initialization, and directory structure creation.
 */

import { existsSync, mkdirSync, writeFileSync, readdirSync, rmdirSync } from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { execFileNoThrowSync } from '../../utils/execFileNoThrow.js';
import type { GitProvider } from './git-provider.js';
import type { RepoStructureConfig } from './repo-structure-manager.js';
import { getJobManager } from '../background/index.js';
import type { CloneJobConfig } from '../background/types.js';

export interface RepoInitializerOptions {
  projectPath: string;
  githubToken?: string;
}

/**
 * Check if a repository exists on GitHub
 */
export async function repositoryExistsOnGitHub(
  owner: string,
  repo: string,
  githubToken?: string
): Promise<boolean> {
  if (!githubToken) {
    return false;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
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
export async function cloneOrInitRepository(
  repoPath: string,
  owner: string,
  name: string,
  createOnGitHub: boolean,
  urlType: 'ssh' | 'https' = 'ssh',
  provider: GitProvider,
  githubToken?: string
): Promise<void> {
  // If .git already exists, skip
  if (existsSync(path.join(repoPath, '.git'))) {
    return;
  }

  const remoteUrl = provider.getRemoteUrl(owner, name, urlType);

  // Check if repository exists on GitHub
  const repoExists = await repositoryExistsOnGitHub(owner, name, githubToken);

  if (repoExists) {
    // Repository exists - clone it
    console.log(chalk.gray(`   -> Cloning existing repository from GitHub...`));

    try {
      // Remove directory if it exists and is empty
      if (existsSync(repoPath)) {
        const files = readdirSync(repoPath);
        if (files.length === 0) {
          rmdirSync(repoPath);
        }
      }

      // Clone the repository
      const parentDir = path.dirname(repoPath);
      const repoName = path.basename(repoPath);

      execFileNoThrowSync('git', ['clone', remoteUrl, repoName], { cwd: parentDir });
      console.log(chalk.green(`   [OK] Cloned ${owner}/${name}`));
    } catch (error: any) {
      console.log(chalk.yellow(`   [!] Clone failed: ${error.message}`));
      console.log(chalk.gray(`   -> Falling back to init + remote`));

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
      console.log(chalk.gray(`   -> Repository will be created later (skipping for now)`));
      return;
    }

    console.log(chalk.gray(`   -> Initializing empty git repository...`));

    if (!existsSync(repoPath)) {
      mkdirSync(repoPath, { recursive: true });
    }

    execFileNoThrowSync('git', ['init'], { cwd: repoPath });
    execFileNoThrowSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: repoPath });
    console.log(chalk.green(`   [OK] Initialized ${owner}/${name}`));
  }
}

/**
 * Create basic structure for a repository/project
 *
 * NOTE: Only creates src/ and tests/ folders for nested projects.
 * Documentation lives in .specweave/docs/internal/specs/{project-id}/ (source of truth)
 */
export function createBasicRepoStructure(repoPath: string, projectId: string): void {
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
 * Initialize local git repositories
 */
export async function initializeLocalRepos(
  config: RepoStructureConfig,
  projectPath: string,
  githubToken?: string
): Promise<void> {
  const totalRepos = config.repositories.length;
  const spinner = ora(`Initializing local repositories... (0/${totalRepos})`).start();

  // Create background job for tracking (if >1 repo)
  let jobManager: ReturnType<typeof getJobManager> | null = null;
  let jobId: string | null = null;

  if (totalRepos > 1) {
    try {
      jobManager = getJobManager(projectPath);
      const jobConfig: CloneJobConfig = {
        type: 'clone-repos',
        repositories: config.repositories.map(r => ({
          owner: r.owner,
          name: r.name,
          path: r.path
        })),
        projectPath: projectPath
      };
      const job = jobManager.createJob('clone-repos', jobConfig, totalRepos);
      jobId = job.id;
      jobManager.startJob(jobId);
    } catch {
      // Job tracking is optional - continue without it
    }
  }

  // Create directory structure based on architecture
  if (config.architecture === 'parent') {
    // Parent repo approach: ROOT-LEVEL cloning (not services/!)
    // Initialize parent repo at root
    if (!existsSync(path.join(projectPath, '.git'))) {
      execFileNoThrowSync('git', ['init'], { cwd: projectPath });

      if (config.parentRepo) {
        const remoteUrl = config.provider.getRemoteUrl(config.parentRepo.owner, config.parentRepo.name, config.urlType);
        execFileNoThrowSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: projectPath });
      }
    }

    // Initialize implementation repos at ROOT LEVEL
    let processed = 0;
    for (const repo of config.repositories) {
      processed++;
      spinner.text = `Cloning repositories... (${processed}/${totalRepos}) -> ${repo.name}`;

      const repoPath = path.join(projectPath, repo.path);

      // Clone or initialize repository
      await cloneOrInitRepository(repoPath, repo.owner, repo.name, repo.createOnGitHub, config.urlType, config.provider, githubToken);

      // Create basic structure (only if repo was just initialized, not cloned)
      if (!repo.createOnGitHub || !await repositoryExistsOnGitHub(repo.owner, repo.name, githubToken)) {
        createBasicRepoStructure(repoPath, repo.id);
      }

      // Update background job progress
      if (jobManager && jobId) {
        jobManager.updateProgress(jobId, processed, repo.name, repo.name);
      }

      spinner.text = `Cloned ${processed}/${totalRepos}: ${repo.name}`;
    }
  } else if (config.architecture === 'multi-repo') {
    // Standard multi-repo: repos as subdirectories
    let processed = 0;
    for (const repo of config.repositories) {
      processed++;
      spinner.text = `Cloning repositories... (${processed}/${totalRepos}) -> ${repo.name}`;

      const repoPath = path.join(projectPath, repo.path);

      // Clone or initialize repository
      await cloneOrInitRepository(repoPath, repo.owner, repo.name, repo.createOnGitHub, config.urlType, config.provider, githubToken);

      // Create basic structure (only if repo was just initialized, not cloned)
      if (!repo.createOnGitHub || !await repositoryExistsOnGitHub(repo.owner, repo.name, githubToken)) {
        createBasicRepoStructure(repoPath, repo.id);
      }

      // Update background job progress
      if (jobManager && jobId) {
        jobManager.updateProgress(jobId, processed, repo.name, repo.name);
      }

      spinner.text = `Cloned ${processed}/${totalRepos}: ${repo.name}`;
    }
  } else {
    // Single repo or monorepo
    if (!existsSync(path.join(projectPath, '.git'))) {
      execFileNoThrowSync('git', ['init'], { cwd: projectPath });

      const repo = config.repositories[0];
      if (repo) {
        const remoteUrl = config.provider.getRemoteUrl(repo.owner, repo.name, config.urlType);
        execFileNoThrowSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: projectPath });
      }
    }

    // For monorepo, create project directories
    if (config.architecture === 'monorepo' && config.monorepoProjects) {
      for (const project of config.monorepoProjects) {
        const projectPathInner = path.join(projectPath, 'packages', project);
        if (!existsSync(projectPathInner)) {
          mkdirSync(projectPathInner, { recursive: true });
        }
        createBasicRepoStructure(projectPathInner, project);
      }
    }
  }

  // Complete background job
  if (jobManager && jobId) {
    jobManager.completeJob(jobId);
  }

  spinner.succeed(`Local repositories initialized (${totalRepos} repo${totalRepos === 1 ? '' : 's'})`);
}

/**
 * Create SpecWeave project structure (simplified - ONLY specs folders)
 *
 * NOTE: As of v0.X.X (increment 0026), we ONLY create specs/ folders.
 * No modules/, team/, architecture/, legacy/ folders.
 */
export async function createSpecWeaveStructure(
  config: RepoStructureConfig,
  projectPath: string
): Promise<void> {
  const specweavePath = path.join(projectPath, '.specweave');

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

      console.log(chalk.gray(`   [OK] Created project structure: ${project}`));
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

      console.log(chalk.gray(`   [OK] Created project structure: ${repo.path}`));
    }

    // CRITICAL: Also create folder for parent repo (was missing before!)
    if (config.architecture === 'parent' && config.parentRepo) {
      const parentSpecPath = path.join(
        specweavePath,
        'docs',
        'internal',
        'specs',
        config.parentRepo.name
      );

      if (!existsSync(parentSpecPath)) {
        mkdirSync(parentSpecPath, { recursive: true });
      }

      console.log(chalk.gray(`   [OK] Created project structure: ${config.parentRepo.name} (parent)`));
    }
  }
}
