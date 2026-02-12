/**
 * AdapterBase Tests
 *
 * Tests the concrete methods of the abstract AdapterBase class
 * using a minimal TestAdapter subclass.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks - must be declared before vi.mock() calls
const {
  mockEnsureDir,
  mockPathExists,
  mockCopy,
  mockAccess,
  mockReadFile,
  mockReadJson,
  mockExecSync,
  mockGetDirname,
  mockGetSystemPromptForLanguage,
} = vi.hoisted(() => ({
  mockEnsureDir: vi.fn(),
  mockPathExists: vi.fn(),
  mockCopy: vi.fn(),
  mockAccess: vi.fn(),
  mockReadFile: vi.fn(),
  mockReadJson: vi.fn(),
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
  readJson: mockReadJson,
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

import { AdapterBase } from '../../../src/adapters/adapter-base.js';
import type { AdapterFile, AutomationLevel } from '../../../src/adapters/adapter-interface.js';
import type { Plugin } from '../../../src/core/types/plugin.js';

/**
 * Concrete subclass for testing abstract AdapterBase
 */
class TestAdapter extends AdapterBase {
  name = 'test-adapter';
  description = 'A test adapter';
  automationLevel: AutomationLevel = 'basic';

  private files: AdapterFile[] = [];

  setFiles(files: AdapterFile[]): void {
    this.files = files;
  }

  getFiles(): AdapterFile[] {
    return this.files;
  }

  getInstructions(): string {
    return 'Test instructions here.';
  }

  // Expose protected methods for testing
  async testCommandExists(command: string): Promise<boolean> {
    return this.commandExists(command);
  }

  async testFileExists(filePath: string): Promise<boolean> {
    return this.fileExists(filePath);
  }

  async testReadTemplate(
    templatePath: string,
    variables: Record<string, string>
  ): Promise<string> {
    return this.readTemplate(templatePath, variables);
  }

  async testGetLanguageConfig() {
    return this.getLanguageConfig();
  }

  testInjectSystemPrompt(content: string, language: 'en' | 'ru' | 'es'): string {
    return this.injectSystemPrompt(content, language as any);
  }
}

