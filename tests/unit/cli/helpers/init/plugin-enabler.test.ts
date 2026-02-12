/**
 * Tests for Claude plugin enabler
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from '../../../../../src/utils/fs-native.js';
import * as os from 'os';
import * as path from 'path';
import { enablePluginsInSettings, enablePlugin } from '../../../../../src/cli/helpers/init/claude-plugin-enabler.js';

describe('claude-plugin-enabler', () => {
  let tempDir: string;
  let settingsPath: string;

  beforeEach(() => {
    // Create temp directory for test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-enabler-test-'));
    settingsPath = path.join(tempDir, '.claude', 'settings.json');
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('enablePluginsInSettings', () => {
    it('should create settings.json if it does not exist', () => {
      const result = enablePluginsInSettings(['sw'], 'specweave', settingsPath);

      expect(result).toBe(true);

      expect(fs.existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.enabledPlugins).toEqual({
        'sw@specweave': true
      });
    });

    it('should enable multiple plugins', () => {
      const result = enablePluginsInSettings(['sw', 'sw-github', 'sw-jira'], 'specweave', settingsPath);

      expect(result).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

      expect(settings.enabledPlugins).toEqual({
        'sw@specweave': true,
        'sw-github@specweave': true,
        'sw-jira@specweave': true
      });
    });

    it('should preserve existing settings', () => {
      const claudeDir = path.dirname(settingsPath);

      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify({
        existingSetting: 'value',
        enabledPlugins: {
          'other-plugin@marketplace': true
        }
      }, null, 2));

      const result = enablePluginsInSettings(['sw'], 'specweave', settingsPath);

      expect(result).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.existingSetting).toBe('value');
      expect(settings.enabledPlugins).toEqual({
        'other-plugin@marketplace': true,
        'sw@specweave': true
      });
    });

    it('should handle corrupt settings.json gracefully', () => {
      const claudeDir = path.dirname(settingsPath);

      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(settingsPath, 'invalid json{');

      const result = enablePluginsInSettings(['sw'], 'specweave', settingsPath);

      expect(result).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.enabledPlugins).toEqual({
        'sw@specweave': true
      });
    });

    it('should use custom marketplace name', () => {
      const result = enablePluginsInSettings(['my-plugin'], 'custom-marketplace', settingsPath);

      expect(result).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

      expect(settings.enabledPlugins).toEqual({
        'my-plugin@custom-marketplace': true
      });
    });
  });

  describe('enablePlugin', () => {
    it('should enable a single plugin', () => {
      const result = enablePlugin('sw', 'specweave', settingsPath);

      expect(result).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

      expect(settings.enabledPlugins).toEqual({
        'sw@specweave': true
      });
    });

    it('should use default marketplace', () => {
      const result = enablePlugin('sw', 'specweave', settingsPath);

      expect(result).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

      expect(settings.enabledPlugins).toEqual({
        'sw@specweave': true
      });
    });
  });
});
