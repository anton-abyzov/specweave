/**
 * Session-Start Banner Check (increment 0796 / T-004)
 *
 * Decides whether to surface a one-line update banner to the user at the
 * start of a Claude Code session. Wraps the 0794 doctor checkers
 * (PluginCurrencyChecker, SkillCurrencyChecker), throttles to once per
 * the configured window (default 24h), and silently degrades on every
 * imaginable failure mode (network, parse error, missing files, timeout).
 * Hook callers must NEVER block prompt submission on this — see
 * ADR 0796-03 (failure-mode policy).
 */

import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { runDoctor } from '../../doctor/doctor.js';
import type { CategoryResult, DoctorReport } from '../../doctor/types.js';
import {
  bannerStatePath,
  readBannerState,
  writeBannerStateAtomic,
  type BannerState,
} from './banner-state.js';
import type { HookContext } from './types.js';

const DEFAULT_THROTTLE_HOURS = 24;
const MIN_THROTTLE_HOURS = 1;
const MAX_THROTTLE_HOURS = 168;
const DOCTOR_TIMEOUT_MS = 800;

interface BannerConfig {
  disabled?: boolean;
  throttleHours?: number;
}

/**
 * Returns true when the cached banner state should be discarded and
 * `specweave doctor` re-run. ADR 0796-02 — Decision 2 lists six conditions
 * any of which forces a re-check.
 */
export function isThrottleExpired(
  state: BannerState | null,
  context: HookContext,
  config: BannerConfig = {},
): boolean {
  if (!state) return true;
  if (state.version !== 1) return true;

  const throttleHours = clampThrottleHours(config.throttleHours ?? DEFAULT_THROTTLE_HOURS);
  const throttleMs = throttleHours * 3600 * 1000;
  const lastCheckMs = Date.parse(state.lastCheckAt);
  if (Number.isNaN(lastCheckMs)) return true;

  // Math.abs — treat clock skew (negative elapsed) as expired
  if (Math.abs(Date.now() - lastCheckMs) > throttleMs) return true;

  // Watch the three files that can change update visibility outside the
  // throttle window. Missing files are tolerated (skip the comparison).
  const watchPaths = [
    context.configPath,
    join(homedir(), '.claude', 'plugins', 'installed_plugins.json'),
    join(context.projectRoot, 'vskill.lock'),
  ];
  for (const p of watchPaths) {
    if (!existsSync(p)) continue;
    try {
      if (statSync(p).mtimeMs > lastCheckMs) return true;
    } catch {
      // Stat failure → re-check to be safe
      return true;
    }
  }

  return false;
}

/**
 * Format a banner string from the cached doctor result. Returns null when
 * neither plugins nor skills have updates (no banner needed).
 */
export function formatBanner(result: BannerState['lastResult']): string | null {
  const total = (result.pluginUpdates ?? 0) + (result.skillUpdates ?? 0);
  if (total <= 0) return null;

  const parts: string[] = [];
  if (result.pluginUpdates > 0) {
    parts.push(`${result.pluginUpdates} plugin${result.pluginUpdates === 1 ? '' : 's'}`);
  }
  if (result.skillUpdates > 0) {
    parts.push(`${result.skillUpdates} skill${result.skillUpdates === 1 ? '' : 's'}`);
  }
  const lead = `[SpecWeave] ${parts.join(' and ')} have updates available.`;
  const apply: string[] = [];
  if (result.pluginUpdates > 0) apply.push('specweave refresh-plugins');
  if (result.skillUpdates > 0) apply.push('vskill update --all');

  return [
    lead,
    `  Run: specweave doctor    (full report)`,
    `  Or:  ${apply.join(' && ')}    (apply)`,
    `  Disable banner: set hooks.banner.disabled = true in .specweave/config.json`,
  ].join('\n');
}

/**
 * Orchestrate the banner check:
 *   1. Read cached state.
 *   2. If throttle not expired → return cached banner immediately (~10ms).
 *   3. Otherwise run `specweave doctor --quick --skip-external --quiet`
 *      under an 800ms timeout, count warn/fail in the two new currency
 *      categories, persist the state, and return the formatted banner.
 *
 * Every error path returns null silently — the user's prompt is never
 * blocked on a failure (ADR 0796-03).
 */
export async function checkBanner(
  context: HookContext,
  config: BannerConfig = {},
): Promise<string | null> {
  if (config.disabled === true) return null;

  let state: BannerState | null = null;
  try {
    state = readBannerState(context.stateDir);
  } catch {
    state = null;
  }

  if (!isThrottleExpired(state, context, config)) {
    return state ? formatBanner(state.lastResult) : null;
  }

  // Cold path: run doctor under timeout
  const doctorPromise = runDoctor(context.projectRoot, {
    quick: true,
    skipExternal: true,
    quiet: true,
  }).catch(() => null);
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), DOCTOR_TIMEOUT_MS),
  );

  let report: DoctorReport | null = null;
  try {
    report = await Promise.race([doctorPromise, timeoutPromise]);
  } catch {
    report = null;
  }
  if (!report) return null;

  const pluginUpdates = countOutdatedInCategory(report, 'Plugin Currency');
  const skillUpdates = countOutdatedInCategory(report, 'Skill Currency');

  const newState: BannerState = {
    version: 1,
    lastCheckAt: new Date().toISOString(),
    lastResult: {
      pluginUpdates,
      skillUpdates,
      doctorStatus: pickStatus(report),
    },
    lastBannerShownAt: pluginUpdates + skillUpdates > 0 ? new Date().toISOString() : (state?.lastBannerShownAt ?? null),
  };

  try {
    writeBannerStateAtomic(context.stateDir, newState);
  } catch {
    // Persist failure — still return the banner this turn so we don't lose the signal
  }

  return formatBanner(newState.lastResult);
}

function clampThrottleHours(h: number): number {
  if (!Number.isFinite(h)) return DEFAULT_THROTTLE_HOURS;
  return Math.min(Math.max(h, MIN_THROTTLE_HOURS), MAX_THROTTLE_HOURS);
}

function countOutdatedInCategory(report: DoctorReport, categoryName: string): number {
  const cat = report.categories.find((c) => c.category === categoryName);
  if (!cat) return 0;
  // Parse the message: "N plugin install(s) outdated" / "N skill(s) outdated"
  // Fall back to "1 if status is warn" — count is informational, banner only
  // distinguishes zero vs non-zero for the printing decision.
  for (const check of cat.checks) {
    if (check.status !== 'warn' && check.status !== 'fail') continue;
    const m = /^(\d+)\s/.exec(check.message);
    if (m) return parseInt(m[1], 10);
    return 1; // warn/fail without a number → at least 1 outdated
  }
  return 0;
}

function pickStatus(report: DoctorReport): BannerState['lastResult']['doctorStatus'] {
  const interesting: CategoryResult[] = report.categories.filter(
    (c) => c.category === 'Plugin Currency' || c.category === 'Skill Currency',
  );
  if (interesting.some((c) => c.status === 'fail')) return 'fail';
  if (interesting.some((c) => c.status === 'warn')) return 'warn';
  if (interesting.every((c) => c.status === 'skip')) return 'skip';
  return 'pass';
}
