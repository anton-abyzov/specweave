#!/usr/bin/env node
/**
 * Documentation reference linter (zero-dependency).
 *
 * Fails when a documentation page names a skill, CLI command, plugin namespace
 * or config key that does not exist in this tree. The allowed sets are derived
 * from the source of truth, never hard-coded:
 *
 *   skills        plugins/specweave/skills/<name>/   → `sw:<name>` / `/sw:<name>`
 *   standalone    skills/<name>/                     → vskill-distributed skills
 *   CLI commands  bin/specweave.js `.command('…')`   → `specweave <name>`
 *   config keys   src/core/config/types.ts KNOWN_CONFIG_KEYS
 *   dead keys     src/core/config/migrate-to-2.ts DEAD_KEYS (must NOT appear)
 *
 * It also runs the MDX-hostile-syntax check: a bare `<` followed by a digit in
 * MDX prose is parsed as a JSX tag and silently breaks the Docusaurus build.
 *
 * Usage:
 *   node scripts/lint-docs-refs.mjs            # lint
 *   node scripts/lint-docs-refs.mjs --json     # machine-readable findings
 *   node scripts/lint-docs-refs.mjs --list     # print the derived allowed sets
 *
 * @module scripts/lint-docs-refs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Files exempt from the "must exist" rules. CHANGELOG.md is the historical
 * record: a 2.0 entry has to be able to name what 2.0 removed.
 */
const ALLOWLIST_FILES = new Set([
  'CHANGELOG.md',
  'docs-site/docs/reference/changelog.md',
]);

/** Literal strings allowed anywhere (they name themselves, not a live command). */
const ALLOWLIST_TOKENS = new Set([
  'specweave install',    // documented npm/global install prose
  'specweave uninstall',
]);

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

function dirsIn(rel) {
  if (!exists(rel)) return [];
  return fs
    .readdirSync(path.join(ROOT, rel), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/** Every command and sub-command registered on the commander program. */
function cliCommands() {
  const src = read('bin/specweave.js');
  const names = new Set();
  // A `.command('x')` whose next `.description(...)` starts with [REMOVED] is a
  // tombstone that only prints a migration message — not a documentable command.
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    const m = line.match(/\.command\(\s*'([^']+)'/);
    if (!m) return;
    const look = lines.slice(i + 1, i + 6).join('\n');
    const desc = look.match(/\.description\(\s*'([^']*)'/);
    if (desc && desc[1].startsWith('[REMOVED]')) return;
    names.add(m[1].split(/\s+/)[0]);
  });
  return names;
}

/** Top-level config keys the 2.0 loader accepts. */
function configKeys() {
  const src = read('src/core/config/types.ts');
  const block = src.match(/KNOWN_CONFIG_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  const keys = new Set();
  if (block) for (const m of block[1].matchAll(/'([^']+)'/g)) keys.add(m[1]);
  return keys;
}

/** 1.x config keys the migrator deletes — documenting them is a bug. */
function deadConfigKeys() {
  const src = read('src/core/config/migrate-to-2.ts');
  const keys = new Set();
  const block = src.match(/DEAD_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (block) for (const m of block[1].matchAll(/'([^']+)'/g)) keys.add(m[1]);
  for (const name of ['DEAD_HOOK_KEYS', 'DEAD_TESTING_KEYS']) {
    const b = src.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`));
    if (b) for (const m of b[1].matchAll(/'([^']+)'/g)) keys.add(m[1]);
  }
  return keys;
}

const SKILLS = new Set(dirsIn('plugins/specweave/skills'));
const STANDALONE = new Set(dirsIn('skills'));
const COMMANDS = cliCommands();
const CONFIG_KEYS = configKeys();
const DEAD_CONFIG_KEYS = deadConfigKeys();

/** Docs roots to lint. */
const TARGETS = ['docs-site/docs', 'README.md', 'CHANGELOG.md'];

function collectFiles() {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    const st = fs.statSync(abs);
    if (st.isFile()) {
      if (/\.mdx?$/.test(rel)) out.push(rel);
      return;
    }
    for (const e of fs.readdirSync(abs)) walk(path.posix.join(rel, e));
  };
  for (const t of TARGETS) walk(t);
  return out.sort();
}

/**
 * Split a page into prose lines and fenced-code lines. Both are linted for
 * references (a wrong command in a code block is worse), but only prose is
 * linted for MDX-hostile syntax.
 */
function classify(content) {
  const lines = content.split('\n');
  const inFence = new Array(lines.length).fill(false);
  const blockOf = new Array(lines.length).fill(-1);
  let fence = null;
  let block = -1;
  lines.forEach((line, i) => {
    const m = line.match(/^\s*(```+|~~~+)/);
    if (m) {
      if (fence && line.trim().startsWith(fence)) { fence = null; inFence[i] = true; blockOf[i] = block; return; }
      if (!fence) { fence = m[1]; block += 1; inFence[i] = true; blockOf[i] = block; return; }
    }
    inFence[i] = Boolean(fence);
    blockOf[i] = fence ? block : -1;
  });

  // A fenced block is "config-shaped" when it mentions .specweave or quotes a
  // key the 2.0 loader knows. Only those blocks are checked for dead config
  // keys — otherwise every third-party JSON sample (GitHub API "language", …)
  // trips the rule.
  const configBlock = new Set();
  const byBlock = new Map();
  lines.forEach((line, i) => {
    if (blockOf[i] < 0) return;
    byBlock.set(blockOf[i], (byBlock.get(blockOf[i]) ?? '') + line + '\n');
  });
  // The lead-in prose right above a fence counts too: "in `.specweave/config.json`:"
  const leadIn = new Map();
  lines.forEach((line, i) => {
    const id = blockOf[i];
    if (id < 0 || leadIn.has(id)) return;
    leadIn.set(id, lines.slice(Math.max(0, i - 4), i).join('\n'));
  });
  for (const [id, text] of byBlock) {
    const near = leadIn.get(id) ?? '';
    if (text.includes('.specweave') || near.includes('config.json') ||
        [...CONFIG_KEYS].some((k) => text.includes(`"${k}"`))) configBlock.add(id);
  }
  return { lines, inFence, blockOf, configBlock };
}

