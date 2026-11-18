/**
 * specweave init: one path, no questions, safe to run any number of times (1407).
 *
 * 1. Checks the place first and writes nothing when it refuses.
 * 2. `.specweave/` (increments, memory index, config.json: keys already there win).
 * 3. AGENTS.md and CLAUDE.md (only the managed block), README.md when missing.
 * 4. SpecWeave's own lines in .gitignore and .gitattributes.
 * 5. The sw-* skills in .claude/skills/ and .agents/skills/.
 * 6. The recorded tool's files; for Claude Code the project settings on a first run.
 *
 * Init never runs Git. `--git-hooks` is the one write into `.git/`.
 * Cloning repositories is `specweave get`; connecting a tracker is `specweave sync setup`.
 */

import * as fs from '../../utils/fs-native.js';
import * as nativeFs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { AdapterLoader } from '../../adapters/adapter-loader.js';
import { getDirname } from '../../utils/esm-helpers.js';
import { findEffectiveRoot } from '../../utils/find-project-root.js';
import { linkedWorktreeRoot, mainCheckoutOf } from '../../utils/main-checkout.js';
import { canonicalPath, isWithin } from '../../core/workspace/context.js';
import { installProjectSkills, PROJECT_SKILL_DIRS } from '../../core/skills/project-skills.js';
import type { InitOptions } from '../helpers/init/types.js';
import { findSourceDir, detectNestedSpecweave, scanWorkspaceRepos, scanUnregisteredCheckouts, buildWorkspaceConfig } from '../helpers/init/path-utils.js';
import { createDirectoryStructure, ensureConfigFile, ensureGitattributes, writeJsonIfChanged } from '../helpers/init/directory-structure.js';
import { applyInstructionTemplate } from '../helpers/init/instruction-file-writer.js';
import { detectStackCommands } from '../helpers/init/stack-detector.js';
import { ensureSpecweaveGitignoreEntries } from '../helpers/init/gitignore-generator.js';
import { installGitHooks } from '../helpers/init/git-hooks-installer.js';
import { backupAndClearSpecweave } from '../helpers/init/fresh-start.js';
import { applyProjectDefault } from './autocompact.js';

const __dirname = getDirname(import.meta.url);

export type { InitOptions };

/** Files whose state the summary reports (paths relative to the project). */
const REPORTED_FILES = [
  '.specweave/config.json', '.specweave/memory/MEMORY.md', 'AGENTS.md', 'CLAUDE.md', 'README.md',
  '.gitignore', '.gitattributes', '.claude/settings.json',
];

/** A refusal: one line on stderr, exit 1, nothing written. */
function refuse(message: string): never {
  console.error(chalk.red(`✗ ${message}`));
  process.exit(1);
}

/** Real path; `native` also expands Windows 8.3 short names (RUNNER~1), so two spellings compare equal. */
function real(p: string): string {
  try { return nativeFs.realpathSync.native(p); } catch { return path.resolve(p); }
}

/** Where init runs and the project name a new config gets. */
function resolveTarget(projectName?: string): { targetDir: string; name: string } {
  const targetDir = !projectName || projectName === '.' ? process.cwd() : path.resolve(process.cwd(), projectName);
  const name = path.basename(path.resolve(targetDir)).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return { targetDir, name: name || 'project' };
}

