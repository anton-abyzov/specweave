#!/usr/bin/env node
/**
 * One-shot: Add `version: 1.0.0` to every SKILL.md missing it.
 *
 * Inserts the version line immediately after `description:` in frontmatter
 * when present, otherwise appends to the frontmatter block. Idempotent:
 * files that already have `version:` at the top level are skipped.
 *
 * Usage:
 *   node scripts/build/stamp-skill-versions.cjs              # dry run
 *   node scripts/build/stamp-skill-versions.cjs --write      # write changes
 *
 * Increment 0794 — US-003 / T-014.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const skillsDir = path.join(repoRoot, 'plugins', 'specweave', 'skills');
const DEFAULT_VERSION = '1.0.0';
const writeMode = process.argv.includes('--write');

function listSkillMdFiles() {
  if (!fs.existsSync(skillsDir)) {
    console.error(`Skills directory not found: ${skillsDir}`);
    process.exit(2);
  }
  const out = [];
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(skillsDir, entry.name, 'SKILL.md');
    if (fs.existsSync(candidate)) out.push(candidate);
  }
  return out.sort();
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

function hasTopLevelVersion(frontmatter) {
  return /^version:\s*\S+/m.test(frontmatter);
}

function insertVersion(content, newVersion) {
  const match = content.match(FM_RE);
  if (!match) {
    // No frontmatter at all — synthesize one.
    return `---\nversion: ${newVersion}\n---\n${content}`;
  }
  const fm = match[1];
  if (hasTopLevelVersion(fm)) {
    return content; // idempotent
  }

  const lines = fm.split(/\r?\n/);
  const descIdx = lines.findIndex(line => /^description:\s*/.test(line));

  let updatedLines;
  if (descIdx >= 0) {
    // Insert after description: handling YAML folded/literal block continuations
    // (lines starting with whitespace belong to the previous key)
    let insertAt = descIdx + 1;
    while (insertAt < lines.length && /^\s+\S/.test(lines[insertAt])) insertAt++;
    updatedLines = [...lines.slice(0, insertAt), `version: ${newVersion}`, ...lines.slice(insertAt)];
  } else {
    updatedLines = [...lines, `version: ${newVersion}`];
  }

  const newFm = updatedLines.join('\n');
  return content.replace(FM_RE, `---\n${newFm}\n---\n`);
}

function main() {
  const files = listSkillMdFiles();
  let updated = 0;
  let skipped = 0;
  const changes = [];

  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8');
    const after = insertVersion(before, DEFAULT_VERSION);
    if (after === before) {
      skipped++;
      continue;
    }
    updated++;
    changes.push(file);
    if (writeMode) {
      fs.writeFileSync(file, after);
    }
  }

  console.log('SKILL.md version stamping');
  console.log('═'.repeat(60));
  console.log(`Total SKILL.md files: ${files.length}`);
  console.log(`Already had version:  ${skipped}`);
  console.log(`Would stamp:          ${updated}`);
  console.log(`Mode:                 ${writeMode ? 'WRITE' : 'DRY RUN'}`);
  console.log('═'.repeat(60));

  if (changes.length > 0 && !writeMode) {
    console.log('\nFiles that would change (first 10):');
    for (const f of changes.slice(0, 10)) {
      console.log('  ' + path.relative(repoRoot, f));
    }
    if (changes.length > 10) console.log(`  ... and ${changes.length - 10} more`);
    console.log('\nRun again with --write to apply.');
  }

  if (writeMode && changes.length > 0) {
    console.log('\n✅ Wrote version frontmatter to ' + changes.length + ' files.');
  }
}

main();