/** Strip inline code spans so `sw:foo` inside backticks is still checked but URLs are not. */
function stripLinks(line) {
  return line.replace(/https?:\/\/\S+/g, '').replace(/\]\([^)]*\)/g, ']()');
}

const findings = [];
function add(file, line, rule, message) {
  findings.push({ file, line, rule, message });
}

for (const file of collectFiles()) {
  const content = read(file);
  const { lines, inFence, blockOf, configBlock } = classify(content);
  const exempt = ALLOWLIST_FILES.has(file);

  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    const line = stripLinks(raw);

    // --- MDX-hostile syntax: a bare "<" followed by a digit in prose ---------
    // Only pages Docusaurus compiles as MDX; CHANGELOG.md is never rendered.
    if (!inFence[idx] && file.startsWith('docs-site/docs/')) {
      const prose = line.replace(/`[^`]*`/g, '');
      if (/<\d/.test(prose)) {
        add(file, lineNo, 'mdx-hostile', 'bare "<" before a digit in MDX prose — breaks the Docusaurus build (use &lt; or wrap in backticks)');
      }
    }

    if (exempt) return;

    // --- skill references ---------------------------------------------------
    for (const m of line.matchAll(/\/?\bsw:([a-z0-9][a-z0-9-]*)/gi)) {
      // `<!-- SW:BOARD -->` is a tasks.md marker, not a skill invocation.
      if (m[0].toUpperCase().endsWith('SW:BOARD')) continue;
      const name = m[1].toLowerCase();
      if (!SKILLS.has(name)) {
        add(file, lineNo, 'unknown-skill', `sw:${name} is not a skill in plugins/specweave/skills (have: ${[...SKILLS].join(', ')})`);
      }
    }

    // --- removed provider plugin namespaces ---------------------------------
    for (const m of line.matchAll(/\bsw-(github|jira|ado)\s*:\s*[a-z-]+/gi)) {
      add(file, lineNo, 'removed-namespace', `${m[0]} — the per-provider plugin namespaces were removed in 2.0; use sw:sync / specweave sync`);
    }

    // --- CLI commands -------------------------------------------------------
    for (const m of line.matchAll(/\bspecweave\s+([a-z][a-z0-9-]*)/g)) {
      const cmd = m[1];
      if (ALLOWLIST_TOKENS.has(`specweave ${cmd}`)) continue;
      if (!COMMANDS.has(cmd)) {
        add(file, lineNo, 'unknown-command', `\`specweave ${cmd}\` is not registered in bin/specweave.js`);
      }
    }

    // --- config keys --------------------------------------------------------
    const inConfigBlock = blockOf[idx] < 0 || configBlock.has(blockOf[idx]);
    for (const m of inConfigBlock ? line.matchAll(/"([A-Za-z][A-Za-z0-9_]*)"\s*:/g) : []) {
      const key = m[1];
      if (DEAD_CONFIG_KEYS.has(key) && !CONFIG_KEYS.has(key)) {
        add(file, lineNo, 'dead-config-key', `config key "${key}" was removed in 2.0 (see src/core/config/migrate-to-2.ts)`);
      }
    }
  });
}

if (process.argv.includes('--list')) {
  console.log(JSON.stringify({
    skills: [...SKILLS].sort(),
    standaloneSkills: [...STANDALONE].sort(),
    commands: [...COMMANDS].sort(),
    configKeys: [...CONFIG_KEYS].sort(),
    deadConfigKeys: [...DEAD_CONFIG_KEYS].sort(),
  }, null, 2));
  process.exit(0);
}

if (process.argv.includes('--json')) {
  fs.writeSync(1, JSON.stringify(findings, null, 2) + '\n');
  process.exitCode = findings.length ? 1 : 0;
}

else if (findings.length === 0) {
  console.log(`docs-refs: OK — ${collectFiles().length} pages, ${SKILLS.size} skills, ${COMMANDS.size} CLI commands.`);
} else {

  const byRule = new Map();
  for (const f of findings) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);

  let lastFile = '';
  for (const f of findings) {
    if (f.file !== lastFile) { console.log(`\n${f.file}`); lastFile = f.file; }
    console.log(`  ${String(f.line).padStart(5)}  ${f.rule.padEnd(18)} ${f.message}`);
  }
  console.log(`\ndocs-refs: ${findings.length} problem(s) in ${new Set(findings.map((f) => f.file)).size} file(s)`);
  for (const [rule, n] of [...byRule].sort((a, b) => b[1] - a[1])) console.log(`  ${rule}: ${n}`);
  process.exitCode = 1;
}
