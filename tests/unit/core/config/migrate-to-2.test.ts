/**
 * 1.x → 2.0 config migration.
 *
 * Fixtures are the two real configs the audit measured: the umbrella repo's
 * 27-key config and sw-easychamp's 6-key config.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { migrateTo2, unknownKeys, buildMigrationNote } from '../../../../src/core/config/migrate-to-2.js';
import { ConfigManager } from '../../../../src/core/config/config-manager.js';
import { KNOWN_CONFIG_KEYS } from '../../../../src/core/config/types.js';
import { readLeaseHours } from '../../../../src/core/tasks/resolve-increment.js';

/** The umbrella repo's config: 27 keys, most of them dead by 2.0. */
function umbrellaConfig(): Record<string, unknown> {
  return {
    version: '1.0',
    language: 'en',
    translation: { enabled: false, primary: 'en' },
    project: { name: 'specweave-umb' },
    adapters: { default: 'claude' },
    repository: { provider: 'github', owner: 'anton-abyzov' },
    issueTracker: { provider: 'github', owner: 'anton-abyzov', repo: 'specweave' },
    sync: { enabled: true, mode: 'queued', autoSync: true, settings: { autoSyncOnCompletion: true } },
    statusLine: { enabled: true, maxCacheAge: 30000 },
    workspace: { name: 'specweave-umb', repos: [{ id: 'specweave', prefix: 'SW' }] },
    testing: {
      defaultTestMode: 'TDD',
      defaultCoverageTarget: 90,
      coverageTargets: { unit: 95, integration: 90, e2e: 100 },
      tddEnforcement: 'warn',
      playwright: { preferCli: true },
    },
    limits: { maxActiveIncrements: 7, hardCap: 25, allowEmergencyInterrupt: true, staleness: { days: 14 } },
    deduplication: { enabled: true, windowMs: 1000 },
    archiving: { keepLast: 5 },
    livingDocs: { copyBasedSync: { enabled: true } },
    apiDocs: { enabled: false },
    documentation: { preview: { enabled: true, port: 3015 } },
    pluginAutoLoad: { enabled: true },
    incrementAssist: { enabled: true, confidenceThreshold: 0.7 },
    planning: { deepInterview: { enabled: true, enforcement: 'strict', minQuestions: 5 } },
    cicd: { pushStrategy: 'direct', autoFix: { enabled: true, maxRetries: 1, allowedBranches: ['main'] } },
    contextBudget: { level: 'full' },
    grill: { required: true },
    codeReview: { required: true, maxFixIterations: 3 },
    qualityGates: { preset: 'standard' },
    skillGen: { enabled: true },
    quality: { thinkingBudget: 'xhigh', grillConfidenceThreshold: 50 },
    cache: { staticContextFiles: ['CLAUDE.md'] },
    reflect: { enabled: true },
    banner: { enabled: true, style: 'compact' },
    lsp: { enabled: true },
    hooks: {
      post_task_completion: { sync_tasks_md: true, external_tracker_sync: true },
      post_increment_planning: { auto_create_github_issue: true, sync_living_docs: true },
      post_increment_done: { sync_living_docs: true, close_github_issue: true },
      banner: { enabled: true, throttleHours: 24 },
    },
  };
}

/** sw-easychamp: the minimal config the heaviest user actually runs on. */
function easychampConfig(): Record<string, unknown> {
  return {
    version: '1.0',
    project: { name: 'sw-easychamp' },
    adapters: { default: 'claude' },
    testing: { defaultTestMode: 'test-after', defaultCoverageTarget: 80, coverageTargets: { unit: 80, integration: 70, e2e: 100 } },
    limits: { maxActiveIncrements: 5, hardCap: 10 },
    sync: { enabled: false },
  };
}

