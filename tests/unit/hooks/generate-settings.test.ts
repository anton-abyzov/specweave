import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateHooksSettings, writeSettings } from '../../../src/hooks/generate-settings.js';

describe('hooks/generate-settings', () => {
  let tmpDir: string;
  let projectRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-gensettings-'));
    projectRoot = tmpDir;
    const swDir = path.join(projectRoot, '.specweave');
    fs.mkdirSync(swDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeConfig(config: Record<string, unknown>): void {
    fs.writeFileSync(
      path.join(projectRoot, '.specweave', 'config.json'),
      JSON.stringify(config),
    );
  }

  // TC-001: httpMode true → exactly 2 hook keys
  it('should return exactly PreToolUse and UserPromptSubmit when httpMode is true', () => {
    writeConfig({ hooks: { httpMode: true } });
    const result = generateHooksSettings({ projectRoot });
    const hooks = result.hooks as Record<string, unknown>;

    expect(Object.keys(hooks)).toHaveLength(2);
    expect(hooks).toHaveProperty('PreToolUse');
    expect(hooks).toHaveProperty('UserPromptSubmit');
  });

  // TC-002: No COMMAND_EVENTS keys
  it('should not contain any old command event keys', () => {
    writeConfig({ hooks: { httpMode: true } });
    const result = generateHooksSettings({ projectRoot });
    const hooks = result.hooks as Record<string, unknown>;

    const staleKeys = [
      'SessionStart', 'SessionEnd', 'Notification', 'SubagentStart',
      'ConfigChange', 'PreCompact', 'TeammateIdle',
      'PostToolUse', 'Stop', 'SubagentStop', 'TaskCompleted',
      'PostToolUseFailure', 'PermissionRequest',
    ];
    for (const key of staleKeys) {
      expect(hooks).not.toHaveProperty(key);
    }
  });

  // TC-003: writeSettings removes stale keys from existing settings.json
  it('should remove stale hook keys from existing settings.json', () => {
    writeConfig({ hooks: { httpMode: true } });

    const settingsDir = path.join(projectRoot, '.claude');
    fs.mkdirSync(settingsDir, { recursive: true });
    const settingsPath = path.join(settingsDir, 'settings.json');

    // Write an old-style settings.json with stale hooks
    const oldSettings = {
      hooks: {
        PostToolUse: [{ type: 'http', url: 'http://localhost:8340/api/hooks/PostToolUse' }],
        Stop: [{ type: 'http', url: 'http://localhost:8340/api/hooks/Stop' }],
        SessionStart: [{ type: 'command', command: 'node bridge.mjs SessionStart' }],
        PreToolUse: [{ type: 'http', url: 'http://localhost:8340/api/hooks/PreToolUse' }],
        UserPromptSubmit: [{ type: 'http', url: 'http://localhost:8340/api/hooks/UserPromptSubmit' }],
      },
    };
    fs.writeFileSync(settingsPath, JSON.stringify(oldSettings));

    writeSettings(projectRoot);

    const written = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    expect(Object.keys(written.hooks)).toHaveLength(2);
    expect(written.hooks).toHaveProperty('PreToolUse');
    expect(written.hooks).toHaveProperty('UserPromptSubmit');
    expect(written.hooks).not.toHaveProperty('PostToolUse');
    expect(written.hooks).not.toHaveProperty('Stop');
    expect(written.hooks).not.toHaveProperty('SessionStart');
  });

  // TC-004: httpMode false → empty object
  it('should return empty object when httpMode is false', () => {
    writeConfig({ hooks: { httpMode: false } });
    const result = generateHooksSettings({ projectRoot });
    expect(result).toEqual({});
  });

  it('should return empty object when no config exists', () => {
    // Remove config
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);

    const result = generateHooksSettings({ projectRoot });
    expect(result).toEqual({});
  });
});
