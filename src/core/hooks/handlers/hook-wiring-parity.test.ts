/**
 * Hook wiring parity guard (0869).
 *
 * Asserts that every `specweave hook <X>` the plugin's hooks.json invokes is either
 * registered in the Node router HANDLERS map OR explicitly listed as KNOWN_UNROUTED
 * (a currently-dead hook tracked for restoration). This catches the class of bug where
 * a hooks.json call-site targets an event the router no longer dispatches, so the hook
 * silently no-ops (returns the safe default) — as happened to 6 hooks after commit
 * 0f81519b1 "rework hooks: remove shell-based handlers".
 *
 * See .specweave/increments/0869-hook-wiring-audit/reports/hook-wiring-audit-2026-06-03.md
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Hooks the router does NOT register today (dead since 0f81519b1), kept here so the
 * parity test stays green while the breakage is tracked. RESTORING a hook = add its key
 * to hook-router.ts HANDLERS AND remove it here (the stale-entry assertion enforces this).
 * Tracked for restoration in a follow-up to increment 0869.
 */
const KNOWN_UNROUTED = new Set<string>([
  'session-start',
  'post-tool-use',
  'post-tool-use-analytics',
  'stop-reflect',
  'stop-auto',
  'stop-sync',
]);

/** The 4 events that MUST stay registered — a regression dropping one fails loudly. */
const MUST_BE_REGISTERED = ['user-prompt-submit', 'pre-tool-use', 'pre-compact', 'stop'];

function repoRoot(): string {
  return process.cwd();
}

/** Every `specweave hook X` event name invoked by the plugin hooks.json. */
function invokedHookEvents(): string[] {
  const p = path.resolve(repoRoot(), 'plugins/specweave/hooks/hooks.json');
  const raw = fs.readFileSync(p, 'utf-8');
  const names = new Set<string>();
  for (const m of raw.matchAll(/specweave hook ([a-z][a-z-]*)/g)) names.add(m[1]);
  return [...names].sort();
}

/** Keys of the HANDLERS map in hook-router.ts (parsed from source — no TS-dep import). */
function registeredEvents(): string[] {
  const p = path.resolve(repoRoot(), 'src/core/hooks/handlers/hook-router.ts');
  const src = fs.readFileSync(p, 'utf-8');
  const start = src.indexOf('HANDLERS');
  const slice = start >= 0 ? src.slice(start) : src;
  const names = new Set<string>();
  for (const m of slice.matchAll(/'([a-z][a-z-]*)':\s*\(\)\s*=>/g)) names.add(m[1]);
  return [...names].sort();
}

describe('hook wiring parity (hooks.json ↔ router HANDLERS)', () => {
  it('every hooks.json hook is registered or explicitly known-unrouted (AC-US1-01)', () => {
    const registered = new Set(registeredEvents());
    const orphans = invokedHookEvents().filter(
      (e) => !registered.has(e) && !KNOWN_UNROUTED.has(e),
    );
    expect(
      orphans,
      `hooks.json invokes \`specweave hook X\` for events the router does NOT register ` +
        `and are NOT allowlisted — they silently no-op. Register a handler in hook-router.ts ` +
        `HANDLERS, or add to KNOWN_UNROUTED with a tracking note. Orphans: ${orphans.join(', ')}`,
    ).toEqual([]);
  });

  it('the 4 live events are registered (regression guard, AC-US1-03)', () => {
    const registered = new Set(registeredEvents());
    for (const e of MUST_BE_REGISTERED) {
      expect(registered.has(e), `router HANDLERS lost '${e}' — a live hook would go dead`).toBe(true);
    }
  });

  it('KNOWN_UNROUTED has no stale entries (AC-US1-02)', () => {
    const invoked = new Set(invokedHookEvents());
    const registered = new Set(registeredEvents());
    const stale = [...KNOWN_UNROUTED].filter((e) => !invoked.has(e) || registered.has(e));
    expect(
      stale,
      `KNOWN_UNROUTED contains names that are no longer dead (removed from hooks.json or now ` +
        `registered). Remove them from the allowlist. Stale: ${stale.join(', ')}`,
    ).toEqual([]);
  });
});
