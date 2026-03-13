/**
 * `specweave get` Command
 *
 * Clone an existing repository into the workspace and register it.
 *
 * Usage:
 *   specweave get owner/repo
 *   specweave get https://github.com/org/repo
 *   specweave get git@github.com:org/repo
 *   specweave get ./path/to/local-repo
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { parseSource } from '../helpers/get/source-parser.js';
import { cloneRepo } from '../helpers/get/clone-repo.js';
import { registerRepo } from '../helpers/get/register-repo.js';
import { execFileNoThrow } from '../../utils/execFileNoThrow.js';
import { detectRepository } from '../../utils/git-utils.js';

export interface GetOptions {
  branch?: string;
  prefix?: string;
  role?: string;
  /** true by default, false when --no-init is passed */
  init?: boolean;
  yes?: boolean;
}

export async function getCommand(source: string, options: GetOptions = {}): Promise<void> {
  const projectRoot = process.cwd();
  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  // Guard: must be a SpecWeave project
  if (!fs.existsSync(configPath)) {
    console.log(chalk.red('\n  Not a SpecWeave project. Run `specweave init` first.\n'));
    process.exit(1);
  }

  let config: Record<string, any> = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    console.log(chalk.red('\n  Could not read .specweave/config.json\n'));
    process.exit(1);
  }

  const isUmbrella = config.umbrella?.enabled === true;

  // Parse source
  let parsed;
  try {
    parsed = parseSource(source);
  } catch (err) {
    console.log(chalk.red(`\n  ${err instanceof Error ? err.message : String(err)}\n`));
    process.exit(1);
  }

  // Resolve owner/repo for local paths
  let owner = parsed.owner;
  let repo = parsed.repo;

  if (parsed.type === 'local') {
    const absolutePath = parsed.absolutePath!;

    if (!fs.existsSync(absolutePath)) {
      console.log(chalk.red(`\n  Path does not exist: ${absolutePath}\n`));
      process.exit(1);
    }
    if (!fs.existsSync(path.join(absolutePath, '.git'))) {
      console.log(chalk.red(`\n  Not a git repository: ${absolutePath}\n`));
      process.exit(1);
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

    if (isUmbrella) {
      const relPath = path.relative(projectRoot, absolutePath);
      await _registerAndInit(projectRoot, owner, repo, relPath, absolutePath, options, false);
    } else {
      console.log(chalk.yellow('  Not an umbrella workspace — skipping registration.\n'));
    }
    return;
  }

  // Remote source: determine target directory
  const targetDir = isUmbrella
    ? path.join(projectRoot, 'repositories', owner, repo)
    : path.join(projectRoot, repo);

  console.log(chalk.blue(`\n  Getting ${owner}/${repo}...\n`));

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
  }

  // Register + init
  if (isUmbrella) {
    const relPath = path.relative(projectRoot, targetDir).replace(/\\/g, '/');
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
    console.log(chalk.dim(`   Already registered in umbrella config`));
  } else {
    console.log(chalk.green(`   Registered in umbrella config (prefix: ${options.prefix || repo.substring(0, 3).toUpperCase()})`));
  }

  if (options.init !== false) {
    await _runInit(absPath);
  }

  console.log(chalk.green(`\n  Done!`));
  if (showPath) {
    console.log(chalk.dim(`   Path: ${relPath}`));
  }
  console.log(chalk.dim(`   Next: /sw:increment to plan work in ${repo}\n`));
}

async function _runInit(repoDir: string): Promise<void> {
  if (fs.existsSync(path.join(repoDir, '.specweave'))) {
    console.log(chalk.dim('   Already has .specweave/, skipping init'));
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
