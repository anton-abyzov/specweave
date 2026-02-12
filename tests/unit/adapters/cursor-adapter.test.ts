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
      // Default: English language, AGENTS.md exists
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('AGENTS.md')) return true;
        if (p.endsWith('config.json')) return false;
        return false;
      });
      mockReadJson.mockRejectedValue(new Error('not found'));
    });

    it('should throw if AGENTS.md does not exist', async () => {
      mockPathExists.mockResolvedValue(false);

      await expect(adapter.compilePlugin(makePlugin())).rejects.toThrow('AGENTS.md not found');
    });

    it('should skip if plugin already compiled', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('AGENTS.md')) return true;
        return false;
      });
      mockReadFile.mockResolvedValue('# AGENTS\n<!-- Plugin: specweave-test -->');

      await adapter.compilePlugin(makePlugin());

      // Should not write if already compiled
      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already compiled'));
    });

    it('should append plugin section to AGENTS.md', async () => {
      mockReadFile.mockResolvedValue('# Existing AGENTS.md content');

      const plugin = makePlugin();
      await adapter.compilePlugin(plugin);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('AGENTS.md'),
        expect.stringContaining('<!-- Plugin: specweave-test -->'),
        'utf-8'
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('<!-- End Plugin: specweave-test -->'),
        'utf-8'
      );
    });

    it('should include plugin description in section', async () => {
      mockReadFile.mockResolvedValue('# AGENTS');

      const plugin = makePlugin();
      await adapter.compilePlugin(plugin);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Test plugin'),
        'utf-8'
      );
    });

    it('should add skills to AGENTS.md with Skills header', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('AGENTS.md')) return true;
        if (p.endsWith('config.json')) return false;
        return false;
      });
      // First call: AGENTS.md content; second call: SKILL.md content
      mockReadFile.mockImplementation(async (p: string) => {
        if (p.endsWith('AGENTS.md')) return '# AGENTS';
        if (p.endsWith('SKILL.md')) return '---\ntitle: Test\n---\n# Skill Body';
        return '';
      });

      const plugin = makePlugin({
        skills: [
          { name: 'test-skill', path: '/plugins/test/skills/test-skill', description: 'A skill' },
        ],
      });

      await adapter.compilePlugin(plugin);

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain('## Skills');
      expect(content).toContain('### test-skill');
      // Frontmatter should be stripped
      expect(content).toContain('# Skill Body');
      expect(content).not.toContain('title: Test');
    });

    it('should add agents to AGENTS.md with Agents header', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('AGENTS.md')) return true;
        if (p.endsWith('config.json')) return false;
        return false;
      });
      mockReadFile.mockImplementation(async (p: string) => {
        if (p.endsWith('AGENTS.md')) return '# AGENTS';
        if (p.endsWith('AGENT.md')) return '# Agent Instructions';
        return '';
      });

      const plugin = makePlugin({
        agents: [
          { name: 'my-agent', path: '/plugins/test/agents/my-agent', systemPrompt: '', capabilities: [] },
        ],
      });

      await adapter.compilePlugin(plugin);

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain('## Agents');
      expect(content).toContain('### my-agent');
      expect(content).toContain('# Agent Instructions');
    });

    it('should add commands to AGENTS.md with Commands header', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('AGENTS.md')) return true;
        if (p.endsWith('config.json')) return false;
        if (p.endsWith('cmd.md')) return true;
        return false;
      });
      mockReadFile.mockImplementation(async (p: string) => {
        if (p.endsWith('AGENTS.md')) return '# AGENTS';
        return '---\ndesc: cmd\n---\n# Command Body';
      });

      const plugin = makePlugin({
        commands: [
          { name: 'sw.do', path: '/plugins/test/commands/cmd.md', description: 'Do', prompt: '' },
        ],
      });

      await adapter.compilePlugin(plugin);

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain('## Commands');
      expect(content).toContain('### /sw.do');
      // Frontmatter should be stripped
      expect(content).toContain('# Command Body');
    });

    it('should inject system prompt for non-English language', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('AGENTS.md')) return true;
        if (p.endsWith('config.json')) return true;
        return false;
      });
      mockReadJson.mockResolvedValue({ language: 'es' });
      mockReadFile.mockImplementation(async (p: string) => {
        if (p.endsWith('AGENTS.md')) return '# AGENTS';
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

    it('should preserve existing AGENTS.md content', async () => {
      mockReadFile.mockImplementation(async (p: string) => {
        if (p.endsWith('AGENTS.md')) return '# Existing Content\n\nSome existing text.';
        return '';
      });

      await adapter.compilePlugin(makePlugin());

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toMatch(/^# Existing Content\n\nSome existing text\./);
    });

    it('should log compilation summary', async () => {
      mockReadFile.mockResolvedValue('# AGENTS');

      const plugin = makePlugin({
        skills: [
          { name: 'a', path: '/p/a', description: '' },
          { name: 'b', path: '/p/b', description: '' },
        ],
        agents: [{ name: 'c', path: '/p/c', systemPrompt: '', capabilities: [] }],
        commands: [],
      });

      // Skills/agents read their files
      mockReadFile.mockImplementation(async (p: string) => {
        if (p.endsWith('AGENTS.md')) return '# AGENTS';
        return 'content';
      });

      await adapter.compilePlugin(plugin);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 skills added'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 agents added'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0 commands added'));
    });
  });

  // ─── unloadPlugin() ───────────────────────────────────────

  describe('unloadPlugin()', () => {
    it('should warn if AGENTS.md not found', async () => {
      mockPathExists.mockResolvedValue(false);

      await adapter.unloadPlugin('specweave-test');

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('AGENTS.md not found'));
    });

    it('should warn if plugin not found in AGENTS.md', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('# AGENTS\n\nNo plugins here.');

      await adapter.unloadPlugin('specweave-test');

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found in AGENTS.md'));
    });

    it('should warn if plugin section is malformed (no end marker)', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('# AGENTS\n\n<!-- Plugin: specweave-test -->\nSome content without end marker');

      await adapter.unloadPlugin('specweave-test');

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('malformed'));
    });

    it('should remove plugin section from AGENTS.md', async () => {
      mockPathExists.mockResolvedValue(true);
      const agentsContent = [
        '# AGENTS',
        '',
        'Intro text.',
        '',
        '<!-- Plugin: specweave-test -->',
        '',
        '# Plugin: specweave-test',
        '',
        'Plugin content here.',
        '',
        '<!-- End Plugin: specweave-test -->',
        '',
        'Footer text.',
      ].join('\n');
      mockReadFile.mockResolvedValue(agentsContent);
      mockWriteFile.mockResolvedValue(undefined);

      await adapter.unloadPlugin('specweave-test');

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('AGENTS.md'),
        expect.any(String),
        'utf-8'
      );

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).not.toContain('<!-- Plugin: specweave-test -->');
      expect(writtenContent).not.toContain('Plugin content here.');
      expect(writtenContent).toContain('# AGENTS');
      expect(writtenContent).toContain('Intro text.');
      expect(writtenContent).toContain('Footer text.');
    });

    it('should log success messages', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(
        '<!-- Plugin: specweave-x -->content<!-- End Plugin: specweave-x -->'
      );
      mockWriteFile.mockResolvedValue(undefined);

      await adapter.unloadPlugin('specweave-x');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Removed from AGENTS.md'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('specweave-x unloaded'));
    });
  });

  // ─── getInstalledPlugins() ─────────────────────────────────

  describe('getInstalledPlugins()', () => {
    it('should return empty array when AGENTS.md does not exist', async () => {
      mockPathExists.mockResolvedValue(false);

      const result = await adapter.getInstalledPlugins();
      expect(result).toEqual([]);
    });

    it('should return empty array when no plugins in AGENTS.md', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('# AGENTS\n\nNo plugins.');

      const result = await adapter.getInstalledPlugins();
      expect(result).toEqual([]);
    });

    it('should parse plugin markers from AGENTS.md', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue([
        '# AGENTS',
        '<!-- Plugin: specweave-core -->',
        'Content',
        '<!-- End Plugin: specweave-core -->',
        '<!-- Plugin: specweave-github -->',
        'Content',
        '<!-- End Plugin: specweave-github -->',
      ].join('\n'));

      const result = await adapter.getInstalledPlugins();
      expect(result).toEqual(['specweave-core', 'specweave-github']);
    });

    it('should only match specweave-prefixed plugin names', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue([
        '<!-- Plugin: specweave-core -->',
        '<!-- Plugin: other-plugin -->',
        '<!-- Plugin: specweave-github -->',
      ].join('\n'));

      const result = await adapter.getInstalledPlugins();
      // Regex only matches specweave-[a-z0-9-]+
      expect(result).toEqual(['specweave-core', 'specweave-github']);
      expect(result).not.toContain('other-plugin');
    });

    it('should handle AGENTS.md with single plugin', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('<!-- Plugin: specweave-testing -->');

      const result = await adapter.getInstalledPlugins();
      expect(result).toEqual(['specweave-testing']);
    });
  });
});
