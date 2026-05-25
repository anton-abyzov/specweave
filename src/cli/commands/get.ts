/**
 * `specweave get` Command
 *
 * Clone an existing repository into the workspace and register it.
 *
 * Usage (single repo):
 *   specweave get owner/repo
 *   specweave get https://github.com/org/repo
 *   specweave get git@github.com:org/repo
 *   specweave get ./path/to/local-repo
 *
 * Usage (bulk):
 *   specweave get "org/service-*"   # glob
 *   specweave get "org/*"           # all repos in org
 *   specweave get --all org         # all repos in org (flag form)
 *   specweave get --all org --pattern "svc-*"
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { parseSource } from '../helpers/get/source-parser.js';
import { cloneRepo } from '../helpers/get/clone-repo.js';
import { registerRepo } from '../helpers/get/register-repo.js';
import { parseBulkSource, getAuthToken, buildBulkRepoList } from '../helpers/get/bulk-get.js';
import { launchCloneJob } from '../../core/background/job-launcher.js';
import { execFileNoThrow } from '../../utils/execFileNoThrow.js';
import { detectRepository } from '../../utils/git-utils.js';
import { hasSpecweaveIncrements } from '../../utils/find-project-root.js';

export interface GetOptions {
  branch?: string;
  prefix?: string;
  role?: string;
  /** true by default, false when --no-init is passed */
  init?: boolean;
  yes?: boolean;
  /** Bulk: clone all repos in org */
  all?: boolean;
  /** Bulk: glob pattern filter (used with --all) */
  pattern?: string;
  /** Bulk: max repos to fetch (default 1000) */
  limit?: number;
  /** Bulk: skip archived repos */
  noArchived?: boolean;
  /** Bulk: skip forked repos */
  noForks?: boolean;
}

export async function getCommand(source: string, options: GetOptions = {}): Promise<void> {
  const projectRoot = process.cwd();
  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  // Guard: must be a SpecWeave project
  if (!fs.existsSync(configPath)) {
    console.log(chalk.red('\n  Not a SpecWeave project. Run `specweave init` first.\n'));
    process.exit(1);
    return;
  }

  let config: Record<string, any> = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    console.log(chalk.red('\n  Could not read .specweave/config.json\n'));
    process.exit(1);
    return;
  }

  // Bulk mode: detect glob/--all before single-repo path
  const bulkSource = parseBulkSource(source, { all: options.all, pattern: options.pattern });
  if (bulkSource) {
    await _handleBulkGet(projectRoot, bulkSource, options);
    return;
  }

  const usesRepositoriesLayout = !!config.workspace || config.umbrella?.enabled === true;

  // Parse source
  let parsed;
  try {
    parsed = parseSource(source);
  } catch (err) {
    console.log(chalk.red(`\n  ${err instanceof Error ? err.message : String(err)}\n`));
    process.exit(1);
    return;
  }

  // Resolve owner/repo for local paths
  let owner = parsed.owner;
  let repo = parsed.repo;

  if (parsed.type === 'local') {
    const absolutePath = parsed.absolutePath!;

    if (!fs.existsSync(absolutePath)) {
      console.log(chalk.red(`\n  Path does not exist: ${absolutePath}\n`));
      process.exit(1);
      return;
    }
    if (!fs.existsSync(path.join(absolutePath, '.git'))) {
      console.log(chalk.red(`\n  Not a git repository: ${absolutePath}\n`));
      process.exit(1);
      return;
    }

    // Detect owner/repo from git remote
    const detected = await detectRepository('origin', absolutePath);
    if (detected) {
      owner = detected.owner;
      repo = detected.repo;
    } else {
      // Fall back to directory name
      repo = path.basename(absolutePath);
      owner = '';
    }

    console.log(chalk.blue(`\n  Registering local repo: ${absolutePath}\n`));

    if (usesRepositoriesLayout) {
      const relPath = _relativeToProject(projectRoot, absolutePath);
      await _registerAndInit(projectRoot, owner, repo, relPath, absolutePath, options, false);
    } else {
      console.log(chalk.yellow('  Not a repositories workspace — skipping registration.\n'));
    }
    return;
  }

  // Remote source: determine target directory
  // Use '_unknown' as owner fallback for generic git URLs with no detected org
  const ownerDir = owner || '_unknown';
  const targetDir = usesRepositoriesLayout
    ? path.join(projectRoot, 'repositories', ownerDir, repo)
    : path.join(projectRoot, repo);

  console.log(chalk.blue(`\n  Getting ${owner || repo}...\n`));

  // Clone
  try {
    const cloneResult = await cloneRepo(parsed, targetDir, { branch: options.branch });
    if (cloneResult.cloned) {
      console.log(chalk.green(`   Cloned → ${path.relative(projectRoot, cloneResult.repoPath)}`));
    } else {
      console.log(chalk.dim(`   Already exists at ${path.relative(projectRoot, cloneResult.repoPath)}, skipping clone`));
    }
  } catch (err) {
    console.log(chalk.red(`\n  Clone failed: ${err instanceof Error ? err.message : String(err)}\n`));
    process.exit(1);
    return;
  }

  // Register + init
  if (usesRepositoriesLayout) {
    const relPath = _relativeToProject(projectRoot, targetDir);
    const githubUrl = parsed.type === 'github' ? `https://github.com/${owner}/${repo}` : undefined;
    await _registerAndInit(projectRoot, owner, repo, relPath, targetDir, options, true, githubUrl);
  } else {
    // Non-umbrella: just run init if requested
    if (options.init !== false) {
      await _runInit(targetDir);
    }
    console.log(chalk.green(`\n  Done! Repository available at ./${repo}/\n`));
  }
}

