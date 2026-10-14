import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { handle } from '../../../src/core/hooks/handlers/stop.js';
import { cleanup, sandbox, workspace } from './fixtures.js';

afterEach(cleanup);
function setup(query: string, ids: string[]) {
  const root = workspace(sandbox());
  const context = { projectRoot: root, configPath: path.join(root, '.specweave/config.json'),
    stateDir: path.join(root, '.specweave/state'), logsDir: path.join(root, '.specweave/logs'), timestamp: new Date().toISOString() };
  fs.mkdirSync(context.stateDir);
  fs.writeFileSync(path.join(context.stateDir, 'auto-mode.json'), JSON.stringify({ active: true, incrementIds: [query] }));
  for (const id of ids) {
    const dir = path.join(root, '.specweave/increments', id); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'spec.md'), '# Work\n\n## Acceptance Criteria\n- [ ] AC-01: works\n\n## Tasks\n### T-01 Work\n- AC: AC-01 | Files: src/a.ts | Test: true\n');
  }
  return context;
}

describe('stop hook increment identity', () => {
  it('never resolves 1000 to the longer number 10000', async () => {
    expect(await handle({}, setup('1000', ['10000-work']))).toEqual({});
  });
  it('selects the whole number when both short and long numbers exist', async () => {
    const result = await handle({}, setup('1000', ['10000-work', '1000-work']));
    expect(result.reason).toContain('1000: 1 task(s) / 1 AC(s) remain');
  });
  it('releases ambiguous aliases without claiming completion', async () => {
    const context = setup('1000', ['1000-work', '1000-other', '1000G-import']);
    fs.writeFileSync(path.join(context.stateDir, '.stop-auto-turns'), '4');
    expect(await handle({}, context)).toEqual({});
    expect(fs.existsSync(path.join(context.stateDir, '.stop-auto-turns'))).toBe(false);
  });
  it('uses an exact valid ID even with duplicate numbers and legacy suffixes', async () => {
    expect((await handle({}, setup('10000G-import', ['10000-work', '10000G-import']))).reason)
      .toContain('10000G-import: 1 task(s) / 1 AC(s) remain');
  });
  it('rejects invalid exact paths and regular files', async () => {
    expect(await handle({}, setup('../outside', ['../outside']))).toEqual({});
    const context = setup('1000-work', []);
    fs.mkdirSync(path.join(context.projectRoot, '.specweave/increments'));
    fs.writeFileSync(path.join(context.projectRoot, '.specweave/increments/1000-work'), 'not a directory');
    expect(await handle({}, context)).toEqual({});
  });
});
