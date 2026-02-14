/**
 * Tests for create-increment CLI command
 *
 * Validates that the CLI command wraps createIncrementTemplates()
 * and properly bridges SKILL.md -> CLI -> file persistence.
 *
 * @module create-increment.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('create-increment CLI command', () => {
  let tempDir: string;
  let incrementsPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-create-inc-'));
    const specweavePath = path.join(tempDir, '.specweave');
    incrementsPath = path.join(specweavePath, 'increments');
    fs.mkdirSync(incrementsPath, { recursive: true });

    // Create minimal config.json
    fs.writeFileSync(
      path.join(specweavePath, 'config.json'),
      JSON.stringify({
        project: { name: 'test-project' },
        testing: { defaultTestMode: 'test-after', defaultCoverageTarget: 80 },
      })
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should export createIncrementCommand function', async () => {
    const mod = await import('../../../../src/cli/commands/create-increment.js');
    expect(typeof mod.createIncrementCommand).toBe('function');
  });

  it('should create all four increment files via CLI command', async () => {
    const { createIncrementCommand } = await import(
      '../../../../src/cli/commands/create-increment.js'
    );

    await createIncrementCommand({
      id: '0001-test-feature',
      title: 'Test Feature',
      description: 'A test feature',
      project: 'test-project',
      projectRoot: tempDir,
    });

    const incPath = path.join(incrementsPath, '0001-test-feature');
    expect(fs.existsSync(path.join(incPath, 'metadata.json'))).toBe(true);
    expect(fs.existsSync(path.join(incPath, 'spec.md'))).toBe(true);
    expect(fs.existsSync(path.join(incPath, 'plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(incPath, 'tasks.md'))).toBe(true);
  });

  it('should create spec.md as a template with markers', async () => {
    const { createIncrementCommand } = await import(
      '../../../../src/cli/commands/create-increment.js'
    );

    await createIncrementCommand({
      id: '0001-test-feature',
      title: 'Test Feature',
      description: 'A test feature',
      project: 'test-project',
      projectRoot: tempDir,
    });

    const specPath = path.join(incrementsPath, '0001-test-feature', 'spec.md');
    const content = fs.readFileSync(specPath, 'utf-8');
    expect(content).toContain('[Story Title]');
    expect(content).toContain('[user type]');
    expect(content).toContain('TEMPLATE FILE');
  });

  it('should set metadata with correct type and priority', async () => {
    const { createIncrementCommand } = await import(
      '../../../../src/cli/commands/create-increment.js'
    );

    await createIncrementCommand({
      id: '0001-hotfix',
      title: 'Critical Hotfix',
      description: 'Fix prod issue',
      project: 'test-project',
      type: 'hotfix',
      priority: 'P1',
      projectRoot: tempDir,
    });

    const metaPath = path.join(incrementsPath, '0001-hotfix', 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    expect(metadata.type).toBe('hotfix');
    expect(metadata.priority).toBe('P1');
    expect(metadata.status).toBe('planned');
  });

  it('should pass board option for 2-level structures', async () => {
    const { createIncrementCommand } = await import(
      '../../../../src/cli/commands/create-increment.js'
    );

    await createIncrementCommand({
      id: '0001-board-feature',
      title: 'Board Feature',
      description: 'Feature with board',
      project: 'my-project',
      board: 'frontend-team',
      projectRoot: tempDir,
    });

    const specPath = path.join(incrementsPath, '0001-board-feature', 'spec.md');
    const content = fs.readFileSync(specPath, 'utf-8');
    expect(content).toContain('**Board**: frontend-team');
  });

  it('should output JSON result to stdout when --json flag is used', async () => {
    const { createIncrementCommand } = await import(
      '../../../../src/cli/commands/create-increment.js'
    );

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createIncrementCommand({
      id: '0001-json-test',
      title: 'JSON Test',
      description: 'Test JSON output',
      project: 'test-project',
      json: true,
      projectRoot: tempDir,
    });

    // Find the JSON output call
    const jsonCall = consoleSpy.mock.calls.find((call) => {
      try {
        JSON.parse(call[0] as string);
        return true;
      } catch {
        return false;
      }
    });

    expect(jsonCall).toBeDefined();
    const output = JSON.parse(jsonCall![0] as string);
    expect(output.success).toBe(true);
    expect(output.incrementPath).toContain('0001-json-test');
    expect(output.createdFiles).toContain('metadata.json');

    consoleSpy.mockRestore();
  });

  it('should fail gracefully for duplicate increment IDs', async () => {
    const { createIncrementCommand } = await import(
      '../../../../src/cli/commands/create-increment.js'
    );

    // Create first increment
    await createIncrementCommand({
      id: '0001-first',
      title: 'First',
      description: 'First increment',
      project: 'test-project',
      projectRoot: tempDir,
    });

    // Try duplicate - should fail gracefully (not throw)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      createIncrementCommand({
        id: '0001-second',
        title: 'Second',
        description: 'Duplicate number',
        project: 'test-project',
        projectRoot: tempDir,
      })
    ).rejects.toThrow();

    consoleSpy.mockRestore();
  });

  it('should use defaults for optional parameters', async () => {
    const { createIncrementCommand } = await import(
      '../../../../src/cli/commands/create-increment.js'
    );

    await createIncrementCommand({
      id: '0001-defaults',
      title: 'Default Test',
      description: 'Testing defaults',
      project: 'test-project',
      projectRoot: tempDir,
    });

    const metaPath = path.join(incrementsPath, '0001-defaults', 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    expect(metadata.type).toBe('feature');
    expect(metadata.priority).toBe('P1');
  });
});
