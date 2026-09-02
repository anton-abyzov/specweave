#!/usr/bin/env node
/**
 * Lint the repo-root `skills/` folder — the vskill-distributable standalone
 * SpecWeave core (sw-increment, sw-do, sw-task, sw-review, sw-handoff).
 *
 * These skills are installed into non-Claude tools, so they must stay portable:
 * no Claude-only tools or plugin command names, no PowerShell `>>` (it writes
 * UTF-16 with a BOM), both a CLI and a no-CLI form for every procedure, and a
 * frontmatter vskill accepts (description ≤ 200 chars; `name` is injected from
 * the directory at install time and must NOT be hard-coded).
 *
 * Zero dependencies. Usage: `node scripts/lint-standalone-skills.mjs [dir]`
 * Exit 0 = clean, 1 = findings printed to stderr.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_LINES = 150;
const MAX_DESCRIPTION = 200;

/** Claude-only surfaces that must never appear in a portable skill. */
const CLAUDE_ONLY = [
  [/\bSkill\(\s*\{/, 'Skill({ … }) tool call'],
  [/\bTask\(\s*\{/, 'Task({ … }) tool call'],
  [/\bAskUserQuestion\b/, 'AskUserQuestion tool'],
  [/\bTodoWrite\b/, 'TodoWrite tool'],
  [/\bWebFetch\b/, 'WebFetch tool'],
  [/\bmcp__/, 'MCP tool id'],
  [/CLAUDE_PLUGIN_ROOT/, 'CLAUDE_PLUGIN_ROOT'],
  [/\/sw:[a-z-]+/, 'Claude Code plugin command (/sw:…)'],
  [/^allowed-tools\s*:/m, 'allowed-tools frontmatter'],
];

/** Ledger event keys, in the order `formatLedgerLine` writes them. */
const LEDGER_KEY_ORDER = ['t', 'e', 'by', 'at', 'note', 'evidence'];
const LEDGER_EVENTS = new Set(['claim', 'done', 'release', 'block', 'skip']);

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return undefined;
  const fields = new Map();
  for (const line of m[1].split('\n')) {
    const f = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (f) fields.set(f[1], f[2].trim());
  }
  return { block: m[1], fields };
}

function unquote(v) {
  return v.replace(/^"([\s\S]*)"$/, '$1').replace(/^'([\s\S]*)'$/, '$1');
}

/** Fenced blocks as { lang, lines, start }. Handles ``` and ```` fences. */
function codeBlocks(lines) {
  const blocks = [];
  let open = null;
  lines.forEach((line, i) => {
    const fence = line.match(/^(`{3,})(.*)$/);
    if (!fence) return;
    if (open && fence[1].length >= open.fence.length && fence[2].trim() === '') {
      blocks.push({ lang: open.lang, lines: lines.slice(open.start, i), start: open.start });
      open = null;
    } else if (!open) {
      open = { fence: fence[1], lang: fence[2].trim(), start: i + 1 };
    }
  });
  if (open) blocks.push({ unterminated: true, lang: open.lang, lines: [], start: open.start });
  return blocks;
}

/** Every inline `{"t":…}` ledger example in the document (fenced or in prose). */
export function extractLedgerExamples(content) {
  return content.match(/\{"t":[^{}]*\}/g) ?? [];
}

export function lintSkill(dir) {
  const errors = [];
  const name = path.basename(dir);
  const file = path.join(dir, 'SKILL.md');
  const rel = path.relative(REPO_ROOT, file) || file;
  const add = (msg) => errors.push(`${rel}: ${msg}`);

  if (!fs.existsSync(file)) return [`${rel}: missing SKILL.md`];
  if (!/^sw-[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) add(`directory "${name}" must be kebab-case and start with "sw-"`);

  const content = fs.readFileSync(file, 'utf-8');
  if (content.startsWith('﻿')) add('starts with a UTF-8 BOM');
  if (content.includes('\r\n')) add('contains CRLF line endings');
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  if (lines.length > MAX_LINES) add(`${lines.length} lines (max ${MAX_LINES})`);

  const fm = parseFrontmatter(content);
  if (!fm) {
    add('missing YAML frontmatter');
  } else {
    const desc = fm.fields.get('description');
    if (!desc) add('frontmatter has no description');
    else if (unquote(desc).length > MAX_DESCRIPTION) add(`description is ${unquote(desc).length} chars (max ${MAX_DESCRIPTION})`);
    if (!fm.fields.has('argument-hint')) add('frontmatter has no argument-hint');
    if (fm.fields.has('name')) add('frontmatter must not pin `name:` (vskill injects the directory name)');
    for (const pinned of ['model', 'effort', 'context']) {
      if (fm.fields.has(pinned)) add(`frontmatter must not pin \`${pinned}:\``);
    }
  }

  for (const [re, label] of CLAUDE_ONLY) {
    if (re.test(content)) add(`references a Claude-only surface: ${label}`);
  }

  // Both paths must be documented.
  if (!/\bspecweave\s+[a-z-]+/.test(content)) add('no `specweave <cmd>` (CLI accelerator) form');
  if (!/manual path|no[- ]CLI/i.test(content)) add('no manual / no-CLI form');

  const blocks = codeBlocks(lines);
  for (const b of blocks) {
    if (b.unterminated) add(`unterminated code fence opened at line ${b.start}`);
    if (/^(powershell|pwsh|ps1)$/i.test(b.lang)) {
      b.lines.forEach((l, i) => {
        if (/(^|[^`>])>>?[^>=]/.test(l) && !l.includes('::')) {
          add(`PowerShell redirect on line ${b.start + i + 1} — use [IO.File]::AppendAllText / WriteAllText`);
        }
      });
    }
  }
  const hasPsBlock = blocks.some((b) => /^(powershell|pwsh|ps1)$/i.test(b.lang));
  if (hasPsBlock && !/\[IO\.File\]::(AppendAllText|WriteAllText)/.test(content)) {
    add('has a PowerShell block without the [IO.File]:: write form');
  }

  // Ledger examples must be real, foldable events with the canonical key order.
  for (const example of extractLedgerExamples(content)) {
    let obj;
    try {
      obj = JSON.parse(example);
    } catch {
      add(`ledger example is not valid JSON: ${example.slice(0, 60)}…`);
      continue;
    }
    const keys = Object.keys(obj);
    const expected = LEDGER_KEY_ORDER.filter((k) => keys.includes(k));
    if (keys.join(',') !== expected.join(',')) add(`ledger example key order ${keys.join(',')} != ${expected.join(',')}`);
    for (const required of ['t', 'e', 'by', 'at']) {
      if (!keys.includes(required)) add(`ledger example missing "${required}"`);
    }
    if (!LEDGER_EVENTS.has(obj.e)) add(`ledger example has unknown event "${obj.e}"`);
    const placeholder = (v) => typeof v === 'string' && /^<.*>$/.test(v);
    if (obj.at && !placeholder(obj.at) && Number.isNaN(Date.parse(obj.at))) {
      add(`ledger example has unparseable timestamp "${obj.at}"`);
    }
    if (obj.e === 'done' && !obj.evidence) add('ledger `done` example has no evidence');
    if ((obj.e === 'skip' || obj.e === 'block') && !obj.note) add(`ledger \`${obj.e}\` example has no note`);
  }

  return errors;
}

export function lintStandaloneSkills(skillsDir = path.join(REPO_ROOT, 'skills')) {
  const errors = [];
  if (!fs.existsSync(skillsDir)) return [`${skillsDir}: missing`];
  const dirs = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  if (dirs.length === 0) errors.push(`${skillsDir}: no skills`);

  const readmePath = path.join(skillsDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    errors.push('skills/README.md: missing');
  } else {
    const readme = fs.readFileSync(readmePath, 'utf-8');
    for (const d of dirs) {
      if (!readme.includes(`${d}/SKILL.md`)) errors.push(`skills/README.md: no link to ${d}/SKILL.md`);
      if (!readme.includes(`vskill install anton-abyzov/specweave/${d}`)) {
        errors.push(`skills/README.md: no install line for ${d} (expected \`vskill install anton-abyzov/specweave/${d}\`)`);
      }
    }
  }

  for (const d of dirs) errors.push(...lintSkill(path.join(skillsDir, d)));
  return errors;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const target = process.argv[2] ? path.resolve(process.argv[2]) : path.join(REPO_ROOT, 'skills');
  const errors = lintStandaloneSkills(target);
  if (errors.length) {
    console.error(`lint-standalone-skills: ${errors.length} problem(s)`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('lint-standalone-skills: OK');
}