describe('AdapterBase', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new TestAdapter();
  });

  // ─── detect() ──────────────────────────────────────────────

  describe('detect()', () => {
    it('should return false by default', async () => {
      const result = await adapter.detect();
      expect(result).toBe(false);
    });
  });

  // ─── checkRequirements() ───────────────────────────────────

  describe('checkRequirements()', () => {
    it('should return met=true when Node >= 18 and git is available', async () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', { value: 'v20.10.0', configurable: true });
      mockExecSync.mockReturnValue(Buffer.from('git version 2.39.0'));

      const result = await adapter.checkRequirements();

      expect(result.met).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);

      Object.defineProperty(process, 'version', { value: originalVersion, configurable: true });
    });

    it('should set met=false when Node < 18', async () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', { value: 'v16.5.0', configurable: true });
      mockExecSync.mockReturnValue(Buffer.from('git version 2.39.0'));

      const result = await adapter.checkRequirements();

      expect(result.met).toBe(false);
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0]).toContain('Node.js >= 18.0.0');
      expect(result.missing[0]).toContain('v16.5.0');

      Object.defineProperty(process, 'version', { value: originalVersion, configurable: true });
    });

    it('should add warning when git is not found', async () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', { value: 'v20.10.0', configurable: true });
      mockExecSync.mockImplementation(() => {
        throw new Error('git not found');
      });

      const result = await adapter.checkRequirements();

      expect(result.met).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Git not found');

      Object.defineProperty(process, 'version', { value: originalVersion, configurable: true });
    });

    it('should report both Node version failure and git warning', async () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', { value: 'v14.0.0', configurable: true });
      mockExecSync.mockImplementation(() => {
        throw new Error('git not found');
      });

      const result = await adapter.checkRequirements();

      expect(result.met).toBe(false);
      expect(result.missing).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);

      Object.defineProperty(process, 'version', { value: originalVersion, configurable: true });
    });

    it('should pass for Node v18 exactly', async () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', { value: 'v18.0.0', configurable: true });
      mockExecSync.mockReturnValue(Buffer.from('git version 2.39.0'));

      const result = await adapter.checkRequirements();

      expect(result.met).toBe(true);
      expect(result.missing).toHaveLength(0);

      Object.defineProperty(process, 'version', { value: originalVersion, configurable: true });
    });
  });

  // ─── install() ─────────────────────────────────────────────

  describe('install()', () => {
    const options = {
      projectPath: '/test/project',
      projectName: 'test-project',
    };

    it('should copy files when source exists', async () => {
      const files: AdapterFile[] = [
        { sourcePath: 'config.json', targetPath: '.specweave/config.json', description: 'Config' },
      ];
      adapter.setFiles(files);
      mockPathExists.mockResolvedValue(true);
      mockEnsureDir.mockResolvedValue(undefined);
      mockCopy.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await adapter.install(options);

      expect(mockEnsureDir).toHaveBeenCalledWith('/test/project/.specweave');
      expect(mockCopy).toHaveBeenCalledWith(
        '/fake/adapters/test-adapter/config.json',
        '/test/project/.specweave/config.json'
      );
      consoleSpy.mockRestore();
    });

    it('should warn when source file does not exist', async () => {
      const files: AdapterFile[] = [
        { sourcePath: 'missing.txt', targetPath: 'missing.txt', description: 'Missing' },
      ];
      adapter.setFiles(files);
      mockPathExists.mockResolvedValue(false);
      mockEnsureDir.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await adapter.install(options);

      expect(mockCopy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('should handle multiple files', async () => {
      const files: AdapterFile[] = [
        { sourcePath: 'a.txt', targetPath: 'dir/a.txt', description: 'File A' },
        { sourcePath: 'b.txt', targetPath: 'dir/b.txt', description: 'File B' },
        { sourcePath: 'c.txt', targetPath: 'other/c.txt', description: 'File C' },
      ];
      adapter.setFiles(files);
      mockPathExists.mockResolvedValue(true);
      mockEnsureDir.mockResolvedValue(undefined);
      mockCopy.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await adapter.install(options);

      expect(mockEnsureDir).toHaveBeenCalledTimes(3);
      expect(mockCopy).toHaveBeenCalledTimes(3);

      consoleSpy.mockRestore();
    });

    it('should not copy any files when file list is empty', async () => {
      adapter.setFiles([]);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await adapter.install(options);

      expect(mockCopy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ─── postInstall() ─────────────────────────────────────────

  describe('postInstall()', () => {
    it('should log instructions', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await adapter.postInstall({ projectPath: '/test', projectName: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test instructions here.'));
      consoleSpy.mockRestore();
    });
  });

  // ─── commandExists() ──────────────────────────────────────

  describe('commandExists()', () => {
    it('should return true when command is found', async () => {
      mockExecSync.mockReturnValue(Buffer.from('/usr/bin/node'));

      const result = await adapter.testCommandExists('node');

      expect(result).toBe(true);
    });

    it('should return false when command is not found', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const result = await adapter.testCommandExists('nonexistent');

      expect(result).toBe(false);
    });

    it('should use "which" on non-win32 platforms', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
      mockExecSync.mockReturnValue(Buffer.from('/usr/bin/git'));

      await adapter.testCommandExists('git');

      expect(mockExecSync).toHaveBeenCalledWith('which git', { stdio: 'ignore' });

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should use "where" on win32 platform', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      mockExecSync.mockReturnValue(Buffer.from('C:\\Windows\\git.exe'));

      await adapter.testCommandExists('git');

      expect(mockExecSync).toHaveBeenCalledWith('where git', { stdio: 'ignore' });

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });
  });

  // ─── fileExists() ──────────────────────────────────────────

  describe('fileExists()', () => {
    it('should return true when file is accessible', async () => {
      mockAccess.mockResolvedValue(undefined);

      const result = await adapter.testFileExists('/some/file.txt');

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('/some/file.txt');
    });

    it('should return false when file is not accessible', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await adapter.testFileExists('/missing/file.txt');

      expect(result).toBe(false);
    });
  });

  // ─── readTemplate() ────────────────────────────────────────

  describe('readTemplate()', () => {
    it('should replace single variable', async () => {
      mockReadFile.mockResolvedValue('Hello, {{name}}!');

      const result = await adapter.testReadTemplate('/tpl.txt', { name: 'World' });

      expect(result).toBe('Hello, World!');
      expect(mockReadFile).toHaveBeenCalledWith('/tpl.txt', 'utf-8');
    });

    it('should replace multiple variables', async () => {
      mockReadFile.mockResolvedValue('{{greeting}}, {{name}}! Welcome to {{place}}.');

      const result = await adapter.testReadTemplate('/tpl.txt', {
        greeting: 'Hi',
        name: 'Alice',
        place: 'Wonderland',
      });

      expect(result).toBe('Hi, Alice! Welcome to Wonderland.');
    });

    it('should replace all occurrences of the same variable', async () => {
      mockReadFile.mockResolvedValue('{{x}} and {{x}} again');

      const result = await adapter.testReadTemplate('/tpl.txt', { x: 'foo' });

      expect(result).toBe('foo and foo again');
    });

    it('should leave unreferenced placeholders intact', async () => {
      mockReadFile.mockResolvedValue('{{known}} and {{unknown}}');

      const result = await adapter.testReadTemplate('/tpl.txt', { known: 'yes' });

      expect(result).toBe('yes and {{unknown}}');
    });

    it('should handle empty variables object', async () => {
      mockReadFile.mockResolvedValue('No vars here.');

      const result = await adapter.testReadTemplate('/tpl.txt', {});

      expect(result).toBe('No vars here.');
    });
  });

  // ─── supportsPlugins() ─────────────────────────────────────

  describe('supportsPlugins()', () => {
    it('should return false by default', () => {
      expect(adapter.supportsPlugins()).toBe(false);
    });
  });

  // ─── compilePlugin() ───────────────────────────────────────

  describe('compilePlugin()', () => {
    it('should throw with adapter name in error message', async () => {
      const fakePlugin = { manifest: { name: 'test-plugin' } } as Plugin;

      await expect(adapter.compilePlugin(fakePlugin)).rejects.toThrow(
        'Plugin support not implemented for test-adapter adapter'
      );
    });
  });

  // ─── unloadPlugin() ────────────────────────────────────────

  describe('unloadPlugin()', () => {
    it('should throw with adapter name in error message', async () => {
      await expect(adapter.unloadPlugin('some-plugin')).rejects.toThrow(
        'Plugin support not implemented for test-adapter adapter'
      );
    });
  });

  // ─── getInstalledPlugins() ─────────────────────────────────

  describe('getInstalledPlugins()', () => {
    it('should return empty array by default', async () => {
      const result = await adapter.getInstalledPlugins();
      expect(result).toEqual([]);
    });
  });

  // ─── getLanguageConfig() ───────────────────────────────────

  describe('getLanguageConfig()', () => {
    it('should return "en" when config file does not exist', async () => {
      mockPathExists.mockResolvedValue(false);

      const result = await adapter.testGetLanguageConfig();

      expect(result).toBe('en');
    });

    it('should return language from config when present', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue({ language: 'ru' });

      const result = await adapter.testGetLanguageConfig();

      expect(result).toBe('ru');
    });

    it('should return "en" when config has no language field', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadJson.mockResolvedValue({});

      const result = await adapter.testGetLanguageConfig();

      expect(result).toBe('en');
    });

    it('should return "en" when readJson throws', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadJson.mockRejectedValue(new Error('parse error'));

      const result = await adapter.testGetLanguageConfig();

      expect(result).toBe('en');
    });

    it('should check the correct config path', async () => {
      mockPathExists.mockResolvedValue(false);

      await adapter.testGetLanguageConfig();

      const calledPath = mockPathExists.mock.calls[0][0] as string;
      expect(calledPath).toContain('.specweave');
      expect(calledPath).toContain('config.json');
    });
  });

  // ─── injectSystemPrompt() ─────────────────────────────────

  describe('injectSystemPrompt()', () => {
    it('should return content unchanged for English', () => {
      const content = 'Hello world';
      const result = adapter.testInjectSystemPrompt(content, 'en');

      expect(result).toBe('Hello world');
      expect(mockGetSystemPromptForLanguage).not.toHaveBeenCalled();
    });

    it('should prepend system prompt for non-English without frontmatter', () => {
      mockGetSystemPromptForLanguage.mockReturnValue('RESPOND IN RUSSIAN');

      const result = adapter.testInjectSystemPrompt('Some content', 'ru');

      expect(result).toBe('RESPOND IN RUSSIAN\n\nSome content');
    });

    it('should inject system prompt after YAML frontmatter', () => {
      mockGetSystemPromptForLanguage.mockReturnValue('RESPOND IN RUSSIAN');
      const content = '---\ntitle: Test\n---\nBody content';

      const result = adapter.testInjectSystemPrompt(content, 'ru');

      // body = content.substring(endOfFrontmatter + 3) = '\nBody content'
      // result = frontmatter + '\n\n' + systemPrompt + '\n' + body
      expect(result).toBe('---\ntitle: Test\n---\n\nRESPOND IN RUSSIAN\n\nBody content');
    });

    it('should handle frontmatter with no closing delimiter gracefully', () => {
      mockGetSystemPromptForLanguage.mockReturnValue('RESPOND IN SPANISH');
      const content = '---\ntitle: Test\nNo closing delimiter';

      const result = adapter.testInjectSystemPrompt(content, 'es');

      // indexOf('---', 3) returns -1, so it falls through to prepend
      expect(result).toBe('RESPOND IN SPANISH\n\n---\ntitle: Test\nNo closing delimiter');
    });

    it('should handle empty content for non-English', () => {
      mockGetSystemPromptForLanguage.mockReturnValue('LANG PROMPT');

      const result = adapter.testInjectSystemPrompt('', 'ru');

      expect(result).toBe('LANG PROMPT\n\n');
    });

    it('should handle content that is only frontmatter', () => {
      mockGetSystemPromptForLanguage.mockReturnValue('LANG PROMPT');
      const content = '---\nkey: val\n---';

      const result = adapter.testInjectSystemPrompt(content, 'ru');

      expect(result).toBe('---\nkey: val\n---\n\nLANG PROMPT\n');
    });
  });

  // ─── abstract properties ──────────────────────────────────

  describe('abstract properties', () => {
    it('should have name property', () => {
      expect(adapter).toHaveProperty('name', 'test-adapter');
    });

    it('should have description property', () => {
      expect(adapter).toHaveProperty('description', 'A test adapter');
    });

    it('should have automationLevel property', () => {
      expect(adapter).toHaveProperty('automationLevel', 'basic');
    });
  });
});
