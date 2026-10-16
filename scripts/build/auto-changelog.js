import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
const date = new Date().toISOString().split('T')[0];
let existing = '';
try { existing = readFileSync('CHANGELOG.md', 'utf8'); } catch {}
const heading = `## [${version}] - ${date}`;

// What landed on the first-parent line since the last tag: squash subjects,
// and the PR title of each "Merge pull request" commit. Release merges and
// DORA metrics updates are left out. Empty when git or a tag is missing.
function landedSinceLastTag() {
  try {
    const git = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lastTag = git(['describe', '--tags', '--abbrev=0', 'HEAD']).trim();
    const log = git(['log', '--first-parent', '--format=%s%x1f%b%x1e', `${lastTag}..HEAD`]);
    const lines = [];
    for (const record of log.split('\x1e')) {
      const [subject = '', body = ''] = record.replace(/^\s+/, '').split('\x1f');
      if (!subject) continue;
      const merge = /^Merge pull request #(\d+) from /.exec(subject);
      const title = merge ? (body.split('\n').find((line) => line.trim()) ?? '').trim() : subject.trim();
      if (!title || /^Merge (branch|remote-tracking|pull request) /.test(title)) continue;
      if (/^Release v?\d/.test(title) || /^chore: update DORA metrics/.test(title)) continue;
      lines.push(`- ${title}${merge && !title.includes(`#${merge[1]}`) ? ` (#${merge[1]})` : ''}`);
    }
    return lines.slice(0, 40);
  } catch {
    return [];
  }
}

// Notes accumulated under a leading "## [Unreleased]" heading become this
// release's entry. Otherwise the entry lists what landed since the last tag.
// "- Patch release" is written only when nothing landed; release.yml refuses
// to publish an entry that still carries it.
const unreleased = /^## \[Unreleased\][^\n]*\n/;
let next;
if (unreleased.test(existing)) {
  next = existing.replace(unreleased, `${heading}\n`);
} else {
  const landed = landedSinceLastTag();
  next = landed.length
    ? `${heading}\n\n### Changed\n\n${landed.join('\n')}\n\n${existing}`
    : `${heading}\n\n- Patch release\n\n${existing}`;
}
writeFileSync('CHANGELOG.md', next);
