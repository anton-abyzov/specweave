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
    expect(content).toMatch(/detect.*e2e|e2e.*detect|scan.*e2e/i);
    expect(content).toMatch(/playwright\.config|cypress\.config/i);
  });

  it('should contain commands to actually RUN E2E tests', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Must have actual test execution commands, not just narrative
    expect(content).toMatch(/npx playwright test|npx cypress run|npm run.*e2e|pnpm.*test.*e2e/i);
  });

  it('should make E2E test passing a BLOCKING requirement for closure', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/BLOCK.*e2e.*clos|e2e.*fail.*cannot.*close|e2e.*BLOCK.*closure/i);
  });

  it('should scan repositories/ for multi-repo E2E projects', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/repositories\/.*e2e|multi.*repo.*e2e|scan.*repositories/i);
  });

  it('should collect ALL E2E dirs when multiple exist in multi-repo', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Step 2 must iterate over collected dirs — needs a loop in the run section
    // The run section (Step 2) must handle multiple dirs, not just a single E2E_DIR
    // Look for array accumulation pattern (E2E_DIRS+=) and iteration over them
    expect(content).toMatch(/E2E_DIRS\s*\+=/);
  });

  it('should place Gate 2a BEFORE the Gate 2 manual checklist', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Gate 2a (automated) must appear BEFORE Gate 2 (manual PM checks)
    const gate2aIndex = content.search(/Gate 2a.*E2E.*Execution|Gate 2a.*AUTOMATED/i);
    const gate2ManualIndex = content.search(/Gate 2.*Tests Passing/i);
    expect(gate2aIndex).toBeGreaterThan(-1);
    expect(gate2ManualIndex).toBeGreaterThan(-1);
    expect(gate2aIndex).toBeLessThan(gate2ManualIndex);
  });
});
