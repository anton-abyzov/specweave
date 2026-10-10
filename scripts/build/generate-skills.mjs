#!/usr/bin/env node
/**
 * generate-skills — write the Claude plugin skills from the one skill source.
 *
 * `skills/sw-<name>/` is the only hand-edited copy of every SpecWeave skill.
 * This script mirrors each one into `plugins/specweave/skills/<name>/` (so the
 * plugin keeps `/sw:<name>`), marks the copy as generated, and deletes any
 * plugin skill folder or file that has no source. `specweave init` / `update`
 * then install the plugin copies into projects as `sw-<name>` (see
 * src/core/skills/project-skills.ts).
 *
 * Usage:
 *   node scripts/build/generate-skills.mjs            # write the plugin copies
 *   node scripts/build/generate-skills.mjs --check    # exit 1 when a copy drifted
 *   node scripts/build/generate-skills.mjs --root <dir>   # another checkout (tests)
 *
 * Zero dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..', '..');

/** The skills SpecWeave ships, in loop order. */
export const SKILL_NAMES = [
  'increment', 'do', 'auto', 'team', 'review', 'done',
  'sync', 'handoff', 'project', 'brainstorm', 'jev',
];

const SOURCE_DIR = 'skills';
const PLUGIN_DIR = path.join('plugins', 'specweave', 'skills');

/** The line that marks a plugin copy as generated; installers strip it. */
export function generatedMarker(name) {
  return `<!-- Generated from skills/sw-${name}/SKILL.md by scripts/build/generate-skills.mjs. Edit the source, then npm run build. -->`;
}

/** Plugin copy of a SKILL.md: the source with the generated marker after the frontmatter. */
export function toPluginSkill(content, name) {
  const text = content.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const fm = text.match(/^---\n[\s\S]*?\n---\n/);
  if (!fm) throw new Error(`skills/sw-${name}/SKILL.md has no frontmatter`);
  if (/^name\s*:/m.test(fm[0])) {
    throw new Error(`skills/sw-${name}/SKILL.md must not set name: (the folder name is the skill name)`);
  }
  return `${fm[0]}${generatedMarker(name)}\n${text.slice(fm[0].length)}`;
}

function listFiles(dir, prefix = '') {
  const out = [];
  let entries;
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

/**
 * Every file the plugin skills folder should contain, keyed by path relative
 * to `plugins/specweave/skills/`.
 * @returns {{ files: Map<string, Buffer>, errors: string[] }}
 */
export function planPluginSkills(root = REPO_ROOT) {
  const files = new Map();
  const errors = [];
  const sourceRoot = path.join(root, SOURCE_DIR);
  const present = fs.existsSync(sourceRoot)
    ? fs.readdirSync(sourceRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    : [];
  for (const dir of present) {
    if (!SKILL_NAMES.includes(dir.replace(/^sw-/, '')) || !dir.startsWith('sw-')) {
      errors.push(`skills/${dir}: not one of the shipped skills (${SKILL_NAMES.map((n) => `sw-${n}`).join(', ')})`);
    }
  }
  for (const name of SKILL_NAMES) {
    const src = path.join(sourceRoot, `sw-${name}`);
    if (!fs.existsSync(path.join(src, 'SKILL.md'))) {
      errors.push(`skills/sw-${name}/SKILL.md: missing`);
      continue;
    }
    for (const rel of listFiles(src)) {
      const bytes = fs.readFileSync(path.join(src, rel));
      const key = path.join(name, rel).split(path.sep).join('/');
      if (rel === 'SKILL.md') {
        try {
          files.set(key, Buffer.from(toPluginSkill(bytes.toString('utf8'), name), 'utf8'));
        } catch (e) {
          errors.push(e.message);
        }
      } else {
        files.set(key, bytes);
      }
    }
  }
  return { files, errors };
}

/** Differences between the planned plugin skills and what is on disk. */
export function checkPluginSkills(root = REPO_ROOT) {
  const { files, errors } = planPluginSkills(root);
  const problems = [...errors];
  const target = path.join(root, PLUGIN_DIR);
  const onDisk = new Set(listFiles(target).map((f) => f.split(path.sep).join('/')));
  for (const [rel, bytes] of files) {
    if (!onDisk.has(rel)) problems.push(`${PLUGIN_DIR}/${rel}: missing`);
    else if (!fs.readFileSync(path.join(target, rel)).equals(bytes)) problems.push(`${PLUGIN_DIR}/${rel}: differs from its source`);
  }
  for (const rel of onDisk) {
    if (!files.has(rel)) problems.push(`${PLUGIN_DIR}/${rel}: has no source in skills/`);
  }
  return problems.map((p) => p.split(path.sep).join('/'));
}

/** Write the plugin copies and delete anything without a source. Returns the paths changed. */
export function writePluginSkills(root = REPO_ROOT) {
  const { files, errors } = planPluginSkills(root);
  if (errors.length) throw new Error(errors.join('\n'));
  const target = path.join(root, PLUGIN_DIR);
  const changed = [];
  for (const rel of listFiles(target).map((f) => f.split(path.sep).join('/'))) {
    if (!files.has(rel)) {
      fs.rmSync(path.join(target, rel), { force: true });
      changed.push(`removed ${rel}`);
    }
  }
  // Drop folders the removal left empty (a retired skill, an old agents/ dir).
  const prune = (dir) => {
    for (const e of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
      if (e.isDirectory()) prune(path.join(dir, e.name));
    }
    if (dir !== target && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  };
  prune(target);
  for (const [rel, bytes] of files) {
    const dest = path.join(target, rel);
    if (fs.existsSync(dest) && fs.readFileSync(dest).equals(bytes)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes);
    changed.push(`wrote ${rel}`);
  }
  return changed;
}

function main(argv) {
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx >= 0 ? path.resolve(argv[rootIdx + 1]) : REPO_ROOT;
  if (argv.includes('--check')) {
    const problems = checkPluginSkills(root);
    if (problems.length) {
      console.error(`generate-skills: ${problems.length} plugin skill file(s) out of date:`);
      for (const p of problems) console.error(`  - ${p}`);
      console.error('Edit skills/sw-<name>/ and run `node scripts/build/generate-skills.mjs`.');
      process.exit(1);
    }
    console.log(`generate-skills: ${SKILL_NAMES.length} plugin skills match skills/`);
    return;
  }
  const changed = writePluginSkills(root);
  console.log(`generate-skills: ${SKILL_NAMES.length} skills, ${changed.length} file(s) changed`);
  for (const c of changed) console.log(`  ${c}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
