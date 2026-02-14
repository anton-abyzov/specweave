import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const pluginsDir = join(projectRoot, 'plugins', 'specweave', 'skills');

/**
 * Validation Tests: E2E Test Execution in Done Skill
 *
 * Ensures that /sw:done detects and runs E2E tests as a blocking
 * gate before increment closure.
 */

describe('ISSUE-3: E2E test execution in done skill Gate 2', () => {
  const skillPath = join(pluginsDir, 'done', 'SKILL.md');

  it('should contain E2E test framework detection logic', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Trimmed skill mentions playwright/cypress detection in Gate 2a
    expect(content).toMatch(/[Dd]etect.*playwright|playwright.*cypress/i);
  });

  it('should reference E2E tests as blocking for closure', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Gate 2a mentions E2E as AUTOMATED, BLOCKING and failure blocks closure
    expect(content).toMatch(/E2E.*BLOCKING|E2E.*failure.*block/i);
  });

  it('should make E2E test passing a BLOCKING requirement for closure', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Trimmed skill says "E2E failure blocks closure"
    expect(content).toMatch(/E2E.*failure.*block.*closure|BLOCKING/i);
  });

  it('should scan repositories/ for multi-repo E2E projects', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Trimmed skill references repositories/*/*-e2e pattern
    expect(content).toMatch(/repositories\/\*\/\*-e2e|repositories.*e2e/i);
  });

  it.skip('should collect ALL E2E dirs when multiple exist in multi-repo', () => {
    // Verbose E2E_DIRS accumulation script removed in 0207-context-pollution-fix
    // Gate 2a now describes behavior declaratively without shell scripts
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/E2E_DIRS\s*\+=/);
  });

  it('should place Gate 2a BEFORE the Gate 2 manual checklist', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Gate 2a (automated) must appear BEFORE Gate 2 (manual PM checks)
    const gate2aIndex = content.search(/Gate 2a.*E2E|Gate 2a.*AUTOMATED/i);
    const gate2ManualIndex = content.search(/Gate 2 -.*Tests Passing/i);
    expect(gate2aIndex).toBeGreaterThan(-1);
    expect(gate2ManualIndex).toBeGreaterThan(-1);
    expect(gate2aIndex).toBeLessThan(gate2ManualIndex);
  });
});
