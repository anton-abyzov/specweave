/**
 * Tests for LspConfig schema parsing
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-002: Configurable Timeouts
 * @satisfies AC-US2-01, AC-US2-04
 */

import { describe, it, expect } from 'vitest';
import { parseLspConfig, LspConfig, DEFAULT_TIMEOUT, DEFAULT_WARMUP_TIMEOUT } from '../../../../../src/core/lsp/config/lsp-config.js';

describe('LspConfig', () => {
  describe('parseLspConfig', () => {
    it('parses global timeout in seconds', () => {
      const config = parseLspConfig({ lsp: { timeout: 120 } });
      expect(config.timeout).toBe(120); // seconds, not ms
    });

    it('parses warmupTimeout separately', () => {
      const config = parseLspConfig({ lsp: { warmupTimeout: 90 } });
      expect(config.warmupTimeout).toBe(90);
    });

    it('uses defaults when config missing', () => {
      const config = parseLspConfig({});
      expect(config.timeout).toBe(DEFAULT_TIMEOUT);
      expect(config.warmupTimeout).toBe(DEFAULT_WARMUP_TIMEOUT);
    });

    it('uses defaults when lsp section is empty', () => {
      const config = parseLspConfig({ lsp: {} });
      expect(config.timeout).toBe(DEFAULT_TIMEOUT);
      expect(config.warmupTimeout).toBe(DEFAULT_WARMUP_TIMEOUT);
    });

    it('handles partial config with only timeout', () => {
      const config = parseLspConfig({ lsp: { timeout: 180 } });
      expect(config.timeout).toBe(180);
      expect(config.warmupTimeout).toBe(DEFAULT_WARMUP_TIMEOUT);
    });

    it('handles partial config with only warmupTimeout', () => {
      const config = parseLspConfig({ lsp: { warmupTimeout: 60 } });
      expect(config.timeout).toBe(DEFAULT_TIMEOUT);
      expect(config.warmupTimeout).toBe(60);
    });

    it('preserves perLanguage overrides in parsed config', () => {
      const config = parseLspConfig({
        lsp: {
          timeout: 120,
          perLanguage: {
            csharp: { timeout: 180, warmupTimeout: 120 },
            typescript: { timeout: 60 },
          },
        },
      });
      expect(config.perLanguage?.csharp?.timeout).toBe(180);
      expect(config.perLanguage?.csharp?.warmupTimeout).toBe(120);
      expect(config.perLanguage?.typescript?.timeout).toBe(60);
    });

    it('preserves custom servers config', () => {
      const config = parseLspConfig({
        lsp: {
          servers: {
            myLang: {
              command: 'my-lsp-server',
              args: ['--stdio'],
              filePatterns: ['*.xyz'],
              languageId: 'mylang',
            },
          },
        },
      });
      expect(config.servers?.myLang).toBeDefined();
      expect(config.servers?.myLang?.command).toBe('my-lsp-server');
      expect(config.servers?.myLang?.args).toEqual(['--stdio']);
    });
  });

  describe('default values', () => {
    it('exports DEFAULT_TIMEOUT as 120 seconds', () => {
      expect(DEFAULT_TIMEOUT).toBe(120);
    });

    it('exports DEFAULT_WARMUP_TIMEOUT as 90 seconds', () => {
      expect(DEFAULT_WARMUP_TIMEOUT).toBe(90);
    });
  });

  describe('type safety', () => {
    it('returns LspConfig type', () => {
      const config: LspConfig = parseLspConfig({});
      expect(config).toBeDefined();
      expect(typeof config.timeout).toBe('number');
      expect(typeof config.warmupTimeout).toBe('number');
    });
  });
});
