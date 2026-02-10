/**
 * Tests for Claude Settings Environment Variable Configuration
 *
 * Verifies that enableAgentTeamsEnvVar correctly manages
 * CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS in .claude/settings.json
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { enableAgentTeamsEnvVar } from '../../../../../src/cli/helpers/init/claude-settings-env.js';

describe('enableAgentTeamsEnvVar', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-env-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should add env section with CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS to new settings.json', () => {
    // .claude dir exists but no settings.json
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });

    enableAgentTeamsEnvVar(tempDir);

    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.env).toBeDefined();
    expect(settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
  });

  it('should preserve existing settings when adding env var', () => {
    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        permissions: { defaultMode: 'bypassPermissions' },
        enabledPlugins: { 'sw@specweave': true },
      })
    );

    enableAgentTeamsEnvVar(tempDir);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    // Existing settings preserved
    expect(settings.permissions.defaultMode).toBe('bypassPermissions');
    expect(settings.enabledPlugins['sw@specweave']).toBe(true);
    // Env var added
    expect(settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
  });

  it('should not overwrite existing env vars', () => {
    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        env: { MY_CUSTOM_VAR: 'hello' },
      })
    );

    enableAgentTeamsEnvVar(tempDir);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.env.MY_CUSTOM_VAR).toBe('hello');
    expect(settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
  });

  it('should no-op when env var already set', () => {
    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' },
      })
    );

    const statBefore = fs.statSync(settingsPath).mtimeMs;

    enableAgentTeamsEnvVar(tempDir);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
  });

  it('should create .claude directory if it does not exist', () => {
    enableAgentTeamsEnvVar(tempDir);

    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
  });
});
