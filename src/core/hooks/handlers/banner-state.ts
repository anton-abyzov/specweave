/**
 * Banner Throttle State (increment 0796 / T-003)
 *
 * Persists the result of the most recent session-start banner check to
 * `<.specweave/state>/banner-last-check.json`. Used by the
 * UserPromptSubmit hook to short-circuit subsequent prompts within the
 * configured throttle window without re-running `specweave doctor`.
 *
 * Atomic write semantics: the new state is written to `*.tmp` first, then
 * `fs.renameSync` is used to swap it into place. This prevents partial
 * reads when multiple Claude Code windows fire UserPromptSubmit hooks
 * concurrently. Reads are tolerant — any malformed or schema-mismatched
 * file is treated as "never checked" so a corrupt state file can never
 * block prompt submission. ADR 0796-02 (throttle semantics), ADR 0796-03
 * (failure-mode policy).
 */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FILE_NAME = 'banner-last-check.json';
const SCHEMA_VERSION = 1 as const;

export interface BannerState {
  version: typeof SCHEMA_VERSION;
  lastCheckAt: string;
  lastResult: {
    pluginUpdates: number;
    skillUpdates: number;
    doctorStatus: 'pass' | 'warn' | 'fail' | 'skip';
  };
  /** ISO timestamp the banner was last shown to the user, or null if never. */
  lastBannerShownAt: string | null;
}

export function bannerStatePath(stateDir: string): string {
  return join(stateDir, FILE_NAME);
}

/**
 * Read the throttle state. Returns null when the file is missing,
 * unparseable, or carries a schema version we don't understand. Never
 * throws — this is the hot path for every UserPromptSubmit and must
 * degrade silently.
 */
export function readBannerState(stateDir: string): BannerState | null {
  const filePath = bannerStatePath(stateDir);
  if (!existsSync(filePath)) return null;
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isBannerState(parsed)) return null;
  return parsed;
}

/**
 * Write the throttle state atomically. Creates the parent directory if
 * missing. The temp file is removed on success (only the final file
 * remains).
 */
export function writeBannerStateAtomic(stateDir: string, state: BannerState): void {
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  const finalPath = bannerStatePath(stateDir);
  const tmpPath = finalPath + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(state, null, 2) + '\n');
  try {
    renameSync(tmpPath, finalPath);
  } catch (err) {
    // Best-effort cleanup so we don't leave orphaned .tmp files behind
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
    throw err;
  }
}

function isBannerState(value: unknown): value is BannerState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.version !== SCHEMA_VERSION) return false;
  if (typeof v.lastCheckAt !== 'string') return false;
  if (!('lastBannerShownAt' in v)) return false;
  if (v.lastBannerShownAt !== null && typeof v.lastBannerShownAt !== 'string') return false;
  if (typeof v.lastResult !== 'object' || v.lastResult === null) return false;
  const r = v.lastResult as Record<string, unknown>;
  if (typeof r.pluginUpdates !== 'number') return false;
  if (typeof r.skillUpdates !== 'number') return false;
  const status = r.doctorStatus;
  if (status !== 'pass' && status !== 'warn' && status !== 'fail' && status !== 'skip') return false;
  return true;
}
