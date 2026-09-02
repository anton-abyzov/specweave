#!/usr/bin/env node
// Supply-chain payload scanner (zero dependencies).
//
// Detects the July-2026 injection class that poisoned build/test/config
// scripts in this repository family: a single line made of the file's real
// last statement + ~2000 spaces + kilobytes of obfuscated JS, plus a
// `const require = createRequire(import.meta.url)` shim in test files.
//
// Usage:
//   node scripts/security/scan-payload.mjs [--root <dir>] [--allowlist <file>] [--self-test] [--quiet]
//
// Exit code 1 on any finding. Findings print as: FAIL [check] file:line: excerpt
//
// Checks (ids used in scripts/security/scan-allowlist.txt):
//   padded-line   line matching /^[\s});]{0,6}\s{800,}\S/  (never allowlistable)
//   padded-inline 800+ consecutive spaces/tabs between two non-space chars (same
//                 payload after a longer last statement; allowlistable)
//   long-line     line longer than MAX_LINE chars
//   base64-blob   run of [A-Za-z0-9+/] >= 2000 chars
//   eval-decode   eval/Function applied to an atob(...) or Buffer.from(...) decode
//   test-require  createRequire(import.meta.url) inside a *.test.* / *.spec.* file
//
// Allowlist format (one per line, '#' comments):
//   <relative-path-or-glob>            all checks except padded-line
//   <relative-path-or-glob> check1,check2   only the listed checks
// Globs: '*' matches within a segment, '**' matches across segments,
// a trailing '/' allowlists a directory prefix.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAX_LINE = 5000;
export const SOURCE_EXT = new Set(['.js', '.ts', '.mjs', '.cjs', '.tsx', '.jsx', '.json', '.yml', '.yaml']);
export const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', '.open-next', 'coverage', '.git',
  '.docusaurus', '.wrangler', 'target', 'test-results', 'playwright-report', '.turbo', '.cache',
]);
export const SKIP_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock']);
export const SKIP_PATH_PREFIXES = ['docs-site/build/'];

const RE_PADDED = /^[\s});]{0,6}\s{800,}\S/;
const RE_PADDED_INLINE = /\S[ \t]{800,}\S/;
const RE_BASE64 = /[A-Za-z0-9+/]{2000,}/;
const RE_EVAL = /\b(?:eval|Function)\s*\(\s*atob\s*\(|\beval\s*\(\s*Buffer\s*\.\s*from\s*\(/;
const RE_CREATE_REQUIRE = /createRequire\s*\(\s*import\s*\.\s*meta\s*\.\s*url\s*\)/;
const RE_TEST_FILE = /\.(test|spec)\.[^/]+$/;

function toPosix(p) {
  return p.split(path.sep).join('/').replace(/\\/g, '/');
}

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++;
      } else {
        re += '[^/]*';
      }
    } else if ('.+?^${}()|[]\\'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  if (glob.endsWith('/')) re += '.*';
  return new RegExp('^' + re + '$');
}

export function parseAllowlist(text) {
  const rules = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [pattern, checks] = line.split(/\s+/);
    rules.push({
      pattern,
      re: globToRegExp(pattern.replace(/\\/g, '/')),
      checks: checks ? new Set(checks.split(',')) : null,
    });
  }
  return rules;
}

function isAllowed(rules, rel, check) {
  if (check === 'padded-line') return false;
  return rules.some((r) => r.re.test(rel) && (!r.checks || r.checks.has(check)));
}

function* walk(root, rel = '') {
  const abs = path.join(root, rel);
  let entries;
  try {
    entries = fs.readdirSync(abs, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      if (SKIP_PATH_PREFIXES.some((p) => (childRel + '/').startsWith(p))) continue;
      yield* walk(root, childRel);
    } else if (e.isFile()) {
      yield childRel;
    }
  }
}

function isSourceFile(rel) {
  const base = path.posix.basename(rel);
  if (SKIP_FILES.has(base)) return false;
  if (base.endsWith('.min.js') || base.endsWith('.map')) return false;
  return SOURCE_EXT.has(path.posix.extname(base));
}

function excerpt(line) {
  const trimmed = line.replace(/\s{4,}/g, (m) => `<${m.length} spaces>`);
  return trimmed.length > 120 ? trimmed.slice(0, 117) + '...' : trimmed;
}

export function scanFile(rel, content, rules) {
  const findings = [];
  const lines = content.split('\n');
  const testFile = RE_TEST_FILE.test(rel);
  const add = (check, idx, line) => {
    if (isAllowed(rules, rel, check)) return;
    findings.push({ check, file: rel, line: idx + 1, excerpt: excerpt(line) });
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '');
    if (RE_PADDED.test(line)) add('padded-line', i, line);
    else if (RE_PADDED_INLINE.test(line)) add('padded-inline', i, line);
    if (line.length > MAX_LINE) add('long-line', i, line);
    if (line.length >= 2000 && RE_BASE64.test(line)) add('base64-blob', i, line);
    if (RE_EVAL.test(line)) add('eval-decode', i, line);
    if (testFile && RE_CREATE_REQUIRE.test(line)) add('test-require', i, line);
  }
  return findings;
}

