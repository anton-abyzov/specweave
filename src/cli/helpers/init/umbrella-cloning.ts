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
 * Key note: specweave init runs `git init` before the wizard. If .git exists with NO
 * remotes, it was created by our own git init and can be safely replaced by the umbrella
 * repo's .git. If .git has remotes, it's a pre-existing repo and we leave it alone.
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
 * Handles two scenarios:
 * - No .git: fresh directory → clone directly
 * - .git with no remotes: from `git init` during specweave init → replace with umbrella's .git
 * - .git with remotes: pre-existing real repo → skip (guard)
 *
 * After cloning, `git checkout .` merges umbrella repo files with any existing
 * files (like .specweave/) without overwriting untracked ones.
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
  const gitDir = path.join(projectPath, '.git');

  if (existsSync(gitDir)) {
    // Check if this is a real pre-existing repo (has remotes) or our fresh git init (no remotes)
    const remoteResult = await execFileNoThrow('git', ['remote'], { cwd: projectPath });
    const hasRemotes = remoteResult.success && remoteResult.stdout.trim().length > 0;

    if (hasRemotes) {
      // Real existing repo — don't clobber it
      console.log(chalk.yellow('   Directory already contains a git repository with remotes. Skipping umbrella clone.'));
      return { success: false, error: 'Directory already contains a git repository with remotes' };
    }

    // No remotes = fresh git init from specweave init — safe to replace
    console.log(chalk.gray('   Replacing fresh git init with umbrella repository...'));
    await remove(gitDir);
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

    // Step 3: Checkout tracked files into current dir
    // Files not in the umbrella repo (like .specweave/) are left untouched as untracked
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
