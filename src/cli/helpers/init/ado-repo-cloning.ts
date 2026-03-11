/**
 * ADO Repository Cloning
 *
 * Handles fetching and cloning Azure DevOps repositories during init.
 * Cloning runs in background (non-blocking) via job manager.
 *
 * @module cli/helpers/init/ado-repo-cloning
 */

import chalk from 'chalk';
import { AzureDevOpsProvider } from '../../../core/repo-structure/providers/azure-devops-provider.js';
import { filterRepositoriesByPattern, type ClonePatternResult } from '../selection-strategy.js';
import { launchCloneJob } from '../../../core/background/job-launcher.js';

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
 * Sanitize ADO project name for use as filesystem folder name
 *
 * ADO project names can contain:
 * - Spaces: "My Enterprise Project"
 * - Special characters that are invalid in paths
 *
 * This function creates a filesystem-safe folder name while preserving readability.
 */
function sanitizeProjectNameForPath(projectName: string): string {
  return projectName
    .toLowerCase()
    .replace(/\s+/g, '-')           // Spaces → hyphens
    .replace(/[<>:"|?*\\\/]/g, '')  // Remove filesystem-invalid chars
    .replace(/&/g, '-and-')         // & → -and-
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .replace(/^-|-$/g, '');         // Trim leading/trailing hyphens
}

/**
 * Build proper ADO clone URL with PAT authentication
 *
 * ADO clone URL format: https://{PAT}@dev.azure.com/{org}/{project}/_git/{repo}
 *
 * The remoteUrl from ADO API may come in different formats:
 * - https://dev.azure.com/org/project/_git/repo
 * - https://org@dev.azure.com/org/project/_git/repo (with org as placeholder)
 *
 * We need to construct a proper URL with PAT authentication.
 * IMPORTANT: URL-encode org, project, and repo names to handle spaces and special characters.
 */
function buildAdoCloneUrl(org: string, project: string, repoName: string, pat: string): string {
  // Build clean URL with PAT authentication
  // Format: https://{PAT}@dev.azure.com/{org}/{project}/_git/{repo}
  // URL-encode path segments to handle spaces (e.g., "My Enterprise Project")
  const encodedOrg = encodeURIComponent(org);
  const encodedProject = encodeURIComponent(project);
  const encodedRepo = encodeURIComponent(repoName);
  return `https://${pat}@dev.azure.com/${encodedOrg}/${encodedProject}/_git/${encodedRepo}`;
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
): Promise<string | undefined> {
  // Skip if user chose to skip cloning
  if (clonePattern.strategy === 'skip') {
    console.log(chalk.gray('\n   Skipping repository cloning (can configure later with /specweave-ado:clone-repos)\n'));
    return undefined;
  }

  const { org, pat, projects } = adoProjectSelection;

  if (!projects || projects.length === 0) {
    console.log(chalk.yellow('\n   No ADO projects selected for cloning.\n'));
    return;
  }

  if (!pat) {
    console.log(chalk.yellow('\n   No PAT provided. Cannot clone repositories.\n'));
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

  // Group repos by project for display
  const projectGroups = new Map<string, AdoRepository[]>();
  for (const repo of filteredRepos) {
    const group = projectGroups.get(repo.project) || [];
    group.push(repo);
    projectGroups.set(repo.project, group);
  }

  console.log(chalk.blue(`\n🔄 Starting background clone for ${filteredRepos.length} repositories...\n`));

  // Show project structure
  for (const [project, repos] of projectGroups) {
    const sanitizedName = sanitizeProjectNameForPath(project);
    console.log(chalk.gray(`   📁 ${sanitizedName}/ (${repos.length} repos from "${project}")`));
  }
  console.log('');

  // Prepare repositories with clone URLs (organized by org folder)
  // v1.0.21: Clone into repositories/{org}/repo-name/ structure
  // This keeps all cloned repos organized and separate from the main project
  // NOTE: ADO org replaces the old project-based structure for consistency across providers
  const reposWithUrls = filteredRepos.map(r => {
    return {
      owner: `${org}/${r.project}`,
      name: r.name,
      path: `repositories/${org}/${r.name}`, // Clone into repositories/{org}/{repo}
      cloneUrl: buildAdoCloneUrl(org, r.project, r.name, pat)
    };
  });

  // Launch background clone job (truly async - spawns detached process)
  const result = await launchCloneJob({
    projectPath,
    repositories: reposWithUrls
  });

  // Show progress info
  console.log(chalk.gray(`   Repositories will be cloned to: ${projectPath}/repositories/${org}/`));
  console.log(chalk.gray(`   Job ID: ${result.job.id}`));

  if (result.isBackground) {
    console.log(chalk.green(`   ✓ Clone job started in background (PID: ${result.pid})`));
    console.log(chalk.cyan('\n   Check progress: /sw:jobs'));
    console.log(chalk.cyan(`   Kill if needed: /sw:jobs --kill ${result.job.id}`));
    console.log(chalk.gray('\n   Init will continue - cloning runs independently.\n'));
  } else {
    console.log(chalk.yellow('   ⚠️ Running in foreground (clone worker not found)'));
    console.log(chalk.gray('   Init will block until cloning completes.\n'));
  }

  // Return job ID for dependency tracking
  return result.job.id;
}
