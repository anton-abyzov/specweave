/**
 * Tests for LspDoctor
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-005: Progress & Diagnostics
 * @satisfies AC-US5-03, AC-US5-04
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LspDoctor,
  DoctorResult,
  ServerChecker,
} from '../../../../../src/core/lsp/diagnostics/doctor.js';

/**
 * Mock server checker for testing
 */
function createMockChecker(installed: string[], working: string[]): ServerChecker {
  return {
    async isInstalled(server: string): Promise<boolean> {
      return installed.includes(server);
    },
    async testConnection(server: string): Promise<boolean> {
      return working.includes(server);
    },
  };
}

describe('LspDoctor', () => {
  describe('detectInstalledServers', () => {
    it('detects installed LSP servers', async () => {
      const checker = createMockChecker(
        ['typescript-language-server', 'csharp-ls'],
        ['typescript-language-server', 'csharp-ls']
      );
      const doctor = new LspDoctor(checker);

      const result = await doctor.diagnose();

      expect(result.installedServers).toContain('typescript-language-server');
      expect(result.installedServers).toContain('csharp-ls');
    });

    it('returns empty array when no servers installed', async () => {
      const checker = createMockChecker([], []);
      const doctor = new LspDoctor(checker);

      const result = await doctor.diagnose();

      expect(result.installedServers).toEqual([]);
    });
  });

  describe('testConnectivity', () => {
    it('tests server connectivity', async () => {
      const checker = createMockChecker(
        ['typescript-language-server'],
        ['typescript-language-server']
      );
      const doctor = new LspDoctor(checker);

      const result = await doctor.diagnose();

      expect(result.connectivity['typescript-language-server']).toBe('ok');
    });

    it('reports failed connectivity', async () => {
      const checker = createMockChecker(
        ['csharp-ls'],
        [] // installed but not working
      );
      const doctor = new LspDoctor(checker);

      const result = await doctor.diagnose();

      expect(result.connectivity['csharp-ls']).toBe('failed');
    });
  });

  describe('suggestions', () => {
    it('suggests install command for missing csharp-ls', async () => {
      const checker = createMockChecker([], []);
      const doctor = new LspDoctor(checker);

      const result = await doctor.diagnose();

      expect(result.suggestions.some((s) => s.includes('dotnet tool install -g csharp-ls'))).toBe(true);
    });

    it('suggests install command for missing typescript-language-server', async () => {
      const checker = createMockChecker([], []);
      const doctor = new LspDoctor(checker);

      const result = await doctor.diagnose();

      expect(result.suggestions.some((s) => s.includes('npm install -g typescript-language-server'))).toBe(true);
    });

    it('suggests install command for missing gopls', async () => {
      const checker = createMockChecker([], []);
      const doctor = new LspDoctor(checker);

      const result = await doctor.diagnose();

      expect(result.suggestions.some((s) => s.includes('go install golang.org/x/tools/gopls'))).toBe(true);
    });

    it('suggests install command for missing pyright', async () => {
      const checker = createMockChecker([], []);
      const doctor = new LspDoctor(checker);

      const result = await doctor.diagnose();

      expect(result.suggestions.some((s) => s.includes('npm install -g pyright'))).toBe(true);
    });

    it('suggests install command for missing rust-analyzer', async () => {
      const checker = createMockChecker([], []);
      const doctor = new LspDoctor(checker);

      const result = await doctor.diagnose();

      expect(result.suggestions.some((s) => s.includes('rustup component add rust-analyzer'))).toBe(true);
    });

    it('returns no suggestions when all servers installed', async () => {
      const checker = createMockChecker(
        ['typescript-language-server', 'csharp-ls', 'gopls', 'pyright', 'rust-analyzer'],
        ['typescript-language-server', 'csharp-ls', 'gopls', 'pyright', 'rust-analyzer']
      );
      const doctor = new LspDoctor(checker);

      const result = await doctor.diagnose();

      expect(result.suggestions).toEqual([]);
    });
  });

  describe('overall status', () => {
    it('returns healthy when all servers working', async () => {
      const checker = createMockChecker(
        ['typescript-language-server'],
        ['typescript-language-server']
      );
      const doctor = new LspDoctor(checker);

      const result = await doctor.diagnose();

      expect(result.healthy).toBe(true);
    });

    it('returns unhealthy when no servers installed', async () => {
      const checker = createMockChecker([], []);
      const doctor = new LspDoctor(checker);

      const result = await doctor.diagnose();

      expect(result.healthy).toBe(false);
    });
  });
});
