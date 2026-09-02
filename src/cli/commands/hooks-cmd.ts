/**
 * `specweave hooks log` — show recent hook warnings / errors / blocks from
 * the single per-project JSONL log (`.specweave/logs/hooks.jsonl`).
 *
 * @module cli/commands/hooks-cmd
 */

import * as fs from 'fs';
import * as path from 'path';
import { HOOK_LOG_FILE } from '../../core/hooks/handlers/utils.js';

export interface HooksLogOptions {
  last?: number;
  blocksOnly?: boolean;
  errorsOnly?: boolean;
  hook?: string;
}

interface HookLogLine {
  t?: string;
  hook?: string;
  level?: string;
  msg?: string;
}

/** Parse every JSONL line of the current log and its rotated predecessor. */
export function readHookLog(projectRoot: string): HookLogLine[] {
  const base = path.join(projectRoot, '.specweave', 'logs', HOOK_LOG_FILE);
  const entries: HookLogLine[] = [];
  for (const file of [`${base}.1`, base]) {
    let raw = '';
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line) as HookLogLine);
      } catch {
        // skip malformed line
      }
    }
  }
  return entries;
}

export async function hooksLogCommand(options: HooksLogOptions = {}): Promise<void> {
  let entries = readHookLog(process.cwd());
  if (options.hook) entries = entries.filter((e) => e.hook === options.hook);
  if (options.blocksOnly) entries = entries.filter((e) => e.level === 'block');
  if (options.errorsOnly) entries = entries.filter((e) => e.level === 'error');
  entries = entries.slice(-(options.last ?? 20)).reverse();

  if (entries.length === 0) {
    console.log('No hook events logged (only warnings, errors and blocks are recorded).');
    return;
  }
  console.log(`Hook log (last ${entries.length} entries, newest first):`);
  for (const e of entries) {
    const ts = String(e.t ?? '').replace('T', ' ').slice(0, 19);
    console.log(`  ${ts}  ${String(e.level ?? '?').padEnd(5)}  ${String(e.hook ?? '?').padEnd(14)}  ${e.msg ?? ''}`);
  }
}
