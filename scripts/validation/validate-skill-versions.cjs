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
 * A deprecated skill marks itself with flat string keys next to the version
 * (increment 1486): `deprecated: "true"`, `deprecated-message`, `replaced-by`
 * (`none`, `mcp:<server>[:tool]` or `<owner>/<repo>/<skill>`) and
 * `deprecated-since` (SemVer). When any is present they are checked; a skill
 * without them is checked exactly as before.
 *
 * Usage:
 *   node scripts/validation/validate-skill-versions.cjs
 *   npm run validate:skill-versions
 *
 * Exit codes:
 *   0 - every SKILL.md has a metadata.version field (and valid deprecation keys)
 *   1 - one or more SKILL.md files fail (lists offenders)
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
  return deprecationProblem(metadata, doc);
}

const DEPRECATION_KEYS = ['deprecated', 'deprecated-message', 'replaced-by', 'deprecated-since'];
const ID = '[A-Za-z0-9][A-Za-z0-9._-]*';
const REPLACED_BY_RE = new RegExp(`^(none|mcp:${ID}(:${ID})?|${ID}/${ID}/${ID})$`);

/**
 * Why the deprecation keys under `metadata` are wrong, or null when none is
 * present or all are valid flat strings. `metadata` is the parsed mapping; `doc`
 * (optional) the YAML document, used to refuse flow-style metadata, which the
 * vskill and platform line parsers do not read (1486 D-04).
 */
function deprecationProblem(metadata, doc) {
  const present = DEPRECATION_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(metadata, k));
  if (present.length === 0) return null;
  const node = doc && doc.get('metadata', true);
  if (node && node.flow) return 'flow-style metadata with deprecation keys: write metadata as a block mapping';
  for (const k of present) {
    const v = metadata[k];
    if (v !== null && typeof v === 'object') return `metadata.${k} is nested: write it as one flat string`;
    if (typeof v === 'boolean') return `metadata.${k} is a YAML boolean: quote it ("${v}")`;
    if (typeof v !== 'string') return `metadata.${k} must be a string: quote it`;
  }
  const deprecated = metadata.deprecated;
  if (deprecated !== undefined && deprecated !== 'true' && deprecated !== 'false') {
    return `metadata.deprecated must be "true" or "false", not "${deprecated}"`;
  }
  if (deprecated === 'true' && (metadata['deprecated-message'] ?? '').trim() === '') {
    return 'metadata.deprecated is "true" but metadata.deprecated-message is missing or empty';
  }
  const replacedBy = metadata['replaced-by'];
  if (replacedBy !== undefined && !REPLACED_BY_RE.test(replacedBy)) {
    return `metadata.replaced-by "${replacedBy}" is not none, mcp:<server>[:tool] or <owner>/<repo>/<skill>`;
  }
  const since = metadata['deprecated-since'];
  if (since !== undefined && !SEMVER_RE.test(since)) return `non-SemVer metadata.deprecated-since "${since}"`;
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

module.exports = { versionProblem, deprecationProblem };

if (require.main === module) main();
