/**
 * Azure DevOps Auto-Discovery with Smart Pagination
 *
 * Uses ProjectCountFetcher + ImportStrategyPrompter + AsyncProjectLoader + CacheManager
 * Same pattern as JIRA for consistency.
 *
 * @module cli/helpers/issue-tracker/ado-auto-discover
 */

import chalk from 'chalk';
import { checkbox } from '@inquirer/prompts';
import type { AdoCredentials } from '../project-count-fetcher.js';

export interface AdoAutoDiscoverOptions {
  organization: string;
  pat: string;
  project?: string;
  projectRoot?: string;
}

/**
 * Auto-discover ADO projects with smart pagination
 *
 * Flow:
 * 1. Fetch project count (lightweight query)
 * 2. Prompt import strategy ("Import all" default)
 * 3. Batch fetch projects (50-project limit)
 * 4. Show progress with ETA
 * 5. Cache results (24-hour TTL)
 *
 * @param options - Auto-discovery options
 * @returns Array of project names
 */
export async function autoDiscoverAdoProjects(
  options: AdoAutoDiscoverOptions
): Promise<string[]> {
  const { organization, pat, projectRoot } = options;

  // Step 0: Check cache first
  if (projectRoot) {
    const { CacheManager } = await import('../../../core/cache/cache-manager.js');
    const cacheManager = new CacheManager(projectRoot);
    const cacheKey = `ado-projects-${organization}`;

    const cachedProjects = await cacheManager.get<string[]>(cacheKey);
    if (cachedProjects && cachedProjects.length > 0) {
      console.log(chalk.cyan('✨ Using cached project list (24h TTL)\n'));
      return cachedProjects;
    }
  }

  // Step 1: Fetch project count (lightweight query)
  console.log(chalk.cyan('\n📊 Fetching project count...\n'));

  const { getProjectCount } = await import('../project-count-fetcher.js');
  const credentials: AdoCredentials = { organization, pat };

  const countResult = await getProjectCount({
    credentials,
    provider: 'ado'
  });

  if (countResult.error) {
    throw new Error(`Failed to fetch ADO project count: ${countResult.error}`);
  }

  const totalCount = countResult.accessible;
  console.log(chalk.green(`✓ Found ${totalCount} accessible ADO projects\n`));

  // Step 2: Prompt import strategy
  const { promptImportStrategy } = await import('../import-strategy-prompter.js');
  const strategyResult = await promptImportStrategy({
    totalCount,
    provider: 'ado'
  });

  let projectNames: string[] = [];

  // Step 3: Execute based on strategy
  if (strategyResult.strategy === 'import-all') {
    // Import all: use AsyncProjectLoader with smart pagination
    console.log(chalk.cyan('\n📥 Importing all projects...\n'));

    const { AsyncProjectLoader } = await import('../async-project-loader.js');
    const loader = new AsyncProjectLoader(
      credentials,
      'ado',
      {
        batchSize: 50,
        updateFrequency: 5,
        showEta: true,
        stateFile: projectRoot ? `${projectRoot}/.specweave/cache/ado-import-state.json` : undefined
      }
    );

    const result = await loader.fetchAllProjects(totalCount);
    projectNames = result.projects.map(p => p.name);

    console.log(chalk.green(`\n✓ Imported ${result.succeeded} projects\n`));

    if (result.failed > 0) {
      console.log(chalk.yellow(`⚠️  ${result.failed} projects failed (see error log)`));
    }

  } else if (strategyResult.strategy === 'select-specific') {
    // Select specific: fetch first batch, show checkbox UI
    console.log(chalk.cyan('\n📥 Fetching projects for selection...\n'));

    const { AsyncProjectLoader } = await import('../async-project-loader.js');
    const loader = new AsyncProjectLoader(
      credentials,
      'ado',
      { batchSize: 50 }
    );

    // Fetch first 50 for checkbox selection
    const result = await loader.fetchAllProjects(Math.min(50, totalCount));
    const allProjects = result.projects.map(p => ({ name: p.name, value: p.name }));

    // Show checkbox (all pre-selected per US-002 CLI-first defaults)
    projectNames = await checkbox({
      message: 'Select projects to import:',
      choices: allProjects.map(p => ({
        name: p.name,
        value: p.value,
        checked: true  // All selected by default (CLI-first)
      })),
      pageSize: 20
    });

  } else if (strategyResult.strategy === 'manual-entry') {
    // Manual entry: use provided keys
    projectNames = strategyResult.projectKeys || [];
  }

  // Step 4: Cache results (24-hour TTL)
  if (projectRoot && projectNames.length > 0) {
    const { CacheManager } = await import('../../../core/cache/cache-manager.js');
    const cacheManager = new CacheManager(projectRoot);
    const cacheKey = `ado-projects-${organization}`;

    await cacheManager.set(cacheKey, projectNames, 24 * 60 * 60 * 1000); // 24 hours
  }

  return projectNames;
}
