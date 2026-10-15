import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  recordStudioThreadBinding,
  studioThreadBindingFile,
} from '../../../../src/core/tasks/studio-thread-binding.js';

const dirs: string[] = [];
function temp(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function ledgerIn(root: string, id: string): string {
  const dir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'ledger.jsonl');
}

describe('recordStudioThreadBinding', () => {
  it('binds the Studio thread to the increment whose ledger it appended to', () => {
    const root = temp('sw-binding-root-');
    const home = temp('sw-binding-home-');
    const env = { SPECWEAVE_STUDIO_THREAD_ID: 'thread:abc/1' };
    recordStudioThreadBinding(ledgerIn(root, '0930-plan-card'), { t: 'T-02', e: 'claim', at: '2026-10-15T10:00:00Z' }, { env, home });
    const file = studioThreadBindingFile('thread:abc/1', home);
    expect(path.basename(file)).toBe('thread_abc_1.json');
    expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toEqual({
      version: 1,
      threadId: 'thread:abc/1',
      incrementId: '0930-plan-card',
      root: path.resolve(root),
      taskId: 'T-02',
      event: 'claim',
      at: '2026-10-15T10:00:00Z',
    });

    // The newest ledger write wins; increment-level events carry no task.
    recordStudioThreadBinding(ledgerIn(root, '0931-next'), { t: '*', e: 'note', at: '2026-10-15T11:00:00Z' }, { env, home });
    expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toMatchObject({ incrementId: '0931-next', taskId: null, event: 'note' });
  });

  it('does nothing outside Studio or for a ledger outside .specweave/increments', () => {
    const root = temp('sw-binding-root-');
    const home = temp('sw-binding-home-');
    recordStudioThreadBinding(ledgerIn(root, '0930-plan-card'), { t: 'T-01', e: 'claim', at: '2026-10-15T10:00:00Z' }, { env: {}, home });
    recordStudioThreadBinding(path.join(root, 'elsewhere', 'ledger.jsonl'), { t: 'T-01', e: 'claim', at: '2026-10-15T10:00:00Z' }, {
      env: { SPECWEAVE_STUDIO_THREAD_ID: 't1' },
      home,
    });
    expect(fs.existsSync(path.join(home, '.specweave'))).toBe(false);
  });
});
