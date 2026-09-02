/**
 * Git Hooks Installer for User Projects
 *
 * Installs pre-commit hooks to enforce SpecWeave best practices:
 * - Root folder pollution check (CRITICAL)
 * - Increment folder cleanliness
 * - Duplicate increment detection
 * - YAML frontmatter validation
 * - Mass deletion protection
 */

import * as fs from '../../../utils/fs-native.js';
import { chmodSync } from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { incrementRootFilesShellPattern } from '../../../core/increment/increment-artifacts.js';

/**
 * Version of the hook body this build ships. Bump whenever the template
 * changes behaviour so already-installed hooks in user repos get refreshed
 * instead of being left on a stale (1.x) body forever.
 */
export const PRE_COMMIT_HOOK_VERSION = '2.0.0';

const HOOK_MARKER = 'SpecWeave Pre-Commit Hook';
const HOOK_VERSION_RE = /^#\s*Version:\s*([0-9]+\.[0-9]+\.[0-9]+)\s*$/m;

/**
 * Render the pre-commit template: substitutes the increment-root allow-list so
 * the shipped hook can never drift from INCREMENT_ROOT_FILES.
 */
export function renderPreCommitHook(template: string): string {
  return template.replace(
    /\{\{ALLOWED_INCREMENT_ROOT_FILES\}\}/g,
    incrementRootFilesShellPattern()
  );
}

/** Version stamped into an installed SpecWeave hook, or null if absent/foreign. */
export function readInstalledHookVersion(content: string): string | null {
  if (!content.includes(HOOK_MARKER)) return null;
  const m = content.match(HOOK_VERSION_RE);
  return m ? m[1] : '0.0.0';
}

function isOlder(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y;
  }
  return false;
}

/**
 * True when an installed SpecWeave hook is older than the one we ship and must
 * be rewritten. Foreign (non-SpecWeave) hooks are never touched.
 */
export function needsHookRefresh(existingContent: string): boolean {
  const installed = readInstalledHookVersion(existingContent);
  if (installed === null) return false;
  return isOlder(installed, PRE_COMMIT_HOOK_VERSION);
}

/** Outcome of {@link refreshManagedGitHook}. */
export type HookRefreshOutcome =
  /** No `.git/hooks/pre-commit` at all — nothing to refresh. */
  | 'absent'
  /** Not a git repository (or no `.git` directory). */
  | 'not-a-repo'
  /** A hand-written / third-party hook. Never touched. */
  | 'foreign'
  /** A SpecWeave hook already at the shipped version. */
  | 'current'
  /** A stale SpecWeave hook that was rewritten to the shipped template. */
  | 'refreshed'
  /** A stale SpecWeave hook that WOULD be rewritten (`--check` / dry run). */
  | 'would-refresh'
  /** The refresh was attempted and failed (permissions, missing template). */
  | 'failed';

export interface HookRefreshResult {
  outcome: HookRefreshOutcome;
  /** Version stamped in the hook found on disk (null when foreign/absent). */
  installedVersion: string | null;
  /** Version this build ships. */
  shippedVersion: string;
  /** Human-readable one-liner for CLI output. */
  message: string;
}

/**
 * Refresh an ALREADY-INSTALLED SpecWeave pre-commit hook to the shipped
 * template. Used by `specweave update` so an upgraded 1.x project does not keep
 * a hook body that rejects `ledger.jsonl` at the increment root and reports a
 * false duplicate id for every increment that has a `reports/` folder.
 *
 * Deliberately conservative:
 *   - a hook the USER wrote (no `SpecWeave Pre-Commit Hook` marker) is left
 *     alone and reported, never rewritten;
 *   - a project with no hook at all is left alone (installing one is `init`'s
 *     job, not an upgrade side effect).
 */
