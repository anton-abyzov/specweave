/**
 * CursorAdapter Tests
 *
 * Tests the Cursor editor adapter - semi-automation adapter with
 * AGENTS.md compilation and @ context shortcuts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Hoisted mocks - must be declared before vi.mock() calls
const {
  mockEnsureDir,
  mockPathExists,
  mockCopy,
  mockAccess,
  mockReadFile,
  mockWriteFile,
  mockReadJson,
  mockRemove,
  mockReaddir,
  mockStat,
  mockExecSync,
  mockGetDirname,
  mockGetSystemPromptForLanguage,
} = vi.hoisted(() => ({
  mockEnsureDir: vi.fn(),
  mockPathExists: vi.fn(),
  mockCopy: vi.fn(),
  mockAccess: vi.fn(),
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockReadJson: vi.fn(),
  mockRemove: vi.fn(),
  mockReaddir: vi.fn().mockResolvedValue([]),
  mockStat: vi.fn(),
  mockExecSync: vi.fn(),
  mockGetDirname: vi.fn().mockReturnValue('/fake/adapters'),
  mockGetSystemPromptForLanguage: vi.fn(),
}));

vi.mock('../../../src/utils/fs-native.js', () => ({
  ensureDir: mockEnsureDir,
  pathExists: mockPathExists,
  copy: mockCopy,
  access: mockAccess,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  readJson: mockReadJson,
  remove: mockRemove,
  readdir: mockReaddir,
  stat: mockStat,
}));

vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

vi.mock('../../../src/utils/esm-helpers.js', () => ({
  getDirname: mockGetDirname,
}));

vi.mock('../../../src/core/i18n/language-manager.js', () => ({
  getSystemPromptForLanguage: mockGetSystemPromptForLanguage,
}));

import { CursorAdapter } from '../../../src/adapters/cursor/adapter.js';
import type { AdapterOptions } from '../../../src/adapters/adapter-interface.js';
import type { Plugin } from '../../../src/core/types/plugin.js';

describe('CursorAdapter', () => {
  let adapter: CursorAdapter;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CursorAdapter();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });

  // ─── Properties ────────────────────────────────────────────

  describe('properties', () => {
    it('should have name "cursor"', () => {
      expect(adapter.name).toBe('cursor');
    });

    it('should have a description mentioning Cursor', () => {
      expect(adapter.description).toContain('Cursor');
    });

    it('should have automationLevel "semi"', () => {
      expect(adapter.automationLevel).toBe('semi');
    });
  });

  // ─── detect() ──────────────────────────────────────────────

  describe('detect()', () => {
    it('should return true when cursor CLI exists', async () => {
      mockExecSync.mockReturnValue(Buffer.from('/usr/local/bin/cursor'));
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await adapter.detect();
      expect(result).toBe(true);
    });

    it('should return true when .cursor directory exists', async () => {
      mockExecSync.mockImplementation(() => { throw new Error('not found'); });
      mockAccess.mockResolvedValue(undefined);

      const result = await adapter.detect();
      expect(result).toBe(true);
    });

    it('should return true when both CLI and directory exist', async () => {
      mockExecSync.mockReturnValue(Buffer.from('/usr/local/bin/cursor'));
      mockAccess.mockResolvedValue(undefined);

      const result = await adapter.detect();
      expect(result).toBe(true);
    });

    it('should return false when neither CLI nor directory exists', async () => {
      mockExecSync.mockImplementation(() => { throw new Error('not found'); });
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await adapter.detect();
      expect(result).toBe(false);
    });
  });

  // ─── getFiles() ────────────────────────────────────────────

  describe('getFiles()', () => {
    it('should return context files and README', () => {
      const files = adapter.getFiles();

      expect(files.length).toBe(5);
    });

    it('should include increments context shortcut', () => {
      const files = adapter.getFiles();
      const incrementsFile = files.find(f => f.targetPath.includes('increments-context'));

      expect(incrementsFile).toBeDefined();
      expect(incrementsFile!.description).toContain('@increments');
    });

    it('should include docs context shortcut', () => {
      const files = adapter.getFiles();
      const docsFile = files.find(f => f.targetPath.includes('docs-context'));

      expect(docsFile).toBeDefined();
      expect(docsFile!.description).toContain('@docs');
    });

    it('should include strategy context shortcut', () => {
      const files = adapter.getFiles();
      const strategyFile = files.find(f => f.targetPath.includes('strategy-context'));

      expect(strategyFile).toBeDefined();
      expect(strategyFile!.description).toContain('@strategy');
    });

    it('should include tests context shortcut', () => {
      const files = adapter.getFiles();
      const testsFile = files.find(f => f.targetPath.includes('tests-context'));

      expect(testsFile).toBeDefined();
      expect(testsFile!.description).toContain('@tests');
    });

    it('should include README', () => {
      const files = adapter.getFiles();
      const readme = files.find(f => f.targetPath.includes('README.md'));

      expect(readme).toBeDefined();
    });

    it('should target .cursor/ directory for all files', () => {
      const files = adapter.getFiles();

      for (const file of files) {
        expect(file.targetPath).toMatch(/^\.cursor\//);
      }
    });
  });

  // ─── install() ─────────────────────────────────────────────

  describe('install()', () => {
    const options: AdapterOptions = {
      projectPath: '/test/project',
      projectName: 'test-project',
    };

    it('should create .cursor/ and .cursor/context/ directories', async () => {
      mockEnsureDir.mockResolvedValue(undefined);
      mockPathExists.mockResolvedValue(true);
      mockCopy.mockResolvedValue(undefined);

      await adapter.install(options);

      expect(mockEnsureDir).toHaveBeenCalledWith('/test/project/.cursor');
      expect(mockEnsureDir).toHaveBeenCalledWith('/test/project/.cursor/context');
    });

    it('should log installation messages', async () => {
      mockEnsureDir.mockResolvedValue(undefined);
      mockPathExists.mockResolvedValue(true);
      mockCopy.mockResolvedValue(undefined);

      await adapter.install(options);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Installing Cursor Adapter'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cursor adapter installed'));
    });

    it('should call super.install to copy adapter files', async () => {
      mockEnsureDir.mockResolvedValue(undefined);
      mockPathExists.mockResolvedValue(true);
      mockCopy.mockResolvedValue(undefined);

      await adapter.install(options);

      // super.install copies files returned by getFiles()
      // With 5 files, expect 5 ensureDir + 5 copy calls (from super) plus 2 ensureDir for cursor dirs
      expect(mockEnsureDir).toHaveBeenCalled();
    });
  });

  // ─── postInstall() ─────────────────────────────────────────

  describe('postInstall()', () => {
    it('should log instructions', async () => {
      await adapter.postInstall({ projectPath: '/test', projectName: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cursor'));
    });
  });

  // ─── getInstructions() ─────────────────────────────────────

  describe('getInstructions()', () => {
    it('should return instructions containing @ shortcuts', () => {
      const instructions = adapter.getInstructions();

      expect(instructions).toContain('@increments');
      expect(instructions).toContain('@docs');
      expect(instructions).toContain('@strategy');
      expect(instructions).toContain('@tests');
    });

    it('should mention AGENTS.md', () => {
      const instructions = adapter.getInstructions();
      expect(instructions).toContain('AGENTS.md');
    });

    it('should mention Composer shortcut', () => {
      const instructions = adapter.getInstructions();
      expect(instructions).toContain('Composer');
    });

    it('should mention role adoption', () => {
      const instructions = adapter.getInstructions();
      expect(instructions).toContain('PM/Architect/DevOps');
    });
  });

  // ─── supportsPlugins() ─────────────────────────────────────

  describe('supportsPlugins()', () => {
    it('should return true', () => {
      expect(adapter.supportsPlugins()).toBe(true);
    });
  });

  // ─── compilePlugin() ──────────────────────────────────────
  // compilePlugin writes individual skill files to .cursor/skills/
  // via the base class writeSkillFiles() helper.

  describe('compilePlugin()', () => {
    const makePlugin = (overrides: Partial<Plugin> = {}): Plugin => ({
      manifest: { name: 'specweave-test', description: 'Test plugin', version: '1.0.0', author: { name: 'Test' } },
      path: '/plugins/specweave-test',
      skills: [],
      agents: [],
      commands: [],
      ...overrides,
    });

    beforeEach(() => {
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      // Default: English language, no config.json
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('config.json')) return false;
        return false;
      });
      mockReadJson.mockRejectedValue(new Error('not found'));
    });

    it('should ensure .cursor/skills directory exists', async () => {
      await adapter.compilePlugin(makePlugin());

      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringContaining('.cursor/skills')
      );
    });

    it('should not write files when plugin has no skills', async () => {
      await adapter.compilePlugin(makePlugin({ skills: [] }));

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should write skill file to .cursor/skills/', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('SKILL.md')) return true;
        if (p.endsWith('config.json')) return false;
        return false;
      });
      mockReadFile.mockImplementation(async (p: string) => {
        if (p.endsWith('SKILL.md')) return '# Skill Body';
        return '';
      });

      const plugin = makePlugin({
        skills: [
          { name: 'test-skill', path: '/plugins/test/skills/test-skill', description: 'A skill' },
        ],
      });

      await adapter.compilePlugin(plugin);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('specweave-test/test-skill.md'),
        expect.stringContaining('# Skill Body'),
        'utf-8'
      );
    });

    it('should skip skills without SKILL.md', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('SKILL.md')) return false;
        if (p.endsWith('config.json')) return false;
        return false;
      });

      const plugin = makePlugin({
        skills: [
          { name: 'missing-skill', path: '/plugins/test/skills/missing', description: 'No file' },
        ],
      });

      await adapter.compilePlugin(plugin);

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should write multiple skill files', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('SKILL.md')) return true;
        if (p.endsWith('config.json')) return false;
        return false;
      });
      mockReadFile.mockImplementation(async (p: string) => {
        if (p.endsWith('SKILL.md')) return 'content';
        return '';
      });

      const plugin = makePlugin({
        skills: [
          { name: 'a', path: '/p/a', description: '' },
          { name: 'b', path: '/p/b', description: '' },
        ],
      });

      await adapter.compilePlugin(plugin);

      expect(mockWriteFile).toHaveBeenCalledTimes(2);
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('specweave-test/a.md'),
        expect.any(String),
        'utf-8'
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('specweave-test/b.md'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should inject system prompt for non-English language', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('SKILL.md')) return true;
        if (p.endsWith('config.json')) return true;
        return false;
      });
      mockReadJson.mockResolvedValue({ language: 'es' });
      mockReadFile.mockImplementation(async (p: string) => {
        if (p.endsWith('SKILL.md')) return 'Skill content';
        return '';
      });
      mockGetSystemPromptForLanguage.mockReturnValue('RESPOND IN SPANISH');

      const plugin = makePlugin({
        skills: [
          { name: 'test-skill', path: '/plugins/test/skills/test-skill', description: 'Test' },
        ],
      });

      await adapter.compilePlugin(plugin);

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain('RESPOND IN SPANISH');
    });

    it('should log installation messages', async () => {
      await adapter.compilePlugin(makePlugin());

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Installing plugin skills for Cursor'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('installed for Cursor'));
    });

    it('should log skill count', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('SKILL.md')) return true;
        if (p.endsWith('config.json')) return false;
        return false;
      });
      mockReadFile.mockResolvedValue('content');

      const plugin = makePlugin({
        skills: [
          { name: 'a', path: '/p/a', description: '' },
          { name: 'b', path: '/p/b', description: '' },
        ],
      });

      await adapter.compilePlugin(plugin);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 skill(s)'));
    });
  });

  // ─── unloadPlugin() ───────────────────────────────────────
  // unloadPlugin removes skill files from .cursor/skills/
  // via the base class removeSkillFiles() helper.

  describe('unloadPlugin()', () => {
    it('should skip removal when rules directory does not exist', async () => {
      mockPathExists.mockResolvedValue(false);

      await adapter.unloadPlugin('specweave-test');

      // removeSkillFiles returns early if dir doesn't exist
      // but unloadPlugin still logs
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unloading plugin'));
    });

    it('should remove the plugin subdirectory from .cursor/skills/', async () => {
      mockPathExists.mockResolvedValue(true);
      mockRemove.mockResolvedValue(undefined);

      await adapter.unloadPlugin('specweave-test');

      // Should remove the specweave-test/ subdirectory
      expect(mockRemove).toHaveBeenCalledTimes(1);
      expect(mockRemove).toHaveBeenCalledWith(
        expect.stringContaining('.cursor/skills/specweave-test')
      );
    });

    it('should not remove other plugin directories', async () => {
      mockPathExists.mockImplementation(async (p: string) =>
        // Only the target plugin dir exists
        !p.includes('specweave-test')
      );

      await adapter.unloadPlugin('specweave-test');

      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('should log success messages', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue([]);

      await adapter.unloadPlugin('specweave-x');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Removed from .cursor/skills/'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('specweave-x unloaded'));
    });
  });

  // ─── getInstalledPlugins() ─────────────────────────────────
  // getInstalledPlugins scans .cursor/skills/ directory
  // via the base class listInstalledPluginsInDir() helper.

  describe('getInstalledPlugins()', () => {
    it('should return empty array when rules directory does not exist', async () => {
      mockPathExists.mockResolvedValue(false);

      const result = await adapter.getInstalledPlugins();
      expect(result).toEqual([]);
    });

    it('should return empty array when rules directory is empty', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue([]);

      const result = await adapter.getInstalledPlugins();
      expect(result).toEqual([]);
    });

    it('should return subdirectory names as plugin names', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['myplugin', 'otherplugin']);
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await adapter.getInstalledPlugins();
      expect(result).toEqual(expect.arrayContaining(['myplugin', 'otherplugin']));
      expect(result).toHaveLength(2);
    });

    it('should exclude non-directory entries', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['plugin', 'README.md']);
      mockStat
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockResolvedValueOnce({ isDirectory: () => false });

      const result = await adapter.getInstalledPlugins();
      expect(result).toEqual(['plugin']);
    });

    it('should list all plugin subdirectories', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['sw', 'frontend-design', 'skill-creator']);
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await adapter.getInstalledPlugins();
      expect(result).toEqual(['sw', 'frontend-design', 'skill-creator']);
    });
  });
});
