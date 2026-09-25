/**
 * Project skills: the 11 SpecWeave skills installed into a project, namespaced
 * as `sw-<name>`, in both places AI tools look for them:
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
 * `removeLegacySkillCopies` deletes the unnamespaced copies (`do`, `review`,
 * ...) that SpecWeave 2.x put into those folders, only when their content
 * identifies them as SpecWeave's own.
 *
 * @module core/skills/project-skills
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/** The skills SpecWeave ships (the same list as scripts/build/generate-skills.mjs). */
export const SPECWEAVE_SKILLS = [
  'increment', 'do', 'auto', 'team', 'review', 'done',
  'sync', 'handoff', 'project', 'brainstorm', 'jev',
] as const;

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
}

/** Install the 11 skills as `sw-<name>` into `.claude/skills/` and `.agents/skills/`. */
export function installProjectSkills(
  projectRoot: string,
  options: InstallProjectSkillsOptions = {},
): InstallProjectSkillsResult {
  const root = path.resolve(projectRoot);
  const sourceDir = options.sourceDir ?? defaultPluginSkillsDir();
  const result: InstallProjectSkillsResult = { written: [], unchanged: [], removed: [] };

  // Plan everything before touching the disk.
  const plan: Array<{ rel: string; bytes: Buffer }> = [];
  const owned: string[] = [];
  for (const name of SPECWEAVE_SKILLS) {
    const src = path.join(sourceDir, name);
    const files = listFiles(src);
    if (!files.includes('SKILL.md')) throw new Error(`Skill source missing: ${path.join(src, 'SKILL.md')}`);
    for (const base of PROJECT_SKILL_DIRS) {
      const skillDir = path.posix.join(base, projectSkillName(name));
      owned.push(skillDir);
      for (const file of files) {
        const raw = fs.readFileSync(path.join(src, file));
        const bytes = file === 'SKILL.md' ? Buffer.from(toProjectSkill(raw.toString('utf8'), name), 'utf8') : raw;
        plan.push({ rel: path.posix.join(skillDir, file.split(path.sep).join('/')), bytes });
      }
    }
  }
  for (const { rel } of plan) assertNoSymlink(root, rel);

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

/**
 * True when a legacy skill folder is a copy SpecWeave installed: only SKILL.md
 * (plus team's old agents/*.md), and the SKILL.md drives the specweave CLI or
 * names a `sw:` skill. A user's own `review` skill is left alone.
 */
export function isSpecweaveOwnedCopy(dir: string, name: string): boolean {
  const files = listFiles(dir).map((f) => f.split(path.sep).join('/'));
  if (!files.includes('SKILL.md')) return false;
  const extraAllowed = (f: string) => name === 'team' && /^agents\/[\w-]+\.md$/.test(f);
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

/** Remove unnamespaced SpecWeave skill copies from `.claude/skills/` and `.agents/skills/`. */
export function removeLegacySkillCopies(projectRoot: string, options: { dryRun?: boolean } = {}): string[] {
  const root = path.resolve(projectRoot);
  const removed: string[] = [];
  for (const base of PROJECT_SKILL_DIRS) {
    for (const name of LEGACY_SKILL_NAMES) {
      const rel = path.posix.join(base, name);
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
