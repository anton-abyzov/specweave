/**
 * Project skills: the SpecWeave skills a project has turned on (the core ones
 * plus any enabled or detected optional ones, see ./catalog.ts), namespaced as
 * `sw-<name>`, in both places AI tools look for them:
 *
 *   .claude/skills/sw-<name>/   Claude Code, including cloud sessions where
 *                               plugins do not load
 *   .agents/skills/sw-<name>/   Codex, Grok and every tool that reads the
 *                               shared skills folder
 *
 * Both come from the same source, the plugin copies generated from
 * `skills/sw-<name>/` (scripts/build/generate-skills.mjs), so switching tools
 * mid-work needs no reinstall. The only change from the plugin copy is the
 * frontmatter `name:` (tools that require it get `sw-<name>`) and the removal
 * of the "generated" marker line.
 *
 * `installProjectSkills` also removes the copies of optional skills that are now
 * off. `removeLegacySkillCopies` deletes the unnamespaced copies (`do`, `review`,
 * ...) that SpecWeave 2.x put into those folders and the retired `sw-<name>`
 * folders, only when their content identifies them as SpecWeave's own.
 *
 * @module core/skills/project-skills
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readSkillCatalog, resolveSkills, type SkillCatalog, type SkillState } from './catalog.js';

/** Where the project copies go, relative to the project root. */
export const PROJECT_SKILL_DIRS = ['.claude/skills', '.agents/skills'] as const;

/**
 * Unnamespaced skill folders SpecWeave 2.x copied into `.claude/skills/` (and the
 * generic adapter into `.agents/skills/`). Removed only when the content is ours.
 */
export const LEGACY_SKILL_NAMES = [
  'auto', 'brainstorm', 'do', 'done', 'handoff', 'increment',
  'jev', 'project', 'qa', 'review', 'sync', 'team',
] as const;

/**
 * Skills SpecWeave once installed as `sw-<name>` and no longer ships; the same
 * list as the catalog's `retired` (a test keeps them equal). Only these names are
 * candidates; any other `sw-*` folder belongs to the user.
 *   qa          2.x Codex adapter wrote every plugin skill as `.agents/skills/sw-<name>`; qa was dropped in 3.0
 *   task        standalone `skills/sw-task` (vskill-installable, 2.0.0 to 2.3.0), folded into sw-do in 3.0
 *   brainstorm  its Decide step became sw-increment's and sw-grill-me's (3.1)
 *   team        folded into sw-do's "Parallel lanes" (3.1)
 */
export const RETIRED_SKILL_NAMES = ['qa', 'task', 'brainstorm', 'team'] as const;

const GENERATED_MARKER = /^<!-- Generated from skills\/sw-[a-z-]+\/SKILL\.md[^\n]*-->\n/m;

export function projectSkillName(name: string): string {
  return `sw-${name}`;
}

/** Project copy of a plugin SKILL.md: `name: sw-<name>` first, no generated marker. */
export function toProjectSkill(pluginContent: string, name: string): string {
  const text = pluginContent.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(GENERATED_MARKER, '');
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  const skillName = projectSkillName(name);
  if (!fm) return `---\nname: ${skillName}\n---\n${text}`;
  const body = fm[1].split('\n').filter((line) => !/^name\s*:/.test(line)).join('\n');
  return `---\nname: ${skillName}\n${body}\n---\n${text.slice(fm[0].length)}`;
}

/** The catalog shipped next to a plugin skills folder (`plugins/specweave/skills-catalog.json`). */
export function catalogFor(sourceDir: string): SkillCatalog {
  return readSkillCatalog(path.dirname(sourceDir));
}

/** Every catalog skill and whether this project has it on. */
export function projectSkillStates(projectRoot: string, options: { sourceDir?: string } = {}): SkillState[] {
  return resolveSkills(path.resolve(projectRoot), catalogFor(options.sourceDir ?? defaultPluginSkillsDir()));
}

