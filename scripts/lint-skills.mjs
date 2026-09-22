#!/usr/bin/env node
/**
 * lint-skills — zero-dependency guard for the shipped skill surface.
 *
 * The plugin is a small set of skills and nothing else -- the roster is whatever
 * lives in plugins/specweave/skills/, read fresh on every run so no count in a
 * comment can go stale. This linter keeps every reference inside a skill
 * resolvable, because a skill that names a command or a sibling skill that does
 * not exist sends the model down a dead end.
 *
 * Rules
 *   1. no `name:` frontmatter in a shipped skill (the directory name IS the skill name)
 *   2. no `model:` / `effort:` / `context:` pins (weaker models and other vendors must run these)
 *   3. `description:` present and <= 200 characters
 *   4. every `specweave <cmd>` names a command registered in bin/specweave.js
 *   5. every `sw:<name>` resolves to plugins/specweave/skills/<name>/ (or an agent file)
 *   6. no retired 4.x thinking/agent phrasing — see .specweave/docs/internal/specs/opus-47-migration.md
 *   7. a SKILL.md that declares `allowed-tools` also explains why (## Tool-Use Rationale)
 *
 * Usage:
 *   node scripts/lint-skills.mjs            # lint, exit 1 on any error
 *   node scripts/lint-skills.mjs --json     # machine-readable report
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..');

const PLUGIN_SKILLS = path.join('plugins', 'specweave', 'skills');
const PLUGIN_AGENTS = path.join('plugins', 'specweave', 'agents');

/** Frontmatter keys that must never appear in a shipped skill. */
const FORBIDDEN_KEYS = ['name', 'model', 'effort', 'context'];
const MAX_DESCRIPTION = 200;

/** Commander gives these for free; they are never declared in bin/specweave.js. */
const BUILTIN_COMMANDS = ['help', 'version'];

/**
 * Wording the 4.7 migration retired. Matched case-insensitively: the survivor that
 * motivated this rule was "[Extended thinking: ...]", which a lowercase-only match missed.
 */
const RETIRED_PHRASES = [
  'extended thinking',
  'ULTRATHINK BY DEFAULT',
  'ULTRATHINK',
  'spawn agents anyway',
  'thinking.budget_tokens',
  'budget_tokens:',
];

/**
 * A line that names the retirement is documenting it, not instructing with it — a
 * "retired phrases" list, or a pointer at the migration guide. Fenced blocks get the
 * same pass: they quote the old wording rather than tell the model to use it.
 */