export function refreshManagedGitHook(
  projectPath: string,
  templatesDir: string,
  options: { dryRun?: boolean } = {}
): HookRefreshResult {
  const shippedVersion = PRE_COMMIT_HOOK_VERSION;
  const base = (outcome: HookRefreshOutcome, installedVersion: string | null, message: string): HookRefreshResult =>
    ({ outcome, installedVersion, shippedVersion, message });

  const gitDir = path.join(projectPath, '.git');
  if (!fs.existsSync(gitDir)) {
    return base('not-a-repo', null, 'not a git repository — pre-commit hook not refreshed');
  }

  const hookPath = path.join(gitDir, 'hooks', 'pre-commit');
  if (!fs.existsSync(hookPath)) {
    return base('absent', null, 'no pre-commit hook installed');
  }

  let existing: string;
  try {
    existing = fs.readFileSync(hookPath, 'utf-8');
  } catch (error) {
    return base('failed', null, `could not read .git/hooks/pre-commit: ${error instanceof Error ? error.message : String(error)}`);
  }

  const installedVersion = readInstalledHookVersion(existing);
  if (installedVersion === null) {
    return base(
      'foreign',
      null,
      'custom pre-commit hook left untouched — if it came from SpecWeave 1.x, delete it and run `specweave init` (or `specweave doctor --fix`) to install the 2.0 hook'
    );
  }

  if (!needsHookRefresh(existing)) {
    return base('current', installedVersion, `pre-commit hook already v${installedVersion}`);
  }

  if (options.dryRun) {
    return base('would-refresh', installedVersion, `pre-commit hook is stale (v${installedVersion} → v${shippedVersion}) and would be refreshed`);
  }

  try {
    const templatePath = path.join(templatesDir, 'git-hooks', 'pre-commit.template');
    const rendered = renderPreCommitHook(fs.readFileSync(templatePath, 'utf-8'));
    fs.writeFileSync(hookPath, rendered, 'utf-8');
    chmodSync(hookPath, 0o755);
    return base('refreshed', installedVersion, `pre-commit hook refreshed (v${installedVersion} → v${shippedVersion})`);
  } catch (error) {
    return base('failed', installedVersion, `could not refresh pre-commit hook: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Install git pre-commit hook in user project
 *
 * @param projectPath - Project directory path
 * @param templatesDir - Templates directory path
 * @returns Success boolean
 */
export function installGitHooks(projectPath: string, templatesDir: string): boolean {
  try {
    // Check if this is a git repository
    const gitDir = path.join(projectPath, '.git');
    if (!fs.existsSync(gitDir)) {
      console.log(chalk.yellow('   ⚠ Not a git repository - hooks not installed'));
      console.log(chalk.gray('     Run: git init'));
      return false;
    }

    // Check if hooks directory exists
    const hooksDir = path.join(gitDir, 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    // Copy pre-commit hook template
    const templatePath = path.join(templatesDir, 'git-hooks', 'pre-commit.template');
    const targetPath = path.join(hooksDir, 'pre-commit');

    if (!fs.existsSync(templatePath)) {
      console.log(chalk.yellow('   ⚠ Hook template not found - skipping'));
      return false;
    }

    const rendered = renderPreCommitHook(fs.readFileSync(templatePath, 'utf-8'));

    // Check if hook already exists
    let refreshed = false;
    if (fs.existsSync(targetPath)) {
      const existingContent = fs.readFileSync(targetPath, 'utf-8');
      const installedVersion = readInstalledHookVersion(existingContent);
      if (installedVersion === null) {
        console.log(chalk.yellow('   ⚠ Custom pre-commit hook exists - not overwriting'));
        console.log(chalk.gray('     Manual install: cp .specweave/templates/git-hooks/pre-commit .git/hooks/'));
        return false;
      }
      if (!needsHookRefresh(existingContent)) {
        console.log(chalk.blue('   ℹ SpecWeave hooks already installed'));
        return true;
      }
      // Stale SpecWeave hook (e.g. the 1.x body that rejects ledger.jsonl at
      // the increment root) - rewrite it in place.
      refreshed = true;
      console.log(
        chalk.yellow(
          `   ⟳ Refreshing SpecWeave pre-commit hook (v${installedVersion} → v${PRE_COMMIT_HOOK_VERSION})`
        )
      );
    }

    fs.writeFileSync(targetPath, rendered, 'utf-8');

    // Make executable
    chmodSync(targetPath, 0o755);

    if (refreshed) {
      console.log(chalk.green('   ✓ Git hooks refreshed'));
      return true;
    }

    console.log(chalk.green('   ✓ Git hooks installed'));
    console.log(chalk.gray('     Pre-commit checks:'));
    console.log(chalk.gray('       1. Root pollution check (blocks .md in project root)'));
    console.log(chalk.gray('       2. Increment cleanliness (reports/ scripts/ logs/)'));
    console.log(chalk.gray('       3. Duplicate increment detection'));
    console.log(chalk.gray('       4. YAML frontmatter validation'));
    console.log(chalk.gray('       5. Mass .specweave/ deletion protection'));

    return true;
  } catch (error) {
    console.log(chalk.red('   ✗ Failed to install git hooks'));
    if (error instanceof Error) {
      console.log(chalk.gray('     ' + error.message));
    }
    return false;
  }
}

/**
 * Uninstall SpecWeave git hooks
 *
 * @param projectPath - Project directory path
 * @returns Success boolean
 */
export function uninstallGitHooks(projectPath: string): boolean {
  try {
    const hookPath = path.join(projectPath, '.git', 'hooks', 'pre-commit');

    if (!fs.existsSync(hookPath)) {
      console.log(chalk.yellow('   ⚠ No pre-commit hook found'));
      return false;
    }

    // Check if it's a SpecWeave hook
    const content = fs.readFileSync(hookPath, 'utf-8');
    if (!content.includes('SpecWeave Pre-Commit Hook')) {
      console.log(chalk.yellow('   ⚠ Not a SpecWeave hook - not removing'));
      return false;
    }

    // Remove hook
    fs.unlinkSync(hookPath);
    console.log(chalk.green('   ✓ Git hooks uninstalled'));

    return true;
  } catch (error) {
    console.log(chalk.red('   ✗ Failed to uninstall git hooks'));
    if (error instanceof Error) {
      console.log(chalk.gray('     ' + error.message));
    }
    return false;
  }
}

/**
 * Check if SpecWeave git hooks are installed
 *
 * @param projectPath - Project directory path
 * @returns True if installed
 */
export function areGitHooksInstalled(projectPath: string): boolean {
  try {
    const hookPath = path.join(projectPath, '.git', 'hooks', 'pre-commit');

    if (!fs.existsSync(hookPath)) {
      return false;
    }

    const content = fs.readFileSync(hookPath, 'utf-8');
    return content.includes('SpecWeave Pre-Commit Hook');
  } catch {
    return false;
  }
}
