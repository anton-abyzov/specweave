/**
 * `create-increment --parallel` is a hidden, deprecated no-op.
 *
 * Parallel (team-lead) planning was removed. The option stays registered so
 * old callers do not fail on an unknown option, but it is hidden from help,
 * prints a one-line notice and writes no planning metadata.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const BIN_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'bin', 'specweave.js');
const binSource = fs.readFileSync(BIN_PATH, 'utf-8');

describe('create-increment --parallel (deprecated no-op)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-parallel-flag-'));
    fs.mkdirSync(path.join(tempDir, '.specweave', 'increments'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.specweave', 'config.json'),
      JSON.stringify({ project: { name: 'test-project' } }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('bin/specweave.js keeps --parallel registered but hidden from help', () => {
    const block = binSource.split(".command('create-increment [title]')")[1].slice(0, 2000);
    expect(block).toMatch(/new Option\('--parallel', '[^']*'\)\.hideHelp\(\)/);
    expect(block).not.toMatch(/fan-out/);
  });

  it('prints a one-line notice and writes no planning metadata', async () => {
    const errors: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { createIncrementCommand } = await import(
      '../../../../src/cli/commands/create-increment.js'
    );

    await createIncrementCommand({
      id: '0001-parallel-noop',
      title: 'Parallel no-op',
      projectRoot: tempDir,
      parallel: true,
    });

    const metadata = JSON.parse(
      fs.readFileSync(
        path.join(tempDir, '.specweave', 'increments', '0001-parallel-noop', 'metadata.json'),
        'utf-8',
      ),
    );
    expect(metadata.planning).toBeUndefined();
    const notices = errors.filter((e) => e.includes('--parallel'));
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain('deprecated');
  });
});