/** The plugin skills folder shipped with this package (`plugins/specweave/skills`). */
export function defaultPluginSkillsDir(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, 'plugins', 'specweave', 'skills');
    if (fs.existsSync(path.join(candidate, 'do', 'SKILL.md'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('SpecWeave plugin skills not found (plugins/specweave/skills)');
}

/** Refuse to write through a symlink anywhere between the project root and `rel`. */
function assertNoSymlink(root: string, rel: string): void {
  let current = root;
  for (const segment of rel.split(/[\\/]/).filter(Boolean)) {
    current = path.join(current, segment);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`Refusing to write skills through a symlink: ${current}`);
  }
}

function listFiles(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const rel = prefix ? path.join(prefix, e.name) : e.name;
    if (e.isDirectory()) out.push(...listFiles(path.join(dir, e.name), rel));
    else if (e.isFile()) out.push(rel);
  }
  return out.sort();
}

export interface InstallProjectSkillsOptions {
  /** Plugin skills folder to install from (default: the one shipped with this package). */
  sourceDir?: string;
  /** Report what would change without writing. */
  dryRun?: boolean;
}

export interface InstallProjectSkillsResult {
  /** Project-relative files written (or that would be, in a dry run). */
  written: string[];
  /** Project-relative files already up to date. */
  unchanged: string[];
  /** Project-relative files removed from an `sw-<name>` folder because the skill no longer ships them. */
  removed: string[];
  /** Skills installed (short names, catalog order). */
  installed: string[];
  /** Project-relative `sw-<name>` folders removed because that optional skill is now off. */
  removedSkills: string[];
  /** Folders of optional skills that are off but were left alone: changed by hand, or not SpecWeave's copy. */
  keptSkills: string[];
}

/**
 * Install the project's skills as `sw-<name>` into `.claude/skills/` and
 * `.agents/skills/`: every core skill, plus each optional skill that
 * `.specweave/config.json` enables or the project's files detect. Copies of
 * optional skills that are off are removed when SpecWeave installed them.
 */
export function installProjectSkills(
  projectRoot: string,
  options: InstallProjectSkillsOptions = {},
): InstallProjectSkillsResult {
  const root = path.resolve(projectRoot);
  const sourceDir = options.sourceDir ?? defaultPluginSkillsDir();
  const optionalDir = path.join(path.dirname(sourceDir), 'skills-optional');
  const states = resolveSkills(root, catalogFor(sourceDir));
  const result: InstallProjectSkillsResult = { written: [], unchanged: [], removed: [], installed: [], removedSkills: [], keptSkills: [] };

  // Plan everything before touching the disk.
  const plan: Array<{ rel: string; bytes: Buffer }> = [];
  const owned: string[] = [];
  for (const state of states.filter((s) => s.on)) {
    const name = state.name;
    result.installed.push(name);
    const files = shippedCopy(state.tier === 'core' ? sourceDir : optionalDir, name);
    for (const base of PROJECT_SKILL_DIRS) {
      const skillDir = path.posix.join(base, projectSkillName(name));
      owned.push(skillDir);
      for (const [file, bytes] of files) plan.push({ rel: path.posix.join(skillDir, file), bytes });
    }
  }
  for (const { rel } of plan) assertNoSymlink(root, rel);

  // Optional skills that are off: remove a folder only when it is exactly the copy
  // this version installs; anything changed by hand, or not ours, is kept.
  for (const state of states.filter((s) => !s.on)) {
    const shipped = shippedCopy(optionalDir, state.name);
    for (const base of PROJECT_SKILL_DIRS) {
      const rel = path.posix.join(base, projectSkillName(state.name));
      if (hasSymlinkSegment(root, rel) || !fs.existsSync(path.join(root, rel))) continue;
      if (!isInstalledCopy(path.join(root, rel), shipped)) {
        result.keptSkills.push(rel);
        continue;
      }
      result.removedSkills.push(rel);
      if (!options.dryRun) fs.rmSync(path.join(root, rel), { recursive: true, force: true });
    }
  }

  const planned = new Set(plan.map((p) => p.rel));
  for (const skillDir of owned) {
    for (const file of listFiles(path.join(root, skillDir))) {
      const rel = path.posix.join(skillDir, file.split(path.sep).join('/'));
      if (planned.has(rel)) continue;
      result.removed.push(rel);
      if (!options.dryRun) fs.rmSync(path.join(root, rel), { force: true });
    }
  }
  for (const { rel, bytes } of plan) {
    const dest = path.join(root, rel);
    if (fs.existsSync(dest) && fs.readFileSync(dest).equals(bytes)) {
      result.unchanged.push(rel);
      continue;
    }
    result.written.push(rel);
    if (options.dryRun) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes);
  }
  return result;
}

