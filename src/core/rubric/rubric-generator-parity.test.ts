/**
 * Parity tests for rubric generation (0865 T-002 / AC-US1-01, AC-US1-02).
 *
 * The generator must emit one blocking criterion per AC plus the 4 inherited
 * defaults (R-D01..R-D04). A parity test asserts criterion count == AC count + 4
 * so the rubric fails loudly on drift. ensureRubricFile must be idempotent
 * (no-clobber without --refresh, regenerate with --refresh).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fsp from 'fs/promises';
import { ensureRubricFile } from './rubric-generator.js';
import { parseRubric } from './rubric-parser.js';

function makeSpec(acCount: number): string {
  const lines: string[] = [
    '---',
    'increment: 0999-fixture',
    '---',
    '',
    '# Feature: Fixture',
    '',
    '### US-001: Story one',
    '',
    '**Acceptance Criteria**:',
  ];
  for (let i = 1; i <= acCount; i++) {
    const n = String(i).padStart(2, '0');
    lines.push(`- [ ] **AC-US1-${n}**: Criterion number ${i} holds.`);
  }
  return lines.join('\n');
}

describe('ensureRubricFile parity (0865 AC-US1-01/02)', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'rubric-parity-'));
  });

  afterEach(async () => {
    await fsp.rm(dir, { recursive: true, force: true });
  });

  it('TC-005: N ACs → root rubric.md non-template with exactly N+4 criteria (round-trips)', async () => {
    const N = 5;
    await fsp.writeFile(path.join(dir, 'spec.md'), makeSpec(N), 'utf-8');

    const result = await ensureRubricFile('0999-fixture', dir);
    expect(result.written).toBe(true);

    const rubricPath = path.join(dir, 'rubric.md');
    const content = await fsp.readFile(rubricPath, 'utf-8');

    // Not a template placeholder.
    expect(content).not.toMatch(/status:\s*template/);

    // Parser round-trips and yields exactly N + 4 criteria.
    const parsed = parseRubric(content);
    expect(parsed.criteria.length).toBe(N + 4);

    // Exactly N AC-tied blocking criteria + the 4 inherited defaults.
    const acTied = parsed.criteria.filter(c =>
      c.sourceACs.some(s => s.startsWith('AC-')),
    );
    expect(acTied.length).toBe(N);
    expect(acTied.every(c => c.severity === 'blocking')).toBe(true);
    // IDs are AC-derived: AC-US1-03 → R-US1-03.
    expect(acTied.every(c => /^R-US\d+-\d+$/.test(c.id))).toBe(true);

    const defaults = parsed.criteria.filter(c => /^R-D0\d$/.test(c.id));
    expect(defaults.length).toBe(4);
  });

  it('TC-006: no-clobber without --refresh; regenerate with --refresh', async () => {
    await fsp.writeFile(path.join(dir, 'spec.md'), makeSpec(2), 'utf-8');

    // Initial generation.
    const first = await ensureRubricFile('0999-fixture', dir);
    expect(first.written).toBe(true);

    // A user edits the rubric. A second run WITHOUT refresh must not clobber it.
    const rubricPath = path.join(dir, 'rubric.md');
    const edited = (await fsp.readFile(rubricPath, 'utf-8')) + '\n<!-- user edit -->\n';
    await fsp.writeFile(rubricPath, edited, 'utf-8');

    const second = await ensureRubricFile('0999-fixture', dir);
    expect(second.written).toBe(false);
    expect(second.skippedReason).toBe('exists-non-template');
    expect(await fsp.readFile(rubricPath, 'utf-8')).toContain('<!-- user edit -->');

    // Spec now has more ACs; --refresh regenerates from current ACs.
    await fsp.writeFile(path.join(dir, 'spec.md'), makeSpec(4), 'utf-8');
    const third = await ensureRubricFile('0999-fixture', dir, { refresh: true });
    expect(third.written).toBe(true);

    const regenerated = parseRubric(await fsp.readFile(rubricPath, 'utf-8'));
    const acTied = regenerated.criteria.filter(c =>
      c.sourceACs.some(s => s.startsWith('AC-')),
    );
    expect(acTied.length).toBe(4);
    expect(await fsp.readFile(rubricPath, 'utf-8')).not.toContain('<!-- user edit -->');
  });

  it('replaces a status: template placeholder even without --refresh', async () => {
    await fsp.writeFile(path.join(dir, 'spec.md'), makeSpec(1), 'utf-8');
    const rubricPath = path.join(dir, 'rubric.md');
    await fsp.writeFile(
      rubricPath,
      ['---', 'status: template', '---', ''].join('\n'),
      'utf-8',
    );

    const result = await ensureRubricFile('0999-fixture', dir);
    expect(result.written).toBe(true);
    expect(await fsp.readFile(rubricPath, 'utf-8')).not.toMatch(/status:\s*template/);
  });
});
