import { readFileSync, writeFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
const date = new Date().toISOString().split('T')[0];
let existing = '';
try { existing = readFileSync('CHANGELOG.md', 'utf8'); } catch {}
const heading = `## [${version}] - ${date}`;
// Notes accumulated under a leading "## [Unreleased]" heading become this
// release's entry; otherwise prepend a placeholder entry as before.
const unreleased = /^## \[Unreleased\][^\n]*\n/;
const next = unreleased.test(existing)
  ? existing.replace(unreleased, `${heading}\n`)
  : `${heading}\n\n- Patch release\n\n${existing}`;
writeFileSync('CHANGELOG.md', next);
