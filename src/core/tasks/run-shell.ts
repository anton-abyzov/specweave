/**
 * Run a command through the OS shell (so `npm.cmd` / `.cmd` shims work on
 * Windows), capturing the last 40 lines of combined stdout/stderr.
 *
 * @module core/tasks/run-shell
 */

import { spawn } from 'child_process';

export interface ShellResult {
  code: number;
  /** Last 40 lines of combined output. */
  tail: string;
}

export function runShell(cmd: string, cwd: string, timeoutMs = 20 * 60 * 1000): Promise<ShellResult> {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, { cwd, shell: true, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ code: 127, tail: String(e) });
      return;
    }
    const chunks: string[] = [];
    const push = (d: Buffer) => {
      chunks.push(d.toString('utf-8'));
      if (chunks.length > 400) chunks.splice(0, chunks.length - 400);
    };
    child.stdout?.on('data', push);
    child.stderr?.on('data', push);
    const timer = setTimeout(() => {
      child.kill();
      chunks.push(`\n[timeout after ${Math.round(timeoutMs / 60000)} min]`);
    }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      const lines = chunks.join('').split(/\r?\n/);
      resolve({ code: code ?? 1, tail: lines.slice(-40).join('\n') });
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ code: 127, tail: String(e) });
    });
  });
}

/**
 * A task's `Test:` value is a shell command unless it is a BDD sentence
 * (legacy `**Test**: Given … → When … → Then …`) or empty/`-`.
 */
export function isShellCommand(test: string | undefined): test is string {
  if (!test) return false;
  const t = test.trim();
  if (!t || t === '-') return false;
  return !/^(given|when|then)\b/i.test(t);
}
