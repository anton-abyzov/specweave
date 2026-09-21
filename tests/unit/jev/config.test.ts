/**
 * Jev config precedence, API-key resolution (env var NAMES only) and the usage ledger.
 *
 * All fixtures live in os.tmpdir(); no real credential is read or written.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  JEV_DEFAULTS,
  JEV_PROVIDER_KEY_ENV,
  isJevEnabled,
  jevEndpoint,
  loadJevConfig,
  resolveApiKey,
} from '../../../src/core/jev/config.js';
import { appendUsage, readUsageSummary, usageLogPath } from '../../../src/core/jev/usage.js';

let root: string;

function writeConfig(jev: unknown): void {
  const dir = path.join(root, '.specweave');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ version: '2.0', jev }, null, 2));
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-config-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('loadJevConfig', () => {
  it('returns the built-in defaults when no config file exists', () => {
    expect(loadJevConfig(root, {})).toEqual(JEV_DEFAULTS);
  });

  it('is disabled by default so nothing calls Jev without consent', () => {
    expect(JEV_DEFAULTS.enabled).toBe(false);
    expect(isJevEnabled(root, {})).toBe(false);
  });

  it('merges the config file over the defaults', () => {
    writeConfig({
      enabled: true,
      timeoutMs: 2500,
      thresholds: { guardDeny: 0.95 },
      guards: { bash: true },
      modelRouting: false,
      browse: { allowDomains: ['example.com'], maxSteps: 5 },
    });
    const cfg = loadJevConfig(root, {});
    expect(cfg.enabled).toBe(true);
    expect(cfg.timeoutMs).toBe(2500);
    expect(cfg.thresholds).toEqual({ route: 0.7, guardDeny: 0.95, guardWarn: 0.5 });
    expect(cfg.guards.bash).toBe(true);
    expect(cfg.modelRouting).toBe(false);
    expect(cfg.browse).toEqual({ allowDomains: ['example.com'], maxSteps: 5 });
  });

  it('applies the provider default model when the model is unset', () => {
    writeConfig({ enabled: true, provider: 'typesafe' });
    expect(loadJevConfig(root, {}).model).toBe('jev-latest');
    writeConfig({ enabled: true, provider: 'openrouter' });
    expect(loadJevConfig(root, {}).model).toBe('jev-1.13');
  });

  it('keeps an explicit model from the config file', () => {
    writeConfig({ enabled: true, provider: 'typesafe', model: 'jev-1.13' });
    expect(loadJevConfig(root, {}).model).toBe('jev-1.13');
  });

  it('lets SPECWEAVE_JEV=0 force Jev off', () => {
    writeConfig({ enabled: true });
    expect(loadJevConfig(root, { SPECWEAVE_JEV: '0' }).enabled).toBe(false);
    expect(isJevEnabled(root, { SPECWEAVE_JEV: 'false' })).toBe(false);
  });

  it('lets SPECWEAVE_JEV=1 force Jev on', () => {
    writeConfig({ enabled: false });
    expect(loadJevConfig(root, { SPECWEAVE_JEV: '1' }).enabled).toBe(true);
    expect(isJevEnabled(root, { SPECWEAVE_JEV: 'true' })).toBe(true);
  });

  it('lets env override provider and model', () => {
    writeConfig({ enabled: true, provider: 'openrouter', model: 'jev-1.13' });
    const cfg = loadJevConfig(root, {
      SPECWEAVE_JEV_PROVIDER: 'typesafe',
      SPECWEAVE_JEV_MODEL: 'jev-experimental',
    });
    expect(cfg.provider).toBe('typesafe');
    expect(cfg.model).toBe('jev-experimental');
    expect(jevEndpoint(cfg)).toBe('https://api.typesafe.ai/v1/systemone');
  });

  it('takes the provider default model when only the provider is overridden by env', () => {
    writeConfig({ enabled: true });
    expect(loadJevConfig(root, { SPECWEAVE_JEV_PROVIDER: 'typesafe' }).model).toBe('jev-latest');
  });

  it('ignores an unknown provider and malformed values', () => {
    writeConfig({ enabled: 'yes', provider: 'gpt', timeoutMs: 'fast', thresholds: 42 });
    const cfg = loadJevConfig(root, { SPECWEAVE_JEV_PROVIDER: 'nope' });
    expect(cfg.provider).toBe('openrouter');
    expect(cfg.enabled).toBe(false);
    expect(cfg.timeoutMs).toBe(JEV_DEFAULTS.timeoutMs);
    expect(cfg.thresholds).toEqual(JEV_DEFAULTS.thresholds);
  });

  // `.specweave/config.json` is repo-tracked: a typo or a hostile edit must not be
  // able to make the guard unreachable (deny at 5) or absolute (deny at -1).
  it('clamps every threshold into [0, 1]', () => {
    writeConfig({ enabled: true, thresholds: { route: 5, guardDeny: 42, guardWarn: -3 } });
    expect(loadJevConfig(root, {}).thresholds).toEqual({ route: 1, guardDeny: 1, guardWarn: 0 });

    writeConfig({ enabled: true, thresholds: { route: -0.5, guardDeny: 1.2, guardWarn: 0.4 } });
    expect(loadJevConfig(root, {}).thresholds).toEqual({ route: 0, guardDeny: 1, guardWarn: 0.4 });
  });

  it('falls back to the default for a non-numeric or NaN threshold', () => {
    writeConfig({ enabled: true, thresholds: { route: 'high', guardDeny: null, guardWarn: [] } });
    expect(loadJevConfig(root, {}).thresholds).toEqual(JEV_DEFAULTS.thresholds);
  });

  // deny is the stricter verdict: a deny bar below the warn bar has no meaning.
  it('raises guardDeny to guardWarn when it is configured lower', () => {
    writeConfig({ enabled: true, thresholds: { guardDeny: 0.2, guardWarn: 0.8 } });
    expect(loadJevConfig(root, {}).thresholds).toEqual({ route: 0.7, guardDeny: 0.8, guardWarn: 0.8 });
  });

  it('never lowers guardWarn to satisfy the ordering', () => {
    writeConfig({ enabled: true, thresholds: { guardDeny: 0.9, guardWarn: 0.6 } });
    expect(loadJevConfig(root, {}).thresholds).toEqual({ route: 0.7, guardDeny: 0.9, guardWarn: 0.6 });
  });

  it('clamps before ordering, so an out-of-range pair still lands in [0, 1]', () => {
    writeConfig({ enabled: true, thresholds: { guardDeny: -4, guardWarn: 9 } });
    const { guardDeny, guardWarn } = loadJevConfig(root, {}).thresholds;
    expect(guardWarn).toBe(1);
    expect(guardDeny).toBe(1);
  });

  it('survives a corrupt config.json', () => {
    fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{ not json');
    expect(loadJevConfig(root, {})).toEqual(JEV_DEFAULTS);
  });

  it('never mutates the shared defaults object', () => {
    writeConfig({ enabled: true, thresholds: { route: 0.1 }, browse: { allowDomains: ['x.com'] } });
    loadJevConfig(root, {});
    expect(JEV_DEFAULTS.thresholds.route).toBe(0.7);
    expect(JEV_DEFAULTS.browse.allowDomains).toEqual([]);
  });
});

describe('resolveApiKey', () => {
  const cfg = (over: Partial<ReturnType<typeof loadJevConfig>> = {}) => ({ ...JEV_DEFAULTS, ...over });

  it('prefers the configured apiKeyEnv and reports its NAME as the source', () => {
    const result = resolveApiKey(cfg({ apiKeyEnv: 'MY_JEV_KEY' }), {
      MY_JEV_KEY: 'value-a',
      OPENROUTER_API_KEY: 'value-b',
    });
    expect(result).toEqual({ key: 'value-a', source: 'MY_JEV_KEY' });
  });

  it('falls back to the provider default variable', () => {
    expect(resolveApiKey(cfg(), { OPENROUTER_API_KEY: 'value-b' })).toEqual({
      key: 'value-b',
      source: 'OPENROUTER_API_KEY',
    });
    expect(resolveApiKey(cfg({ provider: 'typesafe' }), { TYPESAFE_API_KEY: 'value-c' })).toEqual({
      key: 'value-c',
      source: 'TYPESAFE_API_KEY',
    });
  });

  it('falls back to JEV_API_KEY for either provider', () => {
    expect(resolveApiKey(cfg(), { JEV_API_KEY: 'value-d' })).toEqual({
      key: 'value-d',
      source: 'JEV_API_KEY',
    });
  });

  it('skips empty and whitespace-only variables', () => {
    expect(resolveApiKey(cfg({ apiKeyEnv: 'MY_JEV_KEY' }), { MY_JEV_KEY: '   ', JEV_API_KEY: 'x' })).toEqual({
      key: 'x',
      source: 'JEV_API_KEY',
    });
  });

  it('returns null when nothing is set', () => {
    expect(resolveApiKey(cfg(), {})).toBeNull();
  });

  it('exposes the provider key variable names', () => {
    expect(JEV_PROVIDER_KEY_ENV).toEqual({
      openrouter: 'OPENROUTER_API_KEY',
      typesafe: 'TYPESAFE_API_KEY',
    });
  });
});

describe('usage ledger', () => {
  const rec = (kind: string, cost: number) => ({
    at: '2026-09-21T10:00:00.000Z',
    kind,
    provider: 'openrouter',
    model: 'jev-1.13',
    input_tokens: 100,
    output_tokens: 10,
    cost,
    latencyMs: 250,
    ok: true,
  });

  it('round-trips appended records into a summary', () => {
    appendUsage(root, rec('route', 0.00001));
    appendUsage(root, { ...rec('guard', 0.00002), at: '2026-09-20T10:00:00.000Z' });
    appendUsage(root, rec('guard', 0.00003));

    const summary = readUsageSummary(root);
    expect(summary.calls).toBe(3);
    expect(summary.input_tokens).toBe(300);
    expect(summary.cost).toBeCloseTo(0.00006, 8);
    expect(summary.byKind).toEqual({ route: 1, guard: 2 });
    expect(summary.since).toBe('2026-09-20T10:00:00.000Z');
  });

  it('writes to .specweave/state/jev-usage.jsonl and creates the directory', () => {
    appendUsage(root, rec('ask', 0.00001));
    const file = usageLogPath(root);
    expect(file).toBe(path.join(root, '.specweave', 'state', 'jev-usage.jsonl'));
    expect(fs.readFileSync(file, 'utf-8').trim().split('\n')).toHaveLength(1);
  });

  it('never stores anything that looks like a key', () => {
    appendUsage(root, rec('ask', 0.00001));
    const content = fs.readFileSync(usageLogPath(root), 'utf-8');
    expect(content).not.toMatch(/Authorization|Bearer|API_KEY/);
  });

  it('skips corrupt lines instead of throwing', () => {
    appendUsage(root, rec('route', 0.00001));
    fs.appendFileSync(usageLogPath(root), 'not json\n\n');
    appendUsage(root, rec('route', 0.00001));
    const summary = readUsageSummary(root);
    expect(summary.calls).toBe(2);
  });

  it('returns zeroes when the ledger does not exist', () => {
    expect(readUsageSummary(root)).toEqual({ calls: 0, input_tokens: 0, cost: 0, byKind: {} });
  });

  it('does not throw when the ledger path is unwritable', () => {
    expect(() => appendUsage(path.join(root, 'nope', '\0bad'), rec('ask', 0))).not.toThrow();
  });
});
