/**
 * Tests for ConfigurationChecker Opus 4.7 key reporting (0669 Wave 2c, T-041/T-042)
 *
 * Behavior under test:
 * - When .specweave/config.json is missing `quality.thinkingBudget`,
 *   `quality.grillConfidenceThreshold`, `quality.tokenBudgets`, or
 *   `cache.staticContextFiles`, the configuration checker emits a warning
 *   for each missing key and suggests the migrate-config-0669 script.
 * - A config that already has all four keys produces no such warnings.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigurationChecker } from '../../../../../src/core/doctor/checkers/configuration-checker.js';

let projectRoot: string;

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'doctor-config-'));
  mkdirSync(join(projectRoot, '.specweave'), { recursive: true });
  writeFileSync(
    join(projectRoot, 'CLAUDE.md'),
    '# Test\nSpecWeave framework **version 1.0.183**\n'
  );
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

describe('ConfigurationChecker — Opus 4.7 key reporting', () => {
  it('warns about missing quality.thinkingBudget when absent', async () => {
    writeFileSync(join(projectRoot, '.specweave', 'config.json'), JSON.stringify({ version: '2.0' }));

    const result = await new ConfigurationChecker().check(projectRoot, {});

    const allMessages = result.checks.flatMap((c) => [c.message, ...(c.details ?? [])]).join('\n');
    expect(allMessages).toContain('quality.thinkingBudget');
  });

  it('warns about missing cache.staticContextFiles when absent', async () => {
    writeFileSync(join(projectRoot, '.specweave', 'config.json'), JSON.stringify({ version: '2.0' }));

    const result = await new ConfigurationChecker().check(projectRoot, {});

    const allMessages = result.checks.flatMap((c) => [c.message, ...(c.details ?? [])]).join('\n');
    expect(allMessages).toContain('cache.staticContextFiles');
  });

  it('warns about missing quality.grillConfidenceThreshold and quality.tokenBudgets', async () => {
    writeFileSync(join(projectRoot, '.specweave', 'config.json'), JSON.stringify({ version: '2.0' }));

    const result = await new ConfigurationChecker().check(projectRoot, {});

    const allMessages = result.checks.flatMap((c) => [c.message, ...(c.details ?? [])]).join('\n');
    expect(allMessages).toContain('quality.grillConfidenceThreshold');
    expect(allMessages).toContain('quality.tokenBudgets');
  });

  it('suggests the migrate-config-0669 script when keys are missing', async () => {
    writeFileSync(join(projectRoot, '.specweave', 'config.json'), JSON.stringify({ version: '2.0' }));

    const result = await new ConfigurationChecker().check(projectRoot, {});

    const fixSuggestions = result.checks
      .map((c) => c.fixSuggestion ?? '')
      .filter((s) => s.length > 0)
      .join('\n');
    expect(fixSuggestions).toContain('migrate-config-0669');
  });

  it('does not warn about Opus 4.7 keys when all are present', async () => {
    writeFileSync(
      join(projectRoot, '.specweave', 'config.json'),
      JSON.stringify({
        version: '2.0',
        quality: {
          thinkingBudget: 'xhigh',
          grillConfidenceThreshold: 50,
          tokenBudgets: { 'pm.interview': 1500, 'brainstorm.idea': 1800 },
        },
        cache: { staticContextFiles: ['CLAUDE.md'] },
      })
    );

    const result = await new ConfigurationChecker().check(projectRoot, {});

    const opus47Check = result.checks.find((c) => c.name === 'Opus 4.7 config keys');
    expect(opus47Check?.status).toBe('pass');
  });
});