/** The files a skill installs (posix-relative path → bytes), its SKILL.md in project form. */
function shippedCopy(skillsDir: string, name: string): Map<string, Buffer> {
  const src = path.join(skillsDir, name);
  const files = listFiles(src);
  if (!files.includes('SKILL.md')) throw new Error(`Skill source missing: ${path.join(src, 'SKILL.md')}`);
  const out = new Map<string, Buffer>();
  for (const file of files) {
    const raw = fs.readFileSync(path.join(src, file));
    out.set(file.split(path.sep).join('/'), file === 'SKILL.md' ? Buffer.from(toProjectSkill(raw.toString('utf8'), name), 'utf8') : raw);
  }
  return out;
}

/**
 * True when `dir` is byte for byte the copy `installProjectSkills` writes: a real
 * folder with exactly the shipped files and contents. A user's own skill of the
 * same name, an edited copy or one with an extra file (a note, a vskill lock) is not.
 */
export function isInstalledCopy(dir: string, shipped: Map<string, Buffer>): boolean {
  try {
    if (!fs.lstatSync(dir).isDirectory()) return false;
  } catch {
    return false;
  }
  const files = listFiles(dir).map((f) => f.split(path.sep).join('/'));
  if (files.length !== shipped.size) return false;
  try {
    return files.every((f) => {
      const expected = shipped.get(f);
      return expected !== undefined && !fs.lstatSync(path.join(dir, f)).isSymbolicLink() && fs.readFileSync(path.join(dir, f)).equals(expected);
    });
  } catch {
    return false;
  }
}

/**
 * True when a legacy skill folder is a copy SpecWeave installed: only SKILL.md
 * (plus team's old agents/*.md and brainstorm's references/credits.md), and the
 * SKILL.md drives the specweave CLI or names a `sw:` skill. A user's own
 * `review` skill is left alone.
 */
export function isSpecweaveOwnedCopy(dir: string, name: string): boolean {
  const files = listFiles(dir).map((f) => f.split(path.sep).join('/'));
  if (!files.includes('SKILL.md')) return false;
  const extraAllowed = (f: string) =>
    (name === 'team' && /^agents\/[\w-]+\.md$/.test(f)) || (name === 'brainstorm' && f === 'references/credits.md');
  if (files.some((f) => f !== 'SKILL.md' && !extraAllowed(f))) return false;
  let content: string;
  try {
    content = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  } catch {
    return false;
  }
  const drivesCli = /\bspecweave (task|verify|complete|create-increment|handoff|pickup|sync|auto|jev|project|qa|status)\b/.test(content);
  const namesSkill = /\bsw:(increment|do|done|review|team|handoff|sync|auto|brainstorm|qa|jev|project)\b/.test(content);
  return drivesCli || namesSkill;
}

/** True when any path segment from the project root down to `rel` is a symlink. */
function hasSymlinkSegment(root: string, rel: string): boolean {
  let current = root;
  for (const segment of rel.split(/[\\/]/).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Remove SpecWeave's own stale skill copies from `.claude/skills/` and
 * `.agents/skills/`: the unnamespaced 2.x folders and the `sw-<name>` folders
 * of RETIRED_SKILL_NAMES. Skips a skills folder reached through a symlink.
 */
export function removeLegacySkillCopies(projectRoot: string, options: { dryRun?: boolean } = {}): string[] {
  const root = path.resolve(projectRoot);
  const removed: string[] = [];
  for (const base of PROJECT_SKILL_DIRS) {
    // A symlinked skills folder may be shared with other projects or the user's
    // global skills; never delete through it.
    if (hasSymlinkSegment(root, base)) continue;
    const candidates: Array<[string, string]> = [
      ...LEGACY_SKILL_NAMES.map((name): [string, string] => [name, name]),
      ...RETIRED_SKILL_NAMES.map((name): [string, string] => [projectSkillName(name), name]),
    ];
    for (const [folder, name] of candidates) {
      const rel = path.posix.join(base, folder);
      const dir = path.join(root, rel);
      try {
        if (!fs.lstatSync(dir).isDirectory()) continue;
      } catch {
        continue;
      }
      if (!isSpecweaveOwnedCopy(dir, name)) continue;
      removed.push(rel);
      if (!options.dryRun) fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  return removed;
}
