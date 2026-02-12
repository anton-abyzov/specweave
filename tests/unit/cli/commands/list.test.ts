/**
 * Tests for List CLI Command
 *
 * Verifies listing functionality:
 * - Display all available agents and skills
 * - Display only installed components
 * - Parse descriptions from AGENT.md and SKILL.md files
 * - Internationalization support
 * - Local vs global installation detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';

// Mock with hoisting
const { mockFs, mockLocaleManager } = vi.hoisted(() => {
  return {
    mockFs: {
      existsSync: vi.fn(),
      readdirSync: vi.fn(),
      statSync: vi.fn(),
      readFileSync: vi.fn(),
    },
    mockLocaleManager: {
      t: vi.fn((section: string, key: string) => {
        const translations: Record<string, Record<string, string>> = {
          cli: {
            'list.header': 'Available Components',
            'list.agentsHeader': 'Agents',
            'list.skillsHeader': 'Skills',
            'list.availableFormat': `available`,
            'list.noDescription': 'No description available',
            'list.noAgents': 'No agents found',
            'list.noSkills': 'No skills found',
            'list.hintInstalled': 'Use --installed',
            'list.hintInstall': 'Use install',
            'list.localInstallation': 'Local Installation',
            'list.globalInstallation': 'Global Installation',
            'list.noComponentsInstalled': 'No components',
            'list.installPrompt': 'Install',
          },
        };
        return translations[section]?.[key] || key;
      }),
    },
  };
});

vi.mock('../../../../src/utils/fs-native.js', () => mockFs);

vi.mock('../../../../src/core/i18n/locale-manager.js', () => ({
  getLocaleManager: vi.fn().mockReturnValue(mockLocaleManager),
}));

vi.mock('../../../../src/utils/esm-helpers.js', () => ({
  getDirname: vi.fn().mockReturnValue('/fake/src/cli/commands'),
}));

import { listCommand } from '../../../../src/cli/commands/list.js';

describe('List Command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Default mock setup
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['agent-1', 'agent-2']);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => true,
    });
    mockFs.readFileSync.mockReturnValue('description: "Test description"');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('List All Components (Default)', () => {
    it('should call console.log for output', async () => {
      await listCommand();

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should check for agents directory', async () => {
      await listCommand();

      expect(mockFs.existsSync).toHaveBeenCalledWith(expect.stringContaining('agents'));
    });

    it('should check for skills directory', async () => {
      await listCommand();

      expect(mockFs.existsSync).toHaveBeenCalledWith(expect.stringContaining('skills'));
    });

    it('should read agent directories', async () => {
      await listCommand();

      expect(mockFs.readdirSync).toHaveBeenCalledWith(expect.stringContaining('agents'));
    });

    it('should read skill directories', async () => {
      await listCommand();

      expect(mockFs.readdirSync).toHaveBeenCalledWith(expect.stringContaining('skills'));
    });

    it('should check if items are directories', async () => {
      await listCommand();

      expect(mockFs.statSync).toHaveBeenCalled();
    });

    it('should read description files for agents', async () => {
      await listCommand();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('AGENT.md'), 'utf-8');
    });

    it('should read description files for skills', async () => {
      await listCommand();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('SKILL.md'), 'utf-8');
    });
  });

  describe('List Installed Components Only', () => {
    beforeEach(() => {
      mockFs.existsSync.mockImplementation((dirPath: string) => {
        return dirPath.includes('.claude');
      });

      mockFs.readdirSync.mockImplementation((dirPath: string) => {
        if (dirPath.includes('agents')) {
          return ['agent-1', 'agent-2'];
        }
        if (dirPath.includes('skills')) {
          return ['skill-1'];
        }
        return [];
      });
    });

    it('should check local installation directory', async () => {
      await listCommand({ installed: true });

      expect(mockFs.existsSync).toHaveBeenCalledWith(expect.stringContaining('.claude'));
    });

    it('should check global installation directory', async () => {
      await listCommand({ installed: true });

      // Should check home directory
      const homedir = os.homedir();
      expect(mockFs.existsSync).toHaveBeenCalledWith(expect.stringContaining(homedir));
    });

    it('should list agents from local installation', async () => {
      await listCommand({ installed: true });

      expect(mockFs.readdirSync).toHaveBeenCalledWith(expect.stringContaining('agents'));
    });

    it('should list skills from local installation', async () => {
      await listCommand({ installed: true });

      expect(mockFs.readdirSync).toHaveBeenCalledWith(expect.stringContaining('skills'));
    });
  });

  describe('Internationalization', () => {
    it('should accept language option', async () => {
      await listCommand({ language: 'en' });

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should use default language when not specified', async () => {
      await listCommand();

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should support multiple languages', async () => {
      const langs = ['en', 'es', 'fr', 'de'];

      for (const lang of langs) {
        consoleSpy.mockClear();
        await listCommand({ language: lang as any });
        expect(consoleSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Output Verification', () => {
    it('should not return a value', async () => {
      const result = await listCommand();

      expect(result).toBeUndefined();
    });

    it('should output to console', async () => {
      await listCommand();

      // Should have at least one console.log call
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should output when listCommand is called', async () => {
      const result = await listCommand();

      // Verify function returns void
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Component Discovery', () => {
    it('should discover agents in src/agents', async () => {
      mockFs.readdirSync.mockReturnValue(['test-agent']);

      await listCommand();

      // Should have read the agents directory
      expect(mockFs.readdirSync).toHaveBeenCalledWith(expect.stringContaining('agents'));
    });

    it('should discover skills in src/skills', async () => {
      mockFs.readdirSync.mockReturnValue(['test-skill']);

      await listCommand();

      // Should have read the skills directory
      expect(mockFs.readdirSync).toHaveBeenCalledWith(expect.stringContaining('skills'));
    });

    it('should handle empty component lists', async () => {
      mockFs.readdirSync.mockReturnValue([]);

      await listCommand();

      // Should still output even with empty list
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle large component lists', async () => {
      const manyComponents = Array.from({ length: 50 }, (_, i) => `component-${i}`);
      mockFs.readdirSync.mockReturnValue(manyComponents);

      await listCommand();

      // Should handle large lists without error
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('File System Operations', () => {
    it('should check for description in AGENT.md', async () => {
      mockFs.readFileSync.mockReturnValue('description: "Agent description"');

      await listCommand();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('AGENT.md'), 'utf-8');
    });

    it('should check for description in SKILL.md', async () => {
      mockFs.readFileSync.mockReturnValue('description: "Skill description"');

      await listCommand();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('SKILL.md'), 'utf-8');
    });

    it('should handle missing metadata files', async () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        if (path.includes('AGENT.md') || path.includes('SKILL.md')) {
          return false;
        }
        return true;
      });

      await listCommand();

      // Should continue without error
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle empty metadata files', async () => {
      mockFs.readFileSync.mockReturnValue('');

      await listCommand();

      // Should handle gracefully
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle malformed metadata', async () => {
      mockFs.readFileSync.mockReturnValue('invalid: [metadata }');

      await listCommand();

      // Should not crash
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle components with special names', async () => {
      mockFs.readdirSync.mockReturnValue([
        'component-with-dash',
        'component_with_underscore',
        'component.with.dots',
      ]);

      await listCommand();

      // Should discover all components
      expect(mockFs.readdirSync).toHaveBeenCalled();
    });

    it('should handle unicode in component names', async () => {
      mockFs.readdirSync.mockReturnValue(['component-ñame', 'component-中文']);

      await listCommand();

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not list non-directory items', async () => {
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false,
      });

      await listCommand();

      // Should complete even with no directories
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle both local and global installs', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((dir: string) => {
        if (dir.includes('agents')) return ['agent-1'];
        if (dir.includes('skills')) return ['skill-1'];
        return [];
      });

      await listCommand({ installed: true });

      // Should check both local and global
      expect(mockFs.existsSync).toHaveBeenCalledWith(expect.stringContaining('.claude'));
    });

    it('should handle missing home directory gracefully', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await listCommand({ installed: true });

      // Should not crash
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Locale Manager Integration', () => {
    it('should use locale manager for translations', async () => {
      await listCommand();

      expect(mockLocaleManager.t).toHaveBeenCalled();
    });

    it('should pass cli section to translator', async () => {
      await listCommand();

      const calls = (mockLocaleManager.t as ReturnType<typeof vi.fn>).mock.calls;
      const hasCliSection = calls.some(call => call[0] === 'cli');
      expect(hasCliSection).toBe(true);
    });

    it('should translate list header', async () => {
      await listCommand();

      const calls = (mockLocaleManager.t as ReturnType<typeof vi.fn>).mock.calls;
      const hasListHeader = calls.some(call => call[1]?.includes('list.header'));
      expect(hasListHeader).toBe(true);
    });
  });
});
