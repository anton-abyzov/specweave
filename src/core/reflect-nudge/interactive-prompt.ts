/**
 * Session-end nudge printer with 5-second input timeout.
 *
 * Prints the prompt line to stdout; waits up to `timeoutMs` for a single
 * character on stdin. Non-TTY, empty input, "N", "n", or timeout → treated
 * as declined (AC-US3-03). Only explicit "y"/"Y" is accepted.
 *
 * Per AC-US3-04 this module NEVER executes the suggested command — it
 * only returns the user's response to the caller.
 *
 * @module core/reflect-nudge/interactive-prompt
 */

import * as readline from 'readline';

export interface PromptOptions {
  /** Timeout in milliseconds before defaulting to No. Default: 5000. */
  timeoutMs?: number;
  /** Override the stdin/stdout streams (mainly for tests). */
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
}

export type PromptResponse = 'yes' | 'no' | 'timeout' | 'non-tty';

/**
 * Print `line` and wait for a y/N answer. Returns which branch fired.
 *
 * Non-interactive contexts (piped stdin, CI, auto-mode) short-circuit
 * immediately to `'non-tty'` — treated as a decline.
 */
export async function promptNudge(
  line: string,
  opts: PromptOptions = {},
): Promise<PromptResponse> {
  const stdin = opts.stdin ?? process.stdin;
  const stdout = opts.stdout ?? process.stdout;
  const timeoutMs = opts.timeoutMs ?? 5000;

  stdout.write(`${line}\n`);

  const isInteractive =
    typeof (stdin as NodeJS.ReadStream).isTTY !== 'undefined'
      ? Boolean((stdin as NodeJS.ReadStream).isTTY)
      : true;

  if (!isInteractive) {
    return 'non-tty';
  }

  return new Promise<PromptResponse>((resolve) => {
    const rl = readline.createInterface({ input: stdin, output: stdout, terminal: false });
    let settled = false;

    const done = (response: PromptResponse): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      rl.close();
      resolve(response);
    };

    const timer = setTimeout(() => done('timeout'), timeoutMs);

    rl.once('line', (input: string) => {
      const trimmed = input.trim().toLowerCase();
      done(trimmed === 'y' || trimmed === 'yes' ? 'yes' : 'no');
    });

    rl.once('close', () => {
      done('no');
    });
  });
}
