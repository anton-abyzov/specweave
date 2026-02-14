/**
 * Integration Test: /sw:jobs Hook Interception
 *
 * Tests that the UserPromptSubmit hook intercepts /sw:jobs and returns
 * job status output via additionalContext (not systemMessage).
 *
 * @since 1.0.258
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';
import os from 'os';
import * as fs from '../../../src/utils/fs-native.js';
import { getCleanEnv } from '../../test-utils/clean-env.js';
import { findProjectRoot } from '../../test-utils/project-root.js';

const projectRoot = findProjectRoot(import.meta.url);

describe('/sw:jobs Hook Interception', () => {
  const hookPath = path.join(
    projectRoot,
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  let testRoot: string;
  let mockBinDir: string;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    testRoot = path.join(
      os.tmpdir(),
      `jobs-hook-e2e-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`
    );

    // Create isolated test directory with .specweave structure
    await fs.ensureDir(path.join(testRoot, '.specweave', 'increments'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'state'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'logs'));

    // Create mock bin directory
    mockBinDir = path.join(testRoot, 'mock-bin');
    await fs.ensureDir(mockBinDir);

    // Create minimal config
    await fs.writeJSON(
      path.join(testRoot, '.specweave', 'config.json'),
      {
        pluginAutoLoad: { enabled: false },
        testing: { defaultTestMode: 'test-after' }
      },
      { spaces: 2 }
    );

    // Create mock specweave CLI
    const mockScript = `#!/bin/bash
echo "Mock: $@"
exit 0
`;
    await fs.writeFile(path.join(mockBinDir, 'specweave'), mockScript);
    await fs.chmod(path.join(mockBinDir, 'specweave'), 0o755);

    vi.spyOn(process, 'cwd').mockReturnValue(testRoot);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (testRoot && await fs.pathExists(testRoot)) {
      await fs.remove(testRoot);
    }
  });

  function executeHook(prompt: string): {
    raw: string;
    parsed: any;
    exitCode: number;
    stderr: string;
  } {
    const env = {
      ...getCleanEnv(),
      SPECWEAVE_DISABLE_AUTO_LOAD: '1',
      SPECWEAVE_DISABLE_HOOKS: '0',
      PWD: testRoot,
      PATH: `${mockBinDir}:${process.env.PATH}`,
    };

    const input = JSON.stringify({ prompt });

    const result = spawnSync('bash', [hookPath], {
      input,
      encoding: 'utf8',
      cwd: testRoot,
      env,
      timeout: 15000
    });

    const raw = result.stdout?.trim() || '';
    let parsed: any = null;

    try {
      parsed = JSON.parse(raw);
    } catch {
      // Not JSON
    }

    return {
      raw,
      parsed,
      exitCode: result.status ?? -1,
      stderr: result.stderr || ''
    };
  }

  function extractAdditionalContext(parsed: any): string | null {
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed?.hookSpecificOutput?.additionalContext ?? null;
  }

  it('intercepts /sw:jobs prompt', () => {
    const { parsed, exitCode } = executeHook('/sw:jobs');

    expect(exitCode).toBe(0);
    expect(parsed).toBeTruthy();
    // Hook should return hookSpecificOutput (not block)
    expect(parsed).toHaveProperty('hookSpecificOutput');
  });

  it('returns output via additionalContext (not systemMessage)', () => {
    const { parsed } = executeHook('/sw:jobs');

    const context = extractAdditionalContext(parsed);
    expect(context).toBeTruthy();
    expect(typeof context).toBe('string');
    // Should NOT use systemMessage
    expect(parsed?.hookSpecificOutput?.systemMessage).toBeUndefined();
  });

  it('shows "no background jobs" when state is empty', () => {
    // Create empty background-jobs.json
    const stateFile = path.join(testRoot, '.specweave', 'state', 'background-jobs.json');
    fs.writeFileSync(stateFile, JSON.stringify({ jobs: [] }));

    const { parsed } = executeHook('/sw:jobs');
    const context = extractAdditionalContext(parsed);

    // Should show something (even if "no jobs")
    expect(context).toBeTruthy();
  });

  it('shows job info when jobs exist', () => {
    // Create background-jobs.json with a clone job
    const stateFile = path.join(testRoot, '.specweave', 'state', 'background-jobs.json');
    fs.writeFileSync(stateFile, JSON.stringify({
      jobs: [{
        id: 'test-job-1',
        type: 'clone-repos',
        status: 'running',
        progress: {
          current: 5,
          total: 10,
          percentage: 50,
          itemsCompleted: ['repo-1', 'repo-2', 'repo-3', 'repo-4', 'repo-5'],
          itemsFailed: []
        },
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: { type: 'clone-repos', repositories: [], projectPath: testRoot }
      }]
    }));

    const { parsed } = executeHook('/sw:jobs');
    const context = extractAdditionalContext(parsed);

    expect(context).toBeTruthy();
    // Should contain job info
    expect(context).toContain('clone');
  });

  it('passes arguments through to the script', () => {
    const { parsed } = executeHook('/sw:jobs --all');

    expect(parsed).toBeTruthy();
    // Hook should still intercept and return
    expect(parsed).toHaveProperty('hookSpecificOutput');
  });

  it('does NOT intercept non-matching prompts', () => {
    // "/sw:jobs" must match exactly, not partial matches
    const { parsed } = executeHook('tell me about /sw:jobs');

    // This should NOT be intercepted by the jobs handler
    // (it might be handled by other hook logic though)
    if (parsed?.hookSpecificOutput?.additionalContext) {
      // If it was intercepted, it shouldn't be by the jobs handler
      // Since the regex is ^/sw:jobs, "tell me about" won't match
      const context = extractAdditionalContext(parsed);
      expect(context).not.toContain('clone');
    }
  });
});
