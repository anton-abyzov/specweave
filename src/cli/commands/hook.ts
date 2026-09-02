/**
 * Hook CLI Command — `specweave hook <event>`.
 *
 * Internal entry point used by tooling and tests; Claude Code itself runs the
 * zero-dependency launcher `plugins/specweave/hooks/run.mjs`, which imports the
 * same router. Reads JSON from stdin, dispatches via hook-router, writes exactly
 * one JSON object to stdout. Always exits 0 — on any failure prints `{}`.
 *
 * @module cli/commands/hook
 */

import { hookRouter } from '../../core/hooks/handlers/hook-router.js';

const STDIN_CAP_MS = 5000;

/** Read all of stdin as a string (capped at STDIN_CAP_MS). */
async function readStdin(): Promise<string> {
  return new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(Buffer.concat(chunks).toString('utf-8'));
    };
    const timer = setTimeout(finish, STDIN_CAP_MS);
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
    if (process.stdin.readableEnded) finish();
  });
}

let written = false;
function emit(result: unknown): void {
  if (written) return;
  written = true;
  let text = '{}';
  try {
    text = JSON.stringify(result ?? {});
  } catch {
    text = '{}';
  }
  process.stdout.write(text);
}

/** Main hook handler entry point. */
export async function handleHook(eventType: string): Promise<void> {
  process.on('unhandledRejection', () => {
    emit({});
    process.exit(0);
  });
  try {
    const rawStdin = await readStdin();
    emit(await hookRouter(eventType, rawStdin));
  } catch {
    emit({});
  }
}
