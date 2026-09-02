import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ConfigurationChecker } from '../../../../../src/core/doctor/checkers/configuration-checker.js';

describe('ConfigurationChecker — config 2.0 shape', () => {
  let dir: string;
  const checker = new ConfigurationChecker();

  const shapeCheck = async () =>
    (await checker.check(dir, {})).checks.find((c) => c.name === 'config 2.0 shape')!;

  const writeConfig = (config: unknown) => {
    fs.mkdirSync(path.join(dir, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.specweave', 'config.json'), JSON.stringify(config, null, 2));
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-doctor-config-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('skips when there is no config.json', async () => {
    expect((await shapeCheck()).status).toBe('skip');
  });

  it('passes a clean 2.0 config', async () => {
    writeConfig({
      version: '2.0',
      project: { name: 'x' },
      testing: { mode: 'TDD', commands: [], coverage: { unit: 95, integration: 90, e2e: 100 } },
      limits: { activeIncrements: 3 },
      planning: { deepInterview: 'off' },
      livingDocs: false,
    });
    const check = await shapeCheck();
    expect(check.status).toBe('pass');
    expect(check.message).toContain('2.0 keys only');
  });

  it('warns on a 1.x version', async () => {
    writeConfig({ version: '1.0', project: { name: 'x' } });
    const check = await shapeCheck();
    expect(check.status).toBe('warn');
    expect(check.message).toContain('expected 2.x');
  });

  it('warns when a 1.x key survived the migration', async () => {
    writeConfig({ version: '2.0', quality: { thinkingBudget: 'xhigh' }, cache: {} });
    const check = await shapeCheck();
    expect(check.status).toBe('warn');
    expect(check.message).toContain('quality');
    expect(check.message).toContain('cache');
    expect(check.fixSuggestion).toContain('specweave update');
  });

  it('warns on a key SpecWeave does not read', async () => {
    writeConfig({ version: '2.0', somethingElse: true });
    const check = await shapeCheck();
    expect(check.status).toBe('warn');
    expect(check.message).toContain('somethingElse');
  });

  it('does not double-report a key as both legacy and unknown', async () => {
    writeConfig({ version: '2.0', reflect: { enabled: true } });
    const check = await shapeCheck();
    expect(check.message).toContain('1.x key(s) still present: reflect');
    expect(check.message).not.toContain('unknown key');
  });

  it('skips when config.json is not valid JSON (the JSON check reports that)', async () => {
    fs.mkdirSync(path.join(dir, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.specweave', 'config.json'), '{ broken');
    expect((await shapeCheck()).status).toBe('skip');
  });
});