export function scan({ root, allowlistPath }) {
  root = path.resolve(root);
  let rules = [];
  if (allowlistPath && fs.existsSync(allowlistPath)) {
    rules = parseAllowlist(fs.readFileSync(allowlistPath, 'utf8'));
  }
  const findings = [];
  let scanned = 0;
  for (const rel of walk(root)) {
    const posixRel = toPosix(rel);
    if (!isSourceFile(posixRel)) continue;
    scanned++;
    let content;
    try {
      content = fs.readFileSync(path.join(root, rel), 'utf8');
    } catch {
      continue;
    }
    findings.push(...scanFile(posixRel, content, rules));
  }
  return { scanned, findings };
}

export function selfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-payload-'));
  const write = (rel, text) => {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
  };
  write('build.js', `});${' '.repeat(2000)}(function(){var a='x'})()\n`);
  write('vite.config.ts', `run().catch(console.error);${' '.repeat(2000)}(function(){var a='x'})()\n`);
  write('long.ts', `const s = "${'a-'.repeat(MAX_LINE)}";\n`);
  write('blob.json', `{"data":"${'A'.repeat(2100)}"}\n`);
  // Built by concatenation so this file never matches its own signature.
  write('cfg.cjs', `module.exports = ${'ev' + 'al'}(${'at' + 'ob'}("aGk="));\n`);
  write('x.test.ts', `import { createRequire } from 'module';\nconst require = createRequire(import.meta.url);\n`);
  write('node_modules/evil/index.js', `${' '.repeat(2000)}payload()\n`);
  write('clean.mjs', `export const ok = true;\n`);
  write('allow.txt', 'long.ts long-line\nblob.json\n');
  const { findings } = scan({ root: dir, allowlistPath: path.join(dir, 'allow.txt') });
  fs.rmSync(dir, { recursive: true, force: true });
  const got = new Set(findings.map((f) => `${f.check}:${f.file}`));
  const expected = ['padded-line:build.js', 'padded-inline:vite.config.ts', 'eval-decode:cfg.cjs', 'test-require:x.test.ts'];
  const missing = expected.filter((e) => !got.has(e));
  const extra = [...got].filter((g) => !expected.includes(g));
  if (missing.length || extra.length) {
    console.error(`self-test FAILED. missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`);
    return false;
  }
  console.log(`self-test OK (${expected.length} detections, allowlist + node_modules skip verified)`);
  return true;
}

function main(argv) {
  const args = { root: process.cwd(), allowlist: null, selfTest: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = argv[++i];
    else if (a === '--allowlist') args.allowlist = argv[++i];
    else if (a === '--self-test') args.selfTest = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a === '-h' || a === '--help') {
      console.log('usage: scan-payload.mjs [--root <dir>] [--allowlist <file>] [--self-test] [--quiet]');
      return 0;
    }
  }
  if (args.selfTest && !selfTest()) return 1;
  const allowlistPath = args.allowlist ?? path.join(path.resolve(args.root), 'scripts', 'security', 'scan-allowlist.txt');
  const { scanned, findings } = scan({ root: args.root, allowlistPath });
  for (const f of findings) {
    console.log(`FAIL [${f.check}] ${f.file}:${f.line}: ${f.excerpt}`);
  }
  if (findings.length) {
    console.error(`\nsupply-chain scan: ${findings.length} finding(s) in ${scanned} files. See scripts/security/scan-allowlist.txt for legitimate exceptions (padded-line is never allowlistable).`);
    return 1;
  }
  if (!args.quiet) console.log(`supply-chain scan: clean (${scanned} files)`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