/** Why init will not run in `targetDir`, or null when it may. Reads only. */
function placeRefusal(targetDir: string, force: boolean): string | null {
  const target = real(targetDir);
  if (target === real(os.homedir())) {
    return 'The home folder holds every project and is never one itself. Run specweave init in a project folder.';
  }
  if (target === real(os.tmpdir())) {
    return 'The system temp folder is not a project. Run specweave init in a folder inside it (mktemp -d) or elsewhere.';
  }

  const parent = (detectNestedSpecweave(targetDir) ?? []).find((f) => !f.isUserLevel && !f.isStale);
  if (parent) {
    return `This folder is inside the SpecWeave project at ${parent.path}. Run specweave there, or move this folder out.`;
  }

  const worktree = linkedWorktreeRoot(targetDir);
  if (worktree) {
    const refusal = worktreeRefusal(targetDir, worktree);
    if (refusal) return refusal;
  }

  if (!force) {
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    let link: nativeFs.Stats | undefined;
    try { link = nativeFs.lstatSync(configPath); } catch { link = undefined; }
    if (link?.isSymbolicLink()) {
      return '.specweave/config.json is a symlink and init does not write through one. Replace it with the file, or run specweave init --force to back up .specweave and start over.';
    }
    if (link && !isConfigObject(configPath)) {
      return '.specweave/config.json is not a valid JSON object and was left as it is. Fix or delete it, or run specweave init --force to back up .specweave and start over.';
    }
  }
  return null;
}

/**
 * A linked Git worktree belongs to the project its main checkout resolves to.
 * Init there is a re-run only when that project is the worktree itself
 * (a tracked `.specweave`); otherwise it would start a second planning root.
 */
function worktreeRefusal(targetDir: string, worktree: string): string | null {
  const selected = process.env.SPECWEAVE_WORKSPACE;
  delete process.env.SPECWEAVE_WORKSPACE;
  let effective: string | null;
  try {
    effective = findEffectiveRoot(targetDir);
  } catch (err) {
    return `This worktree has no single SpecWeave project (${err instanceof Error ? err.message : String(err)}).`;
  } finally {
    if (selected !== undefined) process.env.SPECWEAVE_WORKSPACE = selected;
  }
  if (effective) {
    try {
      if (isWithin(canonicalPath(worktree), canonicalPath(effective))) return null;
    } catch { /* fall through to the refusal */ }
    return `This worktree belongs to the SpecWeave project at ${effective}. Run specweave there; a second project on a branch would split the plan.`;
  }
  const main = mainCheckoutOf(targetDir) ?? worktree;
  return `This is a linked worktree of ${main}. Run specweave init in ${main} instead.`;
}

