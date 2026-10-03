/**
 * A person's handoff survives `specweave handoff`: a hand-written handoff.md
 * (no generator marker) is left alone and the generated doc goes to
 * handoff.auto.md; a `<!-- keep -->` block survives regeneration.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildWorkHandoff, AUTO_HANDOFF_FILE } from '../../../../src/core/session/work-handoff.js';
import { buildPickup } from '../../../../src/core/session/pickup.js';
import { extractKeepBlocks, DOC_FORMAT_MARKER } from '../../../../src/core/session/handoff-doc-format.js';

let root: string;
let inc: string;

beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-handoff-keep-')));
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  inc = path.join(root, '.specweave', 'increments', '0780-cutover');
  fs.mkdirSync(inc, { recursive: true });
  fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ id: '0780-cutover', status: 'active' }));
  fs.writeFileSync(path.join(inc, 'spec.md'), '# Cutover\n\n## Tasks\n\n### T-01 Gate\n- AC: AC-01 | Files: a | Test: true\n');
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('extractKeepBlocks', () => {
  it('returns every keep block with its markers', () => {
    expect(extractKeepBlocks('a\n<!-- keep -->\nX\n<!-- /keep -->\nb\n<!--keep-->Y<!-- /keep -->')).toEqual([
      '<!-- keep -->\nX\n<!-- /keep -->',
      '<!--keep-->Y<!-- /keep -->',
    ]);
    expect(extractKeepBlocks('no blocks')).toEqual([]);
  });
});

describe('handoff never overwrites a hand-written handoff.md', () => {
  it('writes handoff.auto.md beside a handoff.md that lacks the generator marker', async () => {
    const mine = '# 0780 runbook pointer\nWaits on: Anton typed go\n';
    fs.writeFileSync(path.join(inc, 'handoff.md'), mine);
    const res = await buildWorkHandoff(root, { incrementId: '0780', push: false, agent: 'claude@mbp', reason: 'switching' });
    expect(path.basename(res.docPath)).toBe(AUTO_HANDOFF_FILE);
    expect(fs.readFileSync(path.join(inc, 'handoff.md'), 'utf8')).toBe(mine);
    expect(fs.readFileSync(path.join(inc, AUTO_HANDOFF_FILE), 'utf8')).toContain(DOC_FORMAT_MARKER);
    expect(buildPickup(root, { agent: 'codex@mbp' }).text).toContain(
      'Last handoff: claude@mbp 0m ago: switching → .specweave/increments/0780-cutover/handoff.md + .specweave/increments/0780-cutover/handoff.auto.md',
    );
  });

  it('overwrites its own generated handoff.md as before', async () => {
    const first = await buildWorkHandoff(root, { incrementId: '0780', push: false, agent: 'claude@mbp' });
    expect(path.basename(first.docPath)).toBe('handoff.md');
    const second = await buildWorkHandoff(root, { incrementId: '0780', push: false, agent: 'claude@mbp', reason: 'again' });
    expect(path.basename(second.docPath)).toBe('handoff.md');
    expect(fs.existsSync(path.join(inc, AUTO_HANDOFF_FILE))).toBe(false);
  });

  it('carries a keep block into the regenerated doc', async () => {
    const first = await buildWorkHandoff(root, { incrementId: '0780', push: false, agent: 'claude@mbp' });
    const block = '<!-- keep -->\nNever touch GKE without a typed go.\n<!-- /keep -->';
    fs.writeFileSync(first.docPath, fs.readFileSync(first.docPath, 'utf8').replace('## Where I left off', `${block}\n\n## Where I left off`));
    await buildWorkHandoff(root, { incrementId: '0780', push: false, agent: 'claude@mbp', reason: 'second' });
    const doc = fs.readFileSync(first.docPath, 'utf8');
    expect(doc).toContain(block);
    expect(doc).toContain('Why: second');
    expect(doc.split(block).length).toBe(2); // once, not duplicated
  });
});
