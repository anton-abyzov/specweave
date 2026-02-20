/**
 * Umbrella Repository Cloning
 *
 * Clones a selected umbrella (parent) repository into the current project directory.
 * Used when the user picks "Select from GitHub" during init — the umbrella repo
 * becomes the git root of the project, with nested repos under repositories/{org}/.
 *
 * Strategy: clone --no-checkout to temp dir, move .git, checkout.
 * This avoids conflicts with files already created by specweave init (.specweave/).
 *
 * @module cli/helpers/init/umbrella-cloning
 */

import path from 'path';
import os from 'os';
import { existsSync } from 'fs';
import { move, remove } from '../../../utils/fs-native.js';
import chalk from 'chalk';
import { execFileNoThrow } from '../../../utils/execFileNoThrow.js';

export interface UmbrellaCloningResult {
  success: boolean;
  error?: string;
}

/**
 * Build clone URL for a GitHub repository
 */
function buildCloneUrl(
  owner: string,
  repo: string,
  pat: string,
  gitUrlFormat: 'ssh' | 'https'
): string {
  if (gitUrlFormat === 'ssh') {
    return `git@github.com:${owner}/${repo}.git`;
  }
  return `https://${pat}@github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}.git`;
}

/**
 * Clone an umbrella repository into the current project directory.
 *
 * Steps:
 * 1. Clone to temp dir with --no-checkout (fast, no file conflicts)
 * 2. Move .git from temp to project root
 * 3. Checkout tracked files (untracked files like .specweave/ are untouched)
 * 4. Clean up temp dir
 *
 * @param projectPath - Target directory (current working directory during init)
 * @param org - GitHub organization or owner
 * @param repoName - Repository name
 * @param pat - Personal Access Token
 * @param gitUrlFormat - 'ssh' or 'https'
 */
export async function cloneUmbrellaIntoCurrentDir(
  projectPath: string,
  org: string,
  repoName: string,
  pat: string,
  gitUrlFormat: 'ssh' | 'https' = 'https'
): Promise<UmbrellaCloningResult> {
  // Guard: don't clobber existing git repo
  const gitDir = path.join(projectPath, '.git');
  if (existsSync(gitDir)) {
    console.log(chalk.yellow('   Directory already contains a git repository. Skipping umbrella clone.'));
    return { success: false, error: 'Directory already contains a git repository' };
  }

  console.log(chalk.blue(`\n📥 Cloning umbrella repository: ${org}/${repoName}\n`));

  const cloneUrl = buildCloneUrl(org, repoName, pat, gitUrlFormat);
  const tmpDir = path.join(os.tmpdir(), `sw-umbrella-${Date.now()}`);

  try {
    // Step 1: Clone to temp dir (no checkout — avoids conflicts with .specweave/)
    console.log(chalk.gray('   Cloning repository...'));
    const cloneResult = await execFileNoThrow('git', ['clone', '--no-checkout', cloneUrl, tmpDir]);
    if (!cloneResult.success) {
      const cleanError = cloneResult.stderr.replace(pat, '***');
      console.log(chalk.red(`   Clone failed: ${cleanError}`));
      return { success: false, error: `Clone failed: ${cleanError}` };
    }

    // Step 2: Move .git to project root
    await move(path.join(tmpDir, '.git'), gitDir);

    // Step 3: Checkout tracked files (untracked .specweave/ is safe)
    const checkoutResult = await execFileNoThrow('git', ['checkout', '.'], { cwd: projectPath });
    if (!checkoutResult.success) {
      console.log(chalk.red(`   Checkout failed: ${checkoutResult.stderr}`));
      return { success: false, error: `Checkout failed: ${checkoutResult.stderr}` };
    }

    console.log(chalk.green(`   ✓ Umbrella repository cloned into current directory`));
    console.log(chalk.gray(`   Repository: ${org}/${repoName}`));
    return { success: true };
  } finally {
    // Always clean up temp dir
    await remove(tmpDir).catch(() => {});
  }
}