function isConfigObject(configPath: string): boolean {
  try {
    const value: unknown = JSON.parse(nativeFs.readFileSync(configPath, 'utf-8'));
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

/** The tool in a saved config, as written (null when there is none). */
/** A non-empty string at `keys` in the config, or null. */
function savedString(configPath: string, ...keys: string[]): string | null {
  try {
    let value: unknown = JSON.parse(nativeFs.readFileSync(configPath, 'utf-8'));
    for (const key of keys) value = (value as Record<string, unknown> | null)?.[key];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
  } catch {
    return null;
  }
}

/**
 * `--adapter`, else the saved tool, else SPECWEAVE_TOOL when it names a known
 * tool, else Claude Code. SPECWEAVE_TOOL names the agent running now, so it
 * never overrides a saved tool.
 */
function pickTool(requested: string | undefined, saved: string | null, known: string[], warnings: string[]): string {
  if (requested) return requested;
  if (saved) {
    if (known.includes(saved.toLowerCase())) return saved.toLowerCase();
    warnings.push(`The saved tool "${saved}" is not one init knows; using the next choice.`);
  }
  const fromEnv = process.env.SPECWEAVE_TOOL?.trim().toLowerCase();
  if (fromEnv && known.includes(fromEnv)) return fromEnv;
  return 'claude';
}

/** Register checkouts found in the folder: listed entries stay as they are, new ones are appended. */
function registerCheckouts(targetDir: string, projectName: string): string[] {
  const configPath = path.join(targetDir, '.specweave', 'config.json');
  const config = fs.readJsonSync(configPath);
  const discovery = scanWorkspaceRepos(targetDir);
  if (discovery) {
    const fragment = buildWorkspaceConfig(discovery, projectName);
    config.workspace = { ...fragment.workspace, ...config.workspace, repos: fragment.workspace.repos };
    config.repository = { ...fragment.repository, ...config.repository };
  } else if (!config.workspace && !config.umbrella) {
    // An empty list would hide the repositories a 1.x `umbrella` block still names.
    config.workspace = { name: projectName, repos: [] };
  }
  writeJsonIfChanged(configPath, config);
  return scanUnregisteredCheckouts(targetDir, discovery);
}

function readmeIfMissing(templatesDir: string, targetDir: string, projectName: string): void {
  const readme = path.join(targetDir, 'README.md');
  const template = path.join(templatesDir, 'README.md.template');
  if (fs.existsSync(readme) || !fs.existsSync(template)) return;
  fs.writeFileSync(readme, fs.readFileSync(template, 'utf-8').replace(/{{PROJECT_NAME}}/g, projectName));
}

function hasGitAbove(dir: string): boolean {
  let current = path.resolve(dir);
  for (;;) {
    if (nativeFs.existsSync(path.join(current, '.git'))) return true;
    const parent = path.dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

function snapshot(targetDir: string): Map<string, string | null> {
  const state = new Map<string, string | null>();
  for (const rel of REPORTED_FILES) {
    try { state.set(rel, nativeFs.readFileSync(path.join(targetDir, rel), 'utf-8')); } catch { state.set(rel, null); }
  }
  return state;
}

/** Run `fn` with console output captured, so an adapter's per-file lines do not flood the summary. */
async function quietly(fn: () => Promise<void>): Promise<{ error?: unknown; log: string[] }> {
  const log: string[] = [];
  const saved = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  const keep = (...args: unknown[]): void => { log.push(args.map(String).join(' ')); };
  console.log = console.info = console.warn = console.error = keep;
  try {
    await fn();
    return { log };
  } catch (error) {
    return { error, log };
  } finally {
    Object.assign(console, saved);
  }
}

async function installToolFiles(loader: AdapterLoader, tool: string, targetDir: string, projectName: string, options: InitOptions): Promise<string[]> {
  const adapter = loader.getAdapter(tool);
  if (!adapter) return [`No adapter for ${tool}; only the shared files were written.`];
  const adapterOptions = {
    projectPath: targetDir,
    projectName,
    techStack: options.techStack ? { language: options.techStack } : undefined,
    docsApproach: 'incremental' as const,
  };
  const requirements = await adapter.checkRequirements().catch(() => ({ met: true, missing: [], warnings: [] }));
  const run = await quietly(async () => {
    await adapter.install(adapterOptions);
    await adapter.postInstall(adapterOptions);
  });
  const problems = run.error ? [`${tool} files: ${run.error instanceof Error ? run.error.message : String(run.error)}`] : [];
  if (!requirements.met) problems.push(`${tool} files written, but its requirements are not met: ${requirements.missing.join(', ') || 'see the tool docs'}`);
  for (const w of requirements.warnings) problems.push(`${tool}: ${w}`);
  return problems;
}

export async function initCommand(projectName?: string, options: InitOptions = {}): Promise<void> {
  const loader = new AdapterLoader();
  const known = ['claude', ...loader.adapterNames()];
  const requested = options.adapter?.trim().toLowerCase();
  if (options.adapter !== undefined && (!requested || !known.includes(requested))) {
    refuse(`Unknown --adapter "${options.adapter}". Use one of: ${known.join(', ')}`);
  }

  const { targetDir, name: folderName } = resolveTarget(projectName);
  const refusal = placeRefusal(targetDir, !!options.force);
  if (refusal) refuse(refusal);

  const lines: string[] = [];
  const warnings: string[] = [];
  try {
    if (options.force && fs.existsSync(path.join(targetDir, '.specweave'))) {
      const backup = backupAndClearSpecweave(targetDir);
      if (!backup) refuse('Could not back up .specweave, so nothing was removed. Free some space or fix permissions, then run init --force again.');
      lines.push(`Backed up .specweave to ${path.basename(backup)} and started over`);
    }

    const configPath = path.join(targetDir, '.specweave', 'config.json');
    const firstRun = !fs.existsSync(configPath);
    const tool = pickTool(requested, firstRun ? null : savedString(configPath, 'adapters', 'default'), known, warnings);

    nativeFs.mkdirSync(targetDir, { recursive: true });
    const before = snapshot(targetDir);

    // 2. .specweave/ and the config, written first so every later step (and any
    //    other specweave command started meanwhile) reads this project's config.
    await createDirectoryStructure(targetDir, tool);
    ensureConfigFile(targetDir, folderName, tool);
    // The saved name wins over the folder name, so a re-run through a linked
    // worktree or another path to the same project rewrites nothing.
    const name = savedString(configPath, 'project', 'name') ?? folderName;
    const unregistered = registerCheckouts(targetDir, name);

    // 3. Instruction files and README.
    const templatesDir = findSourceDir('templates', __dirname);
    readmeIfMissing(templatesDir, targetDir, name);
    const commands = detectStackCommands(targetDir);
    for (const filename of ['CLAUDE.md', 'AGENTS.md'] as const) {
      const result = applyInstructionTemplate({ projectPath: targetDir, templatesDir, filename, projectName: name, commands });
      for (const w of result.warnings) warnings.push(`${filename}: ${w}`);
    }

    // 4. Repository hygiene, SpecWeave's own lines only.
    ensureSpecweaveGitignoreEntries(targetDir, '# SpecWeave');
    ensureGitattributes(targetDir, path.join(templatesDir, '.gitattributes.template'));

    // 5. Skills.
    const skills = installProjectSkills(targetDir);

    // 6. The tool.
    if (tool === 'claude') {
      if (firstRun) applyProjectDefault(targetDir);
      loader.checkClaudeCli();
      if (loader.claudeCliIssue) warnings.push(`The claude command failed its check (${loader.claudeCliIssue}); the files are written, plugins may need a manual install.`);
    } else {
      warnings.push(...await installToolFiles(loader, tool, targetDir, name, options));
    }

    if (options.gitHooks) {
      if (nativeFs.existsSync(path.join(targetDir, '.git'))) {
        let installed = false;
        await quietly(async () => { installed = installGitHooks(targetDir, templatesDir); });
        if (installed) lines.push('Pre-commit hook installed in .git/hooks/');
        else warnings.push('--git-hooks: the pre-commit hook could not be installed.');
      } else {
        warnings.push('--git-hooks: this folder is not the top of a Git repository, so no hook was installed.');
      }
    }

    // Summary: at most 12 lines.
    const after = snapshot(targetDir);
    const created: string[] = [];
    const updated: string[] = [];
    for (const rel of REPORTED_FILES) {
      const was = before.get(rel);
      const now = after.get(rel);
      if (now == null) continue;
      if (was == null) created.push(rel);
      else if (was !== now) updated.push(rel);
    }
    const skillsNote = skills.written.length > 0 ? `${skills.installed.length} sw-* skills in ${PROJECT_SKILL_DIRS.join(' and ')}` : null;
    if (firstRun && skillsNote) created.push(skillsNote);
    else if (skillsNote) updated.push(skillsNote);

    const where = path.relative(process.cwd(), targetDir) || '.';
    console.log(chalk.green(`✓ SpecWeave ${firstRun ? 'set up' : 'checked'} in ${where} for ${tool}`));
    for (const line of lines) console.log(`  ${line}`);
    if (created.length) console.log(`  Created: ${created.join(', ')}`);
    if (updated.length) console.log(`  Updated: ${updated.join(', ')}`);
    if (!created.length && !updated.length) console.log('  Nothing to change');
    if (unregistered.length) console.log(chalk.yellow(`  ${unregistered.length} checkout(s) not registered (${unregistered.slice(0, 3).join(', ')}): specweave get <path> adds one in place`));
    for (const w of warnings.slice(0, 4)) console.log(chalk.yellow(`  ⚠ ${w}`));
    if (!hasGitAbove(targetDir)) console.log(chalk.gray('  No Git repository here. SpecWeave works without one; run git init when you want history.'));
    console.log(chalk.cyan(`  Next: specweave create-increment "<what to build>"${where === '.' ? '' : ` (in ${where})`}`));
  } catch (error) {
    refuse(`specweave init failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
