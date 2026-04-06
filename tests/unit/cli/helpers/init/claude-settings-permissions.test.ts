/**
 * Tests for Claude Settings DCI Permission Configuration
 *
 * Verifies that enableDciPermissions correctly adds skill-memories.sh
 * and skill-context.sh patterns to .claude/settings.json permissions.allow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { enableDciPermissions } from '../../../../../src/cli/helpers/init/claude-settings-permissions.js';

describe('enableDciPermissions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-permissions-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should add DCI patterns to new settings.json', () => {
    enableDciPermissions(tempDir);

    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.permissions.allow).toContain('Bash(.specweave/scripts/skill-context.sh *)');
    // skill-memories.sh is instruction-based now, no bash pattern needed
    expect(settings.permissions.allow).not.toContain('Bash(.specweave/scripts/skill-memories.sh *)');
  });

  it('should preserve existing permissions when adding DCI patterns', () => {
    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        permissions: {
          allow: ['Read', 'Write'],
          defaultMode: 'default',
        },
        enabledPlugins: { 'sw@specweave': true },
      })
    );

    enableDciPermissions(tempDir);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.permissions.allow).toContain('Read');
    expect(settings.permissions.allow).toContain('Write');
    expect(settings.permissions.allow).toContain('Bash(.specweave/scripts/skill-context.sh *)');
    expect(settings.permissions.defaultMode).toBe('default');
    expect(settings.enabledPlugins['sw@specweave']).toBe(true);
  });

  it('should skip if user has blanket Bash permission', () => {
    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        permissions: { allow: ['Bash'] },
      })
    );

    enableDciPermissions(tempDir);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    // Should NOT add specific patterns when blanket Bash is present
    expect(settings.permissions.allow).toEqual(['Bash']);
  });

  it('should be idempotent — no duplicates on second call', () => {
    enableDciPermissions(tempDir);
    enableDciPermissions(tempDir);

    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const count = settings.permissions.allow.filter(
      (p: string) => p.includes('skill-context.sh')
    ).length;
    expect(count).toBe(1);
  });

  it('should remove legacy skill-memories.sh pattern', () => {
    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        permissions: {
          allow: ['Read', 'Bash(.specweave/scripts/skill-memories.sh *)'],
        },
      })
    );

    enableDciPermissions(tempDir);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.permissions.allow).not.toContain('Bash(.specweave/scripts/skill-memories.sh *)');
    expect(settings.permissions.allow).toContain('Bash(.specweave/scripts/skill-context.sh *)');
    expect(settings.permissions.allow).toContain('Read');
  });

  it('should create .claude directory if it does not exist', () => {
    enableDciPermissions(tempDir);

    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);
  });

  it('should handle corrupt settings.json gracefully', () => {
    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.writeFileSync(settingsPath, 'not valid json{{{');

    enableDciPermissions(tempDir);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.permissions.allow).toContain('Bash(.specweave/scripts/skill-context.sh *)');
  });
});
