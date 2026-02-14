/**
 * Tests for LspBootstrapper
 *
 * TDD for US-003: Smart LSP Bootstrap
 * ACs: AC-US3-01 through AC-US3-05
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  LspBootstrapper,
  type LspManagerLike,
  LANGUAGE_TO_SERVER_BINARY,
} from '../../../../src/core/living-docs/lsp-bootstrapper.js';

/** Create a mock LSP manager with configurable statistics */
function createMockLspManager(stats: {
  availableLanguages: string[];
  clientCount: number;
}): LspManagerLike & { initialize: ReturnType<typeof vi.fn>; shutdown: ReturnType<typeof vi.fn> } {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
    getStatistics: vi.fn().mockReturnValue(stats),
  };
}

/** Create a mock binary checker */
function createMockBinaryChecker(
  availableBinaries: string[]
): (binary: string) => boolean {
  return (binary: string) => availableBinaries.includes(binary);
}

describe('LspBootstrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC-US3-01: Initialize only matching LSP clients', () => {
    it('should only initialize LSP clients for detected languages', async () => {
      const mockManager = createMockLspManager({
        availableLanguages: ['typescript'],
        clientCount: 1,
      });

      const bootstrapper = new LspBootstrapper('/fake/project', {
        isBinaryAvailable: createMockBinaryChecker(['tsserver']),
        createLspManager: () => mockManager,
      });
      const context = await bootstrapper.bootstrap(['typescript']);

      expect(context.availableLanguages).toContain('typescript');
      expect(context.availableLanguages).not.toContain('python');
      expect(context.availableLanguages).not.toContain('go');
    });

    it('should initialize multiple LSP clients for multi-language projects', async () => {
      const mockManager = createMockLspManager({
        availableLanguages: ['typescript', 'python'],
        clientCount: 2,
      });

      const bootstrapper = new LspBootstrapper('/fake/project', {
        isBinaryAvailable: createMockBinaryChecker([
          'tsserver',
          'pyright-langserver',
        ]),
        createLspManager: () => mockManager,
      });
      const context = await bootstrapper.bootstrap(['typescript', 'python']);

      expect(context.availableLanguages).toContain('typescript');
      expect(context.availableLanguages).toContain('python');
    });
  });

  describe('AC-US3-02: Check if language server binary exists', () => {
    it('should check binary availability before initialization', async () => {
      const checkBinary = vi.fn().mockReturnValue(false);

      const bootstrapper = new LspBootstrapper('/fake/project', {
        isBinaryAvailable: checkBinary,
      });
      await bootstrapper.bootstrap(['typescript']);

      // Should have checked tsserver and typescript-language-server
      expect(checkBinary).toHaveBeenCalledWith('tsserver');
      expect(checkBinary).toHaveBeenCalledWith('typescript-language-server');
    });
  });

  describe('AC-US3-03: Skip gracefully if server not installed', () => {
    it('should skip languages where server binary is not found', async () => {
      const bootstrapper = new LspBootstrapper('/fake/project', {
        isBinaryAvailable: () => false,
      });
      const context = await bootstrapper.bootstrap([
        'typescript',
        'python',
        'go',
      ]);

      expect(context.availableLanguages).toHaveLength(0);
      expect(context.lspManager).toBeNull();
    });

    it('should log a warning for unavailable servers', async () => {
      const { consoleLogger } = await import(
        '../../../../src/utils/logger.js'
      );

      const bootstrapper = new LspBootstrapper('/fake/project', {
        isBinaryAvailable: () => false,
      });
      await bootstrapper.bootstrap(['typescript']);

      expect(consoleLogger.warn).toHaveBeenCalled();
    });
  });

  describe('AC-US3-04: Return LspContext object', () => {
    it('should return LspContext with initialized clients', async () => {
      const mockManager = createMockLspManager({
        availableLanguages: ['typescript'],
        clientCount: 1,
      });

      const bootstrapper = new LspBootstrapper('/fake/project', {
        isBinaryAvailable: createMockBinaryChecker(['tsserver']),
        createLspManager: () => mockManager,
      });
      const context = await bootstrapper.bootstrap(['typescript']);

      expect(context).toHaveProperty('lspManager');
      expect(context).toHaveProperty('availableLanguages');
      expect(context).toHaveProperty('skippedLanguages');
      expect(context.lspManager).not.toBeNull();
    });

    it('should track skipped languages in LspContext', async () => {
      const mockManager = createMockLspManager({
        availableLanguages: ['typescript'],
        clientCount: 1,
      });

      const bootstrapper = new LspBootstrapper('/fake/project', {
        isBinaryAvailable: createMockBinaryChecker(['tsserver']),
        createLspManager: () => mockManager,
      });
      const context = await bootstrapper.bootstrap(['typescript', 'go']);

      expect(context.availableLanguages).toContain('typescript');
      expect(context.skippedLanguages).toContain('go');
    });
  });

  describe('AC-US3-05: Fall back cleanly if zero servers available', () => {
    it('should return clean context with null lspManager when no servers available', async () => {
      const bootstrapper = new LspBootstrapper('/fake/project', {
        isBinaryAvailable: () => false,
      });
      const context = await bootstrapper.bootstrap(['typescript', 'python']);

      expect(context.lspManager).toBeNull();
      expect(context.availableLanguages).toHaveLength(0);
      expect(context.skippedLanguages).toEqual(
        expect.arrayContaining(['typescript', 'python'])
      );
    });

    it('should not throw errors when no servers are available', async () => {
      const bootstrapper = new LspBootstrapper('/fake/project', {
        isBinaryAvailable: () => false,
      });

      await expect(bootstrapper.bootstrap([])).resolves.toBeDefined();
    });

    it('should handle empty languagesDetected gracefully', async () => {
      const bootstrapper = new LspBootstrapper('/fake/project');
      const context = await bootstrapper.bootstrap([]);

      expect(context.lspManager).toBeNull();
      expect(context.availableLanguages).toHaveLength(0);
      expect(context.skippedLanguages).toHaveLength(0);
    });
  });

  describe('LANGUAGE_TO_SERVER_BINARY mapping', () => {
    it('should cover all 11 supported languages (10 + javascript)', () => {
      const expectedLanguages = [
        'typescript',
        'javascript',
        'python',
        'go',
        'rust',
        'java',
        'csharp',
        'kotlin',
        'swift',
        'php',
        'ruby',
      ];

      for (const lang of expectedLanguages) {
        expect(LANGUAGE_TO_SERVER_BINARY[lang]).toBeDefined();
        expect(LANGUAGE_TO_SERVER_BINARY[lang].length).toBeGreaterThan(0);
      }
    });
  });

  describe('initialize() failure handling', () => {
    it('should fall back cleanly when LSP manager initialize() throws', async () => {
      const mockManager = createMockLspManager({
        availableLanguages: ['typescript'],
        clientCount: 1,
      });
      mockManager.initialize.mockRejectedValue(new Error('Server crashed'));

      const bootstrapper = new LspBootstrapper('/fake/project', {
        isBinaryAvailable: createMockBinaryChecker(['tsserver']),
        createLspManager: () => mockManager,
      });
      const context = await bootstrapper.bootstrap(['typescript']);

      expect(context.lspManager).toBeNull();
      expect(context.availableLanguages).toHaveLength(0);
      expect(context.skippedLanguages).toContain('typescript');
    });
  });

  describe('shutdown', () => {
    it('should shutdown LSP manager on cleanup', async () => {
      const mockManager = createMockLspManager({
        availableLanguages: ['typescript'],
        clientCount: 1,
      });

      const bootstrapper = new LspBootstrapper('/fake/project', {
        isBinaryAvailable: createMockBinaryChecker(['tsserver']),
        createLspManager: () => mockManager,
      });
      await bootstrapper.bootstrap(['typescript']);
      await bootstrapper.shutdown();

      expect(mockManager.shutdown).toHaveBeenCalled();
    });
  });
});