async function _handleBulkGet(
  projectRoot: string,
  bulkSource: { org: string; pattern: string | null },
  options: GetOptions,
): Promise<void> {
  const { org, pattern } = bulkSource;
  const patternDisplay = pattern ?? '*';

  console.log(chalk.blue(`\n  Fetching repos from ${org} (pattern: ${patternDisplay})...\n`));

  let token: string;
  try {
    token = await getAuthToken();
  } catch (err) {
    console.log(chalk.red(`\n  ${err instanceof Error ? err.message : String(err)}\n`));
    process.exit(1);
    return;
  }

  let repositories: Array<{ owner: string; name: string; path: string; cloneUrl: string }>;
  try {
    repositories = await buildBulkRepoList(org, token, pattern, {
      noArchived: options.noArchived,
      noForks: options.noForks,
      limit: options.limit,
    });
  } catch (err) {
    console.log(chalk.red(`\n  Failed to fetch repos: ${err instanceof Error ? err.message : String(err)}\n`));
    process.exit(1);
    return;
  }

  if (repositories.length === 0) {
    console.log(chalk.yellow(`  No repos found matching "${patternDisplay}" in ${org}.\n`));
    return;
  }

  console.log(chalk.green(`   Found ${repositories.length} repo(s) matching "${patternDisplay}". Launching background clone job...\n`));

  const result = await launchCloneJob({ projectPath: projectRoot, repositories });
  const jobId = result.job?.id ?? 'unknown';

  console.log(chalk.green(`  Job ${jobId} started.`));
  console.log(chalk.dim(`   Monitor: specweave jobs\n`));
}

async function _registerAndInit(
  projectRoot: string,
  owner: string,
  repo: string,
  relPath: string,
  absPath: string,
  options: GetOptions,
  showPath: boolean,
  githubUrl?: string,
): Promise<void> {
  const regResult = await registerRepo(projectRoot, owner, repo, relPath, {
    prefix: options.prefix,
    role: options.role,
    githubUrl,
  });

  if (regResult.alreadyRegistered) {
    console.log(chalk.dim(`   Already registered in workspace config`));
  } else {
    console.log(chalk.green(`   Registered in workspace config (prefix: ${options.prefix || repo.substring(0, 3).toUpperCase()})`));
  }

  if (options.init !== false) {
    await _runInit(absPath);
  }

  console.log(chalk.green(`\n  Done!`));
  if (showPath) {
    console.log(chalk.dim(`   Path: ${relPath}`));
  }
  console.log(chalk.dim(`   Next: sw:increment to plan work in ${repo}\n`));
}

async function _runInit(repoDir: string): Promise<void> {
  if (hasSpecweaveIncrements(repoDir)) {
    console.log(chalk.dim('   Already initialized with increments, skipping init'));
    return;
  }
  console.log(chalk.dim('   Running specweave init...'));
  const result = await execFileNoThrow('specweave', ['init', '.'], { cwd: repoDir });
  if (result.exitCode === 0) {
    console.log(chalk.green('   Initialized with specweave'));
  } else {
    console.log(chalk.yellow('   specweave init had warnings (you can run it manually)'));
  }
}

function _relativeToProject(projectRoot: string, targetPath: string): string {
  const root = _realPath(projectRoot);
  const target = _realPath(targetPath);
  return path.relative(root, target).replace(/\\/g, '/');
}

function _realPath(targetPath: string): string {
  try {
    return fs.realpathSync.native(targetPath);
  } catch {
    return path.resolve(targetPath);
  }
}
