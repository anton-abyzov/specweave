/**
 * Tests for LspPrompt - Interactive LSP server suggestion
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-003: Language-Aware Warm-up Strategies
 * @satisfies AC-US3-03, AC-US3-04, AC-US3-05
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LspPrompt,
  PromptAdapter,
  LspSuggestion,
  PromptResult,
} from '../../../../../src/core/lsp/config/lsp-prompt.js';

/**
 * Mock prompt adapter for testing
 */
function createMockPromptAdapter(): PromptAdapter & {
  mockResponse: (response: string[]) => void;
  getLastPromptConfig: () => unknown;
} {
  let response: string[] = [];
  let lastPromptConfig: unknown;

  return {
    mockResponse(resp: string[]) {
      response = resp;
    },
    getLastPromptConfig() {
      return lastPromptConfig;
    },
    async prompt(config: {
      message: string;
      choices: Array<{ name: string; value: string }>;
      maxSelections?: number;
    }): Promise<string[]> {
      lastPromptConfig = config;
      return response;
    },
  };
}

describe('LspPrompt', () => {
  let promptAdapter: ReturnType<typeof createMockPromptAdapter>;
  let lspPrompt: LspPrompt;

  beforeEach(() => {
    promptAdapter = createMockPromptAdapter();
    lspPrompt = new LspPrompt(promptAdapter);
  });

  describe('suggestion display', () => {
    it('shows suggestions from analyzer', async () => {
      promptAdapter.mockResponse(['typescript', 'csharp']);

      const suggestions: LspSuggestion[] = [
        { language: 'typescript', server: 'typescript-language-server', score: 100 },
        { language: 'csharp', server: 'csharp-ls', score: 80 },
        { language: 'python', server: 'pyright', score: 60 },
      ];

      await lspPrompt.show(suggestions);

      const config = promptAdapter.getLastPromptConfig() as {
        choices: Array<{ name: string; value: string }>;
      };
      expect(config.choices).toHaveLength(3);
      expect(config.choices[0].value).toBe('typescript');
      expect(config.choices[1].value).toBe('csharp');
      expect(config.choices[2].value).toBe('python');
    });

    it('includes score in display', async () => {
      promptAdapter.mockResponse([]);

      const suggestions: LspSuggestion[] = [
        { language: 'typescript', server: 'typescript-language-server', score: 100 },
      ];

      await lspPrompt.show(suggestions);

      const config = promptAdapter.getLastPromptConfig() as {
        choices: Array<{ name: string; value: string }>;
      };
      expect(config.choices[0].name).toContain('100');
    });
  });

  describe('install commands', () => {
    it('shows install command for missing servers', async () => {
      promptAdapter.mockResponse(['csharp']);

      const suggestions: LspSuggestion[] = [
        {
          language: 'csharp',
          server: 'csharp-ls',
          score: 100,
          installed: false,
          installCommand: 'dotnet tool install -g csharp-ls',
        },
      ];

      const result = await lspPrompt.show(suggestions);

      expect(result.installCommands).toBeDefined();
      expect(result.installCommands?.['csharp']).toContain(
        'dotnet tool install -g csharp-ls'
      );
    });

    it('does not show install command for installed servers', async () => {
      promptAdapter.mockResponse(['typescript']);

      const suggestions: LspSuggestion[] = [
        {
          language: 'typescript',
          server: 'typescript-language-server',
          score: 100,
          installed: true,
        },
      ];

      const result = await lspPrompt.show(suggestions);

      expect(result.installCommands?.['typescript']).toBeUndefined();
    });

    it('includes npm install command for TypeScript server', async () => {
      promptAdapter.mockResponse(['typescript']);

      const suggestions: LspSuggestion[] = [
        {
          language: 'typescript',
          server: 'typescript-language-server',
          score: 100,
          installed: false,
          installCommand: 'npm install -g typescript-language-server typescript',
        },
      ];

      const result = await lspPrompt.show(suggestions);

      expect(result.installCommands?.['typescript']).toContain('npm install -g');
    });
  });

  describe('max servers limit', () => {
    it('enforces max 3 servers', async () => {
      promptAdapter.mockResponse(['ts', 'cs', 'py', 'go']);

      const suggestions: LspSuggestion[] = [
        { language: 'ts', server: 'ts-server', score: 100 },
        { language: 'cs', server: 'csharp-ls', score: 90 },
        { language: 'py', server: 'pyright', score: 80 },
        { language: 'go', server: 'gopls', score: 70 },
      ];

      const result = await lspPrompt.show(suggestions);

      expect(result.enabled.length).toBeLessThanOrEqual(3);
    });

    it('sets maxSelections to 3 in prompt config', async () => {
      promptAdapter.mockResponse([]);

      const suggestions: LspSuggestion[] = [
        { language: 'ts', server: 'ts-server', score: 100 },
        { language: 'cs', server: 'csharp-ls', score: 90 },
        { language: 'py', server: 'pyright', score: 80 },
        { language: 'go', server: 'gopls', score: 70 },
      ];

      await lspPrompt.show(suggestions);

      const config = promptAdapter.getLastPromptConfig() as { maxSelections?: number };
      expect(config.maxSelections).toBe(3);
    });
  });

  describe('selection result', () => {
    it('returns selected servers', async () => {
      promptAdapter.mockResponse(['typescript', 'csharp']);

      const suggestions: LspSuggestion[] = [
        { language: 'typescript', server: 'typescript-language-server', score: 100 },
        { language: 'csharp', server: 'csharp-ls', score: 80 },
        { language: 'python', server: 'pyright', score: 60 },
      ];

      const result = await lspPrompt.show(suggestions);

      expect(result.enabled).toContain('typescript');
      expect(result.enabled).toContain('csharp');
      expect(result.enabled).not.toContain('python');
    });

    it('returns empty array when no selection', async () => {
      promptAdapter.mockResponse([]);

      const suggestions: LspSuggestion[] = [
        { language: 'typescript', server: 'typescript-language-server', score: 100 },
      ];

      const result = await lspPrompt.show(suggestions);

      expect(result.enabled).toEqual([]);
    });
  });

  describe('server info display', () => {
    it('includes server name in choice display', async () => {
      promptAdapter.mockResponse([]);

      const suggestions: LspSuggestion[] = [
        { language: 'csharp', server: 'csharp-ls', score: 100 },
      ];

      await lspPrompt.show(suggestions);

      const config = promptAdapter.getLastPromptConfig() as {
        choices: Array<{ name: string; value: string }>;
      };
      expect(config.choices[0].name).toContain('csharp-ls');
    });

    it('shows installed status indicator', async () => {
      promptAdapter.mockResponse([]);

      const suggestions: LspSuggestion[] = [
        { language: 'typescript', server: 'ts-server', score: 100, installed: true },
        { language: 'python', server: 'pyright', score: 80, installed: false },
      ];

      await lspPrompt.show(suggestions);

      const config = promptAdapter.getLastPromptConfig() as {
        choices: Array<{ name: string; value: string }>;
      };
      // Installed server should have different indicator than not installed
      expect(config.choices[0].name).not.toBe(config.choices[1].name);
    });
  });
});
