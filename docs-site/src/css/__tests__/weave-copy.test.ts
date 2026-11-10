import {describe, it, expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

// The Weave shell is shared with verified-skill.com as byte-identical copies.
// design/weave/ is the source; checksums.json records what both sites must carry.
// After editing the source: copy it here, update checksums.json, and do the same in vskill-platform.
const root = join(__dirname, '../../../..');
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const recorded = JSON.parse(readFileSync(join(root, 'design/weave/checksums.json'), 'utf8')) as Record<string, string>;

describe('Weave copies', () => {
  it.each(['weave.css', 'weave-shell.js'])('%s matches the design source and its recorded checksum', (file) => {
    expect(sha(join(root, 'design/weave', file))).toBe(recorded[file]);
    expect(sha(join(root, 'docs-site/src/css', file))).toBe(recorded[file]);
  });

  it('keeps the shell contract both sites build on', () => {
    const css = readFileSync(join(root, 'design/weave/weave.css'), 'utf8');
    for (const name of ['.wv-shell__inner', '.wv-shell-bar', '.wv-nav__brand', '.wv-nav__cluster', '.wv-control', '.wv-footer__inner', '.wv-display', '.wv-stage']) {
      expect(css).toContain(name);
    }
    expect(css).toMatch(/prefers-reduced-motion: no-preference\) \{\s*\.wv-family a\[aria-current\]::after/);
  });
});
