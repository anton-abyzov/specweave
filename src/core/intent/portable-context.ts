/** Read-only, bounded discovery of the portable intent board. No session scans or model calls. */
import fs from 'node:fs';
import path from 'node:path';
import { scrubSecrets } from '../session/handoff-secret-scrub.js';

export const INTENT_BOARD_PATH = '.specweave/intents/board.jsonl';
const MAX_BOARD_BYTES = 2 * 1024 * 1024;
const MAX_ITEMS = 3;
const STATES = ['backlog', 'active', 'blocked', 'review', 'done'];
interface Snapshot {
  id: string;
  title: string;
  state: string;
  revision: number;
  updatedAt?: string;
}
function text(value: string, max: number, counts?: Record<string, number>): string {
  const result = scrubSecrets(value);
  if (counts) for (const [kind, count] of Object.entries(result.counts)) counts[kind] = (counts[kind] ?? 0) + count;
  return result.scrubbed.replace(/[\u0000-\u001f\u007f<>`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Latest revision wins, just as in the dashboard. Output always points to the full record. */
export function readIntentContext(root: string, redactions?: Record<string, number>): string | undefined {
  const file = path.join(root, INTENT_BOARD_PATH);
  if (!fs.existsSync(file)) return undefined;
  const pointer = `Intent board: ${INTENT_BOARD_PATH}`;
  let raw: string;
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const stat = fs.fstatSync(fd);
      if (!stat.isFile() || stat.size > MAX_BOARD_BYTES)
        return `${pointer} — summary unavailable; inspect the board directly.`;
      // Cap the read too: an append after fstat cannot allocate an unbounded buffer.
      const buffer = Buffer.alloc(Math.min(stat.size, MAX_BOARD_BYTES));
      const read = fs.readSync(fd, buffer, 0, buffer.length, 0);
      raw = buffer.subarray(0, read).toString('utf8');
    } finally { fs.closeSync(fd); }
  } catch { return `${pointer} — could not read the history; inspect it directly.`; }

  const latest = new Map<string, Snapshot>();
  let invalid = 0;
  for (const line of raw.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const item = JSON.parse(line);
      if (!item || typeof item.id !== 'string' || !item.id || typeof item.title !== 'string'
        || !STATES.includes(item.state) || !Number.isInteger(item.revision) || !Array.isArray(item.executions))
        throw new Error('Invalid intent snapshot');
      if (item.revision > (latest.get(item.id)?.revision ?? 0)) latest.set(item.id, item);
    } catch { invalid++; }
  }
  const open = [...latest.values()].filter(item => item.state !== 'done').sort((a, b) =>
    (typeof b.updatedAt === 'string' ? b.updatedAt : '').localeCompare(typeof a.updatedAt === 'string' ? a.updatedAt : '')
    || a.id.localeCompare(b.id));
  const lines = [`${pointer} — ${open.length} open intent${open.length === 1 ? '' : 's'} (planning state, not verification).`];
  for (const item of open.slice(0, MAX_ITEMS))
    lines.push(`- ${text(item.id, 70, redactions)} [${item.state}]: ${text(item.title, 110, redactions)}`);
  if (open.length > MAX_ITEMS) lines.push(`(+${open.length - MAX_ITEMS} more in the board)`);
  if (invalid) lines.push('Some history could not be read; counts may be incomplete.');
  return lines.join('\n');
}
