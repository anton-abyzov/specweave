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

/** Sanitize PAT from any string (replace all occurrences) */
function sanitize(text: string, pat: string): string {
  if (!pat) return text;
  return text.split(pat).join('***');
}

/**
 * Clone an umbrella repository into the current project directory.
 *
 * Handles three scenarios:
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
  console.log('');
  console.log(chalk.blue.bold('   ┌─────────────────────────────────────────┐'));
  console.log(chalk.blue.bold(`   │  📥 Cloning umbrella: ${org}/${repoName}`));
  console.log(chalk.blue.bold('   └─────────────────────────────────────────┘'));
  console.log('');

  const gitDir = path.join(projectPath, '.git');

  // Step 0: Handle existing .git directory
  if (existsSync(gitDir)) {
    const remoteResult = await execFileNoThrow('git', ['remote'], { cwd: projectPath });
    const hasRemotes = remoteResult.success && remoteResult.stdout.trim().length > 0;

    if (hasRemotes) {
      console.log(chalk.yellow('   ⚠ Directory already has a git repo with remotes — skipping umbrella clone.'));
      console.log(chalk.gray(`   Remotes: ${remoteResult.stdout.trim()}`));
      return { success: false, error: 'Directory already contains a git repository with remotes' };
    }

    console.log(chalk.gray('   Removing fresh git init (no remotes)...'));
    await remove(gitDir);
    console.log(chalk.gray('   ✓ Old .git removed'));
  } else {
    console.log(chalk.gray('   No existing .git — fresh directory'));
  }

  const cloneUrl = buildCloneUrl(org, repoName, pat, gitUrlFormat);
  const tmpDir = path.join(os.tmpdir(), `sw-umbrella-${Date.now()}`);
  const urlDisplay = gitUrlFormat === 'ssh' ? cloneUrl : `https://***@github.com/${org}/${repoName}.git`;
  console.log(chalk.gray(`   URL: ${urlDisplay}`));
  console.log(chalk.gray(`   Format: ${gitUrlFormat}`));
  console.log(chalk.gray(`   Target: ${projectPath}`));

  try {
    // Step 1: Clone to temp dir (no checkout — avoids conflicts with .specweave/)
    console.log(chalk.cyan('   [1/3] Cloning to temp directory...'));
    const cloneResult = await execFileNoThrow(
      'git',
      ['clone', '--no-checkout', cloneUrl, tmpDir],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }
    );

    if (!cloneResult.success) {
      const cleanError = sanitize(cloneResult.stderr, pat);
      console.log(chalk.red(`   ✗ Clone failed (exit code ${cloneResult.exitCode})`));
      console.log(chalk.red(`   ${cleanError}`));
      return { success: false, error: `Clone failed: ${cleanError}` };
    }
    console.log(chalk.green('   ✓ Clone complete'));

    // Step 2: Move .git to project root
    console.log(chalk.cyan('   [2/3] Moving .git to project root...'));
    await move(path.join(tmpDir, '.git'), gitDir);
    console.log(chalk.green('   ✓ .git moved'));

    // Step 3: Checkout tracked files into current dir
    // CRITICAL: Use "checkout HEAD -- ." not "checkout ."
    // After --no-checkout clone, the index is empty. "checkout ." restores from the
    // index (nothing there), while "checkout HEAD -- ." reads directly from the HEAD
    // commit, populating both index and working tree.
    console.log(chalk.cyan('   [3/3] Checking out files...'));
    const checkoutResult = await execFileNoThrow(
      'git',
      ['checkout', 'HEAD', '--', '.'],
      { cwd: projectPath, timeout: 60_000 }
    );

    if (!checkoutResult.success) {
      console.log(chalk.red(`   ✗ Checkout failed: ${checkoutResult.stderr}`));
      return { success: false, error: `Checkout failed: ${checkoutResult.stderr}` };
    }

    console.log(chalk.green('   ✓ Files checked out'));
    console.log('');
    console.log(chalk.green.bold(`   ✅ Umbrella repository "${org}/${repoName}" cloned successfully`));
    console.log('');
    return { success: true };
  } finally {
    // Always clean up temp dir
    await remove(tmpDir).catch(() => {});
  }
}
