import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateHooksSettings, getHttpMode, writeSettings } from '../../../../src/hooks/generate-settings.js';

describe('Settings Generator', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-settings-test-'));
    fs.mkdirSync(path.join(tmpDir, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty when httpMode is false', () => {
    fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), JSON.stringify({ hooks: { httpMode: false } }));
    const result = generateHooksSettings({ projectRoot: tmpDir });
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('returns empty when httpMode is absent', () => {
    fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), '{}');
    const result = generateHooksSettings({ projectRoot: tmpDir });
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('generates HTTP hooks for 8 supported events', () => {
    fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), JSON.stringify({ hooks: { httpMode: true } }));
    const result = generateHooksSettings({ projectRoot: tmpDir });
    const hooks = result.hooks as Record<string, unknown[]>;
    const httpEvents = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop', 'TaskCompleted', 'UserPromptSubmit', 'PostToolUseFailure', 'PermissionRequest'];
    for (const event of httpEvents) {
      expect(hooks[event]).toBeDefined();
      expect((hooks[event][0] as { type: string }).type).toBe('http');
      expect((hooks[event][0] as { url: string }).url).toContain(`/api/hooks/${event}`);
    }
  });

  it('generates command hooks for 7 command-only events', () => {
    fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), JSON.stringify({ hooks: { httpMode: true } }));
    const result = generateHooksSettings({ projectRoot: tmpDir });
    const hooks = result.hooks as Record<string, unknown[]>;
    const cmdEvents = ['SessionStart', 'SessionEnd', 'Notification', 'SubagentStart', 'ConfigChange', 'PreCompact', 'TeammateIdle'];
    for (const event of cmdEvents) {
      expect(hooks[event]).toBeDefined();
      expect((hooks[event][0] as { type: string }).type).toBe('command');
      expect((hooks[event][0] as { command: string }).command).toContain('command-bridge.mjs');
    }
  });

  it('uses custom port from config', () => {
    fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), JSON.stringify({ hooks: { httpMode: true, port: 9999 } }));
    const result = generateHooksSettings({ projectRoot: tmpDir });
    const hooks = result.hooks as Record<string, unknown[]>;
    expect((hooks.PreToolUse[0] as { url: string }).url).toContain('9999');
  });

  it('getHttpMode defaults to false', () => {
    expect(getHttpMode({})).toBe(false);
    expect(getHttpMode({ hooks: {} })).toBe(false);
    expect(getHttpMode({ hooks: { httpMode: true } })).toBe(true);
  });

  it('writeSettings creates .claude/settings.json', () => {
    fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), JSON.stringify({ hooks: { httpMode: true } }));
    writeSettings(tmpDir);
    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.hooks).toBeDefined();
  });
});
