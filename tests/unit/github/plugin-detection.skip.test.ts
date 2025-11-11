/**
 * Unit tests for Plugin Detection
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { isPluginInstalled } from '../../../src/cli/helpers/issue-tracker/utils';

// Mock fs module
jest.mock('fs');

describe('Plugin Detection', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const originalHome = process.env.HOME;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = '/test/home';
  });

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  describe('isPluginInstalled', () => {
    const pluginsFilePath = '/test/home/.claude/plugins/installed_plugins.json';

    it('should return true when plugin is installed', () => {
      const installedPlugins = {
        version: '1.0.0',
        plugins: {
          'specweave-github@specweave': { /* plugin data */ },
          'specweave-jira@specweave': { /* plugin data */ },
          'specweave@specweave': { /* plugin data */ }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(installedPlugins));

      expect(isPluginInstalled('specweave-github')).toBe(true);
      expect(isPluginInstalled('specweave-jira')).toBe(true);
      expect(isPluginInstalled('specweave')).toBe(true);
    });

    it('should return false when plugin is not installed', () => {
      const installedPlugins = {
        version: '1.0.0',
        plugins: {
          'specweave-github@specweave': { /* plugin data */ },
          'specweave@specweave': { /* plugin data */ }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(installedPlugins));

      expect(isPluginInstalled('specweave-ado')).toBe(false);
      expect(isPluginInstalled('non-existent-plugin')).toBe(false);
    });

    it('should return false when installed_plugins.json does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(isPluginInstalled('specweave-github')).toBe(false);
    });

    it('should return false when installed_plugins.json is malformed', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json{');

      expect(isPluginInstalled('specweave-github')).toBe(false);
    });

    it('should return false when plugins object is missing', () => {
      const installedPlugins = {
        version: '1.0.0'
        // No plugins object
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(installedPlugins));

      expect(isPluginInstalled('specweave-github')).toBe(false);
    });

    it('should handle plugins from different marketplaces', () => {
      const installedPlugins = {
        version: '1.0.0',
        plugins: {
          'specweave-github@specweave': { /* plugin data */ },
          'some-plugin@other-marketplace': { /* plugin data */ },
          'local-plugin@local': { /* plugin data */ }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(installedPlugins));

      expect(isPluginInstalled('specweave-github')).toBe(true);
      expect(isPluginInstalled('some-plugin')).toBe(true);
      expect(isPluginInstalled('local-plugin')).toBe(true);
    });

    it('should use USERPROFILE on Windows when HOME is not set', () => {
      delete process.env.HOME;
      process.env.USERPROFILE = 'C:\\Users\\test';

      const windowsPath = 'C:\\Users\\test\\.claude\\plugins\\installed_plugins.json';
      const installedPlugins = {
        version: '1.0.0',
        plugins: {
          'specweave-github@specweave': { /* plugin data */ }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(installedPlugins));

      expect(isPluginInstalled('specweave-github')).toBe(true);

      // Restore HOME
      process.env.HOME = originalHome;
    });

    it('should handle read errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(isPluginInstalled('specweave-github')).toBe(false);
    });
  });
});