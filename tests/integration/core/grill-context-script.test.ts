/**
 * Grill Context Script Integration Tests
 *
 * Tests for read-grill-context.sh - the bash script that loads
 * increment context for the /sw:grill code review command.
 *
 * The script outputs structured context that gets injected via
 * the UserPromptSubmit hook's additionalContext field.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as os from 'os';
import { getCleanEnv } from '../../test-utils/clean-env.js';

describe('read-grill-context.sh', () => {
  let testDir: string;
  let incrementsDir: string;
  let stateDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-grill-test-'));
    const specweaveDir = path.join(testDir, '.specweave');
    incrementsDir = path.join(specweaveDir, 'increments');
    stateDir = path.join(specweaveDir, 'state');

    fs.mkdirSync(incrementsDir, { recursive: true });
    fs.mkdirSync(stateDir, { recursive: true });

    // Create minimal config.json
    fs.writeFileSync(
      path.join(specweaveDir, 'config.json'),
      JSON.stringify({ testing: {} }, null, 2)
    );
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  function createIncrement(
    id: string,
    opts: {
      status?: string;
      type?: string;
      priority?: string;
      tasks?: { total: number; completed: number };
      specACs?: { total: number; completed: number };
    } = {}
  ): void {
    const {
      status = 'active',
      type = 'feature',
      priority = 'P1',
      tasks = { total: 0, completed: 0 },
      specACs = { total: 0, completed: 0 },
    } = opts;

    const incDir = path.join(incrementsDir, id);
    fs.mkdirSync(incDir, { recursive: true });

    fs.writeFileSync(
      path.join(incDir, 'metadata.json'),
      JSON.stringify({ id, status, type, priority }, null, 2)
    );

    // Create tasks.md
    if (tasks.total > 0) {
      let content = '# Tasks\n\n';
      for (let i = 1; i <= tasks.total; i++) {
        const done = i <= tasks.completed;
        content += `### T-${String(i).padStart(3, '0')}: Task ${i}\n`;
        content += `**User Story**: US-001 | **Satisfies ACs**: AC-US1-${String(i).padStart(2, '0')}\n`;
        content += `**Status**: [${done ? 'x' : ' '}] ${done ? 'completed' : 'pending'}\n\n`;
      }
      fs.writeFileSync(path.join(incDir, 'tasks.md'), content);
    }

    // Create spec.md with ACs
    if (specACs.total > 0) {
      let content = '# Specification\n\n## User Stories\n\n### US-001: Test Story\n\n#### Acceptance Criteria\n\n';
      for (let i = 1; i <= specACs.total; i++) {
        const done = i <= specACs.completed;
        content += `- [${done ? 'x' : ' '}] **AC-US1-${String(i).padStart(2, '0')}**: Criterion ${i}\n`;
      }
      fs.writeFileSync(path.join(incDir, 'spec.md'), content);
    }
  }

  function setActiveIncrement(incrementId: string): void {
    fs.writeFileSync(
      path.join(stateDir, 'active-increment.json'),
      JSON.stringify({ ids: [incrementId] }, null, 2)
    );
  }

  function runGrillContext(args: string = ''): string {
    const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/read-grill-context.sh');

    try {
      return execSync(`bash "${scriptPath}" ${args}`, {
        cwd: testDir,
        env: { ...getCleanEnv(), PWD: testDir, HOME: os.homedir() },
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (error: any) {
      return error.stdout || error.message;
    }
  }

  it('should output grill mode header', () => {
    createIncrement('0042-auth-feature', {
      status: 'active',
      tasks: { total: 5, completed: 3 },
      specACs: { total: 4, completed: 2 },
    });

    const output = runGrillContext('0042-auth-feature');

    expect(output).toContain('GRILL MODE');
    expect(output).toContain('0042-auth-feature');
  });

  it('should show task completion stats', () => {
    createIncrement('0042-auth-feature', {
      tasks: { total: 8, completed: 5 },
    });

    const output = runGrillContext('0042-auth-feature');

    expect(output).toContain('5/8');
    expect(output).toMatch(/62%|63%/); // rounding
  });

  it('should show AC completion stats', () => {
    createIncrement('0042-auth-feature', {
      specACs: { total: 6, completed: 4 },
    });

    const output = runGrillContext('0042-auth-feature');

    expect(output).toContain('4/6');
    expect(output).toMatch(/66%|67%/); // rounding
  });

  it('should show increment metadata (type, priority)', () => {
    createIncrement('0042-auth-feature', {
      type: 'feature',
      priority: 'P0',
    });

    const output = runGrillContext('0042-auth-feature');

    expect(output).toContain('feature');
    expect(output).toContain('P0');
  });

  it('should auto-detect active increment when no ID given', () => {
    createIncrement('0042-auth-feature', {
      tasks: { total: 4, completed: 2 },
    });
    setActiveIncrement('0042-auth-feature');

    const output = runGrillContext('');

    expect(output).toContain('0042-auth-feature');
    expect(output).toContain('GRILL MODE');
  });

  it('should support partial ID matching', () => {
    createIncrement('0042-auth-feature', {
      tasks: { total: 3, completed: 1 },
    });

    const output = runGrillContext('0042');

    expect(output).toContain('0042-auth-feature');
  });

  it('should show error when increment not found', () => {
    const output = runGrillContext('9999');

    expect(output).toMatch(/not found|no.*increment/i);
  });

  it('should include grill instructions for the LLM', () => {
    createIncrement('0042-auth-feature', {
      tasks: { total: 2, completed: 1 },
    });

    const output = runGrillContext('0042-auth-feature');

    // Must contain structured review instructions
    expect(output).toMatch(/correctness|security|performance|maintainability/i);
    expect(output).toMatch(/BLOCKER|CRITICAL/);
  });

  it('should include verdict instructions', () => {
    createIncrement('0042-auth-feature', {
      tasks: { total: 2, completed: 1 },
    });

    const output = runGrillContext('0042-auth-feature');

    expect(output).toMatch(/PASS|FAIL/);
  });

  it('should handle increment with no tasks.md gracefully', () => {
    createIncrement('0042-empty', {});
    // Remove tasks.md (createIncrement with 0 tasks doesn't create it)

    const output = runGrillContext('0042-empty');

    expect(output).toContain('0042-empty');
    expect(output).toContain('GRILL MODE');
  });
});
