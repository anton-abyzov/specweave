/**
 * Run a command through the OS shell (so `npm.cmd` / `.cmd` shims work on
 * Windows), capturing the full combined output plus a bounded tail.
 *
 * `spawn(cmd, { shell: true })` uses `cmd.exe /d /s /c` on Windows and
 * `/bin/sh -c` elsewhere — one call site, no bash assumption.
 *
 * @module core/tasks/run-shell
 */

import { execFileSync, spawn, type ChildProcess } from 'child_process';

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

/** Longest delay `setTimeout` honours; larger values fire after 1 ms. */
export const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** After a timeout, how long the command gets to exit before SIGKILL. */
const KILL_GRACE_MS = 5_000;

/** Every descendant of `rootPid`, deepest first (POSIX `ps`). */
function descendantPids(rootPid: number): number[] {
  let table: string;
  try {
    table = execFileSync('ps', ['-A', '-o', 'pid=,ppid='], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return [];
  }
  const children = new Map<number, number[]>();
  for (const line of table.split('\n')) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number);
    if (!Number.isInteger(pid) || !Number.isInteger(ppid)) continue;
    children.set(ppid, [...(children.get(ppid) ?? []), pid]);
  }
  const out: number[] = [];
  const walk = (pid: number) => {
    for (const c of children.get(pid) ?? []) {
      walk(c);
      out.push(c);
    }
  };
  walk(rootPid);
  return out;
}

/**
 * Stop the shell and everything it started. `child.kill()` alone signals only
 * the shell, so a compound command (`a && b`, pipes) would keep running and
 * hold the output pipes open.
 */
function killTree(child: ChildProcess, signal: NodeJS.Signals, known: Set<number>): void {
  const pid = child.pid;
  if (pid === undefined) return;
  if (process.platform === 'win32') {
    // taskkill walks the tree from the shell, so the shell must outlive it.
    const killShell = () => {
      try {
        child.kill(signal);
      } catch {
        // already gone
      }
    };
    try {
      spawn('taskkill', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
        .on('exit', killShell)
        .on('error', killShell);
    } catch {
      killShell();
    }
    return;
  }
  for (const d of descendantPids(pid)) known.add(d);
  for (const d of known) {
    try {
      process.kill(d, signal);
    } catch {
      // already gone
    }
  }
  try {
    child.kill(signal);
  } catch {
    // already gone
  }
}

export function runShell(cmd: string, cwd: string, timeoutMs = 20 * 60 * 1000): Promise<ShellResult> {
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = spawn(cmd, { cwd, shell: true, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ code: 127, tail: String(e), output: String(e) });
      return;
    }
    let output = '';
    let done = false;
    let timedOut = false;
    const push = (d: Buffer) => {
      output += d.toString('utf-8');
      if (output.length > MAX_OUTPUT_BYTES) output = output.slice(output.length - MAX_OUTPUT_BYTES);
    };
    child.stdout?.on('data', push);
    child.stderr?.on('data', push);
    const killed = new Set<number>();
    let grace: NodeJS.Timeout | undefined;
    const limit = Math.min(Math.max(1, timeoutMs), MAX_TIMEOUT_MS);
    const timer = setTimeout(() => {
      const label = limit >= 60_000 ? `${Math.round(limit / 60_000)} min` : `${Math.round(limit / 1000)} s`;
      output += `\n[timeout after ${label}]`;
      timedOut = true;
      killTree(child, 'SIGTERM', killed);
      grace = setTimeout(() => {
        killTree(child, 'SIGKILL', killed);
        // Something outside the tree may still hold the pipes; stop waiting.
        child.stdout?.destroy();
        child.stderr?.destroy();
        finish(child.exitCode ?? 137);
      }, KILL_GRACE_MS);
    }, limit);
    const finish = (exit: number) => {
      if (done) return;
      done = true;
      // A command stopped at the limit never passes, even if its shell exited 0.
      const code = timedOut && exit === 0 ? 124 : exit;
      clearTimeout(timer);
      if (grace) clearTimeout(grace);
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
