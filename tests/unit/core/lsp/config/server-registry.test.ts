/**
 * Tests for ServerRegistry
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-004: Custom LSP Registration
 * @satisfies AC-US4-01
 */

import { describe, it, expect } from 'vitest';
import {
  ServerRegistry,
  ServerConfig,
} from '../../../../../src/core/lsp/config/server-registry.js';

describe('ServerRegistry', () => {
  describe('custom server parsing', () => {
    it('parses custom server from config', () => {
      const registry = new ServerRegistry({
        servers: {
          myLang: {
            command: 'my-lsp',
            args: ['--stdio'],
            filePatterns: ['*.xyz'],
          },
        },
      });

      const server = registry.get('myLang');

      expect(server).toBeDefined();
      expect(server?.command).toBe('my-lsp');
      expect(server?.args).toEqual(['--stdio']);
    });

    it('includes filePatterns in custom server', () => {
      const registry = new ServerRegistry({
        servers: {
          custom: {
            command: 'custom-lsp',
            filePatterns: ['*.custom', '*.xyz'],
            languageId: 'customlang',
          },
        },
      });

      const server = registry.get('custom');

      expect(server?.filePatterns).toEqual(['*.custom', '*.xyz']);
      expect(server?.languageId).toBe('customlang');
    });
  });

  describe('built-in servers', () => {
    it('provides built-in typescript server', () => {
      const registry = new ServerRegistry({});

      const server = registry.get('typescript');

      expect(server).toBeDefined();
      expect(server?.command).toBe('typescript-language-server');
    });

    it('provides built-in csharp server', () => {
      const registry = new ServerRegistry({});

      const server = registry.get('csharp');

      expect(server).toBeDefined();
      expect(server?.command).toBe('csharp-ls');
    });

    it('provides built-in go server', () => {
      const registry = new ServerRegistry({});

      const server = registry.get('go');

      expect(server).toBeDefined();
      expect(server?.command).toBe('gopls');
    });

    it('provides built-in python server', () => {
      const registry = new ServerRegistry({});

      const server = registry.get('python');

      expect(server).toBeDefined();
      expect(server?.command).toBe('pyright-langserver');
    });

    it('provides built-in rust server', () => {
      const registry = new ServerRegistry({});

      const server = registry.get('rust');

      expect(server).toBeDefined();
      expect(server?.command).toBe('rust-analyzer');
    });
  });

  describe('merging custom and built-in', () => {
    it('merges custom with built-in servers', () => {
      const registry = new ServerRegistry({
        servers: {
          custom: { command: 'custom-lsp', filePatterns: ['*.custom'] },
        },
      });

      expect(registry.get('typescript')).toBeDefined(); // built-in
      expect(registry.get('custom')).toBeDefined(); // custom
    });

    it('custom server overrides built-in with same name', () => {
      const registry = new ServerRegistry({
        servers: {
          typescript: {
            command: 'my-ts-server',
            args: ['--custom'],
          },
        },
      });

      const server = registry.get('typescript');

      expect(server?.command).toBe('my-ts-server');
      expect(server?.args).toEqual(['--custom']);
    });
  });

  describe('listing servers', () => {
    it('lists all available servers', () => {
      const registry = new ServerRegistry({
        servers: {
          custom: { command: 'custom-lsp', filePatterns: ['*.custom'] },
        },
      });

      const servers = registry.listAll();

      expect(servers).toContain('typescript');
      expect(servers).toContain('csharp');
      expect(servers).toContain('custom');
    });

    it('lists only custom servers', () => {
      const registry = new ServerRegistry({
        servers: {
          lang1: { command: 'lsp1', filePatterns: ['*.l1'] },
          lang2: { command: 'lsp2', filePatterns: ['*.l2'] },
        },
      });

      const custom = registry.listCustom();

      expect(custom).toContain('lang1');
      expect(custom).toContain('lang2');
      expect(custom).not.toContain('typescript');
    });
  });

  describe('isCustom', () => {
    it('returns true for custom servers', () => {
      const registry = new ServerRegistry({
        servers: {
          myServer: { command: 'my-lsp', filePatterns: ['*.my'] },
        },
      });

      expect(registry.isCustom('myServer')).toBe(true);
      expect(registry.isCustom('typescript')).toBe(false);
    });
  });
});
