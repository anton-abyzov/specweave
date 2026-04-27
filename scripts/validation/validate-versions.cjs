#!/usr/bin/env node
/**
 * Three-way Version Alignment Lint
 *
 * Enforces that the SAME version string appears in:
 *   - package.json                                     (npm package version)
 *   - .claude-plugin/marketplace.json (top + plugin)   (marketplace listing)
 *   - plugins/specweave/.claude-plugin/plugin.json     (plugin manifest)
 *
 * Why: Claude Code reads plugin.json for "installed_plugins.json" version,
 * marketplace.json for "available updates", and package.json is what npm
 * publishes. If any of these drift the user is silently pinned (see
 * increment 0794-plugin-update-visibility-foundation, ADR 0794-01).
 *
 * Usage:
 *   node scripts/validation/validate-versions.cjs
 *   npm run validate:versions
 *
 * Exit codes:
 *   0 - all four version locations match
 *   1 - drift detected (prints unified diff-style report)
 *   2 - one of the files is missing or malformed
 */

const fs = require('fs');
const path = require('path');

// Resolve repo root from this script's location: scripts/validation/ → ../..
const repoRoot = path.resolve(__dirname, '..', '..');

const targets = [
  {
    label: 'package.json',
    file: path.join(repoRoot, 'package.json'),
    pointer: ['version'],
  },
  {
    label: 'marketplace.json (root)',
    file: path.join(repoRoot, '.claude-plugin', 'marketplace.json'),
    pointer: ['version'],
  },
  {
    label: 'marketplace.json (plugins[0])',
    file: path.join(repoRoot, '.claude-plugin', 'marketplace.json'),
    pointer: ['plugins', 0, 'version'],
  },
  {
    label: 'plugins/specweave/.claude-plugin/plugin.json',
    file: path.join(repoRoot, 'plugins', 'specweave', '.claude-plugin', 'plugin.json'),
    pointer: ['version'],
  },
];

function readPointer(json, pointer) {
  let cur = json;
  for (const key of pointer) {
    if (cur == null) return undefined;
    cur = cur[key];
  }
  return cur;
}

function loadVersions() {
  const results = [];
  for (const t of targets) {
    if (!fs.existsSync(t.file)) {
      console.error(`⛔ ${t.label}: file not found at ${t.file}`);
      process.exit(2);
    }
    let data;
    try {
      data = JSON.parse(fs.readFileSync(t.file, 'utf8'));
    } catch (err) {
      console.error(`⛔ ${t.label}: invalid JSON — ${err.message}`);
      process.exit(2);
    }
    const value = readPointer(data, t.pointer);
    if (typeof value !== 'string' || value.length === 0) {
      console.error(`⛔ ${t.label}: missing version at ${t.pointer.join('.')}`);
      process.exit(2);
    }
    results.push({ ...t, version: value });
  }
  return results;
}

function main() {
  console.log('🔍 Validating version alignment across plugin manifests...\n');

  const rows = loadVersions();
  const unique = new Set(rows.map(r => r.version));
  const longestLabel = rows.reduce((m, r) => Math.max(m, r.label.length), 0);

  for (const row of rows) {
    const pad = ' '.repeat(longestLabel - row.label.length);
    const tag = unique.size === 1 ? '✅' : (rows[0].version === row.version ? '✅' : '⛔');
    console.log(`  ${tag} ${row.label}${pad}  ${row.version}`);
  }

  console.log('');

  if (unique.size === 1) {
    console.log(`✅ All four version locations aligned at ${rows[0].version}`);
    process.exit(0);
  }

  console.error('⛔ Version drift detected!');
  console.error('   Found versions: ' + Array.from(unique).map(v => `"${v}"`).join(', '));
  console.error('');
  console.error('Fix: run `bash scripts/build/bump-version.sh patch` to align all four,');
  console.error('     or manually edit the offending file(s) to match package.json.');
  console.error('');
  console.error('Background: ADR 0794-01 (three-way version lockstep with CI lint).');
  process.exit(1);
}

main();
