/**
 * Jev (TypeSafe System One) — configuration
 *
 * Precedence: JEV_DEFAULTS <- `.specweave/config.json` "jev" section <- environment.
 *
 * Consent is explicit: `jev.enabled` must be true in the project config (written by
 * `specweave jev setup` after a live ping). `SPECWEAVE_JEV=0` disables Jev for a single
 * process, `SPECWEAVE_JEV=1` enables it ad hoc.
 *
 * Nothing here ever reads, prints or stores an API key VALUE — only env var NAMES.
 *
 * @module core/jev/config
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';

export type JevProvider = 'openrouter' | 'typesafe';

export interface JevConfig {
  enabled: boolean;
  provider: JevProvider;
  model: string;
  apiKeyEnv?: string;
  timeoutMs: number;
  thresholds: { route: number; guardDeny: number; guardWarn: number };
  guards: { bash: boolean };
  modelRouting: boolean;
  browse: { allowDomains: string[]; maxSteps: number };
}

/** Built-in defaults. Jev is OFF until a project opts in. */
export const JEV_DEFAULTS: JevConfig = {
  enabled: false,
  provider: 'openrouter',
  model: 'jev-1.13',
  timeoutMs: 4000,
  thresholds: { route: 0.7, guardDeny: 0.85, guardWarn: 0.5 },
  guards: { bash: false },
  modelRouting: true,
  browse: { allowDomains: [], maxSteps: 20 },
};

/** System One endpoint per provider. */
export const JEV_PROVIDER_ENDPOINT: Record<JevProvider, string> = {
  openrouter: 'https://openrouter.ai/api/v1/systemone',
  typesafe: 'https://api.typesafe.ai/v1/systemone',
};

/** Default model id per provider (used when `model` is not set anywhere). */
export const JEV_PROVIDER_MODEL: Record<JevProvider, string> = {
  openrouter: 'jev-1.13',
  typesafe: 'jev-latest',
};

/** Default API key environment variable NAME per provider. */
export const JEV_PROVIDER_KEY_ENV: Record<JevProvider, string> = {
  openrouter: 'OPENROUTER_API_KEY',
  typesafe: 'TYPESAFE_API_KEY',
};

/** Provider-agnostic fallback key env var NAME. */
export const JEV_FALLBACK_KEY_ENV = 'JEV_API_KEY';

const PROVIDERS: readonly string[] = ['openrouter', 'typesafe'];

