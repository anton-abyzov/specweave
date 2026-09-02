/**
 * Tests for ConfigurationChecker
 *
 * - CLAUDE.md freshness compares the SW:META template MAJOR against the CLI major
 *   (read from specweave's own package.json); minor/patch drift passes.
 * - The dead "Opus 4.7 config keys" check is gone.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigurationChecker } from '../../../../../src/core/doctor/checkers/configuration-checker.js';
import { getPackageVersion } from '../../../../../src/cli/helpers/init/instruction-file-merger.js';

let projectRoot: string;

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'doctor-config-'));
  mkdirSync(join(projectRoot, '.specweave'), { recursive: true });
  writeFileSync(join(projectRoot, '.specweave', 'config.json'), JSON.stringify({ version: '2.0' }));
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

function claudeMdWith(version: string): void {
  writeFileSync(
    join(projectRoot, 'CLAUDE.md'),
    `<!-- SW:META template=CLAUDE.md version="${version}" sections="a" -->\n# Test\n`
  );
}

async function claudeCheck() {
  const result = await new ConfigurationChecker().check(projectRoot, {});
  return result.checks.find((c) => c.name === 'CLAUDE.md')!;
}

describe('ConfigurationChecker — CLAUDE.md freshness', () => {
  it('passes when the template major matches the CLI major (minor/patch drift ok)', async () => {
    const major = getPackageVersion().split('.')[0];
    claudeMdWith(`${major}.0.1`);
    const check = await claudeCheck();
    expect(check.status).toBe('pass');
    expect(check.message).toContain(`CLI v${getPackageVersion()}`);
  });

  it('warns when the template major differs from the CLI major', async () => {
    const major = parseInt(getPackageVersion().split('.')[0], 10);
    claudeMdWith(`${major + 1}.0.0`);
    const check = await claudeCheck();
    expect(check.status).toBe('warn');
    expect(check.fixSuggestion).toContain('specweave update');
  });

  it('warns when CLAUDE.md is not managed by SpecWeave', async () => {
    writeFileSync(join(projectRoot, 'CLAUDE.md'), '# plain\n');
    const check = await claudeCheck();
    expect(check.status).toBe('warn');
    expect(check.message).toContain('not managed');
  });

  it('does not emit the removed Opus 4.7 config keys check', async () => {
    claudeMdWith(getPackageVersion());
    const result = await new ConfigurationChecker().check(projectRoot, {});
    expect(result.checks.find((c) => c.name === 'Opus 4.7 config keys')).toBeUndefined();
    const text = result.checks.map((c) => `${c.message} ${c.fixSuggestion ?? ''}`).join('\n');
    expect(text).not.toContain('migrate-config-0669');
  });
});
