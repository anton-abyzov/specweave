#!/usr/bin/env node
/**
 * Stamp the package.json version into the Claude Code plugin manifest +
 * marketplace catalog so they never drift from the published npm version.
 *
 * Why: Claude Code reads `plugins/specweave/.claude-plugin/plugin.json` for the
 * installed-plugin version and `.claude-plugin/marketplace.json` for available
 * updates. If either freezes behind package.json, `claude plugin install` /
 * `specweave refresh-plugins` version-dedup and SILENTLY skip refreshing the
 * user's plugin cache — shipping stale hooks/skills even after a successful
 * publish. (See increments 0794 + 0871; validated by validate-versions.cjs.)
 *
 * This is the single source of truth for the version stamp, called from the
 * `build` + `version` npm lifecycle (so every publish path stamps) and from
 * scripts/build/bump-version.sh.
 *
 * Usage:
 *   node scripts/build/stamp-plugin-version.cjs          # stamp (idempotent)
 *   node scripts/build/stamp-plugin-version.cjs --check   # exit 1 if any drift, write nothing
 *
 * NB: `plugins/specweave/marketplace.json` is a SEPARATE skill-catalog schema
 * (its own version) and is intentionally NOT stamped.
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const checkOnly = process.argv.includes('--check');

const version = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
).version;

/** Each target: a JSON file + a pointer path to a version string. */
const targets = [
  { file: 'plugins/specweave/.claude-plugin/plugin.json', pointer: ['version'] },
  { file: '.claude-plugin/marketplace.json', pointer: ['version'] },
  { file: '.claude-plugin/marketplace.json', pointer: ['plugins', 0, 'version'] },
];

let drift = 0;
// Group writes per file so multiple pointers in one file are written once.
const fileCache = new Map();

function load(rel) {
  if (!fileCache.has(rel)) {
    const abs = path.join(repoRoot, rel);
    fileCache.set(rel, fs.existsSync(abs) ? JSON.parse(fs.readFileSync(abs, 'utf8')) : null);
  }
  return fileCache.get(rel);
}

for (const t of targets) {
  const json = load(t.file);
  if (json == null) continue; // missing file → skip (idempotent)
  let cur = json;
  for (let i = 0; i < t.pointer.length - 1; i++) {
    if (cur == null) break;
    cur = cur[t.pointer[i]];
  }
  if (cur == null) continue;
  const lastKey = t.pointer[t.pointer.length - 1];
  if (cur[lastKey] !== version) {
    drift++;
    if (!checkOnly) {
      cur[lastKey] = version;
      console.log(`  stamped ${t.file} (${t.pointer.join('.')}) -> ${version}`);
    } else {
      console.error(`  DRIFT ${t.file} (${t.pointer.join('.')}) = ${cur[lastKey]}, expected ${version}`);
    }
  }
}

if (checkOnly) {
  if (drift > 0) {
    console.error(`✖ ${drift} version drift(s) vs package.json ${version}`);
    process.exit(1);
  }
  console.log(`✓ plugin/marketplace versions aligned at ${version}`);
  process.exit(0);
}

// Write each touched file once.
for (const [rel, json] of fileCache) {
  if (json == null) continue;
  fs.writeFileSync(path.join(repoRoot, rel), JSON.stringify(json, null, 2) + '\n');
}
if (drift === 0) console.log(`✓ plugin/marketplace versions already aligned at ${version}`);
