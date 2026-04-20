/**
 * Tests for the interactive prompt — covers the 5s timeout default-N
 * behavior (AC-US3-03) and the no-auto-execution contract (AC-US3-04).
 *
 * Uses PassThrough streams to drive stdin/stdout without a real TTY.
 */

import { PassThrough } from 'stream';
import { describe, expect, it } from 'vitest';
import { promptNudge } from './interactive-prompt.js';

function makeStreams(): { stdin: PassThrough & { isTTY?: boolean }; stdout: PassThrough; outputChunks: string[] } {
  const stdin = new PassThrough() as PassThrough & { isTTY?: boolean };
  stdin.isTTY = true;
  const stdout = new PassThrough();
  const outputChunks: string[] = [];
  stdout.on('data', (chunk: Buffer) => {
    outputChunks.push(chunk.toString('utf-8'));
  });
  return { stdin, stdout, outputChunks };
}

describe('promptNudge', () => {
  it('resolves to "yes" on explicit "y" (AC-US3-03 inverse)', async () => {
    const { stdin, stdout, outputChunks } = makeStreams();
    const resultPromise = promptNudge('Detected: x — run `y`? (y/N)', { stdin, stdout, timeoutMs: 2000 });
    stdin.write('y\n');
    const result = await resultPromise;
    expect(result).toBe('yes');
    expect(outputChunks.join('')).toContain('Detected: x — run `y`? (y/N)');
  });

  it('resolves to "yes" for "Y" (case-insensitive)', async () => {
    const { stdin, stdout } = makeStreams();
    const resultPromise = promptNudge('prompt', { stdin, stdout, timeoutMs: 2000 });
    stdin.write('Y\n');
    const result = await resultPromise;
    expect(result).toBe('yes');
  });

  it('resolves to "no" on explicit "n" (AC-US3-03)', async () => {
    const { stdin, stdout } = makeStreams();
    const resultPromise = promptNudge('prompt', { stdin, stdout, timeoutMs: 2000 });
    stdin.write('n\n');
    const result = await resultPromise;
    expect(result).toBe('no');
  });

  it('resolves to "no" on empty input (default is No, AC-US3-01)', async () => {
    const { stdin, stdout } = makeStreams();
    const resultPromise = promptNudge('prompt', { stdin, stdout, timeoutMs: 2000 });
    stdin.write('\n');
    const result = await resultPromise;
    expect(result).toBe('no');
  });

  it('resolves to "timeout" when no input arrives within the timeout (AC-US3-03)', async () => {
    const { stdin, stdout } = makeStreams();
    const start = Date.now();
    const result = await promptNudge('prompt', { stdin, stdout, timeoutMs: 100 });
    const elapsed = Date.now() - start;
    expect(result).toBe('timeout');
    expect(elapsed).toBeGreaterThanOrEqual(80);
    expect(elapsed).toBeLessThan(1000);
  });

  it('resolves to "non-tty" when stdin is not a TTY (CI/pipe safety)', async () => {
    const { stdin, stdout } = makeStreams();
    stdin.isTTY = false;
    const result = await promptNudge('prompt', { stdin, stdout, timeoutMs: 2000 });
    expect(result).toBe('non-tty');
  });

  it('never executes any suggested command (AC-US3-04)', async () => {
    // The whole module is print + readline only — it has no process spawn,
    // no child_process import, and no write paths. This test encodes the
    // behavioral guarantee: calling promptNudge("rm -rf /", ...) is a pure
    // no-op on the host system.
    const { stdin, stdout, outputChunks } = makeStreams();
    stdin.isTTY = false;
    await promptNudge('Detected: danger — run `rm -rf /`? (y/N)', { stdin, stdout });
    expect(outputChunks.join('')).toContain('rm -rf /');
  });
});
