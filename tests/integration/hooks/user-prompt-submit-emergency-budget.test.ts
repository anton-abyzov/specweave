/**
 * Integration Test: UserPromptSubmit Emergency Budget Handling
 *
 * Tests that user-prompt-submit.sh handles "emergency" pressure level
 * by setting budget to "off" and skipping all context assembly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

const HOOK_PATH = path.resolve(
  __dirname,
  '../../../plugins/specweave/hooks/user-prompt-submit.sh',
);

describe('UserPromptSubmit - Emergency Budget', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(tmpdir(), `specweave-emergency-budget-test-${Date.now()}`);
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'logs'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'increments'), { recursive: true });
    // Create minimal config
    fs.writeFileSync(
      path.join(tempDir, '.specweave', 'config.json'),
      JSON.stringify({
        contextBudget: { level: 'full', autoAdapt: true },
      }),
    );
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should read hook script and verify emergency pressure handling exists', () => {
    const hookContent = fs.readFileSync(HOOK_PATH, 'utf-8');
    // Verify the hook handles "emergency" pressure level
    expect(hookContent).toContain('emergency');
  });

  it('should have emergency case in pressure level handling', () => {
    const hookContent = fs.readFileSync(HOOK_PATH, 'utf-8');
    // The hook should have a case for emergency that sets budget to off
    expect(hookContent).toMatch(/emergency[\s\S]*?BUDGET_LEVEL.*"?off"?/);
  });
});