describe('migrateTo2', () => {
  it('strips every dead key from the 27-key umbrella config', () => {
    const config = umbrellaConfig();
    const result = migrateTo2(config);

    expect(result.changed).toBe(true);
    expect(unknownKeys(config, KNOWN_CONFIG_KEYS as readonly string[])).toEqual([]);
    for (const dead of [
      'language', 'translation', 'statusLine', 'deduplication', 'archiving', 'apiDocs',
      'documentation', 'pluginAutoLoad', 'incrementAssist', 'contextBudget', 'grill',
      'codeReview', 'qualityGates', 'skillGen', 'quality', 'cache', 'reflect',
      // top-level `banner`: 1.x wrote it both here and under hooks, and only
      // the hooks copy was dropped — leaving an unknown-key warning forever.
      'banner',
    ]) {
      expect(config[dead], dead).toBeUndefined();
    }
    expect(result.removedKeys).toContain('banner');
  });

  it('renames the limits, testing, livingDocs and planning shapes', () => {
    const config = umbrellaConfig();
    migrateTo2(config);

    expect(config.limits).toEqual({ activeIncrements: 7 });
    expect(config.testing).toEqual({
      mode: 'TDD',
      coverage: { unit: 95, integration: 90, e2e: 100 },
    });
    expect(config.livingDocs).toBe('onDone');
    expect(config.planning).toEqual({ deepInterview: 'warn' });
    expect(config.version).toBe('2.0');
  });

  it('drops sync.mode and the dead hook sub-keys but keeps the closure flags', () => {
    const config = umbrellaConfig();
    migrateTo2(config);

    expect((config.sync as Record<string, unknown>).mode).toBeUndefined();
    expect((config.sync as Record<string, unknown>).enabled).toBe(true);
    expect(config.hooks).toEqual({ post_increment_done: { close_github_issue: true } });
  });

  it('keeps the keys that still have readers', () => {
    const config = umbrellaConfig();
    migrateTo2(config);

    expect(config.project).toEqual({ name: 'specweave-umb' });
    expect(config.workspace).toBeDefined();
    expect(config.repository).toBeDefined();
    expect(config.issueTracker).toBeDefined();
    expect(config.cicd).toBeDefined();
    expect(config.lsp).toEqual({ enabled: true });
  });

  it('migrates the 6-key easychamp config', () => {
    const config = easychampConfig();
    const result = migrateTo2(config);

    expect(result.changed).toBe(true);
    expect(config.limits).toEqual({ activeIncrements: 5 });
    expect(config.testing).toEqual({ mode: 'test-after', coverage: { unit: 80, integration: 70, e2e: 100 } });
    // No hooks block at all → living docs stay off.
    expect(config.livingDocs).toBeUndefined();
  });

  it('is idempotent: the second pass reports no change', () => {
    for (const fixture of [umbrellaConfig(), easychampConfig()]) {
      migrateTo2(fixture);
      const second = migrateTo2(fixture);
      expect(second.changed).toBe(false);
      expect(second.removedKeys).toEqual([]);
      expect(second.renamedKeys).toEqual([]);
    }
  });

  it('downgrades an unrecognised deepInterview value to warn (never blocks)', () => {
    const config: Record<string, unknown> = { version: '2.0', planning: { deepInterview: 'strict' } };
    expect(migrateTo2(config).changed).toBe(true);
    expect(config.planning).toEqual({ deepInterview: 'warn' });
  });

  it('leaves an already-2.0 config untouched', () => {
    const config: Record<string, unknown> = {
      version: '2.0',
      project: { name: 'x' },
      testing: { mode: 'TDD', commands: ['npm test'], coverage: { unit: 95, integration: 90, e2e: 100 } },
      limits: { activeIncrements: 3 },
      planning: { deepInterview: 'off' },
      livingDocs: false,
    };
    const before = JSON.parse(JSON.stringify(config));
    expect(migrateTo2(config).changed).toBe(false);
    expect(config).toEqual(before);
  });

  it('buildMigrationNote records what was dropped and renamed', () => {
    const config = umbrellaConfig();
    const result = migrateTo2(config);
    const note = buildMigrationNote(result, '1.0');

    expect(note.from).toBe('1.0');
    expect(note.to).toBe('2.0');
    expect(note.removedKeys).toContain('quality');
    expect(note.renamedKeys.some((r) => r.includes('testing.defaultTestMode'))).toBe(true);
  });
});

describe('ConfigManager migration pass', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-migrate-'));
    fs.mkdirSync(path.join(dir, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const configPath = () => path.join(dir, '.specweave', 'config.json');
  const notePath = () => path.join(dir, '.specweave', 'state', 'config-migration-2.json');

  it('rewrites the file once and writes a migration note', async () => {
    fs.writeFileSync(configPath(), JSON.stringify(easychampConfig(), null, 2));

    await new ConfigManager(dir).read();

    const onDisk = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    expect(onDisk.limits).toEqual({ activeIncrements: 5 });
    expect(onDisk.testing.mode).toBe('test-after');

    const note = JSON.parse(fs.readFileSync(notePath(), 'utf8'));
    expect(note.to).toBe('2.0');
    expect(note.renamedKeys.length).toBeGreaterThan(0);
  });

  it('does not rewrite a config that is already 2.0', async () => {
    const config = easychampConfig();
    migrateTo2(config);
    fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
    const before = fs.readFileSync(configPath(), 'utf8');

    await new ConfigManager(dir).read();

    expect(fs.readFileSync(configPath(), 'utf8')).toBe(before);
    expect(fs.existsSync(notePath())).toBe(false);
  });

  it('warns once, naming every unknown key', async () => {
    fs.writeFileSync(configPath(), JSON.stringify({ version: '2.0', mystery: 1, alsoMystery: 2 }, null, 2));
    const warnings: string[] = [];

    await new ConfigManager(dir, {
      info: () => {}, warn: (m: string) => warnings.push(m), error: () => {}, debug: () => {}, log: () => {},
    } as never).read();

    const unknownWarnings = warnings.filter((w) => w.includes('unknown key'));
    expect(unknownWarnings).toHaveLength(1);
    expect(unknownWarnings[0]).toContain('mystery');
    expect(unknownWarnings[0]).toContain('alsoMystery');
  });

  it('accepts tasks.leaseHours — the documented lease knob is not "unknown"', async () => {
    // `specweave task claim` reads cfg.tasks.leaseHours and both the do and
    // team skills document it, so it must be a declared 2.0 key: otherwise
    // every config load warns at the user for following the docs.
    fs.writeFileSync(configPath(), JSON.stringify({ version: '2.0', tasks: { leaseHours: 6 } }, null, 2));
    const warnings: string[] = [];

    const config = await new ConfigManager(dir, {
      info: () => {}, warn: (m: string) => warnings.push(m), error: () => {}, debug: () => {}, log: () => {},
    } as never).read();

    expect(warnings.filter((w) => w.includes('unknown key'))).toHaveLength(0);
    expect(config.tasks?.leaseHours).toBe(6);
    expect(readLeaseHours(dir)).toBe(6);
  });

  it('composes with the limits migrator — one rewrite, not two', async () => {
    fs.writeFileSync(configPath(), JSON.stringify({
      version: '1.0',
      limits: { maxActiveIncrements: 4, hardCap: 9 },
    }, null, 2));

    await new ConfigManager(dir).read();
    const first = fs.readFileSync(configPath(), 'utf8');

    // A fresh manager on the migrated file must leave it byte-identical.
    await new ConfigManager(dir).read();
    expect(fs.readFileSync(configPath(), 'utf8')).toBe(first);
    expect(JSON.parse(first).limits).toEqual({ activeIncrements: 4 });
  });
});
