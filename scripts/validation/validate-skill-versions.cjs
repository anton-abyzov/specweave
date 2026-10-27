#!/usr/bin/env node
/**
 * Skill Version Frontmatter Lint
 *
 * Enforces that every plugins/specweave/skills/*\/SKILL.md carries a SemVer
 * `metadata.version` in its YAML frontmatter. The Agent Skills spec
 * (agentskills.io/specification) allows only name, description, license,
 * compatibility, metadata and allowed-tools at the top level and keeps a
 * version under `metadata`; a top-level `version:` is refused by strict
 * validators (Claude.ai uploads, the Skills API). Increment 0794 (US-003)
 * added per-skill versions.
 *
 * Usage:
 *   node scripts/validation/validate-skill-versions.cjs
 *   npm run validate:skill-versions
 *
 * Exit codes:
 *   0 - every SKILL.md has a metadata.version field
 *   1 - one or more SKILL.md files missing it (lists offenders)
 *   2 - skills directory missing
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const skillsDir = path.join(repoRoot, 'plugins', 'specweave', 'skills');

const SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
/** `metadata:` followed by its indented lines; the version is one of them. */
const METADATA_BLOCK_RE = /^metadata:[ \t]*\r?\n((?:[ \t]+.*(?:\r?\n|$))*)/m;
const VERSION_LINE_RE = /^[ \t]+version:\s*"?([^"\s]+)"?\s*$/m;
const TOP_LEVEL_VERSION_RE = /^version\s*:/m;

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
    if (TOP_LEVEL_VERSION_RE.test(fmMatch[1])) {
      offenders.push({ skill: entry.name, reason: 'top-level version: move it under metadata:' });
      continue;
    }
    const metadata = fmMatch[1].match(METADATA_BLOCK_RE);
    const versionMatch = metadata ? metadata[1].match(VERSION_LINE_RE) : null;
    if (!versionMatch) {
      offenders.push({ skill: entry.name, reason: 'no metadata.version field' });
      continue;
    }
    const version = versionMatch[1];
    if (!SEMVER_RE.test(version)) {
      invalidSemver.push({ skill: entry.name, version });
    }
  }

  console.log(`🔍 Validating skill version frontmatter (${total} skills)...\n`);

  if (offenders.length === 0 && invalidSemver.length === 0) {
    console.log(`✅ All ${total} skills have a metadata.version field.`);
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

  console.error('\nFix: in skills/sw-<name>/SKILL.md (the source) write');
  console.error('     metadata:\n       version: "X.Y.Z"\n     then run npm run generate:skills.');
  console.error('     or edit the offending SKILL.md frontmatter manually.');
  console.error('\nBackground: ADR 0794-01 (per-skill version frontmatter).');
  process.exit(1);
}

main();
