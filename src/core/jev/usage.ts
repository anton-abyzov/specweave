/**
 * Jev usage ledger — append-only JSONL at `.specweave/state/jev-usage.jsonl`
 *
 * Every Jev call writes one line (tokens, cost, latency, ok). Reading is tolerant:
 * a truncated or corrupt line is skipped, never thrown. Nothing here stores a key.
 *
 * @module core/jev/usage
 */

import * as fs from 'fs';
import * as path from 'path';

export interface JevUsageRecord {
  at: string;
  kind: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost?: number;
  latencyMs: number;
  /** Secret-shaped spans masked out of the request state before it was sent. */
  redactions?: number;
  ok: boolean;
}

export interface JevUsageSummary {
  calls: number;
  input_tokens: number;
  cost: number;
  byKind: Record<string, number>;
  since?: string;
}

/** Absolute path of the ledger for a project root. */
export function usageLogPath(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'state', 'jev-usage.jsonl');
}

/**
 * Append one record. Best-effort: never throws (the caller is mid-decision).
 * O_APPEND keeps concurrent agents from interleaving partial lines.
 */
export function appendUsage(projectRoot: string, rec: JevUsageRecord): void {
  try {
    const filePath = usageLogPath(projectRoot);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, JSON.stringify(rec) + '\n', { flag: 'a' });
  } catch {
    // Ledger writes are advisory; a full disk must not break a Jev decision.
  }
}

/** Totals over the whole ledger. Missing file → zeroes. Bad lines → skipped. */
export function readUsageSummary(projectRoot: string): JevUsageSummary {
  const summary: JevUsageSummary = { calls: 0, input_tokens: 0, cost: 0, byKind: {} };

  let raw: string;
  try {
    const filePath = usageLogPath(projectRoot);
    if (!fs.existsSync(filePath)) return summary;
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return summary;
  }

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let rec: Partial<JevUsageRecord>;
    try {
      rec = JSON.parse(trimmed) as Partial<JevUsageRecord>;
    } catch {
      continue;
    }
    if (!rec || typeof rec !== 'object') continue;

    summary.calls += 1;
    if (typeof rec.input_tokens === 'number' && Number.isFinite(rec.input_tokens)) {
      summary.input_tokens += rec.input_tokens;
    }
    if (typeof rec.cost === 'number' && Number.isFinite(rec.cost)) {
      summary.cost += rec.cost;
    }
    const kind = typeof rec.kind === 'string' && rec.kind ? rec.kind : 'unknown';
    summary.byKind[kind] = (summary.byKind[kind] ?? 0) + 1;

    if (typeof rec.at === 'string' && rec.at && (!summary.since || rec.at < summary.since)) {
      summary.since = rec.at;
    }
  }

  return summary;
}