const DOCUMENTS_RETIREMENT = /\bretired\b|opus-\d+-migration\.md/i;
const FENCE = /^\s*(?:```|~~~)/;

/** Words that follow a bare "specweave" in prose, not a subcommand. */
const PROSE_AFTER_SPECWEAVE = new Set([
  'cli', 'command', 'commands', 'project', 'projects', 'workspace', 'increment',
  'increments', 'plugin', 'is', 'as', 'on', 'in', 'to', 'and', 'or', 'with',
  'without', 'from', 'for', 'the', 'a', 'an', 'when', 'if', 'itself', 'core',
  'binary', 'repo', 'root', 'skills', 'skill', 'state', 'config', 'v2', 'owns',
]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/** Commands registered in bin/specweave.js, including `.alias()` names. */
export function readRegisteredCommands(root = REPO_ROOT) {
  const bin = path.join(root, 'bin', 'specweave.js');
  const names = new Set(BUILTIN_COMMANDS);
  let src = '';
  try {
    src = fs.readdirSync(path.dirname(bin)).filter(name => name.endsWith('.js')).map(name => fs.readFileSync(path.join(path.dirname(bin), name), 'utf8')).join('\n');
  } catch {
    return names;
  }
  for (const m of src.matchAll(/\.command\(\s*'([a-z][a-z0-9:-]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/\.alias\(\s*'([a-z][a-z0-9:-]*)'/g)) names.add(m[1]);
  return names;
}

/** Skill names that `sw:<name>` may resolve to. */
export function readShippedSkills(root = REPO_ROOT) {
  const names = new Set();
  const dir = path.join(root, PLUGIN_SKILLS);
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) names.add(e.name);
    }
  } catch {
    /* no plugin skills — every sw: reference will be reported */
  }
  try {
    for (const e of fs.readdirSync(path.join(root, PLUGIN_AGENTS), { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith('.md')) names.add(e.name.replace(/\.md$/, ''));
    }
  } catch {
    /* no agents dir */
  }
  return names;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!m) return null;
  const keys = new Map();
  let lineNo = 1; // frontmatter opens on line 1
  for (const raw of m[1].split(/\r?\n/)) {
    lineNo++;
    const km = raw.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (km && !keys.has(km[1])) keys.set(km[1], { value: km[2].trim(), line: lineNo });
  }
  return keys;
}

/**
 * Lint one markdown file's content.
 * @returns {{file: string, errors: Array<{line: number, rule: string, message: string}>}}
 */
export function lintContent(relPath, content, { commands, skills, isSkillFile }) {
  const errors = [];
  const add = (line, rule, message) => errors.push({ line, rule, message });
  const lines = content.split(/\r?\n/);

  if (isSkillFile) {
    const fm = parseFrontmatter(content);
    if (!fm) {
      add(1, 'frontmatter', 'SKILL.md has no YAML frontmatter block');
    } else {
      for (const key of FORBIDDEN_KEYS) {
        const hit = fm.get(key);
        if (hit) {
          add(
            hit.line,
            'forbidden-key',
            key === 'name'
              ? `remove "name:" — the directory name is the skill name`
              : `remove "${key}:" — pins keep other tools and weaker models from running this skill`,
          );
        }
      }
      const desc = fm.get('description');
      if (!desc || !desc.value) add(1, 'description', 'missing "description:" frontmatter');
      else if (desc.value.length > MAX_DESCRIPTION) {
        add(
          desc.line,
          'description-length',
          `description is ${desc.value.length} chars (max ${MAX_DESCRIPTION}) — it is loaded into every session`,
        );
      }
    }

    const allowedTools = lines.findIndex((l) => /^allowed-tools\s*:/.test(l));
    const hasRationale =
      /^##\s*Tool-Use Rationale/m.test(content) || /^tool-use-rationale\s*:/m.test(content);
    if (allowedTools !== -1 && !hasRationale) {
      add(
        allowedTools + 1,
        'tool-use-rationale',
        `SKILL.md declares allowed-tools but has no ## Tool-Use Rationale section (or tool-use-rationale frontmatter key). See skill-authoring-guide.md "Documenting Tool Use".`,
      );
    }
  }

  let inFence = false;
  lines.forEach((line, i) => {
    const fenceLine = FENCE.test(line);
    if (fenceLine) inFence = !inFence;
    if (!fenceLine && !inFence && !DOCUMENTS_RETIREMENT.test(line)) {
      const lower = line.toLowerCase();
      const hits = RETIRED_PHRASES.filter((p) => lower.includes(p.toLowerCase()));
      for (const phrase of hits) {
        // "ULTRATHINK BY DEFAULT" also matches "ULTRATHINK" — report the most specific hit only.
        if (hits.some((other) => other !== phrase && other.toLowerCase().includes(phrase.toLowerCase()))) continue;
        add(
          i + 1,
          'retired-phrase',
          `Retired phrase "${phrase}" found — see .specweave/docs/internal/specs/opus-47-migration.md`,
        );
      }
    }
    for (const m of line.matchAll(/\bspecweave\s+([a-z][a-z0-9-]*)/g)) {
      const cmd = m[1];
      if (PROSE_AFTER_SPECWEAVE.has(cmd)) continue;
      if (!commands.has(cmd)) {
        add(i + 1, 'unknown-cli', `\`specweave ${cmd}\` is not registered in bin/specweave.js`);
      }
    }
    for (const m of line.matchAll(/\bsw:([a-z][a-z0-9-]*)/g)) {
      const name = m[1];
      if (!skills.has(name)) {
        add(i + 1, 'unknown-skill', `\`sw:${name}\` has no plugins/specweave/skills/${name}/`);
      }
    }
  });

  return { file: relPath, errors };
}

/** Files this linter owns. */
export function collectFiles(root = REPO_ROOT) {
  const files = [];
  for (const rel of [
    PLUGIN_SKILLS,
    PLUGIN_AGENTS,
    path.join('plugins', 'specweave', 'reference'),
    path.join('plugins', 'specweave', 'defaults'),
    path.join('skills'),
    path.join('skills-optional'),
  ]) {
    for (const abs of walk(path.join(root, rel))) files.push(path.relative(root, abs));
  }
  for (const rel of [
    path.join('plugins', 'specweave', 'PLUGIN.md'),
    path.join('plugins', 'PLUGINS-INDEX.md'),
  ]) {
    if (fs.existsSync(path.join(root, rel))) files.push(rel);
  }
  return files;
}

export function lintRepo(root = REPO_ROOT) {
  const commands = readRegisteredCommands(root);
  const skills = readShippedSkills(root);
  const results = [];
  for (const rel of collectFiles(root)) {
    const content = fs.readFileSync(path.join(root, rel), 'utf8');
    const isSkillFile = path.basename(rel) === 'SKILL.md';
    results.push(lintContent(rel, content, { commands, skills, isSkillFile }));
  }
  const errorCount = results.reduce((n, r) => n + r.errors.length, 0);
  return { results, errorCount, commandCount: commands.size, skillCount: skills.size };
}

function main() {
  const json = process.argv.includes('--json');
  const report = lintRepo();
  if (json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    for (const r of report.results) {
      for (const e of r.errors) {
        console.error(`${r.file}:${e.line}  [${e.rule}] ${e.message}`);
      }
    }
    const files = report.results.length;
    if (report.errorCount === 0) console.log(`lint-skills: ${files} files clean`);
    else console.error(`\nlint-skills: ${report.errorCount} error(s) in ${files} files`);
  }
  process.exit(report.errorCount === 0 ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
