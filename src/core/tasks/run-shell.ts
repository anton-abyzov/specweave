/**
 * Run a command through the OS shell (so `npm.cmd` / `.cmd` shims work on
 * Windows), capturing the full combined output plus a bounded tail.
 *
 * `spawn(cmd, { shell: true })` uses `cmd.exe /d /s /c` on Windows and
 * `/bin/sh -c` elsewhere — one call site, no bash assumption.
 *
 * @module core/tasks/run-shell
 */

import { spawn } from 'child_process';

/** Lines of combined output kept in {@link ShellResult.tail}. */
export const TAIL_LINES = 50;

/** Hard cap on the retained full output (bytes) so a runaway build cannot OOM us. */
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

export interface ShellResult {
  code: number;
  /** Last {@link TAIL_LINES} lines of combined output. */
  tail: string;
  /** Full combined stdout+stderr (truncated from the front past 4 MB). */
  output: string;
}

/** Last `n` lines of a blob (trailing blank lines dropped). */
export function tailLines(output: string, n = TAIL_LINES): string {
  const lines = output.replace(/\r\n/g, '\n').split('\n');
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  return lines.slice(-n).join('\n');
}

export function runShell(cmd: string, cwd: string, timeoutMs = 20 * 60 * 1000): Promise<ShellResult> {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, { cwd, shell: true, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ code: 127, tail: String(e), output: String(e) });
      return;
    }
    let output = '';
    const push = (d: Buffer) => {
      output += d.toString('utf-8');
      if (output.length > MAX_OUTPUT_BYTES) output = output.slice(output.length - MAX_OUTPUT_BYTES);
    };
    child.stdout?.on('data', push);
    child.stderr?.on('data', push);
    const timer = setTimeout(() => {
      child.kill();
      output += `\n[timeout after ${Math.round(timeoutMs / 60000)} min]`;
    }, timeoutMs);
    const finish = (code: number) => {
      clearTimeout(timer);
      resolve({ code, tail: tailLines(output), output });
    };
    child.on('close', (code) => finish(code ?? 1));
    child.on('error', (e) => {
      output += String(e);
      finish(127);
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
