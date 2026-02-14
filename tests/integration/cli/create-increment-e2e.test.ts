/**
 * End-to-end integration test for create-increment CLI command
 *
 * Validates the complete flow: CLI invocation -> file persistence on disk.
 * This test runs the actual CLI binary via child_process to verify
 * the command works as the SKILL.md would invoke it.
 *
 * @module create-increment-e2e.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const CLI_PATH = path.resolve(__dirname, '../../../bin/specweave.js');

describe('create-increment CLI e2e', () => {
  let tempDir: string;
  let incrementsPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-e2e-create-inc-'));
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

  it('should create increment files when invoked via CLI binary', () => {
    const result = execSync(
      `node "${CLI_PATH}" create-increment ` +
        `--id "0001-cli-test" ` +
        `--title "CLI Test Feature" ` +
        `--description "Testing CLI persistence" ` +
        `--project "test-project" ` +
        `--json`,
      { cwd: tempDir, encoding: 'utf-8' }
    );

    // Parse JSON output
    const output = JSON.parse(result.trim().split('\n').pop()!);
    expect(output.success).toBe(true);
    expect(output.createdFiles).toContain('metadata.json');
    expect(output.createdFiles).toContain('spec.md');
    expect(output.createdFiles).toContain('plan.md');
    expect(output.createdFiles).toContain('tasks.md');

    // Verify files actually exist on disk
    const incPath = path.join(incrementsPath, '0001-cli-test');
    expect(fs.existsSync(path.join(incPath, 'metadata.json'))).toBe(true);
    expect(fs.existsSync(path.join(incPath, 'spec.md'))).toBe(true);
    expect(fs.existsSync(path.join(incPath, 'plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(incPath, 'tasks.md'))).toBe(true);

    // Verify metadata content
    const metadata = JSON.parse(
      fs.readFileSync(path.join(incPath, 'metadata.json'), 'utf-8')
    );
    expect(metadata.id).toBe('0001-cli-test');
    expect(metadata.status).toBe('planned');
    expect(metadata.type).toBe('feature');
  });

  it('should create spec.md as template (not full content) via CLI', () => {
    execSync(
      `node "${CLI_PATH}" create-increment ` +
        `--id "0001-template-check" ` +
        `--title "Template Check" ` +
        `--description "Verify templates" ` +
        `--project "test-project"`,
      { cwd: tempDir, encoding: 'utf-8' }
    );

    const specPath = path.join(incrementsPath, '0001-template-check', 'spec.md');
    const content = fs.readFileSync(specPath, 'utf-8');

    // Must be a template with markers
    expect(content).toContain('[Story Title]');
    expect(content).toContain('[user type]');
    expect(content).toContain('[goal]');
    expect(content).toContain('[benefit]');
    expect(content).toContain('TEMPLATE FILE - MUST BE COMPLETED VIA PM/ARCHITECT SKILLS');

    // Must NOT contain real user stories
    expect(content).not.toMatch(/\*\*As a\*\* new user/);
    expect(content).not.toMatch(/\*\*As a\*\* registered user/);
  });

  it('should pass type and priority options through CLI', () => {
    execSync(
      `node "${CLI_PATH}" create-increment ` +
        `--id "0001-hotfix" ` +
        `--title "Hotfix" ` +
        `--description "Production fix" ` +
        `--project "test-project" ` +
        `--type hotfix ` +
        `--priority P1`,
      { cwd: tempDir, encoding: 'utf-8' }
    );

    const metaPath = path.join(incrementsPath, '0001-hotfix', 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    expect(metadata.type).toBe('hotfix');
    expect(metadata.priority).toBe('P1');
  });

  it('should pass board option for 2-level structures via CLI', () => {
    execSync(
      `node "${CLI_PATH}" create-increment ` +
        `--id "0001-board-test" ` +
        `--title "Board Test" ` +
        `--description "Test board" ` +
        `--project "my-project" ` +
        `--board "frontend-team"`,
      { cwd: tempDir, encoding: 'utf-8' }
    );

    const specPath = path.join(incrementsPath, '0001-board-test', 'spec.md');
    const content = fs.readFileSync(specPath, 'utf-8');
    expect(content).toContain('**Board**: frontend-team');
  });

  it('should fail with error for duplicate increment numbers', () => {
    // Create first increment
    execSync(
      `node "${CLI_PATH}" create-increment ` +
        `--id "0001-first" ` +
        `--title "First" ` +
        `--description "First" ` +
        `--project "test-project"`,
      { cwd: tempDir, encoding: 'utf-8' }
    );

    // Try duplicate - should fail
    expect(() => {
      execSync(
        `node "${CLI_PATH}" create-increment ` +
          `--id "0001-second" ` +
          `--title "Second" ` +
          `--description "Duplicate" ` +
          `--project "test-project"`,
        { cwd: tempDir, encoding: 'utf-8', stdio: 'pipe' }
      );
    }).toThrow();
  });

  it('should match the exact command format used in SKILL.md', () => {
    // The SKILL.md says: specweave create-increment --id "XXXX-name" --title "Title" --description "Desc" --project "my-app"
    // This test verifies that exact invocation pattern works
    execSync(
      `node "${CLI_PATH}" create-increment --id "0042-my-feature" --title "My Feature" --description "A feature" --project "my-app"`,
      { cwd: tempDir, encoding: 'utf-8' }
    );

    const incPath = path.join(incrementsPath, '0042-my-feature');
    expect(fs.existsSync(incPath)).toBe(true);
    expect(fs.existsSync(path.join(incPath, 'metadata.json'))).toBe(true);
    expect(fs.existsSync(path.join(incPath, 'spec.md'))).toBe(true);
  });
});
