/**
 * Clone Helper for `specweave get`
 *
 * Foreground git clone with idempotency and helpful auth error messages.
 */

import * as path from 'path';
import * as fs from 'fs';
import { execFileNoThrow } from '../../../utils/execFileNoThrow.js';
import type { ParsedSource } from './source-parser.js';

export interface CloneOptions {
  branch?: string;
}

export interface CloneResult {
  /** true if clone happened, false if skipped */
  cloned: boolean;
  /** absolute path to the repo directory */
  repoPath: string;
  /** reason clone was skipped, if applicable */
  skippedReason?: string;
}

const AUTH_ERROR_PATTERNS = [
  'Permission denied (publickey)',
  'Authentication failed',
  'Repository not found',
  'could not read Username',
  'Invalid username or password',
  'remote: Repository not found',
];

/**
 * Clone a repository to targetDir.
 * Idempotent: if targetDir/.git already exists, skips clone.
 */
export async function cloneRepo(
  source: ParsedSource,
  targetDir: string,
  options: CloneOptions = {},
): Promise<CloneResult> {
  // Idempotency check
  if (fs.existsSync(path.join(targetDir, '.git'))) {
    return {
      cloned: false,
      repoPath: targetDir,
      skippedReason: 'already exists',
    };
  }

  // Early check: targetDir exists but is not a git repo
  if (fs.existsSync(targetDir)) {
    throw new Error(
      `Directory already exists but is not a git repository: ${targetDir}\n` +
      'Remove or rename the directory, then try again.'
    );
  }

  const parentDir = path.dirname(targetDir);
  const repoName = path.basename(targetDir);

  try {
    await fs.promises.mkdir(parentDir, { recursive: true });
  } catch (err) {
    throw new Error(
      `Cannot create directory ${parentDir}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const args = ['clone', source.cloneUrl!, repoName];
  if (options.branch) {
    args.push('--branch', options.branch);
  }

  const result = await execFileNoThrow('git', args, { cwd: parentDir });

  if (result.exitCode !== 0) {
    const stderr = result.stderr || '';
    const isAuthError = AUTH_ERROR_PATTERNS.some(p => stderr.includes(p));

    if (isAuthError) {
      throw new Error(
        `Authentication failed cloning ${source.cloneUrl}\n\n` +
        'To fix:\n' +
        '  • HTTPS: run `gh auth login` or set GH_TOKEN env var\n' +
        '  • SSH: ensure your SSH key is added to GitHub\n' +
        `\nGit output: ${stderr.trim()}`
      );
    }

    throw new Error(
      `Failed to clone ${source.cloneUrl}\n${stderr.trim() || result.stdout.trim()}`
    );
  }

  return { cloned: true, repoPath: targetDir };
}
