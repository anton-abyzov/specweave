/**
 * A fresh start (`specweave init --force`, 1407 AC-13) deletes `.specweave`
 * only after a backup exists, and each backup gets its own folder.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const copyControl = vi.hoisted(() => ({ fail: false }));

vi.mock('../../../../../src/utils/fs-native.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../src/utils/fs-native.js')>();
  return {
    ...actual,
    copySync: (...args: Parameters<typeof actual.copySync>) => {
      if (copyControl.fail) throw new Error('ENOSPC: no space left on device');
      return actual.copySync(...args);
    },
  };
});

import { backupAndClearSpecweave } from '../../../../../src/cli/helpers/init/fresh-start.js';

let dir: string;
const increment = () => path.join(dir, '.specweave', 'increments', '0001-keep', 'spec.md');
const backups = () => fs.readdirSync(dir).filter((n) => n.startsWith('.specweave.backup-'));

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-reinit-'));
  fs.mkdirSync(path.dirname(increment()), { recursive: true });
  fs.writeFileSync(increment(), '# Keep me\n');
  copyControl.fail = false;
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('backupAndClearSpecweave', () => {
  it('deletes nothing when the backup cannot be made', () => {
    copyControl.fail = true;
    expect(backupAndClearSpecweave(dir)).toBeNull();
    expect(fs.readFileSync(increment(), 'utf-8')).toBe('# Keep me\n');
  });

  it('backs up, then removes .specweave', () => {
    expect(backupAndClearSpecweave(dir)).toBe(path.join(dir, backups()[0] ?? 'missing'));
    expect(fs.existsSync(path.join(dir, '.specweave'))).toBe(false);
    expect(backups()).toHaveLength(1);
    expect(fs.readFileSync(path.join(dir, backups()[0], 'increments', '0001-keep', 'spec.md'), 'utf-8')).toBe('# Keep me\n');
  });

  it('keeps the first backup when a second fresh start runs the same day', () => {
    backupAndClearSpecweave(dir, new Date('2026-11-18T09:00:00.000Z'));

    fs.mkdirSync(path.dirname(increment()), { recursive: true });
    fs.writeFileSync(increment(), '# Second project\n');
    backupAndClearSpecweave(dir, new Date('2026-11-18T15:30:00.000Z'));

    const kept = backups().sort();
    expect(kept).toHaveLength(2);
    expect(fs.readFileSync(path.join(dir, kept[0], 'increments', '0001-keep', 'spec.md'), 'utf-8')).toBe('# Keep me\n');
    expect(fs.readFileSync(path.join(dir, kept[1], 'increments', '0001-keep', 'spec.md'), 'utf-8')).toBe('# Second project\n');
  });
});
