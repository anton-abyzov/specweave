#!/usr/bin/env node
/**
 * Skill Version Frontmatter Lint
 *
 * Enforces that every SKILL.md under plugins/specweave/skills and skills-optional carries a SemVer
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
const YAML = require('yaml');

const repoRoot = path.resolve(__dirname, '..', '..');
const pluginDir = path.join(repoRoot, 'plugins', 'specweave');
const skillDirs = [path.join(pluginDir, 'skills'), path.join(pluginDir, 'skills-optional')];

const SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/**
 * Why a SKILL.md's frontmatter fails the rule, or null when it carries a SemVer
 * `metadata.version` directly under a `metadata` mapping. Parsed as YAML, so
 * duplicate keys, a nested `metadata.x.version` and a non-mapping `metadata`
 * are refused.
 */
function versionProblem(content) {
  const fmMatch = content.match(FM_RE);
  if (!fmMatch) return 'no frontmatter block';
  const doc = YAML.parseDocument(fmMatch[1], { uniqueKeys: true });
  if (doc.errors.length > 0) return `frontmatter is not valid YAML: ${doc.errors[0].message.split('\n')[0]}`;
  const data = doc.toJS();
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'frontmatter is not a mapping';
  if (Object.prototype.hasOwnProperty.call(data, 'version')) return 'top-level version: move it under metadata:';
  const metadata = data.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 'no metadata mapping';
  if (typeof metadata.version !== 'string') return 'no metadata.version string';
  if (!SEMVER_RE.test(metadata.version)) return `non-SemVer metadata.version "${metadata.version}"`;
  return null;
}

function main() {
  if (!fs.existsSync(skillDirs[0])) {
    console.error(`⛔ Skills directory not found: ${skillDirs[0]}`);
    process.exit(2);
  }

  const offenders = [];
  let total = 0;
  for (const dir of skillDirs.filter((d) => fs.existsSync(d))) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(dir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      total++;
      const reason = versionProblem(fs.readFileSync(skillFile, 'utf8'));
      if (reason) offenders.push({ skill: path.relative(pluginDir, path.dirname(skillFile)), reason });
    }
  }

  console.log(`🔍 Validating skill version frontmatter (${total} skills)...\n`);

  if (offenders.length === 0) {
    console.log(`✅ All ${total} skills have a metadata.version field.`);
    process.exit(0);
  }

  console.error(`⛔ ${offenders.length} skill(s) fail the version rule:`);
  for (const o of offenders) console.error(`   - ${o.skill}: ${o.reason}`);
  console.error('\nFix: in skills/sw-<name>/SKILL.md (the source) write');
  console.error('     metadata:\n       version: "X.Y.Z"\n     then run npm run generate:skills.');
  console.error('\nBackground: ADR 0794-01 (per-skill version frontmatter).');
  process.exit(1);
}

module.exports = { versionProblem };

if (require.main === module) main();