function isProvider(value: unknown): value is JevProvider {
  return typeof value === 'string' && PROVIDERS.includes(value);
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * A probability threshold from repo-tracked config, forced into [0, 1].
 *
 * `.specweave/config.json` is a file anyone with commit rights can edit, and the
 * guard verdict is a `>=` comparison: `guardDeny: 5` would be unreachable (every
 * command allowed) and `guardDeny: -1` would deny everything. Clamping keeps a
 * typo or a hostile edit inside the range the comparisons were designed for.
 */
function clamp01(value: unknown, fallback: number): number {
  const n = num(value, fallback);
  return Math.min(1, Math.max(0, n));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Read the raw `jev` section from `<projectRoot>/.specweave/config.json`.
 * Never throws: a missing or malformed config yields `{}`.
 */
function readJevSection(projectRoot: string): Record<string, unknown> {
  try {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) return {};
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return record(record(raw).jev);
  } catch {
    return {};
  }
}

/**
 * Clamped, ordered thresholds.
 *
 * `guardDeny` is raised to `guardWarn` when it is configured lower: deny is the
 * stricter verdict, so a deny bar *below* the warn bar would make a command warn
 * at a probability that already denied it — an ordering the verdict table has no
 * meaning for. Raising deny (rather than lowering warn) keeps the stricter of the
 * two intents.
 */
function thresholds(file: Record<string, unknown>): JevConfig['thresholds'] {
  const route = clamp01(file.route, JEV_DEFAULTS.thresholds.route);
  const guardWarn = clamp01(file.guardWarn, JEV_DEFAULTS.thresholds.guardWarn);
  const guardDeny = Math.max(clamp01(file.guardDeny, JEV_DEFAULTS.thresholds.guardDeny), guardWarn);
  return { route, guardDeny, guardWarn };
}

/**
 * Load the effective Jev config.
 *
 * @param projectRoot - Project root to read `.specweave/config.json` from. Used AS GIVEN
 *                      (no upward walk) so callers stay deterministic; omit it to resolve
 *                      the effective (umbrella-aware) root automatically.
 * @param env         - Environment to read overrides from (defaults to `process.env`).
 */
export function loadJevConfig(projectRoot?: string, env: NodeJS.ProcessEnv = process.env): JevConfig {
  const root = projectRoot ?? resolveEffectiveRoot();
  const file = readJevSection(root);

  const fileThresholds = record(file.thresholds);
  const fileGuards = record(file.guards);
  const fileBrowse = record(file.browse);

  // Provider: env wins, then file, then default.
  const envProvider = str(env.SPECWEAVE_JEV_PROVIDER);
  const provider: JevProvider = isProvider(envProvider)
    ? envProvider
    : isProvider(file.provider)
      ? file.provider
      : JEV_DEFAULTS.provider;

  // Model: env wins, then file, then the provider's default model.
  const model = str(env.SPECWEAVE_JEV_MODEL) ?? str(file.model) ?? JEV_PROVIDER_MODEL[provider];

  // Enabled: SPECWEAVE_JEV=0 forces off, =1 forces on, otherwise the file decides.
  let enabled = bool(file.enabled, JEV_DEFAULTS.enabled);
  const flag = str(env.SPECWEAVE_JEV)?.toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'off') enabled = false;
  else if (flag === '1' || flag === 'true' || flag === 'on') enabled = true;

  const allowDomains = Array.isArray(fileBrowse.allowDomains)
    ? fileBrowse.allowDomains.filter((d): d is string => typeof d === 'string')
    : [...JEV_DEFAULTS.browse.allowDomains];

  return {
    enabled,
    provider,
    model,
    apiKeyEnv: str(file.apiKeyEnv),
    timeoutMs: num(file.timeoutMs, JEV_DEFAULTS.timeoutMs),
    thresholds: thresholds(fileThresholds),
    guards: { bash: bool(fileGuards.bash, JEV_DEFAULTS.guards.bash) },
    modelRouting: bool(file.modelRouting, JEV_DEFAULTS.modelRouting),
    browse: {
      allowDomains,
      maxSteps: num(fileBrowse.maxSteps, JEV_DEFAULTS.browse.maxSteps),
    },
  };
}

/** True when this project (and this process) may call Jev. */
export function isJevEnabled(projectRoot?: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return loadJevConfig(projectRoot, env).enabled;
}

/**
 * Resolve the API key.
 *
 * Order: `cfg.apiKeyEnv` -> the provider's default var -> `JEV_API_KEY`.
 *
 * @returns `{ key, source }` where `source` is the env var NAME (safe to print), or null.
 */
export function resolveApiKey(
  cfg: JevConfig,
  env: NodeJS.ProcessEnv = process.env,
): { key: string; source: string } | null {
  const candidates = [cfg.apiKeyEnv, JEV_PROVIDER_KEY_ENV[cfg.provider], JEV_FALLBACK_KEY_ENV];
  for (const name of candidates) {
    if (!name) continue;
    const value = env[name];
    if (typeof value === 'string' && value.trim()) {
      return { key: value.trim(), source: name };
    }
  }
  return null;
}

/** Endpoint URL for a config's provider. */
export function jevEndpoint(cfg: JevConfig): string {
  return JEV_PROVIDER_ENDPOINT[cfg.provider] ?? JEV_PROVIDER_ENDPOINT.openrouter;
}
