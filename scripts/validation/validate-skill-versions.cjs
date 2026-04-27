#!/usr/bin/env node
/**
 * Skill Version Frontmatter Lint
 *
 * Enforces that every plugins/specweave/skills/*\/SKILL.md has a
 * top-level `version:` field in its YAML frontmatter.
 *
 * Why: Without per-skill versions, the skill-currency check in
 * `specweave doctor` cannot tell users when an individual skill is
 * stale, even if the plugin bundle as a whole is current. See
 * increment 0794 (US-003) and ADR 0794-01.
 *
 * Usage:
 *   node scripts/validation/validate-skill-versions.cjs
 *   npm run validate:skill-versions
 *
 * Exit codes:
 *   0 - every SKILL.md has a version field
 *   1 - one or more SKILL.md files missing version (lists offenders)
 *   2 - skills directory missing
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const skillsDir = path.join(repoRoot, 'plugins', 'specweave', 'skills');

const SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
const VERSION_LINE_RE = /^version:\s*"?([^"\s]+)"?\s*$/m;

function main() {
  if (!fs.existsSync(skillsDir)) {
    console.error(`⛔ Skills directory not found: ${skillsDir}`);
    process.exit(2);
  }

  const offenders = [];
  const invalidSemver = [];
  let total = 0;

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    total++;

    const content = fs.readFileSync(skillFile, 'utf8');
    const fmMatch = content.match(FM_RE);
    if (!fmMatch) {
      offenders.push({ skill: entry.name, reason: 'no frontmatter block' });
      continue;
    }
    const versionMatch = fmMatch[1].match(VERSION_LINE_RE);
    if (!versionMatch) {
      offenders.push({ skill: entry.name, reason: 'no top-level version field' });
      continue;
    }
    const version = versionMatch[1];
    if (!SEMVER_RE.test(version)) {
      invalidSemver.push({ skill: entry.name, version });
    }
  }

  console.log(`🔍 Validating skill version frontmatter (${total} skills)...\n`);

  if (offenders.length === 0 && invalidSemver.length === 0) {
    console.log(`✅ All ${total} skills have a version field.`);
    process.exit(0);
  }

  if (offenders.length > 0) {
    console.error(`⛔ ${offenders.length} skill(s) missing version frontmatter:`);
    for (const o of offenders) console.error(`   - ${o.skill}: ${o.reason}`);
  }
  if (invalidSemver.length > 0) {
    console.error(`\n⛔ ${invalidSemver.length} skill(s) have a non-SemVer version:`);
    for (const o of invalidSemver) console.error(`   - ${o.skill}: "${o.version}"`);
  }

  console.error('\nFix: run `node scripts/build/stamp-skill-versions.cjs --write`');
  console.error('     (one-shot; sets missing versions to 1.0.0)');
  console.error('     or edit the offending SKILL.md frontmatter manually.');
  console.error('\nBackground: ADR 0794-01 (per-skill version frontmatter).');
  process.exit(1);
}

main();
