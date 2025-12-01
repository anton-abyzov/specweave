/**
 * ADO Repository Cloning
 *
 * Handles fetching and cloning Azure DevOps repositories during init.
 * Cloning runs in background (non-blocking) via job manager.
 *
 * @module cli/helpers/init/ado-repo-cloning
 */

import chalk from 'chalk';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AzureDevOpsProvider } from '../../../core/repo-structure/providers/azure-devops-provider.js';
import { filterRepositoriesByPattern, type ClonePatternResult } from '../selection-strategy.js';
import { getJobManager } from '../../../core/background/index.js';
import type { CloneJobConfig } from '../../../core/background/types.js';
import { execFileNoThrowSync } from '../../../utils/execFileNoThrow.js';

/**
 * ADO project selection (from repository-setup.ts)
 */
export interface AdoProjectSelection {
  org: string;
  pat: string;
  projects: string[];
}

/**
 * Repository info from ADO API
 */
interface AdoRepository {
  id: string;
  name: string;
  remoteUrl: string;
  sshUrl: string;
  webUrl: string;
  project: string;
}

/**
 * Trigger ADO repository cloning during init
 *
 * This function:
 * 1. Fetches repository list from each selected ADO project
 * 2. Filters repositories by clone pattern (glob/regex)
 * 3. Creates a background job for cloning
 * 4. Starts cloning asynchronously (non-blocking)
 *
 * @param projectPath - Target directory for cloning
 * @param adoProjectSelection - ADO org, PAT, and selected projects
 * @param clonePattern - Clone pattern configuration
 */
export async function triggerAdoRepoCloning(
  projectPath: string,
  adoProjectSelection: AdoProjectSelection,
  clonePattern: ClonePatternResult
): Promise<void> {
  // Skip if user chose to skip cloning
  if (clonePattern.strategy === 'skip') {
    console.log(chalk.gray('\n   Skipping repository cloning (can configure later with /specweave-ado:clone-repos)\n'));
    return;
  }

  const { org, pat, projects } = adoProjectSelection;

  if (!projects || projects.length === 0) {
    console.log(chalk.yellow('\n   No ADO projects selected for cloning.\n'));
    return;
  }

  console.log(chalk.blue('\n📦 Fetching ADO Repositories\n'));

  const provider = new AzureDevOpsProvider();
  const allRepos: AdoRepository[] = [];

  // Fetch repositories from each selected project
  for (const project of projects) {
    try {
      console.log(chalk.gray(`   Fetching from ${org}/${project}...`));
      const repos = await provider.listRepositories(org, project, pat);
      const reposWithProject = repos.map(r => ({ ...r, project }));
      allRepos.push(...reposWithProject);
      console.log(chalk.green(`   ✓ Found ${repos.length} repositories in ${project}`));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(chalk.yellow(`   ⚠️ Failed to fetch from ${project}: ${errorMsg}`));
    }
  }

  if (allRepos.length === 0) {
    console.log(chalk.yellow('\n   No repositories found in selected projects.\n'));
    return;
  }

  // Filter by pattern
  const filteredRepos = filterRepositoriesByPattern(allRepos, clonePattern);

  if (filteredRepos.length === 0) {
    const patternDesc = clonePattern.pattern ? ` matching "${clonePattern.pattern}"` : '';
    console.log(chalk.yellow(`\n   No repositories${patternDesc} to clone.\n`));
    return;
  }

  console.log(chalk.blue(`\n🔄 Cloning ${filteredRepos.length} repositories in background...\n`));

  // Create repos directory if needed
  const reposDir = path.join(projectPath, 'repos');
  if (!existsSync(reposDir)) {
    mkdirSync(reposDir, { recursive: true });
  }

  // Create background job
  const jobManager = getJobManager(projectPath);
  const jobConfig: CloneJobConfig = {
    type: 'clone-repos',
    repositories: filteredRepos.map(r => ({
      owner: `${org}/${r.project}`,
      name: r.name,
      path: path.join('repos', r.name)
    })),
    projectPath
  };

  const job = jobManager.createJob('clone-repos', jobConfig, filteredRepos.length);
  jobManager.startJob(job.id);

  // Start cloning asynchronously (non-blocking)
  cloneRepositoriesAsync(projectPath, filteredRepos, org, job.id).catch(error => {
    console.error(chalk.red(`Clone error: ${error instanceof Error ? error.message : String(error)}`));
    jobManager.completeJob(job.id, error instanceof Error ? error.message : String(error));
  });

  // Show progress info
  console.log(chalk.gray(`   Repositories will be cloned to: ${reposDir}/`));
  console.log(chalk.gray(`   Job ID: ${job.id}`));
  console.log(chalk.cyan('\n   Check progress: /specweave:jobs'));
  console.log(chalk.cyan('   Resume if interrupted: /specweave:jobs --resume ' + job.id + '\n'));
}

/**
 * Clone repositories asynchronously
 *
 * This runs in background and updates job progress as repos are cloned.
 */
async function cloneRepositoriesAsync(
  projectPath: string,
  repos: AdoRepository[],
  org: string,
  jobId: string
): Promise<void> {
  const jobManager = getJobManager(projectPath);
  const reposDir = path.join(projectPath, 'repos');
  let completed = 0;

  for (const repo of repos) {
    const repoPath = path.join(reposDir, repo.name);

    // Skip if already exists
    if (existsSync(path.join(repoPath, '.git'))) {
      completed++;
      jobManager.updateProgress(jobId, completed, repo.name, repo.name);
      continue;
    }

    try {
      // Clone using HTTPS URL (PAT auth)
      // For ADO: https://dev.azure.com/org/project/_git/repo becomes
      // https://{pat}@dev.azure.com/org/project/_git/repo for auth
      const pat = (await getPatFromJobConfig(projectPath, jobId)) || '';
      const authUrl = repo.remoteUrl.replace('https://', `https://${pat}@`);

      // Create parent directory if needed
      if (!existsSync(reposDir)) {
        mkdirSync(reposDir, { recursive: true });
      }

      // Clone the repository
      const result = execFileNoThrowSync('git', ['clone', authUrl, repo.name], { cwd: reposDir });

      if (result.exitCode === 0) {
        completed++;
        jobManager.updateProgress(jobId, completed, repo.name, repo.name);
      } else {
        // Clone failed - mark as failed but continue
        jobManager.updateProgress(jobId, completed, repo.name, undefined, repo.name);
        console.error(chalk.yellow(`   Failed to clone ${repo.name}: ${result.stderr || result.stdout}`));
      }
    } catch (error) {
      // Mark repo as failed but continue with others
      jobManager.updateProgress(jobId, completed, repo.name, undefined, repo.name);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(chalk.yellow(`   Error cloning ${repo.name}: ${errorMsg}`));
    }
  }

  // Mark job as complete
  jobManager.completeJob(jobId);
}

/**
 * Get PAT from job config (stored in background-jobs.json)
 */
async function getPatFromJobConfig(projectPath: string, jobId: string): Promise<string | null> {
  // PAT is stored in .env, not in job config (security)
  // Read from environment or .env file
  const { readEnvFile, parseEnvFile } = await import('../../../utils/env-file.js');
  const envContent = readEnvFile(projectPath);
  if (envContent) {
    const parsed = parseEnvFile(envContent);
    return parsed.AZURE_DEVOPS_PAT || null;
  }
  return process.env.AZURE_DEVOPS_PAT || null;
}
