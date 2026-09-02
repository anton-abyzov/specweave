/**
 * ConfigurationChecker — CLAUDE.md freshness (2.0)
 *
 * The check compares the MAJOR of the SW:META version in CLAUDE.md with the
 * MAJOR of the installed CLI. Only a major gap means the managed block has a
 * different shape and must be regenerated; patch/minor drift is harmless.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('../../../../../src/cli/helpers/init/instruction-file-merger.js', () => ({
  getPackageVersion: () => '2.0.0',
}));

const { ConfigurationChecker } = await import(
  '../../../../../src/core/doctor/checkers/configuration-checker.js'
);

let projectRoot: string;

const claudeMd = (meta: string): string =>
  `${meta}\n# Project\n\n## The loop\n\n1. do the thing\n`;

const claudeMdCheck = async () => {
  const result = await new ConfigurationChecker().check(projectRoot, {});
  const check = result.checks.find(c => c.name === 'CLAUDE.md');
  expect(check, 'CLAUDE.md check is missing').toBeDefined();
  return check!;
};

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'doctor-claude-md-'));
  mkdirSync(join(projectRoot, '.specweave'), { recursive: true });
  writeFileSync(join(projectRoot, '.specweave', 'config.json'), JSON.stringify({ version: '2.0' }));
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

describe('ConfigurationChecker — CLAUDE.md freshness', () => {
  it('warns and points at update-instructions when the file major is behind the CLI major', async () => {
    writeFileSync(
      join(projectRoot, 'CLAUDE.md'),
      claudeMd('<!-- SW:META template="claude" version="1.0.580" sections="loop" -->')
    );

    const check = await claudeMdCheck();

    expect(check.status).toBe('warn');
    expect(check.message).toContain('1.0.580');
    expect(check.fixSuggestion).toBe('Run: specweave update-instructions');
  });

  it('passes when only the minor/patch differs', async () => {
    writeFileSync(
      join(projectRoot, 'CLAUDE.md'),
      claudeMd('<!-- SW:META template="claude" version="2.1.7" sections="loop" -->')
    );

    const check = await claudeMdCheck();

    expect(check.status).toBe('pass');
    expect(check.message).toContain('v2.1.7');
  });

  it('warns that the file is unmanaged when there is no SW:META line', async () => {
    writeFileSync(join(projectRoot, 'CLAUDE.md'), '# Hand-written\n');

    const check = await claudeMdCheck();

    expect(check.status).toBe('warn');
    expect(check.message).toBe('not managed by SpecWeave');
  });

  it('warns when CLAUDE.md is missing entirely', async () => {
    const check = await claudeMdCheck();

    expect(check.status).toBe('warn');
    expect(check.message).toBe('not found');
    expect(check.fixSuggestion).toBe('Run: specweave update');
  });
});
